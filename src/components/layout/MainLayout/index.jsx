import { Layout } from "antd";
import Sidebar from "../Sidebar";
import Header from "../Header";
import { useAutoLogout } from "@/hooks";
import styles from "./styles.module.css";

const MainLayout = ({ children }) => {
  useAutoLogout();

  return (
    <Layout className={styles.appLayout}>
      <Sidebar />
      <Layout className={styles.rightLayout}>
        <Header />
        <div className={styles.content}>{children}</div>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
