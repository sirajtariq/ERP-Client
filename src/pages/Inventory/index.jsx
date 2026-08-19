import { useState, useEffect, useRef, useCallback } from "react";
import { message, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { AppTable, AppButton, AppModal, PageHeader, FilterPanel } from "@/components/common";
import { formatCurrency } from "@/utils";
import { useAuth } from "@/context/AuthContext";
import { useSearch } from "@/context/SearchContext";
import { MOCK_STOCK_HISTORY, CATEGORIES } from "./mockData";
import { getItems, createItem, getItemById, updateItem } from "@/services/inventoryService";
import { filterConfig } from "@/utils/filterConfig";
import { getInventoryColumns } from "./columns";
import ItemDrawer from "./ItemDrawer";
import StockAdjustModal from "./StockAdjustModal";
import ItemDetailModal from "./ItemDetailModal";

const { Text } = Typography;

const CATEGORY_OPTIONS = [
  { value: "__add__", label: "+ Write Category" },
  ...CATEGORIES.map((c) => ({ value: c, label: c })),
];

const STOCK_STATUS_OPTIONS = [
  { value: "in",  label: "In Stock" },
  { value: "low", label: "Low Stock" },
  { value: "out", label: "Out of Stock" },
];

let nextHistId = 30;
const PAGE_SIZE = 10;

const Inventory = () => {
  const { userRole } = useAuth();
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(userRole);
  const { searchText, setPlaceholder, clearSearch } = useSearch();

  // ── API data ──
  const [items,      setItems]      = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summary,    setSummary]    = useState(null);
  const [loading,    setLoading]    = useState(false);

  // ── Local stock history (until stock history API is wired) ──
  const [stockHistory, setStockHistory] = useState(MOCK_STOCK_HISTORY);

  // ── Modals ──
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewItem,    setViewItem]    = useState(null);
  const [adjustItem,  setAdjustItem]  = useState(null);
  const [adjustType,  setAdjustType]  = useState("in");
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });

  // ── Filters & pagination ──
  const [appliedFilters, setAppliedFilters] = useState({});
  const [currentPage,    setCurrentPage]    = useState(1);

  // ── Set global search placeholder ──
  useEffect(() => {
    setPlaceholder("Search inventory by name or item code...");
    return () => clearSearch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch ──
  const fetchItems = useCallback(async (page = 1, search = "", filters = {}) => {
    setLoading(true);
    try {
      const data = await getItems({
        page,
        pageSize: PAGE_SIZE,
        search,
        category: filters.category || "",
        status:   filters.status   || "",
      });
      const normalized = (data.results || []).map((i) => ({
        ...i,
        purchaseRate: Number(i.purchaseRate),
        saleRate:     Number(i.saleRate),
        currentStock: Number(i.currentStock),
        stockValue:   Number(i.stockValue),
      }));
      setItems(normalized);
      setTotalCount(data.count || 0);
      if (data.summary) setSummary(data.summary);
    } catch {
      message.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Debounced search from global SearchContext ──
  const isInitialMount = useRef(true);
  const searchTimer    = useRef(null);

  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; fetchItems(1, "", appliedFilters); return; }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setCurrentPage(1);
      fetchItems(1, searchText, appliedFilters);
    }, 400);
  }, [searchText]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filter handlers ──
  const handleApplyFilters = (filters) => {
    setAppliedFilters(filters);
    setCurrentPage(1);
    fetchItems(1, searchText, filters);
  };

  const handleResetFilters = () => {
    setAppliedFilters({});
    setCurrentPage(1);
    fetchItems(1, searchText, {});
  };

  const handlePagination = (page) => {
    setCurrentPage(page);
    fetchItems(page, searchText, appliedFilters);
  };

  // ── View — fetch item detail then open modal ──
  const [viewLoading, setViewLoading] = useState(false);

  const handleViewClick = async (item) => {
    setViewLoading(true);
    try {
      const d = await getItemById(item.id);
      setViewItem({
        id:           d.id,
        name:         d.itemName         || "--",
        itemCode:     d.itemCode         || "--",
        category:     d.category         || "--",
        unit:         d.unit             || "--",
        purchaseRate: Number(d.purchaseRate)  || 0,
        saleRate:     Number(d.saleRate)      || 0,
        minStock:     Number(d.minStock)      || 0,
        currentStock: Number(d.currentStock)  || 0,
        openingStock: Number(d.openingStock)  || 0,
        totalIn:      Number(d.totalIn)       || 0,
        totalOut:     Number(d.totalOut)      || 0,
        stockValue:   Number(d.stockValue)    || 0,
        profitPerItem:Number(d.profitPerItem) || 0,
        profitMargin: Number(d.profitMargin)  || 0,
        description:  d.description      || "",
        stockStatus:  d.itemStatus       || "in_stock",
      });
    } catch {
      message.error("Failed to load item details");
    } finally {
      setViewLoading(false);
    }
  };

  // ── Edit — fetch item detail then open drawer ──
  const [editLoading,  setEditLoading]  = useState(false);
  const [updatingItem, setUpdatingItem] = useState(false);

  const handleEditClick = async (item) => {
    setEditLoading(true);
    try {
      const detail = await getItemById(item.id);
      setEditingItem({
        id:           detail.id,
        itemCode:     detail.itemCode,
        name:         detail.itemName,
        category:     detail.category,
        unit:         detail.unit,
        purchaseRate: Number(detail.purchaseRate),
        saleRate:     Number(detail.saleRate),
        minStock:     Number(detail.minStock),
        description:  detail.description || "",
      });
      setDrawerOpen(true);
    } catch {
      message.error("Failed to load item details");
    } finally {
      setEditLoading(false);
    }
  };

  // ── Add item ──
  const [addingItem, setAddingItem] = useState(false);

  const handleAddItem = async (payload) => {
    setAddingItem(true);
    try {
      const created = await createItem({
        itemCode:     payload.itemCode,
        name:         payload.name,
        category:     payload.category,
        unit:         payload.unit,
        purchaseRate: String(payload.purchaseRate || 0),
        saleRate:     String(payload.saleRate     || 0),
        openingStock: String(payload.openingStock  || 0),
        minStock:     String(payload.minStock      || 0),
        description:  payload.description || null,
      });

      if (Number(created.currentStock) > 0) {
        setStockHistory((prev) => [...prev, {
          id:          ++nextHistId,
          itemId:      created.id,
          type:        "in",
          qty:         Number(created.currentStock),
          reason:      "Opening Stock",
          date:        new Date().toISOString().slice(0, 10),
          notes:       "Initial stock on item creation",
          stockBefore: 0,
          stockAfter:  Number(created.currentStock),
        }]);
      }

      setDrawerOpen(false);
      message.success(`"${created.name}" added to inventory`);
      fetchItems(currentPage, searchText, appliedFilters);
    } catch (err) {
      const detail = err?.response?.data;
      const msg = typeof detail === "string"
        ? detail
        : Object.values(detail || {})?.[0]?.[0] || "Failed to add item";
      message.error(msg);
    } finally {
      setAddingItem(false);
    }
  };

  const handleUpdateItem = async (payload) => {
    setUpdatingItem(true);
    try {
      await updateItem(editingItem.id, {
        itemCode:     payload.itemCode,
        name:         payload.name,
        category:     payload.category,
        unit:         payload.unit,
        purchaseRate: String(payload.purchaseRate || 0),
        saleRate:     String(payload.saleRate     || 0),
        openingStock: String(payload.openingStock  || 0),
        minStock:     String(payload.minStock      || 0),
        description:  payload.description || null,
      });
      setDrawerOpen(false);
      setEditingItem(null);
      message.success(`"${payload.name}" updated`);
      fetchItems(currentPage, searchText, appliedFilters);
    } catch (err) {
      const detail = err?.response?.data;
      const msg = typeof detail === "string"
        ? detail
        : Object.values(detail || {})?.[0]?.[0] || "Failed to update item";
      message.error(msg);
    } finally {
      setUpdatingItem(false);
    }
  };

  const handleDelete = () => {
    setItems((prev) => prev.filter((i) => i.id !== deleteModal.item.id));
    setStockHistory((prev) => prev.filter((h) => h.itemId !== deleteModal.item.id));
    setDeleteModal({ open: false, item: null });
    message.success("Item deleted");
  };

  // ── Stock Adjust ──
  const handleAdjust = ({ itemId, type, qty, reason, date, notes, stockBefore, stockAfter }) => {
    setStockHistory((prev) => [...prev, {
      id: ++nextHistId,
      itemId, type, qty, reason, date, notes, stockBefore, stockAfter,
    }]);
    setViewItem((prev) => prev?.id === itemId ? { ...prev, currentStock: stockAfter } : prev);
    fetchItems(currentPage, searchText, appliedFilters);
  };

  const openStockIn  = (item) => { setAdjustItem(item); setAdjustType("in");  };
  const openStockOut = (item) => { setAdjustItem(item); setAdjustType("out"); };

  const columns = getInventoryColumns({
    onView:    (item) => handleViewClick(item),
    onEdit:    (item) => handleEditClick(item),
    onAdjust:  (item) => { setAdjustItem(item); setAdjustType("in"); },
    onDelete:  (item) => setDeleteModal({ open: true, item }),
    isAdmin,
    editLoading,
  });

  return (
    <section>
      <PageHeader
        title="Inventory"
        subtitle="Manage stock items, track movements and monitor levels"
        extra={
          <>
            <FilterPanel
              config={filterConfig.inventory}
              options={{ category: CATEGORY_OPTIONS, status: STOCK_STATUS_OPTIONS }}
              values={appliedFilters}
              onApply={handleApplyFilters}
              onReset={handleResetFilters}
            />
            <AppButton type="primary" icon={<PlusOutlined />} onClick={() => { setEditingItem(null); setDrawerOpen(true); }} className="btn-dark">
              Add Item
            </AppButton>
          </>
        }
      />

      {/* Summary cards */}
      <section style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        {[
          { label: "Total Items",       value: totalCount,                                                                                       color: "#7c5cfc", bg: "rgba(124,92,252,0.07)",  border: "rgba(124,92,252,0.18)", isCount: true },
          { label: "Stock Value",       value: summary?.totalStockValue       != null ? formatCurrency(summary.totalStockValue)       : "--",    color: "#22c55e", bg: "rgba(34,197,94,0.07)",   border: "rgba(34,197,94,0.18)"  },
          { label: "Potential Revenue", value: summary?.totalPotentialRevenue != null ? formatCurrency(summary.totalPotentialRevenue) : "--",    color: "#3b82f6", bg: "rgba(59,130,246,0.07)",  border: "rgba(59,130,246,0.18)" },
          { label: "Low Stock",         value: summary?.lowStockCount         != null ? summary.lowStockCount         : "--",                   color: "#f97316", bg: "rgba(249,115,22,0.07)",  border: "rgba(249,115,22,0.18)", isCount: true },
          { label: "Out of Stock",      value: summary?.outOfStockCount       != null ? summary.outOfStockCount       : "--",                   color: "#ef4444", bg: "rgba(239,68,68,0.07)",   border: "rgba(239,68,68,0.18)",  isCount: true },
        ].map(({ label, value, color, bg, border, isCount }) => (
          <section key={label} style={{ flex: 1, padding: "12px 18px", borderRadius: 10, background: bg, border: `1px solid ${border}`, display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", color }}>{label}</span>
            <span style={{ fontSize: isCount ? 26 : "clamp(12px, 1.2vw, 18px)", fontWeight: 800, color, lineHeight: 1.2 }}>{value}</span>
          </section>
        ))}
      </section>

      <AppTable
        columns={columns}
        dataSource={items}
        rowKey="id"
        loading={loading}
        scroll={{ y: "calc(100vh - 420px)" }}
        page={{ current: currentPage, size: PAGE_SIZE, total: totalCount }}
        handlePagination={handlePagination}
      />

      <ItemDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingItem(null); }}
        onSubmit={editingItem ? handleUpdateItem : handleAddItem}
        editingItem={editingItem}
        loading={editingItem ? updatingItem : addingItem}
      />

      <ItemDetailModal
        open={!!viewItem}
        onClose={() => setViewItem(null)}
        item={viewItem}
        stockHistory={stockHistory}
        onStockIn={openStockIn}
        onStockOut={openStockOut}
      />

      <StockAdjustModal
        open={!!adjustItem}
        onClose={() => setAdjustItem(null)}
        item={adjustItem}
        defaultType={adjustType}
        onAdjust={handleAdjust}
      />

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
