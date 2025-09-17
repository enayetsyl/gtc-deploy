"use client";
import OnboardingFormClient from "./_client";
import { useParams } from "next/navigation";

export default function Page() {
  const params = useParams() as { token?: string } | undefined;
  const token = params?.token as string;
  return <OnboardingFormClient token={token} />;
}
