import { useState, useMemo } from "react";
import { message, Typography, Input, Select } from "antd";
import { PlusOutlined, SearchOutlined, AppstoreOutlined } from "@ant-design/icons";
import { AppTable, AppButton, AppModal, PageHeader } from "@/components/common";
import { formatCurrency } from "@/utils";
import { useAuth } from "@/context/AuthContext";
import { MOCK_ITEMS, MOCK_STOCK_HISTORY, CATEGORIES } from "./mockData";
import { getInventoryColumns } from "./columns";
import ItemDrawer from "./ItemDrawer";
import StockAdjustModal from "./StockAdjustModal";
import ItemDetailModal from "./ItemDetailModal";

const { Text } = Typography;

const CATEGORY_FILTER_OPTIONS = [
  { value: "all", label: "All Categories" },
  ...CATEGORIES.map((c) => ({ value: c, label: c })),
];

const STOCK_FILTER_OPTIONS = [
  { value: "all",      label: "All Items" },
  { value: "in",       label: "In Stock" },
  { value: "low",      label: "Low Stock" },
  { value: "out",      label: "Out of Stock" },
];

let nextItemId   = 20;
let nextHistId   = 30;
let nextItemCode = 11;

const Inventory = () => {
  const { userRole } = useAuth();
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(userRole);

  const [items,        setItems]        = useState(MOCK_ITEMS);
  const [stockHistory, setStockHistory] = useState(MOCK_STOCK_HISTORY);

  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [editingItem,  setEditingItem]  = useState(null);
  const [viewItem,     setViewItem]     = useState(null);
  const [adjustItem,   setAdjustItem]   = useState(null);
  const [adjustType,   setAdjustType]   = useState("in");
  const [deleteModal,  setDeleteModal]  = useState({ open: false, item: null });

  const [searchText,    setSearchText]    = useState("");
  const [categoryFilter,setCategoryFilter]= useState("all");
  const [stockFilter,   setStockFilter]   = useState("all");
  const [currentPage,   setCurrentPage]   = useState(1);
  const PAGE_SIZE = 10;

  // ── Derived stock status ──
  const getStockStatus = (item) => {
    if (item.currentStock === 0)             return "out";
    if (item.currentStock <= item.minStock)  return "low";
    return "in";
  };

  // ── Summary ──
  const summary = useMemo(() => ({
    totalItems:     items.length,
    totalValue:     items.reduce((s, i) => s + i.currentStock * i.purchaseRate, 0),
    lowStockCount:  items.filter((i) => i.currentStock > 0 && i.currentStock <= i.minStock).length,
    outOfStock:     items.filter((i) => i.currentStock === 0).length,
    totalSaleValue: items.reduce((s, i) => s + i.currentStock * i.saleRate, 0),
  }), [items]);

  // ── Filtered list ──
  const filteredItems = useMemo(() => {
    let list = items;
    if (categoryFilter !== "all") list = list.filter((i) => i.category === categoryFilter);
    if (stockFilter    !== "all") list = list.filter((i) => getStockStatus(i) === stockFilter);
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter((i) =>
        i.name.toLowerCase().includes(q) ||
        i.itemCode.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
      );
    }
    setCurrentPage(1);
    return list;
  }, [items, categoryFilter, stockFilter, searchText]);

  // ── Next item code helper ──
  const getNextCode = () => `ITM-${String(nextItemCode).padStart(3, "0")}`;

  // ── Add / Edit ──
  const handleAddItem = (payload) => {
    const newItem = {
      ...payload,
      id:           ++nextItemId,
      itemCode:     payload.itemCode,
      currentStock: payload.openingStock || 0,
    };
    setItems((prev) => [...prev, newItem]);

    if (payload.openingStock > 0) {
      setStockHistory((prev) => [...prev, {
        id:          ++nextHistId,
        itemId:      newItem.id,
        type:        "in",
        qty:         payload.openingStock,
        reason:      "Opening Stock",
        date:        new Date().toISOString().slice(0, 10),
        notes:       "Initial stock on item creation",
        stockBefore: 0,
        stockAfter:  payload.openingStock,
      }]);
    }

    nextItemCode++;
    setDrawerOpen(false);
    message.success(`"${payload.name}" added to inventory`);
  };

  const handleUpdateItem = (payload) => {
    setItems((prev) => prev.map((i) => i.id === editingItem.id ? { ...i, ...payload } : i));
    setDrawerOpen(false);
    setEditingItem(null);
    message.success(`"${payload.name}" updated`);
  };

  const handleDelete = () => {
    setItems((prev) => prev.filter((i) => i.id !== deleteModal.item.id));
    setStockHistory((prev) => prev.filter((h) => h.itemId !== deleteModal.item.id));
    setDeleteModal({ open: false, item: null });
    message.success("Item deleted");
  };

  // ── Stock Adjust ──
  const handleAdjust = ({ itemId, type, qty, reason, date, notes, stockBefore, stockAfter }) => {
    setItems((prev) =>
      prev.map((i) => i.id === itemId ? { ...i, currentStock: stockAfter } : i)
    );
    setStockHistory((prev) => [...prev, {
      id: ++nextHistId,
      itemId, type, qty, reason, date, notes, stockBefore, stockAfter,
    }]);

    // Keep viewItem in sync if detail modal is open
    setViewItem((prev) => prev?.id === itemId ? { ...prev, currentStock: stockAfter } : prev);
  };

  const openStockIn  = (item) => { setAdjustItem(item); setAdjustType("in");  };
  const openStockOut = (item) => { setAdjustItem(item); setAdjustType("out"); };

  const columns = getInventoryColumns({
    onView:    (item) => setViewItem(item),
    onEdit:    (item) => { setEditingItem(item); setDrawerOpen(true); },
    onAdjust:  (item) => { setAdjustItem(item); setAdjustType("in"); },
    onDelete:  (item) => setDeleteModal({ open: true, item }),
    isAdmin,
  });

  return (
    <section>
      <PageHeader
        title="Inventory"
        subtitle="Manage stock items, track movements and monitor levels"
        extra={
          <AppButton type="primary" icon={<PlusOutlined />} onClick={() => { setEditingItem(null); setDrawerOpen(true); }} className="btn-dark">
            Add Item
          </AppButton>
        }
      />

      {/* Summary cards */}
      <section style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        {[
          { label: "Total Items",       value: summary.totalItems,                   color: "#7c5cfc", bg: "rgba(124,92,252,0.07)",  border: "rgba(124,92,252,0.18)", isCount: true },
          { label: "Stock Value",       value: formatCurrency(summary.totalValue),   color: "#22c55e", bg: "rgba(34,197,94,0.07)",   border: "rgba(34,197,94,0.18)"  },
          { label: "Potential Revenue", value: formatCurrency(summary.totalSaleValue),color: "#3b82f6", bg: "rgba(59,130,246,0.07)", border: "rgba(59,130,246,0.18)" },
          { label: "Low Stock",         value: summary.lowStockCount,                color: "#f97316", bg: "rgba(249,115,22,0.07)",  border: "rgba(249,115,22,0.18)", isCount: true },
          { label: "Out of Stock",      value: summary.outOfStock,                   color: "#ef4444", bg: "rgba(239,68,68,0.07)",   border: "rgba(239,68,68,0.18)",  isCount: true },
        ].map(({ label, value, color, bg, border, isCount }) => (
          <section key={label} style={{ flex: 1, padding: "12px 18px", borderRadius: 10, background: bg, border: `1px solid ${border}`, display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", color }}>{label}</span>
            <span style={{ fontSize: isCount ? 26 : "clamp(12px, 1.2vw, 18px)", fontWeight: 800, color, lineHeight: 1.2 }}>{value}</span>
          </section>
        ))}
      </section>

      {/* Search + filter bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <Input
          prefix={<SearchOutlined style={{ color: "var(--color-text-secondary)" }} />}
          placeholder="Search by name, code or category..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          style={{ flex: 1, height: 36 }}
        />
        <Select
          value={categoryFilter}
          onChange={setCategoryFilter}
          style={{ width: 170, height: 36 }}
          options={CATEGORY_FILTER_OPTIONS}
          prefix={<AppstoreOutlined />}
        />
        <Select
          value={stockFilter}
          onChange={setStockFilter}
          style={{ width: 150, height: 36 }}
          options={STOCK_FILTER_OPTIONS}
        />
      </div>

      <AppTable
        columns={columns}
        dataSource={filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)}
        rowKey="id"
        scroll={{ y: "calc(100vh - 460px)" }}
        page={{ current: currentPage, size: PAGE_SIZE, total: filteredItems.length }}
        handlePagination={(page) => setCurrentPage(page)}
      />

      {/* Add / Edit drawer */}
      <ItemDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingItem(null); }}
        onSubmit={editingItem ? handleUpdateItem : handleAddItem}
        editingItem={editingItem}
        nextCode={getNextCode()}
      />

      {/* Item detail modal */}
      <ItemDetailModal
        open={!!viewItem}
        onClose={() => setViewItem(null)}
        item={viewItem}
        stockHistory={stockHistory}
        onStockIn={openStockIn}
        onStockOut={openStockOut}
      />

      {/* Stock adjust modal */}
      <StockAdjustModal
        open={!!adjustItem}
        onClose={() => setAdjustItem(null)}
        item={adjustItem}
        defaultType={adjustType}
        onAdjust={handleAdjust}
      />

      {/* Delete confirm */}
      <AppModal
        title="Delete this item?"
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, item: null })}
        onSubmit={handleDelete}
        submitText="Delete"
        cancelText="Cancel"
        danger
        width={440}
      >
        <Text style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          This will permanently remove{" "}
          <strong style={{ color: "var(--color-text)" }}>"{deleteModal.item?.name}"</strong>{" "}
          and all its stock history. This cannot be undone.
        </Text>
      </AppModal>
    </section>
  );
};

export default Inventory;
