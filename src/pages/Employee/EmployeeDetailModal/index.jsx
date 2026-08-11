import { Modal, Tag, Divider } from "antd";
import {
  UserOutlined, PhoneOutlined, MailOutlined, EnvironmentOutlined,
  IdcardOutlined, CalendarOutlined, RiseOutlined, DollarOutlined, TeamOutlined,
} from "@ant-design/icons";
import { formatCurrency, formatDate } from "@/utils";
import styles from "./styles.module.css";

const Row = ({ icon, label, value }) => (
  <div className={styles.row}>
    <span className={styles.rowIcon}>{icon}</span>
    <span className={styles.rowLabel}>{label}</span>
    <span className={styles.rowValue}>{value || "—"}</span>
  </div>
);

const EmployeeDetailModal = ({ open, onClose, employee, advanceBalance, totalIncrements, salaryRecordsCount }) => {
  if (!employee) return null;

  const totalIncremented = (employee.currentSalary || 0) - (employee.basicSalary || 0);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
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
            <p className={styles.sub}>{employee.designation} &nbsp;·&nbsp; {employee.department}</p>
            <Tag
              color={employee.status === "active" ? "success" : "default"}
              style={{ borderRadius: 6, fontWeight: 600, marginTop: 4, textTransform: "capitalize" }}
            >
              {employee.status}
            </Tag>
          </div>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {/* Quick stats */}
        <div className={styles.statsRow}>
          {[
            { label: "Current Salary",  value: formatCurrency(employee.currentSalary || 0), color: "#7c5cfc" },
            { label: "Advance Balance", value: formatCurrency(advanceBalance),               color: advanceBalance > 0 ? "#f97316" : "#22c55e" },
            { label: "Salary Payments", value: salaryRecordsCount,                          color: "#3b82f6" },
          ].map(({ label, value, color }) => (
            <div key={label} className={styles.statCard} style={{ borderColor: color + "33", background: color + "0d" }}>
              <span className={styles.statLabel} style={{ color }}>{label}</span>
              <span className={styles.statValue} style={{ color }}>{value}</span>
            </div>
          ))}
        </div>

        <Divider style={{ margin: "18px 0 14px" }} />

        {/* Personal Info */}
        <h3 className={styles.sectionTitle}><UserOutlined style={{ marginRight: 6 }} />Personal Info</h3>
        <div className={styles.infoBox}>
          <Row icon={<IdcardOutlined />}    label="Employee No."  value={employee.empNo} />
          <Row icon={<PhoneOutlined />}     label="Phone"         value={employee.phone} />
          <Row icon={<MailOutlined />}      label="Email"         value={employee.email} />
          <Row icon={<IdcardOutlined />}    label="CNIC"          value={employee.cnic} />
          <Row icon={<EnvironmentOutlined />} label="Address"     value={employee.address} />
          <Row icon={<CalendarOutlined />}  label="Joining Date"  value={employee.joiningDate ? formatDate(employee.joiningDate) : "—"} />
        </div>

        <Divider style={{ margin: "16px 0 14px" }} />

        {/* Salary Info */}
        <h3 className={styles.sectionTitle}><DollarOutlined style={{ marginRight: 6 }} />Salary Info</h3>
        <div className={styles.infoBox}>
          <Row icon={<DollarOutlined />} label="Basic Salary"      value={formatCurrency(employee.basicSalary || 0)} />
          <Row icon={<DollarOutlined />} label="Current Salary"    value={formatCurrency(employee.currentSalary || 0)} />
          <Row icon={<RiseOutlined />}   label="Total Incremented" value={`+ ${formatCurrency(totalIncremented)}`} />
          <Row icon={<TeamOutlined />}   label="No. of Increments" value={totalIncrements} />
        </div>
      </div>
    </Modal>
  );
};

export default EmployeeDetailModal;
