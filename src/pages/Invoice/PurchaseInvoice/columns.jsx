import { Space, Tag, Tooltip } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined, CheckOutlined } from "@ant-design/icons";
import { AppButton } from "@/components/common";
import { formatDate } from "@/utils";

const fmt = (val) =>
  (parseFloat(val) || 0).toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const PAYMENT_STATUS_COLORS = { Paid: "green", Unpaid: "red", Partial: "orange" };

export const getPurchaseInvoiceColumns = ({ onView, onEdit, onDelete, onSaveDraft, saveLoadingId }) => [
  {
    title: "Invoice No",
    dataIndex: "invoiceNo",
    key: "invoiceNo",
    width: "13%",
    render: (val) => <span style={{ fontWeight: 600, color: "#7c5cfc" }}>{val || "-"}</span>,
  },
  {
    title: "Bill No",
    dataIndex: "billNumber",
    key: "billNumber",
    width: "9%",
    render: (val) => <span style={{ color: "var(--color-text-secondary)" }}>{val || "-"}</span>,
  },
  {
    title: "Vendor",
    dataIndex: "customerName",
    key: "customerName",
    width: "15%",
    ellipsis: true,
    render: (val) => <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{val || "-"}</span>,
  },
  {
    title: "Total",
    dataIndex: "total",
    key: "total",
    width: "10%",
    render: (val) => <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{fmt(val)}</span>,
  },
  {
    title: "Paid",
    dataIndex: "paid",
    key: "paid",
    width: "10%",
    render: (val) => <span style={{ fontWeight: 600, color: "#22c55e", whiteSpace: "nowrap" }}>{fmt(val)}</span>,
  },
  {
    title: "Pending",
    dataIndex: "pending",
    key: "pending",
    width: "10%",
    render: (val) => (
      <span style={{ fontWeight: 700, color: val > 0 ? "#ef4444" : "#64748b", whiteSpace: "nowrap" }}>
        {fmt(val)}
      </span>
    ),
  },
  {
    title: "Pay Status",
    dataIndex: "status",
    key: "status",
    width: "11%",
    render: (val) => (
      <Tag color={PAYMENT_STATUS_COLORS[val] || "default"} style={{ borderRadius: 6, fontWeight: 600, margin: 0 }}>
        {val || "-"}
      </Tag>
    ),
  },
  {
    title: "Date",
    dataIndex: "date",
    key: "date",
    width: "10%",
    render: (val) => <span style={{ color: "#64748b", whiteSpace: "nowrap" }}>{val ? formatDate(val) : "-"}</span>,
  },
  {
    title: "Action",
    key: "actions",
    width: "12%",
    render: (_, record) => (
      <Space size={2}>
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
