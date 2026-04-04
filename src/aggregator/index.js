import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import AWSXRay from "aws-xray-sdk-core";

const dynamoClient = AWSXRay.captureAWSv3Client(
  new DynamoDBClient({ region: process.env.AWS_REGION }),
);
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const RESULTS_TABLE = process.env.RESULTS_TABLE_NAME;

export const handler = async (event) => {
  console.log("Aggregator - Event:", JSON.stringify(event, null, 2));

  try {
    // Event contains results from all 3 parallel branches
    const [labelsResult, facesResult, resizeResult] = event;

    const imageId =
      labelsResult.imageId || facesResult.imageId || resizeResult.imageId;

    if (!imageId) {
      throw new Error("No imageId found in any branch result");
    }

    console.log(`Processing results for image: ${imageId}`);

    // Write individual branch results to DynamoDB
    await Promise.all([
      writeToDynamoDB({
        imageId,
        processingType: "LABELS",
        data: labelsResult,
        status: labelsResult.status || "COMPLETED",
      }),
      writeToDynamoDB({
        imageId,
        processingType: "FACES",
        data: facesResult,
        status: facesResult.status || "COMPLETED",
      }),
      writeToDynamoDB({
        imageId,
        processingType: "RESIZE",
        data: resizeResult,
        status: resizeResult.status || "COMPLETED",
      }),
    ]);

    // Create aggregated result
    const aggregatedResult = {
      imageId,
      processingType: "AGGREGATED",
      labels: labelsResult.labels || [],
      labelCount: labelsResult.labelCount || 0,
      faces: facesResult.faces || [],
      faceCount: facesResult.faceCount || 0,
      resizedImages: resizeResult.resizedImages || [],
      timestamp: new Date().toISOString(),
      status: "COMPLETED",
    };

    // Write aggregated result to DynamoDB
    await writeToDynamoDB(aggregatedResult);

    console.log("All results written to DynamoDB successfully");

    return aggregatedResult;
  } catch (error) {
    console.error("Error aggregating results:", error);
    throw new Error(`Aggregation failed: ${error.message}`);
  }
};

// Helper function to write to DynamoDB
async function writeToDynamoDB(item) {
  const timestamp = new Date().toISOString();

  const dynamoItem = {
    imageId: item.imageId,
    processingType: item.processingType,
    data: item.data || item, // If data is nested, use it; otherwise use the item itself
    status: item.status,
    createdAt: timestamp,
    updatedAt: timestamp,
    ttl: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60, // 90 days TTL
  };

  const command = new PutCommand({
    TableName: RESULTS_TABLE,
    Item: dynamoItem,
    ConditionExpression:
      "attribute_not_exists(imageId) AND attribute_not_exists(processingType)", // Prevent overwrites
  });

  try {
    await docClient.send(command);
    console.log(
      `Written to DynamoDB: ${item.imageId} - ${item.processingType}`,
    );
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      console.log(
        `Item already exists: ${item.imageId} - ${item.processingType} (skipping)`,
      );
      // Not an error - just means we already processed this
    } else {
      throw error;
    }
  }
}
