import { Modal } from "antd";
import styles from "./styles.module.css";

const AppModal = ({
  title,
  open,
  onClose,
  onSubmit,
  submitText = "OK",
  cancelText = "Cancel",
  loading = false,
  submitDisabled = false,
  width = 480,
  children,
  footer,
  danger = false,
  ...rest
}) => {
  const customFooter =
    footer !== undefined ? footer : (
      <div className={styles.footer}>
        <button className={styles.cancelBtn} onClick={onClose}>
          {cancelText}
        </button>
        <button
          className={`${styles.submitBtn} ${danger ? styles.dangerBtn : styles.primaryBtn}`}
          onClick={onSubmit}
          disabled={loading || submitDisabled}
        >
          {submitText}
        </button>
      </div>
    );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={width}
      centered
      destroyOnClose
      title={title}
      footer={customFooter}
      className={styles.modal}
      {...rest}
    >
      {children}
    </Modal>
  );
};

export default AppModal;
