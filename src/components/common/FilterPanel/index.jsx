import { useState, useEffect } from "react";
import { Dropdown, DatePicker } from "antd";
import dayjs from "dayjs";
import { FilterOutlined } from "@ant-design/icons";
import AppButton from "../AppButton";
import AppInput from "../AppInput";
import AppSelect from "../AppSelect";
import { countActiveFilters } from "@/utils/filterUtils";
import { FILTER_FIELD_DEFINITIONS } from "./fieldDefinitions";
import styles from "./styles.module.css";

const ADD_NEW = "__add__";
const MIN_FILTER_DATE = dayjs("2026-01-01");

const FilterPanel = ({ config = {}, options = {}, values = {}, onApply, onReset }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(values);
  const [customText, setCustomText] = useState({});

  useEffect(() => {
    if (open) { setDraft(values); setCustomText({}); }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeFields = Object.keys(config).filter((flag) => config[flag] && FILTER_FIELD_DEFINITIONS[flag]);
  const activeCount = countActiveFilters(values);

  const handleFieldChange = (key, value) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "startDate" && next.endDate && value && dayjs(next.endDate).isBefore(dayjs(value), "day")) {
        next.endDate = "";
      }
      return next;
    });
  };

  const handleApply = () => {
    const resolved = { ...draft };
    // resolve __add__ keys to their typed custom value
    Object.keys(resolved).forEach((key) => {
      if (resolved[key] === ADD_NEW) {
        resolved[key] = customText[key]?.trim() || "";
      }
    });
    onApply?.(resolved);
    setOpen(false);
  };

  const handleReset = () => {
    setDraft({});
    setCustomText({});
    onReset?.();
    setOpen(false);
  };

  const renderField = (flag) => {
    const def = FILTER_FIELD_DEFINITIONS[flag];
    const { key, label, type, placeholder } = def;

    if (type === "date") {
      const isEndDate = key === "endDate";
      const startVal = draft.startDate ? dayjs(draft.startDate) : null;
      const lowerBound = isEndDate && startVal && startVal.isAfter(MIN_FILTER_DATE) ? startVal : MIN_FILTER_DATE;
      const endDisabled = isEndDate && !draft.startDate;
      return (
        <section key={key} className={styles.field}>
          <label className={styles.label}>{label}</label>
          <DatePicker
            style={{ width: "100%" }}
            value={draft[key] ? dayjs(draft[key]) : null}
            onChange={(date) => handleFieldChange(key, date ? date.format("YYYY-MM-DD") : "")}
            disabledDate={(current) => current && current.isBefore(lowerBound, "day")}
            disabled={endDisabled}
            placeholder={endDisabled ? "Select start date first" : undefined}
          />
        </section>
      );
    }

    if (type === "select" && def.creatable) {
      const isAddNew = draft[key] === ADD_NEW;
      return (
        <section key={key} className={styles.field}>
          <AppSelect
            label={label}
            name={key}
            placeholder={`Select ${label.toLowerCase()}`}
            options={options[key] || []}
            value={draft[key] || undefined}
            onChange={(val) => {
              handleFieldChange(key, val);
              if (val !== ADD_NEW) setCustomText((prev) => ({ ...prev, [key]: "" }));
            }}
            allowClear
            showSearch
            optionRender={(option) =>
              option.value === ADD_NEW ? (
                <span style={{
                  display: "block", margin: "-5px -12px", padding: "6px 12px",
                  background: "rgba(124,92,252,0.08)", color: "#7c5cfc", fontWeight: 600,
                }}>
                  {option.label}
                </span>
              ) : option.label
            }
          />
          {isAddNew && (
            <AppInput
              style={{ marginTop: 6 }}
              placeholder="Type category name to filter..."
              value={customText[key] || ""}
              onChange={(e) => setCustomText((prev) => ({ ...prev, [key]: e.target.value }))}
              autoFocus
            />
          )}
        </section>
      );
    }

    if (type === "select") {
      return (
        <section key={key} className={styles.field}>
          <AppSelect
            label={label}
            name={key}
            placeholder={`Select ${label.toLowerCase()}`}
            options={options[key] || []}
            value={draft[key] || undefined}
            onChange={(val) => handleFieldChange(key, val)}
            allowClear
            showSearch={!!def.showSearch}
          />
        </section>
      );
    }

    return (
      <section key={key} className={styles.field}>
        <AppInput
          label={label}
          name={key}
          placeholder={placeholder}
          value={draft[key] || ""}
          onChange={(e) => handleFieldChange(key, e.target.value)}
        />
      </section>
    );
  };

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={["click"]}
      dropdownRender={() => (
        <section className={styles.panel} onClick={(e) => e.stopPropagation()}>
          <section className={styles.grid}>
            {activeFields.map(renderField)}
          </section>
          <section className={styles.actions}>
            <AppButton type="default" size="small" onClick={handleReset}>Reset</AppButton>
            <AppButton type="primary" size="small" className="btn-dark" onClick={handleApply}>Apply</AppButton>
          </section>
        </section>
      )}
    >
      <section className={styles.triggerWrap}>
        <AppButton type="default" icon={<FilterOutlined />}>
          {activeCount > 0 ? `Filters (${activeCount})` : "Filters"}
        </AppButton>
        {activeCount > 0 && <span className={styles.activeDot} />}
      </section>
    </Dropdown>
  );
};

export default FilterPanel;
