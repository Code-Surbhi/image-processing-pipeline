export const handler = async (event) => {
  console.log("Aggregator - Event:", JSON.stringify(event, null, 2));

  // Event contains results from all 3 parallel branches
  const [labelsResult, facesResult, resizeResult] = event;

  const aggregatedResult = {
    imageId: labelsResult.imageId,
    processingType: "AGGREGATED",
    labels: labelsResult.labels,
    faces: facesResult.faces,
    faceCount: facesResult.faceCount,
    resizedImages: resizeResult.resizedImages,
    timestamp: new Date().toISOString(),
    status: "COMPLETED",
  };

  console.log("Aggregated result:", JSON.stringify(aggregatedResult, null, 2));

  // PLACEHOLDER - Phase 6 will write to DynamoDB
  return aggregatedResult;
};
