import React from "react";
import Header from "./Header";

// Component: FirstPage
// Renders the form-logo.png as heading and constrains the container to A4 width (210mm).

export default function FirstPage() {
  return (
    <div
      style={{
        maxWidth: "210mm",
        width: "100%",
        margin: "0 auto",
        padding: "",
      }}
      className="first-page"
    >
      <Header/>
    </div>
  );
}
