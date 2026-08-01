import { Tag } from "antd";
import {
  UserOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  PhoneOutlined,
  BankOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  SolutionOutlined,
} from "@ant-design/icons";
import { AppDrawer } from "@/components/common";
import styles from "./styles.module.css";

const ROLE_COLORS  = { Admin: "blue", Sales: "green", Purchase: "purple" };
const ROLE_ICON_BG = { Admin: "#dbeafe", Sales: "#dcfce7", Purchase: "#ede9fe" };
const ROLE_ICON_CL = { Admin: "#3b82f6", Sales: "#22c55e", Purchase: "#7c5cfc" };

const EMPLOYMENT_LABELS = { fulltime: "Full-time", parttime: "Part-time", contract: "Contract" };
const SALARY_LABELS     = { monthly: "Monthly", daily: "Daily", perjob: "Per Job" };

const getInitials = (fullname = "", username = "") => {
  const name = fullname || username;
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase() || "U";
};

const InfoRow = ({ icon, bg, color, label, value }) => (
  <section className={styles.row}>
    <span className={styles.iconWrap} style={{ background: bg, color }}>{icon}</span>
    <span className={styles.label}>{label}</span>
    <span className={styles.value}>{value ?? "-"}</span>
  </section>
);

const UserViewDrawer = ({ open, onClose, user }) => {
  if (!user) return null;

  const roleColor = ROLE_COLORS[user.role]  || "default";
  const iconBg    = ROLE_ICON_BG[user.role] || "#f1f5f9";
  const iconColor = ROLE_ICON_CL[user.role] || "#64748b";

  return (
    <AppDrawer title="User Details" open={open} onClose={onClose} footer={false}>

      {/* Banner */}
      <section className={styles.banner}>
        <div className={styles.avatar}>{getInitials(user.fullname, user.username)}</div>
        <span className={styles.bannerName}>{user.fullname || user.username}</span>
        <span className={styles.bannerSub}>@{user.username}</span>
        {user.role && (
          <span className={styles.roleBadge}>
            <Tag color={roleColor} style={{ borderRadius: 20, fontWeight: 700, fontSize: 11, padding: "2px 12px", margin: 0 }}>
              {user.role}
            </Tag>
          </span>
        )}
      </section>

      {/* Account */}
      <p className={styles.sectionTitle}>Account</p>
      <section className={styles.card} style={{ marginBottom: 16 }}>
        <InfoRow icon={<UserOutlined />}              bg="#eff6ff"  color="#3b82f6" label="Username" value={user.username} />
        <InfoRow icon={<MailOutlined />}              bg="#f0fdf4"  color="#22c55e" label="Email"    value={user.email || "-"} />
        <InfoRow
          icon={<SafetyCertificateOutlined />}
          bg={iconBg} color={iconColor}
          label="Role"
          value={
            <Tag color={roleColor} style={{ borderRadius: 6, fontWeight: 600, margin: 0, fontSize: 12 }}>
              {user.role || "-"}
            </Tag>
          }
        />
      </section>

      {/* Personal */}
      <p className={styles.sectionTitle}>Personal Info</p>
      <section className={styles.card} style={{ marginBottom: 16 }}>
        <InfoRow icon={<UserOutlined />}        bg="#eff6ff" color="#3b82f6" label="Full Name" value={user.fullname} />
        <InfoRow icon={<PhoneOutlined />}       bg="#f0fdf4" color="#22c55e" label="Phone"     value={user.phone} />
        <InfoRow icon={<BankOutlined />}        bg="#fef9f0" color="#f59e0b" label="CNIC"      value={user.cnic} />
        <InfoRow icon={<EnvironmentOutlined />} bg="#fff1f2" color="#f43f5e" label="Address"   value={user.address || "-"} />
      </section>

      {/* Employment */}
      <p className={styles.sectionTitle}>Employment</p>
      <section className={styles.card}>
        <InfoRow icon={<SolutionOutlined />}    bg="#ede9fe" color="#7c5cfc" label="Designation"      value={user.designation} />
        <InfoRow icon={<CalendarOutlined />}    bg="#fef9f0" color="#f59e0b" label="Date of Joining"  value={user.dateofjoining} />
        <InfoRow icon={<ClockCircleOutlined />} bg="#eff6ff" color="#3b82f6" label="Employment Type"  value={EMPLOYMENT_LABELS[user.employmenttype] || user.employmenttype || "-"} />
        <InfoRow icon={<DollarOutlined />}      bg="#f0fdf4" color="#22c55e" label="Basic Salary"     value={user.basicsalary != null ? `Rs ${Number(user.basicsalary).toLocaleString("en-PK")}` : "-"} />
        <InfoRow icon={<DollarOutlined />}      bg="#f0fdf4" color="#22c55e" label="Salary Type"      value={SALARY_LABELS[user.salarytype] || user.salarytype || "-"} />
      </section>

    </AppDrawer>
  );
};

export default UserViewDrawer;
