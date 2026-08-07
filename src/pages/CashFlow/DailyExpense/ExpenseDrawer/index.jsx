import { useState, useEffect } from "react";
import { Drawer, Steps, Row, Col, Typography, DatePicker, message } from "antd";
import { useForm, Controller } from "react-hook-form";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { AppButton, AppInput, AppSelect } from "@/components/common";
import { formatCurrency } from "@/utils";
import { expenseFormSchema } from "@/utils/validation";
import { EXPENSE_CATEGORY_OPTIONS as CATEGORIES, PAYMENT_METHOD_OPTIONS } from "@/constants/filterOptions";
import { createExpense, updateExpense } from "@/services/expenseService";
import ExpenseModal from "../ExpenseModal";
import styles from "./styles.module.css";

const { Text } = Typography;

const STEPS = [
  { title: "Details" },
  { title: "Items" },
];

const ExpenseDrawer = ({ open, onClose, onSubmit, editingExpense }) => {
  const [current, setCurrent] = useState(0);
  const [items, setItems] = useState([{ id: 1, detail: "", qty: 1, amount: 0 }]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit: rhfHandleSubmit,
    reset,
    watch,
    formState: { errors, isValid },
  } = useForm({
    mode: "onTouched",
    defaultValues: { category: null, customCategory: "", person: "", paidBy: "", paymentMethod: "Cash", description: "", date: dayjs() },
  });

  const watchedValues = watch();

  useEffect(() => {
    if (open) {
      if (editingExpense) {
        populateFromExpense(editingExpense);
      } else {
        resetAll();
      }
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetAll = () => {
    setCurrent(0);
    reset({ category: null, customCategory: "", person: "", paidBy: "", paymentMethod: "Cash", description: "", date: dayjs() });
    setItems([{ id: 1, detail: "", qty: 1, amount: 0 }]);
  };

  const populateFromExpense = (expense) => {
    setCurrent(0);
    const matched = CATEGORIES.find((c) => c.label === expense.category);
    reset({
      category:       matched ? matched.value : (expense.category ? "other" : null),
      customCategory: matched ? "" : (expense.category || ""),
      person:        expense.supplier      || "",
      paidBy:        expense.paidBy        || "",
      paymentMethod: expense.paymentMethod || "Cash",
      description:   expense.notes         || "",
      date:          expense.date ? dayjs(expense.date) : dayjs(),
    });
    setItems(
      expense.items?.length
        ? expense.items.map((item) => ({ id: item.id || Date.now(), detail: item.detail, qty: item.qty, amount: item.amount }))
        : [{ id: 1, detail: "", qty: 1, amount: 0 }]
    );
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const addItem = () => {
    setItems([...items, { id: Date.now(), detail: "", qty: 1, amount: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  const resolveCategory = (values) =>
    values.category === "other"
      ? (values.customCategory || "Other")
      : (CATEGORIES.find((c) => c.value === values.category)?.label || values.category);

  const getPreviewData = () => ({
    voucher: editingExpense?.voucher || "",
    expenseName: watchedValues.description,
    category: resolveCategory(watchedValues) || "N/A",
    date: watchedValues.date ? watchedValues.date.format("YYYY-MM-DD") : "",
    paymentMethod: watchedValues.paymentMethod || "N/A",
    person: watchedValues.person || "N/A",
    paidBy: watchedValues.paidBy || "N/A",
    items,
    totalAmount,
  });

  const onFormSubmit = async (data) => {
    setSubmitting(true);
    try {
      const payload = {
        category:       resolveCategory(data),
        personSupplier: data.person        || "",
        paidBy:         data.paidBy        || "",
        paymentMethod:  data.paymentMethod || "",
        notes:          data.description   || "",
        date:           data.date ? data.date.format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"),
        amount:         String(totalAmount),
        items: items
          .filter((item) => item.detail && item.amount > 0)
          .map((item) => ({
            itemName: item.detail,
            quantity: String(item.qty || 1),
            amount:   String(item.amount),
          })),
      };

      if (editingExpense) {
        await updateExpense(editingExpense.id, payload);
      } else {
        await createExpense(payload);
      }
      onSubmit();
      resetAll();
    } catch (err) {
      const errorMsg = err.response?.data
        ? Object.values(err.response.data).flat().join(", ")
        : err.message || "Failed to save expense";
      message.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const step1Valid = !!watchedValues.category && (watchedValues.category !== "other" || !!watchedValues.customCategory);
  const step2Valid = items.some((i) => i.detail && i.amount > 0);

  const next = () => setCurrent(current + 1);
  const prev = () => setCurrent(current - 1);

  return (
    <Drawer
      title={<span style={{ fontWeight: 700, fontSize: 17, color: "var(--color-text)" }}>{editingExpense ? "Edit Expense" : "Add Expense"}</span>}
      open={open}
      onClose={() => { onClose(); resetAll(); }}
      width={560}
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
            <AppButton type="primary" onClick={rhfHandleSubmit(onFormSubmit)} className="btn-dark" disabled={!step2Valid} loading={submitting}>
              {editingExpense ? "Update" : "Save"}
            </AppButton>
          )}
        </div>
      }
    >
      <div className={styles.stepsBar}>
        <Steps current={current} items={STEPS} size="small" />
      </div>

      <div className={styles.content}>
        {current === 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Expense Details</h3>
            <div className={styles.detailsCard}>
              <Row gutter={16}>
                <Col span={12}>
                  <Controller
                    name="category"
                    control={control}
                    rules={expenseFormSchema.category}
                    render={({ field }) => (
                      <AppSelect
                        {...field}
                        label="Category"
                        name="category"
                        placeholder="Select category"
                        options={CATEGORIES}
                        showSearch
                        required
                        errors={errors}
                        optionRender={(option) =>
                          option.value === "other" ? (
                            <span style={{
                              display: "block", margin: "-5px -12px", padding: "5px 12px",
                              background: "rgba(124, 92, 252, 0.1)",
                              color: "#7c5cfc", fontWeight: 600,
                            }}>
                              {option.label}
                            </span>
                          ) : option.label
                        }
                      />
                    )}
                  />
                </Col>
                <Col span={12}>
                  <Controller
                    name="date"
                    control={control}
                    render={({ field }) => (
                      <section>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)", display: "block", marginBottom: 4 }}>Date</label>
                        <DatePicker {...field} style={{ width: "100%" }} />
                      </section>
                    )}
                  />
                </Col>
              </Row>
              {watchedValues.category === "other" && (
                <Row gutter={16}>
                  <Col span={24}>
                    <Controller
                      name="customCategory"
                      control={control}
                      rules={{ required: "Please specify category" }}
                      render={({ field }) => (
                        <AppInput {...field} label="Specify Category" name="customCategory" placeholder="Type category name" required errors={errors} />
                      )}
                    />
                  </Col>
                </Row>
              )}
              <Row gutter={16}>
                <Col span={12}>
                  <Controller
                    name="person"
                    control={control}
                    render={({ field }) => (
                      <AppInput {...field} label="Person / Vendor" name="person" placeholder="Name if related (optional)" errors={errors} />
                    )}
                  />
                </Col>
                <Col span={12}>
                  <Controller
                    name="paidBy"
                    control={control}
                    render={({ field }) => (
                      <AppInput {...field} label="Paid By" name="paidBy" placeholder="Who is paying this expense?" errors={errors} />
                    )}
                  />
                </Col>
              </Row>
              <Controller
                name="paymentMethod"
                control={control}
                render={({ field }) => (
                  <AppSelect {...field} label="Payment Method" name="paymentMethod" options={PAYMENT_METHOD_OPTIONS} errors={errors} />
                )}
              />
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <AppInput {...field} inputType="textarea" label="Description" name="description" placeholder="e.g. Cold drinks for visitors, Office supplies purchased" rows={4} errors={errors} />
                )}
              />
            </div>
          </div>
        )}

        {current === 1 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Items</h3>
            {items.map((item, index) => (
              <div key={item.id} className={styles.itemCard}>
                <div className={styles.itemHeader}>
                  <span className={styles.itemBadge}>{index + 1}</span>
                  <span className={styles.itemHeaderLabel}>{item.detail || `Item ${index + 1}`}</span>
                  <span className={styles.itemHeaderSpacer} />
                  <span className={styles.itemHeaderTotal}>{formatCurrency(item.amount || 0)}</span>
                  {items.length > 1 && (
                    <AppButton type="text" icon={<DeleteOutlined />} size="small" danger onClick={() => removeItem(index)} />
                  )}
                </div>
                <Row gutter={12}>
                  <Col span={12}>
                    <AppInput label="Item Detail" placeholder="e.g. Pepsi, Fuel" value={item.detail} onChange={(e) => handleItemChange(index, "detail", e.target.value)} />
                  </Col>
                  <Col span={6}>
                    <AppInput inputType="number" label="Qty" min={1} value={item.qty} onChange={(val) => handleItemChange(index, "qty", val)} />
                  </Col>
                  <Col span={6}>
                    <AppInput inputType="number" label="Amount" min={0} value={item.amount} onChange={(val) => handleItemChange(index, "amount", val)} />
                  </Col>
                </Row>
              </div>
            ))}

            <AppButton type="default" icon={<PlusOutlined />} onClick={addItem} block className={styles.addItemBtn}>
              Add Item
            </AppButton>

            <div className={styles.totalBox}>
              <Text style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>Total Amount</Text>
              <Text style={{ fontSize: 20, fontWeight: 800, color: "var(--color-text)" }}>{formatCurrency(totalAmount)}</Text>
            </div>
          </div>
        )}
      </div>

      <ExpenseModal open={previewOpen} onClose={() => setPreviewOpen(false)} data={getPreviewData()} onDeleteItem={(index) => removeItem(index)} />
    </Drawer>
  );
};

export default ExpenseDrawer;
