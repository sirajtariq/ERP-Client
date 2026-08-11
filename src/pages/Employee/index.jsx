import { useState, useMemo } from "react";
import { message, Typography, Modal, DatePicker, Alert, Input, Select } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { AppTable, AppButton, AppModal, PageHeader } from "@/components/common";
import { formatCurrency, formatDate } from "@/utils";
import { useAuth } from "@/context/AuthContext";
import { MOCK_EMPLOYEES, MOCK_SALARY_RECORDS, MOCK_INCREMENTS, MOCK_ADVANCES } from "./mockData";
import { getEmployeeColumns } from "./columns";
import EmployeeDrawer from "./EmployeeDrawer";
import EmployeeDetailModal from "./EmployeeDetailModal";
import SalaryModal from "./SalaryModal";
import IncrementModal from "./IncrementModal";
import AdvanceDrawer from "./AdvanceDrawer";

const { Text } = Typography;

let nextId = 100;

const Employee = () => {
  const { userRole } = useAuth();
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(userRole);

  const [employees,     setEmployees]     = useState(MOCK_EMPLOYEES);
  const [salaryRecords, setSalaryRecords] = useState(MOCK_SALARY_RECORDS);
  const [increments,    setIncrements]    = useState(MOCK_INCREMENTS);
  const [advances,      setAdvances]      = useState(MOCK_ADVANCES);

  const [drawerOpen,        setDrawerOpen]        = useState(false);
  const [editingEmployee,   setEditingEmployee]   = useState(null);
  const [viewEmployee,      setViewEmployee]      = useState(null);
  const [salaryEmployee,    setSalaryEmployee]    = useState(null);
  const [incrementEmployee, setIncrementEmployee] = useState(null);
  const [advanceEmployee,   setAdvanceEmployee]   = useState(null);
  const [deleteModal,       setDeleteModal]       = useState({ open: false, employee: null });
  const [statusModal,       setStatusModal]       = useState({ open: false, employee: null });
  const [statusDate,        setStatusDate]        = useState(dayjs());

  // ── Search / filter state ──
  const [searchText,    setSearchText]    = useState("");
  const [statusFilter,  setStatusFilter]  = useState("all");

  // ── Advance balance ──
  const getAdvanceBalance = (employeeId) => {
    const totalGiven = advances
      .filter((a) => a.employeeId === employeeId)
      .reduce((s, a) => s + a.amount, 0);
    const totalDeducted = salaryRecords
      .filter((r) => r.employeeId === employeeId)
      .reduce((s, r) => s + (r.advanceDeduction || 0), 0);
    return Math.max(0, totalGiven - totalDeducted);
  };

  const enrichedEmployees = useMemo(
    () => employees.map((emp) => ({ ...emp, advanceBalance: getAdvanceBalance(emp.id) })),
    [employees, advances, salaryRecords] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── Filtered list for table ──
  const filteredEmployees = useMemo(() => {
    let list = enrichedEmployees;
    if (statusFilter !== "all") list = list.filter((e) => e.status === statusFilter);
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter(
        (e) => e.name.toLowerCase().includes(q) || e.empNo.toLowerCase().includes(q)
      );
    }
    return list;
  }, [enrichedEmployees, searchText, statusFilter]);

  // ── Summary stats ──
  const summary = useMemo(() => ({
    totalEmployees: employees.filter((e) => e.status === "active").length,
    monthlyPayroll: employees.filter((e) => e.status === "active").reduce((s, e) => s + (e.currentSalary || 0), 0),
    totalAdvance:   employees.reduce((s, e) => s + getAdvanceBalance(e.id), 0),
    avgSalary:      employees.filter((e) => e.status === "active").length
      ? Math.round(employees.filter((e) => e.status === "active").reduce((s, e) => s + (e.currentSalary || 0), 0) / employees.filter((e) => e.status === "active").length)
      : 0,
  }), [employees, advances, salaryRecords]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Employee CRUD ──
  const handleAddEmployee = (payload) => {
    setEmployees((prev) => [...prev, { ...payload, id: ++nextId, status: "active", leavingDate: null, reJoiningDate: null }]);
    setDrawerOpen(false);
    message.success(`"${payload.name}" added successfully`);
  };

  const handleUpdateEmployee = (payload) => {
    setEmployees((prev) => prev.map((e) => (e.id === editingEmployee.id ? { ...e, ...payload } : e)));
    setDrawerOpen(false);
    setEditingEmployee(null);
    message.success(`"${payload.name}" updated`);
  };

  const handleDelete = () => {
    setEmployees((prev) => prev.filter((e) => e.id !== deleteModal.employee.id));
    setSalaryRecords((prev) => prev.filter((r) => r.employeeId !== deleteModal.employee.id));
    setIncrements((prev) => prev.filter((i) => i.employeeId !== deleteModal.employee.id));
    setAdvances((prev) => prev.filter((a) => a.employeeId !== deleteModal.employee.id));
    setDeleteModal({ open: false, employee: null });
    message.success("Employee deleted");
  };

  // ── Salary ──

  // When a salary record is created with an advance deduction, mark individual
  // advance records as partial/recovered in FIFO order so the Advance tab stays accurate.
  const applyAdvanceDeduction = (employeeId, deductionAmount) => {
    if (!deductionAmount || deductionAmount <= 0) return;
    setAdvances((prev) => {
      const pending = prev
        .filter((a) => a.employeeId === employeeId && a.status !== "recovered")
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      let remaining = deductionAmount;
      const updates = {};
      for (const adv of pending) {
        if (remaining <= 0) break;
        const outstanding = adv.amount - (adv.deductedAmount || 0);
        const deduct = Math.min(remaining, outstanding);
        const newDeducted = (adv.deductedAmount || 0) + deduct;
        updates[adv.id] = {
          deductedAmount: newDeducted,
          status: newDeducted >= adv.amount ? "recovered" : "partial",
        };
        remaining -= deduct;
      }
      return prev.map((a) => (updates[a.id] ? { ...a, ...updates[a.id] } : a));
    });
  };

  const handlePaySalary = (record) => {
    setSalaryRecords((prev) => [...prev, record]);
    applyAdvanceDeduction(record.employeeId, record.advanceDeduction);
  };

  const handleUpdateSalaryRecord = (updated) => {
    setSalaryRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleDeleteSalaryRecord = (id) => {
    setSalaryRecords((prev) => prev.filter((r) => r.id !== id));
    message.success("Record deleted");
  };

  // ── Increment ──
  const handleAddIncrement = (record) => {
    setIncrements((prev) => [...prev, record]);
    setEmployees((prev) =>
      prev.map((e) => (e.id === record.employeeId ? { ...e, currentSalary: record.newSalary } : e))
    );
    setIncrementEmployee((prev) => (prev ? { ...prev, currentSalary: record.newSalary } : prev));
  };

  const handleDeleteIncrement = (id) => {
    const inc = increments.find((i) => i.id === id);
    if (inc) {
      setEmployees((prev) =>
        prev.map((e) => (e.id === inc.employeeId ? { ...e, currentSalary: inc.previousSalary } : e))
      );
      setIncrementEmployee((prev) => (prev ? { ...prev, currentSalary: inc.previousSalary } : prev));
    }
    setIncrements((prev) => prev.filter((i) => i.id !== id));
    message.success("Increment deleted");
  };

  // ── Status (deactivate / reactivate) ──
  const handleStatusToggle = (emp) => {
    setStatusDate(dayjs());
    setStatusModal({ open: true, employee: emp });
  };

  const handleDeactivate = () => {
    const emp = statusModal.employee;
    if (!statusDate) { message.warning("Please select a leaving date"); return; }
    setEmployees((prev) =>
      prev.map((e) => e.id === emp.id ? { ...e, status: "inactive", leavingDate: statusDate.format("YYYY-MM-DD"), reJoiningDate: null } : e)
    );
    setStatusModal({ open: false, employee: null });
    message.success(`${emp.name} marked as inactive`);
  };

  const handleReactivate = () => {
    const emp = statusModal.employee;
    if (!statusDate) { message.warning("Please select a re-joining date"); return; }
    setEmployees((prev) =>
      prev.map((e) => e.id === emp.id ? { ...e, status: "active", reJoiningDate: statusDate.format("YYYY-MM-DD"), leavingDate: null } : e)
    );
    setStatusModal({ open: false, employee: null });
    message.success(`${emp.name} reactivated`);
  };

  // ── Advance ──
  const handleGiveAdvance = (record) => {
    setAdvances((prev) => [...prev, record]);
  };

  const handleDeleteAdvance = (id) => {
    setAdvances((prev) => prev.filter((a) => a.id !== id));
    message.success("Advance deleted");
  };

  const columns = getEmployeeColumns({
    onView:         (rec) => setViewEmployee(rec),
    onSalary:       (rec) => setSalaryEmployee(rec),
    onAdvance:      (rec) => setAdvanceEmployee(rec),
    onIncrement:    (rec) => setIncrementEmployee(rec),
    onEdit:         (rec) => { setEditingEmployee(rec); setDrawerOpen(true); },
    onDelete:       (rec) => setDeleteModal({ open: true, employee: rec }),
    onStatusToggle: (rec) => handleStatusToggle(rec),
    isAdmin,
  });

  return (
    <section>
      <PageHeader
        title="Employees"
        subtitle="Manage employee records, salaries, increments and advances"
        extra={
          <AppButton type="primary" icon={<PlusOutlined />} onClick={() => { setEditingEmployee(null); setDrawerOpen(true); }} className="btn-dark">
            Add Employee
          </AppButton>
        }
      />

      {/* Summary cards */}
      <section style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        {[
          { label: "Active Employees",   value: summary.totalEmployees,                color: "#7c5cfc", bg: "rgba(124,92,252,0.07)", border: "rgba(124,92,252,0.18)", isCount: true },
          { label: "Monthly Payroll",    value: formatCurrency(summary.monthlyPayroll), color: "#22c55e", bg: "rgba(34,197,94,0.07)",  border: "rgba(34,197,94,0.18)"  },
          { label: "Average Salary",     value: formatCurrency(summary.avgSalary),      color: "#3b82f6", bg: "rgba(59,130,246,0.07)", border: "rgba(59,130,246,0.18)" },
          { label: "Advance Outstanding",value: formatCurrency(summary.totalAdvance),   color: "#f97316", bg: "rgba(249,115,22,0.07)", border: "rgba(249,115,22,0.18)" },
        ].map(({ label, value, color, bg, border, isCount }) => (
          <section key={label} style={{ flex: 1, padding: "12px 18px", borderRadius: 10, background: bg, border: `1px solid ${border}`, display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", color }}>{label}</span>
            <span style={{ fontSize: isCount ? 28 : "clamp(13px, 1.3vw, 20px)", fontWeight: 800, color, lineHeight: 1.2 }}>{value}</span>
          </section>
        ))}
      </section>

      {/* Search + filter bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <Input
          prefix={<SearchOutlined style={{ color: "var(--color-text-secondary)" }} />}
          placeholder="Search by name or employee no..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          style={{ flex: 1, height: 36 }}
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 140, height: 36 }}
          options={[
            { value: "all",      label: "All Employees" },
            { value: "active",   label: "Active Only"   },
            { value: "inactive", label: "Inactive Only" },
          ]}
        />
      </div>

      <AppTable
        columns={columns}
        dataSource={filteredEmployees}
        rowKey="id"
        scroll={{ y: "calc(100vh - 420px)" }}
        page={{ current: 1, size: filteredEmployees.length, total: filteredEmployees.length }}
      />

      <EmployeeDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingEmployee(null); }}
        onSubmit={editingEmployee ? handleUpdateEmployee : handleAddEmployee}
        editingEmployee={editingEmployee}
      />

      <EmployeeDetailModal
        open={!!viewEmployee}
        onClose={() => setViewEmployee(null)}
        employee={viewEmployee}
        advanceBalance={viewEmployee ? getAdvanceBalance(viewEmployee.id) : 0}
        totalIncrements={viewEmployee ? increments.filter((i) => i.employeeId === viewEmployee.id).length : 0}
        salaryRecordsCount={viewEmployee ? salaryRecords.filter((r) => r.employeeId === viewEmployee.id).length : 0}
      />

      <SalaryModal
        open={!!salaryEmployee}
        onClose={() => setSalaryEmployee(null)}
        employee={salaryEmployee}
        salaryRecords={salaryRecords}
        advanceBalance={salaryEmployee ? getAdvanceBalance(salaryEmployee.id) : 0}
        onPaySalary={handlePaySalary}
        onUpdateSalaryRecord={handleUpdateSalaryRecord}
        onDeleteRecord={handleDeleteSalaryRecord}
      />

      <IncrementModal
        open={!!incrementEmployee}
        onClose={() => setIncrementEmployee(null)}
        employee={incrementEmployee}
        increments={increments}
        onAddIncrement={handleAddIncrement}
        onDeleteIncrement={handleDeleteIncrement}
      />

      <AdvanceDrawer
        open={!!advanceEmployee}
        onClose={() => setAdvanceEmployee(null)}
        employee={advanceEmployee}
        advances={advances}
        advanceBalance={advanceEmployee ? getAdvanceBalance(advanceEmployee.id) : 0}
        onGiveAdvance={handleGiveAdvance}
        onDeleteAdvance={handleDeleteAdvance}
      />

      {/* Status change modal */}
      {(() => {
        const emp = statusModal.employee;
        if (!emp) return null;
        const isDeactivating = emp.status === "active";
        const advBal = getAdvanceBalance(emp.id);
        const hasPendingSalary = salaryRecords.some(
          (r) => r.employeeId === emp.id && (r.status === "pending" || r.status === "partial")
        );
        return (
          <Modal
            open={statusModal.open}
            onCancel={() => setStatusModal({ open: false, employee: null })}
            title={isDeactivating ? `Mark ${emp.name} as Inactive` : `Reactivate ${emp.name}`}
            okText={isDeactivating ? "Mark Inactive" : "Reactivate"}
            cancelText="Cancel"
            okButtonProps={{ danger: isDeactivating, style: isDeactivating ? {} : { background: "#22c55e", borderColor: "#22c55e" } }}
            onOk={isDeactivating ? handleDeactivate : handleReactivate}
            width={480}
            centered
            destroyOnClose
          >
            {isDeactivating ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "4px 0" }}>
                {advBal > 0 && (
                  <Alert type="warning" showIcon message={`Outstanding advance of ${formatCurrency(advBal)} is still pending recovery`} />
                )}
                {hasPendingSalary && (
                  <Alert type="warning" showIcon message="This employee has unpaid / partial salary records" />
                )}
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--color-text)" }}>
                    Last Working Day <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <DatePicker value={statusDate} onChange={setStatusDate} format="DD MMMM YYYY" allowClear={false} style={{ width: "100%", height: 40 }} />
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "4px 0" }}>
                {emp.leavingDate && (
                  <Alert type="info" showIcon message={`Previously left on ${formatDate(emp.leavingDate)}`} />
                )}
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--color-text)" }}>
                    Re-Joining Date <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <DatePicker value={statusDate} onChange={setStatusDate} format="DD MMMM YYYY" allowClear={false} style={{ width: "100%", height: 40 }} />
                </div>
              </div>
            )}
          </Modal>
        );
      })()}

      <AppModal
        title="Delete this employee?"
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, employee: null })}
        onSubmit={handleDelete}
        submitText="Delete"
        cancelText="Cancel"
        danger
        width={460}
      >
        <Text style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          This will permanently remove <strong style={{ color: "var(--color-text)" }}>"{deleteModal.employee?.name}"</strong> and all their salary, increment and advance records. This cannot be undone.
        </Text>
      </AppModal>
    </section>
  );
};

export default Employee;
