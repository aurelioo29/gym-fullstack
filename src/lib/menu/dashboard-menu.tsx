import {
  AppstoreOutlined,
  AuditOutlined,
  BellOutlined,
  FileProtectOutlined,
  FolderOutlined,
  HomeOutlined,
  IdcardOutlined,
  NotificationOutlined,
  ReadOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import Link from "next/link";

export type DashboardMenuItem = {
  key: string;
  label: string;
  href?: string;
  icon?: React.ReactNode;
  permission?: string;
  children?: DashboardMenuItem[];
};

export const dashboardSideMenuItems: DashboardMenuItem[] = [
  {
    key: "/dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: <HomeOutlined />,
    permission: "dashboard.view",
  },

  {
    key: "user-management",
    label: "User Management",
    icon: <UserOutlined />,
    permission: "users.view",
    children: [
      {
        key: "/dashboard/users",
        label: "Users",
        href: "/dashboard/users",
        icon: <TeamOutlined />,
        permission: "users.view",
      },
      {
        key: "/dashboard/trainers/approval",
        label: "Trainer Approval",
        href: "/dashboard/trainers/approval",
        icon: <IdcardOutlined />,
        permission: "trainer_profiles.review",
      },
      {
        key: "/dashboard/trainer-assignments",
        label: "Trainer Assignments",
        href: "/dashboard/trainer-assignments",
        icon: <IdcardOutlined />,
        permission: "trainer_assignments.view",
      },
    ],
  },

  {
    key: "access-control",
    label: "Access Control",
    icon: <SafetyCertificateOutlined />,
    permission: "roles.view",
    children: [
      {
        key: "/dashboard/roles",
        label: "Roles",
        href: "/dashboard/roles",
        icon: <SafetyCertificateOutlined />,
        permission: "roles.view",
      },
      {
        key: "/dashboard/permissions",
        label: "Permissions",
        href: "/dashboard/permissions",
        icon: <FileProtectOutlined />,
        permission: "permissions.view",
      },
    ],
  },

  {
    key: "content-management",
    label: "Content Management",
    icon: <ReadOutlined />,
    permission: "news.view",
    children: [
      {
        key: "/dashboard/news-categories",
        label: "News Categories",
        href: "/dashboard/news-categories",
        icon: <FolderOutlined />,
        permission: "news_categories.view",
      },
      {
        key: "/dashboard/news",
        label: "News",
        href: "/dashboard/news",
        icon: <ReadOutlined />,
        permission: "news.view",
      },
    ],
  },

  {
    key: "settings",
    label: "Settings",
    icon: <SettingOutlined />,
    permission: "settings.view",
    children: [
      {
        key: "/dashboard/settings/gym-info",
        label: "Gym Info",
        href: "/dashboard/settings/gym-info",
        icon: <AppstoreOutlined />,
        permission: "gym_info.view",
      },
      {
        key: "/dashboard/settings/general",
        label: "General Settings",
        href: "/dashboard/settings/general",
        icon: <SettingOutlined />,
        permission: "settings.view",
      },
    ],
  },

  {
    key: "/dashboard/notifications",
    label: "Notifications",
    href: "/dashboard/notifications",
    icon: <BellOutlined />,
  },

  {
    key: "logs",
    label: "Logs",
    icon: <AuditOutlined />,
    permission: "activity_logs.view",
    children: [
      {
        key: "/dashboard/logs/activity",
        label: "Activity Logs",
        href: "/dashboard/logs/activity",
        icon: <NotificationOutlined />,
        permission: "activity_logs.view",
      },
      {
        key: "/dashboard/logs/audit",
        label: "Audit Logs",
        href: "/dashboard/logs/audit",
        icon: <AuditOutlined />,
        permission: "audit_logs.view",
      },
    ],
  },
];

function hasPermission(item: DashboardMenuItem, permissions: string[]) {
  if (!item.permission) return true;

  return permissions.includes(item.permission);
}

export function filterMenuByPermission(
  items: DashboardMenuItem[],
  permissions: string[],
): DashboardMenuItem[] {
  return items
    .map((item) => {
      if (item.children) {
        const children = filterMenuByPermission(item.children, permissions);

        if (children.length === 0 && !hasPermission(item, permissions)) {
          return null;
        }

        return {
          ...item,
          children,
        };
      }

      if (!hasPermission(item, permissions)) {
        return null;
      }

      return item;
    })
    .filter(Boolean) as DashboardMenuItem[];
}

export function toAntdSideMenuItems(
  items: DashboardMenuItem[],
): MenuProps["items"] {
  return items.map((item) => {
    if (item.children) {
      return {
        key: item.key,
        icon: item.icon,
        label: item.label,
        children: toAntdSideMenuItems(item.children),
      };
    }

    return {
      key: item.key,
      icon: item.icon,
      label: item.href ? (
        <Link href={item.href}>{item.label}</Link>
      ) : (
        item.label
      ),
    };
  });
}

export function getDefaultOpenKeys(pathname: string) {
  if (
    pathname.startsWith("/dashboard/users") ||
    pathname.startsWith("/dashboard/trainers") ||
    pathname.startsWith("/dashboard/trainer-assignments")
  ) {
    return ["user-management"];
  }

  if (
    pathname.startsWith("/dashboard/roles") ||
    pathname.startsWith("/dashboard/permissions")
  ) {
    return ["access-control"];
  }

  if (
    pathname.startsWith("/dashboard/news") ||
    pathname.startsWith("/dashboard/news-categories")
  ) {
    return ["content-management"];
  }

  if (pathname.startsWith("/dashboard/settings")) {
    return ["settings"];
  }

  if (pathname.startsWith("/dashboard/logs")) {
    return ["logs"];
  }

  return [];
}
