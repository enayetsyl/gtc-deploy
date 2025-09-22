"use client";
import Protected from "@/components/protected";

export default function ProtectedShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Protected>{children}</Protected>;
}
