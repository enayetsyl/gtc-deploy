import Navbar from "@/components/navbar";
import ProtectedShell from "./protected-shell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedShell>
      <Navbar />
      <div className="p-6">{children}</div>
    </ProtectedShell>
  );
}
