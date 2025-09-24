#!/bin/bash

# Create a small test PDF file
echo "%PDF-1.4 Test PDF content" > test.pdf

# Test the multipart form submission
curl -X POST http://localhost:4000/api/leads/public \
  -F "name=John Doe" \
  -F "email=john@example.com" \
  -F "phone=+1234567890" \
  -F "company=Test Company Inc" \
  -F "message=This is a test lead submission with file" \
  -F "cmfy5d3qb000252t2b5nfe6mt=cmfy5d3qb000252t2b5nfe6mt" \
  -F "gdprAgree=true" \
  -F "fileUrls=[]" \
  -F "files=@test.pdf" \
  -H "Content-Type: multipart/form-data" \
  -v

echo "Upload test completed"