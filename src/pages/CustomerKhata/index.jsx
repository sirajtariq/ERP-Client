import { useEffect, useState, useCallback } from "react";
import _ from "lodash";
import { message, Typography } from "antd";
import { useForm, Controller } from "react-hook-form";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import {
  AppTable,
  AppButton,
  AppInput,
  AppDrawer,
  AppModal,
  PageHeader,
  FilterPanel,
  TrashDrawer,
} from "@/components/common";
import { getAllCustomers, createCustomer, updateCustomer, deleteCustomer, normalizeCustomer, getTrashedCustomers, restoreCustomer, permanentDeleteCustomer, convertCustomerToPermanent } from "@/services/customerService";
import { customerFormSchema } from "@/utils/validation";
import { useSearch } from "@/context/SearchContext";
import { useAuth } from "@/context/AuthContext";
import { filterConfig } from "@/utils/filterConfig";
import { CUSTOMER_TYPE_OPTIONS } from "@/constants/filterOptions";
import { getCustomerColumns } from "./columns";
import CustomerLedger from "./CustomerLedger";
import PrintLedger from "./PrintLedger";

const { Text } = Typography;

const CustomerKhata = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, customer: null });
  const [trashOpen, setTrashOpen]     = useState(false);
  const [ledgerCustomer, setLedgerCustomer] = useState(null);
  const [printCustomer, setPrintCustomer] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({});
  const { searchText, setPlaceholder, clearSearch } = useSearch();
  const { userRole } = useAuth();
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(userRole);

  // Pagination: API uses 1-based page numbers
  const [page, setPage] = useState({ current: 1, size: 10, total: 0, totalPages: 0 });

  const {
    control,
    handleSubmit: rhfHandleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm({
    mode: "onTouched",
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      taxNumber: "",
      openingCredit: "",
      openingNote: "",
    },
  });

  const fetchCustomers = async (pageNo = page.current, pageSize = page.size, name = "", customerType = "permanent") => {
    setLoading(true);
    try {
      const response = await getAllCustomers({ page: pageNo, pageSize, name, type: customerType || "permanent" });
      const normalized = (response.results || []).map(normalizeCustomer);
      setCustomers(normalized);
      setPage((prev) => ({
        ...prev,
        current: response.page || pageNo,
        size: response.page_size || pageSize,
        total: response.count || 0,
        totalPages: response.total_pages || 0,
      }));
    } catch (err) {
      message.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPlaceholder("Search by name...");
    fetchCustomers(1, page.size, "");
    return () => clearSearch();
  }, []);

  // Trigger debounced search when header searchText changes
  useEffect(() => {
    if (searchText !== undefined) {
      handleSearchDebounce(searchText);
    }
  }, [searchText]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = () => {
    setEditingCustomer(null);
    reset({ name: "", phone: "", email: "", address: "", taxNumber: "", openingCredit: "", openingNote: "" });
    setDrawerOpen(true);
  };

  const handleEdit = (record) => {
    setEditingCustomer(record);
    reset({
      name:          record.name || "",
      phone:         record.phone || "",
      email:         record.email || "",
      address:       record.address || "",
      taxNumber:     record.taxNumber || "",
      openingCredit: record.openingCredit || "",
      openingNote:   record.openingNote || "",
    });
    setDrawerOpen(true);
  };

  const handleDeleteClick = (record) => {
    setDeleteModal({ open: true, customer: record });
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteCustomer(deleteModal.customer.customerId);
      message.success(`"${deleteModal.customer.name}" deleted successfully`);
      setDeleteModal({ open: false, customer: null });
      fetchCustomers(page.current, page.size, searchText, appliedFilters.customerType);
    } catch (err) {
      message.error(err.response?.data?.detail || "Failed to delete customer");
    }
  };

  const onFormSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        customerName:  values.name,
        customerType:  "permanent",
        Phone:         values.phone || null,
        email:         values.email || null,
        Address:       values.address,
        openingCredit: values.openingCredit ? String(values.openingCredit) : null,
        openingNote:   values.openingNote || "",
        taxNumber:     values.taxNumber || null,
      };

      if (editingCustomer) {
        await updateCustomer(editingCustomer.customerId, payload);
        message.success(`"${values.name}" updated successfully`);
      } else {
        await createCustomer(payload);
        message.success(`"${values.name}" added successfully`);
      }
      setDrawerOpen(false);
      reset();
      fetchCustomers(page.current, page.size, searchText, appliedFilters.customerType);
    } catch (err) {
      const errorMsg = err.response?.data
        ? Object.values(err.response.data).flat().join(", ")
        : err.message || "Something went wrong";
      if (errorMsg) message.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    reset();
  };

  const columns = getCustomerColumns({
    onView: (record) => setLedgerCustomer(record),
    onEdit: handleEdit,
    onDelete: handleDeleteClick,
  });

  // Debounced search — resets to page 1 on new search
  const handleSearchDebounce = useCallback(
    _.debounce((searchValue) => {
      fetchCustomers(1, page.size, searchValue, appliedFilters.customerType);
    }, 500),
    [page.size, appliedFilters]
  );

  // Pagination handler — converts 1-based page number to API call
  const handlePagination = (pageNo, pageSize) => {
    const size = pageSize || page.size;
    setPage((prev) => ({ ...prev, current: pageNo, size }));
    fetchCustomers(pageNo, size, searchText, appliedFilters.customerType);
  };

  const handleApplyFilters = (filters) => {
    setAppliedFilters(filters);
    setPage((prev) => ({ ...prev, current: 1 }));
    fetchCustomers(1, page.size, searchText, filters.customerType);
  };

  const handleResetFilters = () => {
    setAppliedFilters({});
    setPage((prev) => ({ ...prev, current: 1 }));
    fetchCustomers(1, page.size, searchText, "permanent");
  };

  const isWalkinFilter = appliedFilters.customerType === "walkin";

  return (
    <section>
      <PageHeader
        title={isWalkinFilter ? "Walkin Customers" : "Permanent Customers"}
        subtitle={isWalkinFilter ? "Manage your walkin customers and their accounts" : "Manage your permanent customers and their accounts"}
        extra={
          <>
            <FilterPanel
              config={filterConfig.customers}
              options={{ customerType: CUSTOMER_TYPE_OPTIONS }}
              values={appliedFilters}
              onApply={handleApplyFilters}
              onReset={handleResetFilters}
            />
            {isAdmin && (
              <AppButton icon={<DeleteOutlined />} onClick={() => setTrashOpen(true)} danger>
                Trash
              </AppButton>
            )}
            <AppButton type="primary" icon={<PlusOutlined />} onClick={handleAdd} className="btn-dark">
              Add Customer
            </AppButton>
          </>
        }
      />

      <AppTable
        columns={columns}
        dataSource={customers}
        loading={loading}
        scroll={{ y: "calc(100vh - 340px)" }}
        page={page}
        handlePagination={handlePagination}
      />

      <AppDrawer
        title={editingCustomer ? "Edit Customer" : "Add Customer"}
        open={drawerOpen}
        onClose={handleDrawerClose}
        onSubmit={rhfHandleSubmit(onFormSubmit)}
        submitText={editingCustomer ? (submitting ? "Updating..." : "Update") : (submitting ? "Creating..." : "Create")}
        submitDisabled={!isValid || submitting}
        loading={submitting}
      >
        <Controller
          name="name"
          control={control}
          rules={customerFormSchema.name}
          render={({ field }) => (
            <AppInput {...field} label="Customer Name" name="name" placeholder="Enter customer name" required errors={errors} />
          )}
        />
        <Controller
          name="phone"
          control={control}
          render={({ field }) => (
            <AppInput {...field} label="Phone" name="phone" placeholder="e.g. 0301-1234567" errors={errors} />
          )}
        />
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <AppInput {...field} label="Email" name="email" placeholder="Enter email (optional)" errors={errors} />
          )}
        />
        <Controller
          name="address"
          control={control}
          rules={customerFormSchema.address}
          render={({ field }) => (
            <AppInput {...field} inputType="textarea" label="Address" name="address" placeholder="Enter address" required rows={2} errors={errors} />
          )}
        />
        <Controller
          name="taxNumber"
          control={control}
          render={({ field }) => (
            <AppInput {...field} label="Tax Number (NTN/STRN)" name="taxNumber" placeholder="Enter tax number (optional)" errors={errors} />
          )}
        />
        <Controller
          name="openingCredit"
          control={control}
          render={({ field }) => (
            <AppInput {...field} inputType="number" label="Opening Credits" name="openingCredit" placeholder="0.00" errors={errors} min={0} />
          )}
        />
        <Controller
          name="openingNote"
          control={control}
          render={({ field }) => (
            <AppInput {...field} inputType="textarea" label="Opening Note" name="openingNote" placeholder="Add a note (optional)" rows={2} errors={errors} />
          )}
        />
      </AppDrawer>

      <AppModal
        title="Delete this customer?"
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, customer: null })}
        onSubmit={handleDeleteConfirm}
        submitText="Delete customer"
        cancelText="Keep customer"
        danger
        width={460}
      >
        <Text style={{ fontSize: 14, color: "#475569", lineHeight: 1.6 }}>
          This will permanently remove <strong style={{ color: "var(--color-text)" }}>"{deleteModal.customer?.name}"</strong> and
          all associated data. Are you sure you want to continue?
        </Text>
      </AppModal>

      <CustomerLedger
        open={!!ledgerCustomer}
        onClose={() => setLedgerCustomer(null)}
        customer={ledgerCustomer}
        onPrint={(data) => { setPrintCustomer({ ...ledgerCustomer, ...data }); setLedgerCustomer(null); }}
      />

      <PrintLedger
        open={!!printCustomer}
        onClose={() => setPrintCustomer(null)}
        customer={printCustomer}
      />

      {isAdmin && (
        <TrashDrawer
          open={trashOpen}
          onClose={() => setTrashOpen(false)}
          title="Customers"
          fetchFn={getTrashedCustomers}
          restoreFn={restoreCustomer}
          permanentDeleteFn={permanentDeleteCustomer}
          convertFn={convertCustomerToPermanent}
          onSuccess={() => fetchCustomers(page.current, page.size, searchText)}
          rowKey="customerId"
          searchPlaceholder="Search by name..."

          columns={[
            { title: "ID",    dataIndex: "customerId", key: "customerId", width: 80,  render: (v) => <span style={{ fontWeight: 600, color: "#7c5cfc" }}>{v}</span> },
            { title: "Name",  dataIndex: "customerName", key: "customerName", ellipsis: true, render: (v) => <span style={{ fontWeight: 600 }}>{v || "-"}</span> },
            { title: "Type",  dataIndex: "customerType", key: "customerType", width: 100, render: (v) => v ? <span style={{ textTransform: "capitalize" }}>{v}</span> : "-" },
            { title: "Phone", dataIndex: "Phone", key: "phone", width: 130 },
          ]}
        />
      )}
    </section>
  );
};

export default CustomerKhata;
