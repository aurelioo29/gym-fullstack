"use client";

import { Button, Card, Input, Select } from "antd";
import { SearchOutlined } from "@ant-design/icons";

type Option = {
  label: string;
  value: string;
};

type LogsFilterCardProps = {
  search: string;
  onSearchChange: (value: string) => void;

  typeValue?: string;
  typePlaceholder?: string;
  typeOptions?: Option[];
  onTypeChange?: (value: string) => void;

  onSubmit: () => void;
  onReset: () => void;
};

export default function LogsFilterCard({
  search,
  onSearchChange,
  typeValue = "ALL",
  typePlaceholder = "Type",
  typeOptions = [],
  onTypeChange,
  onSubmit,
  onReset,
}: LogsFilterCardProps) {
  return (
    <Card className="mb-4 logs-filter-card">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_260px_320px_auto_auto]">
        <div>
          <div className="mb-1 text-xs font-medium text-slate-600">Search</div>
          <Input
            allowClear
            value={search}
            prefix={<SearchOutlined />}
            placeholder="Search logs"
            onChange={(event) => onSearchChange(event.target.value)}
            onPressEnter={onSubmit}
          />
        </div>

        <div>
          <div className="mb-1 text-xs font-medium text-slate-600">
            {typePlaceholder}
          </div>
          <Select
            value={typeValue}
            className="w-full"
            options={[{ label: "All", value: "ALL" }, ...typeOptions]}
            onChange={onTypeChange}
          />
        </div>

        <div>
          <div className="mb-1 text-xs font-medium text-slate-600">
            Created at
          </div>
          <Input disabled placeholder="Coming soon" />
        </div>

        <div className="flex items-end">
          <Button type="primary" icon={<SearchOutlined />} onClick={onSubmit}>
            Search
          </Button>
        </div>

        <div className="flex items-end">
          <Button onClick={onReset}>Reset</Button>
        </div>
      </div>
    </Card>
  );
}
