import { useMemo } from "react";
import dayjs from "dayjs";
import { Modal, Tabs, Table, Tag, Divider, Popconfirm } from "antd";
import {
  UserOutlined, PhoneOutlined, MailOutlined, EnvironmentOutlined,
  IdcardOutlined, CalendarOutlined, RiseOutlined, DollarOutlined,
  CreditCardOutlined, DeleteOutlined,
} from "@ant-design/icons";
import { AppButton } from "@/components/common";
import { formatCurrency, formatDate } from "@/utils";
import styles from "./styles.module.css";

const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec",
];


const ADV_COLOR = { pending: "orange", partial: "blue", recovered: "green" };

const InfoRow = ({ icon, label, value }) => (
  <div className={styles.row}>
    <span className={styles.rowIcon}>{icon}</span>
    <span className={styles.rowLabel}>{label}</span>
    <span className={styles.rowValue}>{value || "—"}</span>
  </div>
);

const StatCard = ({ label, value, color }) => (
  <div className={styles.statCard} style={{ borderColor: color + "33", background: color + "0d" }}>
    <span className={styles.statLabel} style={{ color }}>{label}</span>
    <span className={styles.statValue} style={{ color }}>{value}</span>
  </div>
);

const MiniCard = ({ label, value, color, bg, border }) => (
  <div style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: bg, border: `1px solid ${border}` }}>
    <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", color, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 15, fontWeight: 800, color }}>{value}</div>
  </div>
);

const EmployeeDetailModal = ({
  open, onClose, employee,
  advanceBalance, empSalaryRecords = [], empIncrements = [], empAdvances = [],
  onDeleteSalaryRecord, onDeleteIncrement, onDeleteAdvance,
}) => {
  const totalGiven         = useMemo(() => empAdvances.reduce((s, a) => s + a.amount, 0), [empAdvances]);
  const totalPaidYTD       = useMemo(() => empSalaryRecords.reduce((s, r) => s + (r.amountPaid || 0), 0), [empSalaryRecords]);
  const totalBonusYTD      = useMemo(() => empSalaryRecords.reduce((s, r) => s + (r.bonus || 0), 0), [empSalaryRecords]);
  const totalPendingSalary = useMemo(
    () => empSalaryRecords.filter(r => r.status !== "paid").reduce((s, r) => s + (r.netSalary - (r.amountPaid || 0)), 0),
    [empSalaryRecords]
  );

  // Full month-by-month timeline from joining date → current month
  const monthTimeline = useMemo(() => {
    if (!employee?.joiningDate) return [];
    const start = dayjs(employee.joiningDate).startOf("month");
    const end   = dayjs().startOf("month");
    const rows  = [];
    let cur = end;
    while (cur.valueOf() >= start.valueOf()) {
      const m = cur.month() + 1;
      const y = cur.year();
      const record = empSalaryRecords.find((r) => r.month === m && r.year === y) || null;
      rows.push({ key: record?.id ?? `${y}-${m}`, month: m, year: y, record });
      cur = cur.subtract(1, "month");
    }
    return rows;
  }, [employee?.joiningDate, empSalaryRecords]);

  // Only count months with an actual record that isn't fully paid (not "no record" months)
  const unpaidMonthCount = useMemo(
    () => monthTimeline.filter((row) => row.record && row.record.status !== "paid").length,
    [monthTimeline]
  );

  if (!employee) return null;

  const totalIncremented = (employee.currentSalary || 0) - (employee.basicSalary || 0);

  const salaryExpandedRow = (record) => {
    const cols = [
      { title: "Date",    dataIndex: "date",   key: "date",   width: 110, render: (v) => <span style={{ fontSize: 12 }}>{formatDate(v)}</span> },
      { title: "Amount",  dataIndex: "amount", key: "amount", width: 110, render: (v) => <span style={{ fontWeight: 700, color: "#22c55e" }}>{formatCurrency(v)}</span> },
      { title: "Method",  dataIndex: "method", key: "method", width: 120, render: (v) => <Tag style={{ borderRadius: 4, fontSize: 11 }}>{v}</Tag> },
      { title: "Paid By", dataIndex: "paidBy", key: "paidBy", render: (v) => <span style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>{v}</span> },
      { title: "Remarks", dataIndex: "remarks",key: "remarks",render: (v) => <span style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>{v || "—"}</span> },
    ];
    return <Table columns={cols} dataSource={record.payments || []} rowKey="id" size="small" pagination={false} style={{ margin: "4px 0" }} />;
  };

  // ── Increment columns ──
  const incColumns = [
    { title: "Effective Date",  dataIndex: "effectiveDate",  key: "date", width: "14%", render: (v) => <span style={{ fontWeight: 600 }}>{formatDate(v)}</span> },
    { title: "Previous Salary", dataIndex: "previousSalary", key: "prev", width: "16%", render: (v) => <span style={{ color: "#64748b" }}>{formatCurrency(v)}</span> },
    { title: "Increment",       dataIndex: "incrementAmount",key: "inc",  width: "13%", render: (v) => <span style={{ fontWeight: 700, color: "#22c55e" }}>+{formatCurrency(v)}</span> },
    { title: "New Salary",      dataIndex: "newSalary",      key: "new",  width: "15%", render: (v) => <span style={{ fontWeight: 800, color: "#7c5cfc" }}>{formatCurrency(v)}</span> },
    { title: "Reason",          dataIndex: "reason",         key: "reason", ellipsis: true, render: (v) => <span style={{ color: "var(--color-text-secondary)" }}>{v}</span> },
    { title: "Approved By",     dataIndex: "approvedBy",     key: "appr", width: "13%", render: (v) => <span style={{ color: "var(--color-text-secondary)" }}>{v || "—"}</span> },
    onDeleteIncrement && {
      title: "", key: "action", width: "5%",
      render: (_, r) => (
        <Popconfirm title="Delete this increment?" onConfirm={() => onDeleteIncrement(r.id)} okText="Delete" cancelText="No" okType="danger">
          <AppButton type="text" size="small" icon={<DeleteOutlined />} danger />
        </Popconfirm>
      ),
    },
  ].filter(Boolean);

  // ── Advance columns ──
  const advColumns = [
    { title: "Date",        dataIndex: "date",          key: "date",   width: "13%", render: (v) => <span style={{ fontWeight: 600, fontSize: 12 }}>{formatDate(v)}</span> },
    { title: "Amount",      dataIndex: "amount",        key: "amount", width: "14%", render: (v) => <span style={{ fontWeight: 700, color: "#f97316" }}>{formatCurrency(v)}</span> },
    { title: "Deducted",    dataIndex: "deductedAmount",key: "ded",    width: "13%", render: (v) => <span style={{ color: "#22c55e", fontWeight: 600 }}>{formatCurrency(v || 0)}</span> },
    { title: "Remaining",   key: "remaining", width: "13%",
      render: (_, r) => { const rem = r.amount - (r.deductedAmount || 0); return <span style={{ fontWeight: 700, color: rem > 0 ? "#ef4444" : "#22c55e" }}>{formatCurrency(rem)}</span>; }},
    { title: "Status",      dataIndex: "status",        key: "status", width: "10%",
      render: (v) => <Tag color={ADV_COLOR[v] || "default"} style={{ borderRadius: 5, fontWeight: 600, textTransform: "capitalize" }}>{v}</Tag> },
    { title: "Method",      dataIndex: "paymentMethod", key: "method", width: "13%", render: (v) => <span style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>{v}</span> },
    { title: "Reason",      dataIndex: "reason",        key: "reason", ellipsis: true, render: (v) => <span style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>{v}</span> },
    onDeleteAdvance && {
      title: "", key: "action", width: "5%",
      render: (_, r) => (
        <Popconfirm title="Delete this advance?" onConfirm={() => onDeleteAdvance(r.id)} okText="Delete" cancelText="No" okType="danger">
          <AppButton type="text" size="small" icon={<DeleteOutlined />} danger />
        </Popconfirm>
      ),
    },
  ].filter(Boolean);

  const tabItems = [
    {
      key: "personal",
      label: <span style={{ fontWeight: 600 }}><UserOutlined /> Personal</span>,
      children: (
        <div>
          <h3 className={styles.sectionTitle}><UserOutlined style={{ marginRight: 6 }} />Personal Info</h3>
          <div className={styles.infoBox}>
            <InfoRow icon={<IdcardOutlined />}      label="Employee No."  value={employee.empNo} />
            <InfoRow icon={<PhoneOutlined />}       label="Phone"         value={employee.phone} />
            <InfoRow icon={<MailOutlined />}        label="Email"         value={employee.email} />
            <InfoRow icon={<IdcardOutlined />}      label="CNIC"          value={employee.cnic} />
            <InfoRow icon={<EnvironmentOutlined />} label="Address"       value={employee.address} />
            <InfoRow icon={<CalendarOutlined />}    label="Joining Date"  value={employee.joiningDate ? formatDate(employee.joiningDate) : "—"} />
            {employee.leavingDate   && <InfoRow icon={<CalendarOutlined />} label="Left On"       value={formatDate(employee.leavingDate)} />}
            {employee.reJoiningDate && <InfoRow icon={<CalendarOutlined />} label="Re-Joined On"  value={formatDate(employee.reJoiningDate)} />}
          </div>

          <Divider style={{ margin: "16px 0 14px" }} />

          <h3 className={styles.sectionTitle}><DollarOutlined style={{ marginRight: 6 }} />Salary Info</h3>
          <div className={styles.infoBox}>
            <InfoRow icon={<DollarOutlined />} label="Basic Salary"      value={formatCurrency(employee.basicSalary || 0)} />
            <InfoRow icon={<DollarOutlined />} label="Current Salary"    value={formatCurrency(employee.currentSalary || 0)} />
            <InfoRow icon={<RiseOutlined />}   label="Total Incremented" value={`+ ${formatCurrency(totalIncremented)}`} />
            <InfoRow icon={<RiseOutlined />}   label="No. of Increments" value={empIncrements.length} />
          </div>
        </div>
      ),
    },
    {
      key: "salary",
      label: (
        <span style={{ fontWeight: 600 }}>
          <DollarOutlined /> Salary History
          {unpaidMonthCount > 0 && (
            <span style={{ marginLeft: 6, background: "#ef4444", color: "#fff", borderRadius: 10, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>
              {unpaidMonthCount} unpaid
            </span>
          )}
        </span>
      ),
      children: (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <MiniCard label="Total Paid"      value={formatCurrency(totalPaidYTD)}         color="#22c55e" bg="rgba(34,197,94,0.07)"    border="rgba(34,197,94,0.2)" />
            <MiniCard label="Total Bonus"     value={formatCurrency(totalBonusYTD)}         color="#3b82f6" bg="rgba(59,130,246,0.07)"   border="rgba(59,130,246,0.2)" />
            <MiniCard label="Pending Salary"  value={formatCurrency(totalPendingSalary)}    color={totalPendingSalary > 0 ? "#ef4444" : "#22c55e"} bg={totalPendingSalary > 0 ? "rgba(239,68,68,0.07)" : "rgba(34,197,94,0.07)"} border={totalPendingSalary > 0 ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"} />
            <MiniCard label="Partial / Pending" value={unpaidMonthCount}                    color={unpaidMonthCount > 0 ? "#f97316" : "#22c55e"} bg={unpaidMonthCount > 0 ? "rgba(249,115,22,0.07)" : "rgba(34,197,94,0.07)"} border={unpaidMonthCount > 0 ? "rgba(249,115,22,0.2)" : "rgba(34,197,94,0.2)"} />
          </div>
          <Table
            dataSource={monthTimeline}
            rowKey="key"
            size="small"
            pagination={{ pageSize: 12, showSizeChanger: false, size: "small" }}
            expandable={{
              expandedRowRender: (row) => row.record ? salaryExpandedRow(row.record) : null,
              rowExpandable: (row) => (row.record?.payments?.length || 0) > 0,
            }}
            locale={{ emptyText: "No months to display" }}
            style={{ border: "1px solid var(--color-border)", borderRadius: 8, overflow: "hidden" }}
            rowClassName={(row) => (!row.record || row.record.status !== "paid") ? "row-unpaid" : ""}
            columns={[
              {
                title: "Month",
                key: "period",
                width: "12%",
                render: (_, row) => (
                  <span style={{ fontWeight: 700 }}>
                    {MONTHS[row.month - 1]} {row.year}
                  </span>
                ),
              },
              {
                title: "Net Salary",
                key: "net",
                width: "13%",
                render: (_, row) => row.record
                  ? <span style={{ fontWeight: 700 }}>{formatCurrency(row.record.netSalary)}</span>
                  : <span style={{ color: "#cbd5e1" }}>—</span>,
              },
              {
                title: "Bonus",
                key: "bonus",
                width: "10%",
                render: (_, row) => row.record?.bonus
                  ? <span style={{ color: "#22c55e", fontWeight: 600 }}>+{formatCurrency(row.record.bonus)}</span>
                  : <span style={{ color: "#cbd5e1" }}>—</span>,
              },
              {
                title: "Paid",
                key: "paid",
                width: "12%",
                render: (_, row) => row.record
                  ? <span style={{ fontWeight: 700, color: "#22c55e" }}>{formatCurrency(row.record.amountPaid || 0)}</span>
                  : <span style={{ color: "#cbd5e1" }}>—</span>,
              },
              {
                title: "Remaining",
                key: "remaining",
                width: "12%",
                render: (_, row) => {
                  if (!row.record) return <span style={{ color: "#cbd5e1" }}>—</span>;
                  const rem = row.record.netSalary - (row.record.amountPaid || 0);
                  return rem > 0
                    ? <span style={{ fontWeight: 700, color: "#ef4444" }}>{formatCurrency(rem)}</span>
                    : <span style={{ color: "#22c55e", fontWeight: 700 }}>—</span>;
                },
              },
              {
                title: "Status",
                key: "status",
                width: "13%",
                render: (_, row) => {
                  if (!row.record) return <Tag style={{ borderRadius: 5, fontWeight: 600, fontSize: 11, color: "#94a3b8", borderColor: "#e2e8f0", background: "#f8fafc" }}>No Record</Tag>;
                  if (row.record.status === "paid")    return <Tag color="success" style={{ borderRadius: 5, fontWeight: 700, fontSize: 11 }}>Paid</Tag>;
                  if (row.record.status === "partial") return <Tag color="warning" style={{ borderRadius: 5, fontWeight: 700, fontSize: 11 }}>Partial</Tag>;
                  return                                      <Tag color="error"   style={{ borderRadius: 5, fontWeight: 700, fontSize: 11 }}>Pending</Tag>;
                },
              },
              onDeleteSalaryRecord && {
                title: "",
                key: "action",
                width: "5%",
                render: (_, row) => row.record ? (
                  <Popconfirm title="Delete this salary record?" onConfirm={() => onDeleteSalaryRecord(row.record.id)} okText="Delete" cancelText="No" okType="danger">
                    <AppButton type="text" size="small" icon={<DeleteOutlined />} danger />
                  </Popconfirm>
                ) : null,
              },
            ].filter(Boolean)}
          />
        </div>
      ),
    },
    {
      key: "increments",
      label: <span style={{ fontWeight: 600 }}><RiseOutlined /> Increments ({empIncrements.length})</span>,
      children: (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <MiniCard label="Basic Salary"      value={formatCurrency(employee.basicSalary || 0)}   color="#64748b" bg="rgba(100,116,139,0.07)" border="rgba(100,116,139,0.2)" />
            <MiniCard label="Current Salary"    value={formatCurrency(employee.currentSalary || 0)} color="#7c5cfc" bg="rgba(124,92,252,0.07)"  border="rgba(124,92,252,0.2)" />
            <MiniCard label="Total Incremented" value={formatCurrency(totalIncremented)}             color="#22c55e" bg="rgba(34,197,94,0.07)"   border="rgba(34,197,94,0.2)" />
            <MiniCard label="No. of Increments" value={empIncrements.length}                        color="#3b82f6" bg="rgba(59,130,246,0.07)"  border="rgba(59,130,246,0.2)" />
          </div>
          <Table
            columns={incColumns}
            dataSource={[...empIncrements].sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate))}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 8, showSizeChanger: false, size: "small" }}
            locale={{ emptyText: "No increments recorded yet" }}
            style={{ border: "1px solid var(--color-border)", borderRadius: 8, overflow: "hidden" }}
          />
        </div>
      ),
    },
    {
      key: "advances",
      label: <span style={{ fontWeight: 600 }}><CreditCardOutlined /> Advances ({empAdvances.length})</span>,
      children: (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <MiniCard label="Outstanding Balance" value={formatCurrency(advanceBalance)}            color="#ef4444" bg="rgba(239,68,68,0.07)"    border="rgba(239,68,68,0.2)" />
            <MiniCard label="Total Given"         value={formatCurrency(totalGiven)}                color="#f97316" bg="rgba(249,115,22,0.07)"   border="rgba(249,115,22,0.2)" />
            <MiniCard label="Total Recovered"     value={formatCurrency(totalGiven - advanceBalance)} color="#22c55e" bg="rgba(34,197,94,0.07)" border="rgba(34,197,94,0.2)" />
          </div>
          <Table
            columns={advColumns}
            dataSource={[...empAdvances].sort((a, b) => new Date(b.date) - new Date(a.date))}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 8, showSizeChanger: false, size: "small" }}
            scroll={{ x: 600 }}
            locale={{ emptyText: "No advance records" }}
            style={{ border: "1px solid var(--color-border)", borderRadius: 8, overflow: "hidden" }}
          />
        </div>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={960}
      centered
      destroyOnClose
      closable={false}
      className={styles.modal}
      styles={{ body: { padding: 0, overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" } }}
    >
      {/* Sticky header */}
      <div className={styles.header}>
        <div className={styles.avatarWrap}>
          <div className={styles.avatar}>
            {employee.name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className={styles.name}>{employee.name}</h2>
            <p className={styles.sub}>{employee.designation} &nbsp;·&nbsp; {employee.department} &nbsp;·&nbsp; {employee.empNo}</p>
            <Tag color={employee.status === "active" ? "success" : "default"}
              style={{ borderRadius: 6, fontWeight: 600, marginTop: 4, textTransform: "capitalize" }}>
              {employee.status}
            </Tag>
          </div>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Overall summary cards */}
        <div style={{ display: "flex", gap: 10, padding: "16px 24px 4px" }}>
          <StatCard label="Current Salary"    value={formatCurrency(employee.currentSalary || 0)} color="#7c5cfc" />
          <StatCard label="Pending Salary"    value={formatCurrency(totalPendingSalary)}           color={totalPendingSalary > 0 ? "#ef4444" : "#22c55e"} />
          <StatCard label="Advance Balance"   value={formatCurrency(advanceBalance)}               color={advanceBalance > 0 ? "#f97316" : "#22c55e"} />
          <StatCard label="Salary Records"    value={empSalaryRecords.length}                      color="#3b82f6" />
          <StatCard label="No. of Increments" value={empIncrements.length}                         color="#22c55e" />
        </div>

        <div style={{ padding: "8px 24px 24px" }}>
          <Tabs items={tabItems} />
        </div>
      </div>
    </Modal>
  );
};

export default EmployeeDetailModal;
