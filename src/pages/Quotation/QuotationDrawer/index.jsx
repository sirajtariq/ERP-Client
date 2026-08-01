import { useState, useEffect, useRef } from "react";
import { Drawer, Steps, Select, DatePicker, Row, Col, Divider, Typography, Spin } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { AppButton, AppInput, AppSelect } from "@/components/common";
import { getAllCustomers, searchCustomers, normalizeCustomer } from "@/services/customerService";
import { formatCurrency } from "@/utils";
import { isQuotationStep1Valid, isQuotationStep2Valid } from "@/utils/validation";
import PreviewModal from "../PreviewModal";
import dayjs from "dayjs";
import styles from "./styles.module.css";

const { Text } = Typography;

const STEPS = [
  { title: "Details" },
  { title: "Items" },
];

const QuotationDrawer = ({ open, onClose, onSubmit, editingQuotation }) => {
  const [current, setCurrent] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [date, setDate] = useState(dayjs());
  const [validDays, setValidDays] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [vatPercent, setVatPercent] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState([{ id: 1, name: "", unit: "NOS", qty: 0, rate: 0, discount: 0, total: 0 }]);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchCustomers();
      if (!editingQuotation) resetAll();
    }
  }, [open]);

  const fetchCustomers = async () => {
    try {
      const res = await getAllCustomers();
      setCustomers((res.results || []).map(normalizeCustomer));
    } catch {
      setCustomers([]);
    }
  };

  const resetAll = () => {
    setCurrent(0);
    setSelectedCustomer(null);
    setIsNewCustomer(false);
    setNewCustomerName("");
    setDate(dayjs());
    setValidDays("");
    setPaymentTerms("");
    setVatPercent(0);
    setDiscount(0);
    setItems([{ id: 1, name: "", unit: "NOS", qty: 0, rate: 0, discount: 0, total: 0 }]);
  };

  const handleCustomerSelect = (customerId) => {
    const cust = customers.find((c) => c.id === customerId);
    if (cust) {
      setSelectedCustomer(cust);
      setIsNewCustomer(false);
      setNewCustomerName("");
    }
  };

  const handleNewCustomerToggle = () => {
    setIsNewCustomer(!isNewCustomer);
    setSelectedCustomer(null);
    setNewCustomerName("");
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    if (field === "qty" || field === "rate" || field === "discount") {
      const qty = updated[index].qty || 0;
      const rate = updated[index].rate || 0;
      const disc = updated[index].discount || 0;
      const subtotal = qty * rate;
      updated[index].total = subtotal - (subtotal * disc / 100);
    }
    setItems(updated);
  };

  const addItem = () => {
    setItems([...items, { id: Date.now(), name: "", unit: "NOS", qty: 0, rate: 0, discount: 0, total: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  };

  const itemsTotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const vatAmount = itemsTotal * (vatPercent || 0) / 100;
  const grandTotal = itemsTotal + vatAmount - (discount || 0);

  const customerOptions = customers.map((c) => ({ label: c.name, value: c.id }));

  const step1Valid = isQuotationStep1Valid(selectedCustomer, newCustomerName, isNewCustomer);
  const step2Valid = isQuotationStep2Valid(items);

  const getPreviewData = () => ({
    customer: selectedCustomer || { name: newCustomerName },
    date: date?.format?.("DD/MM/YYYY") || "",
    validDays,
    paymentTerms,
    vatPercent,
    vatAmount,
    discount,
    items,
    itemsTotal,
    grandTotal,
  });

  const handleSubmit = () => {
    onSubmit(getPreviewData());
    resetAll();
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
        body: { padding: 0, display: "flex", flexDirection: "column", overflow: "hidden" },
        footer: { borderTop: "1px solid var(--color-border-light)", padding: "14px 24px" },
      }}
      footer={
        <div className={styles.drawerFooter}>
          {current > 0 && <AppButton type="default" onClick={prev}>Back</AppButton>}
          <div style={{ flex: 1 }} />
          <AppButton type="default" onClick={() => setPreviewOpen(true)} className="btn-preview">Preview</AppButton>
          {current === 0 && (
            <AppButton type="primary" onClick={next} className="btn-dark" disabled={!step1Valid}>Next</AppButton>
          )}
          {current === 1 && (
            <AppButton type="primary" onClick={handleSubmit} className="btn-dark" disabled={!step2Valid}>
              {editingQuotation ? "Update Quotation" : "Create Quotation"}
            </AppButton>
          )}
        </div>
      }
    >
      <div className={styles.stepsBar}>
        <Steps current={current} items={STEPS} size="small" />
      </div>

      <div className={styles.stepContent}>
        {/* Step 1: Details */}
        {current === 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Quotation Details</h3>

            <div className={styles.detailsCard}>
            <Row gutter={16}>
              <Col span={12}>
                <AppInput label="Date">
                  <DatePicker value={date} onChange={setDate} style={{ width: "100%" }} />
                </AppInput>
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
                    placeholder="Select customer"
                    options={[
                      { label: "+ Add New Customer", value: "__new__" },
                      ...customerOptions,
                    ]}
                    showSearch
                    filterOption={(input, option) => {
                      if (option.value === "__new__") return true;
                      return (option?.label ?? "").toLowerCase().includes(input.toLowerCase());
                    }}
                    onChange={(val) => {
                      if (val === "__new__") {
                        setIsNewCustomer(true);
                        setSelectedCustomer(null);
                        setNewCustomerName("");
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
                <AppInput label="Valid Days" placeholder="e.g. 30" value={validDays} onChange={(e) => setValidDays(e.target.value)} />
              </Col>
              <Col span={12}>
                <AppInput label="Payment Terms" placeholder="e.g. Net 30" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <AppInput label="VAT (%)" type="number" min={0} max={100} value={vatPercent} onChange={(val) => setVatPercent(val)} placeholder="0" />
              </Col>
              <Col span={12}>
                <AppInput label="Discount (Amount)" type="number" min={0} value={discount} onChange={(val) => setDiscount(val)} placeholder="0" />
              </Col>
            </Row>
            </div>
          </div>
        )}

        {/* Step 2: Items */}
        {current === 1 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Quotation Items</h3>

            {items.map((item, index) => (
              <div key={item.id} className={styles.itemCard}>
                <div className={styles.itemHeader}>
                  <span className={styles.itemBadge}>{index + 1}</span>
                  <span className={styles.itemHeaderLabel}>{item.name || `Item ${index + 1}`}</span>
                  <span className={styles.itemHeaderSpacer} />
                  <span className={styles.itemHeaderTotal}>{formatCurrency(item.total || 0)}</span>
                  {items.length > 1 && (
                    <AppButton type="text" icon={<DeleteOutlined />} size="small" danger onClick={() => removeItem(index)} />
                  )}
                </div>
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
                    <AppInput label="Qty" type="number" min={0} value={item.qty} onChange={(val) => handleItemChange(index, "qty", val)} />
                  </Col>
                  <Col span={6}>
                    <AppInput label="Rate" type="number" min={0} value={item.rate} onChange={(val) => handleItemChange(index, "rate", val)} />
                  </Col>
                  <Col span={6}>
                    <AppInput label="Disc (%)" type="number" min={0} max={100} value={item.discount} onChange={(val) => handleItemChange(index, "discount", val)} placeholder="%" />
                  </Col>
                  <Col span={6}>
                    <AppInput label="Total" type="number" value={item.total} disabled />
                  </Col>
                </Row>
              </div>
            ))}

            <AppButton type="default" icon={<PlusOutlined />} onClick={addItem} block className={styles.addItemBtn}>
              Add Another Item
            </AppButton>

            <div className={styles.summaryBox}>
              <div className={styles.summaryRow}>
                <Text style={{ color: "var(--color-text-secondary)" }}>Items Total</Text>
                <Text style={{ fontWeight: 700, color: "var(--color-text)" }}>{formatCurrency(itemsTotal)}</Text>
              </div>
              {vatPercent > 0 && (
                <div className={styles.summaryRow}>
                  <Text style={{ color: "var(--color-text-secondary)" }}>VAT ({vatPercent}%)</Text>
                  <Text style={{ fontWeight: 700, color: "var(--color-text)" }}>{formatCurrency(vatAmount)}</Text>
                </div>
              )}
              {discount > 0 && (
                <div className={styles.summaryRow}>
                  <Text style={{ color: "var(--color-text-secondary)" }}>Discount</Text>
                  <Text style={{ fontWeight: 700, color: "#ef4444" }}>- {formatCurrency(discount)}</Text>
                </div>
              )}
              <div className={styles.summaryRow}>
                <Text style={{ fontSize: 15, fontWeight: 700 }}>Grand Total</Text>
                <Text style={{ fontSize: 18, fontWeight: 800, color: "var(--color-text)" }}>{formatCurrency(grandTotal)}</Text>
              </div>
            </div>
          </div>
        )}
      </div>

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
