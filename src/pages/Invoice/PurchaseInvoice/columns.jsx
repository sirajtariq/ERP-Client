import { Space, Tag, Tooltip } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined, CheckOutlined } from "@ant-design/icons";
import { AppButton } from "@/components/common";
import { formatCurrency, formatDate } from "@/utils";

const STATUS_COLORS = { paid: "green", unpaid: "red", partial: "orange" };
const STATUS_LABELS = { paid: "Paid", unpaid: "Unpaid", partial: "Partial" };

export const getPurchaseInvoiceColumns = ({ onView, onEdit, onDelete, onSaveDraft, saveLoadingId }) => [
  {
    title: "Invoice No",
    dataIndex: "invoiceNo",
    key: "invoiceNo",
    width: "12%",
    render: (val) => <span style={{ fontWeight: 600, color: "#7c5cfc" }}>{val}</span>,
  },
  {
    title: "Supplier",
    dataIndex: "customerName",
    key: "customerName",
    width: "20%",
    ellipsis: true,
    render: (val) => <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{val || "-"}</span>,
  },
  {
    title: "Total",
    dataIndex: "total",
    key: "total",
    width: "13%",
    render: (val) => <span style={{ fontWeight: 600 }}>{formatCurrency(val || 0)}</span>,
  },
  {
    title: "Paid",
    dataIndex: "paid",
    key: "paid",
    width: "13%",
    render: (val) => <span style={{ fontWeight: 600, color: "#22c55e" }}>{formatCurrency(val || 0)}</span>,
  },
  {
    title: "Pending",
    dataIndex: "pending",
    key: "pending",
    width: "13%",
    render: (val) => (
      <span style={{ fontWeight: 700, color: val > 0 ? "#ef4444" : "#64748b" }}>
        {formatCurrency(val || 0)}
      </span>
    ),
  },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    width: "10%",
    render: (val) => (
      <Tag color={STATUS_COLORS[val] || "default"} style={{ borderRadius: 6, fontWeight: 600 }}>
        {STATUS_LABELS[val] || val}
      </Tag>
    ),
  },
  {
    title: "Date",
    dataIndex: "date",
    key: "date",
    width: "10%",
    render: (val) => <span style={{ color: "#64748b" }}>{val ? formatDate(val) : "-"}</span>,
  },
  {
    title: "Action",
    key: "actions",
    width: "13%",
    render: (_, record) => (
      <Space size={4}>
        {record.invoiceStatus !== "Saved" && (
          <Tooltip title="Mark as Saved">
            <AppButton
              type="text"
              icon={<CheckOutlined />}
              size="small"
              style={{ color: "#22c55e" }}
              loading={saveLoadingId === record.id}
              onClick={() => onSaveDraft(record)}
            />
          </Tooltip>
        )}
        <AppButton type="text" icon={<EyeOutlined />} size="small" onClick={() => onView(record)} />
        {record.invoiceStatus !== "Saved" && (
          <>
            <AppButton type="text" icon={<EditOutlined />} size="small" onClick={() => onEdit(record)} />
            <AppButton type="text" icon={<DeleteOutlined />} size="small" danger onClick={() => onDelete(record)} />
          </>
        )}
      </Space>
    ),
  },
];
