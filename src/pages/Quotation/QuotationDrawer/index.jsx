import { useState, useEffect, useCallback } from "react";
import { Drawer, Steps, DatePicker, Row, Col, Typography, message, Tooltip, Tag } from "antd";
import { useForm, Controller } from "react-hook-form";
import { DeleteOutlined, TeamOutlined, DatabaseOutlined, FormOutlined } from "@ant-design/icons";
import _ from "lodash";
import dayjs from "dayjs";
import { AppButton, AppInput, AppSelect } from "@/components/common";
import { getAllCustomers, normalizeCustomer } from "@/services/customerService";
import { createQuotation, updateQuotation, buildCustomerDataPayload } from "@/services/quotationService";
import { getItems as getInventoryItems } from "@/services/inventoryService";
import { UNIT_OPTIONS, ADD_NEW_UNIT } from "@/pages/Inventory/mockData";
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

const emptyItem    = () => ({ id: Date.now(), inventoryItemId: null, code: "", name: "", unit: "NOS", rate: 0, qty: 0, discount: 0, total: 0 });
const emptyManual  = () => ({ id: Date.now(), inventoryItemId: null, code: "", name: "", unit: "", rate: 0, qty: 0, discount: 0, total: 0, isManual: true });

const QuotationDrawer = ({ open, onClose, onSubmit, editingQuotation }) => {
  const [current, setCurrent]                 = useState(0);
  const [customers, setCustomers]             = useState([]);
  const [customerPage, setCustomerPage]       = useState({ current: 0, size: PAGE_SIZE, total: 0 });
  const [customerSearch, setCustomerSearch]   = useState("");
  const [customerLoading, setCustomerLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isNewCustomer, setIsNewCustomer]     = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [items, setItems]                     = useState([emptyItem()]);

  // ── Inventory items ──
  const [invItems,   setInvItems]   = useState([]);
  const [invPage,    setInvPage]    = useState({ current: 0, size: PAGE_SIZE, total: 0 });
  const [invSearch,  setInvSearch]  = useState("");
  const [invLoading, setInvLoading] = useState(false);

  const [previewOpen, setPreviewOpen]       = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [nextLoading, setNextLoading]       = useState(false);

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
      setInvItems([]);
      setInvPage({ current: 0, size: PAGE_SIZE, total: 0 });
      setInvSearch("");
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

  const fetchInvItems = async (pageNo = 0, searchQuery = "") => {
    setInvLoading(true);
    try {
      const res = await getInventoryItems({ page: pageNo + 1, pageSize: PAGE_SIZE, search: searchQuery });
      const results = res.results || [];
      setInvItems((prev) => (pageNo === 0 ? results : [...prev, ...results]));
      setInvPage((prev) => ({ ...prev, current: pageNo, total: res.count || 0 }));
    } catch {
      if (pageNo === 0) setInvItems([]);
    } finally {
      setInvLoading(false);
    }
  };

  const handleInvSearchDebounce = useCallback(
    _.debounce((value) => {
      setInvSearch(value);
      fetchInvItems(0, value);
    }, 400),
    []
  );

  const handleInvScroll = useInfiniteScroll({
    pageObject: invPage,
    fetchFunction: fetchInvItems,
    searchValue: invSearch,
  });

  const handleInvItemSelect = (index, inventoryItemId) => {
    const inv = invItems.find((i) => i.id === inventoryItemId);
    if (!inv) return;
    const updated  = [...items];
    const itemType = inv.itemType || "product";
    const qty      = itemType === "service" ? 1 : (updated[index].qty || 0);
    const discount = updated[index].discount || 0;
    const rate     = Number(inv.saleRate)    || 0;
    const subtotal = qty * rate;
    updated[index] = {
      ...updated[index],
      inventoryItemId,
      code:     inv.itemCode || "",
      name:     inv.name     || "",
      unit:     inv.unit     || "",
      itemType,
      qty,
      rate,
      total: subtotal - (subtotal * discount / 100),
    };
    setItems(updated);
    if (invSearch) {
      setInvSearch("");
      fetchInvItems(0, "");
    }
  };

  const handleInvDropdownOpen = (visible) => {
    if (visible && invSearch) {
      setInvSearch("");
      fetchInvItems(0, "");
    }
  };

  const populateFromQuotation = (quotation) => {
    setCurrent(0);
    setIsNewCustomer(false);
    setNewCustomerName("");
    setCustomerSearch("");

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
        id:              item.id              || Date.now(),
        inventoryItemId: item.inventoryItemId || null,
        isManual:        !item.inventoryItemId,
        code:            item.code            || "",
        name:            item.name            || "",
        unit:            item.unit            || "NOS",
        rate:            item.rate            || 0,
        qty:             item.qty             || 0,
        discount:        item.discount        || 0,
        total:           item.total           || 0,
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
    setInvItems([]);
    setInvPage({ current: 0, size: PAGE_SIZE, total: 0 });
    setInvSearch("");
    resetForm({ date: dayjs(), validDays: "", phone: "", paymentTerm: "cash", discountPercentage: "", vatPercentage: "", status: "draft" });
    setItems([emptyItem()]);
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

  const addItem = () => setItems([...items, emptyItem()]);
  const removeItem = (index) => { if (items.length > 1) setItems(items.filter((_, i) => i !== index)); };

  const customerOptions = [
    { label: "+ Add New Customer", value: "__new__" },
    ...customers.map((c) => ({ label: `${c.customerId} - ${c.name}`, value: c.id })),
  ];

  const isWalkin   = isNewCustomer || selectedCustomer?.customerType === "walkin";
  const itemsTotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const discountPercentage = parseFloat(formValues.discountPercentage) || 0;
  const vatPercentage      = parseFloat(formValues.vatPercentage) || 0;
  const discountAmount     = itemsTotal * discountPercentage / 100;
  const taxable            = itemsTotal - discountAmount;
  const vatAmount          = taxable * vatPercentage / 100;
  const grandTotal         = taxable + vatAmount;

  const step1Valid = isQuotationStep1Valid(selectedCustomer, newCustomerName, isNewCustomer, formValues.phone);
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
          name:      item.name,
          units:     (item.unit === ADD_NEW_UNIT ? (item.customUnit || "").trim() : item.unit) || "pcs",
          quantity:  String(item.qty || 0),
          unitPrice: String(item.rate || 0),
          discount:  String(item.discount || 0),
          ...(item.inventoryItemId ? { itemId: item.inventoryItemId, itemCode: item.code || "" } : {}),
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

  const next = async () => {
    const newStep = current + 1;
    if (newStep === 1) {
      setNextLoading(true);
      await fetchInvItems(0, "");
      setNextLoading(false);
    }
    setCurrent(newStep);
  };
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
            <AppButton type="primary" onClick={next} className="btn-dark" loading={nextLoading} disabled={!step1Valid}>Next</AppButton>
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
                      label={
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          Customer Name
                          <Tag color="green" style={{ fontSize: 10, padding: "0 5px", lineHeight: "16px", marginLeft: 2 }}>New</Tag>
                        </span>
                      }
                      placeholder="Enter new customer name"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      suffix={
                        <Tooltip title="Select existing customer">
                          <TeamOutlined
                            style={{ color: "#7c5cfc", cursor: "pointer", fontSize: 15 }}
                            onClick={handleNewCustomerToggle}
                          />
                        </Tooltip>
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
                      optionRender={(option) =>
                        option.value === "__new__" ? (
                          <span style={{
                            display: "block", margin: "-5px -12px", padding: "5px 12px",
                            background: "rgba(124, 92, 252, 0.1)",
                            color: "#7c5cfc", fontWeight: 600,
                          }}>
                            {option.label}
                          </span>
                        ) : option.label
                      }
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
                    <AppInput {...field} label="Phone" name="phone" placeholder="Phone number" required disabled={!isWalkin && !!selectedCustomer} />
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
                  {item.itemType === "service" && (
                    <Tag color="purple" style={{ fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "0 5px", lineHeight: "16px", margin: 0 }}>SERVICE</Tag>
                  )}
                  <span className={styles.itemHeaderSpacer} />
                  <span className={styles.itemHeaderTotal}>{formatCurrency(item.total || 0)}</span>
                  {items.length > 1 && (
                    <AppButton type="text" icon={<DeleteOutlined />} size="small" danger onClick={() => removeItem(index)} />
                  )}
                </section>

                {/* Existing / inventory-selected item layout */}
                {!item.isManual && (
                  <>
                    <Row gutter={12}>
                      <Col span={24}>
                        <AppSelect
                          label="Item"
                          required
                          placeholder="Search inventory items..."
                          showSearch
                          filterOption={false}
                          loading={invLoading}
                          options={[
                            ...(item.name && item.inventoryItemId && !invItems.find((i) => i.id === item.inventoryItemId)
                              ? [{ value: item.inventoryItemId, label: item.name }]
                              : []
                            ),
                            ...(item.name && !item.inventoryItemId
                              ? [{ value: "__current__", label: item.name }]
                              : []
                            ),
                            ...invItems.map((i) => ({
                              value: i.id,
                              label: `${i.itemCode} — ${i.name}`,
                              itemType: i.itemType || "product",
                            })),
                          ]}
                          value={item.inventoryItemId || (item.name ? "__current__" : undefined)}
                          onSearch={handleInvSearchDebounce}
                          onPopupScroll={handleInvScroll}
                          onChange={(val) => { if (val !== "__current__") handleInvItemSelect(index, val); }}
                          onDropdownVisibleChange={handleInvDropdownOpen}
                          notFoundContent={invLoading ? "Loading..." : "No items found"}
                          optionRender={(option) =>
                            option.value === "__current__" ? (
                              <span style={{ color: "var(--color-text-secondary)", fontStyle: "italic" }}>
                                {option.label} <span style={{ fontSize: 11 }}>(existing — select to change)</span>
                              </span>
                            ) : (
                              <span style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "space-between" }}>
                                <span>{option.label}</span>
                                {option.data?.itemType === "service" && (
                                  <Tag color="purple" style={{ fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "0 5px", lineHeight: "16px", margin: 0, flexShrink: 0 }}>SERVICE</Tag>
                                )}
                              </span>
                            )
                          }
                        />
                      </Col>
                    </Row>
                    <Row gutter={12}>
                      <Col span={12}>
                        <AppInput label="Item Code" value={item.code} disabled onChange={() => {}} placeholder="—" />
                      </Col>
                      <Col span={12}>
                        <AppInput label="Unit" value={item.unit} disabled onChange={() => {}} placeholder="—" />
                      </Col>
                    </Row>
                  </>
                )}

                {/* Manual item: plain inputs (old design) */}
                {item.isManual && (
                  <Row gutter={12}>
                    <Col span={12}>
                      <AppInput label="Item Name" placeholder="Item name" value={item.name} onChange={(e) => handleItemChange(index, "name", e.target.value)} />
                    </Col>
                    <Col span={12}>
                      <AppSelect
                        label="Unit"
                        placeholder="Select unit"
                        options={UNIT_OPTIONS}
                        value={item.unit || undefined}
                        onChange={(val) => handleItemChange(index, "unit", val)}
                        optionRender={(option) =>
                          option.value === ADD_NEW_UNIT ? (
                            <span style={{ display: "block", margin: "-5px -12px", padding: "6px 12px", background: "rgba(124,92,252,0.08)", color: "#7c5cfc", fontWeight: 600 }}>
                              {option.label}
                            </span>
                          ) : option.label
                        }
                      />
                    </Col>
                    {item.unit === ADD_NEW_UNIT && (
                      <Col span={24} style={{ marginTop: 8 }}>
                        <AppInput
                          label="New Unit Name"
                          placeholder="e.g. Roll, Bundle, Sq.Ft"
                          value={item.customUnit || ""}
                          onChange={(e) => handleItemChange(index, "customUnit", e.target.value)}
                          autoFocus
                        />
                      </Col>
                    )}
                  </Row>
                )}

                <Row gutter={12}>
                  <Col span={6}>
                    <AppInput label="Rate" inputType="number" min={0} value={item.rate} onChange={(val) => handleItemChange(index, "rate", val)} />
                  </Col>
                  <Col span={6}>
                    <AppInput
                      label="Qty"
                      inputType="number"
                      min={0}
                      value={item.itemType === "service" ? 1 : item.qty}
                      onChange={(val) => handleItemChange(index, "qty", val)}
                      disabled={item.itemType === "service"}
                    />
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

            <div className={styles.addBtnRow}>
              <button type="button" className={styles.addCardBtn} onClick={addItem}>
                <span className={styles.addCardBtnIcon} style={{ background: "rgba(59,130,246,0.18)", color: "#3b82f6" }}>
                  <DatabaseOutlined />
                </span>
                <span className={styles.addCardBtnText}>
                  <span className={styles.addCardBtnTitle}>From Inventory</span>
                  <span className={styles.addCardBtnSub}>Select existing item</span>
                </span>
              </button>
              <button type="button" className={`${styles.addCardBtn} ${styles.addCardBtnPurple}`} onClick={() => setItems((prev) => [...prev, emptyManual()])}>
                <span className={styles.addCardBtnIcon} style={{ background: "rgba(124,92,252,0.18)", color: "#7c5cfc" }}>
                  <FormOutlined />
                </span>
                <span className={styles.addCardBtnText}>
                  <span className={styles.addCardBtnTitle}>Add Manually</span>
                  <span className={styles.addCardBtnSub}>Type item name & details</span>
                </span>
              </button>
            </div>

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
