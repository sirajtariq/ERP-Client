import { useEffect } from "react";
import { Row, Col } from "antd";
import { useForm, Controller } from "react-hook-form";
import { AppDrawer, AppInput, AppSelect } from "@/components/common";
import { CATEGORIES, UNITS } from "../mockData";

const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: c }));

const defaultValues = {
  itemCode: "", name: "", category: null, unit: null,
  purchaseRate: "", saleRate: "",
  openingStock: "", minStock: "",
  description: "",
};

const ItemDrawer = ({ open, onClose, onSubmit, editingItem, nextCode }) => {
  const { control, handleSubmit, reset, watch, formState: { errors, isValid } } = useForm({
    mode: "onTouched",
    defaultValues,
  });

  const purchaseRate = watch("purchaseRate");
  const saleRate     = watch("saleRate");
  const margin = purchaseRate > 0 ? ((saleRate - purchaseRate) / purchaseRate * 100).toFixed(1) : null;

  useEffect(() => {
    if (!open) return;
    if (editingItem) {
      reset({
        itemCode:     editingItem.itemCode     || "",
        name:         editingItem.name         || "",
        category:     editingItem.category     || null,
        unit:         editingItem.unit         || null,
        purchaseRate: editingItem.purchaseRate ?? "",
        saleRate:     editingItem.saleRate     ?? "",
        openingStock: "",
        minStock:     editingItem.minStock     ?? "",
        description:  editingItem.description  || "",
      });
    } else {
      reset({ ...defaultValues, itemCode: nextCode });
    }
  }, [open, editingItem]); // eslint-disable-line react-hooks/exhaustive-deps

  const onFormSubmit = (data) => {
    onSubmit({
      ...data,
      purchaseRate: Number(data.purchaseRate) || 0,
      saleRate:     Number(data.saleRate)     || 0,
      openingStock: Number(data.openingStock) || 0,
      minStock:     Number(data.minStock)     || 0,
    });
    reset(defaultValues);
  };

  const isEdit = !!editingItem;

  return (
    <AppDrawer
      title={isEdit ? "Edit Item" : "Add New Item"}
      open={open}
      onClose={() => { onClose(); reset(defaultValues); }}
      onSubmit={handleSubmit(onFormSubmit)}
      submitText={isEdit ? "Update Item" : "Add Item"}
      submitDisabled={!isValid}
      width={520}
    >
      <Row gutter={16}>
        <Col span={10}>
          <Controller name="itemCode" control={control} rules={{ required: "Required" }}
            render={({ field }) => <AppInput {...field} label="Item Code" placeholder="e.g. ITM-011" required errors={errors} />} />
        </Col>
        <Col span={14}>
          <Controller name="name" control={control} rules={{ required: "Required" }}
            render={({ field }) => <AppInput {...field} label="Item Name" placeholder="Enter item name" required errors={errors} />} />
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={14}>
          <Controller name="category" control={control} rules={{ required: "Required" }}
            render={({ field }) => (
              <AppSelect {...field} label="Category" placeholder="Select category"
                options={CATEGORY_OPTIONS} required errors={errors} />
            )} />
        </Col>
        <Col span={10}>
          <Controller name="unit" control={control} rules={{ required: "Required" }}
            render={({ field }) => (
              <AppSelect {...field} label="Unit" placeholder="Select unit"
                options={UNITS} required errors={errors} />
            )} />
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Controller name="purchaseRate" control={control} rules={{ required: "Required" }}
            render={({ field }) => (
              <AppInput {...field} inputType="number" label="Purchase Rate (Rs) *"
                placeholder="0" min={0} required errors={errors} />
            )} />
        </Col>
        <Col span={12}>
          <Controller name="saleRate" control={control} rules={{ required: "Required" }}
            render={({ field }) => (
              <AppInput {...field} inputType="number" label="Sale Rate (Rs) *"
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

      <Controller name="description" control={control}
        render={({ field }) => (
          <AppInput {...field} inputType="textarea" label="Description" rows={2}
            placeholder="Optional — e.g. brand, compatibility, specs" errors={errors} />
        )} />
    </AppDrawer>
  );
};

export default ItemDrawer;
