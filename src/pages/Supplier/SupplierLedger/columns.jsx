import { Space } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { AppButton } from "@/components/common";
import { formatCurrency, formatDate } from "@/utils";

export const getVendorColumns = ({ onView, onEdit, onDelete }) => [
  {
    title: "ID",
    dataIndex: "vendorId",
    key: "vendorId",
    width: "5%",
    render: (val) => <span style={{ fontWeight: 600, color: "#7c5cfc" }}>{val}</span>,
  },
  {
    title: "Supplier Name",
    dataIndex: "name",
    key: "name",
    width: "12%",
    ellipsis: true,
    render: (val) => <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{val || "-"}</span>,
  },
  {
    title: "Phone",
    dataIndex: "phone",
    key: "phone",
    width: "9%",
    render: (val) => <span style={{ color: "#475569" }}>{val || "-"}</span>,
  },
  {
    title: "Email",
    dataIndex: "email",
    key: "email",
    width: "11%",
    ellipsis: true,
    render: (val) => <span style={{ color: "#475569" }}>{val || "-"}</span>,
  },
  {
    title: "Address",
    dataIndex: "address",
    key: "address",
    width: "9%",
    ellipsis: true,
    render: (val) => <span style={{ color: "#64748b" }}>{val || "-"}</span>,
  },
  {
    title: "Tax No.",
    dataIndex: "taxNumber",
    key: "taxNumber",
    width: "6%",
    render: (val) => <span style={{ color: "#64748b" }}>{val || "-"}</span>,
  },
  {
    title: "Opening Payable",
    dataIndex: "openingPayable",
    key: "openingPayable",
    width: "8%",
    render: (val) => <span style={{ fontWeight: 600, color: "#f97316" }}>{formatCurrency(val || 0)}</span>,
  },
  {
    title: "Payable Balance",
    dataIndex: "payableBalance",
    key: "payableBalance",
    width: "8%",
    render: (val) => (
      <span style={{ fontWeight: 700, color: val > 0 ? "#ef4444" : "#64748b" }}>
        {formatCurrency(val || 0)}
      </span>
    ),
  },
  {
    title: "Advance Balance",
    dataIndex: "advanceBalance",
    key: "advanceBalance",
    width: "8%",
    render: (val) => (
      <span style={{ fontWeight: 600, color: val > 0 ? "#22c55e" : "#64748b" }}>
        {formatCurrency(val || 0)}
      </span>
    ),
  },
  {
    title: "Total Paid",
    dataIndex: "totalPaid",
    key: "totalPaid",
    width: "6%",
    render: (val) => <span style={{ fontWeight: 600, color: "#22c55e" }}>{formatCurrency(val || 0)}</span>,
  },
  {
    title: "Created At",
    dataIndex: "createdAt",
    key: "createdAt",
    width: "8%",
    render: (val) => <span style={{ color: "#64748b" }}>{val ? formatDate(val) : "-"}</span>,
  },
  {
    title: "Action",
    key: "actions",
    width: "10%",
    render: (_, record) => (
      <Space size={4}>
        <AppButton type="text" icon={<EyeOutlined />}    size="small" onClick={() => onView(record)} />
        <AppButton type="text" icon={<EditOutlined />}   size="small" onClick={() => onEdit(record)} />
        <AppButton type="text" icon={<DeleteOutlined />} size="small" danger onClick={() => onDelete(record)} />
      </Space>
    ),
  },
];
