import { useState, useEffect, useCallback } from "react";
import { Drawer, Steps, DatePicker, Row, Col, Typography, message } from "antd";
import { useForm, Controller } from "react-hook-form";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import _ from "lodash";
import dayjs from "dayjs";
import { AppButton, AppInput, AppSelect } from "@/components/common";
import { getAllCustomers, normalizeCustomer } from "@/services/customerService";
import { createQuotation, updateQuotation, buildCustomerDataPayload } from "@/services/quotationService";
import { useInfiniteScroll } from "@/hooks";
import { formatCurrency } from "@/utils";
import { QUOTATION_STATUS_OPTIONS, QUOTATION_PAYMENT_TERM_OPTIONS } from "@/constants/filterOptions";
import { isQuotationStep1Valid, isQuotationStep2Valid } from "@/utils/validation";
import PreviewModal from "../PreviewModal";
import styles from "./styles.module.css";

const { Text } = Typography;

const PAGE_SIZE = 10;

const STEPS = [
  { title: "Details" },
  { title: "Items" },
];

const QuotationDrawer = ({ open, onClose, onSubmit, editingQuotation }) => {
  const [current, setCurrent]                 = useState(0);
  const [customers, setCustomers]             = useState([]);
  const [customerPage, setCustomerPage]       = useState({ current: 0, size: PAGE_SIZE, total: 0 });
  const [customerSearch, setCustomerSearch]   = useState("");
  const [customerLoading, setCustomerLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isNewCustomer, setIsNewCustomer]     = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [items, setItems]                     = useState([{ id: 1, name: "", unit: "NOS", qty: 0, rate: 0, discount: 0, total: 0 }]);
  const [previewOpen, setPreviewOpen]         = useState(false);
  const [submitting, setSubmitting]           = useState(false);

  const { control, reset: resetForm, watch, setValue, formState: { errors } } = useForm({
    mode: "onTouched",
    defaultValues: {
      date: dayjs(), validDays: "", phone: "",
      paymentTerm: "cash", discountPercentage: "", vatPercentage: "", status: "draft",
    },
  });

  const formValues = watch();

  useEffect(() => {
    if (open) {
      fetchCustomers(0, "");
      if (editingQuotation) {
        populateFromQuotation(editingQuotation);
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

  const populateFromQuotation = (quotation) => {
    setCurrent(0);
    setIsNewCustomer(false);
    setNewCustomerName("");
    setCustomerSearch("");

    // customer_data is a stored snapshot, not a live customer record — its customer_id
    // is the business code, so re-use it as the Select's `id` too (same fallback the
    // Purchase Invoice drawer uses for vendor snapshots).
    const cd = quotation.customer || {};
    if (cd.customerId) {
      const custObj = { id: cd.customerId, customerId: cd.customerId, name: cd.name || "", phone: cd.phone || "", customerType: cd.customerType || "" };
      setSelectedCustomer(custObj);
      setCustomers((prev) => [custObj, ...prev.filter((c) => c.id !== custObj.id)]);
    } else {
      setSelectedCustomer(null);
      setNewCustomerName(cd.name || "");
    }

    setItems(
      (quotation.items || []).map((item) => ({
        id:       item.id       || Date.now(),
        name:     item.name     || "",
        unit:     item.unit     || "NOS",
        qty:      item.qty      || 0,
        rate:     item.rate     || 0,
        discount: item.discount || 0,
        total:    item.total    || 0,
      }))
    );

    resetForm({
      date:               quotation.date ? dayjs(quotation.date) : dayjs(),
      validDays:          quotation.validDays ?? "",
      phone:              cd.phone || "",
      paymentTerm:        quotation.paymentTerm || "cash",
      discountPercentage: quotation.discountPercentage || "",
      vatPercentage:      quotation.vatPercentage || "",
      status:             quotation.status || "draft",
    });
  };

  const handleCustomerSearchDebounce = useCallback(
    _.debounce((value) => {
      setCustomerSearch(value);
      fetchCustomers(0, value);
    }, 400),
    []
  );

  const handleCustomerScroll = useInfiniteScroll({
    pageObject: customerPage,
    fetchFunction: fetchCustomers,
    searchValue: customerSearch,
  });

  const resetAll = () => {
    setCurrent(0);
    setSelectedCustomer(null);
    setIsNewCustomer(false);
    setNewCustomerName("");
    setCustomerSearch("");
    setCustomerPage({ current: 0, size: PAGE_SIZE, total: 0 });
    resetForm({ date: dayjs(), validDays: "", phone: "", paymentTerm: "cash", discountPercentage: "", vatPercentage: "", status: "draft" });
    setItems([{ id: 1, name: "", unit: "NOS", qty: 0, rate: 0, discount: 0, total: 0 }]);
  };

  const handleCustomerSelect = (customerId) => {
    const cust = customers.find((c) => c.id === customerId);
    if (cust) {
      setSelectedCustomer(cust);
      setIsNewCustomer(false);
      setNewCustomerName("");
      setValue("phone", cust.phone || "");
    }
  };

  const handleNewCustomerToggle = () => {
    setIsNewCustomer(!isNewCustomer);
    setSelectedCustomer(null);
    setNewCustomerName("");
    setValue("phone", "");
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    if (field === "qty" || field === "rate" || field === "discount") {
      const qty      = updated[index].qty || 0;
      const rate     = updated[index].rate || 0;
      const discount = updated[index].discount || 0;
      const subtotal = qty * rate;
      updated[index].total = subtotal - (subtotal * discount / 100);
    }
    setItems(updated);
  };

  const addItem = () => setItems([...items, { id: Date.now(), name: "", unit: "NOS", qty: 0, rate: 0, discount: 0, total: 0 }]);
  const removeItem = (index) => { if (items.length > 1) setItems(items.filter((_, i) => i !== index)); };

  const customerOptions = [
    { label: "+ Add New Customer", value: "__new__" },
    ...customers.map((c) => ({ label: `${c.customerId} - ${c.name}`, value: c.id })),
  ];

  const itemsTotal        = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const discountPercentage = parseFloat(formValues.discountPercentage) || 0;
  const vatPercentage      = parseFloat(formValues.vatPercentage) || 0;
  const discountAmount     = itemsTotal * discountPercentage / 100;
  const taxable            = itemsTotal - discountAmount;
  const vatAmount          = taxable * vatPercentage / 100;
  const grandTotal         = taxable + vatAmount;

  const step1Valid = isQuotationStep1Valid(selectedCustomer, newCustomerName, isNewCustomer);
  const step2Valid = isQuotationStep2Valid(items);

  const getPreviewData = () => ({
    quotationNo: editingQuotation?.quotationNo || "Auto Generated",
    customer: {
      name:         selectedCustomer?.name || newCustomerName,
      phone:        formValues.phone || selectedCustomer?.phone || "",
      customerType: selectedCustomer ? selectedCustomer.customerType : "walkin",
      customerId:   selectedCustomer?.customerId || null,
    },
    date: formValues.date?.format?.("DD/MM/YYYY") || "",
    validDays: formValues.validDays,
    validUntil: editingQuotation?.validUntil || "",
    validityDisplay: editingQuotation?.validityDisplay || "",
    paymentTerm: formValues.paymentTerm,
    vatPercent: vatPercentage,
    vatAmount,
    discountPercent: discountPercentage,
    discountAmount,
    status: formValues.status,
    items,
    itemsTotal,
    grandTotal,
  });

  const handleSubmit = async () => {
    if (!step2Valid) {
      message.warning("Please add at least one item with a name.");
      return;
    }

    const payload = {
      customer_data: buildCustomerDataPayload({
        customerId:   selectedCustomer?.customerId || null,
        name:         selectedCustomer?.name || newCustomerName,
        phone:        formValues.phone || selectedCustomer?.phone || "",
        customerType: selectedCustomer ? selectedCustomer.customerType : "walkin",
      }),
      date:                formValues.date ? formValues.date.format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"),
      valid_days:          formValues.validDays !== "" ? Number(formValues.validDays) : null,
      payment_term:        formValues.paymentTerm,
      discount_percentage: String(discountPercentage || 0),
      vat_percentage:      String(vatPercentage || 0),
      status:              formValues.status,
      items: items
        .filter((item) => item.name)
        .map((item) => ({
          item_name: item.name,
          unit:      item.unit || "",
          qty:       String(item.qty || 0),
          rate:      String(item.rate || 0),
          discount:  String(item.discount || 0),
        })),
    };

    setSubmitting(true);
    try {
      if (editingQuotation) {
        await updateQuotation(editingQuotation.id, payload);
      } else {
        await createQuotation(payload);
      }
      onSubmit();
      resetAll();
    } catch (err) {
      const errorMsg = err.response?.data
        ? Object.values(err.response.data).flat().join(", ")
        : err.message || "Failed to save quotation";
      message.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => setCurrent(current + 1);
  const prev = () => setCurrent(current - 1);

  return (
    <Drawer
      title={
        <span style={{ fontWeight: 700, fontSize: 17, color: "var(--color-text)" }}>
          {editingQuotation ? "Edit Quotation" : "Create Quotation"}
        </span>
      }
      open={open}
      onClose={() => { onClose(); resetAll(); }}
      width={620}
      destroyOnClose
      styles={{
        header: { borderBottom: "1px solid var(--color-border-light)", padding: "16px 24px" },
        body:   { padding: 0, display: "flex", flexDirection: "column", overflow: "hidden" },
        footer: { borderTop: "1px solid var(--color-border-light)", padding: "14px 24px" },
      }}
      footer={
        <section className={styles.drawerFooter}>
          {current > 0 && <AppButton type="default" onClick={prev}>Back</AppButton>}
          <span style={{ flex: 1 }} />
          <AppButton type="default" onClick={() => setPreviewOpen(true)} className="btn-preview">Preview</AppButton>
          {current === 0 && (
            <AppButton type="primary" onClick={next} className="btn-dark" disabled={!step1Valid}>Next</AppButton>
          )}
          {current === 1 && (
            <AppButton type="primary" onClick={handleSubmit} className="btn-dark" disabled={!step2Valid} loading={submitting}>
              {editingQuotation ? "Update Quotation" : "Create Quotation"}
            </AppButton>
          )}
        </section>
      }
    >
      <section className={styles.stepsBar}>
        <Steps current={current} items={STEPS} size="small" />
      </section>

      <section className={styles.stepContent}>
        {/* Step 1: Details */}
        {current === 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Quotation Details</h3>

            <section className={styles.detailsCard}>
              <Row gutter={16}>
                <Col span={12}>
                  <Controller name="date" control={control} render={({ field }) => (
                    <section>
                      <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", display: "block", marginBottom: 4 }}>Date</label>
                      <DatePicker {...field} style={{ width: "100%" }} />
                    </section>
                  )} />
                </Col>
                <Col span={12}>
                  {isNewCustomer ? (
                    <AppInput
                      label="Customer Name"
                      placeholder="Enter new customer name"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      suffix={
                        <span style={{ color: "#7c5cfc", cursor: "pointer", fontSize: 12, fontWeight: 600 }} onClick={handleNewCustomerToggle}>
                          Select Existing
                        </span>
                      }
                    />
                  ) : (
                    <AppSelect
                      label="Customer Name"
                      placeholder="Search or select customer"
                      options={customerOptions}
                      showSearch
                      filterOption={false}
                      loading={customerLoading}
                      onSearch={handleCustomerSearchDebounce}
                      onPopupScroll={handleCustomerScroll}
                      onChange={(val) => {
                        if (val === "__new__") {
                          setIsNewCustomer(true);
                          setSelectedCustomer(null);
                          setNewCustomerName("");
                          setValue("phone", "");
                        } else {
                          handleCustomerSelect(val);
                        }
                      }}
                      value={selectedCustomer?.id}
                    />
                  )}
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Controller name="phone" control={control} render={({ field }) => (
                    <AppInput {...field} label="Phone" name="phone" placeholder="Phone number" />
                  )} />
                </Col>
                <Col span={12}>
                  <Controller name="validDays" control={control} render={({ field }) => (
                    <AppInput {...field} label="Valid Days" inputType="number" min={0} placeholder="e.g. 30" />
                  )} />
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Controller name="paymentTerm" control={control} render={({ field }) => (
                    <AppSelect {...field} label="Payment Term" options={QUOTATION_PAYMENT_TERM_OPTIONS} />
                  )} />
                </Col>
                <Col span={12}>
                  <Controller name="status" control={control} render={({ field }) => (
                    <AppSelect {...field} label="Status" options={QUOTATION_STATUS_OPTIONS} />
                  )} />
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Controller name="vatPercentage" control={control} render={({ field }) => (
                    <AppInput {...field} label="VAT (%)" inputType="number" min={0} max={100} placeholder="0" />
                  )} />
                </Col>
                <Col span={12}>
                  <Controller name="discountPercentage" control={control} render={({ field }) => (
                    <AppInput {...field} label="Discount (%)" inputType="number" min={0} max={100} placeholder="0" />
                  )} />
                </Col>
              </Row>
            </section>
          </section>
        )}

        {/* Step 2: Items */}
        {current === 1 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Quotation Items</h3>

            {items.map((item, index) => (
              <section key={item.id} className={styles.itemCard}>
                <section className={styles.itemHeader}>
                  <span className={styles.itemBadge}>{index + 1}</span>
                  <span className={styles.itemHeaderLabel}>{item.name || `Item ${index + 1}`}</span>
                  <span className={styles.itemHeaderSpacer} />
                  <span className={styles.itemHeaderTotal}>{formatCurrency(item.total || 0)}</span>
                  {items.length > 1 && (
                    <AppButton type="text" icon={<DeleteOutlined />} size="small" danger onClick={() => removeItem(index)} />
                  )}
                </section>
                <Row gutter={12}>
                  <Col span={12}>
                    <AppInput label="Item Name" placeholder="Item name" value={item.name} onChange={(e) => handleItemChange(index, "name", e.target.value)} />
                  </Col>
                  <Col span={12}>
                    <AppInput label="Unit" placeholder="e.g. piece, kg" value={item.unit} onChange={(e) => handleItemChange(index, "unit", e.target.value)} />
                  </Col>
                </Row>
                <Row gutter={12}>
                  <Col span={6}>
                    <AppInput label="Qty" inputType="number" min={0} value={item.qty} onChange={(val) => handleItemChange(index, "qty", val)} />
                  </Col>
                  <Col span={6}>
                    <AppInput label="Rate" inputType="number" min={0} value={item.rate} onChange={(val) => handleItemChange(index, "rate", val)} />
                  </Col>
                  <Col span={6}>
                    <AppInput label="Disc (%)" inputType="number" min={0} max={100} value={item.discount} onChange={(val) => handleItemChange(index, "discount", val)} placeholder="%" />
                  </Col>
                  <Col span={6}>
                    <AppInput label="Total" inputType="number" value={item.total} disabled />
                  </Col>
                </Row>
              </section>
            ))}

            <AppButton type="default" icon={<PlusOutlined />} onClick={addItem} block className={styles.addItemBtn}>
              Add Another Item
            </AppButton>

            <section className={styles.summaryBox}>
              <section className={styles.summaryRow}>
                <Text style={{ color: "var(--color-text-secondary)" }}>Items Total</Text>
                <Text style={{ fontWeight: 700, color: "var(--color-text)" }}>{formatCurrency(itemsTotal)}</Text>
              </section>
              {discountPercentage > 0 && (
                <section className={styles.summaryRow}>
                  <Text style={{ color: "var(--color-text-secondary)" }}>Discount ({discountPercentage}%)</Text>
                  <Text style={{ fontWeight: 700, color: "#ef4444" }}>- {formatCurrency(discountAmount)}</Text>
                </section>
              )}
              {vatPercentage > 0 && (
                <section className={styles.summaryRow}>
                  <Text style={{ color: "var(--color-text-secondary)" }}>VAT ({vatPercentage}%)</Text>
                  <Text style={{ fontWeight: 700, color: "var(--color-text)" }}>{formatCurrency(vatAmount)}</Text>
                </section>
              )}
              <section className={styles.summaryRow}>
                <Text style={{ fontSize: 15, fontWeight: 700 }}>Grand Total</Text>
                <Text style={{ fontSize: 18, fontWeight: 800, color: "var(--color-text)" }}>{formatCurrency(grandTotal)}</Text>
              </section>
            </section>
          </section>
        )}
      </section>

      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        data={getPreviewData()}
        onDeleteItem={(index) => removeItem(index)}
      />
    </Drawer>
  );
};

export default QuotationDrawer;
