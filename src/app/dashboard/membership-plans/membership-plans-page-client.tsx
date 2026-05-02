"use client";

import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
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
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/client-api";
import LogsTableToolbar from "@/components/logs/logs-table-toolbar";

const { Title, Text } = Typography;
const { TextArea } = Input;

type MembershipPlan = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  durationDays: number;
  maxBookingsPerMonth: number | null;
  benefits: string[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type MembershipPlansResponse = {
  success: boolean;
  message: string;
  data: MembershipPlan[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type MembershipPlanFormValues = {
  name: string;
  slug?: string;
  description?: string | null;
  price: number;
  durationDays: number;
  maxBookingsPerMonth?: number | null;
  benefitsText?: string;
  isActive?: boolean;
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

function formatCurrency(value: string | number) {
  const numberValue = Number(value || 0);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(numberValue);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function parseBenefitsText(value?: string) {
  if (!value) return null;

  const benefits = value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  return benefits.length > 0 ? benefits : null;
}

function benefitsToText(value?: string[] | null) {
  if (!value || value.length === 0) return "";

  return value.join("\n");
}

export default function MembershipPlansPageClient() {
  const [form] = Form.useForm<MembershipPlanFormValues>();

  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [isActive, setIsActive] = useState("ALL");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);

  async function fetchPlans(nextPage = page, nextLimit = limit) {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: String(nextPage),
        limit: String(nextLimit),
      });

      if (search) params.set("search", search);
      if (isActive !== "ALL") params.set("isActive", isActive);

      const response = await apiGet<MembershipPlansResponse>(
        `/api/admin/membership-plans?${params.toString()}`,
      );

      setPlans(response.data || []);
      setTotal(response.meta.total || 0);
      setPage(response.meta.page || nextPage);
      setLimit(response.meta.limit || nextLimit);
    } catch (error) {
      console.error("Fetch membership plans error:", error);
      message.error("Failed to fetch membership plans");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPlans(1, limit);
  }, [isActive]);

  function openCreateModal() {
    setEditingPlan(null);
    form.resetFields();
    form.setFieldsValue({
      price: 0,
      durationDays: 30,
      maxBookingsPerMonth: null,
      benefitsText: "",
      isActive: true,
    });
    setModalOpen(true);
  }

  function openEditModal(record: MembershipPlan) {
    setEditingPlan(record);

    form.setFieldsValue({
      name: record.name,
      slug: record.slug,
      description: record.description,
      price: Number(record.price),
      durationDays: record.durationDays,
      maxBookingsPerMonth: record.maxBookingsPerMonth,
      benefitsText: benefitsToText(record.benefits),
      isActive: record.isActive,
    });

    setModalOpen(true);
  }

  async function handleSubmit(values: MembershipPlanFormValues) {
    try {
      setSaving(true);

      const payload = {
        name: values.name,
        slug: values.slug || undefined,
        description: values.description || null,
        price: values.price,
        durationDays: values.durationDays,
        maxBookingsPerMonth: values.maxBookingsPerMonth ?? null,
        benefits: parseBenefitsText(values.benefitsText),
        isActive: values.isActive ?? true,
      };

      if (editingPlan) {
        await apiPatch(
          `/api/admin/membership-plans/${editingPlan.id}`,
          payload,
        );
        message.success("Membership plan updated successfully");
      } else {
        await apiPost("/api/admin/membership-plans", payload);
        message.success("Membership plan created successfully");
      }

      setModalOpen(false);
      setEditingPlan(null);
      form.resetFields();

      await fetchPlans(page, limit);
    } catch (error) {
      console.error("Save membership plan error:", error);
      message.error(
        error instanceof Error
          ? error.message
          : "Failed to save membership plan",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(record: MembershipPlan) {
    Modal.confirm({
      title: "Delete Membership Plan",
      content: `Are you sure you want to delete "${record.name}"?`,
      centered: true,
      okText: "Delete",
      okButtonProps: {
        danger: true,
      },
      async onOk() {
        try {
          await apiDelete(`/api/admin/membership-plans/${record.id}`);
          message.success("Membership plan deleted successfully");
          await fetchPlans(page, limit);
        } catch (error) {
          console.error("Delete membership plan error:", error);
          message.error(
            error instanceof Error
              ? error.message
              : "Failed to delete membership plan",
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
      fetchPlans(1, limit);
    }, 0);
  }

  const columns: ColumnsType<MembershipPlan> = [
    {
      title: "Plan",
      key: "plan",
      width: 320,
      render: (_, record) => (
        <div>
          <Text className="block !font-semibold">{record.name}</Text>
          <Text className="block !text-xs !text-slate-500">{record.slug}</Text>
          {record.description ? (
            <Text className="block !text-xs !text-slate-400">
              {record.description}
            </Text>
          ) : null}
        </div>
      ),
    },
    {
      title: "Price",
      dataIndex: "price",
      width: 160,
      render: (value: string) => (
        <Text className="!font-semibold">{formatCurrency(value)}</Text>
      ),
    },
    {
      title: "Duration",
      dataIndex: "durationDays",
      width: 120,
      render: (value: number) => <Tag>{value} days</Tag>,
    },
    {
      title: "Monthly Booking",
      dataIndex: "maxBookingsPerMonth",
      width: 150,
      render: (value: number | null) =>
        value === null ? <Tag>Unlimited</Tag> : <Tag>{value} / month</Tag>,
    },
    {
      title: "Benefits",
      dataIndex: "benefits",
      width: 240,
      render: (value: string[] | null) =>
        value && value.length > 0 ? (
          <Space wrap>
            {value.slice(0, 2).map((item) => (
              <Tag key={item}>{item}</Tag>
            ))}
            {value.length > 2 ? <Tag>+{value.length - 2}</Tag> : null}
          </Space>
        ) : (
          "-"
        ),
    },
    {
      title: "Status",
      dataIndex: "isActive",
      width: 110,
      render: (value: boolean) =>
        value ? (
          <Tag color="green">Active</Tag>
        ) : (
          <Tag color="red">Inactive</Tag>
        ),
    },
    {
      title: "Created at",
      dataIndex: "createdAt",
      width: 190,
      render: (value: string) => formatDate(value),
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
            Membership Plans
          </Title>
          <Text type="secondary">
            Manage gym membership packages, prices, benefits, and limits.
          </Text>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateModal}
        >
          Add Plan
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
              placeholder="Search plan name, slug, or description"
              onChange={(event) => setSearch(event.target.value)}
              onPressEnter={() => fetchPlans(1, limit)}
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
              onClick={() => fetchPlans(1, limit)}
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
          onRefresh={() => fetchPlans(page, limit)}
          onLimitChange={(value) => {
            setLimit(value);
            setPage(1);
            fetchPlans(1, value);
          }}
        />

        <Table
          rowKey="id"
          size="small"
          loading={loading}
          columns={columns}
          dataSource={plans}
          pagination={false}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          locale={{
            emptyText: <Empty description="No membership plans found" />,
          }}
          scroll={{ x: 1350 }}
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
                fetchPlans(nextPage, limit);
              }}
            />
          </Space>
        </div>
      </Card>

      <Modal
        title={editingPlan ? "Edit Membership Plan" : "Add Membership Plan"}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingPlan(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText={editingPlan ? "Update" : "Create"}
        confirmLoading={saving}
        width={760}
        centered
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Form.Item
              label="Plan Name"
              name="name"
              rules={[{ required: true, message: "Plan name is required" }]}
            >
              <Input placeholder="Monthly Premium" />
            </Form.Item>

            <Form.Item
              label="Slug"
              name="slug"
              extra="Leave empty to generate automatically from name."
            >
              <Input placeholder="monthly-premium" />
            </Form.Item>

            <Form.Item
              label="Price"
              name="price"
              rules={[{ required: true, message: "Price is required" }]}
            >
              <InputNumber
                className="w-full"
                min={0}
                prefix="Rp"
                placeholder="250000"
              />
            </Form.Item>

            <Form.Item
              label="Duration Days"
              name="durationDays"
              rules={[{ required: true, message: "Duration is required" }]}
            >
              <InputNumber className="w-full" min={1} placeholder="30" />
            </Form.Item>

            <Form.Item
              label="Max Bookings Per Month"
              name="maxBookingsPerMonth"
              extra="Leave empty for unlimited."
            >
              <InputNumber className="w-full" min={0} placeholder="Unlimited" />
            </Form.Item>

            <Form.Item label="Active" name="isActive" valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.Item
              label="Description"
              name="description"
              className="md:col-span-2"
            >
              <TextArea rows={3} placeholder="Plan description..." />
            </Form.Item>

            <Form.Item
              label="Benefits"
              name="benefitsText"
              className="md:col-span-2"
              extra="Write one benefit per line."
            >
              <TextArea
                rows={5}
                placeholder={
                  "Access gym equipment\nFree locker\n2 PT consultations"
                }
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
