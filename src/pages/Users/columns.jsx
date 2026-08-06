import { Space, Tag } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { AppButton } from "@/components/common";

// Matches the resolved role constants the backend returns (ADMIN/SUPER_ADMIN/SALES_USER/PURCHASE_USER).
const ROLE_COLORS = { ADMIN: "blue", SUPER_ADMIN: "purple", SALES_USER: "green", PURCHASE_USER: "orange" };
const ROLE_LABELS = { ADMIN: "Admin", SUPER_ADMIN: "Super Admin", SALES_USER: "Sale", PURCHASE_USER: "Purchase" };

export const getUserColumns = ({ onView, onEdit, onDelete }) => [
  {
    title: "Full Name",
    dataIndex: "fullname",
    key: "fullname",
    width: "22%",
    ellipsis: true,
    render: (val) => <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{val || "-"}</span>,
  },
  {
    title: "Username",
    dataIndex: "username",
    key: "username",
    width: "16%",
    ellipsis: true,
    render: (val) => <span style={{ color: "#475569" }}>{val || "-"}</span>,
  },
  {
    title: "Phone",
    dataIndex: "phone",
    key: "phone",
    width: "14%",
    render: (val) => <span style={{ color: "#475569" }}>{val || "-"}</span>,
  },
  {
    title: "Designation",
    dataIndex: "designation",
    key: "designation",
    width: "22%",
    ellipsis: true,
    render: (val) => <span style={{ color: "#22c55e", fontWeight: 600 }}>{val || "-"}</span>,
  },
  {
    title: "Role",
    dataIndex: "role",
    key: "role",
    width: "13%",
    render: (val) => (
      <Tag color={ROLE_COLORS[val] || "default"} style={{ borderRadius: 6, fontWeight: 600 }}>
        {ROLE_LABELS[val] || val || "-"}
      </Tag>
    ),
  },
  {
    title: "Action",
    key: "actions",
    width: "13%",
    render: (_, record) => (
      <Space size={4}>
        <AppButton type="text" icon={<EyeOutlined />}    size="small" onClick={() => onView(record)} />
        <AppButton type="text" icon={<EditOutlined />}   size="small" onClick={() => onEdit(record)} />
        <AppButton type="text" icon={<DeleteOutlined />} size="small" danger onClick={() => onDelete(record)} />
      </Space>
    ),
  },
];
