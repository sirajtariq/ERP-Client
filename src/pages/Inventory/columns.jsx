import { Space, Tag, Tooltip } from "antd";
import { EyeOutlined, EditOutlined, DeleteOutlined, SwapOutlined } from "@ant-design/icons";
import { AppButton } from "@/components/common";
import { formatCurrency } from "@/utils";

const STATUS_MAP = {
  in_stock:      { label: "In Stock",     color: "success", text: "#22c55e" },
  low_stock:     { label: "Low Stock",    color: "warning", text: "#f97316" },
  out_of_stock:  { label: "Out of Stock", color: "error",   text: "#ef4444" },
};

const isServiceItem = (item) => item.itemType === "service";

const stockStatus = (item) =>
  STATUS_MAP[item.stockStatus] || STATUS_MAP["in_stock"];

export const getInventoryColumns = ({ onView, onEdit, onAdjust, onDelete, isAdmin }) => [
  {
    title: "Code",
    dataIndex: "itemCode",
    key: "itemCode",
    render: (v) => <span style={{ fontWeight: 700, color: "#7c5cfc", fontSize: 12 }}>{v}</span>,
  },
  {
    title: "Item Name",
    dataIndex: "name",
    key: "name",
    render: (val, record) => (
      <Tooltip title={record.description ? `${val} — ${record.description}` : val} placement="topLeft">
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", rowGap: 2 }}>
            <span style={{ fontWeight: 700, color: "var(--color-text)", fontSize: 13, wordBreak: "break-word", overflowWrap: "anywhere" }}>{val}</span>
            {isServiceItem(record) && (
              <Tag color="purple" style={{ fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "0 5px", lineHeight: "18px", margin: 0, flexShrink: 0 }}>SERVICE</Tag>
            )}
          </div>
          {record.description && (
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 1, wordBreak: "break-word", overflowWrap: "anywhere" }}>
              {record.description}
            </div>
          )}
        </div>
      </Tooltip>
    ),
  },
  {
    title: "Category",
    dataIndex: "category",
    key: "category",
    ellipsis: true,
    render: (v) => (
      <Tooltip title={v} placement="topLeft">
        <span style={{ fontWeight: 600, fontSize: 12, color: "#3b82f6" }}>{v}</span>
      </Tooltip>
    ),
  },
  {
    title: "Purchase Rate",
    dataIndex: "purchaseRate",
    key: "purchaseRate",
    render: (v) => <span style={{ fontWeight: 600, fontSize: 13 }}>{formatCurrency(v)}</span>,
  },
  {
    title: "Sale Rate",
    dataIndex: "saleRate",
    key: "saleRate",
    render: (v) => <span style={{ fontWeight: 700, color: "#7c5cfc", fontSize: 13 }}>{formatCurrency(v)}</span>,
  },
  {
    title: "Margin",
    key: "margin",
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
    render: (v, record) => {
      if (isServiceItem(record)) {
        return <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontStyle: "italic" }}>—</span>;
      }
      const st = stockStatus(record);
      return (
        <span style={{ fontWeight: 800, color: st.text, fontSize: 14 }}>
          {v} <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)" }}>{record.unit}</span>
        </span>
      );
    },
  },
  {
    title: "Status",
    key: "status",
    render: (_, record) => {
      if (isServiceItem(record)) {
        return <Tag color="purple" style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }}>Service</Tag>;
      }
      const st = stockStatus(record);
      return <Tag color={st.color} style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }}>{st.label}</Tag>;
    },
  },
  {
    title: "Actions",
    key: "actions",
    render: (_, record) => (
      <Space size={3}>
        <Tooltip title="View Details">
          <AppButton type="text" size="small" icon={<EyeOutlined style={{ color: "#7c5cfc" }} />} onClick={() => onView(record)} />
        </Tooltip>
        {!isServiceItem(record) && (
          <Tooltip title="Adjust Stock">
            <AppButton type="text" size="small" icon={<SwapOutlined style={{ color: "#22c55e" }} />} onClick={() => onAdjust(record)} />
          </Tooltip>
        )}
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
