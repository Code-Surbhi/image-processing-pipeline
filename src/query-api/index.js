import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import AWSXRay from "aws-xray-sdk-core";

const dynamoClient = AWSXRay.captureAWSv3Client(
  new DynamoDBClient({ region: process.env.AWS_REGION }),
);
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const RESULTS_TABLE = process.env.RESULTS_TABLE_NAME;

export const handler = async (event) => {
  console.log("Query API - Event:", JSON.stringify(event, null, 2));

  try {
    // Extract imageId from path parameters
    const imageId = event.pathParameters?.imageId;

    if (!imageId) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "imageId is required",
          message: "Please provide an imageId in the URL path",
        }),
      };
    }

    console.log(`Querying results for imageId: ${imageId}`);

    // Query DynamoDB for all items with this imageId
    const command = new QueryCommand({
      TableName: RESULTS_TABLE,
      KeyConditionExpression: "imageId = :imageId",
      ExpressionAttributeValues: {
        ":imageId": imageId,
      },
    });

    const response = await docClient.send(command);

    console.log(`Found ${response.Items?.length || 0} items`);

    if (!response.Items || response.Items.length === 0) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "Image not found",
          message: `No processing results found for imageId: ${imageId}`,
        }),
      };
    }

    // Find the AGGREGATED item
    const aggregatedItem = response.Items.find(
      (item) => item.processingType === "AGGREGATED",
    );

    if (!aggregatedItem) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "Processing incomplete",
          message: "Image is still being processed",
          availableResults: response.Items.map((item) => item.processingType),
        }),
      };
    }

    // Build clean response
    const result = {
      imageId: aggregatedItem.imageId,
      status: aggregatedItem.status,
      processedAt: aggregatedItem.createdAt,
      results: {
        labels: aggregatedItem.data?.labels || [],
        labelCount: aggregatedItem.data?.labelCount || 0,
        faces: aggregatedItem.data?.faces || [],
        faceCount: aggregatedItem.data?.faceCount || 0,
        resizedImages: aggregatedItem.data?.resizedImages || [],
      },
      rawItems: response.Items.length, // Debug info
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(result, null, 2),
    };
  } catch (error) {
    console.error("Error querying results:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
    };
  }
};
