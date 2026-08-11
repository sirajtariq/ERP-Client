import { Space, Popover } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined, UserOutlined, PhoneOutlined, MailOutlined, EnvironmentOutlined, FileTextOutlined, TagOutlined } from "@ant-design/icons";
import { AppButton } from "@/components/common";
import { formatCurrency } from "@/utils";

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
      {record.customerType && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TagOutlined style={{ color: "#8b5cf6", fontSize: 13, flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "var(--color-text)", textTransform: "capitalize" }}>{record.customerType}</span>
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

export const getCustomerColumns = ({ onView, onEdit, onDelete }) => [
  {
    title: "#",
    dataIndex: "invoiceNo",
    key: "invoiceNo",
    width: "5%",
    render: (val) => <span style={{ fontWeight: 600, color: "#7c5cfc" }}>{val ? val.replace("C-", "") : "-"}</span>,
  },
  {
    title: "Name",
    dataIndex: "name",
    key: "name",
    width: "25%",
    ellipsis: true,
    render: (val) => <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{val || "-"}</span>,
  },
  {
    title: "Cust. Info",
    key: "personalDetails",
    width: "13%",
    render: (_, record) => <PersonalDetailsPopover record={record} />,
  },
  {
    title: "Opening Credit",
    key: "openingCredit",
    width: "15%",
    render: (_, record) => (
      <span style={{ fontWeight: 600, color: "#8b5cf6" }}>
        {formatCurrency(parseFloat(record.openingCredit) || 0)}
      </span>
    ),
  },
  {
    title: "Due",
    key: "due",
    width: "15%",
    render: (_, record) => {
      const due = record.creditBalance || 0;
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
    width: "15%",
    render: (_, record) => {
      const adv = record.advanceBalance || 0;
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
    width: "12%",
    render: (_, record) => (
      <Space size={4}>
        <AppButton type="text" icon={<EyeOutlined />} size="small" onClick={() => onView(record)} />
        <AppButton type="text" icon={<EditOutlined />} size="small" onClick={() => onEdit(record)} />
        <AppButton type="text" icon={<DeleteOutlined />} size="small" danger onClick={() => onDelete(record)} />
      </Space>
    ),
  },
];
