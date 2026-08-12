import { Space, Tag, Tooltip } from "antd";
import {
  EyeOutlined, EditOutlined, DeleteOutlined, SwapOutlined,
} from "@ant-design/icons";
import { AppButton } from "@/components/common";
import { formatCurrency } from "@/utils";

const stockStatus = (item) => {
  if (item.currentStock === 0)                              return { label: "Out of Stock", color: "error",   bg: "#fef2f2", text: "#ef4444" };
  if (item.currentStock <= item.minStock)                   return { label: "Low Stock",    color: "warning", bg: "#fff7ed", text: "#f97316" };
  return                                                           { label: "In Stock",     color: "success", bg: "#f0fdf4", text: "#22c55e" };
};

export const getInventoryColumns = ({ onView, onEdit, onAdjust, onDelete, isAdmin }) => [
  {
    title: "Code",
    dataIndex: "itemCode",
    key: "itemCode",
    width: "8%",
    render: (v) => <span style={{ fontWeight: 700, color: "#7c5cfc", fontSize: 12 }}>{v}</span>,
  },
  {
    title: "Item Name",
    dataIndex: "name",
    key: "name",
    width: "20%",
    ellipsis: true,
    render: (val, record) => (
      <div>
        <div style={{ fontWeight: 700, color: "var(--color-text)", fontSize: 13 }}>{val}</div>
        {record.description && (
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
            {record.description}
          </div>
        )}
      </div>
    ),
  },
  {
    title: "Category",
    dataIndex: "category",
    key: "category",
    width: "10%",
    render: (v) => <Tag style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }} color="geekblue">{v}</Tag>,
  },
  {
    title: "Unit",
    dataIndex: "unit",
    key: "unit",
    width: "6%",
    render: (v) => <span style={{ color: "var(--color-text-secondary)", fontSize: 12, fontWeight: 500 }}>{v}</span>,
  },
  {
    title: "Purchase Rate",
    dataIndex: "purchaseRate",
    key: "purchaseRate",
    width: "11%",
    render: (v) => <span style={{ fontWeight: 600, fontSize: 13 }}>{formatCurrency(v)}</span>,
  },
  {
    title: "Sale Rate",
    dataIndex: "saleRate",
    key: "saleRate",
    width: "9%",
    render: (v) => <span style={{ fontWeight: 700, color: "#7c5cfc", fontSize: 13 }}>{formatCurrency(v)}</span>,
  },
  {
    title: "Margin",
    key: "margin",
    width: "7%",
    render: (_, r) => {
      const margin = r.purchaseRate > 0 ? ((r.saleRate - r.purchaseRate) / r.purchaseRate * 100).toFixed(1) : 0;
      const color  = margin >= 20 ? "#22c55e" : margin >= 10 ? "#f97316" : "#ef4444";
      return <span style={{ fontWeight: 700, color, fontSize: 12 }}>{margin}%</span>;
    },
  },
  {
    title: "Stock",
    dataIndex: "currentStock",
    key: "currentStock",
    width: "7%",
    render: (v, record) => {
      const st = stockStatus(record);
      return (
        <span style={{ fontWeight: 800, color: st.text, fontSize: 14 }}>
          {v} <span style={{ fontSize: 11, fontWeight: 500 }}>{record.unit}</span>
        </span>
      );
    },
  },
  {
    title: "Status",
    key: "status",
    width: "9%",
    render: (_, record) => {
      const st = stockStatus(record);
      return <Tag color={st.color} style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }}>{st.label}</Tag>;
    },
  },
  {
    title: "Actions",
    key: "actions",
    width: "13%",
    render: (_, record) => (
      <Space size={3}>
        <Tooltip title="View Details">
          <AppButton type="text" size="small" icon={<EyeOutlined style={{ color: "#7c5cfc" }} />} onClick={() => onView(record)} />
        </Tooltip>
        <Tooltip title="Adjust Stock">
          <AppButton type="text" size="small" icon={<SwapOutlined style={{ color: "#22c55e" }} />} onClick={() => onAdjust(record)} />
        </Tooltip>
        <Tooltip title="Edit">
          <AppButton type="text" size="small" icon={<EditOutlined />} onClick={() => onEdit(record)} />
        </Tooltip>
        {isAdmin && (
          <Tooltip title="Delete">
            <AppButton type="text" size="small" icon={<DeleteOutlined />} danger onClick={() => onDelete(record)} />
          </Tooltip>
        )}
      </Space>
    ),
  },
];
