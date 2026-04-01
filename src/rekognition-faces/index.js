export const handler = async (event) => {
  console.log("Rekognition Faces - Event:", JSON.stringify(event, null, 2));

  const { bucket, key, imageId } = event;

  // PLACEHOLDER - Phase 4 will implement real Rekognition call
  const mockFaces = [
    {
      BoundingBox: { Width: 0.3, Height: 0.4, Left: 0.2, Top: 0.1 },
      Confidence: 99.9,
      Emotions: [
        { Type: "HAPPY", Confidence: 85.5 },
        { Type: "CALM", Confidence: 10.2 },
      ],
      AgeRange: { Low: 25, High: 35 },
    },
  ];

  console.log("Mock faces detected:", mockFaces);

  return {
    imageId,
    processingType: "FACES",
    faces: mockFaces,
    faceCount: mockFaces.length,
    timestamp: new Date().toISOString(),
  };
};
