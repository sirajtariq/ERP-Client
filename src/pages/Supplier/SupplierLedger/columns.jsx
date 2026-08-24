import { Space, Popover } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined, UserOutlined, PhoneOutlined, MailOutlined, EnvironmentOutlined, FileTextOutlined, CalendarOutlined } from "@ant-design/icons";
import { AppButton } from "@/components/common";
import { formatCurrency, formatDate } from "@/utils";

const PersonalDetailsPopover = ({ record }) => {
  const content = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 200, maxWidth: 260 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <PhoneOutlined style={{ color: "#7c5cfc", fontSize: 13, flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: "var(--color-text)" }}>{record.phone || "-"}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <MailOutlined style={{ color: "#3b82f6", fontSize: 13, flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: "var(--color-text)", wordBreak: "break-all" }}>{record.email || "-"}</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <EnvironmentOutlined style={{ color: "#22c55e", fontSize: 13, flexShrink: 0, marginTop: 2 }} />
        <span style={{ fontSize: 13, color: "var(--color-text)", wordBreak: "break-word", lineHeight: 1.5 }}>{record.address || "-"}</span>
      </div>
      {record.taxNumber && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileTextOutlined style={{ color: "#f59e0b", fontSize: 13, flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "var(--color-text)" }}>{record.taxNumber}</span>
        </div>
      )}
      {record.createdAt && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CalendarOutlined style={{ color: "#94a3b8", fontSize: 13, flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "var(--color-text)" }}>{formatDate(record.createdAt)}</span>
        </div>
      )}
    </div>
  );

  return (
    <Popover
      content={content}
      title={<span style={{ fontWeight: 700, fontSize: 13 }}><UserOutlined style={{ marginRight: 6, color: "#7c5cfc" }} />{record.name}</span>}
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

export const getVendorColumns = ({ onView, onEdit, onDelete }) => [
  {
    title: "ID",
    dataIndex: "vendorId",
    key: "vendorId",
    width: "5%",
    render: (val) => <span style={{ fontWeight: 600, color: "#7c5cfc" }}>{val}</span>,
  },
  {
    title: "Vendor Name",
    dataIndex: "name",
    key: "name",
    width: "20%",
    ellipsis: true,
    render: (val) => <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{val || "-"}</span>,
  },
  {
    title: "Personal Details",
    key: "personalDetails",
    width: "11%",
    render: (_, record) => <PersonalDetailsPopover record={record} />,
  },
  {
    title: "Opening Payable",
    dataIndex: "openingPayable",
    key: "openingPayable",
    width: "12%",
    render: (val) => <span style={{ fontWeight: 600, color: "#f97316" }}>{formatCurrency(val || 0)}</span>,
  },
  {
    title: "Payable Balance",
    dataIndex: "payableBalance",
    key: "payableBalance",
    width: "12%",
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
    width: "12%",
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
    width: "16%",
    render: (val) => <span style={{ fontWeight: 600, color: "#22c55e" }}>{formatCurrency(val || 0)}</span>,
  },
  {
    title: "Action",
    key: "actions",
    width: "12%",
    render: (_, record) => (
      <Space size={4}>
        <AppButton type="text" icon={<EyeOutlined />}    size="small" onClick={() => onView(record)} />
        <AppButton type="text" icon={<EditOutlined />}   size="small" onClick={() => onEdit(record)} />
        <AppButton type="text" icon={<DeleteOutlined />} size="small" danger onClick={() => onDelete(record)} />
      </Space>
    ),
  },
];
