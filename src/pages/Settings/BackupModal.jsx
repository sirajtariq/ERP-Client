import { useEffect, useState } from "react";
import { Modal, Divider, Upload, message, Input } from "antd";
import { useForm, Controller } from "react-hook-form";
import { FolderOpenOutlined, SaveOutlined, DatabaseOutlined, UploadOutlined, WarningOutlined } from "@ant-design/icons";
import { AppInput, AppButton, AppSelect } from "@/components/common";
import { getBackupSettings, updateBackupSettings, triggerBackup, restoreDatabase } from "@/services/backupService";

const FREQUENCY_OPTIONS = [
  { label: "Daily",   value: "DAILY" },
  { label: "Weekly",  value: "WEEKLY" },
  { label: "Monthly", value: "MONTHLY" },
  { label: "Never",   value: "NEVER" },
];

const CONFIRM_WORD = "Confirm";

const ACTION_META = {
  save:    { title: "Save Backup Settings",  desc: "This will update your backup configuration." },
  backup:  { title: "Create Backup Now",     desc: "A new database backup will be created immediately." },
  restore: { title: "Restore Database",      desc: "This will overwrite the current database with the selected backup file. This action cannot be undone.", danger: true },
};

const sectionLabel = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  color: "var(--color-text-secondary)",
  marginBottom: 14,
};

const BackupModal = ({ open, onClose }) => {
  const [saving,       setSaving]       = useState(false);
  const [backing,      setBacking]      = useState(false);
  const [restoring,    setRestoring]    = useState(false);

  // confirmation state
  const [confirmAction, setConfirmAction] = useState(null); // "save" | "backup" | "restore"
  const [confirmText,   setConfirmText]   = useState("");
  const [pendingValues, setPendingValues] = useState(null);
  const [pendingFile,   setPendingFile]   = useState(null);

  const { control, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      backup_directory: "",
      backup_frequency: "DAILY",
      backup_time:      "",
      retention_days:   30,
    },
  });

  useEffect(() => {
    if (!open) return;
    getBackupSettings()
      .then((data) =>
        reset({
          backup_directory: data.backup_directory || "",
          backup_frequency: data.backup_frequency || "DAILY",
          backup_time:      data.backup_time      || "",
          retention_days:   data.retention_days   ?? 30,
        })
      )
      .catch(() => {});
  }, [open, reset]);

  const openConfirm = (action, extra = {}) => {
    setConfirmText("");
    setConfirmAction(action);
    if (extra.values) setPendingValues(extra.values);
    if (extra.file)   setPendingFile(extra.file);
  };

  const closeConfirm = () => {
    setConfirmAction(null);
    setConfirmText("");
    setPendingValues(null);
    setPendingFile(null);
  };

  const handleConfirmOk = async () => {
    if (confirmText !== CONFIRM_WORD) return;

    if (confirmAction === "save") {
      closeConfirm();
      setSaving(true);
      try {
        await updateBackupSettings(pendingValues);
        message.success("Backup settings saved");
      } catch {
        message.error("Failed to save backup settings");
      } finally {
        setSaving(false);
      }
    }

    if (confirmAction === "backup") {
      closeConfirm();
      setBacking(true);
      try {
        await triggerBackup();
        message.success("Backup created successfully");
      } catch (err) {
        message.error(err?.response?.data?.detail || "Backup failed");
      } finally {
        setBacking(false);
      }
    }

    if (confirmAction === "restore") {
      closeConfirm();
      setRestoring(true);
      restoreDatabase(pendingFile)
        .then(() => message.success("Database restored successfully"))
        .catch((err) => message.error(err?.response?.data?.detail || "Restore failed"))
        .finally(() => setRestoring(false));
    }
  };

  const onSubmit = (values) => openConfirm("save", { values });

  const handleBackupNow = () => openConfirm("backup");

  const handleRestoreSelect = (file) => {
    openConfirm("restore", { file });
    return false;
  };

  const meta = confirmAction ? ACTION_META[confirmAction] : null;
  const confirmed = confirmText === CONFIRM_WORD;

  return (
    <>
      <Modal
        title="Backup & Restore"
        open={open}
        onCancel={onClose}
        footer={null}
        width={520}
        destroyOnClose
      >
        {/* ── Configuration ── */}
        <p style={sectionLabel}>Configuration</p>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Backup Directory */}
          <Controller
            name="backup_directory"
            control={control}
            render={({ field }) => {
              const isElectron = !!window.electronAPI?.selectDirectory;
              const openPicker = async () => {
                if (!isElectron) {
                  message.info("Folder picker is only available in the desktop app. Please type the path manually.");
                  return;
                }
                const dir = await window.electronAPI.selectDirectory();
                if (dir) setValue("backup_directory", dir);
              };
              return (
                <section style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--color-text)" }}>
                    Backup Directory
                  </label>
                  <section style={{ display: "flex", gap: 8 }}>
                    <input
                      {...field}
                      readOnly={isElectron}
                      onClick={isElectron ? openPicker : undefined}
                      placeholder="e.g. C:\ERP_Backups"
                      style={{
                        flex: 1, padding: "8px 12px", borderRadius: 8,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-bg)", color: "var(--color-text)",
                        fontSize: 13, outline: "none",
                        cursor: isElectron ? "pointer" : "text",
                      }}
                    />
                    <AppButton type="button" icon={<FolderOpenOutlined />} onClick={openPicker}>
                      Browse
                    </AppButton>
                  </section>
                </section>
              );
            }}
          />

          {/* Frequency + Time */}
          <section style={{ display: "flex", gap: 12 }}>
            <section style={{ flex: 1 }}>
              <Controller
                name="backup_frequency"
                control={control}
                render={({ field }) => (
                  <AppSelect {...field} label="Frequency" options={FREQUENCY_OPTIONS} />
                )}
              />
            </section>
            <section style={{ flex: 1 }}>
              <Controller
                name="backup_time"
                control={control}
                render={({ field }) => (
                  <AppInput {...field} type="time" label="Backup Time" />
                )}
              />
            </section>
          </section>

          {/* Retention Days */}
          <Controller
            name="retention_days"
            control={control}
            render={({ field }) => (
              <AppInput
                inputType="number"
                label="Retention Days"
                placeholder="e.g. 30"
                value={field.value}
                onChange={(val) => field.onChange(val)}
                onBlur={field.onBlur}
                min={1}
              />
            )}
          />

          <AppButton
            type="primary"
            htmlType="submit"
            className="btn-dark"
            icon={<SaveOutlined />}
            loading={saving}
            style={{ marginTop: 4, marginBottom: 8 }}
          >
            Save Settings
          </AppButton>
        </form>

        <Divider />

        {/* ── Actions ── */}
        <p style={sectionLabel}>Actions</p>
        <section style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <AppButton icon={<DatabaseOutlined />} loading={backing} onClick={handleBackupNow}>
            Backup Now
          </AppButton>

          <Upload accept=".sqlite3,.db" showUploadList={false} beforeUpload={handleRestoreSelect}>
            <AppButton icon={<UploadOutlined />} loading={restoring}>
              Restore Database
            </AppButton>
          </Upload>
        </section>
      </Modal>

      {/* ── Confirm Modal ── */}
      <Modal
        open={!!confirmAction}
        onCancel={closeConfirm}
        onOk={handleConfirmOk}
        okText="Confirm"
        okButtonProps={{ disabled: !confirmed, danger: meta?.danger }}
        cancelText="Cancel"
        title={
          <section style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <WarningOutlined style={{ color: meta?.danger ? "#ff4d4f" : "#faad14" }} />
            {meta?.title}
          </section>
        }
        width={420}
        destroyOnClose
      >
        <p style={{ marginBottom: 16, color: "var(--color-text-secondary)", fontSize: 13 }}>
          {meta?.desc}
        </p>
        <p style={{ marginBottom: 8, fontSize: 13 }}>
          Type <strong>{CONFIRM_WORD}</strong> to proceed:
        </p>
        <Input
          autoFocus
          placeholder={CONFIRM_WORD}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          onPressEnter={confirmed ? handleConfirmOk : undefined}
          status={confirmText && !confirmed ? "error" : ""}
        />
      </Modal>
    </>
  );
};

export default BackupModal;
