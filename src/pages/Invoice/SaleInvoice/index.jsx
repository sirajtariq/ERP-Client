import { useEffect, useState, useCallback, useRef } from "react";
import _ from "lodash";
import { message, Typography, Modal, Input } from "antd";
import { PlusOutlined, DeleteOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { AppTable, AppButton, AppModal, PageHeader, FilterPanel, TrashDrawer } from "@/components/common";
import { useSearch } from "@/context/SearchContext";
import { useAuth } from "@/context/AuthContext";
import { getAllSaleInvoices, getSaleInvoiceById, normalizeSaleInvoice, normalizeSaleInvoiceDetail, deleteSaleInvoice, updateSaleInvoiceStatus, getTrashedSaleInvoices, restoreSaleInvoice, permanentDeleteSaleInvoice } from "@/services/saleInvoiceService";
import { filterConfig } from "@/utils/filterConfig";
import { SALE_INVOICE_STATUS_OPTIONS } from "@/constants/filterOptions";
import { getSaleInvoiceColumns } from "./columns";
import InvoiceDrawer from "./SaleInvoiceDrawer";
import InvoicePreview from "./SaleInvoiceModal";

const { Text } = Typography;

const SaleInvoice = () => {
  const [invoices, setInvoices]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [drawerOpen, setDrawerOpen]         = useState(false);
  const [viewInvoice, setViewInvoice]       = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [deleteModal, setDeleteModal]       = useState({ open: false, invoice: null });
  const [trashOpen, setTrashOpen]           = useState(false);
  const [viewLoadingId, setViewLoadingId]   = useState(null);
  const [editLoadingId, setEditLoadingId]   = useState(null);
  const [saveLoadingId, setSaveLoadingId]   = useState(null);
  const [saveModal, setSaveModal]           = useState({ open: false, record: null, amount: "" });
  const [appliedFilters, setAppliedFilters]     = useState({});
  const { searchText, setPlaceholder, clearSearch } = useSearch();
  const { userRole } = useAuth();
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(userRole);
  const [page, setPage] = useState({ current: 1, size: 10, total: 0, totalPages: 0 });
  const isInitialMount = useRef(true);

  const fetchInvoices = async (pageNo = 1, pageSize = 10, name = "", invoiceNumber = "", status = "", startDate = "", endDate = "") => {
    setLoading(true);
    try {
      const res = await getAllSaleInvoices({ page: pageNo, pageSize, name, invoiceNumber, status, startDate, endDate });
      setInvoices((res.results || []).map(normalizeSaleInvoice));
      setPage((prev) => ({
        ...prev,
        current: res.page       || pageNo,
        size:    res.page_size  || pageSize,
        total:   res.count      || 0,
        totalPages: res.total_pages || 0,
      }));
    } catch {
      message.error("Failed to load sale invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPlaceholder("Search by customer name...");
    fetchInvoices(1, page.size, "");
    return () => clearSearch();
  }, []);

  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    if (searchText !== undefined) handleSearchDebounce(searchText);
  }, [searchText]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchDebounce = useCallback(
    _.debounce((value) => {
      fetchInvoices(1, page.size, value, appliedFilters.invoiceNumber, appliedFilters.status, appliedFilters.startDate, appliedFilters.endDate);
    }, 500),
    [page.size, appliedFilters]
  );

  const handlePagination = (pageNo, pageSize) => {
    const size = pageSize || page.size;
    setPage((prev) => ({ ...prev, current: pageNo, size }));
    fetchInvoices(pageNo, size, searchText, appliedFilters.invoiceNumber, appliedFilters.status, appliedFilters.startDate, appliedFilters.endDate);
  };

  const handleCreate = () => {
    setEditingInvoice(null);
    setDrawerOpen(true);
  };

  const handleApplyFilters = (filters) => {
    handleSearchDebounce.cancel();
    setAppliedFilters(filters);
    setPage((prev) => ({ ...prev, current: 1 }));
    fetchInvoices(1, page.size, searchText, filters.invoiceNumber, filters.status, filters.startDate, filters.endDate);
  };

  const handleResetFilters = () => {
    handleSearchDebounce.cancel();
    setAppliedFilters({});
    setPage((prev) => ({ ...prev, current: 1 }));
    fetchInvoices(1, page.size, searchText);
  };

  const handleView = async (id) => {
    setViewLoadingId(id);
    try {
      const res = await getSaleInvoiceById(id);
      setViewInvoice(normalizeSaleInvoiceDetail(res));
    } catch {
      message.error("Failed to load invoice details");
    } finally {
      setViewLoadingId(null);
    }
  };

  const handleEdit = async (id) => {
    setEditLoadingId(id);
    try {
      const res = await getSaleInvoiceById(id);
      setEditingInvoice(normalizeSaleInvoiceDetail(res));
      setDrawerOpen(true);
    } catch {
      message.error("Failed to load invoice for editing");
    } finally {
      setEditLoadingId(null);
    }
  };

  const handleDeleteClick = (record) => {
    setDeleteModal({ open: true, invoice: record });
  };

  const handleSaveDraft = (record) => {
    setSaveModal({ open: true, record, amount: "" });
  };

  const handleSaveConfirm = async () => {
    const { record, amount } = saveModal;
    const entered     = parseFloat(amount) || 0;
    const pending     = record.pending ?? 0;
    const paymentTerm = entered >= pending ? "Cash" : "Credit";
    setSaveLoadingId(record.id);
    try {
      const full = await getSaleInvoiceById(record.id);
      const cd   = full.customer_data || {};
      const body = {
        invoiceStatus: "Saved",
        payment_term:  paymentTerm,
        customer_data: cd,
        items: (full.items || []).map((item) => ({
          name:      item.name      || item.itemName || "",
          units:     item.units     || item.unit     || "",
          quantity:  String(Math.max(parseFloat(item.quantity || item.qty) || 0, 0)),
          unitPrice: String(Math.max(parseFloat(item.unitPrice || item.rate) || 0, 0)),
          discount:  String(parseFloat(item.discount) || 0),
          ...(item.itemId ? { itemId: item.itemId, itemCode: item.itemCode || "" } : {}),
        })),
      };
      if (entered > 0) body.paid_amount = String(entered);
      await updateSaleInvoiceStatus(record.id, body);
      message.success(`"${record.invoiceNo}" marked as Saved`);
      setSaveModal({ open: false, record: null, amount: "" });
      fetchInvoices(page.current, page.size, searchText, appliedFilters.invoiceNumber, appliedFilters.status, appliedFilters.startDate, appliedFilters.endDate);
    } catch (err) {
      message.error(err.response?.data?.detail || "Failed to update invoice status");
    } finally {
      setSaveLoadingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteSaleInvoice(deleteModal.invoice.id);
      message.success(`"${deleteModal.invoice.invoiceNo}" deleted`);
      setDeleteModal({ open: false, invoice: null });
      fetchInvoices(page.current, page.size, searchText, appliedFilters.invoiceNumber, appliedFilters.status, appliedFilters.startDate, appliedFilters.endDate);
    } catch (err) {
      message.error(err.response?.data?.detail || "Failed to delete invoice");
    }
  };

  const handleDrawerSubmit = () => {
    message.success(editingInvoice ? "Invoice updated successfully" : "Invoice created successfully");
    setDrawerOpen(false);
    fetchInvoices(page.current, page.size, searchText, appliedFilters.invoiceNumber, appliedFilters.status, appliedFilters.startDate, appliedFilters.endDate);
  };

  const columns = getSaleInvoiceColumns({
    onView:        handleView,
    onEdit:        handleEdit,
    onDelete:      handleDeleteClick,
    onSaveDraft:   handleSaveDraft,
    viewLoadingId,
    editLoadingId,
    saveLoadingId,
  });

  return (
    <section>
      <PageHeader
        title="Sale Invoice"
        subtitle="Create and manage sale invoices"
        extra={
          <>
            <FilterPanel
              config={filterConfig.saleInvoice}
              options={{ status: SALE_INVOICE_STATUS_OPTIONS }}
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
              Create Sale Invoice
            </AppButton>
          </>
        }
      />

      <AppTable
        columns={columns}
        dataSource={invoices}
        loading={loading}
        scroll={{ y: "calc(100vh - 320px)" }}
        page={page}
        handlePagination={handlePagination}
      />

      <InvoiceDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleDrawerSubmit}
        editingInvoice={editingInvoice}

      />

      <AppModal
        title="Delete this invoice?"
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, invoice: null })}
        onSubmit={handleDeleteConfirm}
        submitText="Delete invoice"
        cancelText="Keep invoice"
        danger
        width={460}
      >
        <Text style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          This will permanently remove{" "}
          <strong style={{ color: "var(--color-text)" }}>"{deleteModal.invoice?.invoiceNo}"</strong>{" "}
          and all associated data. Are you sure?
        </Text>
      </AppModal>

      <InvoicePreview
        open={!!viewInvoice}
        onClose={() => setViewInvoice(null)}
        invoiceData={viewInvoice ? {
          id:                   viewInvoice.id,
          invoiceNo:            viewInvoice.invoiceNo,
          date:                 viewInvoice.date,
          customer:             { ...viewInvoice.customerData, name: viewInvoice.customerName },
          items:                viewInvoice.items,
          payment: {
            paidAmount:       viewInvoice.paid,
            method:           viewInvoice.paymentMethod,
            terms:            viewInvoice.paymentTerm,
            advanceApplied:   viewInvoice.advanceApplied,
            vatPercentage:    viewInvoice.vatPercentage,
            paymentReference: viewInvoice.paymentReference,
            invoiceDiscount:  viewInvoice.invoiceDiscount,
          },
          pending:              viewInvoice.pending,
          grandTotal:           viewInvoice.total,
          subtotal:             viewInvoice.subtotal,
          taxAmount:            viewInvoice.taxAmount,
          totalLineDiscount:    viewInvoice.totalLineDiscount,
          paymentStatus:        viewInvoice.paymentStatus,
          invoiceStatus:        viewInvoice.invoiceStatus,
          notes:                viewInvoice.notes,
          returnedItemsCount:   viewInvoice.returnedItemsCount,
          totalReturnedAmount:  viewInvoice.totalReturnedAmount,
          netTotalAfterReturns: viewInvoice.netTotalAfterReturns,
          type:                 "sale",
        } : null}
        onRefresh={() => fetchInvoices(page.current, page.size, searchText, appliedFilters.invoiceNumber, appliedFilters.status, appliedFilters.startDate, appliedFilters.endDate)}
      />

      {/* Mark as Saved modal */}
      {saveModal.open && (() => {
        const rec       = saveModal.record;
        const isWalkin  = rec?.customerType === "walkin";
        const pending   = rec?.pending ?? 0;
        const entered   = parseFloat(saveModal.amount) || 0;
        const canSave   = isWalkin ? entered >= pending : true;
        return (
          <Modal
            open
            onCancel={() => setSaveModal({ open: false, record: null, amount: "" })}
            footer={null}
            width={420}
            centered
            destroyOnClose
            title={
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircleOutlined style={{ color: "#22c55e" }} />
                Mark as Saved
              </span>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "8px 0" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 2 }}>Invoice</div>
                  <div style={{ fontWeight: 700, color: "#7c5cfc" }}>{rec.invoiceNo}</div>
                </div>
                <div style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 2 }}>Customer</div>
                  <div style={{ fontWeight: 700, color: "var(--color-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rec.customerName}</div>
                </div>
              </div>

              <div style={{ background: pending > 0 ? "rgba(239,68,68,0.06)" : "rgba(34,197,94,0.06)", border: `1px solid ${pending > 0 ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`, borderRadius: 8, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 600 }}>Pending Amount</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: pending > 0 ? "#ef4444" : "#22c55e" }}>
                  Rs {pending.toLocaleString("en-PK", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", marginBottom: 6 }}>
                  Amount Paid{isWalkin ? <span style={{ color: "#ef4444" }}> *</span> : <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: 12 }}> (optional)</span>}
                </div>
                <Input
                  type="number"
                  min={0}
                  placeholder={isWalkin ? `Enter ${pending.toFixed(2)} to save` : "Enter amount (optional)"}
                  value={saveModal.amount}
                  onChange={(e) => setSaveModal((prev) => ({ ...prev, amount: e.target.value }))}
                  prefix="Rs"
                  size="large"
                  style={{ borderRadius: 8 }}
                  status={isWalkin && saveModal.amount !== "" && entered < pending ? "error" : ""}
                />
                {isWalkin && saveModal.amount !== "" && entered < pending && (
                  <div style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>
                    Walk-in customer must pay the full pending amount to save.
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  onClick={() => setSaveModal({ open: false, record: null, amount: "" })}
                  style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid var(--color-border)", background: "transparent", color: "var(--color-text)", cursor: "pointer", fontWeight: 600, fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveConfirm}
                  disabled={!canSave || saveLoadingId === rec.id}
                  style={{
                    padding: "8px 22px", borderRadius: 8, border: "none",
                    background: canSave ? "linear-gradient(135deg, #22c55e, #16a34a)" : "#cbd5e1",
                    color: "#fff", cursor: canSave ? "pointer" : "not-allowed",
                    fontWeight: 700, fontSize: 13,
                    opacity: saveLoadingId === rec.id ? 0.7 : 1,
                  }}
                >
                  {saveLoadingId === rec.id ? "Saving…" : "Mark as Saved"}
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {isAdmin && (
        <TrashDrawer
          open={trashOpen}
          onClose={() => setTrashOpen(false)}
          title="Sale Invoices"
          fetchFn={getTrashedSaleInvoices}
          restoreFn={restoreSaleInvoice}
          permanentDeleteFn={permanentDeleteSaleInvoice}
          onSuccess={() => fetchInvoices(page.current, page.size, searchText, appliedFilters.invoiceNumber, appliedFilters.status, appliedFilters.startDate, appliedFilters.endDate)}
          rowKey="id"
          columns={[
            { title: "Invoice #", key: "inv", width: 130, render: (_, r) => <span style={{ fontWeight: 600, color: "#7c5cfc" }}>{r.invoiceNumber || r.invoice_number || "-"}</span> },
            { title: "Customer",  key: "cust", ellipsis: true, render: (_, r) => (r.customerData || r.customer_data)?.customerName || r.customerName || "-" },
            { title: "Total",     key: "tot",  width: 120, render: (_, r) => <span style={{ fontWeight: 700 }}>Rs {parseFloat(r.netTotal || r.net_total || 0).toLocaleString()}</span> },
            { title: "Date",      dataIndex: "date",          key: "date",          width: 110 },
            { title: "Status",    dataIndex: "invoiceStatus", key: "invoiceStatus", width: 100 },
          ]}
        />
      )}

    </section>
  );
};

export default SaleInvoice;
