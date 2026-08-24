import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Switch, Row, Col, Upload, message, Checkbox } from "antd";
import { UploadOutlined, CloudServerOutlined, CalendarOutlined, DollarOutlined } from "@ant-design/icons";
import { useForm, Controller } from "react-hook-form";
import { AppInput, AppButton, AppSelect, PageHeader, CompanyLogo } from "@/components/common";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { getCompanyInfo, saveCompanyInfo } from "@/utils/companyInfoStore";
import { getBusinessSettings, updateBusinessSettings, normalizeBusinessSettings } from "@/services/settingsService";
import BackupModal from "./BackupModal";

const Settings = () => {
  const { isDark, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [backupOpen, setBackupOpen] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    mode: "onTouched",
    defaultValues: {
      name: "", contact: "", whatsapp: "", email: "", address: "",
      salaryBasis: "working_days",
      weeklyOffDays: ["Sunday"],
    },
  });

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const data = await getBusinessSettings();
        const info = normalizeBusinessSettings(data);
        reset({
          name:          info.name,
          contact:       info.contact,
          whatsapp:      info.whatsapp,
          email:         info.email,
          address:       info.address,
          salaryBasis:   info.salaryBasis,
          weeklyOffDays: info.weeklyOffDays,
        });
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
      formData.append("business_name",            values.name);
      formData.append("contact",                  values.contact  || "");
      formData.append("whatsapp",                 values.whatsapp || "");
      formData.append("email",                    values.email    || "");
      formData.append("address",                  values.address  || "");
      formData.append("salary_calculation_basis", values.salaryBasis || "30_days");
      formData.append("weekly_off_days",          JSON.stringify(values.weeklyOffDays || []));
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
      <section style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <PageHeader title="Settings" subtitle="Configure your business preferences" />
        <section style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <AppButton icon={<CloudServerOutlined />} onClick={() => setBackupOpen(true)}>
            Backup & Restore
          </AppButton>
          <section style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>Dark Mode</span>
            <Switch checked={isDark} onChange={toggleTheme} />
          </section>
        </section>
      </section>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Business Information */}
        <Card title="Business Information" loading={loading} style={{ marginBottom: 24 }}>
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
        </Card>

        {/* Payroll Settings */}
        <Card
          title={<span><DollarOutlined style={{ marginRight: 8, color: "#7c5cfc" }} />Payroll Settings</span>}
          loading={loading}
          style={{ marginBottom: 24 }}
        >
          <Row gutter={[32, 0]}>
            <Col xs={24} md={12}>
              <div style={{ marginBottom: 4 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--color-text)", marginBottom: 4 }}>
                  Salary Calculation Basis
                </label>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 10, marginTop: 0 }}>
                  Determines whether salary is calculated on all calendar days or working days only
                </p>
                <Controller
                  name="salaryBasis"
                  control={control}
                  render={({ field }) => (
                    <AppSelect
                      {...field}
                      options={[
                        { value: "working_days", label: "Working Days — Excluding weekends" },
                        { value: "fixed_30",     label: "Fixed 30 — Always divide by 30" },
                        { value: "month_days",   label: "Month Days — Actual days in month (÷ 28/29/30/31)" },
                      ]}
                    />
                  )}
                />
              </div>
            </Col>

            <Col xs={24} md={12}>
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--color-text)", marginBottom: 4 }}>
                  <CalendarOutlined style={{ color: "#7c5cfc" }} />
                  Weekly Off Days
                </label>
                <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 10, marginTop: 0 }}>
                  Employees do not work on these days (affects attendance &amp; salary)
                </p>
                <Controller
                  name="weeklyOffDays"
                  control={control}
                  render={({ field }) => (
                    <Checkbox.Group
                      value={field.value}
                      onChange={field.onChange}
                      style={{ display: "flex", flexWrap: "wrap", gap: "10px 0" }}
                    >
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                        <div key={day} style={{ width: "50%" }}>
                          <Checkbox value={day}>
                            <span style={{ fontSize: 13 }}>{day}</span>
                          </Checkbox>
                        </div>
                      ))}
                    </Checkbox.Group>
                  )}
                />
              </div>
            </Col>
          </Row>
        </Card>

        <AppButton type="primary" htmlType="submit" className="btn-dark" loading={saving}>
          Save Changes
        </AppButton>
      </form>

      <BackupModal open={backupOpen} onClose={() => setBackupOpen(false)} />
    </section>
  );
};

export default Settings;
