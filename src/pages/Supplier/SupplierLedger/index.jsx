import { useEffect, useState, useCallback } from "react";
import _ from "lodash";
import { message, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { AppTable, AppButton, AppModal, PageHeader } from "@/components/common";
import { useSearch } from "@/context/SearchContext";
import { getAllVendors, normalizeVendor, deleteVendor } from "@/services/supplierService";
import { getVendorColumns } from "./columns";
import LedgerDrawer from "./LedgerDrawer";
import LedgerModal from "./LedgerModal";

const { Text } = Typography;

const SupplierLedger = () => {
  const [vendors, setVendors]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [drawerOpen, setDrawerOpen]         = useState(false);
  const [editingVendor, setEditingVendor]   = useState(null);
  const [viewVendor, setViewVendor]         = useState(null);
  const [deleteModal, setDeleteModal]       = useState({ open: false, vendor: null });
  const { searchText, setPlaceholder, clearSearch } = useSearch();
  const [page, setPage] = useState({ current: 1, size: 10, total: 0, totalPages: 0 });

  const fetchVendors = async (pageNo = 1, pageSize = 10, name = "") => {
    setLoading(true);
    try {
      const res = await getAllVendors({ page: pageNo, pageSize, name });
      setVendors((res.results || []).map(normalizeVendor));
      setPage((prev) => ({
        ...prev,
        current:    res.page       || pageNo,
        size:       res.pageSize   || pageSize,
        total:      res.count      || 0,
        totalPages: res.totalPages || 0,
      }));
    } catch {
      message.error("Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPlaceholder("Search by supplier name...");
    fetchVendors(1, page.size, "");
    return () => clearSearch();
  }, []);

  useEffect(() => {
    if (searchText !== undefined) handleSearchDebounce(searchText);
  }, [searchText]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchDebounce = useCallback(
    _.debounce((value) => {
      fetchVendors(1, page.size, value);
    }, 500),
    [page.size]
  );

  const handlePagination = (pageNo, pageSize) => {
    const size = pageSize || page.size;
    setPage((prev) => ({ ...prev, current: pageNo, size }));
    fetchVendors(pageNo, size, searchText);
  };

  const handleAdd  = () => { setEditingVendor(null); setDrawerOpen(true); };
  const handleEdit = (record) => { setEditingVendor(record); setDrawerOpen(true); };
  const handleDeleteClick = (record) => { setDeleteModal({ open: true, vendor: record }); };

  const handleDeleteConfirm = async () => {
    try {
      await deleteVendor(deleteModal.vendor.vendorId);
      message.success(`"${deleteModal.vendor.name}" deleted`);
      setDeleteModal({ open: false, vendor: null });
      fetchVendors(page.current, page.size, searchText);
    } catch {
      message.error("Failed to delete supplier");
    }
  };

  const handleDrawerSubmit = () => {
    message.success(editingVendor ? "Supplier updated" : "Supplier added");
    setDrawerOpen(false);
    fetchVendors(page.current, page.size, searchText);
  };

  const columns = getVendorColumns({
    onView:   (record) => setViewVendor(record),
    onEdit:   handleEdit,
    onDelete: handleDeleteClick,
  });

  return (
    <section>
      <PageHeader
        title="Supplier Ledger"
        subtitle="Manage your suppliers"
        extra={
          <AppButton type="primary" icon={<PlusOutlined />} onClick={handleAdd} className="btn-dark">
            Add Supplier
          </AppButton>
        }
      />

      <AppTable
        columns={columns}
        dataSource={vendors}
        loading={loading}
        scroll={{ y: "calc(100vh - 320px)" }}
        page={page}
        handlePagination={handlePagination}
      />

      <LedgerDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleDrawerSubmit}
        editingVendor={editingVendor}
      />

      <LedgerModal
        open={!!viewVendor}
        onClose={() => setViewVendor(null)}
        supplier={viewVendor}
        onUpdated={() => {
          setViewVendor(null);
          fetchVendors(page.current, page.size, searchText);
        }}
      />

      <AppModal
        title="Delete this supplier?"
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, vendor: null })}
        onSubmit={handleDeleteConfirm}
        submitText="Delete supplier"
        cancelText="Keep supplier"
        danger
        width={460}
      >
        <Text style={{ fontSize: 14, color: "#475569", lineHeight: 1.6 }}>
          This will permanently remove{" "}
          <strong style={{ color: "var(--color-text)" }}>"{deleteModal.vendor?.name}"</strong>. Are you sure?
        </Text>
      </AppModal>
    </section>
  );
};

export default SupplierLedger;
