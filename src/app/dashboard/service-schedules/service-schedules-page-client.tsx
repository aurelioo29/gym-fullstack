"use client";

import {
  Avatar,
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CloseOutlined,
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

type ServiceItem = {
  id: string;
  name: string;
  slug: string;
  serviceType: string;
  price: string;
  durationMinutes: number;
  capacity: number | null;
};

type TrainerLite = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
};

type ServiceSchedule = {
  id: string;
  serviceId: string;
  trainerId: string | null;
  title: string | null;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedSlots: number;
  location: string | null;
  notes: string | null;
  isCancelled: boolean;
  cancelReason: string | null;
  createdAt: string;
  service: ServiceItem;
  trainer?: TrainerLite | null;
  createdByUser?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
};

type SchedulesResponse = {
  success: boolean;
  message: string;
  data: ServiceSchedule[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type ServicesResponse = {
  success: boolean;
  message: string;
  data: ServiceItem[];
};

type UsersResponse = {
  success: boolean;
  message: string;
  data: TrainerLite[];
};

type ScheduleFormValues = {
  serviceId: string;
  trainerId?: string | null;
  title?: string | null;
  startTime: dayjs.Dayjs;
  endTime: dayjs.Dayjs;
  capacity: number;
  location?: string | null;
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

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getInitials(name: string) {
  const words = name.trim().split(" ").filter(Boolean);

  if (words.length === 0) return "TR";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function TrainerCell({ trainer }: { trainer?: TrainerLite | null }) {
  if (!trainer) return <Text>-</Text>;

  return (
    <div className="flex items-center gap-3">
      <Avatar src={trainer.avatarUrl || undefined} icon={<UserOutlined />}>
        {!trainer.avatarUrl ? getInitials(trainer.fullName) : null}
      </Avatar>

      <div className="min-w-0">
        <Text className="block !font-semibold truncate">
          {trainer.fullName}
        </Text>
        <Text className="block !text-xs !text-slate-500 truncate">
          {trainer.email}
        </Text>
      </div>
    </div>
  );
}

export default function ServiceSchedulesPageClient() {
  const [form] = Form.useForm<ScheduleFormValues>();
  const [cancelForm] = Form.useForm<{ cancelReason: string }>();

  const [schedules, setSchedules] = useState<ServiceSchedule[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [trainers, setTrainers] = useState<TrainerLite[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [serviceId, setServiceId] = useState("ALL");
  const [trainerId, setTrainerId] = useState("ALL");
  const [isCancelled, setIsCancelled] = useState("ALL");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] =
    useState<ServiceSchedule | null>(null);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] =
    useState<ServiceSchedule | null>(null);

  async function fetchSchedules(nextPage = page, nextLimit = limit) {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: String(nextPage),
        limit: String(nextLimit),
      });

      if (search) params.set("search", search);
      if (serviceId !== "ALL") params.set("serviceId", serviceId);
      if (trainerId !== "ALL") params.set("trainerId", trainerId);
      if (isCancelled !== "ALL") params.set("isCancelled", isCancelled);

      const response = await apiGet<SchedulesResponse>(
        `/api/admin/service-schedules?${params.toString()}`,
      );

      setSchedules(response.data || []);
      setTotal(response.meta.total || 0);
      setPage(response.meta.page || nextPage);
      setLimit(response.meta.limit || nextLimit);
    } catch (error) {
      console.error("Fetch service schedules error:", error);
      message.error("Failed to fetch service schedules");
    } finally {
      setLoading(false);
    }
  }

  async function fetchServices() {
    try {
      const response = await apiGet<ServicesResponse>(
        "/api/admin/services?isActive=true&limit=100",
      );

      setServices(response.data || []);
    } catch (error) {
      console.error("Fetch services error:", error);
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
    fetchSchedules(1, limit);
    fetchServices();
    fetchTrainers();
  }, []);

  useEffect(() => {
    fetchSchedules(1, limit);
  }, [serviceId, trainerId, isCancelled]);

  function openCreateModal() {
    setEditingSchedule(null);
    form.resetFields();
    form.setFieldsValue({
      startTime: dayjs().add(1, "hour"),
      endTime: dayjs().add(2, "hour"),
      capacity: 10,
      trainerId: null,
    });
    setModalOpen(true);
  }

  function openEditModal(record: ServiceSchedule) {
    setEditingSchedule(record);
    form.setFieldsValue({
      serviceId: record.serviceId,
      trainerId: record.trainerId,
      title: record.title,
      startTime: dayjs(record.startTime),
      endTime: dayjs(record.endTime),
      capacity: record.capacity,
      location: record.location,
      notes: record.notes,
    });
    setModalOpen(true);
  }

  async function handleSubmit(values: ScheduleFormValues) {
    try {
      setSaving(true);

      const payload = {
        serviceId: values.serviceId,
        trainerId: values.trainerId || null,
        title: values.title || null,
        startTime: values.startTime.toISOString(),
        endTime: values.endTime.toISOString(),
        capacity: values.capacity,
        location: values.location || null,
        notes: values.notes || null,
      };

      if (editingSchedule) {
        await apiPatch(
          `/api/admin/service-schedules/${editingSchedule.id}`,
          payload,
        );

        message.success("Service schedule updated successfully");
      } else {
        await apiPost("/api/admin/service-schedules", payload);
        message.success("Service schedule created successfully");
      }

      setModalOpen(false);
      setEditingSchedule(null);
      form.resetFields();

      await fetchSchedules(page, limit);
    } catch (error) {
      console.error("Save service schedule error:", error);
      message.error(
        error instanceof Error
          ? error.message
          : "Failed to save service schedule",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(record: ServiceSchedule) {
    Modal.confirm({
      title: "Delete Service Schedule",
      content: `Delete schedule "${record.title || record.service?.name}"?`,
      centered: true,
      okText: "Delete",
      okButtonProps: {
        danger: true,
      },
      async onOk() {
        try {
          await apiDelete(`/api/admin/service-schedules/${record.id}`);
          message.success("Service schedule deleted successfully");
          await fetchSchedules(page, limit);
        } catch (error) {
          console.error("Delete schedule error:", error);
          message.error(
            error instanceof Error
              ? error.message
              : "Failed to delete service schedule",
          );
        }
      },
    });
  }

  async function handleCancelSchedule() {
    try {
      const values = await cancelForm.validateFields();

      if (!selectedSchedule) return;

      setSaving(true);

      await apiPatch(
        `/api/admin/service-schedules/${selectedSchedule.id}/cancel`,
        {
          cancelReason: values.cancelReason,
        },
      );

      message.success("Service schedule cancelled successfully");

      setCancelModalOpen(false);
      setSelectedSchedule(null);
      cancelForm.resetFields();

      await fetchSchedules(page, limit);
    } catch (error) {
      console.error("Cancel schedule error:", error);
      message.error(
        error instanceof Error ? error.message : "Failed to cancel schedule",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setSearch("");
    setServiceId("ALL");
    setTrainerId("ALL");
    setIsCancelled("ALL");
    setPage(1);

    setTimeout(() => {
      fetchSchedules(1, limit);
    }, 0);
  }

  const columns: ColumnsType<ServiceSchedule> = [
    {
      title: "Schedule",
      key: "schedule",
      width: 340,
      render: (_, record) => (
        <div>
          <Text className="block !font-semibold">
            {record.title || record.service?.name || "-"}
          </Text>
          <Text className="block !text-xs !text-slate-500">
            {record.service?.name || "-"}
          </Text>
          {record.location ? (
            <Text className="block !text-xs !text-slate-400">
              {record.location}
            </Text>
          ) : null}
        </div>
      ),
    },
    {
      title: "Trainer",
      key: "trainer",
      width: 280,
      render: (_, record) => <TrainerCell trainer={record.trainer} />,
    },
    {
      title: "Time",
      key: "time",
      width: 260,
      render: (_, record) => (
        <div>
          <Text className="block">{formatDateTime(record.startTime)}</Text>
          <Text className="block !text-xs !text-slate-500">
            to {formatDateTime(record.endTime)}
          </Text>
        </div>
      ),
    },
    {
      title: "Slots",
      key: "slots",
      width: 140,
      render: (_, record) => (
        <Tag color={record.bookedSlots >= record.capacity ? "red" : "blue"}>
          {record.bookedSlots}/{record.capacity}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "isCancelled",
      width: 130,
      render: (value: boolean) =>
        value ? (
          <Tag color="red">Cancelled</Tag>
        ) : (
          <Tag color="green">Active</Tag>
        ),
    },
    {
      title: "Created By",
      key: "createdBy",
      width: 220,
      render: (_, record) => (
        <div>
          <Text className="block !font-medium">
            {record.createdByUser?.fullName || "-"}
          </Text>
          <Text className="block !text-xs !text-slate-500">
            {record.createdByUser?.email || "-"}
          </Text>
        </div>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 190,
      align: "center",
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            disabled={record.isCancelled}
            onClick={() => openEditModal(record)}
          />

          <Button
            size="small"
            danger
            icon={<CloseOutlined />}
            disabled={record.isCancelled}
            onClick={() => {
              setSelectedSchedule(record);
              setCancelModalOpen(true);
            }}
          />

          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            disabled={record.bookedSlots > 0}
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
            Service Schedules
          </Title>
          <Text type="secondary">
            Manage class schedules, trainers, capacity, and cancellations.
          </Text>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateModal}
        >
          Add Schedule
        </Button>
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_220px_170px_auto_auto]">
          <div>
            <div className="mb-1 text-xs font-medium text-slate-600">
              Search
            </div>
            <Input
              allowClear
              value={search}
              prefix={<SearchOutlined />}
              placeholder="Search title, location, or notes"
              onChange={(event) => setSearch(event.target.value)}
              onPressEnter={() => fetchSchedules(1, limit)}
            />
          </div>

          <div>
            <div className="mb-1 text-xs font-medium text-slate-600">
              Service
            </div>
            <Select
              value={serviceId}
              className="w-full"
              onChange={(value) => {
                setServiceId(value);
                setPage(1);
              }}
              options={[
                { label: "All Services", value: "ALL" },
                ...services.map((item) => ({
                  label: item.name,
                  value: item.id,
                })),
              ]}
            />
          </div>

          <div>
            <div className="mb-1 text-xs font-medium text-slate-600">
              Trainer
            </div>
            <Select
              value={trainerId}
              className="w-full"
              onChange={(value) => {
                setTrainerId(value);
                setPage(1);
              }}
              options={[
                { label: "All Trainers", value: "ALL" },
                ...trainers.map((item) => ({
                  label: item.fullName,
                  value: item.id,
                })),
              ]}
            />
          </div>

          <div>
            <div className="mb-1 text-xs font-medium text-slate-600">
              Status
            </div>
            <Select
              value={isCancelled}
              className="w-full"
              onChange={(value) => {
                setIsCancelled(value);
                setPage(1);
              }}
              options={[
                { label: "All", value: "ALL" },
                { label: "Active", value: "false" },
                { label: "Cancelled", value: "true" },
              ]}
            />
          </div>

          <div className="flex items-end">
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={() => fetchSchedules(1, limit)}
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
          onRefresh={() => fetchSchedules(page, limit)}
          onLimitChange={(value) => {
            setLimit(value);
            setPage(1);
            fetchSchedules(1, value);
          }}
        />

        <Table
          rowKey="id"
          size="small"
          loading={loading}
          columns={columns}
          dataSource={schedules}
          pagination={false}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          locale={{
            emptyText: <Empty description="No service schedules found" />,
          }}
          scroll={{ x: 1500 }}
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
                fetchSchedules(nextPage, limit);
              }}
            />
          </Space>
        </div>
      </Card>

      <Modal
        title={
          editingSchedule ? "Edit Service Schedule" : "Add Service Schedule"
        }
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingSchedule(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText={editingSchedule ? "Update" : "Create"}
        confirmLoading={saving}
        width={820}
        centered
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Service"
            name="serviceId"
            rules={[{ required: true, message: "Service is required" }]}
          >
            <Select
              showSearch
              placeholder="Select service"
              optionFilterProp="label"
              onChange={(value) => {
                const selectedService = services.find(
                  (item) => item.id === value,
                );

                if (selectedService && !editingSchedule) {
                  form.setFieldValue(
                    "capacity",
                    selectedService.capacity ?? 10,
                  );

                  const start = form.getFieldValue("startTime") || dayjs();
                  form.setFieldValue(
                    "endTime",
                    start.add(selectedService.durationMinutes || 60, "minute"),
                  );
                }
              }}
              options={services.map((item) => ({
                label: item.name,
                value: item.id,
              }))}
            />
          </Form.Item>

          <Form.Item label="Trainer" name="trainerId">
            <Select
              allowClear
              showSearch
              placeholder="Select trainer"
              optionFilterProp="label"
              options={trainers.map((item) => ({
                label: `${item.fullName} - ${item.email}`,
                value: item.id,
              }))}
            />
          </Form.Item>

          <Form.Item label="Title" name="title">
            <Input placeholder="Optional custom schedule title" />
          </Form.Item>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Form.Item
              label="Start Time"
              name="startTime"
              rules={[{ required: true, message: "Start time is required" }]}
            >
              <DatePicker showTime className="w-full" />
            </Form.Item>

            <Form.Item
              label="End Time"
              name="endTime"
              rules={[{ required: true, message: "End time is required" }]}
            >
              <DatePicker showTime className="w-full" />
            </Form.Item>

            <Form.Item
              label="Capacity"
              name="capacity"
              rules={[{ required: true, message: "Capacity is required" }]}
            >
              <InputNumber className="w-full" min={0} />
            </Form.Item>

            <Form.Item label="Location" name="location">
              <Input placeholder="Studio 1 / Main Hall" />
            </Form.Item>
          </div>

          <Form.Item label="Notes" name="notes">
            <TextArea rows={4} placeholder="Schedule notes..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Cancel Service Schedule"
        open={cancelModalOpen}
        onCancel={() => {
          setCancelModalOpen(false);
          setSelectedSchedule(null);
          cancelForm.resetFields();
        }}
        onOk={handleCancelSchedule}
        okText="Cancel Schedule"
        confirmLoading={saving}
        okButtonProps={{
          danger: true,
        }}
        centered
      >
        <Form form={cancelForm} layout="vertical">
          <Form.Item
            label="Cancel Reason"
            name="cancelReason"
            rules={[
              {
                required: true,
                message: "Cancel reason is required",
              },
            ]}
          >
            <TextArea
              rows={4}
              placeholder="Example: Trainer unavailable / class cancelled due to maintenance."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
