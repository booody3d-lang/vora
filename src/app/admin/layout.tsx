"use client";

import { AdminAuthProvider, AdminLoginGate } from "@/components/admin/AdminAuthGate";
import { AdminShell } from "@/components/admin/AdminShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminLoginGate>
        <AdminShell>{children}</AdminShell>
      </AdminLoginGate>
    </AdminAuthProvider>
  );
}
