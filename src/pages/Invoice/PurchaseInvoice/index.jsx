import { useEffect, useState, useCallback } from "react";
import _ from "lodash";
import { message, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { AppTable, AppButton, AppModal, PageHeader, FilterPanel } from "@/components/common";
import { useSearch } from "@/context/SearchContext";
import { getAllPurchaseInvoices, getPurchaseInvoice, deletePurchaseInvoice, updatePurchaseInvoiceStatus, normalizePurchaseInvoice } from "@/services/purchaseInvoiceService";
import { filterConfig } from "@/utils/filterConfig";
import { PURCHASE_INVOICE_STATUS_OPTIONS, PAYMENT_TERM_OPTIONS } from "@/constants/filterOptions";
import { getPurchaseInvoiceColumns } from "./columns";
import InvoiceDrawer from "./PurchaseInvoiceDrawer";
import InvoicePreview from "./PurchaseInvoiceModal";

const { Text } = Typography;

const PurchaseInvoice = () => {
  const [invoices, setInvoices]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [drawerOpen, setDrawerOpen]         = useState(false);
  const [viewInvoice, setViewInvoice]       = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [deleteModal, setDeleteModal]       = useState({ open: false, invoice: null });
  const [deleteLoading, setDeleteLoading]   = useState(false);
  const [saveLoadingId, setSaveLoadingId]   = useState(null);
  const [appliedFilters, setAppliedFilters] = useState({});
  const { searchText, setPlaceholder, clearSearch } = useSearch();
  const [page, setPage] = useState({ current: 1, size: 10, total: 0, totalPages: 0 });

  const fetchInvoices = async (pageNo = 1, pageSize = 10, search = "", billNumber = "", status = "", paymentTerm = "", filterInvoiceNumber = "") => {
    setLoading(true);
    try {
      const res = await getAllPurchaseInvoices({ page: pageNo, pageSize, invoiceNumber: filterInvoiceNumber || search, billNumber, status, paymentTerm });
      setInvoices((res.results || []).map(normalizePurchaseInvoice));
      setPage((prev) => ({
        ...prev,
        current:    res.page      || pageNo,
        size:       res.pageSize  || pageSize,
        total:      res.count     || 0,
        totalPages: res.totalPages || 0,
      }));
    } catch {
      message.error("Failed to load purchase invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPlaceholder("Search by invoice number...");
    fetchInvoices(1, page.size, "");
    return () => clearSearch();
  }, []);

  useEffect(() => {
    if (searchText !== undefined) handleSearchDebounce(searchText);
  }, [searchText]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchDebounce = useCallback(
    _.debounce((value) => {
      fetchInvoices(1, page.size, value, appliedFilters.billNumber, appliedFilters.status, appliedFilters.paymentTerm, appliedFilters.invoiceNumber);
    }, 500),
    [page.size, appliedFilters]
  );

  const handlePagination = (pageNo, pageSize) => {
    const size = pageSize || page.size;
    setPage((prev) => ({ ...prev, current: pageNo, size }));
    fetchInvoices(pageNo, size, searchText, appliedFilters.billNumber, appliedFilters.status, appliedFilters.paymentTerm, appliedFilters.invoiceNumber);
  };

  const handleCreate = () => {
    setEditingInvoice(null);
    setDrawerOpen(true);
  };

  const handleApplyFilters = (filters) => {
    setAppliedFilters(filters);
    setPage((prev) => ({ ...prev, current: 1 }));
    fetchInvoices(1, page.size, searchText, filters.billNumber, filters.status, filters.paymentTerm, filters.invoiceNumber);
  };

  const handleResetFilters = () => {
    setAppliedFilters({});
    setPage((prev) => ({ ...prev, current: 1 }));
    fetchInvoices(1, page.size, searchText);
  };

  const handleView = async (record) => {
    const hide = message.loading("Loading invoice...", 0);
    try {
      const detail = await getPurchaseInvoice(record.id);
      setViewInvoice(detail);
    } catch {
      message.error("Failed to load invoice details");
    } finally {
      hide();
    }
  };

  const handleEdit = async (record) => {
    const hide = message.loading("Loading invoice...", 0);
    try {
      const detail = await getPurchaseInvoice(record.id);
      setEditingInvoice(detail);
      setDrawerOpen(true);
    } catch {
      message.error("Failed to load invoice details");
    } finally {
      hide();
    }
  };

  const handleDeleteClick = (record) => {
    setDeleteModal({ open: true, invoice: record });
  };

  const handleSaveDraft = async (record) => {
    setSaveLoadingId(record.id);
    try {
      await updatePurchaseInvoiceStatus(record.id, "Saved");
      message.success(`"${record.invoiceNo}" marked as Saved`);
      fetchInvoices(page.current, page.size, searchText, appliedFilters.billNumber, appliedFilters.status, appliedFilters.paymentTerm, appliedFilters.invoiceNumber);
    } catch (err) {
      message.error(err.response?.data?.detail || "Failed to update invoice status");
    } finally {
      setSaveLoadingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    try {
      await deletePurchaseInvoice(deleteModal.invoice.id);
      message.success(`"${deleteModal.invoice.invoiceNo}" deleted`);
      setDeleteModal({ open: false, invoice: null });
      fetchInvoices(page.current, page.size, searchText, appliedFilters.billNumber, appliedFilters.status, appliedFilters.paymentTerm, appliedFilters.invoiceNumber);
    } catch (err) {
      message.error(err.response?.data?.detail || "Failed to delete invoice");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDrawerSubmit = () => {
    message.success(editingInvoice ? "Invoice updated successfully" : "Invoice created successfully");
    setDrawerOpen(false);
    fetchInvoices(page.current, page.size, searchText, appliedFilters.billNumber, appliedFilters.status, appliedFilters.paymentTerm, appliedFilters.invoiceNumber);
  };

  const columns = getPurchaseInvoiceColumns({
    onView:      handleView,
    onEdit:      handleEdit,
    onDelete:    handleDeleteClick,
    onSaveDraft: handleSaveDraft,
    saveLoadingId,
  });

  return (
    <section>
      <PageHeader
        title="Purchase Invoice"
        subtitle="Create and manage purchase invoices"
        extra={
          <>
            <FilterPanel
              config={filterConfig.purchaseInvoice}
              options={{ status: PURCHASE_INVOICE_STATUS_OPTIONS, paymentTerm: PAYMENT_TERM_OPTIONS }}
              values={appliedFilters}
              onApply={handleApplyFilters}
              onReset={handleResetFilters}
            />
            <AppButton type="primary" icon={<PlusOutlined />} onClick={handleCreate} className="btn-dark">
              Create Purchase Invoice
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
        type="purchase"
      />

      <AppModal
        title="Delete this invoice?"
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, invoice: null })}
        onSubmit={handleDeleteConfirm}
        submitText="Delete invoice"
        cancelText="Keep invoice"
        loading={deleteLoading}
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
        onRefresh={() => fetchInvoices(page.current, page.size, searchText, appliedFilters.billNumber, appliedFilters.status, appliedFilters.paymentTerm, appliedFilters.invoiceNumber)}
        invoiceData={viewInvoice ? {
          id:         viewInvoice.id,
          customer: {
            vendorId: viewInvoice.vendor?.vendorId,
            name:     viewInvoice.vendor?.vendorName || "N/A",
            phone:    viewInvoice.vendor?.phone      || "",
          },
          invoiceNo:  viewInvoice.invoiceNumber || "",
          billNumber: viewInvoice.billNumber    || "",
          date:       viewInvoice.date          || "",
          items: (viewInvoice.items || []).map((item) => ({
            name:     item.productName                   || "",
            unit:     item.units                         || "",
            qty:      parseFloat(item.quantity)          || 0,
            rate:     parseFloat(item.purchasePrice)     || 0,
            discount: parseFloat(item.discount)          || 0,
            total:    parseFloat(item.total)             || 0,
          })),
          payment: {
            paidAmount:       parseFloat(viewInvoice.paidAmount)     || 0,
            method:           viewInvoice.paymentMethod              || "",
            terms:            viewInvoice.paymentTerm                || "",
            note:             viewInvoice.notes                      || "",
            vatPercentage:    viewInvoice.vatPercentage              || "",
            invoiceDiscount:  viewInvoice.invoiceDiscount            || "",
            paymentReference: viewInvoice.paymentReference           || "",
            advanceApplied:   parseFloat(viewInvoice.advanceApplied) || 0,
          },
          subtotal:          parseFloat(viewInvoice.subtotal)         || 0,
          taxAmount:         parseFloat(viewInvoice.taxAmount)        || 0,
          totalLineDiscount: parseFloat(viewInvoice.totalLineDiscount) || 0,
          paymentStatus:     viewInvoice.paymentStatus                || "",
          invoiceStatus:     viewInvoice.status                       || "",
          grandTotal: parseFloat(viewInvoice.netTotal) || 0,
          type: "purchase",
        } : null}
      />
    </section>
  );
};

export default PurchaseInvoice;
