"use client";
import Protected from "@/components/protected";
import Navbar from "@/components/navbar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Protected>
      <Navbar />
      <div className="p-6">{children}</div>
    </Protected>
  );
}
