import { redirect } from "next/navigation";
import { auth } from "@/auth";
import DashboardLayoutClient from "@/components/dashboard/dashboard-layout-client";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const isAdminRole = ["SUPERADMIN", "ADMIN"].includes(session.user.role);

  if (!isAdminRole) {
    redirect("/login");
  }

  return (
    <DashboardLayoutClient
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        permissions: session.user.permissions ?? [],
      }}
    >
      {children}
    </DashboardLayoutClient>
  );
}
