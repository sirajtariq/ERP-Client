import { useState } from "react";
import { Select as AntdSelect, Form } from "antd";
import styles from "./styles.module.css";

const CommonSelect = (props) => {
  const {
    value,
    defaultValue,
    options = [],
    onChange,
    onBlur,
    classes = "",
    label,
    height,
    width,
    name,
    required,
    errors,
    placeholder,
    showSearch = false,
    onSearch,
    disabled = false,
    fieldSize,
    mode,
    filterOption,
    allowClear,
    loading,
    notFoundContent,
    popupClassName,
    onPopupScroll,
  } = props;

  const [searchValue, setSearchValue] = useState("");

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

      <AntdSelect
        className={`${styles.selectField} ${classes} ${errors && errors[name] ? styles.selectFieldError : ""}`}
        popupClassName={popupClassName || ""}
        defaultValue={defaultValue}
        onChange={(val) => {
          setSearchValue("");
          onChange?.(val ?? "");
        }}
        onBlur={onBlur}
        options={options}
        value={value}
        style={{ height: height, width: width || "100%" }}
        placeholder={placeholder}
        showSearch={showSearch}
        searchValue={showSearch ? searchValue : undefined}
        onSearch={(val) => {
          setSearchValue(val);
          onSearch?.(val);
        }}
        disabled={disabled}
        mode={mode}
        filterOption={
          filterOption !== undefined
            ? filterOption
            : showSearch
              ? (input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              : undefined
        }
        allowClear={allowClear !== undefined ? allowClear : showSearch}
        loading={loading}
        notFoundContent={notFoundContent}
        onPopupScroll={onPopupScroll}
        virtual={false}
      />

      {errors && errors[name] && (
        <section className={styles.errorContainer}>
          <p className={styles.errorMessage}>{errors[name]?.message}</p>
        </section>
      )}
    </section>
  );
};

const AppSelect = (props) => {
  const { name, rules, formItemProps, ...rest } = props;

  // Legacy support: antd Form.Item pattern
  if (name && rules && !props.errors) {
    return (
      <Form.Item label={rest.label} name={name} rules={rules} {...formItemProps}>
        <AntdSelect
          placeholder={rest.placeholder}
          options={rest.options}
          disabled={rest.disabled}
          allowClear={rest.allowClear}
          showSearch={rest.showSearch}
          mode={rest.mode}
          onChange={rest.onChange}
          value={rest.value}
          loading={rest.loading}
          filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
        />
      </Form.Item>
    );
  }

  return <CommonSelect name={name} {...rest} />;
};

export default AppSelect;
