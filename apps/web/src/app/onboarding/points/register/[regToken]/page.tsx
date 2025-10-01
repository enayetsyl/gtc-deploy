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
import Spinner from "@/components/ui/Spinner";
import { toast } from "sonner";
import { useI18n } from "@/providers/i18n-provider";

export default function RegisterPage() {
  const { t } = useI18n();
  const params = useParams() as { regToken?: string } | undefined;
  const token = params?.regToken as string;

  const [prefill, setPrefill] = useState<
    { email: string; name: string; role: string } | null | undefined
  >(undefined);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

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
    if (password !== confirm) {
      toast.error(t("auth.register.passwordsMismatch"));
      return;
    }
    if (password.length < 8) {
      toast.error(t("form.errors.password.min", { min: 8 }));
      return;
    }
    try {
      setSubmitting(true);
      await api.post(`/api/public/onboarding/points/register/${token}`, {
        password,
        confirm,
      });
      router.push("/login");
    } catch {
      toast.error(t("auth.register.failed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (prefill === null) return <div>{t("onboarding.invalidLink")}</div>;
  if (!prefill) return <div>{t("ui.loading")}</div>;

  return (
    <form onSubmit={submit} className="max-w-md mx-auto p-2 mt-5">
      <Card>
        <CardHeader>
          <CardTitle>{t("auth.register.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <Label>{t("form.email")}</Label>
              <Input value={prefill.email} disabled />
            </div>

            <div>
              <Label>{t("form.name")}</Label>
              <Input value={prefill.name} disabled />
            </div>

            <div>
              <Label>{t("form.role")}</Label>
              <Input value={prefill.role} disabled />
            </div>

            <div>
              <Label>{t("form.password")}</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>{t("form.confirmPassword")}</Label>
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
            <Button type="submit" disabled={submitting}>
              {submitting && <Spinner className="w-4 h-4 mr-2" />}
              {submitting ? t("auth.register.creating") : t("auth.register.create")}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  );
}
