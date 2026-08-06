import { Space, Tag } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { AppButton } from "@/components/common";
import { formatCurrency, formatDate } from "@/utils";

export const getDailyReceiveColumns = ({ onView, onEdit, onDelete }) => [
  {
    title: "Date",
    dataIndex: "date",
    key: "date",
    width: "11%",
    render: (val) => <span style={{ color: "#64748b" }}>{val ? formatDate(val) : "-"}</span>,
  },
  {
    title: "Receipt #",
    dataIndex: "receiptNumber",
    key: "receiptNumber",
    width: "13%",
    render: (val) => <span style={{ fontWeight: 600, color: "#7c5cfc" }}>{val || "-"}</span>,
  },
  {
    title: "Customer",
    dataIndex: "customerName",
    key: "customerName",
    width: "22%",
    ellipsis: true,
    render: (val) => <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{val || "-"}</span>,
  },
  {
    title: "Invoice #",
    dataIndex: "invoiceNumber",
    key: "invoiceNumber",
    width: "13%",
    render: (val) => <span style={{ color: "#475569" }}>{val || "-"}</span>,
  },
  {
    title: "Received",
    dataIndex: "amountReceived",
    key: "amountReceived",
    width: "13%",
    render: (val) => <span style={{ fontWeight: 700, color: "#22c55e" }}>{formatCurrency(val || 0)}</span>,
  },
  {
    title: "Balance After",
    dataIndex: "balanceAfter",
    key: "balanceAfter",
    width: "13%",
    render: (val) => (
      <span style={{ fontWeight: 600, color: val > 0 ? "#ef4444" : "#64748b" }}>
        {formatCurrency(val || 0)}
      </span>
    ),
  },
  {
    title: "Method",
    dataIndex: "method",
    key: "method",
    width: "10%",
    render: (val) => (
      <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600 }}>
        {val || "-"}
      </Tag>
    ),
  },
  {
    title: "Action",
    key: "actions",
    width: "5%",
    render: (_, record) => (
      <Space size={4}>
        <AppButton type="text" icon={<EyeOutlined />} size="small" onClick={() => onView(record)} />
        <AppButton type="text" icon={<EditOutlined />} size="small" onClick={() => onEdit(record)} />
        <AppButton type="text" icon={<DeleteOutlined />} size="small" danger onClick={() => onDelete(record)} />
      </Space>
    ),
  },
];
