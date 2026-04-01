export const handler = async (event) => {
  console.log("Rekognition Labels - Event:", JSON.stringify(event, null, 2));

  const { bucket, key, imageId } = event;

  // PLACEHOLDER - Phase 4 will implement real Rekognition call
  const mockLabels = [
    { Name: "Person", Confidence: 99.5 },
    { Name: "Clothing", Confidence: 98.2 },
    { Name: "Smile", Confidence: 95.7 },
  ];

  console.log("Mock labels detected:", mockLabels);

  return {
    imageId,
    processingType: "LABELS",
    labels: mockLabels,
    timestamp: new Date().toISOString(),
  };
};
