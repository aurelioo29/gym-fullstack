"use client";

import {
  Avatar,
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Pagination,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/client-api";
import LogsTableToolbar from "@/components/logs/logs-table-toolbar";

const { Title, Text } = Typography;
const { TextArea } = Input;

type UserLite = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
};

type TrainerAssignment = {
  id: string;
  customerId: string;
  trainerId: string;
  assignedBy: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer: UserLite;
  trainer: UserLite;
  assignedByUser?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
};

type AssignmentsResponse = {
  success: boolean;
  message: string;
  data: TrainerAssignment[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type UsersResponse = {
  success: boolean;
  message: string;
  data: UserLite[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type AssignmentFormValues = {
  customerId: string;
  trainerId: string;
  startDate: dayjs.Dayjs;
  endDate?: dayjs.Dayjs | null;
  isActive?: boolean;
  notes?: string | null;
};

async function apiPost<T>(
  url: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data;
}

async function apiDelete<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "DELETE",
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data;
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    dateStyle: "medium",
  });
}

function getInitials(name: string) {
  const words = name.trim().split(" ").filter(Boolean);

  if (words.length === 0) return "U";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function UserCell({ user }: { user?: UserLite | null }) {
  if (!user) return <Text>-</Text>;

  return (
    <div className="flex items-center gap-3">
      <Avatar src={user.avatarUrl || undefined} icon={<UserOutlined />}>
        {!user.avatarUrl ? getInitials(user.fullName) : null}
      </Avatar>

      <div className="min-w-0">
        <Text className="block !font-semibold truncate">{user.fullName}</Text>
        <Text className="block !text-xs !text-slate-500 truncate">
          {user.email}
        </Text>
        <Text className="block !text-xs !text-slate-400 truncate">
          {user.phone || "-"}
        </Text>
      </div>
    </div>
  );
}

export default function TrainerAssignmentsPageClient() {
  const [form] = Form.useForm<AssignmentFormValues>();

  const [assignments, setAssignments] = useState<TrainerAssignment[]>([]);
  const [customers, setCustomers] = useState<UserLite[]>([]);
  const [trainers, setTrainers] = useState<UserLite[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [isActive, setIsActive] = useState("ALL");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] =
    useState<TrainerAssignment | null>(null);

  async function fetchAssignments(nextPage = page, nextLimit = limit) {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: String(nextPage),
        limit: String(nextLimit),
      });

      if (search) params.set("search", search);
      if (isActive !== "ALL") params.set("isActive", isActive);

      const response = await apiGet<AssignmentsResponse>(
        `/api/admin/trainer-assignments?${params.toString()}`,
      );

      setAssignments(response.data || []);
      setTotal(response.meta.total || 0);
      setPage(response.meta.page || nextPage);
      setLimit(response.meta.limit || nextLimit);
    } catch (error) {
      console.error("Fetch trainer assignments error:", error);
      message.error("Failed to fetch trainer assignments");
    } finally {
      setLoading(false);
    }
  }

  async function fetchCustomers() {
    try {
      const response = await apiGet<UsersResponse>(
        "/api/admin/users?role=CUSTOMER&isActive=true&limit=100",
      );

      setCustomers(response.data || []);
    } catch (error) {
      console.error("Fetch customers error:", error);
    }
  }

  async function fetchTrainers() {
    try {
      const response = await apiGet<UsersResponse>(
        "/api/admin/users?role=TRAINER&isActive=true&limit=100",
      );

      setTrainers(response.data || []);
    } catch (error) {
      console.error("Fetch trainers error:", error);
    }
  }

  useEffect(() => {
    fetchAssignments(1, limit);
    fetchCustomers();
    fetchTrainers();
  }, []);

  useEffect(() => {
    fetchAssignments(1, limit);
  }, [isActive]);

  function openCreateModal() {
    setEditingAssignment(null);
    form.resetFields();
    form.setFieldsValue({
      startDate: dayjs(),
      endDate: null,
      isActive: true,
    });
    setModalOpen(true);
  }

  function openEditModal(record: TrainerAssignment) {
    setEditingAssignment(record);

    form.setFieldsValue({
      customerId: record.customerId,
      trainerId: record.trainerId,
      startDate: dayjs(record.startDate),
      endDate: record.endDate ? dayjs(record.endDate) : null,
      isActive: record.isActive,
      notes: record.notes,
    });

    setModalOpen(true);
  }

  async function handleSubmit(values: AssignmentFormValues) {
    try {
      setSaving(true);

      const payload = {
        customerId: values.customerId,
        trainerId: values.trainerId,
        startDate: values.startDate.toISOString(),
        endDate: values.endDate ? values.endDate.toISOString() : null,
        isActive: values.isActive ?? true,
        notes: values.notes || null,
      };

      if (editingAssignment) {
        await apiPatch(
          `/api/admin/trainer-assignments/${editingAssignment.id}`,
          payload,
        );

        message.success("Trainer assignment updated successfully");
      } else {
        await apiPost("/api/admin/trainer-assignments", payload);
        message.success("Trainer assignment created successfully");
      }

      setModalOpen(false);
      setEditingAssignment(null);
      form.resetFields();

      await fetchAssignments(page, limit);
    } catch (error) {
      console.error("Save assignment error:", error);
      message.error(
        error instanceof Error
          ? error.message
          : "Failed to save trainer assignment",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(record: TrainerAssignment) {
    Modal.confirm({
      title: "Delete Trainer Assignment",
      content: `Delete assignment between ${record.customer?.fullName} and ${record.trainer?.fullName}?`,
      centered: true,
      okText: "Delete",
      okButtonProps: {
        danger: true,
      },
      async onOk() {
        try {
          await apiDelete(`/api/admin/trainer-assignments/${record.id}`);
          message.success("Trainer assignment deleted successfully");
          await fetchAssignments(page, limit);
        } catch (error) {
          console.error("Delete assignment error:", error);
          message.error(
            error instanceof Error
              ? error.message
              : "Failed to delete trainer assignment",
          );
        }
      },
    });
  }

  function handleReset() {
    setSearch("");
    setIsActive("ALL");
    setPage(1);

    setTimeout(() => {
      fetchAssignments(1, limit);
    }, 0);
  }

  const columns: ColumnsType<TrainerAssignment> = [
    {
      title: "Customer",
      key: "customer",
      width: 310,
      render: (_, record) => <UserCell user={record.customer} />,
    },
    {
      title: "Trainer",
      key: "trainer",
      width: 310,
      render: (_, record) => <UserCell user={record.trainer} />,
    },
    {
      title: "Period",
      key: "period",
      width: 220,
      render: (_, record) => (
        <div>
          <Text className="block">{formatDate(record.startDate)}</Text>
          <Text className="block !text-xs !text-slate-500">
            to {formatDate(record.endDate) || "No end date"}
          </Text>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "isActive",
      width: 120,
      render: (value: boolean) =>
        value ? (
          <Tag color="green">Active</Tag>
        ) : (
          <Tag color="red">Inactive</Tag>
        ),
    },
    {
      title: "Assigned By",
      key: "assignedByUser",
      width: 220,
      render: (_, record) => (
        <div>
          <Text className="block !font-medium">
            {record.assignedByUser?.fullName || "-"}
          </Text>
          <Text className="block !text-xs !text-slate-500">
            {record.assignedByUser?.email || "-"}
          </Text>
        </div>
      ),
    },
    {
      title: "Notes",
      dataIndex: "notes",
      render: (value) => value || "-",
    },
    {
      title: "Action",
      key: "action",
      width: 150,
      align: "center",
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          />

          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Title level={3} className="!mb-1">
            Trainer Assignments
          </Title>
          <Text type="secondary">
            Assign approved trainers to customers. Finally, matchmaking that is
            not dating-app chaos.
          </Text>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateModal}
        >
          Add Assignment
        </Button>
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_auto_auto]">
          <div>
            <div className="mb-1 text-xs font-medium text-slate-600">
              Search
            </div>
            <Input
              allowClear
              value={search}
              prefix={<SearchOutlined />}
              placeholder="Search customer, trainer, email, phone, or notes"
              onChange={(event) => setSearch(event.target.value)}
              onPressEnter={() => fetchAssignments(1, limit)}
            />
          </div>

          <div>
            <div className="mb-1 text-xs font-medium text-slate-600">
              Status
            </div>
            <Select
              value={isActive}
              className="w-full"
              onChange={(value) => {
                setIsActive(value);
                setPage(1);
              }}
              options={[
                { label: "All Status", value: "ALL" },
                { label: "Active", value: "true" },
                { label: "Inactive", value: "false" },
              ]}
            />
          </div>

          <div className="flex items-end">
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => fetchAssignments(1, limit)}
            >
              Search
            </Button>
          </div>

          <div className="flex items-end">
            <Button onClick={handleReset}>Reset</Button>
          </div>
        </div>
      </Card>

      <Card>
        <LogsTableToolbar
          total={total}
          page={page}
          limit={limit}
          selectedCount={selectedRowKeys.length}
          onRefresh={() => fetchAssignments(page, limit)}
          onLimitChange={(value) => {
            setLimit(value);
            setPage(1);
            fetchAssignments(1, value);
          }}
        />

        <Table
          rowKey="id"
          size="small"
          loading={loading}
          columns={columns}
          dataSource={assignments}
          pagination={false}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          locale={{
            emptyText: <Empty description="No trainer assignments found" />,
          }}
          scroll={{ x: 1400 }}
        />

        <div className="mt-4 flex justify-end">
          <Space>
            <Text className="!text-xs !text-slate-500">
              showing {total === 0 ? 0 : (page - 1) * limit + 1} to{" "}
              {Math.min(page * limit, total)} of {total} items
            </Text>

            <Pagination
              size="small"
              current={page}
              pageSize={limit}
              total={total}
              showSizeChanger={false}
              onChange={(nextPage) => {
                setPage(nextPage);
                fetchAssignments(nextPage, limit);
              }}
            />
          </Space>
        </div>
      </Card>

      <Modal
        title={
          editingAssignment
            ? "Edit Trainer Assignment"
            : "Add Trainer Assignment"
        }
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingAssignment(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText={editingAssignment ? "Update" : "Create"}
        confirmLoading={saving}
        width={760}
        centered
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Customer"
            name="customerId"
            rules={[{ required: true, message: "Customer is required" }]}
          >
            <Select
              showSearch
              placeholder="Select customer"
              optionFilterProp="label"
              options={customers.map((item) => ({
                label: `${item.fullName} - ${item.email}`,
                value: item.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Trainer"
            name="trainerId"
            rules={[{ required: true, message: "Trainer is required" }]}
          >
            <Select
              showSearch
              placeholder="Select trainer"
              optionFilterProp="label"
              options={trainers.map((item) => ({
                label: `${item.fullName} - ${item.email}`,
                value: item.id,
              }))}
            />
          </Form.Item>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Form.Item
              label="Start Date"
              name="startDate"
              rules={[{ required: true, message: "Start date is required" }]}
            >
              <DatePicker className="w-full" />
            </Form.Item>

            <Form.Item label="End Date" name="endDate">
              <DatePicker className="w-full" />
            </Form.Item>
          </div>

          <Form.Item label="Active" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item label="Notes" name="notes">
            <TextArea rows={4} placeholder="Assignment notes..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
