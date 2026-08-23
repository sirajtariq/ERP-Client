import { useState, useEffect } from "react";
import { Modal, Spin, DatePicker } from "antd";
import { CalendarOutlined, CheckCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { AppButton } from "@/components/common";
import { getCompanyInfo } from "@/utils/companyInfoStore";
import { getBulkAttendance, saveBulkAttendance } from "@/services/employeeService";
import styles from "./styles.module.css";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const MAIN_S = [
  { v: "present", label: "P", color: "#22c55e", title: "Present"  },
  { v: "absent",  label: "A", color: "#ef4444", title: "Absent"   },
  { v: "half",    label: "½", color: "#f97316", title: "Half Day" },
  { v: "leave",   label: "L", color: "#3b82f6", title: "Leave"    },
];

const getMain = (s) => !s || s === "present" || s === "absent" ? (s || "present") : s.startsWith("half") ? "half" : "leave";
const getPaid = (s) => !s?.endsWith("unpaid");
const buildSt = (main, paid) => (main === "present" || main === "absent") ? main : `${main}_${paid ? "paid" : "unpaid"}`;

const AttendanceModal = ({ open, onClose, employees, onSave }) => {
  const [date,         setDate]         = useState(() => dayjs());
  const [rows,         setRows]         = useState({});
  const [loading,      setLoading]      = useState(false);
  const [saveLoading,  setSaveLoading]  = useState(false);
  const [alreadyMarked,setAlreadyMarked]= useState(false);
  const [apiEmployees, setApiEmployees] = useState([]);

  const active = apiEmployees.length > 0
    ? apiEmployees
    : employees.filter((e) => e.status === "active");

  const toUiStatus = (status, subType) => {
    if (!status) return "present";
    if (status === "present" || status === "absent") return status;
    if (status === "half_day") return subType === "unpaid" ? "half_unpaid" : "half_paid";
    if (status === "leave")    return subType === "unpaid" ? "leave_unpaid" : "leave_paid";
    return status;
  };

  const fetchBulk = async (d) => {
    if (!d) return;
    setLoading(true);
    try {
      const res     = await getBulkAttendance(dayjs.isDayjs(d) ? d.format("YYYY-MM-DD") : d);
      const records = res.records ?? [];
      setAlreadyMarked(res.isAlreadyMarked ?? false);
      setApiEmployees(records);
      const init = {};
      records.forEach((r) => {
        init[r.employeeId] = {
          status:  toUiStatus(r.status, r.subType),
          remarks: r.remarks || "",
        };
      });
      setRows(init);
    } catch {
      setApiEmployees([]);
      setAlreadyMarked(false);
      setRows({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    fetchBulk(date);
  }, [date, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const setStatus  = (id, v) => setRows((p) => ({ ...p, [id]: { ...p[id], status: v }  }));
  const setRemarks = (id, v) => setRows((p) => ({ ...p, [id]: { ...p[id], remarks: v } }));

  const handleMainClick = (id, main) => {
    const cur = rows[id]?.status;
    const curMain = getMain(cur);
    const curPaid = getPaid(cur);
    if (main === "present" || main === "absent") {
      setStatus(id, main);
    } else {
      // keep paid/unpaid choice if already on same main, else default paid
      const paid = curMain === main ? curPaid : true;
      setStatus(id, buildSt(main, paid));
    }
  };

  const handlePaidToggle = (id, paid) => {
    const cur = rows[id]?.status;
    const main = getMain(cur);
    setStatus(id, buildSt(main, paid));
  };

  const dateStr = dayjs.isDayjs(date) ? date.format("YYYY-MM-DD") : date;

  const toApiStatus = (uiStatus) => {
    if (!uiStatus || uiStatus === "present")   return { status: "present",  subType: null };
    if (uiStatus === "absent")                  return { status: "absent",   subType: null };
    if (uiStatus === "half_paid"  || uiStatus === "half")  return { status: "half_day", subType: "paid" };
    if (uiStatus === "half_unpaid")             return { status: "half_day", subType: "unpaid" };
    if (uiStatus === "leave_paid" || uiStatus === "leave") return { status: "leave",    subType: "paid" };
    if (uiStatus === "leave_unpaid")            return { status: "leave",    subType: "unpaid" };
    return { status: uiStatus, subType: null };
  };

  const handleSave = async () => {
    const records = active.map((e) => {
      const eId = e.employeeId ?? e.id;
      const { status, subType } = toApiStatus(rows[eId]?.status);
      return {
        employeeId: eId,
        status,
        ...(subType && { subType }),
        remarks: rows[eId]?.remarks || "",
      };
    });
    setSaveLoading(true);
    try {
      await saveBulkAttendance({ date: dateStr, records });
      onSave?.(dateStr, records);
      onClose();
    } finally {
      setSaveLoading(false);
    }
  };

  const { weeklyOffDays = [] } = getCompanyInfo();

  const dayLabel    = date ? date.format("dddd, DD MMMM YYYY") : "";
  const currentDay  = date ? DAY_NAMES[date.day()] : "";
  const isWeeklyOff = date ? weeklyOffDays.includes(currentDay) : false;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={920}
      centered
      destroyOnClose
      closable={false}
      styles={{ body: { padding: 0, overflow: "hidden", height: "85vh", display: "flex", flexDirection: "column" } }}
    >
      {/* ── Sticky header ── */}
      <div className={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className={styles.iconWrap}>
            <CalendarOutlined style={{ fontSize: 18, color: "#7c5cfc" }} />
          </div>
          <div>
            <h2 className={styles.title}>Mark Attendance</h2>
            <p className={styles.sub}>Record attendance for all active employees</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Prominent date selector */}
          <div style={{
            padding: "8px 14px", borderRadius: 10,
            border: "2px solid #7c5cfc",
            background: "rgba(124,92,252,0.06)",
            display: "flex", flexDirection: "column", gap: 2,
            cursor: "pointer",
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#7c5cfc", marginBottom: 2 }}>
              Attendance Date
            </div>
            <DatePicker
              value={date}
              onChange={(d) => d && setDate(d)}
              format="DD MMM YYYY"
              allowClear={false}
              suffixIcon={<CalendarOutlined style={{ color: "#7c5cfc" }} />}
              style={{ width: 170, height: 34, border: "none", background: "transparent", boxShadow: "none", padding: 0, fontWeight: 700, fontSize: 14, color: "var(--color-text)" }}
              variant="borderless"
              getPopupContainer={(trigger) => trigger.closest(".ant-modal-content") || document.body}
            />
            <div style={{ fontSize: 11, fontWeight: 600, color: isWeeklyOff ? "#ef4444" : "var(--color-text-secondary)" }}>
              {isWeeklyOff ? "⚠ Weekly Off" : dayLabel.split(",")[0]}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
      </div>

      {/* ── Scrollable middle ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 24px" }}>
      <Spin spinning={loading}>

        {isWeeklyOff && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, fontWeight: 600, color: "#ef4444", marginBottom: 12 }}>
            ⚠ {currentDay} is a weekly off — attendance is not typically marked.
          </div>
        )}
        {alreadyMarked && !isWeeklyOff && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.2)", fontSize: 12, fontWeight: 600, color: "#3b82f6", marginBottom: 12 }}>
            ℹ Attendance already marked for this date.
          </div>
        )}

        {/* Legend */}
        <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
          {MAIN_S.map((s) => (
            <span key={s.v} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: s.color }}>
              <span style={{ width: 20, height: 20, borderRadius: 5, background: s.color + "22", border: `1.5px solid ${s.color}`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>
                {s.label}
              </span>
              {s.title}
            </span>
          ))}
          <span style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 500, display: "flex", alignItems: "center" }}>
            · ½ and L require Paid / Unpaid selection
          </span>
        </div>

        {/* Bulk action */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {[
            { label: "All Present", status: "present", color: "#16a34a", activeBg: "#22c55e" },
            { label: "All Absent",  status: "absent",  color: "#dc2626", activeBg: "#ef4444" },
          ].map(({ label, status, color, activeBg }) => {
            const allMatch = active.length > 0 && active.every((e) => rows[e.employeeId ?? e.id]?.status === status);
            return (
              <button
                key={status}
                onClick={() => {
                  const next = allMatch ? "present" : status;
                  const init = {};
                  active.forEach((e) => { const id = e.employeeId ?? e.id; init[id] = { status: next, remarks: rows[id]?.remarks || "" }; });
                  setRows(init);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  height: 32, padding: "0 14px", borderRadius: 8,
                  border: `1.5px solid ${allMatch ? activeBg : "var(--color-border)"}`,
                  background: allMatch ? activeBg : "transparent",
                  color: allMatch ? "#fff" : "var(--color-text-secondary)",
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <span style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                  border: `2px solid ${allMatch ? "#fff" : "var(--color-border)"}`,
                  background: allMatch ? "#fff" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {allMatch && <span style={{ width: 8, height: 8, borderRadius: 2, background: activeBg }} />}
                </span>
                {label}
              </button>
            );
          })}
        </div>

        {/* Employee rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {active.map((emp, i) => {
            const empId   = emp.employeeId ?? emp.id;
            const empName = emp.employeeName ?? emp.name;
            const empSub  = emp.empId ?? emp.designation ?? "";
            const cur     = rows[empId]?.status || "present";
            const main    = getMain(cur);
            const paid    = getPaid(cur);
            const needsSub  = main === "half" || main === "leave";
            const mainColor = MAIN_S.find((s) => s.v === main)?.color || "#22c55e";

            return (
              <div key={empId} className={styles.empRow} style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 20, textAlign: "center", fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 600 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text)" }}>{empName}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{empSub}</div>
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    {MAIN_S.map((s) => {
                      const sel = main === s.v;
                      return (
                        <button
                          key={s.v}
                          onClick={() => handleMainClick(empId, s.v)}
                          title={s.title}
                          style={{
                            width: 34, height: 34, borderRadius: 8,
                            border: `2px solid ${sel ? s.color : "var(--color-border)"}`,
                            background: sel ? s.color + "22" : "transparent",
                            color: sel ? s.color : "var(--color-text-secondary)",
                            fontWeight: 800, fontSize: 13, cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    placeholder="Remarks..."
                    value={rows[empId]?.remarks || ""}
                    onChange={(e) => setRemarks(empId, e.target.value)}
                    className={styles.remarksInput}
                  />
                </div>

                {/* Paid / Unpaid sub-toggle */}
                {needsSub && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 30 }}>
                    <span style={{ fontSize: 11, color: mainColor, fontWeight: 600 }}>
                      {main === "half" ? "Half Day" : "Leave"} type:
                    </span>
                    {[{ v: true, label: "Paid" }, { v: false, label: "Unpaid" }].map(({ v, label }) => (
                      <button
                        key={label}
                        onClick={() => handlePaidToggle(empId, v)}
                        style={{
                          height: 26, padding: "0 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer",
                          border: `1.5px solid ${paid === v ? mainColor : "var(--color-border)"}`,
                          background: paid === v ? mainColor + "22" : "transparent",
                          color: paid === v ? mainColor : "var(--color-text-secondary)",
                          transition: "all 0.15s",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                    <span style={{ fontSize: 11, color: "var(--color-text-secondary)", marginLeft: 4 }}>
                      {paid ? "• Salary not deducted" : "• Salary will be deducted"}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Spin>
      </div>

      {/* ── Sticky footer ── */}
      <div style={{
        display: "flex", justifyContent: "flex-end", gap: 10,
        padding: "12px 24px",
        borderTop: "1px solid var(--color-border)",
        background: "var(--color-bg-secondary)",
        flexShrink: 0,
      }}>
        <AppButton onClick={onClose}>Cancel</AppButton>
        <AppButton type="primary" className="btn-dark" icon={<CheckCircleOutlined />} onClick={handleSave} loading={saveLoading}>
          Save Attendance
        </AppButton>
      </div>
    </Modal>
  );
};

export default AttendanceModal;
