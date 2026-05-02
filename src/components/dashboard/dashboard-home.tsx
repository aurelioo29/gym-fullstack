"use client";

import {
  Alert,
  Card,
  Col,
  Row,
  Skeleton,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  AuditOutlined,
  BellOutlined,
  CalendarOutlined,
  CreditCardOutlined,
  DollarOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  ScheduleOutlined,
  TeamOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/client-api";

const { Title, Text } = Typography;

type DashboardHomeProps = {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
    permissions?: string[];
  };
};

type RecentBooking = {
  id: string;
  status: string;
  amountPaid: string;
  bookedAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
  };
  serviceSchedule?: {
    id: string;
    startTime: string;
    service?: {
      id: string;
      name: string;
    };
  };
};

type RecentSchedule = {
  id: string;
  title: string | null;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedSlots: number;
  service?: {
    id: string;
    name: string;
    serviceType: string;
  };
  trainer?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
};

type DashboardOverviewResponse = {
  success: boolean;
  message: string;
  data: {
    stats: {
      totalUsers: number;
      activeUsers: number;
      inactiveUsers: number;

      totalRoles: number;

      pendingTrainerApprovals: number;
      activeTrainerAssignments: number;

      totalMembershipPlans: number;
      activeMembershipPlans: number;
      activeMemberMemberships: number;
      expiredMemberMemberships: number;

      totalServices: number;
      activeServices: number;
      todaySchedules: number;
      upcomingSchedules: number;

      totalBookings: number;
      bookedBookings: number;
      completedBookings: number;
      cancelledBookings: number;
      noShowBookings: number;

      totalNews: number;
      publishedNews: number;
      draftNews: number;

      unreadNotifications: number;
      totalActivityLogs: number;
      totalAuditLogs: number;

      monthlyRevenue: number;
      monthlyMembershipRevenue: number;
      monthlyBookingRevenue: number;
    };
    charts: {
      userRoles: {
        role: string;
        count: number;
      }[];
      logsChart: {
        day: string;
        date: string;
        activityLogs: number;
        auditLogs: number;
      }[];
      bookingsChart: {
        day: string;
        date: string;
        booked: number;
        completed: number;
        cancelled: number;
        noShow: number;
      }[];
      membershipsChart: {
        day: string;
        date: string;
        active: number;
        pending: number;
        expired: number;
        cancelled: number;
      }[];
      revenueChart: {
        day: string;
        date: string;
        memberships: number;
        bookings: number;
        total: number;
      }[];
    };
    recent: {
      recentBookings: RecentBooking[];
      recentSchedules: RecentSchedule[];
    };
  };
};

const roleColors: Record<string, string> = {
  SUPERADMIN: "#ef4444",
  ADMIN: "#3b82f6",
  CUSTOMER: "#22c55e",
  TRAINER: "#a855f7",
};

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning 🌥️";
  if (hour < 17) return "Good afternoon 🌤️";
  if (hour < 21) return "Good evening 🌙";

  return "Good night";
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getBookingStatusColor(status: string) {
  if (status === "BOOKED") return "blue";
  if (status === "COMPLETED") return "green";
  if (status === "CANCELLED") return "red";
  if (status === "NO_SHOW") return "orange";

  return "default";
}

export default function DashboardHome({ user }: DashboardHomeProps) {
  const [overview, setOverview] = useState<
    DashboardOverviewResponse["data"] | null
  >(null);
  const [loading, setLoading] = useState(true);

  const greeting = getGreeting();
  const displayName = user.name || "Admin";

  async function fetchOverview() {
    try {
      setLoading(true);

      const response = await apiGet<DashboardOverviewResponse>(
        "/api/admin/dashboard/overview",
      );

      setOverview(response.data);
    } catch (error) {
      console.error("Fetch dashboard overview error:", error);
      message.error("Failed to fetch dashboard overview");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOverview();
  }, []);

  const stats = overview?.stats;
  const userRoles = overview?.charts.userRoles || [];
  const logsChart = overview?.charts.logsChart || [];
  const bookingsChart = overview?.charts.bookingsChart || [];
  const membershipsChart = overview?.charts.membershipsChart || [];
  const revenueChart = overview?.charts.revenueChart || [];
  const recentBookings = overview?.recent.recentBookings || [];
  const recentSchedules = overview?.recent.recentSchedules || [];

  const bookingColumns: ColumnsType<RecentBooking> = [
    {
      title: "Customer",
      key: "customer",
      render: (_, record) => (
        <div>
          <Text className="block !font-semibold">
            {record.user?.fullName || "-"}
          </Text>
          <Text className="block !text-xs !text-slate-500">
            {record.user?.email || "-"}
          </Text>
        </div>
      ),
    },
    {
      title: "Service",
      key: "service",
      render: (_, record) => (
        <div>
          <Text className="block">
            {record.serviceSchedule?.service?.name || "-"}
          </Text>
          <Text className="block !text-xs !text-slate-500">
            {formatDateTime(record.serviceSchedule?.startTime)}
          </Text>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 120,
      render: (value: string) => (
        <Tag color={getBookingStatusColor(value)}>{value}</Tag>
      ),
    },
    {
      title: "Paid",
      dataIndex: "amountPaid",
      width: 130,
      render: (value: string) => formatCurrency(value),
    },
  ];

  const scheduleColumns: ColumnsType<RecentSchedule> = [
    {
      title: "Schedule",
      key: "schedule",
      render: (_, record) => (
        <div>
          <Text className="block !font-semibold">
            {record.title || record.service?.name || "-"}
          </Text>
          <Text className="block !text-xs !text-slate-500">
            {formatDateTime(record.startTime)}
          </Text>
        </div>
      ),
    },
    {
      title: "Trainer",
      key: "trainer",
      render: (_, record) => record.trainer?.fullName || "-",
    },
    {
      title: "Slots",
      key: "slots",
      width: 110,
      render: (_, record) => (
        <Tag color={record.bookedSlots >= record.capacity ? "red" : "blue"}>
          {record.bookedSlots}/{record.capacity}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <Title level={3} className="!mb-1">
          {greeting}, Welcome back {displayName} to admin dashboard!
        </Title>

        {/* <Text type="secondary">
          {greeting}, welcome back {displayName}. Your gym backend is no longer
          “just ready”; it has responsibilities now.
        </Text> */}
      </div>

      {loading ? (
        <Row gutter={[16, 16]}>
          {Array.from({ length: 12 }).map((_, index) => (
            <Col xs={24} md={12} xl={6} key={index}>
              <Card>
                <Skeleton active paragraph={{ rows: 1 }} />
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12} xl={6}>
              <Card>
                <Statistic
                  title="Total Users"
                  value={stats?.totalUsers || 0}
                  prefix={<TeamOutlined />}
                />
                <Text className="!text-xs !text-slate-500">
                  {stats?.activeUsers || 0} active / {stats?.inactiveUsers || 0}{" "}
                  inactive
                </Text>
              </Card>
            </Col>

            <Col xs={24} md={12} xl={6}>
              <Card>
                <Statistic
                  title="Active Memberships"
                  value={stats?.activeMemberMemberships || 0}
                  prefix={<CreditCardOutlined />}
                />
                <Text className="!text-xs !text-slate-500">
                  {stats?.expiredMemberMemberships || 0} expired memberships
                </Text>
              </Card>
            </Col>

            <Col xs={24} md={12} xl={6}>
              <Card>
                <Statistic
                  title="Monthly Revenue"
                  value={stats?.monthlyRevenue || 0}
                  formatter={(value) => formatCurrency(Number(value))}
                  prefix={<DollarOutlined />}
                />
                <Text className="!text-xs !text-slate-500">
                  Offline membership + booking revenue
                </Text>
              </Card>
            </Col>

            <Col xs={24} md={12} xl={6}>
              <Card>
                <Statistic
                  title="Pending Trainers"
                  value={stats?.pendingTrainerApprovals || 0}
                  prefix={<SafetyCertificateOutlined />}
                />
                <Text className="!text-xs !text-slate-500">
                  Certificate reviews waiting
                </Text>
              </Card>
            </Col>

            <Col xs={24} md={12} xl={6}>
              <Card>
                <Statistic
                  title="Today Schedules"
                  value={stats?.todaySchedules || 0}
                  prefix={<ScheduleOutlined />}
                />
                <Text className="!text-xs !text-slate-500">
                  {stats?.upcomingSchedules || 0} upcoming schedules
                </Text>
              </Card>
            </Col>

            <Col xs={24} md={12} xl={6}>
              <Card>
                <Statistic
                  title="Bookings"
                  value={stats?.totalBookings || 0}
                  prefix={<CalendarOutlined />}
                />
                <Text className="!text-xs !text-slate-500">
                  {stats?.bookedBookings || 0} booked /{" "}
                  {stats?.completedBookings || 0} completed
                </Text>
              </Card>
            </Col>

            <Col xs={24} md={12} xl={6}>
              <Card>
                <Statistic
                  title="Services"
                  value={stats?.activeServices || 0}
                  prefix={<UserSwitchOutlined />}
                />
                <Text className="!text-xs !text-slate-500">
                  {stats?.totalServices || 0} total services
                </Text>
              </Card>
            </Col>

            <Col xs={24} md={12} xl={6}>
              <Card>
                <Statistic
                  title="Published News"
                  value={stats?.publishedNews || 0}
                  prefix={<FileTextOutlined />}
                />
                <Text className="!text-xs !text-slate-500">
                  {stats?.draftNews || 0} draft news
                </Text>
              </Card>
            </Col>

            <Col xs={24} md={12} xl={6}>
              <Card>
                <Statistic
                  title="Trainer Assignments"
                  value={stats?.activeTrainerAssignments || 0}
                  prefix={<SafetyCertificateOutlined />}
                />
                <Text className="!text-xs !text-slate-500">
                  Active trainer-customer assignments
                </Text>
              </Card>
            </Col>

            <Col xs={24} md={12} xl={6}>
              <Card>
                <Statistic
                  title="Membership Plans"
                  value={stats?.activeMembershipPlans || 0}
                  prefix={<CreditCardOutlined />}
                />
                <Text className="!text-xs !text-slate-500">
                  {stats?.totalMembershipPlans || 0} total plans
                </Text>
              </Card>
            </Col>

            <Col xs={24} md={12} xl={6}>
              <Card>
                <Statistic
                  title="Unread Notifications"
                  value={stats?.unreadNotifications || 0}
                  prefix={<BellOutlined />}
                />
                <Text className="!text-xs !text-slate-500">
                  Stuff asking for attention
                </Text>
              </Card>
            </Col>

            <Col xs={24} md={12} xl={6}>
              <Card>
                <Statistic
                  title="System Logs"
                  value={
                    (stats?.totalActivityLogs || 0) +
                    (stats?.totalAuditLogs || 0)
                  }
                  prefix={<AuditOutlined />}
                />
                <Text className="!text-xs !text-slate-500">
                  Activity + audit records
                </Text>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} className="mt-6">
            <Col xs={24} xl={16}>
              <Card
                title="Revenue - Last 7 Days"
                extra={
                  <Text className="!text-xs !text-slate-500">
                    Memberships + Bookings
                  </Text>
                }
              >
                {revenueChart.length === 0 ? (
                  <Alert
                    type="info"
                    showIcon
                    message="No revenue data yet"
                    description="Revenue will appear after paid memberships or bookings are created."
                  />
                ) : (
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueChart}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip
                          formatter={(value) => formatCurrency(Number(value))}
                        />
                        <Legend />
                        <Bar
                          dataKey="memberships"
                          name="Memberships"
                          fill="#3b82f6"
                        />
                        <Bar
                          dataKey="bookings"
                          name="Bookings"
                          fill="#22c55e"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            </Col>

            <Col xs={24} xl={8}>
              <Card
                title="Users by Role"
                extra={
                  <Text className="!text-xs !text-slate-500">
                    Account distribution
                  </Text>
                }
              >
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={userRoles}
                        dataKey="count"
                        nameKey="role"
                        outerRadius={105}
                        label={(entry) => `${entry.role}: ${entry.count}`}
                      >
                        {userRoles.map((entry) => (
                          <Cell
                            key={entry.role}
                            fill={roleColors[entry.role] || "#64748b"}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} className="mt-6">
            <Col xs={24} xl={12}>
              <Card title="Bookings - Last 7 Days">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={bookingsChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="booked"
                        name="Booked"
                        stroke="#3b82f6"
                        strokeWidth={3}
                      />
                      <Line
                        type="monotone"
                        dataKey="completed"
                        name="Completed"
                        stroke="#22c55e"
                        strokeWidth={3}
                      />
                      <Line
                        type="monotone"
                        dataKey="cancelled"
                        name="Cancelled"
                        stroke="#ef4444"
                        strokeWidth={3}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>

            <Col xs={24} xl={12}>
              <Card title="Memberships - Last 7 Days">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={membershipsChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="active"
                        name="Active"
                        stroke="#22c55e"
                        strokeWidth={3}
                      />
                      <Line
                        type="monotone"
                        dataKey="pending"
                        name="Pending"
                        stroke="#f97316"
                        strokeWidth={3}
                      />
                      <Line
                        type="monotone"
                        dataKey="expired"
                        name="Expired"
                        stroke="#ef4444"
                        strokeWidth={3}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} className="mt-6">
            <Col xs={24} xl={12}>
              <Card title="Logs - Last 7 Days">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={logsChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="activityLogs"
                        name="Activity Logs"
                        stroke="#3b82f6"
                        strokeWidth={3}
                      />
                      <Line
                        type="monotone"
                        dataKey="auditLogs"
                        name="Audit Logs"
                        stroke="#f97316"
                        strokeWidth={3}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>

            <Col xs={24} xl={12}>
              <Card title="Role Distribution">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={userRoles}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="role" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Users">
                        {userRoles.map((entry) => (
                          <Cell
                            key={entry.role}
                            fill={roleColors[entry.role] || "#64748b"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} className="mt-6">
            <Col xs={24} xl={12}>
              <Card title="Recent Bookings">
                <Table
                  rowKey="id"
                  size="small"
                  columns={bookingColumns}
                  dataSource={recentBookings}
                  pagination={false}
                  scroll={{ x: 650 }}
                />
              </Card>
            </Col>

            <Col xs={24} xl={12}>
              <Card title="Upcoming Schedules">
                <Table
                  rowKey="id"
                  size="small"
                  columns={scheduleColumns}
                  dataSource={recentSchedules}
                  pagination={false}
                  scroll={{ x: 650 }}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
