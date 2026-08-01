import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Form, Divider, Switch, Row, Col, Upload, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useForm, Controller } from "react-hook-form";
import { AppInput, AppButton, AppSelect, PageHeader, CompanyLogo } from "@/components/common";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { getCompanyInfo, saveCompanyInfo } from "@/utils/companyInfoStore";
import { getBusinessSettings, updateBusinessSettings, normalizeBusinessSettings } from "@/services/settingsService";

const currencyOptions = [
  { label: "PKR (Rs)", value: "PKR" },
  { label: "INR (₹)", value: "INR" },
  { label: "USD ($)", value: "USD" },
  { label: "EUR (€)", value: "EUR" },
];

const languageOptions = [
  { label: "English", value: "en" },
  { label: "Hindi", value: "hi" },
];

const Settings = () => {
  const { isDark, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    mode: "onTouched",
    defaultValues: { name: "", contact: "", whatsapp: "", email: "", address: "" },
  });

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const data = await getBusinessSettings();
        const info = normalizeBusinessSettings(data);
        reset({
          name:     info.name,
          contact:  info.contact,
          whatsapp: info.whatsapp,
          email:    info.email,
          address:  info.address,
        });
        // Keep the local cache (used synchronously by invoices/ledgers/print) in sync.
        saveCompanyInfo(info);
        setLogoPreview(info.logo || null);
      } catch {
        message.error("Failed to load business settings — showing cached values");
        const info = getCompanyInfo();
        reset({
          name:     info.name     || "",
          contact:  info.contact  || "",
          whatsapp: info.whatsapp || "",
          email:    info.email    || "",
          address:  info.address  || "",
        });
        setLogoPreview(info.logo || null);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [reset]);

  const handleLogoSelect = (file) => {
    if (!file.type?.startsWith("image/")) {
      message.error("Please select an image file");
      return false;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result);
    reader.readAsDataURL(file);
    return false;
  };

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("business_name", values.name);
      formData.append("contact", values.contact || "");
      formData.append("whatsapp", values.whatsapp || "");
      formData.append("email", values.email || "");
      formData.append("address", values.address || "");
      if (logoFile) formData.append("logo", logoFile);

      const data = await updateBusinessSettings(formData);
      const info = normalizeBusinessSettings(data);
      saveCompanyInfo(info);
      message.success("Business information saved. Please log in again to see the changes.");
      await logout();
      navigate("/login");
    } catch (err) {
      const errorMsg = err.response?.data
        ? Object.values(err.response.data).flat().join(", ")
        : err.message || "Failed to save business information";
      message.error(errorMsg);
      setSaving(false);
    }
  };

  return (
    <section>
      <PageHeader title="Settings" subtitle="Configure your business preferences" />

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card title="Business Information" loading={loading}>
            <section style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
              <section
                style={{
                  width: 72, height: 72, borderRadius: 12, overflow: "hidden",
                  border: "1px solid var(--color-border)", background: "var(--color-bg)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Company logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <CompanyLogo size={60} />
                )}
              </section>
              <section>
                <Upload showUploadList={false} beforeUpload={handleLogoSelect} accept="image/*">
                  <AppButton icon={<UploadOutlined />}>Upload Logo</AppButton>
                </Upload>
                <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
                  PNG, JPG or SVG. Square image works best.
                </p>
              </section>
            </section>

            <form onSubmit={handleSubmit(onSubmit)}>
              <Controller
                name="name"
                control={control}
                rules={{ required: "Business name is required" }}
                render={({ field }) => (
                  <AppInput {...field} label="Business Name" placeholder="Enter business name" required errors={errors} />
                )}
              />
              <Controller
                name="contact"
                control={control}
                render={({ field }) => (
                  <AppInput {...field} label="Contact" placeholder="Enter contact number" errors={errors} />
                )}
              />
              <Controller
                name="whatsapp"
                control={control}
                render={({ field }) => (
                  <AppInput {...field} label="WhatsApp" placeholder="Enter WhatsApp number" errors={errors} />
                )}
              />
              <Controller
                name="email"
                control={control}
                rules={{ pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email" } }}
                render={({ field }) => (
                  <AppInput {...field} label="Email" placeholder="Enter email" errors={errors} />
                )}
              />
              <Controller
                name="address"
                control={control}
                render={({ field }) => (
                  <AppInput {...field} inputType="textarea" label="Address" placeholder="Enter address" rows={3} errors={errors} />
                )}
              />
              <AppButton type="primary" htmlType="submit" className="btn-dark" loading={saving}>
                Save Changes
              </AppButton>
            </form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Preferences" style={{ marginBottom: 24 }}>
            <Form layout="vertical">
              <AppSelect label="Currency" name="currency" options={currencyOptions} defaultValue="PKR" />
              <AppSelect label="Language" name="language" options={languageOptions} defaultValue="en" />
              <Divider />
              <Form.Item label="Notifications" name="notifications">
                <Switch defaultChecked />
              </Form.Item>
              <Form.Item label="Dark Mode" name="darkMode">
                <Switch checked={isDark} onChange={toggleTheme} />
              </Form.Item>
            </Form>
          </Card>

          <Card title="API Configuration">
            <Form layout="vertical">
              <AppInput
                label="Backend URL"
                name="apiUrl"
                placeholder="http://localhost:8000/api"
              />
              <AppButton type="primary" htmlType="submit">
                Connect
              </AppButton>
            </Form>
          </Card>
        </Col>
      </Row>
    </section>
  );
};

export default Settings;
