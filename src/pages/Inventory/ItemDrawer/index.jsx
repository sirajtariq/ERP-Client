import { useEffect } from "react";
import { Row, Col } from "antd";
import { useForm, Controller } from "react-hook-form";
import { AppDrawer, AppInput, AppSelect } from "@/components/common";
import { CATEGORIES, UNIT_OPTIONS, ADD_NEW_UNIT } from "../mockData";

const ADD_NEW = "__add__";

const CATEGORY_OPTIONS = [
  {
    value: ADD_NEW,
    label: "+ Add Category",
    style: { color: "#7c5cfc", fontWeight: 600, background: "rgba(124,92,252,0.07)" },
  },
  ...CATEGORIES.map((c) => ({ value: c, label: c })),
];

const renderUnitOption = (option) =>
  option.value === ADD_NEW_UNIT ? (
    <span style={{
      display: "block", margin: "-5px -12px", padding: "6px 12px",
      background: "rgba(124,92,252,0.08)", color: "#7c5cfc", fontWeight: 600,
    }}>
      {option.label}
    </span>
  ) : option.label;

const ITEM_TYPE_OPTIONS = [
  { value: "product", label: "Product" },
  { value: "service", label: "Service" },
];

const defaultValues = {
  itemType: "product",
  itemCode: "", name: "", category: null, customCategory: "", unit: null, customUnit: "",
  purchaseRate: "", saleRate: "",
  openingStock: "", minStock: "",
  description: "",
};

const ItemDrawer = ({ open, onClose, onSubmit, editingItem, loading }) => {
  const { control, handleSubmit, reset, watch, setValue, formState: { errors, isValid } } = useForm({
    mode: "onTouched",
    defaultValues,
  });

  const itemType        = watch("itemType");
  const purchaseRate    = watch("purchaseRate");
  const saleRate        = watch("saleRate");
  const category        = watch("category");
  const customCategory  = watch("customCategory");
  const unit            = watch("unit");
  const customUnit      = watch("customUnit");
  const isAddNew        = category === ADD_NEW;
  const isAddNewUnit    = unit === ADD_NEW_UNIT;
  const isService       = itemType === "service";

  const margin = !isService && purchaseRate > 0
    ? ((saleRate - purchaseRate) / purchaseRate * 100).toFixed(1)
    : null;

  useEffect(() => {
    if (!open) return;
    if (editingItem) {
      reset({
        ...defaultValues,
        itemType:     editingItem.itemType     || "product",
        itemCode:     editingItem.itemCode     || "",
        name:         editingItem.name         || "",
        category:     editingItem.category     || null,
        unit:         editingItem.unit         || null,
        purchaseRate: editingItem.purchaseRate ?? "",
        saleRate:     editingItem.saleRate     ?? "",
        minStock:     editingItem.minStock     ?? "",
        description:  editingItem.description  || "",
      });
    } else {
      reset(defaultValues);
    }
  }, [open, editingItem]); // eslint-disable-line react-hooks/exhaustive-deps

  // When switching to service, clear stock fields
  useEffect(() => {
    if (isService) {
      setValue("openingStock", "");
      setValue("minStock", "");
    }
  }, [isService]); // eslint-disable-line react-hooks/exhaustive-deps

  const onFormSubmit = (data) => {
    const resolvedCategory = data.category === ADD_NEW
      ? (data.customCategory || "").trim()
      : data.category;
    const resolvedUnit = data.unit === ADD_NEW_UNIT
      ? (data.customUnit || "").trim()
      : data.unit;

    onSubmit({
      ...data,
      itemType:     data.itemType || "product",
      category:     resolvedCategory,
      unit:         resolvedUnit,
      purchaseRate: Number(data.purchaseRate) || 0,
      saleRate:     Number(data.saleRate)     || 0,
      openingStock: isService ? 0 : (Number(data.openingStock) || 0),
      minStock:     isService ? 0 : (Number(data.minStock)     || 0),
    });
    reset(defaultValues);
  };

  const submitDisabled = !isValid || loading
    || (isAddNew && !customCategory?.trim())
    || (isAddNewUnit && !customUnit?.trim());
  const isEdit = !!editingItem;

  return (
    <AppDrawer
      title={isEdit ? "Edit Item" : "Add New Item"}
      open={open}
      onClose={() => { onClose(); reset(defaultValues); }}
      onSubmit={handleSubmit(onFormSubmit)}
      submitText={isEdit ? "Update Item" : "Add Item"}
      submitDisabled={submitDisabled}
      loading={loading}
      width={520}
    >
      {/* Item Type Selector */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 8 }}>
          Item Type <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <Controller name="itemType" control={control}
          render={({ field }) => (
            <div style={{ display: "flex", gap: 10 }}>
              {ITEM_TYPE_OPTIONS.map(({ value, label }) => {
                const selected = field.value === value;
                const isProductOpt = value === "product";
                const selColor = isProductOpt ? "#3b82f6" : "#7c5cfc";
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => field.onChange(value)}
                    style={{
                      flex: 1, padding: "10px 16px", borderRadius: 8, cursor: "pointer",
                      fontWeight: 700, fontSize: 13, fontFamily: "inherit",
                      transition: "all 0.2s ease",
                      background: selected ? (isProductOpt ? "rgba(59,130,246,0.1)" : "rgba(124,92,252,0.1)") : "var(--color-surface)",
                      border: `2px solid ${selected ? selColor : "var(--color-border)"}`,
                      color: selected ? selColor : "var(--color-text-secondary)",
                    }}
                  >
                    <div style={{ fontSize: 16, marginBottom: 2 }}>{isProductOpt ? "📦" : "🔧"}</div>
                    <div>{label}</div>
                    <div style={{ fontSize: 10, fontWeight: 400, marginTop: 2, color: selected ? selColor : "var(--color-text-muted)" }}>
                      {isProductOpt ? "Stock tracked" : "No stock tracking"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        />
        {isService && (
          <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 6, background: "rgba(124,92,252,0.06)", border: "1px solid rgba(124,92,252,0.18)", fontSize: 12, color: "#7c5cfc" }}>
            Service items (labour, installation, repair etc.) are billed on invoices but don't affect stock.
          </div>
        )}
      </div>

      <Row gutter={16}>
        <Col span={10}>
          <Controller name="itemCode" control={control} rules={{ required: "Required" }}
            render={({ field }) => <AppInput {...field} label="Item Code" placeholder="e.g. SRV-001" required errors={errors} />} />
        </Col>
        <Col span={14}>
          <Controller name="name" control={control} rules={{ required: "Required" }}
            render={({ field }) => <AppInput {...field} label={isService ? "Service Name" : "Item Name"} placeholder={isService ? "e.g. Electrician Labour" : "Enter item name"} required errors={errors} />} />
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
                    <span style={{
                      display: "block", margin: "-5px -12px", padding: "6px 12px",
                      background: "rgba(124,92,252,0.08)", color: "#7c5cfc", fontWeight: 600,
                    }}>
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
                <AppSelect {...field} label="Unit" placeholder="Select unit"
                  options={UNIT_OPTIONS} required errors={errors} optionRender={renderUnitOption} />
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
                <AppInput
                  {...field}
                  label="New Category Name"
                  placeholder="e.g. Solar Equipment"
                  required
                  errors={errors}
                  autoFocus
                />
              )} />
          </Col>
          <Col span={10}>
            <Controller name="unit" control={control} rules={{ required: "Required" }}
              render={({ field }) => (
                <AppSelect {...field} label="Unit" placeholder="Select unit"
                  options={UNIT_OPTIONS} required errors={errors} optionRender={renderUnitOption} />
              )} />
          </Col>
        </Row>
      )}

      {isAddNewUnit && (
        <Row gutter={16}>
          <Col span={24}>
            <Controller name="customUnit" control={control}
              rules={{ validate: (v) => !isAddNewUnit || !!v?.trim() || "Unit name required" }}
              render={({ field }) => (
                <AppInput
                  {...field}
                  label="New Unit Name"
                  placeholder="e.g. Roll, Bundle, Sq.Ft"
                  required
                  errors={errors}
                  autoFocus
                />
              )} />
          </Col>
        </Row>
      )}

      <Row gutter={16}>
        <Col span={12}>
          <Controller name="purchaseRate" control={control} rules={{ required: "Required" }}
            render={({ field }) => (
              <AppInput {...field} inputType="number" label={isService ? "Cost Rate (Rs) *" : "Purchase Rate (Rs) *"}
                placeholder="0" min={0} required errors={errors} />
            )} />
        </Col>
        <Col span={12}>
          <Controller name="saleRate" control={control} rules={{ required: "Required" }}
            render={({ field }) => (
              <AppInput {...field} inputType="number" label={isService ? "Billing Rate (Rs) *" : "Sale Rate (Rs) *"}
                placeholder="0" min={0} required errors={errors} />
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
          {Number(margin) < 10 && Number(margin) >= 0 && (
            <span style={{ fontSize: 11, color: "#f97316", marginLeft: "auto" }}>⚠ Low margin</span>
          )}
        </div>
      )}

      {/* Stock fields — only for products */}
      {!isService && (
        <Row gutter={16}>
          {!isEdit && (
            <Col span={12}>
              <Controller name="openingStock" control={control}
                render={({ field }) => (
                  <AppInput {...field} inputType="number" label="Opening Stock"
                    placeholder="0" min={0} errors={errors} />
                )} />
            </Col>
          )}
          <Col span={isEdit ? 24 : 12}>
            <Controller name="minStock" control={control}
              render={({ field }) => (
                <AppInput {...field} inputType="number" label="Min Stock Level (Low Stock Alert)"
                  placeholder="e.g. 10" min={0} errors={errors} />
              )} />
          </Col>
        </Row>
      )}

      <Controller name="description" control={control}
        render={({ field }) => (
          <AppInput {...field} inputType="textarea" label="Description" rows={2}
            placeholder={isService ? "Optional — e.g. per hour, includes materials" : "Optional — e.g. brand, compatibility, specs"} errors={errors} />
        )} />
    </AppDrawer>
  );
};

export default ItemDrawer;
