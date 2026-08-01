import { Typography, Row, Col } from "antd";
import SearchBar from "../SearchBar";
import styles from "./styles.module.css";

const { Title, Text } = Typography;

const PageHeader = ({ title, subtitle, extra, searchPlaceholder, onSearch, searchValue }) => {
  return (
    <div className={`${styles.pageHeader} animate-fade-in-up`}>
      <Row justify="space-between" align="middle">
        <Col>
          <Title level={3} className={styles.title}>
            {title}
          </Title>
          {subtitle && <Text className={styles.subtitle}>{subtitle}</Text>}
        </Col>
        <Col>
          <div className={styles.actions}>
            {searchPlaceholder && (
              <SearchBar
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={onSearch}
              />
            )}
            {extra}
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default PageHeader;
