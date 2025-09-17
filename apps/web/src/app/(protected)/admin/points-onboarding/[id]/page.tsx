"use client";
import Client from "./_client";
import { useParams } from "next/navigation";
export default function Page() {
  const params = useParams() as { id?: string | string[] } | undefined;
  const raw = params?.id;
  const id = Array.isArray(raw) ? raw[0] : raw;
  return <Client id={id as string} />;
}
