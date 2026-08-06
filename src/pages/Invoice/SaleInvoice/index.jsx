import { useEffect, useState, useCallback } from "react";
import _ from "lodash";
import { message, Typography } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
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
  const [appliedFilters, setAppliedFilters]     = useState({});
  const { searchText, setPlaceholder, clearSearch } = useSearch();
  const { userRole } = useAuth();
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(userRole);
  const [page, setPage] = useState({ current: 1, size: 10, total: 0, totalPages: 0 });

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
    setAppliedFilters(filters);
    setPage((prev) => ({ ...prev, current: 1 }));
    fetchInvoices(1, page.size, searchText, filters.invoiceNumber, filters.status, filters.startDate, filters.endDate);
  };

  const handleResetFilters = () => {
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

  const handleSaveDraft = async (record) => {
    setSaveLoadingId(record.id);
    try {
      await updateSaleInvoiceStatus(record.id, "Saved");
      message.success(`"${record.invoiceNo}" marked as Saved`);
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
          id:           viewInvoice.id,
          invoiceNo:    viewInvoice.invoiceNo,
          date:         viewInvoice.date,
          customer:     { ...viewInvoice.customerData, name: viewInvoice.customerName },
          items:        viewInvoice.items,
          payment:      { paidAmount: viewInvoice.paid, method: viewInvoice.paymentMethod, terms: viewInvoice.paymentTerm },
          grandTotal:   viewInvoice.total,
          paymentStatus: viewInvoice.paymentStatus,
          invoiceStatus: viewInvoice.invoiceStatus,
          notes:        viewInvoice.notes,
          type:         "sale",
        } : null}
        onRefresh={() => fetchInvoices(page.current, page.size, searchText, appliedFilters.invoiceNumber, appliedFilters.status, appliedFilters.startDate, appliedFilters.endDate)}
      />

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
          searchPlaceholder="Search by name..."
          showDateFilter

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
