const FormData = require("form-data");
const fetch = require("node-fetch");

async function testMultipartSubmission() {
  const form = new FormData();

  // Add form fields that match what the frontend would send
  form.append("name", "John Doe");
  form.append("email", "john@example.com");
  form.append("phone", "+1234567890");
  form.append("company", "Test Company Inc");
  form.append("description", "This is a test lead submission");

  // Use a sector ID that exists in the database (from previous debug output)
  form.append("cmfy5d3qb000252t2b5nfe6mt", "cmfy5d3qb000252t2b5nfe6mt");

  // Add file URLs from UploadThing (empty array for this test)
  form.append("fileUrls", JSON.stringify([]));

  console.log("Sending multipart form data...");
  console.log(
    "Form fields: name, email, phone, company, description, sector field, fileUrls"
  );

  try {
    const response = await fetch("http://localhost:4000/api/leads/public", {
      method: "POST",
      body: form,
      headers: form.getHeaders(),
    });

    const result = await response.json();
    console.log("\nResponse status:", response.status);
    console.log("Response body:", JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log("✅ Success: Lead created successfully!");
    } else {
      console.log("❌ Error: Lead creation failed");
    }
  } catch (error) {
    console.error("Request failed:", error.message);
  }
}

testMultipartSubmission();
