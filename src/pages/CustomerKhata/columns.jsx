import { Space } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { AppButton } from "@/components/common";
import { formatCurrency } from "@/utils";

export const getCustomerColumns = ({ onView, onEdit, onDelete }) => [
  {
    title: "#",
    dataIndex: "invoiceNo",
    key: "invoiceNo",
    width: "8%",
    render: (val) => <span style={{ fontWeight: 600, color: "#7c5cfc" }}>{val ? val.replace("C-", "") : "-"}</span>,
  },
  {
    title: "Name",
    dataIndex: "name",
    key: "name",
    width: "20%",
    ellipsis: true,
    render: (val) => <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{val || "-"}</span>,
  },
  {
    title: "Phone",
    dataIndex: "phone",
    key: "phone",
    width: "14%",
    render: (val) => val || "-",
  },
  {
    title: "Paid",
    key: "paid",
    width: "14%",
    render: (_, record) => (
      <span style={{ fontWeight: 600, color: "#22c55e" }}>
        {formatCurrency(record.summary?.cashReceived || 0)}
      </span>
    ),
  },
  {
    title: "Due",
    key: "due",
    width: "14%",
    render: (_, record) => {
      const due = record.summary?.remainingBalance || 0;
      return (
        <span style={{ fontWeight: 700, color: due > 0 ? "#ef4444" : "#64748b" }}>
          {formatCurrency(due)}
        </span>
      );
    },
  },
  {
    title: "Advance",
    key: "advance",
    width: "14%",
    render: (_, record) => {
      const adv = record.summary?.availableAdvance || 0;
      return (
        <span style={{ fontWeight: 600, color: adv > 0 ? "#3b82f6" : "#64748b" }}>
          {formatCurrency(adv)}
        </span>
      );
    },
  },
  {
    title: "Action",
    key: "actions",
    width: "16%",
    render: (_, record) => (
      <Space size={4}>
        <AppButton type="text" icon={<EyeOutlined />} size="small" onClick={() => onView(record)} />
        <AppButton type="text" icon={<EditOutlined />} size="small" onClick={() => onEdit(record)} />
        <AppButton type="text" icon={<DeleteOutlined />} size="small" danger onClick={() => onDelete(record)} />
      </Space>
    ),
  },
];
