import { Request as ExpressRequest, Response, NextFunction, Router } from "express";
import { createRouteHandler } from "uploadthing/server";
import { ourFileRouter } from "../lib/uploadthing";

const router = Router();

// Create the route handler
const routeHandler = createRouteHandler({
  router: ourFileRouter,
});

// Convert Express Request to Web API Request object
function createWebRequest(req: ExpressRequest): Request {
  const url = new URL(req.originalUrl || req.url, `http://${req.headers.host}`);

  return new Request(url, {
    method: req.method,
    headers: new Headers(req.headers as Record<string, string>),
    body: req.method === 'GET' || req.method === 'HEAD' ? null : JSON.stringify(req.body),
  });
}

// Handle GET requests
router.get("/", async (req: ExpressRequest, res: Response, next: NextFunction) => {
  try {
    const webRequest = createWebRequest(req);
    const response = await routeHandler(webRequest);

    const body = await response.text();
    res.status(response.status)
      .set(Object.fromEntries(response.headers.entries()))
      .send(body);
  } catch (error) {
    next(error);
  }
});

// Handle POST requests  
router.post("/", async (req: ExpressRequest, res: Response, next: NextFunction) => {
  try {
    console.log("UploadThing POST request:", {
      body: req.body,
      headers: req.headers,
      url: req.url,
      method: req.method
    });

    const webRequest = createWebRequest(req);
    console.log("Created web request:", {
      url: webRequest.url,
      method: webRequest.method,
      headers: Object.fromEntries(webRequest.headers.entries())
    });

    const response = await routeHandler(webRequest);
    console.log("UploadThing response:", {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries())
    });

    const body = await response.text();
    console.log("Response body:", body);

    res.status(response.status)
      .set(Object.fromEntries(response.headers.entries()))
      .send(body);
  } catch (error) {
    console.error("UploadThing POST error:", error);
    next(error);
  }
});

export { router as uploadthingRouter };