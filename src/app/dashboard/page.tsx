import { auth } from "@/auth";
import DashboardHome from "@/components/dashboard/dashboard-home";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <DashboardHome
      user={{
        name: session?.user.name,
        email: session?.user.email,
        role: session?.user.role,
        permissions: session?.user.permissions ?? [],
      }}
    />
  );
}
