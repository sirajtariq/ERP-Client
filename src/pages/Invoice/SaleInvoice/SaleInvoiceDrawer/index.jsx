import { useState, useEffect, useCallback } from "react";
import { Drawer, Steps, DatePicker, Row, Col, Divider, Typography, message, Modal, Tooltip, Tag } from "antd";
import dayjs from "dayjs";
import { useForm, Controller } from "react-hook-form";
import { PlusOutlined, DeleteOutlined, EditOutlined, TeamOutlined, UserAddOutlined, DatabaseOutlined, AppstoreAddOutlined } from "@ant-design/icons";
import _ from "lodash";
import { AppButton, AppInput, AppSelect } from "@/components/common";
import { getAllCustomers, normalizeCustomer } from "@/services/customerService";
import { getAllVendors, normalizeVendor } from "@/services/supplierService";
import { getItems as getInventoryItems, getItemById } from "@/services/inventoryService";
import { createSaleInvoice, updateSaleInvoice } from "@/services/saleInvoiceService";
import { createPurchaseInvoice, updatePurchaseInvoice } from "@/services/purchaseInvoiceService";
import NewInventoryItemModal from "./NewInventoryItemModal";
import { useInfiniteScroll } from "@/hooks";
import { formatCurrency } from "@/utils";
import InvoicePreview from "../SaleInvoiceModal";
import styles from "./styles.module.css";

const { Text } = Typography;

const PAGE_SIZE = 10;

const getSteps = (type) => [
  { title: type === "purchase" ? "Vendor" : "Customer" },
  { title: "Items" },
  { title: "Payment" },
];

const InvoiceDrawer = ({ open, onClose, onSubmit, editingInvoice, type = "sale" }) => {
  const label       = type === "purchase" ? "Purchase" : "Sale";
  const isPurchase  = type === "purchase";
  const entityName  = isPurchase ? "Vendor" : "Customer";

  const [current, setCurrent]               = useState(0);
  const [customers, setCustomers]           = useState([]);
  const [customerPage, setCustomerPage]     = useState({ current: 0, size: PAGE_SIZE, total: 0 });
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerLoading, setCustomerLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isNewCustomer, setIsNewCustomer]   = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const emptyItem = () => ({ id: Date.now(), inventoryItemId: null, code: "", name: "", unit: "NOS", purchaseRate: 0, inventorySaleRate: 0, rate: 0, qty: 0, discount: 0, total: 0, currentStock: null });
  const [items, setItems]                   = useState([emptyItem()]);

  // ── Inventory items (sale invoice only) ──
  const [invItems,   setInvItems]   = useState([]);
  const [invPage,    setInvPage]    = useState({ current: 0, size: PAGE_SIZE, total: 0 });
  const [invSearch,  setInvSearch]  = useState("");
  const [invLoading, setInvLoading] = useState(false);
  const [payment, setPayment]               = useState({ method: "Cash", terms: "Cash", paidAmount: 0, note: "", vatPercentage: "", invoiceDiscount: "", paymentReference: "" });
  const [invoiceStatus, setInvoiceStatus]   = useState("Draft");
  const [previewOpen, setPreviewOpen]       = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [nextLoading, setNextLoading]       = useState(false);
  const [confirmModal, setConfirmModal]     = useState(null);
  const [newInvModal, setNewInvModal]       = useState(false);
  const [editingNewItem, setEditingNewItem] = useState(null); // item index or null

  const { control, reset: resetForm, watch, setValue, formState: { errors } } = useForm({
    mode: "onTouched",
    defaultValues: { phone: "", invoiceNo: "Auto Generated", taxNumber: "", billNumber: "", creditBalance: 0, date: dayjs() },
  });

  const formValues = watch();

  useEffect(() => {
    if (open) {
      setInvItems([]);
      setInvPage({ current: 0, size: PAGE_SIZE, total: 0 });
      setInvSearch("");

      if (isPurchase && editingInvoice) {
        populateFromInvoice(editingInvoice);
        // Pre-fetch inventory items for linked purchase items
        const ids = (editingInvoice.items || [])
          .map((i) => i.itemId)
          .filter(Boolean);
        if (ids.length) {
          Promise.all(ids.map((id) => getItemById(id).catch(() => null)))
            .then((results) => {
              const valid = results.filter(Boolean);
              if (valid.length) setInvItems(valid);
            });
        }
      } else {
        fetchCustomers(0, "");
        if (editingInvoice) {
          populateFromInvoice(editingInvoice);
          // Pre-fetch inventory items for linked sale items
          const ids = (editingInvoice.items || [])
            .map((i) => i.inventoryItemId)
            .filter(Boolean);
          if (ids.length) {
            Promise.all(ids.map((id) => getItemById(id).catch(() => null)))
              .then((results) => {
                const valid = results.filter(Boolean);
                if (valid.length) setInvItems(valid);
              });
          }
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

  const fetchInvItems = async (pageNo = 0, searchQuery = "") => {
    setInvLoading(true);
    try {
      const res = await getInventoryItems({
        page: pageNo + 1,
        pageSize: PAGE_SIZE,
        search: searchQuery,
        itemType: isPurchase ? "product" : "",
      });
      const results = res.results || [];
      setInvItems((prev) => (pageNo === 0 ? results : [...prev, ...results]));
      setInvPage((prev) => ({ ...prev, current: pageNo, total: res.count || 0 }));
    } catch {
      if (pageNo === 0) setInvItems([]);
    } finally {
      setInvLoading(false);
    }
  };

  // When inventory loads, backfill purchaseRate / inventorySaleRate / code for items that have an inventoryItemId
  useEffect(() => {
    if (invItems.length === 0) return;
    setItems((prev) =>
      prev.map((item) => {
        if (!item.inventoryItemId) return item;
        const inv = invItems.find((i) => i.id === item.inventoryItemId);
        if (!inv) return item;
        return {
          ...item,
          code:              inv.itemCode                  || item.code,
          itemType:          inv.itemType                  || "product",
          purchaseRate:      Number(inv.purchaseRate)      || 0,
          inventorySaleRate: Number(inv.saleRate)          || 0,
          currentStock:      parseFloat(inv.currentStock)  ?? 0,
        };
      })
    );
  }, [invItems]);

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
    const updated           = [...items];
    const itemType          = inv.itemType || "product";
    const qty               = itemType === "service" ? 1 : (updated[index].qty || 0);
    const discount          = updated[index].discount || 0;
    const inventorySaleRate = Number(inv.saleRate)    || 0;
    const purchaseRate      = Number(inv.purchaseRate) || 0;
    const defaultRate       = isPurchase ? purchaseRate : inventorySaleRate;
    const subtotal          = qty * defaultRate;
    updated[index] = {
      ...updated[index],
      inventoryItemId,
      code:             inv.itemCode || "",
      name:             inv.name     || "",
      unit:             inv.unit     || "",
      itemType,
      qty,
      purchaseRate,
      inventorySaleRate,
      rate:             defaultRate,
      total:            subtotal - (subtotal * discount / 100),
      currentStock:     parseFloat(inv.currentStock) ?? 0,
    };
    setItems(updated);
    // Reset search so next dropdown shows full list
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

  // Called when user confirms a new inventory item from the modal (add or edit)
  const handleNewInventoryAdd = (invData) => {
    if (editingNewItem !== null) {
      setItems((prev) => prev.map((item, i) =>
        i === editingNewItem
          ? {
              ...item,
              inventoryData:    invData,
              code:             invData.itemCode,
              name:             invData.name,
              unit:             invData.unit || "",
              purchaseRate:     Number(invData.purchaseRate) || 0,
              inventorySaleRate: Number(invData.saleRate)   || 0,
              rate:             Number(invData.purchaseRate) || 0,
            }
          : item
      ));
      setEditingNewItem(null);
    } else {
      const newItem = {
        id:               Date.now(),
        isNew:            true,
        inventoryData:    invData,
        inventoryItemId:  null,
        code:             invData.itemCode,
        name:             invData.name,
        unit:             invData.unit || "",
        purchaseRate:     Number(invData.purchaseRate) || 0,
        inventorySaleRate: Number(invData.saleRate)   || 0,
        rate:             Number(invData.purchaseRate) || 0,
        qty:              0,
        discount:         0,
        total:            0,
      };
      setItems((prev) => [...prev, newItem]);
    }
    setNewInvModal(false);
  };

  const handleEditNewItem = (index) => {
    setEditingNewItem(index);
    setNewInvModal(true);
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
          id:               item.id                        || Date.now(),
          inventoryItemId:  item.itemId                    || null,
          code:             item.itemCode                  || "",
          name:             item.itemName || item.productName || item.name || item.itemCode || "",
          unit:             item.units       || item.unit  || "NOS",
          purchaseRate:     0,
          inventorySaleRate: 0,
          qty:              parseFloat(item.quantity)      || 0,
          rate:             parseFloat(item.unitPrice || item.purchasePrice || item.rate) || 0,
          discount:         parseFloat(item.discount)      || 0,
          total:            parseFloat(item.total)         || 0,
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
          id:               item.id              || Date.now(),
          inventoryItemId:  item.inventoryItemId || null,
          code:             item.itemCode        || "",
          name:             item.name || item.itemCode || "",
          unit:             item.unit            || "",
          purchaseRate:     0,
          inventorySaleRate: 0,
          rate:             item.rate            || 0,
          qty:              item.qty             || 0,
          discount:         item.discount        || 0,
          total:            item.total           || 0,
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

  const invDiscPct = parseFloat(payment.invoiceDiscount) || 0;
  const vatPct     = parseFloat(payment.vatPercentage)   || 0;
  const invDiscAmt = grandTotal * invDiscPct / 100;
  const afterDisc  = grandTotal - invDiscAmt;
  const vatAmt     = afterDisc * vatPct / 100;
  const netTotal   = afterDisc + vatAmt;

  // Auto-derive Payment Term based on netTotal (items − invoice discount + VAT)
  useEffect(() => {
    let term;
    if (isWalkin) {
      term = "Cash";
    } else {
      const paid = parseFloat(payment.paidAmount) || 0;
      term = paid >= netTotal ? "Cash" : "Credit";
    }
    setPayment((prev) => (prev.terms === term ? prev : { ...prev, terms: term }));
  }, [isWalkin, payment.paidAmount, netTotal]);

  const resetAll = () => {
    setCurrent(0);
    setSelectedCustomer(null);
    setIsNewCustomer(false);
    setNewCustomerName("");
    setCustomerSearch("");
    setCustomerPage({ current: 0, size: PAGE_SIZE, total: 0 });
    resetForm({ phone: "", invoiceNo: "Auto Generated", taxNumber: "", billNumber: "", creditBalance: 0, date: dayjs() });
    setItems([emptyItem()]);
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

  const addItem = () => setItems([...items, emptyItem()]);

  const removeItem = (index) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  };

  const doCreateInvoice = async (termsOverride = null) => {
    const paidAmount     = parseFloat(payment.paidAmount) || 0;
    const effectiveTerms = termsOverride || payment.terms;
    const invoiceDate    = formValues.date ? formValues.date.format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD");

    setSubmitting(true);
    try {
      // ── Step 1 (purchase only, new invoices only): create new inventory items first ──
      // ── Build invoice payload ──
      let payload;

      if (isPurchase) {
        payload = {
          vendor: {
            id:         selectedCustomer?.id,
            vendorName: selectedCustomer?.name || newCustomerName,
            phone:      formValues.phone || selectedCustomer?.phone || null,
          },
          billNumber:       formValues.billNumber    || null,
          date:             invoiceDate,
          paymentTerm:      effectiveTerms,
          paymentMethod:    payment.method           || null,
          paidAmount:       String(paidAmount),
          paymentReference: payment.paymentReference || "",
          notes:            payment.note             || "",
          vatPercentage:    payment.vatPercentage    ? String(payment.vatPercentage)   : "0",
          invoiceDiscount:  payment.invoiceDiscount  ? String(payment.invoiceDiscount) : "0",
          status:           invoiceStatus,
          items: mappedItems.map((item) => {
            if (item.isNew) {
              return {
                isNew:    true,
                itemId:   0,
                itemCode: item.inventoryData?.itemCode || item.code || "",
                itemName: item.name,
                units:    item.unit || "",
                quantity: String(Number(item.qty)      || 0),
                unitPrice: String(Number(item.rate)    || 0),
                discount:  String(Number(item.discount) || 0),
                category:  item.inventoryData?.category || "",
                saleRate:  String(item.inventoryData?.saleRate || 0),
              };
            }
            return {
              itemName: item.name,
              units:    item.unit || "",
              quantity: String(Number(item.qty)      || 0),
              unitPrice: String(Number(item.rate)    || 0),
              discount:  String(Number(item.discount) || 0),
              ...(item.inventoryItemId ? { itemId: item.inventoryItemId, itemCode: item.code } : {}),
            };
          }),
        };
      } else {
        payload = {
          date:              invoiceDate,
          customer_data: {
            customer_id:   selectedCustomer ? selectedCustomer.customerId : null,
            customer_name: selectedCustomer ? selectedCustomer.name : newCustomerName,
            phone:         selectedCustomer ? (selectedCustomer.phone || formValues.phone || null) : (formValues.phone || null),
            customer_type: "walkin",
            tax_number:    formValues.taxNumber || null,
          },
          payment_term:      effectiveTerms,
          payment_method:    payment.method           || null,
          paid_amount:       String(paidAmount),
          payment_reference: payment.paymentReference || null,
          notes:             payment.note             || null,
          vat_percentage:    payment.vatPercentage    ? String(payment.vatPercentage)   : "0",
          invoice_discount:  payment.invoiceDiscount  ? String(payment.invoiceDiscount) : "0",
          invoiceStatus:     invoiceStatus,
          items: mappedItems.map((item) => ({
            name:      item.name,
            units:     item.unit || "",
            quantity:  String(Number(item.qty)  || 0),
            unitPrice: String(Number(item.rate) || 0),
            discount:  String(Number(item.discount) || 0),
            ...(item.inventoryItemId ? { itemId: item.inventoryItemId, itemCode: item.code } : {}),
          })),
        };
      }

      // ── Step 3: create / update invoice ──
      if (isPurchase) {
        if (editingInvoice) await updatePurchaseInvoice(editingInvoice.id, payload);
        else                await createPurchaseInvoice(payload);
      } else {
        if (editingInvoice) await updateSaleInvoice(editingInvoice.id, payload);
        else                await createSaleInvoice(payload);
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

  const handleSubmit = () => {
    if (!mappedItems.length) {
      message.warning("Please add at least one item with a name and quantity.");
      return;
    }
    const paid = parseFloat(payment.paidAmount) || 0;
    if (!isPurchase) {
      if (isWalkin) {
        if (paid < netTotal || payment.terms !== "Cash") {
          setConfirmModal({ type: "walkin" });
          return;
        }
      } else if (payment.terms === "Cash" && paid < netTotal && netTotal > 0) {
        setConfirmModal({ type: "underpaid" });
        return;
      } else if (payment.terms === "Credit" && paid >= netTotal && netTotal > 0) {
        setConfirmModal({ type: "fullpaid_credit" });
        return;
      }
    } else {
      if (payment.terms === "Cash" && paid < netTotal && netTotal > 0) {
        setConfirmModal({ type: "underpaid" });
        return;
      } else if (payment.terms === "Credit" && paid >= netTotal && netTotal > 0) {
        setConfirmModal({ type: "fullpaid_credit" });
        return;
      }
    }
    doCreateInvoice();
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

  // Supplier Bill Number is mandatory for purchase invoices — block leaving step 1 without it.
  const step1Valid = isPurchase
    ? !!selectedCustomer && !!formValues.billNumber
    : (!!selectedCustomer || (isNewCustomer && !!newCustomerName.trim())) && !!String(formValues.phone || "").trim();
  const step2Valid = items.length > 0
    && items.every((item) => item.name && item.qty > 0 && item.rate > 0)
    && (!isPurchase
      ? items.every((item) =>
          !item.inventoryItemId || item.currentStock === null || item.itemType === "service" || item.qty <= item.currentStock
        )
      : true);

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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: 36 }}>
          <span style={{ fontWeight: 700, fontSize: 17, color: "var(--color-text)" }}>
            {editingInvoice ? `Edit ${label} Invoice` : `Create ${label} Invoice`}
          </span>
          {current === 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {isPurchase && (
                <AppButton
                  type="default"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => { setEditingNewItem(null); setNewInvModal(true); }}
                  style={{ borderColor: "#7c5cfc", color: "#7c5cfc", fontWeight: 600 }}
                >
                  New Inventory Item
                </AppButton>
              )}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.4px" }}>Grand Total</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text)" }}>{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          )}
        </div>
      }
      open={open}
      onClose={() => { onClose(); resetAll(); }}
      width={780}
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
            <AppButton type="primary" onClick={next} className="btn-dark" loading={nextLoading} disabled={(current === 0 && !step1Valid) || (current === 1 && !step2Valid)}>Next</AppButton>
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
        {/* Step 1: Customer / Vendor */}
        {current === 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{entityName} Details</h3>
            <section className={styles.detailsCard}>
              <Row gutter={16}>
                <Col span={12}>
                  <AppInput
                    label="Code"
                    placeholder="—"
                    value={isPurchase ? (selectedCustomer?.vendorId || "") : (selectedCustomer?.customerId || "")}
                    onChange={() => {}}
                    disabled
                  />
                </Col>
                <Col span={12}>
                  {isNewCustomer ? (
                    <AppInput
                      label={
                        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {entityName} Name
                          <Tag color="green" style={{ fontSize: 10, padding: "0 5px", lineHeight: "16px", marginLeft: 2 }}>New</Tag>
                        </span>
                      }
                      placeholder={`Enter new ${entityName.toLowerCase()} name`}
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      suffix={
                        <Tooltip title={`Select existing ${entityName.toLowerCase()}`}>
                          <TeamOutlined
                            style={{ color: "#7c5cfc", cursor: "pointer", fontSize: 15 }}
                            onClick={handleNewCustomerToggle}
                          />
                        </Tooltip>
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
                    <AppInput {...field} label="Phone" name="phone" placeholder="Phone number" required disabled={!isWalkin && !!selectedCustomer} />
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
                    <AppInput {...field} label="Tax Number / NTN" name="taxNumber" placeholder="Tax number" disabled={isPurchase || (!isWalkin && !!selectedCustomer)} />
                  )} />
                </Col>
              </Row>
              {isPurchase && (
                <Row gutter={16}>
                  <Col span={12}>
                    <Controller
                      name="billNumber"
                      control={control}
                      rules={{ required: "Vendor bill number is required" }}
                      render={({ field }) => (
                        <AppInput {...field} label="Vendor Bill Number" name="billNumber" placeholder="Enter vendor bill number" required errors={errors} />
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
            {items.map((item, index) => (
              <section key={item.id} className={styles.itemCard}>
                <section className={styles.itemHeader}>
                  <span className={styles.itemBadge}>{index + 1}</span>
                  <span className={styles.itemHeaderLabel}>{item.name || `Item ${index + 1}`}</span>
                  {!isPurchase && item.itemType === "service" && (
                    <Tag color="purple" style={{ fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "0 5px", lineHeight: "16px", margin: 0 }}>SERVICE</Tag>
                  )}
                  <span className={styles.itemHeaderSpacer} />
                  <span className={styles.itemHeaderTotal}>{formatCurrency(item.total || 0)}</span>
                  {item.isNew && (
                    <AppButton type="text" icon={<EditOutlined />} size="small" onClick={() => handleEditNewItem(index)} style={{ color: "#7c5cfc", padding: "0 4px" }} />
                  )}
                  {items.length > 1 && (
                    <AppButton type="text" icon={<DeleteOutlined />} size="small" danger onClick={() => removeItem(index)} />
                  )}
                </section>
                {/* Sale invoice: inventory select */}
                {!isPurchase && (
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

                    {item.inventoryItemId && item.currentStock !== null && item.itemType !== "service" && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 6, marginBottom: 4,
                        padding: "5px 10px", borderRadius: 7,
                        background: item.currentStock <= 0
                          ? "rgba(239,68,68,0.08)"
                          : "rgba(34,197,94,0.07)",
                        border: `1px solid ${item.currentStock <= 0 ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`,
                      }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)" }}>Stock Available:</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: item.currentStock <= 0 ? "#dc2626" : "#16a34a" }}>
                          {item.currentStock <= 0 ? "Out of Stock" : `${item.currentStock} ${item.unit || "units"}`}
                        </span>
                      </div>
                    )}

                    {/* Rate input */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>
                          {item.itemType === "service" ? "Your Billing Rate" : "Your Sale Rate"} <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>
                        </label>
                        {item.inventoryItemId && item.rate > 0 && item.purchaseRate > 0 && (() => {
                          const profit = item.rate - item.purchaseRate;
                          const margin = ((profit / item.purchaseRate) * 100).toFixed(1);
                          const isLoss = profit < 0;
                          return (
                            <div className={`${styles.profitBadge} ${isLoss ? styles.profitBadgeLoss : styles.profitBadgeProfit}`}>
                              {isLoss ? "⚠" : "✓"}
                              {isLoss
                                ? `Loss −${formatCurrency(Math.abs(profit))} (${Math.abs(margin)}%)`
                                : `Profit +${formatCurrency(profit)} (${margin}%)`}
                            </div>
                          );
                        })()}
                      </div>
                      <AppInput inputType="number" min={0} value={item.rate} onChange={(val) => handleItemChange(index, "rate", val)} />
                      {(item.purchaseRate > 0 || item.inventorySaleRate > 0) && (
                        <div className={styles.rateRefStrip}>
                          {item.purchaseRate > 0 && (
                            <span className={`${styles.rateRefBadge} ${styles.rateRefBadgePurchase}`}>
                              Purchase Ref · {formatCurrency(item.purchaseRate)}
                            </span>
                          )}
                          {item.inventorySaleRate > 0 && (
                            <span className={`${styles.rateRefBadge} ${styles.rateRefBadgeSale}`}>
                              Sale Ref · {formatCurrency(item.inventorySaleRate)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <Row gutter={12} style={{ marginTop: 8 }}>
                      <Col span={8}>
                        <AppInput
                          label="Qty"
                          required
                          inputType="number"
                          min={0}
                          value={item.itemType === "service" ? 1 : item.qty}
                          onChange={(val) => handleItemChange(index, "qty", val)}
                          disabled={item.itemType === "service"}
                          status={item.inventoryItemId && item.currentStock !== null && item.itemType !== "service" && item.qty > item.currentStock ? "error" : ""}
                        />
                      </Col>
                      <Col span={8}>
                        <AppInput label="Discount (%)" inputType="number" min={0} max={100} value={item.discount} onChange={(val) => handleItemChange(index, "discount", val)} placeholder="%" />
                      </Col>
                      <Col span={8}>
                        <AppInput label="Total" inputType="number" value={item.total} disabled />
                      </Col>
                    </Row>
                    {item.inventoryItemId && item.currentStock !== null && item.itemType !== "service" && item.qty > item.currentStock && item.currentStock > 0 && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 6, marginTop: 6,
                        padding: "5px 10px", borderRadius: 7,
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.25)",
                      }}>
                        <span style={{ fontSize: 11, color: "#dc2626" }}>⚠</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#dc2626" }}>
                          Qty exceeds available stock ({item.currentStock} {item.unit || "units"})
                        </span>
                      </div>
                    )}
                    {item.inventoryItemId && item.currentStock !== null && item.itemType !== "service" && item.currentStock <= 0 && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 6, marginTop: 6,
                        padding: "5px 10px", borderRadius: 7,
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.25)",
                      }}>
                        <span style={{ fontSize: 11, color: "#dc2626" }}>⚠</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#dc2626" }}>
                          This item is out of stock
                        </span>
                      </div>
                    )}
                  </>
                )}

                {/* Purchase invoice: new inventory item (added via modal) */}
                {isPurchase && item.isNew && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "8px 12px", background: "rgba(124,92,252,0.07)", borderRadius: 8, border: "1px solid rgba(124,92,252,0.2)" }}>
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Code:</span>
                      <span style={{ fontWeight: 600, fontSize: 13, color: "var(--color-text)" }}>{item.code}</span>
                      <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#7c5cfc", background: "rgba(124,92,252,0.12)", padding: "2px 8px", borderRadius: 12, border: "1px solid rgba(124,92,252,0.3)" }}>
                        NEW — will be added to inventory
                      </span>
                    </div>
                    <Row gutter={12}>
                      <Col span={12}>
                        <AppInput label="Unit" value={item.unit} disabled onChange={() => {}} placeholder="—" />
                      </Col>
                      <Col span={12}>
                        <AppInput label="Category" value={item.inventoryData?.category || "—"} disabled onChange={() => {}} />
                      </Col>
                    </Row>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>Purchase Price <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span></label>
                        {item.rate > 0 && item.purchaseRate > 0 && (() => {
                          const diff = item.rate - item.purchaseRate;
                          const pct  = ((diff / item.purchaseRate) * 100).toFixed(1);
                          const isMore = diff > 0;
                          return (
                            <div className={`${styles.profitBadge} ${isMore ? styles.profitBadgeLoss : styles.profitBadgeProfit}`}>
                              {isMore ? "⚠" : "✓"}
                              {isMore
                                ? `Paying More +${formatCurrency(diff)} (${pct}%)`
                                : diff < 0 ? `Saving ${formatCurrency(Math.abs(diff))} (${Math.abs(pct)}%)` : "At Typical Rate"}
                            </div>
                          );
                        })()}
                      </div>
                      <AppInput inputType="number" min={0} value={item.rate} onChange={(val) => handleItemChange(index, "rate", val)} />
                      {(item.purchaseRate > 0 || item.inventorySaleRate > 0) && (
                        <div className={styles.rateRefStrip}>
                          {item.purchaseRate > 0 && (
                            <span className={`${styles.rateRefBadge} ${styles.rateRefBadgePurchase}`}>
                              Purchase Ref · {formatCurrency(item.purchaseRate)}
                            </span>
                          )}
                          {item.inventorySaleRate > 0 && (
                            <span className={`${styles.rateRefBadge} ${styles.rateRefBadgeSale}`}>
                              Sale Ref · {formatCurrency(item.inventorySaleRate)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <Row gutter={12} style={{ marginTop: 8 }}>
                      <Col span={8}>
                        <AppInput label="Qty" required inputType="number" min={0} value={item.qty} onChange={(val) => handleItemChange(index, "qty", val)} />
                      </Col>
                      <Col span={8}>
                        <AppInput label="Discount (%)" inputType="number" min={0} max={100} value={item.discount} onChange={(val) => handleItemChange(index, "discount", val)} placeholder="%" />
                      </Col>
                      <Col span={8}>
                        <AppInput label="Total" inputType="number" value={item.total} disabled />
                      </Col>
                    </Row>
                  </>
                )}

                {/* Purchase invoice: existing inventory select layout */}
                {isPurchase && !item.isNew && (
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

                    {/* Purchase rate input */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>Purchase Price <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span></label>
                        {item.inventoryItemId && item.rate > 0 && item.purchaseRate > 0 && (() => {
                          const diff   = item.rate - item.purchaseRate;
                          const pct    = ((diff / item.purchaseRate) * 100).toFixed(1);
                          const isMore = diff > 0;
                          return (
                            <div className={`${styles.profitBadge} ${isMore ? styles.profitBadgeLoss : styles.profitBadgeProfit}`}>
                              {isMore ? "⚠" : "✓"}
                              {isMore
                                ? `Paying More +${formatCurrency(diff)} (${pct}%)`
                                : diff < 0
                                  ? `Saving ${formatCurrency(Math.abs(diff))} (${Math.abs(pct)}%)`
                                  : "At Typical Rate"}
                            </div>
                          );
                        })()}
                      </div>
                      <AppInput inputType="number" min={0} value={item.rate} onChange={(val) => handleItemChange(index, "rate", val)} />
                      {(item.purchaseRate > 0 || item.inventorySaleRate > 0) && (
                        <div className={styles.rateRefStrip}>
                          {item.purchaseRate > 0 && (
                            <span className={`${styles.rateRefBadge} ${styles.rateRefBadgePurchase}`}>
                              Purchase Ref · {formatCurrency(item.purchaseRate)}
                            </span>
                          )}
                          {item.inventorySaleRate > 0 && (
                            <span className={`${styles.rateRefBadge} ${styles.rateRefBadgeSale}`}>
                              Sale Ref · {formatCurrency(item.inventorySaleRate)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <Row gutter={12} style={{ marginTop: 8 }}>
                      <Col span={8}>
                        <AppInput label="Qty" required inputType="number" min={0} value={item.qty} onChange={(val) => handleItemChange(index, "qty", val)} />
                      </Col>
                      <Col span={8}>
                        <AppInput label="Discount (%)" inputType="number" min={0} max={100} value={item.discount} onChange={(val) => handleItemChange(index, "discount", val)} placeholder="%" />
                      </Col>
                      <Col span={8}>
                        <AppInput label="Total" inputType="number" value={item.total} disabled />
                      </Col>
                    </Row>
                  </>
                )}
              </section>
            ))}

              {!isPurchase && (
                <button type="button" className={styles.addCardBtn} onClick={addItem}>
                  <span className={styles.addCardBtnIcon} style={{ background: "rgba(59,130,246,0.18)", color: "#3b82f6" }}>
                    <DatabaseOutlined />
                  </span>
                  <span className={styles.addCardBtnText}>
                    <span className={styles.addCardBtnTitle}>Add Item from Inventory</span>
                    <span className={styles.addCardBtnSub}>Search and select an existing item</span>
                  </span>
                  <PlusOutlined style={{ marginLeft: "auto", color: "#3b82f6", fontSize: 13, opacity: 0.6, flexShrink: 0 }} />
                </button>
              )}
              {isPurchase && (
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
                  <button type="button" className={`${styles.addCardBtn} ${styles.addCardBtnPurple}`} onClick={() => { setEditingNewItem(null); setNewInvModal(true); }}>
                    <span className={styles.addCardBtnIcon} style={{ background: "rgba(124,92,252,0.18)", color: "#7c5cfc" }}>
                      <AppstoreAddOutlined />
                    </span>
                    <span className={styles.addCardBtnText}>
                      <span className={styles.addCardBtnTitle}>New Inventory Item</span>
                      <span className={styles.addCardBtnSub}>Create & add to invoice</span>
                    </span>
                  </button>
                </div>
              )}
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

            {/* Live total card — updates as VAT / Invoice Discount changes */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexWrap: "wrap", gap: 8,
              padding: "12px 16px", borderRadius: 10,
              background: "var(--color-accent-bg)",
              border: "1px solid var(--color-accent-light)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 600 }}>Items Total</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)" }}>{formatCurrency(grandTotal)}</div>
                </div>
                {invDiscPct > 0 && (
                  <>
                    <div style={{ color: "var(--color-text-secondary)", fontSize: 16 }}>−</div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 600 }}>Discount ({invDiscPct}%)</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#ef4444" }}>{formatCurrency(invDiscAmt)}</div>
                    </div>
                  </>
                )}
                {vatPct > 0 && (
                  <>
                    <div style={{ color: "var(--color-text-secondary)", fontSize: 16 }}>+</div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 600 }}>VAT ({vatPct}%)</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)" }}>{formatCurrency(vatAmt)}</div>
                    </div>
                  </>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" }}>Grand Total</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-text)" }}>{formatCurrency(netTotal)}</div>
              </div>
            </div>
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
                  label="Invoice Discount (%)"
                  inputType="number"
                  min={0}
                  placeholder="0"
                  value={payment.invoiceDiscount}
                  onChange={(val) => setPayment({ ...payment, invoiceDiscount: val ?? "" })}
                />
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <AppInput
                  label="Payment Reference"
                  placeholder="e.g. CHQ-001"
                  value={payment.paymentReference}
                  onChange={(e) => setPayment({ ...payment, paymentReference: e.target.value })}
                />
              </Col>
            </Row>
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
                <Text style={{ color: "var(--color-text-secondary)" }}>Items Total</Text>
                <Text style={{ fontWeight: 700, color: "var(--color-text)" }}>{formatCurrency(grandTotal)}</Text>
              </section>
              {invDiscPct > 0 && (
                <section className={styles.summaryRow}>
                  <Text style={{ color: "var(--color-text-secondary)" }}>Invoice Discount ({invDiscPct}%)</Text>
                  <Text style={{ fontWeight: 700, color: "#ef4444" }}>− {formatCurrency(invDiscAmt)}</Text>
                </section>
              )}
              {vatPct > 0 && (
                <section className={styles.summaryRow}>
                  <Text style={{ color: "var(--color-text-secondary)" }}>VAT ({vatPct}%)</Text>
                  <Text style={{ fontWeight: 700, color: "var(--color-text)" }}>{formatCurrency(vatAmt)}</Text>
                </section>
              )}
              <section className={styles.summaryRow}>
                <Text style={{ fontSize: 14, fontWeight: 700 }}>Grand Total</Text>
                <Text style={{ fontWeight: 700, color: "var(--color-text)" }}>{formatCurrency(netTotal)}</Text>
              </section>
              <section className={styles.summaryRow}>
                <Text style={{ color: "var(--color-text-secondary)" }}>Paid Amount</Text>
                <Text style={{ fontWeight: 700, color: "#22c55e" }}>{formatCurrency(parseFloat(payment.paidAmount) || 0)}</Text>
              </section>
              <section className={styles.summaryRow}>
                <Text style={{ color: "var(--color-text-secondary)" }}>Remaining</Text>
                <Text style={{ fontWeight: 700, color: netTotal - (parseFloat(payment.paidAmount) || 0) > 0 ? "#ef4444" : "#22c55e" }}>
                  {formatCurrency(Math.max(0, netTotal - (parseFloat(payment.paidAmount) || 0)))}
                </Text>
              </section>
            </section>
          </section>
        )}
      </section>

      <NewInventoryItemModal
        open={newInvModal}
        onClose={() => { setNewInvModal(false); setEditingNewItem(null); }}
        onAdd={handleNewInventoryAdd}
        initialData={editingNewItem !== null ? items[editingNewItem]?.inventoryData ?? null : null}
      />

      <Modal
        open={!!confirmModal}
        onCancel={() => setConfirmModal(null)}
        footer={null}
        centered
        title={
          <span style={{ fontWeight: 700, color: confirmModal?.type === "walkin" ? "#dc2626" : "#d97706" }}>
            {confirmModal?.type === "walkin"        ? "Payment Required"  :
             confirmModal?.type === "fullpaid_credit" ? "Payment Term Mismatch" :
             "Payment Mismatch"}
          </span>
        }
      >
        {confirmModal?.type === "walkin" && (
          <>
            <p style={{ color: "var(--color-text)", marginBottom: 8 }}>
              Walk-in customers must pay the <strong>full amount in Cash</strong> before the invoice can be created.
            </p>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>
              Total: <strong>{formatCurrency(netTotal)}</strong> &nbsp;|&nbsp;
              Paid: <strong>{formatCurrency(parseFloat(payment.paidAmount) || 0)}</strong>
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <AppButton type="primary" className="btn-dark" onClick={() => setConfirmModal(null)}>OK, I'll Fix It</AppButton>
            </div>
          </>
        )}
        {confirmModal?.type === "underpaid" && (
          <>
            <p style={{ color: "var(--color-text)", marginBottom: 8 }}>
              Paid amount <strong>{formatCurrency(parseFloat(payment.paidAmount) || 0)}</strong> is less than
              the total <strong>{formatCurrency(netTotal)}</strong>.
            </p>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 13, marginBottom: 0 }}>
              Since the full amount hasn't been paid, the payment term should be <strong>Credit</strong>. How would you like to proceed?
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <AppButton type="default" onClick={() => setConfirmModal(null)}>Cancel</AppButton>
              <AppButton type="default" onClick={() => { setConfirmModal(null); doCreateInvoice(); }}>Proceed with Cash</AppButton>
              <AppButton type="primary" className="btn-dark" onClick={() => { setConfirmModal(null); doCreateInvoice("Credit"); }}>
                Set to Credit & Create
              </AppButton>
            </div>
          </>
        )}
        {confirmModal?.type === "fullpaid_credit" && (
          <>
            <p style={{ color: "var(--color-text)", marginBottom: 8 }}>
              Paid amount <strong>{formatCurrency(parseFloat(payment.paidAmount) || 0)}</strong> covers the full total <strong>{formatCurrency(netTotal)}</strong>.
            </p>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 13, marginBottom: 0 }}>
              Since the full amount is paid, payment term should be <strong>Cash</strong>, not Credit.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <AppButton type="default" onClick={() => setConfirmModal(null)}>Cancel</AppButton>
              <AppButton type="primary" className="btn-dark" onClick={() => { setConfirmModal(null); doCreateInvoice("Cash"); }}>
                Set to Cash & Create
              </AppButton>
            </div>
          </>
        )}
      </Modal>

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
