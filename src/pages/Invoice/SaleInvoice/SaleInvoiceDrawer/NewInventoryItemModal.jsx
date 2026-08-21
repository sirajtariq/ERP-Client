import { useEffect } from "react";
import { Modal, Row, Col } from "antd";
import { useForm, Controller } from "react-hook-form";
import { AppInput, AppSelect, AppButton } from "@/components/common";
import { CATEGORIES, UNITS } from "@/pages/Inventory/mockData";

const ADD_NEW = "__add__";

const CATEGORY_OPTIONS = [
  {
    value: ADD_NEW,
    label: "+ Add Category",
    style: { color: "#7c5cfc", fontWeight: 600, background: "rgba(124,92,252,0.07)" },
  },
  ...CATEGORIES.map((c) => ({ value: c, label: c })),
];

const defaultValues = {
  itemCode: "", name: "", category: null, customCategory: "",
  unit: null, purchaseRate: "", saleRate: "",
  openingStock: "0", minStock: "0", description: "",
};

const NewInventoryItemModal = ({ open, onClose, onAdd, initialData }) => {
  const { control, handleSubmit, reset, watch, formState: { errors, isValid } } = useForm({
    mode: "onTouched",
    defaultValues,
  });

  const purchaseRate   = watch("purchaseRate");
  const saleRate       = watch("saleRate");
  const category       = watch("category");
  const customCategory = watch("customCategory");
  const isAddNew       = category === ADD_NEW;
  const margin         = purchaseRate > 0
    ? (((saleRate - purchaseRate) / purchaseRate) * 100).toFixed(1)
    : null;

  useEffect(() => {
    if (open) reset(initialData ? { ...defaultValues, ...initialData } : defaultValues);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const onFormSubmit = (data) => {
    const resolvedCategory = data.category === ADD_NEW
      ? (data.customCategory || "").trim()
      : data.category;
    onAdd({
      ...data,
      category:     resolvedCategory,
      purchaseRate: Number(data.purchaseRate) || 0,
      saleRate:     Number(data.saleRate)     || 0,
      openingStock: Number(data.openingStock) || 0,
      minStock:     Number(data.minStock)     || 0,
    });
  };

  const submitDisabled = !isValid || (isAddNew && !customCategory?.trim());

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={<span style={{ fontWeight: 700 }}>{initialData ? "Edit Inventory Item" : "Add New Inventory Item"}</span>}
      width={640}
      destroyOnClose
      centered
    >
      <form onSubmit={handleSubmit(onFormSubmit)} style={{ paddingTop: 8 }}>
        <Row gutter={16}>
          <Col span={10}>
            <Controller name="itemCode" control={control} rules={{ required: "Required" }}
              render={({ field }) => (
                <AppInput {...field} label="Item Code" placeholder="e.g. ITM-011" required errors={errors} />
              )} />
          </Col>
          <Col span={14}>
            <Controller name="name" control={control} rules={{ required: "Required" }}
              render={({ field }) => (
                <AppInput {...field} label="Item Name" placeholder="Enter item name" required errors={errors} />
              )} />
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={isAddNew ? 24 : 14}>
            <Controller name="category" control={control} rules={{ required: "Required" }}
              render={({ field }) => (
                <AppSelect
                  {...field}
                  label="Category"
                  placeholder="Select category"
                  options={CATEGORY_OPTIONS}
                  showSearch
                  required
                  errors={errors}
                  optionRender={(option) =>
                    option.value === ADD_NEW ? (
                      <span style={{ display: "block", margin: "-5px -12px", padding: "6px 12px", background: "rgba(124,92,252,0.08)", color: "#7c5cfc", fontWeight: 600 }}>
                        {option.label}
                      </span>
                    ) : option.label
                  }
                />
              )} />
          </Col>
          {!isAddNew && (
            <Col span={10}>
              <Controller name="unit" control={control} rules={{ required: "Required" }}
                render={({ field }) => (
                  <AppSelect {...field} label="Unit" placeholder="Select unit" options={UNITS} required errors={errors} />
                )} />
            </Col>
          )}
        </Row>

        {isAddNew && (
          <Row gutter={16}>
            <Col span={14}>
              <Controller name="customCategory" control={control}
                rules={{ validate: (v) => !isAddNew || !!v?.trim() || "Category name required" }}
                render={({ field }) => (
                  <AppInput {...field} label="New Category Name" placeholder="e.g. Solar Equipment" required errors={errors} autoFocus />
                )} />
            </Col>
            <Col span={10}>
              <Controller name="unit" control={control} rules={{ required: "Required" }}
                render={({ field }) => (
                  <AppSelect {...field} label="Unit" placeholder="Select unit" options={UNITS} required errors={errors} />
                )} />
            </Col>
          </Row>
        )}

        <Row gutter={16}>
          <Col span={12}>
            <Controller name="purchaseRate" control={control} rules={{ required: "Required" }}
              render={({ field }) => (
                <AppInput {...field} inputType="number" label="Purchase Rate (Rs) *" placeholder="0" min={0} required errors={errors} />
              )} />
          </Col>
          <Col span={12}>
            <Controller name="saleRate" control={control} rules={{ required: "Required" }}
              render={({ field }) => (
                <AppInput {...field} inputType="number" label="Sale Rate (Rs) *" placeholder="0" min={0} required errors={errors} />
              )} />
          </Col>
        </Row>

        {margin !== null && (
          <div style={{
            padding: "10px 14px", borderRadius: 8, marginBottom: 4,
            background: Number(margin) >= 0 ? "rgba(34,197,94,0.07)" : "rgba(239,68,68,0.07)",
            border: `1px solid ${Number(margin) >= 0 ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Profit Margin:</span>
            <span style={{ fontWeight: 800, fontSize: 15, color: Number(margin) >= 0 ? "#22c55e" : "#ef4444" }}>
              {margin}%
            </span>
          </div>
        )}

        <Row gutter={16}>
          <Col span={12}>
            <Controller name="openingStock" control={control}
              render={({ field }) => (
                <AppInput {...field} inputType="number" label="Opening Stock" placeholder="0" min={0} errors={errors} />
              )} />
          </Col>
          <Col span={12}>
            <Controller name="minStock" control={control}
              render={({ field }) => (
                <AppInput {...field} inputType="number" label="Min Stock Level" placeholder="e.g. 10" min={0} errors={errors} />
              )} />
          </Col>
        </Row>

        <Controller name="description" control={control}
          render={({ field }) => (
            <AppInput {...field} inputType="textarea" label="Description" rows={2} placeholder="Optional" errors={errors} />
          )} />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <AppButton type="default" onClick={onClose}>Cancel</AppButton>
          <AppButton type="primary" htmlType="submit" className="btn-dark" disabled={submitDisabled}>
            {initialData ? "Update Item" : "Add to Invoice"}
          </AppButton>
        </div>
      </form>
    </Modal>
  );
};

export default NewInventoryItemModal;
