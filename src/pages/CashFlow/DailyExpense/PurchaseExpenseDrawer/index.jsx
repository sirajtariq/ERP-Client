import { useState, useCallback, useEffect } from "react";
import { Drawer, Row, Col, Select, DatePicker, message } from "antd";
import { useForm, Controller } from "react-hook-form";
import _ from "lodash";
import dayjs from "dayjs";
import { AppButton, AppInput, AppSelect } from "@/components/common";
import { getAllVendors, normalizeVendor, createVendorPayment } from "@/services/supplierService";
import { useInfiniteScroll } from "@/hooks";

const PAGE_SIZE = 10;

const PAYMENT_METHODS = [
  { label: "Cash",          value: "Cash" },
  { label: "Bank Transfer", value: "Bank Transfer" },
  { label: "Cheque",        value: "Cheque" },
  { label: "Other",         value: "Other" },
];

const ReadOnlyField = ({ label, value }) => (
  <section style={{ marginBottom: 12 }}>
    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>
      {label}
    </label>
    <div style={{
      padding: "7px 11px",
      background: "var(--color-bg-secondary, #f0f0f0)",
      border: "1px solid var(--color-border-light)",
      borderRadius: 8,
      fontSize: 13,
      color: value ? "var(--color-text)" : "var(--color-text-secondary)",
      minHeight: 34,
    }}>
      {value || "—"}
    </div>
  </section>
);

const PurchaseExpenseDrawer = ({ open, onClose, onSubmit, initialVendors = [], initialVendorTotal = 0 }) => {
  const [vendors, setVendors]               = useState(initialVendors);
  const [vendorPage, setVendorPage]         = useState({ current: 0, size: PAGE_SIZE, total: initialVendorTotal });
  const [vendorSearch, setVendorSearch]     = useState("");
  const [vendorLoading, setVendorLoading]   = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [submitting, setSubmitting]         = useState(false);

  useEffect(() => {
    if (open) {
      setVendors(initialVendors);
      setVendorPage({ current: 0, size: PAGE_SIZE, total: initialVendorTotal });
      setVendorSearch("");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const { control, handleSubmit: rhfSubmit, reset, formState: { errors } } = useForm({
    mode: "onTouched",
    defaultValues: { payAmount: "", note: "", invoice: null, date: dayjs(), method: "Cash" },
  });

  const fetchVendors = async (pageNo = 0, searchQuery = "") => {
    setVendorLoading(true);
    try {
      const res = await getAllVendors({ page: pageNo + 1, pageSize: PAGE_SIZE, name: searchQuery });
      const normalized = (res.results || []).map(normalizeVendor);
      setVendors((prev) => (pageNo === 0 ? normalized : [...prev, ...normalized]));
      setVendorPage((prev) => ({ ...prev, current: pageNo, total: res.count || 0 }));
    } catch {
      if (pageNo === 0) setVendors([]);
    } finally {
      setVendorLoading(false);
    }
  };

  const handleVendorSearchDebounce = useCallback(
    _.debounce((value) => {
      setVendorSearch(value);
      fetchVendors(0, value);
    }, 400),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleVendorScroll = useInfiniteScroll({
    pageObject:    vendorPage,
    fetchFunction: fetchVendors,
    searchValue:   vendorSearch,
  });

  const handleVendorSelect = (_, option) => {
    setSelectedVendor(option.vendor);
    reset((v) => ({ ...v, invoice: null }));
  };

  const handleVendorClear = () => {
    setSelectedVendor(null);
    reset((v) => ({ ...v, invoice: null }));
    setVendorSearch("");
    setVendorPage({ current: 0, size: PAGE_SIZE, total: 0 });
    fetchVendors(0, "");
  };

  const resetAll = () => {
    reset({ payAmount: "", note: "", invoice: null, date: dayjs(), method: "Cash" });
    setSelectedVendor(null);
    setVendors([]);
    setVendorSearch("");
    setVendorPage({ current: 0, size: PAGE_SIZE, total: 0 });
  };

  const onFormSubmit = async (data) => {
    if (!selectedVendor) {
      message.warning("Please select a supplier");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        vendor: {
          id:         selectedVendor.id,
          vendorName: selectedVendor.name,
          phone:      selectedVendor.phone || "",
        },
        invoice:    data.invoice || null,
        amountPaid: parseFloat(data.payAmount),
        method:     data.method,
        date:       data.date ? data.date.format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"),
        notes:      data.note || "",
      };
      await createVendorPayment(payload);
      message.success("Purchase expense saved");
      onSubmit?.();
      resetAll();
    } catch (err) {
      const msg = err.response?.data
        ? Object.values(err.response.data).flat().join(", ")
        : err.message || "Failed to save";
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      title={<span style={{ fontWeight: 700, fontSize: 17, color: "var(--color-text)" }}>Add Purchase Expense</span>}
      open={open}
      onClose={() => { onClose(); resetAll(); }}
      width={520}
      destroyOnClose
      styles={{
        header: { borderBottom: "1px solid var(--color-border-light)", padding: "16px 24px" },
        body:   { padding: 0, display: "flex", flexDirection: "column", overflow: "hidden" },
        footer: { borderTop: "1px solid var(--color-border-light)", padding: "14px 24px" },
      }}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <AppButton type="default" onClick={() => { onClose(); resetAll(); }}>Cancel</AppButton>
          <AppButton type="primary" className="btn-dark" loading={submitting} onClick={rhfSubmit(onFormSubmit)}>
            Save
          </AppButton>
        </div>
      }
    >
      <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>

        {/* Vendor search */}
        <section style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", display: "block", marginBottom: 6 }}>
            Select Vendor
          </label>
          <Select
            showSearch
            allowClear
            placeholder="Search supplier by name..."
            filterOption={false}
            loading={vendorLoading}
            onSearch={handleVendorSearchDebounce}
            onPopupScroll={handleVendorScroll}
            onSelect={handleVendorSelect}
            onClear={handleVendorClear}
            options={vendors.map((v) => ({ label: v.name, value: v.id, vendor: v }))}
            style={{ width: "100%" }}
          />
        </section>

        {/* Read-only supplier info */}
        <section style={{
          background: "var(--color-bg-card, #fafafa)",
          border: "1px solid var(--color-border-light)",
          borderRadius: 10,
          padding: "16px",
          marginBottom: 24,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.6px" }}>
            Vendor Info
          </p>
          <Row gutter={16}>
            <Col span={12}><ReadOnlyField label="Vendor Name" value={selectedVendor?.name} /></Col>
            <Col span={12}><ReadOnlyField label="Code"          value={selectedVendor?.code} /></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><ReadOnlyField label="Phone" value={selectedVendor?.phone} /></Col>
            <Col span={12}>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <section style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>
                      Date
                    </label>
                    <DatePicker {...field} format="DD MMM YYYY" style={{ width: "100%", height: 34 }} allowClear={false} />
                  </section>
                )}
              />
            </Col>
          </Row>
        </section>

        {/* Payment details */}
        <section>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.6px" }}>
            Payment Details
          </p>

          <Row gutter={16}>
            <Col span={12}>
              <Controller
                name="payAmount"
                control={control}
                rules={{ required: "Pay amount is required" }}
                render={({ field }) => (
                  <AppInput
                    {...field}
                    inputType="number"
                    label="Pay Amount"
                    name="payAmount"
                    placeholder="0.00"
                    required
                    errors={errors}
                    min={0}
                  />
                )}
              />
            </Col>
            <Col span={12}>
              <Controller
                name="method"
                control={control}
                rules={{ required: "Method is required" }}
                render={({ field }) => (
                  <AppSelect
                    {...field}
                    label="Method"
                    name="method"
                    options={PAYMENT_METHODS}
                    required
                    errors={errors}
                  />
                )}
              />
            </Col>
          </Row>

          <Controller
            name="invoice"
            control={control}
            render={({ field }) => (
              <AppSelect
                {...field}
                label="Invoice (Optional)"
                name="invoice"
                placeholder={selectedVendor ? "Select invoice..." : "Select a supplier first"}
                disabled={!selectedVendor}
                options={(selectedVendor?.invoices || []).map((inv) => ({
                  label: `${inv.invoiceNumber} — Rs ${parseFloat(inv.balanceDue).toLocaleString()} due`,
                  value: inv.invoiceNumber,
                }))}
                errors={errors}
                allowClear
              />
            )}
          />

          <Controller
            name="note"
            control={control}
            render={({ field }) => (
              <AppInput
                {...field}
                inputType="textarea"
                label="Note (Optional)"
                name="note"
                placeholder="Add a note..."
                rows={3}
                errors={errors}
              />
            )}
          />
        </section>

      </div>
    </Drawer>
  );
};

export default PurchaseExpenseDrawer;
