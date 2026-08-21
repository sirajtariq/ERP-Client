import { useEffect, useState, useCallback, useRef } from "react";
import _ from "lodash";
import { Space, Tag, Tooltip, message, Typography } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import { AppTable, AppButton, AppModal, PageHeader, FilterPanel, TrashDrawer } from "@/components/common";
import { formatCurrency, formatDate } from "@/utils";
import { useSearch } from "@/context/SearchContext";
import { useAuth } from "@/context/AuthContext";
import { filterConfig } from "@/utils/filterConfig";
import { getAllDailyOutflows, normalizeDailyOutflow, getExpenseById, deleteExpense, normalizeExpense, getTrashedExpenses, restoreExpense, permanentDeleteExpense } from "@/services/expenseService";
import { getAllVendors, normalizeVendor, getVendorPaymentById } from "@/services/supplierService";
import ExpenseDrawer from "./ExpenseDrawer";
import ExpenseModal from "./ExpenseModal";
import PurchaseExpenseDrawer from "./PurchaseExpenseDrawer";

const { Text } = Typography;

const DailyExpense = () => {
  const [expenses, setExpenses]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [drawerOpen, setDrawerOpen]         = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteModal, setDeleteModal]       = useState({ open: false, expense: null });
  const [trashOpen, setTrashOpen]                     = useState(false);
  const [purchaseExpenseOpen, setPurchaseExpenseOpen] = useState(false);
  const [purchaseExpenseLoading, setPurchaseExpenseLoading] = useState(false);
  const [preloadedVendors, setPreloadedVendors]             = useState([]);
  const [preloadedVendorTotal, setPreloadedVendorTotal]     = useState(0);
  const [deleteLoading, setDeleteLoading]   = useState(false);
  const [viewExpense, setViewExpense]       = useState(null);
  const [editLoadingId, setEditLoadingId]   = useState(null);
  const [viewLoadingId, setViewLoadingId]   = useState(null);
  const [appliedFilters, setAppliedFilters] = useState({});
  const { searchText, setPlaceholder, clearSearch } = useSearch();
  const { userRole } = useAuth();
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(userRole);
  const [page, setPage]       = useState({ current: 1, size: 10, total: 0, totalPages: 0 });
  const [summary, setSummary] = useState({ totalExpenses: 0, totalVendorPayments: 0, totalCombinedOutflow: 0 });
  const isInitialMount = useRef(true);

  const fetchExpenses = async (pageNo = 1, pageSize = 10, expenseNumber = "", dateFrom = "", dateTo = "", category = "", type = "") => {
    setLoading(true);
    try {
      const res = await getAllDailyOutflows({ page: pageNo, pageSize, expenseNumber, category, dateFrom, dateTo, type });
      setExpenses((res.results || []).map(normalizeDailyOutflow));
      setPage((prev) => ({
        ...prev,
        current:    res.page       || pageNo,
        size:       res.pageSize   || res.page_size  || pageSize,
        total:      res.count      || 0,
        totalPages: res.totalPages || res.total_pages || 0,
      }));
      if (res.summary) setSummary(res.summary);
    } catch {
      message.error("Failed to load daily expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPlaceholder("Search by voucher number...");
    fetchExpenses(1, page.size);
    return () => clearSearch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    if (searchText !== undefined) handleSearchDebounce(searchText);
  }, [searchText]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchDebounce = useCallback(
    _.debounce((value) => {
      fetchExpenses(1, page.size, value, appliedFilters.startDate, appliedFilters.endDate, appliedFilters.category, appliedFilters.type);
    }, 500),
    [page.size, appliedFilters]
  );

  const handlePagination = (pageNo, pageSize) => {
    const size = pageSize || page.size;
    setPage((prev) => ({ ...prev, current: pageNo, size }));
    fetchExpenses(pageNo, size, searchText, appliedFilters.startDate, appliedFilters.endDate, appliedFilters.category, appliedFilters.type);
  };

  const handleApplyFilters = (filters) => {
    handleSearchDebounce.cancel();
    setAppliedFilters(filters);
    setPage((prev) => ({ ...prev, current: 1 }));
    fetchExpenses(1, page.size, searchText, filters.startDate, filters.endDate, filters.category, filters.type);
  };

  const handleResetFilters = () => {
    handleSearchDebounce.cancel();
    setAppliedFilters({});
    setPage((prev) => ({ ...prev, current: 1 }));
    fetchExpenses(1, page.size, searchText);
  };

  const handleCreate = () => { setEditingExpense(null); setDrawerOpen(true); };

  const handleOpenPurchaseExpense = async () => {
    setPurchaseExpenseLoading(true);
    try {
      const res = await getAllVendors({ page: 1, pageSize: 10 });
      setPreloadedVendors((res.results || []).map(normalizeVendor));
      setPreloadedVendorTotal(res.count || 0);
      setPurchaseExpenseOpen(true);
    } catch {
      message.error("Failed to load suppliers");
    } finally {
      setPurchaseExpenseLoading(false);
    }
  };

  const handleView = async (record) => {
    setViewLoadingId(record.id);
    try {
      if (record.type === "VENDOR_PAYMENT") {
        const detail = await getVendorPaymentById(record.id);
        setViewExpense({
          voucher:       detail.paymentNumber || "",
          category:      "Vendor Payment",
          date:          detail.date || "",
          paymentMethod: detail.method || "",
          supplier:      detail.vendor?.vendorName || detail.vendor?.name || "",
          paidBy:        detail.method || "",
          notes:         detail.notes || "",
          items: [{
            detail: detail.invoice ? `Invoice: ${detail.invoice}` : "General vendor payment",
            qty: 1,
            amount: parseFloat(detail.amountPaid) || 0,
          }],
          totalAmount: parseFloat(detail.amountPaid) || 0,
        });
      } else {
        const detail = await getExpenseById(record.id);
        setViewExpense(normalizeExpense(detail));
      }
    } catch {
      message.error("Failed to load details");
    } finally {
      setViewLoadingId(null);
    }
  };

  const handleEdit = async (record) => {
    setEditLoadingId(record.id);
    try {
      const detail = await getExpenseById(record.id);
      setEditingExpense(normalizeExpense(detail));
      setDrawerOpen(true);
    } catch {
      message.error("Failed to load expense details");
    } finally {
      setEditLoadingId(null);
    }
  };

  const handleDeleteClick = (record) => { setDeleteModal({ open: true, expense: record }); };

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    try {
      await deleteExpense(deleteModal.expense.id);
      message.success(`"${deleteModal.expense.voucher}" deleted`);
      setDeleteModal({ open: false, expense: null });
      fetchExpenses(page.current, page.size, searchText, appliedFilters.startDate, appliedFilters.endDate, appliedFilters.category, appliedFilters.type);
    } catch (err) {
      message.error(err.response?.data?.detail || "Failed to delete expense");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDrawerSubmit = () => {
    message.success(editingExpense ? "Expense updated" : "Expense added");
    setDrawerOpen(false);
    fetchExpenses(page.current, page.size, searchText, appliedFilters.startDate, appliedFilters.endDate, appliedFilters.category, appliedFilters.type);
  };

  const TYPE_CONFIG = {
    EXPENSE:        { label: "Shop Expense",   color: "#3b82f6", bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.3)"  },
    VENDOR_PAYMENT: { label: "Vendor Payment", color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)" },
  };

  const columns = [
    {
      title: "Voucher", dataIndex: "voucher", key: "voucher", width: "13%",
      render: (val) => <span style={{ fontWeight: 600, color: "#7c5cfc" }}>{val || "-"}</span>,
    },
    {
      title: "Type", dataIndex: "type", key: "type", width: "12%",
      render: (val) => {
        const cfg = TYPE_CONFIG[val] || TYPE_CONFIG.EXPENSE;
        return (
          <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
            {cfg.label}
          </span>
        );
      },
    },
    {
      title: "Category", dataIndex: "category", key: "category", width: "14%", ellipsis: true,
      render: (val) => (
        <Tooltip title={val}>
          <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block" }}>{val || "-"}</Tag>
        </Tooltip>
      ),
    },
    {
      title: "Vendor", dataIndex: "supplier", key: "supplier", width: "18%", ellipsis: true,
      render: (val) => <span style={{ fontWeight: 500 }}>{val || <span style={{ color: "var(--color-text-secondary)" }}>—</span>}</span>,
    },
    {
      title: "Amount", dataIndex: "amount", key: "amount", width: "11%",
      render: (val) => <span style={{ fontWeight: 700, color: "#ef4444" }}>{formatCurrency(val || 0)}</span>,
    },
    {
      title: "Method", dataIndex: "paymentMethod", key: "paymentMethod", width: "10%",
      render: (val) => <span style={{ fontWeight: 500 }}>{val || "-"}</span>,
    },
    {
      title: "Date", dataIndex: "date", key: "date", width: "10%",
      render: (val) => <span style={{ color: "var(--color-text-secondary)" }}>{val ? formatDate(val) : "-"}</span>,
    },
    {
      title: "Action", key: "actions", width: "12%",
      render: (_, record) => (
        <Space size={4}>
          {record.type === "EXPENSE" && (
            <>
              <Tooltip title="View">
                <AppButton type="text" icon={<EyeOutlined />} size="small" loading={viewLoadingId === record.id} onClick={() => handleView(record)} />
              </Tooltip>
              <Tooltip title="Edit">
                <AppButton type="text" icon={<EditOutlined />} size="small" loading={editLoadingId === record.id} onClick={() => handleEdit(record)} />
              </Tooltip>
              <Tooltip title="Delete">
                <AppButton type="text" icon={<DeleteOutlined />} size="small" danger onClick={() => handleDeleteClick(record)} />
              </Tooltip>
            </>
          )}
          {record.type === "VENDOR_PAYMENT" && (
            <Tooltip title="View">
              <AppButton type="text" icon={<EyeOutlined />} size="small" loading={viewLoadingId === record.id} onClick={() => handleView(record)} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <section>
      <PageHeader
        title="Daily Expense"
        subtitle="Track daily business expenses"
        extra={
          <>
            <FilterPanel
              config={filterConfig.dailyExpense}
              options={{ type: [{ label: "Shop Expense", value: "EXPENSE" }, { label: "Vendor Payment", value: "VENDOR_PAYMENT" }] }}
              values={appliedFilters}
              onApply={handleApplyFilters}
              onReset={handleResetFilters}
            />
            {isAdmin && (
              <AppButton icon={<DeleteOutlined />} onClick={() => setTrashOpen(true)} danger>Shop Expense Trash</AppButton>
            )}
            <AppButton type="primary" icon={<PlusOutlined />} loading={purchaseExpenseLoading} onClick={handleOpenPurchaseExpense}>Add Purchase Expense</AppButton>
            <AppButton type="primary" icon={<PlusOutlined />} onClick={handleCreate} className="btn-dark">Add Shop Expense</AppButton>
          </>
        }
      />

      <section style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        {[
          { label: "Shop Expenses",     value: summary.totalExpenses,        color: "#3b82f6", bg: "rgba(59,130,246,0.07)",  border: "rgba(59,130,246,0.18)"  },
          { label: "Vendor Payments",   value: summary.totalVendorPayments,  color: "#f97316", bg: "rgba(249,115,22,0.07)", border: "rgba(249,115,22,0.18)" },
          { label: "Total Cash Outflow",value: summary.totalCombinedOutflow, color: "#dc2626", bg: "rgba(220,38,38,0.07)",  border: "rgba(220,38,38,0.18)"  },
        ].map(({ label, value, color, bg, border }) => (
          <section key={label} style={{ flex: 1, padding: "10px 16px", borderRadius: 10, background: bg, border: `1px solid ${border}`, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", color }}>{label}</span>
            <span style={{ fontSize: "clamp(12px, 1.2vw, 18px)", fontWeight: 800, color, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{formatCurrency(value || 0)}</span>
          </section>
        ))}
      </section>

      <AppTable
        columns={columns}
        dataSource={expenses}
        loading={loading}
        scroll={{ y: "calc(100vh - 390px)" }}
        page={page}
        handlePagination={handlePagination}
      />

      <ExpenseDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSubmit={handleDrawerSubmit} editingExpense={editingExpense} />

      <PurchaseExpenseDrawer
        open={purchaseExpenseOpen}
        initialVendors={preloadedVendors}
        initialVendorTotal={preloadedVendorTotal}
        onClose={() => { setPurchaseExpenseOpen(false); setPreloadedVendors([]); setPreloadedVendorTotal(0); }}
        onSubmit={() => { setPurchaseExpenseOpen(false); setPreloadedVendors([]); setPreloadedVendorTotal(0); fetchExpenses(page.current, page.size, searchText, appliedFilters.startDate, appliedFilters.endDate); }}
      />

      <AppModal
        title="Delete this expense?"
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, expense: null })}
        onSubmit={handleDeleteConfirm}
        submitText="Delete expense"
        cancelText="Keep expense"
        loading={deleteLoading}
        danger
        width={460}
      >
        <Text style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          This will permanently remove <strong style={{ color: "var(--color-text)" }}>"{deleteModal.expense?.voucher}"</strong>. Are you sure?
        </Text>
      </AppModal>

      <ExpenseModal
        open={!!viewExpense}
        onClose={() => setViewExpense(null)}
        data={{
          voucher:       viewExpense?.voucher       || "",
          expenseName:   viewExpense?.notes         || "",
          category:      viewExpense?.category      || "N/A",
          date:          viewExpense?.date          || "",
          paymentMethod: viewExpense?.paymentMethod || "N/A",
          person:        viewExpense?.supplier      || "N/A",
          paidBy:        viewExpense?.paidBy        || "N/A",
          items:         viewExpense?.items?.length ? viewExpense.items : [{ detail: viewExpense?.notes, qty: 1, amount: viewExpense?.amount || 0 }],
          totalAmount:   viewExpense?.totalAmount   ?? viewExpense?.amount ?? 0,
        }}
      />

      {isAdmin && (
        <TrashDrawer
          open={trashOpen}
          onClose={() => setTrashOpen(false)}
          title="Shop Expense Trash"
          fetchFn={getTrashedExpenses}
          restoreFn={restoreExpense}
          permanentDeleteFn={permanentDeleteExpense}
          onSuccess={() => fetchExpenses(page.current, page.size, searchText, appliedFilters.startDate, appliedFilters.endDate)}
          rowKey="id"
          columns={[
            { title: "Voucher",  dataIndex: "expenseNumber", key: "expenseNumber", width: 120, render: (v) => <span style={{ fontWeight: 600, color: "#7c5cfc" }}>{v || "-"}</span> },
            { title: "Category", dataIndex: "category",      key: "category",      width: 130, ellipsis: true },
            { title: "Supplier", dataIndex: "personSupplier",key: "personSupplier",ellipsis: true, render: (v) => v || "-" },
            { title: "Amount",   dataIndex: "amount",        key: "amount",        width: 110, render: (v) => <span style={{ fontWeight: 700, color: "#ef4444" }}>Rs {parseFloat(v || 0).toLocaleString()}</span> },
            { title: "Date",     dataIndex: "date",          key: "date",          width: 110 },
          ]}
        />
      )}
    </section>
  );
};

export default DailyExpense;
