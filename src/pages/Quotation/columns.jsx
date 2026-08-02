import { Space, Tag, Tooltip } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined, SwapOutlined } from "@ant-design/icons";
import { AppButton } from "@/components/common";
import { formatCurrency, formatDate } from "@/utils";

const STATUS_COLORS = { draft: "default", sent: "blue", accepted: "green", rejected: "red", converted: "purple", expired: "orange" };

export const getQuotationColumns = ({ onView, onEdit, onDelete, onConvert, viewLoadingId, editLoadingId, convertLoadingId }) => [
  {
    title: "Quotation No",
    dataIndex: "quotationNo",
    key: "quotationNo",
    width: "14%",
    render: (val) => <span style={{ fontWeight: 600, color: "#7c5cfc" }}>{val}</span>,
  },
  {
    title: "Customer",
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
    title: "Validity",
    dataIndex: "validityDisplay",
    key: "validityDisplay",
    width: "13%",
    render: (val, record) => <span style={{ color: "var(--color-text-secondary)" }}>{val || (record.validDays ? `${record.validDays} days` : "-")}</span>,
  },
  {
    title: "Status",
    dataIndex: "effectiveStatus",
    key: "effectiveStatus",
    width: "12%",
    render: (val, record) => {
      const status = val || record.status;
      return (
        <Tag color={STATUS_COLORS[status] || "default"} style={{ borderRadius: 6, fontWeight: 600, textTransform: "capitalize" }}>
          {status || "-"}
        </Tag>
      );
    },
  },
  {
    title: "Date",
    dataIndex: "date",
    key: "date",
    width: "12%",
    render: (val) => <span style={{ color: "var(--color-text-secondary)" }}>{val ? formatDate(val) : "-"}</span>,
  },
  {
    title: "Action",
    key: "actions",
    width: "16%",
    render: (_, record) => {
      const status = record.effectiveStatus || record.status;
      const isConverted = status === "converted";
      const canEdit = status !== "converted" && status !== "expired";
      return (
        <Space size={4}>
          <AppButton type="text" icon={<EyeOutlined />} size="small" loading={viewLoadingId === record.id} onClick={() => onView(record.id)} />
          {!isConverted && (
            <Tooltip title="Convert to Invoice">
              <AppButton type="text" icon={<SwapOutlined />} size="small" style={{ color: "#3b82f6" }} loading={convertLoadingId === record.id} onClick={() => onConvert(record)} />
            </Tooltip>
          )}
          {canEdit && (
            <AppButton type="text" icon={<EditOutlined />} size="small" loading={editLoadingId === record.id} onClick={() => onEdit(record.id)} />
          )}
          {!isConverted && (
            <AppButton type="text" icon={<DeleteOutlined />} size="small" danger onClick={() => onDelete(record)} />
          )}
        </Space>
      );
    },
  },
];
