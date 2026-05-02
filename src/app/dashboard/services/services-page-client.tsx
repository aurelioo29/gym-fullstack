"use client";

import {
  Button,
  Card,
  Empty,
  Form,
  Image,
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
  Upload,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { UploadRequestOption } from "rc-upload/lib/interface";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/client-api";
import LogsTableToolbar from "@/components/logs/logs-table-toolbar";

const { Title, Text } = Typography;
const { TextArea } = Input;

type ServiceType = "CLASS" | "PERSONAL_TRAINING" | "FACILITY" | "OTHER";

type ServiceItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  serviceType: ServiceType;
  price: string;
  durationMinutes: number;
  capacity: number | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ServicesResponse = {
  success: boolean;
  message: string;
  data: ServiceItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type ServiceFormValues = {
  name: string;
  slug?: string;
  description?: string | null;
  serviceType: ServiceType;
  price: number;
  durationMinutes: number;
  capacity?: number | null;
  imageUrl?: string | null;
  isActive?: boolean;
};

type UploadResponse = {
  success: boolean;
  message: string;
  data: {
    url: string;
  };
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

async function uploadServiceImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/admin/services/upload", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const data = (await response.json()) as UploadResponse;

  if (!response.ok) {
    throw new Error(data?.message || "Upload failed");
  }

  return data.data.url;
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getServiceTypeColor(type: ServiceType) {
  if (type === "CLASS") return "blue";
  if (type === "PERSONAL_TRAINING") return "purple";
  if (type === "FACILITY") return "green";
  return "default";
}

export default function ServicesPageClient() {
  const [form] = Form.useForm<ServiceFormValues>();

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [serviceType, setServiceType] = useState("ALL");
  const [isActive, setIsActive] = useState("ALL");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(
    null,
  );

  const imageUrl = Form.useWatch("imageUrl", form);

  async function fetchServices(nextPage = page, nextLimit = limit) {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: String(nextPage),
        limit: String(nextLimit),
      });

      if (search) params.set("search", search);
      if (serviceType !== "ALL") params.set("serviceType", serviceType);
      if (isActive !== "ALL") params.set("isActive", isActive);

      const response = await apiGet<ServicesResponse>(
        `/api/admin/services?${params.toString()}`,
      );

      setServices(response.data || []);
      setTotal(response.meta.total || 0);
      setPage(response.meta.page || nextPage);
      setLimit(response.meta.limit || nextLimit);
    } catch (error) {
      console.error("Fetch services error:", error);
      message.error("Failed to fetch services");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchServices(1, limit);
  }, [serviceType, isActive]);

  function openCreateModal() {
    setEditingService(null);
    form.resetFields();
    form.setFieldsValue({
      serviceType: "CLASS",
      price: 0,
      durationMinutes: 60,
      capacity: null,
      imageUrl: null,
      isActive: true,
    });
    setModalOpen(true);
  }

  function openEditModal(record: ServiceItem) {
    setEditingService(record);

    form.setFieldsValue({
      name: record.name,
      slug: record.slug,
      description: record.description,
      serviceType: record.serviceType,
      price: Number(record.price),
      durationMinutes: record.durationMinutes,
      capacity: record.capacity,
      imageUrl: record.imageUrl,
      isActive: record.isActive,
    });

    setModalOpen(true);
  }

  function createUploadHandler() {
    return async (options: UploadRequestOption) => {
      const { file, onSuccess, onError } = options;

      try {
        const uploadedUrl = await uploadServiceImage(file as File);

        form.setFieldValue("imageUrl", uploadedUrl);
        message.success("Image uploaded successfully");

        onSuccess?.({ url: uploadedUrl });
      } catch (error) {
        console.error("Upload service image error:", error);
        message.error(error instanceof Error ? error.message : "Upload failed");
        onError?.(error as Error);
      }
    };
  }

  async function handleSubmit(values: ServiceFormValues) {
    try {
      setSaving(true);

      const payload = {
        name: values.name,
        slug: values.slug || undefined,
        description: values.description || null,
        serviceType: values.serviceType,
        price: values.price ?? 0,
        durationMinutes: values.durationMinutes,
        capacity: values.capacity ?? null,
        imageUrl: values.imageUrl || null,
        isActive: values.isActive ?? true,
      };

      if (editingService) {
        await apiPatch(`/api/admin/services/${editingService.id}`, payload);
        message.success("Service updated successfully");
      } else {
        await apiPost("/api/admin/services", payload);
        message.success("Service created successfully");
      }

      setModalOpen(false);
      setEditingService(null);
      form.resetFields();

      await fetchServices(page, limit);
    } catch (error) {
      console.error("Save service error:", error);
      message.error(
        error instanceof Error ? error.message : "Failed to save service",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(record: ServiceItem) {
    Modal.confirm({
      title: "Delete Service",
      content: `Are you sure you want to delete "${record.name}"?`,
      centered: true,
      okText: "Delete",
      okButtonProps: {
        danger: true,
      },
      async onOk() {
        try {
          await apiDelete(`/api/admin/services/${record.id}`);
          message.success("Service deleted successfully");
          await fetchServices(page, limit);
        } catch (error) {
          console.error("Delete service error:", error);
          message.error(
            error instanceof Error ? error.message : "Failed to delete service",
          );
        }
      },
    });
  }

  function handleReset() {
    setSearch("");
    setServiceType("ALL");
    setIsActive("ALL");
    setPage(1);

    setTimeout(() => {
      fetchServices(1, limit);
    }, 0);
  }

  const columns: ColumnsType<ServiceItem> = [
    {
      title: "Service",
      key: "service",
      width: 380,
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <div className="h-14 w-20 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shrink-0">
            {record.imageUrl ? (
              <Image
                src={record.imageUrl}
                alt={record.name}
                width={80}
                height={56}
                className="object-cover"
                preview={false}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                No Image
              </div>
            )}
          </div>

          <div className="min-w-0">
            <Text className="block !font-semibold truncate">{record.name}</Text>
            <Text className="block !text-xs !text-slate-500 truncate">
              {record.slug}
            </Text>
            {record.description ? (
              <Text className="block !text-xs !text-slate-400 truncate">
                {record.description}
              </Text>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      title: "Type",
      dataIndex: "serviceType",
      width: 170,
      render: (value: ServiceType) => (
        <Tag color={getServiceTypeColor(value)}>{value}</Tag>
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
      dataIndex: "durationMinutes",
      width: 120,
      render: (value: number) => <Tag>{value} min</Tag>,
    },
    {
      title: "Capacity",
      dataIndex: "capacity",
      width: 120,
      render: (value: number | null) =>
        value === null ? <Tag>Unlimited</Tag> : <Tag>{value}</Tag>,
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
            Services
          </Title>
          <Text type="secondary">
            Manage gym services, classes, facilities, and personal training
            offers.
          </Text>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateModal}
        >
          Add Service
        </Button>
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_180px_auto_auto]">
          <div>
            <div className="mb-1 text-xs font-medium text-slate-600">
              Search
            </div>
            <Input
              allowClear
              value={search}
              prefix={<SearchOutlined />}
              placeholder="Search service name, slug, or description"
              onChange={(event) => setSearch(event.target.value)}
              onPressEnter={() => fetchServices(1, limit)}
            />
          </div>

          <div>
            <div className="mb-1 text-xs font-medium text-slate-600">Type</div>
            <Select
              value={serviceType}
              className="w-full"
              onChange={(value) => {
                setServiceType(value);
                setPage(1);
              }}
              options={[
                { label: "All Types", value: "ALL" },
                { label: "Class", value: "CLASS" },
                { label: "Personal Training", value: "PERSONAL_TRAINING" },
                { label: "Facility", value: "FACILITY" },
                { label: "Other", value: "OTHER" },
              ]}
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
              onClick={() => fetchServices(1, limit)}
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
          onRefresh={() => fetchServices(page, limit)}
          onLimitChange={(value) => {
            setLimit(value);
            setPage(1);
            fetchServices(1, value);
          }}
        />

        <Table
          rowKey="id"
          size="small"
          loading={loading}
          columns={columns}
          dataSource={services}
          pagination={false}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          locale={{
            emptyText: <Empty description="No services found" />,
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
                fetchServices(nextPage, limit);
              }}
            />
          </Space>
        </div>
      </Card>

      <Modal
        title={editingService ? "Edit Service" : "Add Service"}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingService(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText={editingService ? "Update" : "Create"}
        confirmLoading={saving}
        width={820}
        centered
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Form.Item
              label="Service Name"
              name="name"
              rules={[{ required: true, message: "Service name is required" }]}
            >
              <Input placeholder="Yoga Class" />
            </Form.Item>

            <Form.Item
              label="Slug"
              name="slug"
              extra="Leave empty to generate automatically from name."
            >
              <Input placeholder="yoga-class" />
            </Form.Item>

            <Form.Item label="Service Type" name="serviceType">
              <Select
                options={[
                  { label: "Class", value: "CLASS" },
                  { label: "Personal Training", value: "PERSONAL_TRAINING" },
                  { label: "Facility", value: "FACILITY" },
                  { label: "Other", value: "OTHER" },
                ]}
              />
            </Form.Item>

            <Form.Item label="Price" name="price">
              <InputNumber className="w-full" min={0} prefix="Rp" />
            </Form.Item>

            <Form.Item
              label="Duration Minutes"
              name="durationMinutes"
              rules={[{ required: true, message: "Duration is required" }]}
            >
              <InputNumber className="w-full" min={1} />
            </Form.Item>

            <Form.Item
              label="Capacity"
              name="capacity"
              extra="Leave empty for unlimited."
            >
              <InputNumber className="w-full" min={0} />
            </Form.Item>

            <Form.Item label="Active" name="isActive" valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.Item
              label="Description"
              name="description"
              className="md:col-span-2"
            >
              <TextArea rows={3} placeholder="Service description..." />
            </Form.Item>

            <div className="md:col-span-2">
              <Text className="mb-2 block !text-sm !font-medium">
                Service Image
              </Text>

              <div className="flex flex-wrap items-start gap-4 rounded-xl border border-slate-200 p-4">
                <div className="h-[110px] w-[160px] overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt="Service"
                      width={160}
                      height={110}
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-400">
                      No Image
                    </div>
                  )}
                </div>

                <div>
                  <Space wrap>
                    <Upload
                      showUploadList={false}
                      customRequest={createUploadHandler()}
                      accept="image/png,image/jpeg,image/webp"
                    >
                      <Button icon={<UploadOutlined />}>Upload Image</Button>
                    </Upload>

                    {imageUrl ? (
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => form.setFieldValue("imageUrl", null)}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </Space>

                  <Form.Item name="imageUrl" hidden>
                    <Input />
                  </Form.Item>

                  <Text className="mt-2 block !text-xs !text-slate-500">
                    Recommended ratio 16:9. JPG, PNG, or WEBP.
                  </Text>
                </div>
              </div>
            </div>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
