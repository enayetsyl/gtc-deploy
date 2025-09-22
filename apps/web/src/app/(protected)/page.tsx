import ClientTouch from "./client-touch";

export const runtime = "nodejs"; // ensure node runtime (avoid edge quirks)

export default function AdminHome() {
  return (
    <main className="rounded-xl border p-6">
      <ClientTouch />
      <p className="text-gray-700">
        Choose a section: Sectors, GTC Points, or Services.
      </p>
    </main>
  );
}
