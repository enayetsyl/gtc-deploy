"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function RegisterPage() {
  const params = useParams() as { regToken?: string } | undefined;
  const token = params?.regToken as string;
  const [prefill, setPrefill] = useState<
    { email: string; name: string; role: string } | null | undefined
  >(undefined);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const res = await fetch(
        `/api/public/onboarding/points/register/${token}`
      );
      if (!res.ok) return setPrefill(null);
      setPrefill(await res.json());
    })();
  }, [token]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password !== confirm) return alert("Passwords do not match");
    const res = await fetch(`/api/public/onboarding/points/register/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, confirm }),
    });
    if (res.ok) router.push("/auth/login");
    else alert("Registration failed");
  }

  if (prefill === null) return <div>Invalid or expired link</div>;
  if (!prefill) return <div>Loading…</div>;

  return (
    <form onSubmit={submit}>
      <h1>Register account</h1>
      <div>
        Email: <input value={prefill.email} disabled />
      </div>
      <div>
        Name: <input value={prefill.name} disabled />
      </div>
      <div>
        Role: <input value={prefill.role} disabled />
      </div>
      <div>
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div>
        <label>Confirm</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      <button type="submit">Create account</button>
    </form>
  );
}
