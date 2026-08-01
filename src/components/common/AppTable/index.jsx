import { Table, Pagination } from "antd";
import styles from "./styles.module.css";

const AppTable = ({
  columns = [],
  dataSource = [],
  loading = false,
  rowKey = "id",
  // Server-side pagination props (matching example pattern)
  page,
  handlePagination,
  // Legacy client-side pagination (kept for backward compat)
  pagination,
  bordered = false,
  size = "middle",
  scroll,
  onChange,
  rowSelection,
  expandable,
  onRow,
  ...rest
}) => {
  const isServerSide = page && typeof handlePagination === "function";

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableWrapper}>
        <Table
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          rowKey={rowKey}
          pagination={false}
          bordered={bordered}
          size={size}
          scroll={scroll}
          onChange={onChange}
          rowSelection={rowSelection}
          expandable={expandable}
          onRow={onRow}
          {...rest}
        />
      </div>

      {/* Server-side pagination: page + handlePagination pattern */}
      {isServerSide && (
        <div className={styles.paginationWrapper}>
          <span className={styles.totalText}>
            Total {page.total || 0} records
          </span>
          <Pagination
            current={page.current || 1}
            pageSize={page.size || 10}
            total={page.total || 0}
            showSizeChanger
            showTotal={(total) => `Total ${total} records`}
            size="small"
            onChange={(current) => handlePagination(current)}
            onShowSizeChange={(_, size) => handlePagination(1, size)}
          />
        </div>
      )}

      {/* Legacy client-side pagination */}
      {!isServerSide && pagination && dataSource.length > 0 && (
        <div className={styles.paginationWrapper}>
          <span className={styles.totalText}>
            Total {dataSource.length} records
          </span>
          <Pagination
            current={pagination.current || 1}
            pageSize={pagination.pageSize || 10}
            total={pagination.total || dataSource.length}
            showSizeChanger
            size="small"
            onChange={pagination.onChange}
          />
        </div>
      )}
    </div>
  );
};

export default AppTable;
