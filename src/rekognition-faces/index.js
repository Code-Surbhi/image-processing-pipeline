import {
  RekognitionClient,
  DetectFacesCommand,
} from "@aws-sdk/client-rekognition";

const rekognitionClient = new RekognitionClient({
  region: process.env.AWS_REGION,
});
const UPLOADS_BUCKET = process.env.UPLOADS_BUCKET_NAME;

export const handler = async (event) => {
  console.log("Rekognition Faces - Event:", JSON.stringify(event, null, 2));

  const { bucket, key, imageId } = event;

  try {
    // Call AWS Rekognition DetectFaces API
    const command = new DetectFacesCommand({
      Image: {
        S3Object: {
          Bucket: bucket || UPLOADS_BUCKET,
          Name: key,
        },
      },
      Attributes: ["ALL"], // Return all face attributes (emotions, age, gender, etc.)
    });

    const response = await rekognitionClient.send(command);

    console.log(
      `Detected ${response.FaceDetails.length} faces for image ${imageId}`,
    );

    // Transform Rekognition response to our format
    const faces = response.FaceDetails.map((face) => ({
      BoundingBox: {
        Width: Math.round(face.BoundingBox.Width * 1000) / 1000,
        Height: Math.round(face.BoundingBox.Height * 1000) / 1000,
        Left: Math.round(face.BoundingBox.Left * 1000) / 1000,
        Top: Math.round(face.BoundingBox.Top * 1000) / 1000,
      },
      Confidence: Math.round(face.Confidence * 10) / 10,
      Emotions:
        face.Emotions?.slice(0, 3).map((e) => ({
          Type: e.Type,
          Confidence: Math.round(e.Confidence * 10) / 10,
        })) || [],
      AgeRange: face.AgeRange
        ? {
            Low: face.AgeRange.Low,
            High: face.AgeRange.High,
          }
        : null,
      Gender: face.Gender
        ? {
            Value: face.Gender.Value,
            Confidence: Math.round(face.Gender.Confidence * 10) / 10,
          }
        : null,
      Smile: face.Smile
        ? {
            Value: face.Smile.Value,
            Confidence: Math.round(face.Smile.Confidence * 10) / 10,
          }
        : null,
      EyesOpen: face.EyesOpen
        ? {
            Value: face.EyesOpen.Value,
            Confidence: Math.round(face.EyesOpen.Confidence * 10) / 10,
          }
        : null,
    }));

    return {
      imageId,
      processingType: "FACES",
      faces,
      faceCount: faces.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error detecting faces:", error);
    throw new Error(`Rekognition DetectFaces failed: ${error.message}`);
  }
};
