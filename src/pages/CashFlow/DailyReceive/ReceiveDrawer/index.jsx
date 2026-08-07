import { useState, useEffect, useCallback } from "react";
import { Drawer, Row, Col, Typography, DatePicker, message } from "antd";
import { useForm, Controller } from "react-hook-form";
import dayjs from "dayjs";
import _ from "lodash";
import { AppButton, AppInput, AppSelect } from "@/components/common";
import { getAllCustomers, normalizeCustomer } from "@/services/customerService";
import { createPayment, updatePayment } from "@/services/paymentService";
import { useInfiniteScroll } from "@/hooks";
import { formatCurrency } from "@/utils";
import { receiveFormSchema } from "@/utils/validation";
import ReceiveModal from "../ReceiveModal";
import styles from "./styles.module.css";

const { Text } = Typography;

const PAGE_SIZE = 10;

const METHOD_OPTIONS = [
  { label: "Cash",          value: "cash"   },
  { label: "Bank Transfer", value: "bank"   },
  { label: "Cheque",        value: "cheque" },
  { label: "Other",         value: "other"  },
];

const ReceiveDrawer = ({ open, onClose, onSubmit, editingReceive }) => {
  const [customers, setCustomers]               = useState([]);
  const [customerPage, setCustomerPage]         = useState({ current: 0, size: PAGE_SIZE, total: 0 });
  const [customerSearch, setCustomerSearch]     = useState("");
  const [customerLoading, setCustomerLoading]   = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedInvoice, setSelectedInvoice]   = useState(null);
  const [selectedDate, setSelectedDate]         = useState(dayjs());
  const [submitting, setSubmitting]             = useState(false);
  const [previewOpen, setPreviewOpen]           = useState(false);

  const {
    control,
    handleSubmit: rhfHandleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    mode: "onTouched",
    defaultValues: { amount: 0, method: "cash", notes: "" },
  });

  const watchedValues = watch();

  useEffect(() => {
    if (open) {
      fetchCustomers(0, "");
      if (editingReceive) {
        populateFromRecord(editingReceive);
      } else {
        resetAll();
      }
    }
  }, [open]);

  const fetchCustomers = async (pageNo = 0, searchQuery = "") => {
    setCustomerLoading(true);
    try {
      const res = await getAllCustomers({ page: pageNo + 1, pageSize: PAGE_SIZE, name: searchQuery });
      const normalized = (res.results || []).map(normalizeCustomer);
      setCustomers((prev) => (pageNo === 0 ? normalized : [...prev, ...normalized]));
      setCustomerPage((prev) => ({ ...prev, current: pageNo, total: res.count || 0 }));
    } catch {
      if (pageNo === 0) setCustomers([]);
    } finally {
      setCustomerLoading(false);
    }
  };

  const populateFromRecord = (record) => {
    setSelectedCustomer({ id: record.customer, name: record.customerName, customerType: null, invoices: [] });
    setSelectedInvoice(
      record.invoice
        ? { id: record.invoice, invoiceNo: record.invoiceNumber }
        : null
    );
    setSelectedDate(record.date ? dayjs(record.date) : dayjs());
    reset({
      amount: record.amountReceived || 0,
      method: record.method?.toLowerCase() || "cash",
      notes:  record.notes || "",
    });
  };

  const resetAll = () => {
    setSelectedCustomer(null);
    setSelectedInvoice(null);
    setCustomerSearch("");
    setCustomerPage({ current: 0, size: PAGE_SIZE, total: 0 });
    setSelectedDate(dayjs());
    reset({ amount: 0, method: "cash", notes: "" });
  };

  const handleClearAll = () => {
    setSelectedCustomer(null);
    setSelectedInvoice(null);
    setCustomerSearch("");
    setCustomerPage({ current: 0, size: PAGE_SIZE, total: 0 });
    fetchCustomers(0, "");
  };

  const handleCustomerSearchDebounce = useCallback(
    _.debounce((value) => {
      setCustomerSearch(value);
      fetchCustomers(0, value);
    }, 400),
    []
  );

  const handleCustomerScroll = useInfiniteScroll({
    pageObject:    customerPage,
    fetchFunction: fetchCustomers,
    searchValue:   customerSearch,
  });

  const handleCustomerChange = (val) => {
    if (!val) {
      handleClearAll();
      return;
    }
    const cust = customers.find((c) => c.id === val);
    if (cust) {
      setSelectedCustomer(cust);
      setSelectedInvoice(null);
    }
  };

  // Flat invoice list derived from all loaded customers (no extra API)
  const allInvoices = customers.flatMap((c) =>
    (c.invoices || []).map((inv) => ({
      id:           inv.id,
      invoiceNo:    inv.invoiceNo,
      customerId:   c.id,
      customerName: c.name,
      _customer:    c,
    }))
  );

  const handleInvoiceChange = (val) => {
    if (!val) {
      setSelectedInvoice(null);
      return;
    }
    // Search across all loaded customers' embedded invoices
    const found = allInvoices.find((i) => i.id === val);
    if (found) {
      setSelectedInvoice({ id: found.id, invoiceNo: found.invoiceNo });
      // Auto-fill customer if different or not set
      if (!selectedCustomer || selectedCustomer.id !== found.customerId) {
        setSelectedCustomer(found._customer);
      }
    }
  };

  // Customer dropdown options
  const customerOptions = customers.map((c) => ({
    label: `${c.invoiceNo} - ${c.name}`,
    value: c.id,
  }));

  // Invoice dropdown options
  const invoiceOptions = (() => {
    // When customer selected → show only that customer's invoices
    const source = selectedCustomer
      ? (selectedCustomer.invoices || []).map((inv) => ({
          label: inv.invoiceNo,
          value: inv.id,
        }))
      : allInvoices.map((inv) => ({
          label: `${inv.invoiceNo} - ${inv.customerName}`,
          value: inv.id,
        }));

    // Inject pre-populated invoice (edit mode) if not in list
    if (selectedInvoice && !source.some((o) => o.value === selectedInvoice.id)) {
      return [{ label: selectedInvoice.invoiceNo, value: selectedInvoice.id }, ...source];
    }
    return source;
  })();

  const customerName = selectedCustomer?.name || "N/A";
  const methodLabel  = METHOD_OPTIONS.find((m) => m.value === watchedValues.method)?.label || watchedValues.method;
  const isWalkin     = selectedCustomer?.customerType === "walkin";
  // Invoice is only mandatory for walkin customers — permanent customers can receive
  // a payment (e.g. against their credit balance) without picking a specific invoice.
  const formIsValid  = !!selectedCustomer && (!isWalkin || !!selectedInvoice) && watchedValues.amount > 0;

  const getPreviewData = () => ({
    customerName,
    invoiceNo: selectedInvoice?.invoiceNo || "",
    amount:    watchedValues.amount,
    method:    methodLabel,
    notes:     watchedValues.notes,
  });

  const onFormSubmit = async (data) => {
    if (!selectedCustomer || (isWalkin && !selectedInvoice)) return;
    setSubmitting(true);
    try {
      const payload = {
        date:            selectedDate ? selectedDate.format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"),
        customer:        selectedCustomer.id,
        invoice:         selectedInvoice ? selectedInvoice.id : null,
        amount_received: String(data.amount),
        method:          data.method,
        notes:           data.notes || null,
      };
      if (editingReceive?.id) {
        await updatePayment(editingReceive.id, payload);
      } else {
        await createPayment(payload);
      }
      onSubmit();
      resetAll();
    } catch (err) {
      const errMsg = err.response?.data
        ? Object.values(err.response.data).flat().join(", ")
        : "Failed to save receipt";
      message.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    resetAll();
  };

  return (
    <Drawer
      title={
        <span style={{ fontWeight: 700, fontSize: 17, color: "var(--color-text)" }}>
          {editingReceive ? "Edit Receipt" : "Receive Payment"}
        </span>
      }
      open={open}
      onClose={handleClose}
      width={520}
      destroyOnClose
      styles={{
        header: { borderBottom: "1px solid #eef0f6", padding: "16px 24px" },
        body:   { padding: "20px 24px", overflowY: "auto" },
        footer: { borderTop: "1px solid #eef0f6", padding: "14px 24px" },
      }}
      footer={
        <div className={styles.drawerFooter}>
          <div style={{ flex: 1 }} />
          <AppButton type="default" onClick={() => setPreviewOpen(true)} className="btn-preview">
            Preview
          </AppButton>
          <AppButton
            type="primary"
            onClick={rhfHandleSubmit(onFormSubmit)}
            className="btn-dark"
            disabled={!formIsValid || submitting}
            loading={submitting}
          >
            {submitting ? "Saving..." : "Save Receipt"}
          </AppButton>
        </div>
      }
    >
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Receipt Details</h3>
        <div className={styles.detailsCard}>

          {/* Customer + Customer Type */}
          <Row gutter={16}>
            <Col span={14}>
              <AppSelect
                label="Customer"
                placeholder="Search or select customer"
                options={customerOptions}
                showSearch
                filterOption={false}
                loading={customerLoading}
                onSearch={handleCustomerSearchDebounce}
                onClear={() => { setCustomerSearch(""); fetchCustomers(0, ""); }}
                onPopupScroll={handleCustomerScroll}
                onChange={handleCustomerChange}
                value={selectedCustomer?.id}
                allowClear
              />
            </Col>
            <Col span={10}>
              <AppInput
                label="Customer Type"
                value={selectedCustomer?.customerType || ""}
                disabled
                onChange={() => {}}
                placeholder="—"
              />
            </Col>
          </Row>

          {/* Invoice — derived from loaded customers' embedded invoices.
              Mandatory only for walkin customers; optional for permanent customers. */}
          <AppSelect
            label={
              <span>
                Sale Invoice {isWalkin && <span style={{ color: "#ef4444" }}>*</span>}
                {!isWalkin && selectedCustomer && <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}> (optional)</span>}
              </span>
            }
            placeholder={
              selectedCustomer && invoiceOptions.length === 0
                ? "No invoices for this customer"
                : "Search or select invoice"
            }
            options={invoiceOptions}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            onChange={handleInvoiceChange}
            value={selectedInvoice?.id}
            allowClear
            status={isWalkin && !selectedInvoice && watchedValues.amount > 0 ? "error" : ""}
          />

          {/* Date */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
              Date
            </label>
            <DatePicker
              value={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              format="YYYY-MM-DD"
              style={{ width: "100%" }}
            />
          </div>

          {/* Amount + Method */}
          <Row gutter={16}>
            <Col span={12}>
              <Controller
                name="amount"
                control={control}
                rules={receiveFormSchema.amount}
                render={({ field }) => (
                  <AppInput
                    {...field}
                    inputType="number"
                    label="Amount Received"
                    name="amount"
                    placeholder="0.00"
                    min={0}
                    required
                    errors={errors}
                  />
                )}
              />
            </Col>
            <Col span={12}>
              <Controller
                name="method"
                control={control}
                rules={receiveFormSchema.method}
                render={({ field }) => (
                  <AppSelect
                    {...field}
                    label="Method"
                    name="method"
                    options={METHOD_OPTIONS}
                    required
                    errors={errors}
                  />
                )}
              />
            </Col>
          </Row>

          {/* Notes */}
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <AppInput
                {...field}
                inputType="textarea"
                label="Notes"
                name="notes"
                rows={3}
                placeholder="Add any notes (optional)"
                errors={errors}
              />
            )}
          />
        </div>
      </div>

      {watchedValues.amount > 0 && (
        <div className={styles.summaryBox}>
          <div className={styles.summaryRow}>
            <Text style={{ color: "#64748b" }}>Customer</Text>
            <Text style={{ fontWeight: 600 }}>{customerName}</Text>
          </div>
          {selectedInvoice && (
            <div className={styles.summaryRow}>
              <Text style={{ color: "#64748b" }}>Invoice</Text>
              <Text style={{ fontWeight: 600 }}>{selectedInvoice.invoiceNo}</Text>
            </div>
          )}
          <div className={styles.summaryRow}>
            <Text style={{ color: "#64748b" }}>Amount</Text>
            <Text style={{ fontWeight: 700, color: "#22c55e", fontSize: 18 }}>
              {formatCurrency(watchedValues.amount)}
            </Text>
          </div>
          <div className={styles.summaryRow}>
            <Text style={{ color: "#64748b" }}>Method</Text>
            <Text style={{ fontWeight: 600 }}>{methodLabel}</Text>
          </div>
        </div>
      )}

      <ReceiveModal open={previewOpen} onClose={() => setPreviewOpen(false)} data={getPreviewData()} />
    </Drawer>
  );
};

export default ReceiveDrawer;
