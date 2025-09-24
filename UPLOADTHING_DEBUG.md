## UploadThing Debug Guide

Your UploadThing integration is **WORKING** - the UTApi test was successful! Here's how to debug further:

### ✅ What's Working:

1. **Token is valid** - UTApi connected successfully
2. **Configuration is correct** - GET /api/uploadthing returns proper config
3. **Server setup is correct** - No configuration errors

### 🔍 Debug Steps:

#### 1. Check UploadThing Dashboard

Visit: https://uploadthing.com/dashboard

- Log into your account
- Check app ID: `qj1vpu9yhs`
- Look at the "Uploads" tab for any failed attempts
- Check "Logs" for error messages

#### 2. Test with Correct Client Flow

UploadThing requires a specific client-server flow:

```javascript
// Frontend upload (correct way)
async function uploadFile(file) {
  // Step 1: Get presigned URL from your server
  const presignedResponse = await fetch("/api/uploadthing", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      files: [
        {
          name: file.name,
          size: file.size,
          type: file.type,
        },
      ],
      routeSlug: "leadFiles",
    }),
  });

  const { data } = await presignedResponse.json();

  // Step 2: Upload directly to UploadThing with presigned URL
  const uploadResponse = await fetch(data[0].url, {
    method: "PUT",
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error("Upload failed");
  }

  return data[0];
}
```

#### 3. Current Issues:

- The POST request needs the correct payload format
- File uploads happen in two steps: get presigned URL, then upload to UploadThing directly

#### 4. Quick Test Commands:

Test presigned URL generation:

```bash
curl -X POST http://localhost:4000/api/uploadthing \\
  -H "Content-Type: application/json" \\
  -d '{
    "files": [{"name": "test.pdf", "size": 1024, "type": "application/pdf"}],
    "routeSlug": "leadFiles"
  }'
```

### 🎯 Most Likely Issues:

1. **Wrong request format** - You're sending `{"slug":"leadFiles"}` but UploadThing expects the format above
2. **Missing client-side integration** - Files need to be uploaded from the client, not server-to-server
3. **Dashboard configuration** - Check your UploadThing app settings

Try the corrected POST request format above and check your dashboard!
