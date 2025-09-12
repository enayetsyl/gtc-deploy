"use client";

import { useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";

export default function Protected({ children }: { children: React.ReactNode }) {
  const { isAuthed } = useAuth();
  const router = useRouter();
  // wait for auth initialization to complete in the provider
  const { initialized } = useAuth();

  useEffect(() => {
    if (initialized && !isAuthed) router.replace("/login");
  }, [isAuthed, router, initialized]);

  if (!initialized) return null;
  if (!isAuthed) return null;
  return <>{children}</>;
}
