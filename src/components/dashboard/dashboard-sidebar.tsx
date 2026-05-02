"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Layout, Menu, theme, Typography } from "antd";
import { Dumbbell } from "lucide-react";
import { usePathname } from "next/navigation";

import {
  dashboardSideMenuItems,
  filterMenuByPermission,
  getDefaultOpenKeys,
  toAntdSideMenuItems,
} from "@/lib/menu/dashboard-menu";
import { apiGet } from "@/lib/client-api";

const { Sider } = Layout;
const { Text } = Typography;

type DashboardSidebarProps = {
  collapsed: boolean;
  permissions: string[];
};

type GymInfoResponse = {
  success: boolean;
  message: string;
  data: {
    id: string;
    name: string;
    tagline: string | null;
    logoUrl: string | null;
  } | null;
};

export default function DashboardSidebar({
  collapsed,
  permissions,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const [gymName, setGymName] = useState("Gym Admin");
  const [gymTagline, setGymTagline] = useState("Management System");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const filteredMenu = filterMenuByPermission(
    dashboardSideMenuItems,
    permissions,
  );

  async function fetchGymInfo() {
    try {
      const response = await apiGet<GymInfoResponse>("/api/admin/gym-info");

      if (!response.data) return;

      setGymName(response.data.name || "Gym Admin");
      setGymTagline(response.data.tagline || "Management System");
      setLogoUrl(response.data.logoUrl || null);
    } catch (error) {
      console.error("Fetch sidebar gym info error:", error);
    }
  }

  useEffect(() => {
    fetchGymInfo();
  }, []);

  return (
    <Sider
      width={260}
      collapsedWidth={80}
      collapsed={collapsed}
      trigger={null}
      style={{
        background: colorBgContainer,
        borderRight: "1px solid #f0f0f0",
      }}
    >
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-100">
        <div className="h-10 w-10 rounded-xl text-white flex items-center justify-center shrink-0 overflow-hidden">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={gymName}
              width={40}
              height={40}
              className="h-full w-full object-contain"
              unoptimized
            />
          ) : (
            <Dumbbell size={20} />
          )}
        </div>

        {!collapsed && (
          <div className="leading-tight min-w-0">
            <Text className="!font-bold !text-slate-900 block truncate">
              {gymName}
            </Text>

            <Text className="!text-xs !text-slate-500 block truncate">
              {gymTagline}
            </Text>
          </div>
        )}
      </div>

      <div className="py-3">
        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          defaultOpenKeys={getDefaultOpenKeys(pathname)}
          style={{ borderInlineEnd: 0 }}
          items={toAntdSideMenuItems(filteredMenu)}
        />
      </div>
    </Sider>
  );
}
