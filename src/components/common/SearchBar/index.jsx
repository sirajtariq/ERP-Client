import { Input } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import styles from "./styles.module.css";

const SearchBar = ({
  placeholder = "Search...",
  value,
  onChange,
  allowClear = true,
}) => {
  return (
    <Input
      prefix={<SearchOutlined className={styles.icon} />}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      allowClear={allowClear}
      className={styles.searchInput}
    />
  );
};

export default SearchBar;
