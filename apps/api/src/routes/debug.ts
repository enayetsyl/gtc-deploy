import { Router } from "express";
import { testUploadThingApi } from "../debug/utapi-test";

const router = Router();

// Simple test endpoint to verify UploadThing configuration
router.get("/test-uploadthing", async (req, res) => {
  try {
    console.log("Testing UploadThing configuration...");
    console.log("UPLOADTHING_SECRET exists:", !!process.env.UPLOADTHING_SECRET);
    console.log("UPLOADTHING_TOKEN exists:", !!process.env.UPLOADTHING_TOKEN);

    res.json({
      success: true,
      hasSecret: !!process.env.UPLOADTHING_SECRET,
      hasToken: !!process.env.UPLOADTHING_TOKEN,
      message: "UploadThing configuration check complete"
    });
  } catch (error) {
    console.error("UploadThing test failed:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Test UTApi directly
router.get("/test-utapi", async (req, res) => {
  try {
    const result = await testUploadThingApi();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export { router as debugRouter };