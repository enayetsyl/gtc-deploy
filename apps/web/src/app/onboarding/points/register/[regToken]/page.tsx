"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import { api } from "@/lib/axios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
      if (!token) return;
      try {
        const { data } = await api.get<{
          email: string;
          name: string;
          role: string;
        }>(`/api/public/onboarding/points/register/${token}`);
        setPrefill(data);
      } catch (err: unknown) {
        // treat not found / expired or any error as invalid link for this UI
        if (axios.isAxiosError(err)) {
          // optional: could inspect err.response?.status
        }
        setPrefill(null);
      }
    })();
  }, [token]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password !== confirm) return alert("Passwords do not match");
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    try {
      await api.post(`/api/public/onboarding/points/register/${token}`, {
        password,
        confirm,
      });
      router.push("/login");
    } catch {
      alert("Registration failed");
    }
  }

  if (prefill === null) return <div>Invalid or expired link</div>;
  if (!prefill) return <div>Loading…</div>;

  return (
    <form onSubmit={submit} className="max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Register account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <Label>Email</Label>
              <Input value={prefill.email} disabled />
            </div>

            <div>
              <Label>Name</Label>
              <Input value={prefill.name} disabled />
            </div>

            <div>
              <Label>Role</Label>
              <Input value={prefill.role} disabled />
            </div>

            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Confirm password</Label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <div className="w-full flex justify-end">
            <Button type="submit">Create account</Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  );
}
