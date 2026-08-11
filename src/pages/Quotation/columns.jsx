import { Space, Tag, Tooltip, Popover } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined, SwapOutlined, UserOutlined, PhoneOutlined, TagOutlined, IdcardOutlined } from "@ant-design/icons";
import { AppButton } from "@/components/common";
import { formatCurrency, formatDate } from "@/utils";

const STATUS_COLORS = { draft: "default", sent: "blue", accepted: "green", rejected: "red", converted: "purple", expired: "orange" };

const PersonalDetailsPopover = ({ record }) => {
  const { customer } = record;
  const content = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 200, maxWidth: 260 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <PhoneOutlined style={{ color: "#7c5cfc", fontSize: 13, flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: "var(--color-text)" }}>{customer?.phone || "-"}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <IdcardOutlined style={{ color: "#3b82f6", fontSize: 13, flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: "var(--color-text)" }}>{customer?.customerId || "-"}</span>
      </div>
      {customer?.customerType && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TagOutlined style={{ color: "#8b5cf6", fontSize: 13, flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "var(--color-text)", textTransform: "capitalize" }}>{customer.customerType}</span>
        </div>
      )}
    </div>
  );

  return (
    <Popover
      content={content}
      title={<span style={{ fontWeight: 700, fontSize: 13 }}><UserOutlined style={{ marginRight: 6, color: "#7c5cfc" }} />{customer?.name || record.customerName}</span>}
      trigger="click"
      placement="bottomLeft"
    >
      <button style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "3px 10px", borderRadius: 6, border: "1px solid var(--color-border)",
        background: "var(--color-surface)", color: "var(--color-text-secondary)",
        fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        transition: "all 0.15s ease",
      }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#7c5cfc"; e.currentTarget.style.color = "#7c5cfc"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
      >
        <UserOutlined style={{ fontSize: 11 }} /> View
      </button>
    </Popover>
  );
};

export const getQuotationColumns = ({ onView, onEdit, onDelete, onConvert, viewLoadingId, editLoadingId, convertLoadingId }) => [
  {
    title: "Quotation No",
    dataIndex: "quotationNo",
    key: "quotationNo",
    width: "13%",
    render: (val) => <span style={{ fontWeight: 600, color: "#7c5cfc" }}>{val}</span>,
  },
  {
    title: "Customer",
    dataIndex: "customerName",
    key: "customerName",
    width: "16%",
    ellipsis: true,
    render: (val) => <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{val || "-"}</span>,
  },
  {
    title: "Cust. Info",
    key: "personalDetails",
    width: "12%",
    render: (_, record) => <PersonalDetailsPopover record={record} />,
  },
  {
    title: "Total",
    dataIndex: "total",
    key: "total",
    width: "11%",
    render: (val) => <span style={{ fontWeight: 600 }}>{formatCurrency(val || 0)}</span>,
  },
  {
    title: "Validity",
    dataIndex: "validityDisplay",
    key: "validityDisplay",
    width: "11%",
    render: (val, record) => <span style={{ color: "var(--color-text-secondary)" }}>{val || (record.validDays ? `${record.validDays} days` : "-")}</span>,
  },
  {
    title: "Status",
    dataIndex: "effectiveStatus",
    key: "effectiveStatus",
    width: "11%",
    render: (val, record) => {
      const status = val || record.status;
      return (
        <Tag color={STATUS_COLORS[status] || "default"} style={{ borderRadius: 6, fontWeight: 600, textTransform: "capitalize", margin: 0 }}>
          {status || "-"}
        </Tag>
      );
    },
  },
  {
    title: "Date",
    dataIndex: "date",
    key: "date",
    width: "11%",
    render: (val) => <span style={{ color: "var(--color-text-secondary)" }}>{val ? formatDate(val) : "-"}</span>,
  },
  {
    title: "Action",
    key: "actions",
    width: "15%",
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
