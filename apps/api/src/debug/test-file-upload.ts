import "dotenv/config";
import { UTApi } from "uploadthing/server";
import { readFileSync } from "fs";
import path from "path";

const utapi = new UTApi();

async function testFileUpload() {
  try {
    console.log("Testing file upload with dl.pdf...");
    console.log("UPLOADTHING_TOKEN exists:", !!process.env.UPLOADTHING_TOKEN);
    console.log("UPLOADTHING_SECRET exists:", !!process.env.UPLOADTHING_SECRET);

    // Read the file
    const filePath = path.resolve("../../dl.pdf");
    console.log("Reading file from:", filePath);

    const fileBuffer = readFileSync(filePath);
    console.log("File size:", fileBuffer.length, "bytes");

    // Create a File object
    const file = new File([fileBuffer], "dl.pdf", {
      type: "application/pdf"
    });

    console.log("Uploading file:", file.name, file.size, file.type);

    // Upload using UTApi
    const result = await utapi.uploadFiles(file);
    console.log("Upload result:", result);

    if (result.data) {
      console.log("✅ Upload successful!");
      console.log("File URL:", result.data.url);
      console.log("File Key:", result.data.key);
      console.log("File Name:", result.data.name);

      // Test listing files to confirm it's there
      console.log("\n--- Listing files to confirm upload ---");
      const filesList = await utapi.listFiles({ limit: 5 });
      console.log("Files in UploadThing:", filesList);

    } else {
      console.log("❌ Upload failed:", result.error);
    }

  } catch (error) {
    console.error("❌ Error during upload:", error);
  }
}

// Run the test
testFileUpload();