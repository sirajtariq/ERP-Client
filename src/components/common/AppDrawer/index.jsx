import { Drawer, Space } from "antd";
import AppButton from "../AppButton";

const AppDrawer = ({
  title,
  open,
  onClose,
  onSubmit,
  submitText = "Submit",
  cancelText = "Cancel",
  loading = false,
  submitDisabled = false,
  width = 480,
  placement = "right",
  children,
  footer = true,
  ...rest
}) => {
  return (
    <Drawer
      title={
        <span style={{ fontWeight: 700, fontSize: 17, color: "var(--color-text)" }}>
          {title}
        </span>
      }
      open={open}
      onClose={onClose}
      width={width}
      placement={placement}
      destroyOnClose
      styles={{
        header: {
          borderBottom: "1px solid var(--color-border-light)",
          padding: "16px 24px",
        },
        body: {
          padding: "24px",
          maxHeight: "calc(100vh - 130px)",
          overflowY: "auto",
        },
        footer: {
          borderTop: "1px solid var(--color-border-light)",
          padding: "14px 24px",
        },
      }}
      footer={
        footer ? (
          <Space style={{ float: "right" }}>
            <AppButton type="default" onClick={onClose}>
              {cancelText}
            </AppButton>
            <AppButton
              type="primary"
              onClick={onSubmit}
              loading={loading}
              disabled={submitDisabled}
              className="btn-dark"
            >
              {submitText}
            </AppButton>
          </Space>
        ) : null
      }
      {...rest}
    >
      {children}
    </Drawer>
  );
};

export default AppDrawer;
