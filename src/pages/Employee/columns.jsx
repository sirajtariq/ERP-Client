import { Space, Tag, Tooltip, Popover } from "antd";
import {
  EditOutlined, DeleteOutlined, DollarOutlined, RiseOutlined,
  CreditCardOutlined, PoweroffOutlined, UserAddOutlined, EyeOutlined,
} from "@ant-design/icons";
import { AppButton } from "@/components/common";
import { formatCurrency, formatDate } from "@/utils";

export const getEmployeeColumns = ({ onView, onSalary, onAdvance, onIncrement, onEdit, onDelete, onStatusToggle, isAdmin }) => [
  {
    title: "#",
    dataIndex: "empNo",
    key: "empNo",
    width: "9%",
    render: (val) => <span style={{ fontWeight: 700, color: "#7c5cfc", fontSize: 12 }}>{val}</span>,
  },
  {
    title: "Name",
    dataIndex: "name",
    key: "name",
    width: "16%",
    ellipsis: true,
    render: (val, record) => (
      <div>
        <div style={{ fontWeight: 700, color: "var(--color-text)", fontSize: 13 }}>{val}</div>
        <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 1 }}>{record.designation}</div>
      </div>
    ),
  },
  {
    title: "Department",
    dataIndex: "department",
    key: "department",
    width: "12%",
    render: (val) => (
      <Tag style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }} color="geekblue">{val || "-"}</Tag>
    ),
  },
  {
    title: "Joining Date",
    dataIndex: "joiningDate",
    key: "joiningDate",
    width: "11%",
    render: (val) => <span style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>{val ? formatDate(val) : "-"}</span>,
  },
  {
    title: "Salary",
    key: "salary",
    width: "10%",
    render: (_, record) => (
      <Popover
        trigger="click"
        placement="bottom"
        content={
          <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 180 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 500 }}>Basic Salary</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>{formatCurrency(record.basicSalary || 0)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 500 }}>Current Salary</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#7c5cfc" }}>{formatCurrency(record.currentSalary || 0)}</span>
            </div>
          </div>
        }
      >
        <AppButton size="small" style={{ fontSize: 11, fontWeight: 700, color: "#7c5cfc", borderColor: "rgba(124,92,252,0.3)", background: "rgba(124,92,252,0.06)", padding: "0 8px" }}>
          View
        </AppButton>
      </Popover>
    ),
  },
  {
    title: "Advance",
    dataIndex: "advanceBalance",
    key: "advanceBalance",
    width: "10%",
    render: (val) => (
      <span style={{ fontWeight: 700, color: val > 0 ? "#f97316" : "#64748b", fontSize: 12 }}>
        {val > 0 ? formatCurrency(val) : "—"}
      </span>
    ),
  },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    width: "10%",
    render: (val, record) => (
      <div>
        <Tag
          color={val === "active" ? "success" : "default"}
          style={{ borderRadius: 6, fontWeight: 600, fontSize: 11, textTransform: "capitalize", marginBottom: 2 }}
        >
          {val}
        </Tag>
        {val === "inactive" && record.leavingDate && (
          <div style={{ fontSize: 10, color: "#ef4444", fontWeight: 500 }}>Left: {formatDate(record.leavingDate)}</div>
        )}
        {val === "active" && record.reJoiningDate && (
          <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 500 }}>Re-joined: {formatDate(record.reJoiningDate)}</div>
        )}
      </div>
    ),
  },
  {
    title: "Actions",
    key: "actions",
    width: "22%",
    render: (_, record) => {
      const inactive = record.status === "inactive";
      const inactiveMsg = "Reactivate employee first";
      return (
        <Space size={3}>
          <Tooltip title="View Details">
            <AppButton type="text" size="small" icon={<EyeOutlined style={{ color: "#7c5cfc" }} />} onClick={() => onView(record)} />
          </Tooltip>
          <Tooltip title="Pay Salary">
            <AppButton type="text" size="small" icon={<DollarOutlined style={{ color: "#22c55e" }} />}
              onClick={() => onSalary(record)} />
          </Tooltip>
          <Tooltip title={inactive ? inactiveMsg : "Give Advance"}>
            <AppButton type="text" size="small" icon={<CreditCardOutlined style={{ color: inactive ? "#cbd5e1" : "#f97316" }} />}
              disabled={inactive} onClick={() => !inactive && onAdvance(record)} />
          </Tooltip>
          <Tooltip title={inactive ? inactiveMsg : "Add Increment"}>
            <AppButton type="text" size="small" icon={<RiseOutlined style={{ color: inactive ? "#cbd5e1" : "#3b82f6" }} />}
              disabled={inactive} onClick={() => !inactive && onIncrement(record)} />
          </Tooltip>
          <Tooltip title="Edit">
            <AppButton type="text" size="small" icon={<EditOutlined />} onClick={() => onEdit(record)} />
          </Tooltip>
          <Tooltip title={inactive ? "Mark Active" : "Mark Inactive"}>
            <AppButton
              type="text" size="small"
              icon={
                inactive
                  ? <UserAddOutlined style={{ color: "#22c55e" }} />
                  : <PoweroffOutlined style={{ color: "#ef4444" }} />
              }
              onClick={() => onStatusToggle(record)}
            />
          </Tooltip>
          {isAdmin && (
            <Tooltip title="Delete">
              <AppButton type="text" size="small" icon={<DeleteOutlined />} danger onClick={() => onDelete(record)} />
            </Tooltip>
          )}
        </Space>
      );
    },
  },
];
