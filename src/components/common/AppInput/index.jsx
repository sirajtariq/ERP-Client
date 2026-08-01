import { Input as AntdInput, InputNumber } from "antd";
import styles from "./styles.module.css";

const { TextArea } = AntdInput;

const PasswordInput = (props) => {
  const { label, name, placeholder, classes = "", onChange, onBlur, value, errors, required, disabled, autoComplete } = props;

  return (
    <section className={styles.fieldWrapper}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.asterisk}>*</span>}
        </label>
      )}
      <AntdInput.Password
        name={name}
        className={`${styles.passwordField} ${classes} ${errors && errors[name] ? styles.passwordFieldError : ""}`}
        placeholder={placeholder}
        onChange={onChange}
        onBlur={onBlur}
        value={value}
        disabled={disabled}
        autoComplete={autoComplete || "new-password"}
      />
      {errors && errors[name] && (
        <section className={styles.errorContainer}>
          <p className={styles.errorMessage}>{errors[name]?.message}</p>
        </section>
      )}
    </section>
  );
};

const TextAreaInput = (props) => {
  const { label, name, placeholder, classes = "", required, height, value, onChange, onBlur, errors, fieldSize, disabled, rows } = props;

  return (
    <section className={`${styles.fieldWrapper} ${fieldSize || ""}`}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.asterisk}>*</span>}
        </label>
      )}
      <TextArea
        name={name}
        placeholder={placeholder}
        className={`${styles.textareaField} ${classes} ${errors && errors[name] ? styles.textareaFieldError : ""}`}
        style={{ height: height || "auto", resize: "vertical" }}
        rows={rows || 4}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
      />
      {errors && errors[name] && (
        <section className={styles.errorContainer}>
          <p className={styles.errorMessage}>{errors[name]?.message}</p>
        </section>
      )}
    </section>
  );
};

const NumberInput = (props) => {
  const { label, name, placeholder, classes = "", required, value, onChange, onBlur, errors, disabled, min, max, fieldSize, prefix, suffix } = props;

  return (
    <section className={`${styles.fieldWrapper} ${fieldSize || ""}`}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.asterisk}>*</span>}
        </label>
      )}
      <InputNumber
        name={name}
        className={`${styles.numberField} ${classes} ${errors && errors[name] ? styles.numberFieldError : ""}`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        min={min}
        max={max}
        prefix={prefix}
        suffix={suffix}
        style={{ width: "100%" }}
        onKeyDown={(e) => {
          const allowed = /^[0-9.]$/.test(e.key) || ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Home", "End", "-"].includes(e.key) || e.ctrlKey || e.metaKey;
          if (!allowed) e.preventDefault();
        }}
      />
      {errors && errors[name] && (
        <section className={styles.errorContainer}>
          <p className={styles.errorMessage}>{errors[name]?.message}</p>
        </section>
      )}
    </section>
  );
};

const CommonInput = (props) => {
  const { label, type = "text", name, placeholder, classes = "", value, disabled, onChange, onBlur, required, errors, maxLength, fieldSize, height, prefix, suffix, status, autoComplete } = props;

  return (
    <section className={`${styles.fieldWrapper} ${fieldSize || ""}`}>
      {label && (
        <label className={styles.label}>
          {typeof label === "string" ? (
            <>
              {label}
              {required && <span className={styles.asterisk}>*</span>}
            </>
          ) : (
            label
          )}
        </label>
      )}
      <AntdInput
        type={type}
        name={name}
        maxLength={maxLength}
        className={`${styles.inputField} ${classes} ${errors && errors[name] ? styles.inputFieldError : ""}`}
        placeholder={placeholder}
        onChange={onChange}
        onBlur={onBlur}
        value={value}
        disabled={disabled}
        prefix={prefix}
        suffix={suffix}
        status={status}
        style={{ height: height }}
        autoComplete={autoComplete || "off"}
      />
      {errors && errors[name] && (
        <section className={styles.errorContainer}>
          <p className={styles.errorMessage}>{errors[name]?.message}</p>
        </section>
      )}
    </section>
  );
};

const AppInput = (props) => {
  const { inputType, type, name, formItemProps, rules, ...rest } = props;

  // Legacy support: if name + rules provided (antd Form.Item pattern)
  if (name && rules && !props.errors) {
    const { Form } = require("antd");
    const isTextArea = type === "textarea" || inputType === "textarea";
    const isNumber = type === "number" || inputType === "number";

    const inputElement = isTextArea ? (
      <TextArea placeholder={rest.placeholder} disabled={rest.disabled} rows={rest.rows || 4} onChange={rest.onChange} value={rest.value} />
    ) : isNumber ? (
      <InputNumber placeholder={rest.placeholder} disabled={rest.disabled} min={rest.min} max={rest.max} style={{ width: "100%" }} onChange={rest.onChange} value={rest.value} />
    ) : (
      <AntdInput type={type} placeholder={rest.placeholder} disabled={rest.disabled} maxLength={rest.maxLength} prefix={rest.prefix} suffix={rest.suffix} allowClear={rest.allowClear} onChange={rest.onChange} value={rest.value} />
    );

    return (
      <Form.Item label={rest.label} name={name} rules={rules} {...formItemProps}>
        {inputElement}
      </Form.Item>
    );
  }

  // New pattern: switch by inputType or type
  const resolvedType = inputType || type;

  switch (resolvedType) {
    case "password":
      return <PasswordInput name={name} {...rest} />;
    case "textarea":
      return <TextAreaInput name={name} {...rest} />;
    case "number":
      return <NumberInput name={name} {...rest} />;
    default:
      return <CommonInput type={type} name={name} {...rest} />;
  }
};

export default AppInput;
