"use client";

import Protected from "@/components/protected";
import { useAuth } from "@/providers/auth-provider";

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <Protected>
      <main className="p-6 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
        </header>

        <section className="rounded-xl border p-6">
          <p className="text-lg">
            Welcome, <span className="font-semibold">{user?.name}</span>.
          </p>
          <p className="text-gray-600 mt-2">
            Your role: <span className="font-mono">{user?.role}</span>
          </p>
        </section>
      </main>
    </Protected>
  );
}
