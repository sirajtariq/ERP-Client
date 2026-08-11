import { useState, useEffect, useMemo } from "react";
import { Modal, Table, Row, Col, Divider, Popconfirm, message } from "antd";
import { RiseOutlined, DeleteOutlined } from "@ant-design/icons";
import { AppButton, AppInput } from "@/components/common";
import { formatCurrency, formatDate } from "@/utils";
import styles from "./styles.module.css";

const emptyForm = { effectiveDate: "", incrementAmount: "", reason: "", approvedBy: "" };

const IncrementModal = ({ open, onClose, employee, increments, onAddIncrement, onDeleteIncrement }) => {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (open) setForm(emptyForm);
  }, [open]);

  const empIncrements = useMemo(
    () => (increments || []).filter((i) => i.employeeId === employee?.id)
         .sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate)),
    [increments, employee]
  );

  const newSalary = (employee?.currentSalary || 0) + (Number(form.incrementAmount) || 0);

  const totalIncrement = useMemo(() => {
    if (!employee) return 0;
    return (employee.currentSalary || 0) - (employee.basicSalary || 0);
  }, [employee]);

  const handleAdd = () => {
    if (!form.effectiveDate) { message.warning("Please select effective date"); return; }
    if (!Number(form.incrementAmount) || Number(form.incrementAmount) <= 0) { message.warning("Enter a valid increment amount"); return; }
    if (!form.reason) { message.warning("Please enter reason for increment"); return; }

    const record = {
      id: Date.now(),
      employeeId: employee.id,
      effectiveDate: form.effectiveDate,
      previousSalary: employee.currentSalary,
      incrementAmount: Number(form.incrementAmount),
      newSalary,
      reason: form.reason,
      approvedBy: form.approvedBy || "—",
    };
    onAddIncrement(record);
    message.success(`Increment of ${formatCurrency(Number(form.incrementAmount))} added`);
    setForm(emptyForm);
  };

  if (!employee) return null;

  const columns = [
    { title: "Effective Date",   dataIndex: "effectiveDate",   key: "date",    width: "14%", render: (v) => <span style={{ fontWeight: 600 }}>{formatDate(v)}</span> },
    { title: "Previous Salary",  dataIndex: "previousSalary",  key: "prev",    width: "15%", render: (v) => <span style={{ color: "#64748b" }}>{formatCurrency(v)}</span> },
    { title: "Increment",        dataIndex: "incrementAmount",  key: "inc",     width: "13%", render: (v) => <span style={{ fontWeight: 700, color: "#22c55e" }}>+{formatCurrency(v)}</span> },
    { title: "New Salary",       dataIndex: "newSalary",       key: "new",     width: "15%", render: (v) => <span style={{ fontWeight: 800, color: "#7c5cfc", fontSize: 13 }}>{formatCurrency(v)}</span> },
    { title: "Reason",           dataIndex: "reason",          key: "reason",  ellipsis: true, render: (v) => <span style={{ color: "var(--color-text-secondary)" }}>{v}</span> },
    { title: "Approved By",      dataIndex: "approvedBy",      key: "appr",    width: "13%", render: (v) => <span style={{ color: "var(--color-text-secondary)" }}>{v || "—"}</span> },
    {
      title: "", key: "action", width: "5%",
      render: (_, r) => (
        <Popconfirm title="Delete this increment?" onConfirm={() => onDeleteIncrement(r.id)} okText="Delete" cancelText="No" okType="danger">
          <AppButton type="text" size="small" icon={<DeleteOutlined />} danger />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={860} centered destroyOnClose closable={false} className={styles.modal}
      styles={{ body: { padding: 0, overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" } }}>
      {/* Sticky header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}><RiseOutlined style={{ marginRight: 8, color: "#3b82f6" }} />Salary Increment</h2>
          <p className={styles.subtitle}>{employee.name} &nbsp;·&nbsp; {employee.empNo} &nbsp;·&nbsp; {employee.designation}</p>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {/* Current salary info */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Basic Salary",       value: formatCurrency(employee.basicSalary || 0),   color: "#64748b", bg: "rgba(100,116,139,0.07)", border: "rgba(100,116,139,0.2)" },
            { label: "Current Salary",     value: formatCurrency(employee.currentSalary || 0), color: "#7c5cfc", bg: "rgba(124,92,252,0.07)",  border: "rgba(124,92,252,0.2)" },
            { label: "Total Incremented",  value: formatCurrency(totalIncrement),              color: "#22c55e", bg: "rgba(34,197,94,0.07)",   border: "rgba(34,197,94,0.2)" },
            { label: "No. of Increments",  value: empIncrements.length,                        color: "#3b82f6", bg: "rgba(59,130,246,0.07)",  border: "rgba(59,130,246,0.2)" },
          ].map(({ label, value, color, bg, border }) => (
            <div key={label} style={{ flex: 1, padding: "12px 16px", borderRadius: 10, background: bg, border: `1px solid ${border}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color, letterSpacing: "0.5px" }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className={styles.formBox}>
          <h3 className={styles.sectionTitle}>Add New Increment</h3>
          <Row gutter={16}>
            <Col span={6}>
              <AppInput
                inputType="date"
                label="Effective Date *"
                value={form.effectiveDate}
                onChange={(e) => setForm(f => ({ ...f, effectiveDate: e.target.value }))}
              />
            </Col>
            <Col span={6}>
              <AppInput
                inputType="number"
                label="Increment Amount (Rs) *"
                placeholder="0"
                min={0}
                value={form.incrementAmount}
                onChange={(v) => setForm(f => ({ ...f, incrementAmount: v }))}
              />
            </Col>
            <Col span={6}>
              <label className={styles.fieldLabel}>New Salary (Preview)</label>
              <div className={styles.previewSalary}>{formatCurrency(newSalary)}</div>
            </Col>
            <Col span={6}>
              <AppInput
                label="Approved By"
                placeholder="e.g. Director"
                value={form.approvedBy}
                onChange={(e) => setForm(f => ({ ...f, approvedBy: e.target.value }))}
              />
            </Col>
          </Row>
          <AppInput
            label="Reason *"
            placeholder="e.g. Annual Performance Review, Promotion"
            value={form.reason}
            onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
            <AppButton type="primary" icon={<RiseOutlined />} onClick={handleAdd} className="btn-dark" style={{ minWidth: 150 }}>
              Add Increment
            </AppButton>
          </div>
        </div>

        <Divider style={{ margin: "20px 0" }} />

        <h3 className={styles.sectionTitle} style={{ marginBottom: 12 }}>Increment History</h3>
        <Table
          columns={columns}
          dataSource={empIncrements}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 6, showSizeChanger: false, size: "small" }}
          locale={{ emptyText: "No increments recorded yet" }}
          style={{ border: "1px solid var(--color-border)", borderRadius: 8, overflow: "hidden" }}
        />
      </div>
    </Modal>
  );
};

export default IncrementModal;
