import { useState, useEffect } from "react";
import { Layout, Avatar, Dropdown, Badge, Tag, DatePicker, message } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import { useDashboardFilter } from "@/context/DashboardFilterContext";

const { RangePicker } = DatePicker;
import {
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";
import { useSearch } from "@/context/SearchContext";
import { SearchBar } from "@/components/common";
import styles from "./styles.module.css";

const { Header: AntHeader } = Layout;

const formatDateTime = () => {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return { dateStr, timeStr };
};

const Header = () => {
  const { user, logout, userRole } = useAuth();
  const { searchText, setSearchText, placeholder } = useSearch();
  const { dateRange, setDateRange } = useDashboardFilter();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isDashboard = pathname === "/dashboard";
  const [dateTime, setDateTime] = useState(formatDateTime);

  useEffect(() => {
    const timer = setInterval(() => {
      setDateTime(formatDateTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleMenuClick = ({ key }) => {
    if (key === "logout") {
      logout();
      navigate("/login");
    } else if (key === "settings") {
      navigate("/settings");
    }
  };

  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: (
        <span>
          {user?.name}
          <Tag
            color={userRole === "SUPER_ADMIN" ? "purple" : userRole === "SALES_USER" ? "green" : userRole === "PURCHASE_USER" ? "orange" : "blue"}
            style={{ marginLeft: 8, fontSize: 10 }}
          >
            {userRole}
          </Tag>
        </span>
      ),
      disabled: true,
    },
    { type: "divider" },
    ...(["ADMIN", "SUPER_ADMIN"].includes(userRole)
      ? [{ key: "settings", icon: <SettingOutlined />, label: "Settings" }]
      : []),
    { key: "logout", icon: <LogoutOutlined />, label: "Logout", danger: true },
  ];

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <AntHeader className={styles.header}>
      {isDashboard ? (
        <div className={styles.searchWrapper} style={{ maxWidth: 280 }}>
          <RangePicker
            value={dateRange}
            onChange={(range) => setDateRange(range ?? [null, null])}
            onCalendarChange={(dates) => {
              if (dates?.[0] && !dates?.[1]) {
                message.info("Please select an end date");
              } else if (!dates?.[0] && dates?.[1]) {
                message.info("Please select a start date");
              }
            }}
            format="DD MMM YYYY"
            allowClear
            style={{ width: "100%", borderRadius: 8 }}
          />
        </div>
      ) : placeholder ? (
        <div className={styles.searchWrapper}>
          <SearchBar
            placeholder={placeholder}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      ) : null}

      <div className={styles.right}>
        <div className={styles.dateChip}>
          <ClockCircleOutlined />
          <span>{dateTime.dateStr}, {dateTime.timeStr}</span>
        </div>

        <div className={styles.notifBtn}>
          <Badge count={3} size="small" offset={[-2, 2]} color="#7c5cfc">
            <BellOutlined className={styles.actionIcon} />
          </Badge>
        </div>

        <Dropdown
          menu={{ items: userMenuItems, onClick: handleMenuClick }}
          placement="bottomRight"
          trigger={["click"]}
        >
          <div className={styles.userChip}>
            <Avatar size={32} className={styles.headerAvatar}>
              {initials}
            </Avatar>
            <span className={styles.userName}>{user?.name}</span>
          </div>
        </Dropdown>
      </div>
    </AntHeader>
  );
};

export default Header;
