export const handler = async (event) => {
  console.log("Notification Lambda - Event:", JSON.stringify(event, null, 2));

  // DynamoDB Streams sends records in batches
  const records = event.Records || [];

  console.log(`Processing ${records.length} stream records`);

  for (const record of records) {
    try {
      // Only process INSERT events (new items)
      if (record.eventName !== "INSERT") {
        console.log(`Skipping ${record.eventName} event`);
        continue;
      }

      // Get the new item from the stream
      const newItem = record.dynamodb.NewImage;

      if (!newItem) {
        console.log("No NewImage in record, skipping");
        continue;
      }

      // Convert DynamoDB format to regular JSON
      const item = unmarshall(newItem);

      // Only process AGGREGATED items (not LABELS, FACES, RESIZE)
      if (item.processingType !== "AGGREGATED") {
        console.log(`Skipping ${item.processingType} item`);
        continue;
      }

      console.log(`🎉 Image processing completed for: ${item.imageId}`);
      console.log(`Status: ${item.status}`);
      console.log(`Labels count: ${item.data?.labelCount || 0}`);
      console.log(`Faces count: ${item.data?.faceCount || 0}`);
      console.log(`Resized images: ${item.data?.resizedImages?.length || 0}`);

      // PLACEHOLDER: In a real app, you'd send an email/SMS/webhook here
      // Example: await sns.publish({ Message: `Image ${item.imageId} processed!` })

      // For now, just log it
      console.log(`✅ Notification sent for image: ${item.imageId}`);
    } catch (error) {
      console.error("Error processing stream record:", error);
      console.error("Record:", JSON.stringify(record, null, 2));
      // Don't throw - process remaining records
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ processedRecords: records.length }),
  };
};

// Helper: Convert DynamoDB format to regular JSON
function unmarshall(dynamoItem) {
  const item = {};

  for (const [key, value] of Object.entries(dynamoItem)) {
    if (value.S)
      item[key] = value.S; // String
    else if (value.N)
      item[key] = Number(value.N); // Number
    else if (value.BOOL)
      item[key] = value.BOOL; // Boolean
    else if (value.M)
      item[key] = unmarshall(value.M); // Map (nested object)
    else if (value.L)
      item[key] = value.L.map((v) => unmarshall({ item: v }).item); // List
    else if (value.NULL) item[key] = null;
  }

  return item;
}
