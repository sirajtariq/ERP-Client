import { useEffect, useState, useCallback, useRef } from "react";
import _ from "lodash";
import { message, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { AppTable, AppButton, AppModal, PageHeader, FilterPanel } from "@/components/common";
import { useSearch } from "@/context/SearchContext";
import { filterConfig } from "@/utils/filterConfig";
import { QUOTATION_STATUS_OPTIONS } from "@/constants/filterOptions";
import {
  getAllQuotations,
  getQuotationById,
  deleteQuotation,
  convertQuotationToInvoice,
  normalizeQuotation,
  normalizeQuotationDetail,
  buildCustomerDataPayload,
} from "@/services/quotationService";
import { getQuotationColumns } from "./columns";
import QuotationDrawer from "./QuotationDrawer";
import PreviewModal from "./PreviewModal";

const { Text } = Typography;

const Quotation = () => {
  const [quotations, setQuotations]         = useState([]);
  const [loading, setLoading]               = useState(true);
  const [drawerOpen, setDrawerOpen]         = useState(false);
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [viewQuotation, setViewQuotation]   = useState(null);
  const [deleteModal, setDeleteModal]       = useState({ open: false, quotation: null });
  const [deleteLoading, setDeleteLoading]   = useState(false);
  const [convertModal, setConvertModal]     = useState({ open: false, quotation: null });
  const [convertLoading, setConvertLoading] = useState(false);
  const [viewLoadingId, setViewLoadingId]   = useState(null);
  const [editLoadingId, setEditLoadingId]   = useState(null);
  const [appliedFilters, setAppliedFilters] = useState({});
  const { searchText, setPlaceholder, clearSearch } = useSearch();
  const [page, setPage] = useState({ current: 1, size: 10, total: 0, totalPages: 0 });
  const isInitialMount = useRef(true);

  const fetchQuotations = async (pageNo = 1, pageSize = 10, customerName = "", quotationNumber = "", status = "", startDate = "", endDate = "") => {
    setLoading(true);
    try {
      const res = await getAllQuotations({ page: pageNo, pageSize, customerName, quotationNumber, status, startDate, endDate });
      setQuotations((res.results || []).map(normalizeQuotation));
      setPage((prev) => ({
        ...prev,
        current: pageNo,
        size:    pageSize,
        total:   res.count || 0,
        totalPages: Math.ceil((res.count || 0) / pageSize),
      }));
    } catch {
      message.error("Failed to load quotations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPlaceholder("Search by customer name...");
    fetchQuotations(1, page.size);
    return () => clearSearch();
  }, []);

  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    if (searchText !== undefined) handleSearchDebounce(searchText);
  }, [searchText]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchDebounce = useCallback(
    _.debounce((value) => {
      fetchQuotations(1, page.size, value, appliedFilters.quotationNumber, appliedFilters.status, appliedFilters.startDate, appliedFilters.endDate);
    }, 500),
    [page.size, appliedFilters]
  );

  const handlePagination = (pageNo, pageSize) => {
    const size = pageSize || page.size;
    fetchQuotations(pageNo, size, searchText, appliedFilters.quotationNumber, appliedFilters.status, appliedFilters.startDate, appliedFilters.endDate);
  };

  const handleCreate = () => { setEditingQuotation(null); setDrawerOpen(true); };

  const handleApplyFilters = (filters) => {
    handleSearchDebounce.cancel();
    setAppliedFilters(filters);
    setPage((prev) => ({ ...prev, current: 1 }));
    fetchQuotations(1, page.size, searchText, filters.quotationNumber, filters.status, filters.startDate, filters.endDate);
  };

  const handleResetFilters = () => {
    handleSearchDebounce.cancel();
    setAppliedFilters({});
    setPage((prev) => ({ ...prev, current: 1 }));
    fetchQuotations(1, page.size, searchText);
  };

  const handleView = async (id) => {
    setViewLoadingId(id);
    try {
      const detail = await getQuotationById(id);
      setViewQuotation(normalizeQuotationDetail(detail));
    } catch {
      message.error("Failed to load quotation details");
    } finally {
      setViewLoadingId(null);
    }
  };

  const handleEdit = async (id) => {
    setEditLoadingId(id);
    try {
      const detail = await getQuotationById(id);
      setEditingQuotation(normalizeQuotationDetail(detail));
      setDrawerOpen(true);
    } catch {
      message.error("Failed to load quotation details");
    } finally {
      setEditLoadingId(null);
    }
  };

  const handleDeleteClick = (record) => setDeleteModal({ open: true, quotation: record });

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    try {
      await deleteQuotation(deleteModal.quotation.id);
      message.success(`"${deleteModal.quotation.quotationNo}" deleted`);
      setDeleteModal({ open: false, quotation: null });
      fetchQuotations(page.current, page.size, searchText, appliedFilters.quotationNumber, appliedFilters.status, appliedFilters.startDate, appliedFilters.endDate);
    } catch (err) {
      message.error(err.response?.data?.detail || "Failed to delete quotation");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleConvertClick = (record) => setConvertModal({ open: true, quotation: record });

  const handleConvertConfirm = async () => {
    setConvertLoading(true);
    try {
      const detail = await getQuotationById(convertModal.quotation.id);
      const d = normalizeQuotationDetail(detail);
      const payload = {
        customer_data: buildCustomerDataPayload(d.customer),
        date:                d.date,
        valid_days:          d.validDays,
        payment_term:        d.paymentTerm,
        discount_percentage: String(d.discountPercentage || 0),
        vat_percentage:      String(d.vatPercentage || 0),
        status:              d.status,
        items: d.items.map((item) => ({
          item_name: item.name,
          unit:      item.unit || "",
          qty:       String(item.qty),
          rate:      String(item.rate),
          discount:  String(item.discount || 0),
        })),
      };
      await convertQuotationToInvoice(convertModal.quotation.id, payload);
      message.success(`"${convertModal.quotation.quotationNo}" converted to invoice`);
      setConvertModal({ open: false, quotation: null });
      fetchQuotations(page.current, page.size, searchText, appliedFilters.quotationNumber, appliedFilters.status, appliedFilters.startDate, appliedFilters.endDate);
    } catch (err) {
      const errorMsg = err.response?.data
        ? Object.values(err.response.data).flat().join(", ")
        : err.message || "Failed to convert quotation";
      message.error(errorMsg);
    } finally {
      setConvertLoading(false);
    }
  };

  const handleDrawerSubmit = () => {
    message.success(editingQuotation ? "Quotation updated" : "Quotation created");
    setDrawerOpen(false);
    fetchQuotations(page.current, page.size, searchText, appliedFilters.quotationNumber, appliedFilters.status, appliedFilters.startDate, appliedFilters.endDate);
  };

  const columns = getQuotationColumns({
    onView:    handleView,
    onEdit:    handleEdit,
    onDelete:  handleDeleteClick,
    onConvert: handleConvertClick,
    viewLoadingId,
    editLoadingId,
    convertLoadingId: convertLoading ? convertModal.quotation?.id : null,
  });

  return (
    <section>
      <PageHeader
        title="Quotations"
        subtitle="Create and manage quotations"
        extra={
          <>
            <FilterPanel
              config={filterConfig.quotation}
              options={{ status: QUOTATION_STATUS_OPTIONS }}
              values={appliedFilters}
              onApply={handleApplyFilters}
              onReset={handleResetFilters}
            />
            <AppButton type="primary" icon={<PlusOutlined />} onClick={handleCreate} className="btn-dark">
              Create Quotation
            </AppButton>
          </>
        }
      />

      <AppTable
        columns={columns}
        dataSource={quotations}
        loading={loading}
        scroll={{ y: "calc(100vh - 320px)" }}
        page={page}
        handlePagination={handlePagination}
      />

      <QuotationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleDrawerSubmit}
        editingQuotation={editingQuotation}
      />

      <AppModal
        title="Delete this quotation?"
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, quotation: null })}
        onSubmit={handleDeleteConfirm}
        submitText="Delete quotation"
        cancelText="Keep quotation"
        loading={deleteLoading}
        danger
        width={460}
      >
        <Text style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          This will permanently remove{" "}
          <strong style={{ color: "var(--color-text)" }}>"{deleteModal.quotation?.quotationNo}"</strong>. Are you sure?
        </Text>
      </AppModal>

      <AppModal
        title="Convert to invoice?"
        open={convertModal.open}
        onClose={() => setConvertModal({ open: false, quotation: null })}
        onSubmit={handleConvertConfirm}
        submitText="Convert"
        cancelText="Cancel"
        loading={convertLoading}
        width={460}
      >
        <Text style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          This will convert{" "}
          <strong style={{ color: "var(--color-text)" }}>"{convertModal.quotation?.quotationNo}"</strong>{" "}
          into a sale invoice. This cannot be undone.
        </Text>
      </AppModal>

      <PreviewModal
        open={!!viewQuotation}
        onClose={() => setViewQuotation(null)}
        data={viewQuotation ? {
          quotationNo:     viewQuotation.quotationNo,
          customer:        viewQuotation.customer,
          date:            viewQuotation.date,
          validDays:       viewQuotation.validDays,
          validUntil:      viewQuotation.validUntil,
          validityDisplay: viewQuotation.validityDisplay,
          paymentTerm:     viewQuotation.paymentTerm,
          vatPercent:      viewQuotation.vatPercentage,
          vatAmount:       viewQuotation.vatAmount,
          discountPercent: viewQuotation.discountPercentage,
          discountAmount:  viewQuotation.discountAmount,
          status:          viewQuotation.status,
          effectiveStatus: viewQuotation.effectiveStatus,
          convertedInvoice: viewQuotation.convertedInvoice,
          items:       viewQuotation.items,
          itemsTotal:  viewQuotation.subtotal,
          grandTotal:  viewQuotation.total,
        } : null}
      />
    </section>
  );
};

export default Quotation;
