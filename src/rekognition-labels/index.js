import {
  RekognitionClient,
  DetectLabelsCommand,
} from "@aws-sdk/client-rekognition";

const rekognitionClient = new RekognitionClient({
  region: process.env.AWS_REGION,
});
const UPLOADS_BUCKET = process.env.UPLOADS_BUCKET_NAME;

export const handler = async (event) => {
  console.log("Rekognition Labels - Event:", JSON.stringify(event, null, 2));

  const { bucket, key, imageId } = event;

  try {
    // Call AWS Rekognition DetectLabels API
    const command = new DetectLabelsCommand({
      Image: {
        S3Object: {
          Bucket: bucket || UPLOADS_BUCKET,
          Name: key,
        },
      },
      MaxLabels: 10, // Return top 10 labels
      MinConfidence: 75, // Only labels with >75% confidence
    });

    const response = await rekognitionClient.send(command);

    console.log(
      `Detected ${response.Labels.length} labels for image ${imageId}`,
    );

    // Transform Rekognition response to our format
    const labels = response.Labels.map((label) => ({
      Name: label.Name,
      Confidence: Math.round(label.Confidence * 10) / 10, // Round to 1 decimal
      Categories: label.Categories?.map((c) => c.Name) || [],
      Instances: label.Instances?.length || 0,
    }));

    return {
      imageId,
      processingType: "LABELS",
      labels,
      labelCount: labels.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error detecting labels:", error);
    throw new Error(`Rekognition DetectLabels failed: ${error.message}`);
  }
};
