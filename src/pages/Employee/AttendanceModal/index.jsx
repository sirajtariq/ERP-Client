import { useState, useEffect } from "react";
import { Modal } from "antd";
import { CalendarOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { AppButton } from "@/components/common";
import { getCompanyInfo } from "@/utils/companyInfoStore";
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

const AttendanceModal = ({ open, onClose, employees, attendance, onSave }) => {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState({});

  const active = employees.filter((e) => e.status === "active");

  useEffect(() => {
    if (!open) return;
    const ex = {};
    attendance.filter((a) => a.date === date).forEach((a) => {
      ex[a.employeeId] = { status: a.status, remarks: a.remarks || "" };
    });
    const init = {};
    active.forEach((e) => { init[e.id] = ex[e.id] || { status: "present", remarks: "" }; });
    setRows(init);
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

  const handleSave = () => {
    const records = active.map((e) => ({
      employeeId: e.id,
      date,
      status:  rows[e.id]?.status  || "present",
      remarks: rows[e.id]?.remarks || "",
    }));
    onSave(date, records);
    onClose();
  };

  const { weeklyOffDays = [] } = getCompanyInfo();

  const alreadyMarked = attendance.some((a) => a.date === date);
  const d             = date ? new Date(date + "T00:00:00") : null;
  const dayLabel    = d ? d.toLocaleDateString("en-PK", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) : "";
  const currentDay  = d ? DAY_NAMES[d.getDay()] : "";
  const isWeeklyOff = d ? weeklyOffDays.includes(currentDay) : false;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      centered
      destroyOnClose
      closable={false}
      styles={{ body: { padding: 0, overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" } }}
    >
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
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 24px" }}>
        {/* Date */}
        <div style={{ marginBottom: 14 }}>
          <label className={styles.label}>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={styles.dateInput}
          />
          <div style={{ fontSize: 11, fontWeight: 600, marginTop: 5, color: isWeeklyOff ? "#ef4444" : "var(--color-text-secondary)" }}>
            {dayLabel}
          </div>
        </div>

        {isWeeklyOff && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, fontWeight: 600, color: "#ef4444", marginBottom: 12 }}>
            ⚠ {currentDay} is a weekly off — attendance is not typically marked.
          </div>
        )}
        {alreadyMarked && !isWeeklyOff && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.2)", fontSize: 12, fontWeight: 600, color: "#3b82f6", marginBottom: 12 }}>
            ℹ Attendance already marked for this date. To edit individual records, open the employee&apos;s View modal → Attendance tab.
          </div>
        )}

        {/* Legend */}
        <div style={{ display: "flex", gap: 14, marginBottom: 12, flexWrap: "wrap" }}>
          {MAIN_S.map((s) => (
            <span key={s.v} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: s.color }}>
              <span style={{ width: 22, height: 22, borderRadius: 5, background: s.color + "22", border: `1.5px solid ${s.color}`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>
                {s.label}
              </span>
              {s.title}
            </span>
          ))}
          <span style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 500, display: "flex", alignItems: "center" }}>
            • ½ and L require Paid / Unpaid selection
          </span>
        </div>

        {/* Employee rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {active.map((emp, i) => {
            const cur  = rows[emp.id]?.status || "present";
            const main = getMain(cur);
            const paid = getPaid(cur);
            const needsSub = main === "half" || main === "leave";
            const mainColor = MAIN_S.find((s) => s.v === main)?.color || "#22c55e";

            return (
              <div key={emp.id} className={styles.empRow} style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 20, textAlign: "center", fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 600 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--color-text)" }}>{emp.name}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{emp.designation}</div>
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    {MAIN_S.map((s) => {
                      const sel = main === s.v;
                      return (
                        <button
                          key={s.v}
                          onClick={() => handleMainClick(emp.id, s.v)}
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
                    value={rows[emp.id]?.remarks || ""}
                    onChange={(e) => setRemarks(emp.id, e.target.value)}
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
                        onClick={() => handlePaidToggle(emp.id, v)}
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

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <AppButton onClick={onClose}>Cancel</AppButton>
          <AppButton type="primary" className="btn-dark" icon={<CheckCircleOutlined />} onClick={handleSave}>
            Save Attendance
          </AppButton>
        </div>
      </div>
    </Modal>
  );
};

export default AttendanceModal;
