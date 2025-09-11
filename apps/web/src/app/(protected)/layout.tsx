import AdminNav from "@/components/admin-nav";
import Protected from "@/components/protected";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Protected>
      <div className="p-6 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Admin</h1>
          <AdminNav />
        </header>
        {children}
      </div>
    </Protected>
  );
}
