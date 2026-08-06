import { useState, useEffect, useCallback } from "react";
import { Drawer, Steps, DatePicker, Row, Col, Divider, Typography, message } from "antd";
import dayjs from "dayjs";
import { useForm, Controller } from "react-hook-form";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import _ from "lodash";
import { AppButton, AppInput, AppSelect } from "@/components/common";
import { getAllCustomers, normalizeCustomer } from "@/services/customerService";
import { getAllVendors, normalizeVendor } from "@/services/supplierService";
import { createSaleInvoice, updateSaleInvoice } from "@/services/saleInvoiceService";
import { createPurchaseInvoice, updatePurchaseInvoice } from "@/services/purchaseInvoiceService";
import { useInfiniteScroll } from "@/hooks";
import { formatCurrency } from "@/utils";
import InvoicePreview from "../SaleInvoiceModal";
import styles from "./styles.module.css";

const { Text } = Typography;

const PAGE_SIZE = 10;

const getSteps = (type) => [
  { title: type === "purchase" ? "Supplier" : "Customer" },
  { title: "Items" },
  { title: "Payment" },
];

const InvoiceDrawer = ({ open, onClose, onSubmit, editingInvoice, type = "sale" }) => {
  const label       = type === "purchase" ? "Purchase" : "Sale";
  const isPurchase  = type === "purchase";
  const entityName  = isPurchase ? "Supplier" : "Customer";

  const [current, setCurrent]               = useState(0);
  const [customers, setCustomers]           = useState([]);
  const [customerPage, setCustomerPage]     = useState({ current: 0, size: PAGE_SIZE, total: 0 });
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerLoading, setCustomerLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isNewCustomer, setIsNewCustomer]   = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [items, setItems]                   = useState([{ id: 1, name: "", unit: "NOS", qty: 0, rate: 0, discount: 0, total: 0 }]);
  const [payment, setPayment]               = useState({ method: "Cash", terms: "Cash", paidAmount: 0, note: "", vatPercentage: "", invoiceDiscount: "", paymentReference: "" });
  const [invoiceStatus, setInvoiceStatus]   = useState("Draft");
  const [previewOpen, setPreviewOpen]       = useState(false);
  const [submitting, setSubmitting]         = useState(false);

  const { control, reset: resetForm, watch, setValue, formState: { errors } } = useForm({
    mode: "onTouched",
    defaultValues: { phone: "", invoiceNo: "Auto Generated", taxNumber: "", billNumber: "", creditBalance: 0, date: dayjs() },
  });

  const formValues = watch();

  useEffect(() => {
    if (open) {
      if (isPurchase && editingInvoice) {
        populateFromInvoice(editingInvoice);
      } else {
        fetchCustomers(0, "");
        if (editingInvoice) {
          populateFromInvoice(editingInvoice);
        } else {
          resetAll();
        }
      }
    }
  }, [open]);

  const fetchCustomers = async (pageNo = 0, searchQuery = "") => {
    setCustomerLoading(true);
    try {
      let normalized;
      let total;
      if (isPurchase) {
        const res = await getAllVendors({ page: pageNo + 1, pageSize: PAGE_SIZE, name: searchQuery });
        normalized = (res.results || []).map(normalizeVendor);
        total = res.count || 0;
      } else {
        const res = await getAllCustomers({ page: pageNo + 1, pageSize: PAGE_SIZE, name: searchQuery });
        normalized = (res.results || []).map(normalizeCustomer);
        total = res.count || 0;
      }
      setCustomers((prev) => (pageNo === 0 ? normalized : [...prev, ...normalized]));
      setCustomerPage((prev) => ({ ...prev, current: pageNo, total }));
    } catch {
      if (pageNo === 0) setCustomers([]);
    } finally {
      setCustomerLoading(false);
    }
  };

  const populateFromInvoice = (invoice) => {
    setCurrent(0);
    setIsNewCustomer(false);
    setNewCustomerName("");
    setCustomerSearch("");

    if (isPurchase) {
      const vendor = invoice.vendor || {};
      const vendorObj = {
        id:       vendor.id,
        vendorId: vendor.id,
        name:     vendor.vendorName || "",
        phone:    vendor.phone      || "",
      };
      setSelectedCustomer(vendorObj);
      setCustomers([vendorObj]);
      setItems(
        (invoice.items || []).map((item) => ({
          id:       item.id                           || Date.now(),
          name:     item.productName                  || "",
          unit:     item.units                        || "NOS",
          qty:      parseFloat(item.quantity)         || 0,
          rate:     parseFloat(item.purchasePrice)    || 0,
          discount: parseFloat(item.discount)         || 0,
          total:    parseFloat(item.total)            || 0,
        }))
      );
      setPayment({
        method:           invoice.paymentMethod    || "Cash",
        terms:            invoice.paymentTerm      || "Cash",
        paidAmount:       parseFloat(invoice.paidAmount) || 0,
        note:             invoice.notes            || "",
        vatPercentage:    invoice.vatPercentage    || "",
        invoiceDiscount:  invoice.invoiceDiscount  || "",
        paymentReference: invoice.paymentReference || "",
      });
      setInvoiceStatus(invoice.status || "Draft");
      resetForm({
        phone:        vendor.phone          || "",
        invoiceNo:    invoice.invoiceNumber || "Auto Generated",
        taxNumber:    "",
        billNumber:   invoice.billNumber    || "",
        creditBalance: 0,
        date: invoice.date ? dayjs(invoice.date) : dayjs(),
      });
    } else {
      const cd = invoice.customerData || {};
      setSelectedCustomer({
        id:             cd.id,
        customerId:     cd.customerId,
        name:           cd.name           || invoice.customerName || "",
        phone:          cd.phone          || "",
        customerType:   cd.customerType   || "permanent",
        creditBalance:  cd.creditBalance  || 0,
        advanceBalance: cd.advanceBalance || 0,
      });
      setItems(
        (invoice.items || []).map((item) => ({
          id:       item.id       || Date.now(),
          name:     item.name     || "",
          unit:     item.unit     || "NOS",
          qty:      item.qty      || 0,
          rate:     item.rate     || 0,
          discount: item.discount || 0,
          total:    item.total    || 0,
        }))
      );
      setPayment({
        method:     invoice.paymentMethod || "Cash",
        terms:      invoice.paymentTerm   || "Cash",
        paidAmount: invoice.paid          || 0,
        note:       invoice.notes         || "",
      });
      setInvoiceStatus(invoice.invoiceStatus || "Draft");
      resetForm({
        phone:     cd.phone          || "",
        invoiceNo: invoice.invoiceNo || "Auto Generated",
        taxNumber: "",
        date:      invoice.date ? dayjs(invoice.date) : dayjs(),
      });
    }
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

  const isWalkin   = isNewCustomer || selectedCustomer?.customerType === "walkin";
  const grandTotal = items.reduce((sum, item) => sum + (item.total || 0), 0);

  // Auto-derive Payment Term — always locked, never user-editable
  useEffect(() => {
    let term;
    if (isWalkin) {
      term = "Cash";
    } else {
      const paid  = parseFloat(payment.paidAmount) || 0;
      term = paid >= grandTotal ? "Cash" : "Credit";
    }
    setPayment((prev) => (prev.terms === term ? prev : { ...prev, terms: term }));
  }, [isWalkin, payment.paidAmount, grandTotal]);

  const resetAll = () => {
    setCurrent(0);
    setSelectedCustomer(null);
    setIsNewCustomer(false);
    setNewCustomerName("");
    setCustomerSearch("");
    setCustomerPage({ current: 0, size: PAGE_SIZE, total: 0 });
    resetForm({ phone: "", invoiceNo: "Auto Generated", taxNumber: "", billNumber: "", creditBalance: 0, date: dayjs() });
    setItems([{ id: 1, name: "", unit: "NOS", qty: 0, rate: 0, discount: 0, total: 0 }]);
    setPayment({ method: "Cash", terms: "Cash", paidAmount: 0, note: "", vatPercentage: "", invoiceDiscount: "", paymentReference: "" });
    setInvoiceStatus("Draft");
  };

  const handleCustomerSelect = (customerId) => {
    const cust = customers.find((c) => c.id === customerId);
    if (cust) {
      setSelectedCustomer(cust);
      setIsNewCustomer(false);
      setNewCustomerName("");
      setValue("phone", cust.phone || "");
      setValue("creditBalance", cust.creditBalance || 0);

      setValue("taxNumber", cust.taxNumber || "");
    }
  };

  const handleNewCustomerToggle = () => {
    setIsNewCustomer(!isNewCustomer);
    setSelectedCustomer(null);
    setNewCustomerName("");
    setValue("phone", "");
    setValue("creditBalance", 0);
    setValue("advanceBalance", 0);
    setValue("taxNumber", "");
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

  const addItem = () => {
    setItems([...items, { id: Date.now(), name: "", unit: "NOS", qty: 0, rate: 0, discount: 0, total: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!mappedItems.length) {
      message.warning("Please add at least one item with a name and quantity.");
      return;
    }

    const paidAmount = parseFloat(payment.paidAmount) || 0;
    const invoiceDate = formValues.date ? formValues.date.format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD");

    let payload;

    if (isPurchase) {
      payload = {
        vendor: {
          id:         selectedCustomer?.id,
          vendorName: selectedCustomer?.name || newCustomerName,
          phone:      formValues.phone || selectedCustomer?.phone || null,
        },
        billNumber:       formValues.billNumber   || null,
        date:             invoiceDate,
        paymentTerm:      payment.terms,
        paymentMethod:    payment.method         || null,
        paidAmount:       String(paidAmount),
        paymentReference: payment.paymentReference || "",
        notes:            payment.note            || "",
        vatPercentage:    payment.vatPercentage   ? String(payment.vatPercentage)   : "0",
        invoiceDiscount:  payment.invoiceDiscount ? String(payment.invoiceDiscount) : "0",
        status:           invoiceStatus,
        items: items
          .filter((item) => item.name && item.qty > 0)
          .map((item) => ({
            productName:   item.name,
            units:         item.unit          || "",
            quantity:      String(item.qty),
            purchasePrice: String(item.rate),
            discount:      String(item.discount || 0),
          })),
      };
    } else {
      payload = {
        date:          invoiceDate,
        customer_data: {
          customer_id:   selectedCustomer ? selectedCustomer.customerId : null,
          customer_name: selectedCustomer ? selectedCustomer.name : newCustomerName,
          phone:         selectedCustomer ? (selectedCustomer.phone || formValues.phone || null) : (formValues.phone || null),
          customer_type: selectedCustomer ? selectedCustomer.customerType : "walkin",
          tax_number:    formValues.taxNumber || null,
        },
        payment_term:   payment.terms,
        payment_method: payment.method,
        paid_amount:    String(paidAmount),
        notes:          payment.note || null,
        invoiceStatus:  invoiceStatus,
        items: items
          .filter((item) => item.name && item.qty > 0)
          .map((item) => ({
            item_name: item.name,
            units:     item.unit || "",
            quantity:  String(item.qty),
            rate:      String(item.rate),
            discount:  String(item.discount || 0),
          })),
      };
    }

    setSubmitting(true);
    try {
      if (isPurchase) {
        if (editingInvoice) {
          await updatePurchaseInvoice(editingInvoice.id, payload);
        } else {
          await createPurchaseInvoice(payload);
        }
      } else {
        if (editingInvoice) {
          await updateSaleInvoice(editingInvoice.id, payload);
        } else {
          await createSaleInvoice(payload);
        }
      }
      onSubmit();
      resetAll();
    } catch (err) {
      const errorMsg = err.response?.data
        ? Object.values(err.response.data).flat().join(", ")
        : err.message || "Failed to save invoice";
      message.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const mappedItems = items.filter((item) => item.name && item.qty > 0);

  const next = () => setCurrent(current + 1);
  const prev = () => setCurrent(current - 1);

  // Supplier Bill Number is mandatory for purchase invoices — block leaving step 1 without it.
  const step1Valid = !isPurchase || !!formValues.billNumber;

  const customerOptions = [
    ...(!isPurchase ? [{ label: `+ Add Walkin ${entityName}`, value: "__new__" }] : []),
    ...customers.map((c) => ({
      label: isPurchase ? `${c.vendorId || c.id} - ${c.name}` : `${c.customerId} - ${c.name}`,
      value: c.id,
    })),
  ];

  return (
    <Drawer
      title={
        <span style={{ fontWeight: 700, fontSize: 17, color: "var(--color-text)" }}>
          {editingInvoice ? `Edit ${label} Invoice` : `Create ${label} Invoice`}
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
          <AppButton type="default" onClick={() => setPreviewOpen(true)}>Preview</AppButton>
          {current < getSteps(type).length - 1 ? (
            <AppButton type="primary" onClick={next} className="btn-dark" disabled={current === 0 && !step1Valid}>Next</AppButton>
          ) : (
            <AppButton type="primary" onClick={handleSubmit} className="btn-dark" loading={submitting}>
              {editingInvoice ? "Update Invoice" : "Create Invoice"}
            </AppButton>
          )}
        </section>
      }
    >
      <section className={styles.stepsBar}>
        <Steps current={current} items={getSteps(type)} size="small" />
      </section>

      <section className={styles.stepContent}>
        {/* Step 1: Customer / Supplier */}
        {current === 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{entityName} Details</h3>
            <section className={styles.detailsCard}>
              <Row gutter={16}>
                <Col span={12}>
                  <AppInput
                    label="Code"
                    placeholder="Enter code"
                    value={isPurchase ? (selectedCustomer?.vendorId || "") : (selectedCustomer?.customerId || "")}
                    onChange={() => {}}
                  />
                </Col>
                <Col span={12}>
                  {isNewCustomer ? (
                    <AppInput
                      label={`${entityName} Name`}
                      placeholder={`Enter new ${entityName.toLowerCase()} name`}
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      suffix={
                        <span
                          style={{ color: "#7c5cfc", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                          onClick={handleNewCustomerToggle}
                        >
                          Select Existing {entityName}
                        </span>
                      }
                    />
                  ) : (
                    <AppSelect
                      label={`${entityName} Name`}
                      placeholder={`Search or select ${entityName.toLowerCase()}`}
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
                          setValue("creditBalance", 0);
                    
                          setValue("taxNumber", "");
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
                {!isPurchase && (
                  <Col span={12}>
                    <AppInput
                      label="Customer Type"
                      value={isNewCustomer ? "walkin" : (selectedCustomer?.customerType || "")}
                      disabled
                      onChange={() => {}}
                      placeholder="—"
                    />
                  </Col>
                )}
              </Row>
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
                  <Controller name="taxNumber" control={control} render={({ field }) => (
                    <AppInput {...field} label="Tax Number / NTN" name="taxNumber" placeholder="Tax number" disabled={isPurchase} />
                  )} />
                </Col>
              </Row>
              {isPurchase && (
                <Row gutter={16}>
                  <Col span={12}>
                    <Controller
                      name="billNumber"
                      control={control}
                      rules={{ required: "Supplier bill number is required" }}
                      render={({ field }) => (
                        <AppInput {...field} label="Supplier Bill Number" name="billNumber" placeholder="Enter supplier bill number" required errors={errors} />
                      )}
                    />
                  </Col>
                </Row>
              )}
              {editingInvoice && (
                <Row gutter={16}>
                  <Col span={12}>
                    <AppInput
                      label="Opening Balance"
                      value={selectedCustomer?.openingCredit || "0"}
                      disabled
                      onChange={() => {}}
                    />
                  </Col>
                  <Col span={12}>
                    <AppInput
                      label="Advance Balance"
                      value={selectedCustomer?.advanceBalance ?? 0}
                      disabled
                      onChange={() => {}}
                    />
                  </Col>
                </Row>
              )}
            </section>
          </section>
        )}

        {/* Step 2: Items */}
        {current === 1 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Invoice Items</h3>
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
                  <Col span={16}>
                    <AppInput label="Item Name" placeholder="Item name" value={item.name} onChange={(e) => handleItemChange(index, "name", e.target.value)} />
                  </Col>
                  <Col span={8}>
                    <AppInput label="Unit" placeholder="e.g. piece, kg" value={item.unit} onChange={(e) => handleItemChange(index, "unit", e.target.value)} />
                  </Col>
                </Row>
                <Row gutter={12}>
                  <Col span={isPurchase ? 8 : 6}>
                    <AppInput label="Qty" inputType="number" min={0} value={item.qty} onChange={(val) => handleItemChange(index, "qty", val)} />
                  </Col>
                  <Col span={isPurchase ? 8 : 6}>
                    <AppInput label="Rate" inputType="number" min={0} value={item.rate} onChange={(val) => handleItemChange(index, "rate", val)} />
                  </Col>
                  {!isPurchase && (
                    <Col span={6}>
                      <AppInput label="Discount (%)" inputType="number" min={0} max={100} value={item.discount} onChange={(val) => handleItemChange(index, "discount", val)} placeholder="%" />
                    </Col>
                  )}
                  <Col span={isPurchase ? 8 : 6}>
                    <AppInput label="Total" inputType="number" value={item.total} disabled />
                  </Col>
                </Row>
              </section>
            ))}

            <AppButton type="default" icon={<PlusOutlined />} onClick={addItem} block className={styles.addItemBtn}>
              Add Another Item
            </AppButton>

            <section className={styles.grandTotal}>
              <Text style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>Grand Total</Text>
              <Text style={{ fontSize: 20, fontWeight: 800, color: "var(--color-text)" }}>{formatCurrency(grandTotal)}</Text>
            </section>
          </section>
        )}

        {/* Step 3: Payment */}
        {current === 2 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Payment Details</h3>
            <Row gutter={16}>
              <Col span={8}>
                <AppSelect
                  label="Payment Method"
                  value={payment.method}
                  onChange={(val) => setPayment({ ...payment, method: val })}
                  options={[
                    { label: "Cash",                          value: "Cash" },
                    { label: "Bank Transfer",                 value: "Bank Transfer" },
                    { label: "Credit Card",                   value: "Credit Card" },
                    { label: "Debit Card",                    value: "Debit Card" },
                    { label: "Cheque",                        value: "Cheque" },
                    { label: "Mobile Wallet (JazzCash, Easypaisa)", value: "Mobile Wallet (JazzCash, Easypaisa)" },
                  ]}
                />
              </Col>
              <Col span={8}>
                <AppSelect
                  label="Payment Terms"
                  value={payment.terms}
                  onChange={(val) => setPayment({ ...payment, terms: val })}
                  options={[
                    { label: "Cash",   value: "Cash" },
                    { label: "Credit", value: "Credit" },
                  ]}
                  // disable
                />
              </Col>
              <Col span={8}>
                <AppInput
                  label="Paid Amount"
                  inputType="number"
                  min={0}
                  value={payment.paidAmount}
                  onChange={(val) => setPayment({ ...payment, paidAmount: val })}
                  placeholder="0.00"
                />
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <AppSelect
                  label="Invoice Status"
                  value={invoiceStatus}
                  onChange={(val) => setInvoiceStatus(val)}
                  options={[
                    { label: "Draft",  value: "Draft" },
                    { label: "Saved",  value: "Saved" },
                  ]}
                />
              </Col>
            </Row>
            {isPurchase && (
              <Row gutter={16}>
                <Col span={8}>
                  <AppInput
                    label="VAT %"
                    inputType="number"
                    min={0}
                    placeholder="0"
                    value={payment.vatPercentage}
                    onChange={(val) => setPayment({ ...payment, vatPercentage: val ?? "" })}
                  />
                </Col>
                <Col span={8}>
                  <AppInput
                    label="Invoice Discount"
                    inputType="number"
                    min={0}
                    placeholder="0.00"
                    value={payment.invoiceDiscount}
                    onChange={(val) => setPayment({ ...payment, invoiceDiscount: val ?? "" })}
                  />
                </Col>
                <Col span={8}>
                  <AppInput
                    label="Payment Reference"
                    placeholder="e.g. CHQ-001"
                    value={payment.paymentReference}
                    onChange={(e) => setPayment({ ...payment, paymentReference: e.target.value })}
                  />
                </Col>
              </Row>
            )}

            <AppInput
              label="Note"
              inputType="textarea"
              rows={3}
              placeholder="Add a note (optional)"
              value={payment.note}
              onChange={(e) => setPayment({ ...payment, note: e.target.value })}
            />

            <Divider />

            <section className={styles.summaryBox}>
              <section className={styles.summaryRow}>
                <Text style={{ color: "var(--color-text-secondary)" }}>Grand Total</Text>
                <Text style={{ fontWeight: 700, color: "var(--color-text)" }}>{formatCurrency(grandTotal)}</Text>
              </section>
              <section className={styles.summaryRow}>
                <Text style={{ color: "var(--color-text-secondary)" }}>Paid Amount</Text>
                <Text style={{ fontWeight: 700, color: "#22c55e" }}>{formatCurrency(payment.paidAmount || 0)}</Text>
              </section>
              <section className={styles.summaryRow}>
                <Text style={{ color: "var(--color-text-secondary)" }}>Remaining</Text>
                <Text style={{ fontWeight: 700, color: grandTotal - (payment.paidAmount || 0) > 0 ? "#ef4444" : "#22c55e" }}>
                  {formatCurrency(Math.max(0, grandTotal - (payment.paidAmount || 0)))}
                </Text>
              </section>
            </section>
          </section>
        )}
      </section>

      <InvoicePreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        invoiceData={{
          customer: {
            ...(selectedCustomer || {}),
            name: selectedCustomer?.name || newCustomerName || "N/A",
            phone: formValues.phone || selectedCustomer?.phone || "",
            address: selectedCustomer?.address || "",
            creditBalance: formValues.creditBalance || 0,
            taxNumber: formValues.taxNumber || "",
          },
          invoiceNo: formValues.invoiceNo || "Auto Generated",
          date: formValues.date?.format?.("DD/MM/YYYY") || "",
          items,
          payment,
          grandTotal,
          type,
          billNumber: formValues.taxNumber || "",
        }}
        onDeleteItem={(index) => removeItem(index)}
      />
    </Drawer>
  );
};

export default InvoiceDrawer;
