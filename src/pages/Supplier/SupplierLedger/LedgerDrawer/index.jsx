import { useEffect, useState } from "react";
import { Drawer, message } from "antd";
import { useForm, Controller } from "react-hook-form";
import { AppButton, AppInput } from "@/components/common";
import { createVendor, updateVendor } from "@/services/supplierService";
import { supplierLedgerSchema } from "@/utils/validation";
import styles from "./styles.module.css";

const LedgerDrawer = ({ open, onClose, onSubmit, editingVendor }) => {
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm({
    mode: "onTouched",
    defaultValues: {
      vendorName:     "",
      phone:          "",
      email:          "",
      address:        "",
      taxNumber:      "",
      openingPayable: "",
      openingNote:    "",
    },
  });

  useEffect(() => {
    if (open && editingVendor) {
      reset({
        vendorName:     editingVendor.name           || "",
        phone:          editingVendor.phone          || "",
        email:          editingVendor.email          || "",
        address:        editingVendor.address        || "",
        taxNumber:      editingVendor.taxNumber      || "",
        openingPayable: editingVendor.openingPayable || "",
        openingNote:    editingVendor.openingNote    || "",
      });
    } else if (open) {
      reset({ vendorName: "", phone: "", email: "", address: "", taxNumber: "", openingPayable: "", openingNote: "" });
    }
  }, [open, editingVendor, reset]);

  const onFormSubmit = async (data) => {
    setSubmitting(true);
    try {
      const payload = {
        vendorName:     data.vendorName,
        phone:          data.phone     || null,
        email:          data.email     || null,
        address:        data.address   || "",
        taxNumber:      data.taxNumber || "",
        openingPayable: data.openingPayable ? String(data.openingPayable) : "0.00",
        openingNote:    data.openingNote || "",
      };
      if (editingVendor) {
        await updateVendor(editingVendor.vendorId, payload);
      } else {
        await createVendor(payload);
      }
      onSubmit();
      reset();
    } catch (err) {
      const errMsg = err.response?.data
        ? Object.values(err.response.data).flat().join(", ")
        : "Failed to save supplier";
      message.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    reset();
  };

  return (
    <Drawer
      title={
        <span style={{ fontWeight: 700, fontSize: 17, color: "var(--color-text)" }}>
          {editingVendor ? "Edit Vendor" : "Add Vendor"}
        </span>
      }
      open={open}
      onClose={handleClose}
      width={520}
      destroyOnClose
      styles={{
        header: { borderBottom: "1px solid #eef0f6", padding: "16px 24px" },
        body:   { padding: "20px 24px", overflowY: "auto" },
        footer: { borderTop: "1px solid #eef0f6", padding: "14px 24px" },
      }}
      footer={
        <div className={styles.drawerFooter}>
          <AppButton type="default" onClick={handleClose}>Cancel</AppButton>
          <div style={{ flex: 1 }} />
          <AppButton
            type="primary"
            onClick={handleSubmit(onFormSubmit)}
            className="btn-dark"
            disabled={!isValid || submitting}
            loading={submitting}
          >
            {editingVendor
              ? submitting ? "Updating..." : "Update Vendor"
              : submitting ? "Creating..." : "Create Vendor"}
          </AppButton>
        </div>
      }
    >
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Vendor Details</h3>
        <div className={styles.detailsCard}>

          <Controller
            name="vendorName"
            control={control}
            rules={supplierLedgerSchema.vendorName}
            render={({ field }) => (
              <AppInput
                {...field}
                label="Vendor Name"
                name="vendorName"
                placeholder="Enter supplier name"
                required
                errors={errors}
              />
            )}
          />

          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <AppInput
                {...field}
                label="Phone"
                name="phone"
                placeholder="e.g. 0321-1234567"
                errors={errors}
              />
            )}
          />

          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <AppInput
                {...field}
                label="Email"
                name="email"
                placeholder="Enter email (optional)"
                errors={errors}
              />
            )}
          />

          <Controller
            name="address"
            control={control}
            render={({ field }) => (
              <AppInput
                {...field}
                inputType="textarea"
                label="Address"
                name="address"
                placeholder="Enter address (optional)"
                rows={2}
                errors={errors}
              />
            )}
          />

          <Controller
            name="taxNumber"
            control={control}
            render={({ field }) => (
              <AppInput
                {...field}
                label="Tax Number (NTN/STRN)"
                name="taxNumber"
                placeholder="Enter tax number (optional)"
                errors={errors}
              />
            )}
          />

          <Controller
            name="openingPayable"
            control={control}
            render={({ field }) => (
              <AppInput
                {...field}
                inputType="number"
                label="Opening Balance"
                name="openingPayable"
                placeholder="0.00"
                min={0}
                errors={errors}
              />
            )}
          />

          <Controller
            name="openingNote"
            control={control}
            render={({ field }) => (
              <AppInput
                {...field}
                inputType="textarea"
                label="Opening Note"
                name="openingNote"
                placeholder="Add a note (optional)"
                rows={2}
                errors={errors}
              />
            )}
          />

        </div>
      </div>
    </Drawer>
  );
};

export default LedgerDrawer;
