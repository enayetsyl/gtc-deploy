"use client";

import { useState } from "react";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { useAuth, User } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";
import { useI18n } from "@/providers/i18n-provider";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    root?: string;
  }>({});

  const loginResponseSchema = z.object({
    accessToken: z.string(),
    user: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      role: z.string(),
    }),
  });

  const mutate = useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const res = await api.post("/api/auth/login", payload);
      const parsed = loginResponseSchema.parse(res.data);
      // map API shape to client shape expected by login()
      return { token: parsed.accessToken, user: parsed.user as User };
    },
    onSuccess: (data) => {
      login(data);
      router.replace("/dashboard");
    },
    onError: (e: unknown) => {
      const getErrMsg = (err: unknown): string => {
        if (typeof err === "object" && err !== null) {
          const maybe = err as Record<string, unknown>;
          const response = maybe.response as
            | Record<string, unknown>
            | undefined;
          const data = response?.data as Record<string, unknown> | undefined;
          const error = data?.error;
          if (typeof error === "string") return error;
        }
        return "Login failed";
      };
      setErrors((prev) => ({ ...prev, root: getErrMsg(e) }));
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrs: typeof errors = {};
      parsed.error.issues.forEach((i) => {
        const k = i.path[0] as "email" | "password";
        fieldErrs[k] = i.message;
      });
      setErrors(fieldErrs);
      return;
    }
    mutate.mutate(parsed.data);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white rounded-xl shadow p-6 space-y-4"
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{t("auth.login.title")}</h1>
          <p className="text-sm text-gray-500">{t("auth.login.subtitle")}</p>
        </div>

        <div>
          <label className="block text-sm mb-1">{t("form.email")}</label>
          <input
            type="email"
            className="w-full rounded-md border px-3 py-2"
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            autoComplete="email"
          />
          {errors.email && (
            <p className="text-xs text-red-600 mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <label className="block text-sm mb-1">{t("form.password")}</label>
          <input
            type="password"
            className="w-full rounded-md border px-3 py-2"
            value={form.password}
            onChange={(e) =>
              setForm((s) => ({ ...s, password: e.target.value }))
            }
            autoComplete="current-password"
          />
          {errors.password && (
            <p className="text-xs text-red-600 mt-1">{errors.password}</p>
          )}
        </div>

        {errors.root && (
          <div className="text-sm text-red-600">{errors.root}</div>
        )}

        <button
          type="submit"
          className="w-full rounded-md bg-black text-white py-2 font-medium disabled:opacity-60"
          disabled={mutate.isPending}
        >
          {mutate.isPending
            ? t("auth.login.signingIn")
            : t("auth.login.signIn")}
        </button>
      </form>
    </main>
  );
}
