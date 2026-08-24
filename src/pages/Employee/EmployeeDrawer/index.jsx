import { useEffect, useState } from "react";
import { Row, Col, DatePicker, Tag, Tooltip } from "antd";
import { BarsOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useForm, Controller } from "react-hook-form";
import { AppDrawer, AppInput, AppSelect } from "@/components/common";

const BASE_DEPARTMENTS = [
  "Operations", "Finance", "Sales", "Human Resources",
  "Logistics", "IT", "Marketing", "Administration",
];

const STATUS_OPTIONS = [
  { value: "active",   label: "Active"   },
  { value: "inactive", label: "Inactive" },
];

const defaultValues = {
  empNo: "", name: "", designation: "", department: null,
  status: "active",
  joiningDate: "", basicSalary: "", currentSalary: "",
  phone: "", email: "", cnic: "", address: "",
};

const EmployeeDrawer = ({ open, onClose, onSubmit, editingEmployee, loading = false }) => {
  const { control, handleSubmit, reset, watch, formState: { errors, isValid } } = useForm({
    mode: "onTouched",
    defaultValues,
  });

  const [customDepts, setCustomDepts] = useState([]);
  const [isNewDept,   setIsNewDept]   = useState(false);

  const basicSalary = watch("basicSalary");

  const allDeptOptions = [
    ...BASE_DEPARTMENTS,
    ...customDepts,
  ].map((d) => ({ value: d, label: d }));

  const deptSelectOptions = [
    { value: "__new__", label: "+ Add New Department" },
    ...allDeptOptions,
  ];

  useEffect(() => {
    if (!open) return;
    setIsNewDept(false);
    if (editingEmployee) {
      // If the employee's department is not in the built-in list, add it to custom so it appears
      const dept = editingEmployee.department || null;
      if (dept && !BASE_DEPARTMENTS.includes(dept) && !customDepts.includes(dept)) {
        setCustomDepts((prev) => [...prev, dept]);
      }
      reset({
        empNo:         editingEmployee.empNo         || "",
        name:          editingEmployee.name          || "",
        designation:   editingEmployee.designation   || "",
        department:    dept,
        status:        editingEmployee.status        || "active",
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
      loading={loading}
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
          <Controller name="status" control={control} rules={{ required: "Required" }}
            render={({ field }) => (
              <AppSelect
                {...field}
                label="Status"
                placeholder="Select status"
                options={STATUS_OPTIONS}
                required
                errors={errors}
                name="status"
              />
            )} />
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={24}>
          <Controller
            name="department"
            control={control}
            rules={{ required: "Required" }}
            render={({ field }) =>
              isNewDept ? (
                <AppInput
                  label={
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      Department
                      <Tag color="green" style={{ fontSize: 10, padding: "0 5px", lineHeight: "16px", marginLeft: 2 }}>New</Tag>
                    </span>
                  }
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  placeholder="Enter department name"
                  required
                  errors={errors}
                  name="department"
                  suffix={
                    <Tooltip title="Select from list">
                      <BarsOutlined
                        style={{ color: "#7c5cfc", cursor: "pointer", fontSize: 15 }}
                        onClick={() => { setIsNewDept(false); field.onChange(null); }}
                      />
                    </Tooltip>
                  }
                />
              ) : (
                <AppSelect
                  label="Department"
                  placeholder="Select department"
                  options={deptSelectOptions}
                  showSearch
                  required
                  errors={errors}
                  name="department"
                  value={field.value}
                  onChange={(val) => {
                    if (val === "__new__") {
                      setIsNewDept(true);
                      field.onChange("");
                    } else {
                      field.onChange(val);
                    }
                  }}
                  optionRender={(option) =>
                    option.value === "__new__" ? (
                      <span style={{
                        display: "flex", alignItems: "center", gap: 6,
                        margin: "-5px -12px", padding: "5px 12px",
                        background: "rgba(124,92,252,0.1)",
                        color: "#7c5cfc", fontWeight: 600,
                      }}>
                        <PlusOutlined style={{ fontSize: 11 }} />
                        Add New Department
                      </span>
                    ) : option.label
                  }
                />
              )
            }
          />
        </Col>
      </Row>

      <Controller
        name="joiningDate"
        control={control}
        rules={{ required: "Required" }}
        render={({ field }) => (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--color-text)" }}>
              Joining Date <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <DatePicker
              value={field.value ? dayjs(field.value) : null}
              onChange={(date) => field.onChange(date ? date.format("YYYY-MM-DD") : "")}
              onBlur={field.onBlur}
              format="DD MMMM YYYY"
              allowClear={false}
              style={{ width: "100%", height: 40 }}
              placeholder="Select joining date"
            />
            {errors.joiningDate && (
              <span style={{ fontSize: 11, color: "#ef4444", marginTop: 3, display: "block" }}>
                {errors.joiningDate.message}
              </span>
            )}
          </div>
        )}
      />

      <Row gutter={16}>
        <Col span={12}>
          <Controller name="basicSalary" control={control} rules={{ required: "Required" }}
            render={({ field }) => <AppInput {...field} inputType="number" label="Basic Salary (Rs)" placeholder="0" min={0} required errors={errors} />} />
        </Col>
        <Col span={12}>
          <Controller name="currentSalary" control={control} rules={{ required: "Required" }}
            render={({ field }) => (
              <AppInput
                {...field}
                inputType="number"
                label="Current Salary (Rs)"
                placeholder="0"
                min={0}
                required
                errors={errors}
              />
            )} />
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Controller name="phone" control={control}
            rules={{ required: "Phone number is required" }}
            render={({ field }) => <AppInput {...field} label="Phone" placeholder="0301-1234567" required errors={errors} />} />
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
