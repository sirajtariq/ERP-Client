import { useEffect, useState, useCallback, useRef } from "react";
import _ from "lodash";
import { message, Typography } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { AppTable, AppButton, AppModal, PageHeader, FilterPanel, TrashDrawer } from "@/components/common";
import { useSearch } from "@/context/SearchContext";
import { useAuth } from "@/context/AuthContext";
import { getAllPayments, normalizePayment, deletePayment, getTrashedPayments, restorePayment } from "@/services/paymentService";
import { filterConfig } from "@/utils/filterConfig";
import { getDailyReceiveColumns } from "./columns";
import ReceiveDrawer from "./ReceiveDrawer";
import ReceiveModal from "./ReceiveModal";

const { Text } = Typography;

const DailyReceive = () => {
  const [payments, setPayments]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [drawerOpen, setDrawerOpen]         = useState(false);
  const [editingReceive, setEditingReceive] = useState(null);
  const [deleteModal, setDeleteModal]       = useState({ open: false, receive: null });
  const [trashOpen, setTrashOpen]           = useState(false);
  const [viewReceive, setViewReceive]       = useState(null);
  const [appliedFilters, setAppliedFilters] = useState({});
  const { searchText, setPlaceholder, clearSearch } = useSearch();
  const { userRole } = useAuth();
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(userRole);
  const [page, setPage] = useState({ current: 1, size: 10, total: 0, totalPages: 0 });
  const isInitialMount = useRef(true);

  const fetchPayments = async (pageNo = 1, pageSize = 10, customer = "", from = "", to = "") => {
    setLoading(true);
    try {
      const res = await getAllPayments({ page: pageNo, pageSize, customer, from, to });
      setPayments((res.results || []).map(normalizePayment));
      setPage((prev) => ({
        ...prev,
        current:    res.page        || pageNo,
        size:       res.page_size   || pageSize,
        total:      res.count       || 0,
        totalPages: res.total_pages || 0,
      }));
    } catch {
      message.error("Failed to load daily income");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPlaceholder("Search by customer name...");
    fetchPayments(1, page.size, "");
    return () => clearSearch();
  }, []);

  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    if (searchText !== undefined) handleSearchDebounce(searchText);
  }, [searchText]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchDebounce = useCallback(
    _.debounce((value) => {
      fetchPayments(1, page.size, value, appliedFilters.startDate, appliedFilters.endDate);
    }, 500),
    [page.size, appliedFilters]
  );

  const handlePagination = (pageNo, pageSize) => {
    const size = pageSize || page.size;
    setPage((prev) => ({ ...prev, current: pageNo, size }));
    fetchPayments(pageNo, size, searchText, appliedFilters.startDate, appliedFilters.endDate);
  };

  const handleApplyFilters = (filters) => {
    handleSearchDebounce.cancel();
    setAppliedFilters(filters);
    setPage((prev) => ({ ...prev, current: 1 }));
    fetchPayments(1, page.size, searchText, filters.startDate, filters.endDate);
  };

  const handleResetFilters = () => {
    handleSearchDebounce.cancel();
    setAppliedFilters({});
    setPage((prev) => ({ ...prev, current: 1 }));
    fetchPayments(1, page.size, searchText);
  };

  const handleCreate     = () => { setEditingReceive(null); setDrawerOpen(true); };
  const handleView       = (record) => { setViewReceive(record); };
  const handleEdit       = (record) => { setEditingReceive(record); setDrawerOpen(true); };
  const handleDeleteClick = (record) => { setDeleteModal({ open: true, receive: record }); };

  const handleDeleteConfirm = async () => {
    try {
      await deletePayment(deleteModal.receive.id);
      message.success(`"${deleteModal.receive.receiptNumber}" deleted`);
      setDeleteModal({ open: false, receive: null });
      fetchPayments(page.current, page.size, searchText, appliedFilters.startDate, appliedFilters.endDate);
    } catch (err) {
      message.error(err.response?.data?.detail || "Failed to delete receipt");
    }
  };

  const handleDrawerSubmit = () => {
    message.success(editingReceive ? "Receipt updated" : "Receipt saved");
    setDrawerOpen(false);
    fetchPayments(page.current, page.size, searchText, appliedFilters.startDate, appliedFilters.endDate);
  };

  const columns = getDailyReceiveColumns({
    onView:   handleView,
    onEdit:   handleEdit,
    onDelete: handleDeleteClick,
  });

  return (
    <section>
      <PageHeader
        title="Daily Income"
        subtitle="Track daily income and receipts"
        extra={
          <>
            <FilterPanel
              config={filterConfig.dailyReceive}
              values={appliedFilters}
              onApply={handleApplyFilters}
              onReset={handleResetFilters}
            />
            {isAdmin && (
              <AppButton icon={<DeleteOutlined />} onClick={() => setTrashOpen(true)} danger>
                Trash
              </AppButton>
            )}
            <AppButton type="primary" icon={<PlusOutlined />} onClick={handleCreate} className="btn-dark">
              Receive Payment
            </AppButton>
          </>
        }
      />

      <AppTable
        columns={columns}
        dataSource={payments}
        loading={loading}
        scroll={{ y: "calc(100vh - 320px)" }}
        page={page}
        handlePagination={handlePagination}
      />

      <ReceiveDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleDrawerSubmit}
        editingReceive={editingReceive}
      />

      <AppModal
        title="Delete this receipt?"
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, receive: null })}
        onSubmit={handleDeleteConfirm}
        submitText="Delete receipt"
        cancelText="Keep receipt"
        danger
        width={460}
      >
        <Text style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          This will permanently remove{" "}
          <strong style={{ color: "var(--color-text)" }}>"{deleteModal.receive?.receiptNumber}"</strong>. Are you sure?
        </Text>
      </AppModal>

      <ReceiveModal
        open={!!viewReceive}
        onClose={() => setViewReceive(null)}
        data={
          viewReceive
            ? {
                receiptNo:        viewReceive.receiptNumber  || "",
                date:             viewReceive.date           || "",
                customerName:     viewReceive.customerName   || "N/A",
                invoiceNo:        viewReceive.invoiceNumber   || "",
                amount:           viewReceive.amountReceived  || 0,
                method:           viewReceive.method         || "N/A",
                notes:            viewReceive.notes          || "",
                balanceAfter:     viewReceive.balanceAfter    || 0,
                appliedToInvoice: viewReceive.appliedToInvoice || 0,
                appliedToCredit:  viewReceive.appliedToCredit  || 0,
                appliedToAdvance: viewReceive.appliedToAdvance || 0,
              }
            : null
        }
      />

      {isAdmin && (
        <TrashDrawer
          open={trashOpen}
          onClose={() => setTrashOpen(false)}
          title="Daily Income"
          fetchFn={getTrashedPayments}
          restoreFn={restorePayment}
          onSuccess={() => fetchPayments(page.current, page.size, searchText, appliedFilters.startDate, appliedFilters.endDate)}
          rowKey="id"
          columns={[
            { title: "Receipt #", key: "rec", width: 120, render: (_, r) => <span style={{ fontWeight: 600, color: "#7c5cfc" }}>{r.receiptNumber || r.receipt_number || "-"}</span> },
            { title: "Customer",  dataIndex: "customerName", key: "customerName", ellipsis: true },
            { title: "Amount",    key: "amt", width: 110, render: (_, r) => <span style={{ fontWeight: 700, color: "#22c55e" }}>Rs {parseFloat(r.amountReceived || r.amount_received || 0).toLocaleString()}</span> },
            { title: "Method",    dataIndex: "method",       key: "method",       width: 100 },
            { title: "Date",        dataIndex: "date",           key: "date",           width: 110 },
          ]}
        />
      )}
    </section>
  );
};

export default DailyReceive;
