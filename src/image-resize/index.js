import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const UPLOADS_BUCKET = process.env.UPLOADS_BUCKET_NAME;
const PROCESSED_BUCKET = process.env.PROCESSED_BUCKET_NAME;

// Resize configurations
const SIZES = [
  { name: "thumbnail", width: 150, height: 150 },
  { name: "medium", width: 500, height: 500 },
  { name: "large", width: 1024, height: 1024 },
];

export const handler = async (event) => {
  console.log("Image Resize - Event:", JSON.stringify(event, null, 2));

  const { bucket, key, imageId } = event;

  try {
    // Step 1: Download image from S3
    console.log(`Downloading image from s3://${bucket}/${key}`);

    const getCommand = new GetObjectCommand({
      Bucket: bucket || UPLOADS_BUCKET,
      Key: key,
    });

    const { Body, ContentType } = await s3Client.send(getCommand);
    const imageBuffer = await streamToBuffer(Body);

    console.log(`Downloaded ${imageBuffer.length} bytes`);

    // Step 2: Resize to all sizes in parallel
    const resizePromises = SIZES.map(async (size) => {
      try {
        console.log(`Resizing to ${size.name}: ${size.width}x${size.height}`);

        // Resize image
        const resizedBuffer = await sharp(imageBuffer)
          .resize(size.width, size.height, {
            fit: "cover", // Crop to exact dimensions
            position: "center", // Center the crop
          })
          .jpeg({ quality: 85 }) // Convert to JPEG with 85% quality
          .toBuffer();

        console.log(`${size.name}: Generated ${resizedBuffer.length} bytes`);

        // Upload to processed bucket
        const s3Key = `processed/${imageId}_${size.name}.jpg`;

        const putCommand = new PutObjectCommand({
          Bucket: PROCESSED_BUCKET,
          Key: s3Key,
          Body: resizedBuffer,
          ContentType: "image/jpeg",
          Metadata: {
            "original-image-id": imageId,
            "resize-type": size.name,
            dimensions: `${size.width}x${size.height}`,
          },
        });

        await s3Client.send(putCommand);

        console.log(`Uploaded to s3://${PROCESSED_BUCKET}/${s3Key}`);

        return {
          size: size.name,
          width: size.width,
          height: size.height,
          s3Bucket: PROCESSED_BUCKET,
          s3Key,
          sizeBytes: resizedBuffer.length,
        };
      } catch (error) {
        console.error(`Error resizing ${size.name}:`, error);
        throw error;
      }
    });

    // Wait for all resizes to complete
    const resizedImages = await Promise.all(resizePromises);

    console.log("All resizes completed successfully");

    return {
      imageId,
      processingType: "RESIZE",
      resizedImages,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error resizing image:", error);
    throw new Error(`Image resize failed: ${error.message}`);
  }
};

// Helper: Convert stream to buffer
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
