import { Button } from "antd";

const AppButton = ({
  children,
  type = "primary",
  icon,
  onClick,
  loading = false,
  disabled = false,
  size = "middle",
  block = false,
  danger = false,
  htmlType = "button",
  ...rest
}) => {
  return (
    <Button
      type={type}
      icon={icon}
      onClick={onClick}
      loading={loading}
      disabled={disabled}
      size={size}
      block={block}
      danger={danger}
      htmlType={htmlType}
      {...rest}
    >
      {children}
    </Button>
  );
};

export default AppButton;
