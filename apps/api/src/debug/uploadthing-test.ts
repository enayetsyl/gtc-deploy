// Test UploadThing token validity
import { UTApi } from "uploadthing/server";

const utapi = new UTApi({
  token: process.env.UPLOADTHING_TOKEN,
});

export async function testUploadThingConnection() {
  try {
    console.log("Testing UploadThing connection...");
    console.log("Token exists:", !!process.env.UPLOADTHING_TOKEN);
    console.log("Token length:", process.env.UPLOADTHING_TOKEN?.length);

    // Try to list files to test connection
    const result = await utapi.listFiles({
      limit: 1,
    });

    console.log("UploadThing connection successful:", result);
    return { success: true, result };
  } catch (error) {
    console.error("UploadThing connection failed:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}