# UploadThing Integration

Your application has been successfully integrated with UploadThing for file uploads. Here's how to use it:

## API Changes

### 1. File Upload Endpoints

- **UploadThing Endpoint**: `POST /api/uploadthing` - handles file uploads directly
- **Lead Creation**: `POST /api/leads/public` - now accepts file URLs from UploadThing
- **Point Onboarding**: `POST /api/public/onboarding/points/:token/submit` - now accepts signature URLs

### 2. Database Changes

- Added `uploadthingKey` field to `LeadAttachment` model (for file deletion)
- Added `signatureUploadthingKey` field to `PointOnboarding` model (for signature deletion)
- The `path` field now stores UploadThing URLs instead of local file paths

### 3. Client-Side Usage

#### For Lead Files:

```javascript
// 1. First upload files to UploadThing
const uploadFiles = async (files) => {
  const formData = new FormData();
  files.forEach((file, index) => {
    formData.append(`files`, file);
  });

  // Use UploadThing's direct upload
  const response = await fetch("/api/uploadthing", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();
  return result; // Contains file URLs and keys
};

// 2. Then submit the lead with file URLs
const submitLead = async (leadData, uploadedFiles) => {
  const response = await fetch("/api/leads/public", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...leadData,
      fileUrls: uploadedFiles.map((file) => ({
        url: file.url,
        name: file.name,
        size: file.size,
        type: file.type,
        key: file.key,
      })),
    }),
  });

  return response.json();
};
```

#### For Point Onboarding Signatures:

```javascript
// 1. Upload signature to UploadThing
const uploadSignature = async (signatureFile) => {
  const formData = new FormData();
  formData.append('files', signatureFile);

  const response = await fetch('/api/uploadthing', {
    method: 'POST',
    body: formData,
  });

  return response.json();
};

// 2. Submit onboarding with signature URL
const submitOnboarding = async (token, data, uploadedSignature) => {
  const response = await fetch(\`/api/public/onboarding/points/\${token}/submit\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...data,
      signatureData: uploadedSignature ? {
        url: uploadedSignature.url,
        name: uploadedSignature.name,
        size: uploadedSignature.size,
        type: uploadedSignature.type,
        key: uploadedSignature.key
      } : undefined
    }),
  });

  return response.json();
};
```

## Environment Variables

Make sure your `.env` file has:

```
UPLOADTHING_TOKEN=your_uploadthing_token_here
UPLOADS_ENABLED=true
```

## File Types and Limits

### Lead Files:

- **Images**: PNG, JPEG (max 4MB each, up to 10 files)
- **PDFs**: PDF (max 16MB each, up to 10 files)

### Signatures:

- **Images**: PNG, JPEG (max 2MB each, 1 file)
- **SVG**: SVG (max 1MB, 1 file)

## Migration Notes

- Existing local files will still be accessible but new uploads go to UploadThing
- The file download endpoint (`/api/leads/:id/attachments/:attId/download`) will redirect to UploadThing URLs for new files
- Old local files will return a 410 Gone status after migration
- The `multer` dependency has been removed

## Benefits

1. **No local storage needed** - files are stored in UploadThing's cloud
2. **Better scalability** - no need to manage local file storage
3. **Automatic CDN** - files are served via UploadThing's CDN
4. **File management** - files can be deleted using UploadThing's API
5. **Security** - file uploads are handled securely by UploadThing

Your application is now ready to use UploadThing for all file uploads!
