"use client";

import {
  Button,
  Card,
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
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/client-api";
import LogsTableToolbar from "@/components/logs/logs-table-toolbar";

const { Title, Text } = Typography;
const { TextArea } = Input;

type NewsCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type CategoriesResponse = {
  success: boolean;
  message: string;
  data: NewsCategory[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type CategoryFormValues = {
  name: string;
  slug?: string;
  description?: string | null;
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

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function NewsCategoriesPageClient() {
  const [form] = Form.useForm<CategoryFormValues>();

  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [isActive, setIsActive] = useState("ALL");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<NewsCategory | null>(
    null,
  );

  async function fetchCategories(nextPage = page, nextLimit = limit) {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: String(nextPage),
        limit: String(nextLimit),
      });

      if (search) params.set("search", search);
      if (isActive !== "ALL") params.set("isActive", isActive);

      const response = await apiGet<CategoriesResponse>(
        `/api/admin/news-categories?${params.toString()}`,
      );

      setCategories(response.data || []);
      setTotal(response.meta.total || 0);
      setPage(response.meta.page || nextPage);
      setLimit(response.meta.limit || nextLimit);
    } catch (error) {
      console.error("Fetch news categories error:", error);
      message.error("Failed to fetch news categories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCategories(1, limit);
  }, [isActive]);

  function openCreateModal() {
    setEditingCategory(null);
    form.resetFields();
    form.setFieldsValue({
      isActive: true,
    });
    setModalOpen(true);
  }

  function openEditModal(record: NewsCategory) {
    setEditingCategory(record);
    form.setFieldsValue({
      name: record.name,
      slug: record.slug,
      description: record.description,
      isActive: record.isActive,
    });
    setModalOpen(true);
  }

  async function handleSubmit(values: CategoryFormValues) {
    try {
      setSaving(true);

      const payload = {
        name: values.name,
        slug: values.slug || undefined,
        description: values.description || null,
        isActive: values.isActive ?? true,
      };

      if (editingCategory) {
        await apiPatch(
          `/api/admin/news-categories/${editingCategory.id}`,
          payload,
        );
        message.success("News category updated successfully");
      } else {
        await apiPost("/api/admin/news-categories", payload);
        message.success("News category created successfully");
      }

      setModalOpen(false);
      setEditingCategory(null);
      form.resetFields();

      await fetchCategories(page, limit);
    } catch (error) {
      console.error("Save category error:", error);
      message.error(
        error instanceof Error ? error.message : "Failed to save category",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(record: NewsCategory) {
    Modal.confirm({
      title: "Delete News Category",
      content: `Are you sure you want to delete "${record.name}"?`,
      centered: true,
      okText: "Delete",
      okButtonProps: {
        danger: true,
      },
      async onOk() {
        try {
          await apiDelete(`/api/admin/news-categories/${record.id}`);
          message.success("News category deleted successfully");
          await fetchCategories(page, limit);
        } catch (error) {
          console.error("Delete category error:", error);
          message.error(
            error instanceof Error
              ? error.message
              : "Failed to delete category",
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
      fetchCategories(1, limit);
    }, 0);
  }

  const columns: ColumnsType<NewsCategory> = [
    {
      title: "Category",
      key: "category",
      width: 320,
      render: (_, record) => (
        <div>
          <Text className="block !font-semibold">{record.name}</Text>
          <Text className="block !text-xs !text-slate-500">{record.slug}</Text>
        </div>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      render: (value) => value || "-",
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
            News Categories
          </Title>
          <Text type="secondary">
            Manage categories used to organize news content.
          </Text>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateModal}
        >
          Add Category
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
              placeholder="Search category name, slug, or description"
              onChange={(event) => setSearch(event.target.value)}
              onPressEnter={() => fetchCategories(1, limit)}
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
              onClick={() => fetchCategories(1, limit)}
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
          onRefresh={() => fetchCategories(page, limit)}
          onLimitChange={(value) => {
            setLimit(value);
            setPage(1);
            fetchCategories(1, value);
          }}
        />

        <Table
          rowKey="id"
          size="small"
          loading={loading}
          columns={columns}
          dataSource={categories}
          pagination={false}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          locale={{
            emptyText: <Empty description="No news categories found" />,
          }}
          scroll={{ x: 900 }}
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
                fetchCategories(nextPage, limit);
              }}
            />
          </Space>
        </div>
      </Card>

      <Modal
        title={editingCategory ? "Edit News Category" : "Add News Category"}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingCategory(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText={editingCategory ? "Update" : "Create"}
        confirmLoading={saving}
        centered
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Name"
            name="name"
            rules={[
              {
                required: true,
                message: "Category name is required",
              },
            ]}
          >
            <Input placeholder="Gym Tips" />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <TextArea rows={3} placeholder="Category description..." />
          </Form.Item>

          <Form.Item label="Active" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
