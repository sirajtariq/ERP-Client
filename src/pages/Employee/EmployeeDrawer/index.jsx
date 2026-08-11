import { useEffect } from "react";
import { Row, Col } from "antd";
import { useForm, Controller } from "react-hook-form";
import { AppDrawer, AppInput, AppSelect } from "@/components/common";

const DEPARTMENT_OPTIONS = [
  "Operations", "Finance", "Sales", "Human Resources",
  "Logistics", "IT", "Marketing", "Administration",
].map((d) => ({ value: d, label: d }));

const defaultValues = {
  empNo: "", name: "", designation: "", department: null,
  joiningDate: "", basicSalary: "", currentSalary: "",
  phone: "", email: "", cnic: "", address: "",
};

const EmployeeDrawer = ({ open, onClose, onSubmit, editingEmployee }) => {
  const { control, handleSubmit, reset, watch, formState: { errors, isValid } } = useForm({
    mode: "onTouched",
    defaultValues,
  });

  const basicSalary = watch("basicSalary");

  useEffect(() => {
    if (!open) return;
    if (editingEmployee) {
      reset({
        empNo:         editingEmployee.empNo         || "",
        name:          editingEmployee.name          || "",
        designation:   editingEmployee.designation   || "",
        department:    editingEmployee.department    || null,
        joiningDate:   editingEmployee.joiningDate   || "",
        basicSalary:   editingEmployee.basicSalary   ?? "",
        currentSalary: editingEmployee.currentSalary ?? "",
        phone:         editingEmployee.phone         || "",
        email:         editingEmployee.email         || "",
        cnic:          editingEmployee.cnic          || "",
        address:       editingEmployee.address       || "",
      });
    } else {
      reset(defaultValues);
    }
  }, [open, editingEmployee]); // eslint-disable-line react-hooks/exhaustive-deps

  const onFormSubmit = (data) => {
    const payload = {
      ...data,
      basicSalary:   Number(data.basicSalary)   || 0,
      currentSalary: Number(data.currentSalary) || Number(data.basicSalary) || 0,
    };
    onSubmit(payload);
    reset(defaultValues);
  };

  const isEdit = !!editingEmployee;

  return (
    <AppDrawer
      title={isEdit ? "Edit Employee" : "Add Employee"}
      open={open}
      onClose={() => { onClose(); reset(defaultValues); }}
      onSubmit={handleSubmit(onFormSubmit)}
      submitText={isEdit ? "Update" : "Add Employee"}
      submitDisabled={!isValid}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Controller name="empNo" control={control} rules={{ required: "Required" }}
            render={({ field }) => <AppInput {...field} label="Employee No." placeholder="e.g. EMP-006" required errors={errors} />} />
        </Col>
        <Col span={12}>
          <Controller name="name" control={control} rules={{ required: "Required" }}
            render={({ field }) => <AppInput {...field} label="Full Name" placeholder="Enter full name" required errors={errors} />} />
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Controller name="designation" control={control} rules={{ required: "Required" }}
            render={({ field }) => <AppInput {...field} label="Designation" placeholder="e.g. Accountant" required errors={errors} />} />
        </Col>
        <Col span={12}>
          <Controller name="department" control={control} rules={{ required: "Required" }}
            render={({ field }) => <AppSelect {...field} label="Department" placeholder="Select department" options={DEPARTMENT_OPTIONS} required errors={errors} />} />
        </Col>
      </Row>
      <Controller name="joiningDate" control={control} rules={{ required: "Required" }}
        render={({ field }) => <AppInput {...field} inputType="date" label="Joining Date" required errors={errors} />} />
      <Row gutter={16}>
        <Col span={12}>
          <Controller name="basicSalary" control={control} rules={{ required: "Required" }}
            render={({ field }) => <AppInput {...field} inputType="number" label="Basic Salary (Rs)" placeholder="0" min={0} required errors={errors} />} />
        </Col>
        <Col span={12}>
          <Controller name="currentSalary" control={control}
            render={({ field }) => (
              <AppInput
                {...field}
                inputType="number"
                label="Current Salary (Rs)"
                placeholder={basicSalary || "Same as basic"}
                min={0}
                errors={errors}
              />
            )} />
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Controller name="phone" control={control}
            render={({ field }) => <AppInput {...field} label="Phone" placeholder="0301-1234567" errors={errors} />} />
        </Col>
        <Col span={12}>
          <Controller name="email" control={control}
            render={({ field }) => <AppInput {...field} label="Email" placeholder="email@example.com" errors={errors} />} />
        </Col>
      </Row>
      <Controller name="cnic" control={control}
        render={({ field }) => <AppInput {...field} label="CNIC" placeholder="35202-1234567-1" errors={errors} />} />
      <Controller name="address" control={control}
        render={({ field }) => <AppInput {...field} inputType="textarea" label="Address" placeholder="Enter address" rows={2} errors={errors} />} />
    </AppDrawer>
  );
};

export default EmployeeDrawer;
