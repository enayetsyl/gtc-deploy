"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/axios";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/providers/i18n-provider";

export function AcceptInviteClient() {
  const { t } = useI18n();
  const search = useSearchParams();
  const router = useRouter();
  const token = useMemo(() => search.get("token") ?? "", [search]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) setErr(t("auth.invite.missingToken"));
  }, [token, t]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!token) return setErr(t("auth.invite.missingToken"));
    if (password.length < 8) return setErr(t("auth.invite.passwordTooShort"));
    if (password !== confirm) return setErr(t("auth.invite.passwordsMismatch"));
    setSubmitting(true);
    try {
      await api.post(`/api/auth/invite/accept`, { token, password });
      setMsg(t("auth.invite.success"));
      setTimeout(() => router.push("/login"), 800);
    } catch (e) {
      const m = (e as { response?: { data?: { error?: string } } }).response
        ?.data?.error;
      setErr(m ?? t("auth.invite.invalidOrExpired"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-4 rounded-xl border p-6"
      >
        <h1 className="text-xl font-semibold">
          {t("auth.invite.acceptTitle")}
        </h1>
        <input type="hidden" value={token} readOnly />
        <label className="block text-sm">
          <div className="mb-1">{t("auth.invite.newPassword")}</div>
          <input
            type="password"
            className="w-full rounded-md border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <div className="mb-1">{t("auth.invite.confirmPassword")}</div>
          <input
            type="password"
            className="w-full rounded-md border px-3 py-2"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        <button
          className="w-full rounded-md bg-black text-white px-3 py-2"
          disabled={submitting || !token}
        >
          {submitting
            ? t("auth.invite.submitting")
            : t("auth.invite.setPassword")}
        </button>
        {msg && <p className="text-sm text-green-600">{msg}</p>}
        {err && <p className="text-sm text-red-600">{err}</p>}
      </form>
    </main>
  );
}
