import express from "express";
import fetch from "node-fetch";

export const imageProxy = express.Router();

// GET /api/image-proxy?url=<encodedUrl>
imageProxy.get("/image-proxy", async (req, res) => {
  const url = req.query.url;
  if (!url || typeof url !== "string") return res.status(400).send("Missing url");
  try {
    const parsed = new URL(url);
    // Basic safety: only allow http(s)
    if (!["http:", "https:"].includes(parsed.protocol)) return res.status(400).send("Invalid protocol");
  } catch (e) {
    return res.status(400).send("Invalid url");
  }

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) return res.status(502).send("Upstream fetch failed");
    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    // Allow cross-origin usage from clients
    res.setHeader("Access-Control-Allow-Origin", "*");
    // Stream upstream body to client
    const body = upstream.body;
    if (!body) return res.status(502).send("No body from upstream");
    body.pipe(res);
  } catch (err) {
    console.error("image-proxy error", err);
    res.status(500).send("Proxy error");
  }
});

export default imageProxy;
