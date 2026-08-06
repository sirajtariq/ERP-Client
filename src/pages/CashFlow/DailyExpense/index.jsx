import { useEffect, useState, useCallback } from "react";
import _ from "lodash";
import { Space, Tag, message, Typography } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import { AppTable, AppButton, AppModal, PageHeader, FilterPanel } from "@/components/common";
import { formatCurrency, formatDate } from "@/utils";
import { useSearch } from "@/context/SearchContext";
import { filterConfig } from "@/utils/filterConfig";
import { getAllExpenses, getExpenseById, deleteExpense, normalizeExpense } from "@/services/expenseService";
import ExpenseDrawer from "./ExpenseDrawer";
import ExpenseModal from "./ExpenseModal";

const { Text } = Typography;

const DailyExpense = () => {
  const [expenses, setExpenses]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [drawerOpen, setDrawerOpen]         = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteModal, setDeleteModal]       = useState({ open: false, expense: null });
  const [deleteLoading, setDeleteLoading]   = useState(false);
  const [viewExpense, setViewExpense]       = useState(null);
  const [editLoadingId, setEditLoadingId]   = useState(null);
  const [viewLoadingId, setViewLoadingId]   = useState(null);
  const [appliedFilters, setAppliedFilters] = useState({});
  const { searchText, setPlaceholder, clearSearch } = useSearch();
  const [page, setPage] = useState({ current: 1, size: 10, total: 0, totalPages: 0 });

  const fetchExpenses = async (pageNo = 1, pageSize = 10, category = "", dateFrom = "", dateTo = "") => {
    setLoading(true);
    try {
      const res = await getAllExpenses({ page: pageNo, pageSize, category, dateFrom, dateTo });
      setExpenses((res.results || []).map(normalizeExpense));
      setPage((prev) => ({
        ...prev,
        current:    res.page       || pageNo,
        size:       res.pageSize   || pageSize,
        total:      res.count      || 0,
        totalPages: res.totalPages || 0,
      }));
    } catch {
      message.error("Failed to load daily expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPlaceholder("Search by category...");
    fetchExpenses(1, page.size, "");
    return () => clearSearch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchText !== undefined) handleSearchDebounce(searchText);
  }, [searchText]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchDebounce = useCallback(
    _.debounce((value) => {
      fetchExpenses(1, page.size, value, appliedFilters.startDate, appliedFilters.endDate);
    }, 500),
    [page.size, appliedFilters]
  );

  const handlePagination = (pageNo, pageSize) => {
    const size = pageSize || page.size;
    setPage((prev) => ({ ...prev, current: pageNo, size }));
    fetchExpenses(pageNo, size, searchText, appliedFilters.startDate, appliedFilters.endDate);
  };

  const handleApplyFilters = (filters) => {
    setAppliedFilters(filters);
    setPage((prev) => ({ ...prev, current: 1 }));
    fetchExpenses(1, page.size, searchText, filters.startDate, filters.endDate);
  };

  const handleResetFilters = () => {
    setAppliedFilters({});
    setPage((prev) => ({ ...prev, current: 1 }));
    fetchExpenses(1, page.size, searchText);
  };

  const handleCreate = () => { setEditingExpense(null); setDrawerOpen(true); };

  const handleView = async (record) => {
    setViewLoadingId(record.id);
    try {
      const detail = await getExpenseById(record.id);
      setViewExpense(normalizeExpense(detail));
    } catch {
      message.error("Failed to load expense details");
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
      fetchExpenses(page.current, page.size, searchText, appliedFilters.startDate, appliedFilters.endDate);
    } catch (err) {
      message.error(err.response?.data?.detail || "Failed to delete expense");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDrawerSubmit = () => {
    message.success(editingExpense ? "Expense updated" : "Expense added");
    setDrawerOpen(false);
    fetchExpenses(page.current, page.size, searchText, appliedFilters.startDate, appliedFilters.endDate);
  };

  const columns = [
    { title: "Voucher",   dataIndex: "voucher",   key: "voucher",   width: "12%", render: (val) => <span style={{ fontWeight: 600, color: "#7c5cfc" }}>{val}</span> },
    { title: "Category",  dataIndex: "category",  key: "category",  width: "14%", render: (val) => <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600 }}>{val}</Tag> },
    { title: "Supplier",  dataIndex: "supplier",  key: "supplier",  width: "20%", ellipsis: true, render: (val) => <span style={{ fontWeight: 500 }}>{val || "-"}</span> },
    { title: "Amount",    dataIndex: "amount",    key: "amount",    width: "12%", render: (val) => <span style={{ fontWeight: 700, color: "#ef4444" }}>{formatCurrency(val || 0)}</span> },
    { title: "Paid By",   dataIndex: "paidBy",    key: "paidBy",    width: "17%", ellipsis: true, render: (val) => <span style={{ fontWeight: 500 }}>{val || "-"}</span> },
    { title: "Date",      dataIndex: "date",      key: "date",      width: "13%", render: (val) => <span style={{ color: "var(--color-text-secondary)" }}>{val ? formatDate(val) : "-"}</span> },
    {
      title: "Action", key: "actions", width: "12%",
      render: (_, record) => (
        <Space size={4}>
          <AppButton type="text" icon={<EyeOutlined />} size="small" loading={viewLoadingId === record.id} onClick={() => handleView(record)} />
          <AppButton type="text" icon={<EditOutlined />} size="small" loading={editLoadingId === record.id} onClick={() => handleEdit(record)} />
          <AppButton type="text" icon={<DeleteOutlined />} size="small" danger onClick={() => handleDeleteClick(record)} />
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
              values={appliedFilters}
              onApply={handleApplyFilters}
              onReset={handleResetFilters}
            />
            <AppButton type="primary" icon={<PlusOutlined />} onClick={handleCreate} className="btn-dark">Add Expense</AppButton>
          </>
        }
      />

      <AppTable
        columns={columns}
        dataSource={expenses}
        loading={loading}
        scroll={{ y: "calc(100vh - 320px)" }}
        page={page}
        handlePagination={handlePagination}
      />

      <ExpenseDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSubmit={handleDrawerSubmit} editingExpense={editingExpense} />

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
          totalAmount:   viewExpense?.amount        || 0,
        }}
      />
    </section>
  );
};

export default DailyExpense;
