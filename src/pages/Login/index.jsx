import { useState } from "react";
import { Form, Input, Typography, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { AppButton } from "@/components/common";
import { useAuth } from "@/context/AuthContext";
import styles from "./styles.module.css";

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const [form] = Form.useForm();

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      message.success("Welcome back!");
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        err.message ||
        "Login failed. Please check your credentials.";
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.bgOrbs}>
        <div className={`${styles.orb} ${styles.orb1}`} />
        <div className={`${styles.orb} ${styles.orb2}`} />
        <div className={`${styles.orb} ${styles.orb3}`} />
        <div className={`${styles.orb} ${styles.orb4}`} />
      </div>

      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <div className={styles.logoSection}>
            <div className={styles.logoIcon}>
              <span>LD</span>
            </div>
            <Title level={2} className={styles.appName}>
              LenDen
            </Title>
            <Text className={styles.tagline}>
              Your smart Khata Book & ERP
            </Text>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            size="large"
            className={styles.loginForm}
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: "Please enter your username" },
              ]}
            >
              <Input
                prefix={<UserOutlined className={styles.inputIcon} />}
                placeholder="Username"
                autoFocus
                className={styles.input}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: "Please enter your password" },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className={styles.inputIcon} />}
                placeholder="Password"
                className={styles.input}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <AppButton
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                size="large"
                className={styles.loginBtn}
              >
                Sign In
              </AppButton>
            </Form.Item>
          </Form>

          <div className={styles.footer}>
            <Text className={styles.footerText}>
              LenDen v1.0 - Desktop ERP
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
