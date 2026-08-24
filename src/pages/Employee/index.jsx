import { useState, useEffect, useCallback, useRef } from "react";
import { message, Typography, DatePicker, Alert } from "antd";
import { PlusOutlined, CalendarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { AppTable, AppButton, AppModal, PageHeader } from "@/components/common";
import FilterPanel from "@/components/common/FilterPanel";
import { formatCurrency, formatDate } from "@/utils";
import { filterConfig } from "@/utils/filterConfig";
import { useAuth } from "@/context/AuthContext";
import { useSearch } from "@/context/SearchContext";
import {
  getAllEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee,
  toggleEmployeeStatus, normalizeEmployee,
} from "@/services/employeeService";
import { MOCK_SALARY_RECORDS, MOCK_INCREMENTS, MOCK_ADVANCES, MOCK_ATTENDANCE } from "./mockData";
import { getEmployeeColumns } from "./columns";
import EmployeeDrawer from "./EmployeeDrawer";
import EmployeeDetailModal from "./EmployeeDetailModal";
import SalaryModal from "./SalaryModal";
import IncrementModal from "./IncrementModal";
import AdvanceDrawer from "./AdvanceDrawer";
import AttendanceModal from "./AttendanceModal";

const { Text } = Typography;

let nextAttId = 200;

const EMPLOYEE_STATUS_OPTIONS = [
  { label: "All",      value: "all"      },
  { label: "Active",   value: "active"   },
  { label: "Inactive", value: "inactive" },
];

const Employee = () => {
  const { userRole } = useAuth();
  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(userRole);
  const { searchText, setPlaceholder, clearSearch } = useSearch();

  const [employees,      setEmployees]     = useState([]);
  const [loading,        setLoading]       = useState(true);
  const [page,           setPage]          = useState({ current: 1, size: 10, total: 0 });
  const [summary,        setSummary]       = useState({ totalEmployees: 0, monthlyPayroll: 0, avgSalary: 0, totalAdvance: 0 });
  const [appliedFilters, setAppliedFilters]= useState({});
  const isInitialMount = useRef(true);
  const searchTimer    = useRef(null);

  // ── Salary / advance / increment / attendance still on local state ──
  const [salaryRecords, setSalaryRecords] = useState(MOCK_SALARY_RECORDS);
  const [increments,    setIncrements]    = useState(MOCK_INCREMENTS);
  const [advances,      setAdvances]      = useState(MOCK_ADVANCES);
  const [attendance,    setAttendance]    = useState(MOCK_ATTENDANCE);

  const [attendanceOpen,    setAttendanceOpen]    = useState(false);
  const [drawerOpen,        setDrawerOpen]        = useState(false);
  const [drawerLoading,     setDrawerLoading]     = useState(false);
  const [editingEmployee,   setEditingEmployee]   = useState(null);
  const [viewEmployee,      setViewEmployee]      = useState(null);
  const [salaryEmployee,    setSalaryEmployee]    = useState(null);
  const [incrementEmployee, setIncrementEmployee] = useState(null);
  const [advanceEmployee,   setAdvanceEmployee]   = useState(null);
  const [deleteModal,       setDeleteModal]       = useState({ open: false, employee: null });
  const [deleteLoading,     setDeleteLoading]     = useState(false);
  const [statusModal,       setStatusModal]       = useState({ open: false, employee: null });
  const [statusLoading,     setStatusLoading]     = useState(false);
  const [statusDate,        setStatusDate]        = useState(null);

  // ── Advance balance (from local advance state) ──
  const getAdvanceBalance = useCallback((employeeId) => {
    const given    = advances.filter((a) => a.employeeId === employeeId).reduce((s, a) => s + a.amount, 0);
    const deducted = salaryRecords.filter((r) => r.employeeId === employeeId).reduce((s, r) => s + (r.advanceDeduction || 0), 0);
    return Math.max(0, given - deducted);
  }, [advances, salaryRecords]);

  // ── Fetch ──
  const fetchEmployees = useCallback(async (pageNo = 1, pageSize = 10, search = "", filters = {}) => {
    setLoading(true);
    try {
      const res = await getAllEmployees({
        page: pageNo, pageSize,
        search:     search || "",
        status:     filters.status     || "",
        department: filters.department || "",
      });
      setEmployees((res.results || []).map(normalizeEmployee));
      setPage((prev) => ({ ...prev, current: pageNo, size: pageSize, total: res.count || 0 }));
      if (res.summary) {
        setSummary({
          totalEmployees: res.summary.activeEmployees      || 0,
          monthlyPayroll: parseFloat(res.summary.monthlyPayroll)     || 0,
          avgSalary:      parseFloat(res.summary.averageSalary)      || 0,
          totalAdvance:   parseFloat(res.summary.advanceOutstanding)  || 0,
        });
      }
    } catch {
      message.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPlaceholder("Search employees by name, ID, department...");
    fetchEmployees(1, page.size, "", {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced global search
  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage((prev) => ({ ...prev, current: 1 }));
      fetchEmployees(1, page.size, searchText, appliedFilters);
    }, 350);
  }, [searchText]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApplyFilters = (filters) => {
    setAppliedFilters(filters);
    setPage((prev) => ({ ...prev, current: 1 }));
    fetchEmployees(1, page.size, searchText, filters);
  };

  const handleResetFilters = () => {
    setAppliedFilters({});
    setPage((prev) => ({ ...prev, current: 1 }));
    fetchEmployees(1, page.size, searchText, {});
  };

  const handlePagination = (pageNo, pageSize) => {
    const size = pageSize || page.size;
    setPage((prev) => ({ ...prev, current: pageNo, size }));
    fetchEmployees(pageNo, size, searchText, appliedFilters);
  };


  // ── Employee CRUD ──
  const toApiPayload = (formData) => ({
    empId:         formData.empNo,
    name:          formData.name,
    designation:   formData.designation,
    department:    formData.department,
    joiningDate:   formData.joiningDate,
    basicSalary:   String(formData.basicSalary   || 0),
    currentSalary: String(formData.currentSalary || formData.basicSalary || 0),
    phone:         formData.phone   || "",
    email:         formData.email   || "",
    cnic:          formData.cnic    || "",
    address:       formData.address || "",
    status:        formData.status  || "active",
  });

  const handleAddEmployee = async (payload) => {
    setDrawerLoading(true);
    try {
      await createEmployee(toApiPayload(payload));
      message.success(`"${payload.name}" added successfully`);
      setDrawerOpen(false);
      fetchEmployees(page.current, page.size);
    } catch (err) {
      message.error(err?.response?.data?.detail || err?.response?.data?.empId?.[0] || "Failed to add employee");
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleUpdateEmployee = async (payload) => {
    setDrawerLoading(true);
    try {
      await updateEmployee(editingEmployee.id, toApiPayload(payload));
      message.success(`"${payload.name}" updated`);
      setDrawerOpen(false);
      setEditingEmployee(null);
      fetchEmployees(page.current, page.size);
    } catch (err) {
      message.error(err?.response?.data?.detail || "Failed to update employee");
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteEmployee(deleteModal.employee.id);
      message.success("Employee deleted");
      setDeleteModal({ open: false, employee: null });
      fetchEmployees(page.current, page.size);
    } catch (err) {
      message.error(err?.response?.data?.detail || "Failed to delete employee");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Attendance ──
  const handleSaveAttendance = (date, records) => {
    setAttendance((prev) => {
      const rest    = prev.filter((a) => a.date !== date);
      const newRecs = records.map((r) => ({ ...r, id: ++nextAttId }));
      return [...rest, ...newRecs];
    });
    message.success(`Attendance saved for ${date}`);
  };

  const handleEditAttendance = (employeeId, date, status, remarks) => {
    setAttendance((prev) => {
      const exists = prev.some((a) => a.employeeId === employeeId && a.date === date);
      if (exists) return prev.map((a) => a.employeeId === employeeId && a.date === date ? { ...a, status, remarks } : a);
      return [...prev, { id: ++nextAttId, employeeId, date, status, remarks }];
    });
    message.success("Attendance updated");
  };

  // ── Salary ──
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
        const deduct      = Math.min(remaining, outstanding);
        const newDeducted = (adv.deductedAmount || 0) + deduct;
        updates[adv.id]   = { deductedAmount: newDeducted, status: newDeducted >= adv.amount ? "recovered" : "partial" };
        remaining -= deduct;
      }
      return prev.map((a) => (updates[a.id] ? { ...a, ...updates[a.id] } : a));
    });
  };

  const handlePaySalary = (record) => {
    setSalaryRecords((prev) => [...prev, record]);
    applyAdvanceDeduction(record.employeeId, record.advanceDeduction);
  };

  const handleUpdateSalaryRecord = (updated) => setSalaryRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  const handleDeleteSalaryRecord = (id)      => { setSalaryRecords((prev) => prev.filter((r) => r.id !== id)); message.success("Record deleted"); };

  // ── Increment ──
  const handleAddIncrement = (record) => {
    setIncrements((prev) => [...prev, record]);
    setIncrementEmployee((prev) => (prev ? { ...prev, currentSalary: record.newSalary } : prev));
  };

  const handleDeleteIncrement = (id) => {
    const inc = increments.find((i) => i.id === id);
    if (inc) setIncrementEmployee((prev) => (prev ? { ...prev, currentSalary: inc.previousSalary } : prev));
    setIncrements((prev) => prev.filter((i) => i.id !== id));
    message.success("Increment deleted");
  };

  // ── Status toggle (API) ──
  const handleStatusToggle = (emp) => {
    setStatusDate(null);
    setStatusModal({ open: true, employee: emp });
  };

  const handleStatusConfirm = async () => {
    const emp            = statusModal.employee;
    const isDeactivating = emp.status === "active";
    if (!statusDate) {
      message.warning(isDeactivating ? "Please select last working day" : "Please select re-joining date");
      return;
    }
    const newStatus = isDeactivating ? "inactive" : "active";
    const body      = isDeactivating
      ? { status: "inactive", leavingDate:   statusDate.format("YYYY-MM-DD") }
      : { status: "active",   rejoiningDate: statusDate.format("YYYY-MM-DD") };
    setStatusLoading(true);
    try {
      await toggleEmployeeStatus(emp.id, body);
      message.success(`${emp.name} marked as ${newStatus}`);
      setStatusModal({ open: false, employee: null });
      fetchEmployees(page.current, page.size);
    } catch (err) {
      message.error(err?.response?.data?.detail || "Failed to update status");
    } finally {
      setStatusLoading(false);
    }
  };

  // ── Advance ──
  const handleGiveAdvance  = (record) => setAdvances((prev) => [...prev, record]);
  const handleDeleteAdvance = (id)    => { setAdvances((prev) => prev.filter((a) => a.id !== id)); message.success("Advance deleted"); };

  const handleView = async (rec) => {
    const hide = message.loading("Loading employee...", 0);
    try {
      const detail = await getEmployee(rec.id);
      setViewEmployee(normalizeEmployee(detail));
    } catch {
      message.error("Failed to load employee details");
    } finally {
      hide();
    }
  };

  const handleEdit = async (rec) => {
    const hide = message.loading("Loading employee...", 0);
    try {
      const detail = await getEmployee(rec.id);
      setEditingEmployee(normalizeEmployee(detail));
      setDrawerOpen(true);
    } catch {
      message.error("Failed to load employee details");
    } finally {
      hide();
    }
  };

  const columns = getEmployeeColumns({
    onView:         handleView,
    onSalary:       (rec) => setSalaryEmployee(rec),
    onAdvance:      (rec) => setAdvanceEmployee(rec),
    onIncrement:    (rec) => setIncrementEmployee(rec),
    onEdit:         handleEdit,
    onDelete:       (rec) => setDeleteModal({ open: true, employee: rec }),
    onStatusToggle: (rec) => handleStatusToggle(rec),
    isAdmin,
  });

  return (
    <section style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <PageHeader
        title="Employees"
        subtitle="Manage employee records, salaries, increments and advances"
        extra={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <FilterPanel
              config={filterConfig.employee}
              options={{ status: EMPLOYEE_STATUS_OPTIONS }}
              values={appliedFilters}
              onApply={handleApplyFilters}
              onReset={handleResetFilters}
            />
            <AppButton icon={<CalendarOutlined />} onClick={() => setAttendanceOpen(true)}>
              Mark Attendance
            </AppButton>
            <AppButton type="primary" icon={<PlusOutlined />} onClick={() => { setEditingEmployee(null); setDrawerOpen(true); }} className="btn-dark">
              Add Employee
            </AppButton>
          </div>
        }
      />

      {/* Summary cards */}
      <section style={{ display: "flex", gap: 12, marginBottom: 14, flexShrink: 0 }}>
        {[
          { label: "Active Employees",    value: summary.totalEmployees,                color: "#7c5cfc", bg: "rgba(124,92,252,0.07)", border: "rgba(124,92,252,0.18)", isCount: true },
          { label: "Monthly Payroll",     value: formatCurrency(summary.monthlyPayroll), color: "#22c55e", bg: "rgba(34,197,94,0.07)",  border: "rgba(34,197,94,0.18)"  },
          { label: "Average Salary",      value: formatCurrency(summary.avgSalary),      color: "#3b82f6", bg: "rgba(59,130,246,0.07)", border: "rgba(59,130,246,0.18)" },
          { label: "Advance Outstanding", value: formatCurrency(summary.totalAdvance),   color: "#f97316", bg: "rgba(249,115,22,0.07)", border: "rgba(249,115,22,0.18)" },
        ].map(({ label, value, color, bg, border, isCount }) => (
          <section key={label} style={{ flex: 1, padding: "12px 18px", borderRadius: 10, background: bg, border: `1px solid ${border}`, display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", color }}>{label}</span>
            <span style={{ fontSize: isCount ? 28 : "clamp(13px, 1.3vw, 20px)", fontWeight: 800, color, lineHeight: 1.2 }}>{value}</span>
          </section>
        ))}
      </section>

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <AppTable
          columns={columns}
          dataSource={employees}
          rowKey="id"
          loading={loading}
          scroll={{ y: "calc(100vh - 400px)" }}
          page={page}
          handlePagination={handlePagination}
        />
      </div>

      <EmployeeDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingEmployee(null); }}
        onSubmit={editingEmployee ? handleUpdateEmployee : handleAddEmployee}
        editingEmployee={editingEmployee}
        loading={drawerLoading}
      />

      <EmployeeDetailModal
        open={!!viewEmployee}
        onClose={() => setViewEmployee(null)}
        employee={viewEmployee}
        advanceBalance={viewEmployee?.advanceBalance ?? 0}
        empSalaryRecords={viewEmployee ? salaryRecords.filter((r) => r.employeeId === viewEmployee.id) : []}
        empIncrements={viewEmployee ? increments.filter((i) => i.employeeId === viewEmployee.id) : []}
        empAdvances={viewEmployee ? advances.filter((a) => a.employeeId === viewEmployee.id) : []}
        empAttendance={viewEmployee ? attendance.filter((a) => a.employeeId === viewEmployee.id) : []}
        onDeleteSalaryRecord={handleDeleteSalaryRecord}
        onDeleteIncrement={handleDeleteIncrement}
        onDeleteAdvance={handleDeleteAdvance}
        onEditAttendance={handleEditAttendance}
      />

      <SalaryModal
        open={!!salaryEmployee}
        onClose={() => setSalaryEmployee(null)}
        onSuccess={() => { setSalaryEmployee(null); fetchEmployees(page.current, page.size, searchText, appliedFilters); }}
        employee={salaryEmployee}
      />

      <IncrementModal
        open={!!incrementEmployee}
        onClose={() => setIncrementEmployee(null)}
        onSuccess={() => { setIncrementEmployee(null); fetchEmployees(page.current, page.size, searchText, appliedFilters); }}
        employee={incrementEmployee}
      />

      <AdvanceDrawer
        open={!!advanceEmployee}
        onClose={() => setAdvanceEmployee(null)}
        onSuccess={() => { setAdvanceEmployee(null); fetchEmployees(page.current, page.size, searchText, appliedFilters); }}
        employee={advanceEmployee}
      />

      {(() => {
        const emp              = statusModal.employee;
        if (!emp) return null;
        const isDeactivating   = emp.status === "active";
        const advBal           = emp.advanceBalance || 0;
        const hasPendingSalary = salaryRecords.some((r) => r.employeeId === emp.id && (r.status === "pending" || r.status === "partial"));
        return (
          <AppModal
            title={isDeactivating ? `Mark ${emp.name} as Inactive` : `Mark ${emp.name} as Active`}
            open={statusModal.open}
            onClose={() => setStatusModal({ open: false, employee: null })}
            onSubmit={handleStatusConfirm}
            submitText={isDeactivating ? "Mark Inactive" : "Mark Active"}
            loading={statusLoading}
            submitDisabled={!statusDate}
            danger={isDeactivating}
            width={460}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {isDeactivating && advBal > 0 && (
                <Alert type="warning" showIcon message={`Outstanding advance of ${formatCurrency(advBal)} is still pending recovery`} />
              )}
              {isDeactivating && hasPendingSalary && (
                <Alert type="warning" showIcon message="This employee has unpaid / partial salary records" />
              )}
              {!isDeactivating && emp.leavingDate && (
                <Alert type="info" showIcon message={`Previously left on ${formatDate(emp.leavingDate)}`} />
              )}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--color-text)" }}>
                  {isDeactivating ? "Last Working Day" : "Re-Joining Date"} <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <DatePicker
                  value={statusDate}
                  onChange={setStatusDate}
                  format="DD MMMM YYYY"
                  allowClear={false}
                  style={{ width: "100%", height: 40 }}
                  placeholder={isDeactivating ? "Select last working day" : "Select re-joining date"}
                />
              </div>
            </div>
          </AppModal>
        );
      })()}

      <AppModal
        title="Delete this employee?"
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, employee: null })}
        onSubmit={handleDelete}
        submitText="Delete"
        cancelText="Cancel"
        loading={deleteLoading}
        danger
        width={460}
      >
        <Text style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          This will permanently remove <strong style={{ color: "var(--color-text)" }}>"{deleteModal.employee?.name}"</strong> and cannot be undone.
        </Text>
      </AppModal>

      <AttendanceModal
        open={attendanceOpen}
        onClose={() => setAttendanceOpen(false)}
        employees={employees}
        onSave={handleSaveAttendance}
      />
    </section>
  );
};

export default Employee;
