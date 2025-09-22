"use client";

import { useState, useEffect } from "react";
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
  const { login, isAuthed, initialized } = useAuth();
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

  // Redirect away if user is already authenticated
  useEffect(() => {
    if (initialized && isAuthed) {
      router.replace("/dashboard");
    }
  }, [initialized, isAuthed, router]);

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

  // While initializing auth state or already authed (redirect pending), render nothing
  if (!initialized || isAuthed) return null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-page-bg p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-card-bg border border-card-border rounded-xl shadow p-6 space-y-5"
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-heading">
            {t("auth.login.title")}
          </h1>
          <p className="text-sm text-muted-text">{t("auth.login.subtitle")}</p>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm mb-1 text-body">
            {t("form.email")}
          </label>
          <input
            type="email"
            id="email"
            className="w-full rounded-md border border-divider bg-card-bg text-body placeholder:text-muted-text px-3 py-2 focus-visible:ring-2 ring-focus outline-none"
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            autoComplete="email"
          />
          {errors.email && (
            <p className="text-xs text-alert-error mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm mb-1 text-body">
            {t("form.password")}
          </label>
          <input
            type="password"
            id="password"
            className="w-full rounded-md border border-divider bg-card-bg text-body placeholder:text-muted-text px-3 py-2 focus-visible:ring-2 ring-focus outline-none"
            value={form.password}
            onChange={(e) =>
              setForm((s) => ({ ...s, password: e.target.value }))
            }
            autoComplete="current-password"
          />
          {errors.password && (
            <p className="text-xs text-alert-error mt-1">{errors.password}</p>
          )}
        </div>

        {errors.root && (
          <div className="text-sm text-alert-error bg-alert-error/10 border border-alert-error/20 rounded-md px-3 py-2">
            {errors.root}
          </div>
        )}

        <button
          type="submit"
          className="cursor-pointer w-full rounded-md bg-button-primary hover:bg-button-primary-hover text-white py-2 font-medium focus-visible:ring-2 ring-focus outline-none disabled:opacity-60"
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
