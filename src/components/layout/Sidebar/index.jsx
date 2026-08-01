import { useState } from "react";
import { Layout, Menu } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { ROUTES } from "@/constants";
import { SIDEBAR_MENU } from "@/constants/sidebarMenu.jsx";
import { useAuth } from "@/context/AuthContext";
import styles from "./styles.module.css";

const { Sider } = Layout;

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole } = useAuth();

  const canSee = (item) => !item.roles || item.roles.includes(userRole);

  const menuItems = SIDEBAR_MENU
    .filter(canSee)
    .map(({ roles, ...item }) => {
      if (!item.children) return item;
      const filteredChildren = item.children
        .filter(canSee)
        .map(({ roles: _r, ...child }) => child);
      return { ...item, children: filteredChildren };
    })
    .filter((item) => !item.children || item.children.length > 0);

  const openKeys = menuItems
    .filter((item) => item.children?.some((child) => child.key === location.pathname))
    .map((item) => item.key);

  const handleMenuClick = ({ key }) => {
    if (key.startsWith("/")) {
      navigate(key);
    }
  };

  return (
    <Sider
      collapsed={collapsed}
      className={styles.sidebar}
      theme="dark"
      width={220}
      collapsedWidth={60}
      trigger={null}
    >
      <div className={`${styles.logo} ${collapsed ? styles.logoCollapsed : ""}`}>
        <div className={styles.logoIcon}>
          {collapsed ? "L" : "LD"}
        </div>
        {!collapsed && <span className={styles.logoText}>LenDen</span>}
        {!collapsed && (
          <div className={styles.collapseBtn} onClick={() => setCollapsed(true)}>
            <MenuFoldOutlined />
          </div>
        )}
      </div>
      {collapsed && (
        <div className={styles.collapseBtnCenter} onClick={() => setCollapsed(false)}>
          <MenuUnfoldOutlined />
        </div>
      )}

      <div className={styles.menuWrapper}>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={openKeys}
          items={menuItems}
          onClick={handleMenuClick}
          className={styles.menu}
        />
      </div>
    </Sider>
  );
};

export default Sidebar;
