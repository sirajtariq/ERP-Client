import { Space, Tag, Tooltip } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined, CheckOutlined, RollbackOutlined } from "@ant-design/icons";
import { AppButton } from "@/components/common";
import { formatCurrency, formatDate } from "@/utils";

const STATUS_COLORS = { Paid: "green", Unpaid: "red", Partial: "orange", Advance: "blue" };


export const getSaleInvoiceColumns = ({ onView, onEdit, onDelete, onSaveDraft, viewLoadingId, editLoadingId, saveLoadingId }) => [
  {
    title: "Invoice No",
    dataIndex: "invoiceNo",
    key: "invoiceNo",
    width: "10%",
    render: (val) => <span style={{ fontWeight: 600, color: "#7c5cfc" }}>{val}</span>,
  },
  {
    title: "Customer",
    dataIndex: "customerName",
    key: "customerName",
    width: "14%",
    ellipsis: true,
    render: (val) => <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{val || "-"}</span>,
  },
  {
    title: "Total",
    dataIndex: "total",
    key: "total",
    width: "10%",
    render: (val) => <span style={{ fontWeight: 600 }}>{formatCurrency(val || 0)}</span>,
  },
  {
    title: "Paid",
    dataIndex: "paid",
    key: "paid",
    width: "10%",
    render: (val) => <span style={{ fontWeight: 600, color: "#22c55e" }}>{formatCurrency(val || 0)}</span>,
  },
  {
    title: "Pending",
    dataIndex: "pending",
    key: "pending",
    width: "10%",
    render: (val) => (
      <span style={{ fontWeight: 700, color: val > 0 ? "#ef4444" : "#64748b" }}>
        {formatCurrency(val || 0)}
      </span>
    ),
  },
  {
    title: "Returns",
    dataIndex: "returnedItemsCount",
    key: "returnedItemsCount",
    width: "7%",
    render: (count, record) =>
      count > 0 ? (
        <Tooltip title={`Returned: Rs ${record.totalReturnedAmount?.toLocaleString("en-PK", { minimumFractionDigits: 2 })}`}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "2px 8px", borderRadius: 12,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            color: "#ef4444", fontWeight: 700, fontSize: 12, cursor: "default",
          }}>
            <RollbackOutlined style={{ fontSize: 11 }} /> {count}
          </span>
        </Tooltip>
      ) : (
        <span style={{ color: "#cbd5e1", fontSize: 13 }}>—</span>
      ),
  },
  {
    title: "Payment Status",
    dataIndex: "paymentStatus",
    key: "paymentStatus",
    width: "10%",
    render: (val) => (
      <Tag color={STATUS_COLORS[val] || "default"} style={{ borderRadius: 6, fontWeight: 600 }}>
        {val || "-"}
      </Tag>
    ),
  },
  {
    title: "Invoice Status",
    dataIndex: "invoiceStatus",
    key: "invoiceStatus",
    width: "8%",
    render: (val) => (
      <span style={{ fontWeight: 700, color: val === "Saved" ? "#22c55e" : "#ef4444" }}>
        {val || "-"}
      </span>
    ),
  },
  {
    title: "Date",
    dataIndex: "date",
    key: "date",
    width: "9%",
    render: (val) => <span style={{ color: "#64748b" }}>{val ? formatDate(val) : "-"}</span>,
  },
  {
    title: "Action",
    key: "actions",
    width: "12%",
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
        <AppButton type="text" icon={<EyeOutlined />} size="small" loading={viewLoadingId === record.id} onClick={() => onView(record.id)} />
        {record.invoiceStatus !== "Saved" && (
          <>
            <AppButton type="text" icon={<EditOutlined />} size="small" loading={editLoadingId === record.id} onClick={() => onEdit(record.id)} />
            <AppButton type="text" icon={<DeleteOutlined />} size="small" danger onClick={() => onDelete(record)} />
          </>
        )}
      </Space>
    ),
  },
];
