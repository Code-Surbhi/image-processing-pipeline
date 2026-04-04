import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import AWSXRay from "aws-xray-sdk-core";

const s3Client = AWSXRay.captureAWSv3Client(
  new S3Client({ region: process.env.AWS_REGION }),
);
const UPLOADS_BUCKET = process.env.UPLOADS_BUCKET_NAME;
const URL_EXPIRATION = 300; // 5 minutes

export const handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  try {
    // Parse request body
    const body = JSON.parse(event.body || "{}");
    const { fileName, contentType } = body;

    // Validate input
    if (!fileName) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "fileName is required",
          example: { fileName: "photo.jpg", contentType: "image/jpeg" },
        }),
      };
    }

    // Validate content type (only allow images)
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
      "image/gif",
    ];
    const fileContentType = contentType || "image/jpeg";

    if (!allowedTypes.includes(fileContentType)) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Invalid content type. Only image files are allowed.",
          allowedTypes,
        }),
      };
    }

    // Generate unique image ID and S3 key
    const imageId = randomUUID();
    const fileExtension = fileName.split(".").pop();
    const s3Key = `uploads/${imageId}.${fileExtension}`;

    // Create presigned URL
    const command = new PutObjectCommand({
      Bucket: UPLOADS_BUCKET,
      Key: s3Key,
      ContentType: fileContentType,
      Metadata: {
        "original-filename": fileName,
        "image-id": imageId,
      },
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: URL_EXPIRATION,
    });

    console.log("Presigned URL generated:", { imageId, s3Key });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // For web upload UI (if you build one later)
      },
      body: JSON.stringify({
        uploadUrl: presignedUrl,
        imageId,
        s3Key,
        expiresIn: URL_EXPIRATION,
        method: "PUT",
      }),
    };
  } catch (error) {
    console.error("Error generating presigned URL:", error);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to generate presigned URL",
        message: error.message,
      }),
    };
  }
};
