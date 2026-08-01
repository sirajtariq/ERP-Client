import { useEffect, useState } from "react";
import { message, DatePicker } from "antd";
import dayjs from "dayjs";
import { useForm, Controller } from "react-hook-form";
import { AppInput, AppSelect, AppDrawer } from "@/components/common";
import { createUser, updateUser } from "@/services/userService";
import styles from "./styles.module.css";

const ROLE_OPTIONS = [
  { label: "Admin",    value: "Admin" },
  { label: "Sales",    value: "Sales" },
  { label: "Purchase", value: "Purchase" },
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { label: "Full-time", value: "fulltime" },
  { label: "Part-time", value: "parttime" },
  { label: "Contract",  value: "contract" },
];

const SALARY_TYPE_OPTIONS = [
  { label: "Monthly", value: "monthly" },
  { label: "Daily",   value: "daily" },
  { label: "Per Job", value: "perjob" },
];

const schema = {
  username:       { required: "Username is required" },
  email:          { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email" } },
  password:       { required: "Password is required", minLength: { value: 6, message: "Minimum 6 characters" } },
  role:           { required: "Role is required" },
  fullname:       { required: "Full name is required" },
  phone:          { required: "Phone is required" },
  cnic:           { required: "CNIC is required" },
  designation:    { required: "Designation is required" },
  dateofjoining:  { required: "Date of joining is required" },
  employmenttype: { required: "Employment type is required" },
};

const defaultValues = {
  username: "", email: "", password: "", role: "",
  fullname: "", phone: "", cnic: "", address: "",
  designation: "", dateofjoining: "", employmenttype: "",
  basicsalary: "", salarytype: "",
};

const UserDrawer = ({ open, onClose, onSubmit, editingUser }) => {
  const [submitting, setSubmitting] = useState(false);

  const { control, reset, handleSubmit, formState: { errors, isValid } } = useForm({
    mode: "onTouched",
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      if (editingUser) {
        reset({
          username:       editingUser.username       || "",
          email:          editingUser.email          || "",
          password:       "",
          role:           editingUser.role           || "",
          fullname:       editingUser.fullname       || "",
          phone:          editingUser.phone          || "",
          cnic:           editingUser.cnic           || "",
          address:        editingUser.address        || "",
          designation:    editingUser.designation    || "",
          dateofjoining:  editingUser.dateofjoining  || "",
          employmenttype: editingUser.employmenttype || "",
          basicsalary:    editingUser.basicsalary    || "",
          salarytype:     editingUser.salarytype     || "",
        });
      } else {
        reset(defaultValues);
      }
    }
  }, [open, editingUser, reset]);

  const onFormSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        username:       values.username,
        email:          values.email          || undefined,
        role:           values.role,
        fullname:       values.fullname,
        phone:          values.phone,
        cnic:           values.cnic,
        address:        values.address        || null,
        designation:    values.designation,
        dateofjoining:  values.dateofjoining,
        employmenttype: values.employmenttype,
        basicsalary:    values.basicsalary    ? String(values.basicsalary) : null,
        salarytype:     values.salarytype     || null,
      };
      if (editingUser) {
        if (values.password) payload.password = values.password;
        await updateUser(editingUser.id, payload);
      } else {
        payload.password = values.password;
        await createUser(payload);
      }
      onSubmit();
      reset();
    } catch (err) {
      const errorMsg = err.response?.data
        ? Object.values(err.response.data).flat().join(", ")
        : err.message || "Something went wrong";
      if (errorMsg) message.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppDrawer
      title={editingUser ? "Edit User" : "Add User"}
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit(onFormSubmit)}
      submitText={editingUser ? (submitting ? "Updating..." : "Update") : (submitting ? "Creating..." : "Create")}
      submitDisabled={!isValid || submitting}
      loading={submitting}
    >
      <section className={styles.formSection}>
        <p className={styles.sectionTitle}>Account Info</p>

        <Controller
          name="username"
          control={control}
          rules={schema.username}
          render={({ field }) => (
            <AppInput {...field} label="Username" name="username" placeholder="Enter username" required errors={errors} />
          )}
        />
        <Controller
          name="email"
          control={control}
          rules={schema.email}
          render={({ field }) => (
            <AppInput {...field} label="Email" name="email" placeholder="Enter email address" autoComplete="off" errors={errors} />
          )}
        />
        <Controller
          name="password"
          control={control}
          rules={editingUser ? {} : schema.password}
          render={({ field }) => (
            <AppInput
              {...field}
              inputType="password"
              label={editingUser ? "New Password (leave blank to keep current)" : "Password"}
              name="password"
              placeholder="Enter password"
              required={!editingUser}
              autoComplete="new-password"
              errors={errors}
            />
          )}
        />
        <Controller
          name="role"
          control={control}
          rules={schema.role}
          render={({ field }) => (
            <AppSelect {...field} label="Role" name="role" placeholder="Select role" options={ROLE_OPTIONS} required errors={errors} />
          )}
        />
      </section>

      <section className={styles.formSection}>
        <p className={styles.sectionTitle}>Personal Info</p>

        <Controller
          name="fullname"
          control={control}
          rules={schema.fullname}
          render={({ field }) => (
            <AppInput {...field} label="Full Name" name="fullname" placeholder="Enter full name" required errors={errors} />
          )}
        />
        <Controller
          name="phone"
          control={control}
          rules={schema.phone}
          render={({ field }) => (
            <AppInput {...field} label="Phone" name="phone" placeholder="e.g. 0321-1234567" required errors={errors} />
          )}
        />
        <Controller
          name="cnic"
          control={control}
          rules={schema.cnic}
          render={({ field }) => (
            <AppInput {...field} label="CNIC" name="cnic" placeholder="e.g. 42101-1234567-1" required errors={errors} />
          )}
        />
        <Controller
          name="address"
          control={control}
          render={({ field }) => (
            <AppInput {...field} inputType="textarea" label="Address" name="address" placeholder="Enter address (optional)" rows={2} errors={errors} />
          )}
        />
      </section>

      <section className={styles.formSection}>
        <p className={styles.sectionTitle}>Employment</p>

        <Controller
          name="designation"
          control={control}
          rules={schema.designation}
          render={({ field }) => (
            <AppInput {...field} label="Designation" name="designation" placeholder="e.g. Sales Manager" required errors={errors} />
          )}
        />

        <Controller
          name="dateofjoining"
          control={control}
          rules={schema.dateofjoining}
          render={({ field }) => (
            <div className={styles.dateWrapper}>
              <label className={styles.dateLabel}>
                Date of Joining <span className={styles.asterisk}>*</span>
              </label>
              <DatePicker
                value={field.value ? dayjs(field.value) : null}
                onChange={(date) => field.onChange(date ? date.format("YYYY-MM-DD") : "")}
                onBlur={field.onBlur}
                format="YYYY-MM-DD"
                style={{ width: "100%", height: 40, borderRadius: 8 }}
                status={errors.dateofjoining ? "error" : ""}
              />
              {errors.dateofjoining && (
                <p className={styles.errorMsg}>{errors.dateofjoining.message}</p>
              )}
            </div>
          )}
        />

        <Controller
          name="employmenttype"
          control={control}
          rules={schema.employmenttype}
          render={({ field }) => (
            <AppSelect {...field} label="Employment Type" name="employmenttype" placeholder="Select employment type" options={EMPLOYMENT_TYPE_OPTIONS} required errors={errors} />
          )}
        />
        <Controller
          name="basicsalary"
          control={control}
          render={({ field }) => (
            <AppInput {...field} inputType="number" label="Basic Salary" name="basicsalary" placeholder="0.00" min={0} errors={errors} />
          )}
        />
        <Controller
          name="salarytype"
          control={control}
          render={({ field }) => (
            <AppSelect {...field} label="Salary Type" name="salarytype" placeholder="Select salary type (optional)" options={SALARY_TYPE_OPTIONS} errors={errors} />
          )}
        />
      </section>
    </AppDrawer>
  );
};

export default UserDrawer;
