import { useState, useEffect, useCallback } from "react";
import { Modal, Table, Tag, DatePicker, Dropdown, message } from "antd";
import { PlusCircleOutlined, MinusCircleOutlined, FilterOutlined, RiseOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { AppButton } from "@/components/common";
import { formatDate } from "@/utils";
import { getItemHistory } from "@/services/inventoryService";
import styles from "./styles.module.css";

const PAGE_SIZE = 10;
const val = (v, fallback = "--") => (v !== undefined && v !== null && v !== "") ? v : fallback;

const StockHistoryModal = ({ open, onClose, item }) => {
  const [history,     setHistory]     = useState([]);
  const [histTotal,   setHistTotal]   = useState(0);
  const [histSummary, setHistSummary] = useState(null);
  const [histPage,    setHistPage]    = useState(1);
  const [histLoading, setHistLoading] = useState(false);

  // applied filters
  const [appliedRange, setAppliedRange] = useState([null, null]);
  // draft inside dropdown
  const [draftRange,   setDraftRange]   = useState([null, null]);
  const [filterOpen,   setFilterOpen]   = useState(false);

  const fetchHistory = useCallback(async (page = 1, range = [null, null]) => {
    if (!item?.id) return;
    setHistLoading(true);
    try {
      const data = await getItemHistory(item.id, {
        page,
        pageSize:  PAGE_SIZE,
        startDate: range[0] ? dayjs(range[0]).format("YYYY-MM-DD") : "",
        endDate:   range[1] ? dayjs(range[1]).format("YYYY-MM-DD") : "",
      });
      setHistory(data.results || []);
      setHistTotal(data.count  || 0);
      if (data.summary) setHistSummary(data.summary);
    } catch {
      message.error("Failed to load stock history");
    } finally {
      setHistLoading(false);
    }
  }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open && item?.id) {
      setHistPage(1);
      setAppliedRange([null, null]);
      setDraftRange([null, null]);
      fetchHistory(1, [null, null]);
    }
  }, [open, item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!item) return null;

  const totalIn  = Number(histSummary?.totalIn  ?? 0);
  const totalOut = Number(histSummary?.totalOut ?? 0);
  const activeFilterCount = appliedRange[0] || appliedRange[1] ? 1 : 0;

  const handleApply = () => {
    setAppliedRange(draftRange);
    setHistPage(1);
    fetchHistory(1, draftRange);
    setFilterOpen(false);
  };

  const handleReset = () => {
    const reset = [null, null];
    setDraftRange(reset);
    setAppliedRange(reset);
    setHistPage(1);
    fetchHistory(1, reset);
    setFilterOpen(false);
  };

  const filterDropdown = (
    <div className={styles.filterPanel} onClick={(e) => e.stopPropagation()}>
      <div className={styles.filterGrid}>
        <div className={styles.filterField}>
          <label className={styles.filterLabel}>Start Date</label>
          <DatePicker
            style={{ width: "100%" }}
            value={draftRange[0] ? dayjs(draftRange[0]) : null}
            onChange={(d) => setDraftRange((prev) => [d, prev[1]])}
            format="DD-MM-YYYY"
            placeholder="Select start date"
            disabledDate={(c) => draftRange[1] && c && c.isAfter(dayjs(draftRange[1]), "day")}
          />
        </div>
        <div className={styles.filterField}>
          <label className={styles.filterLabel}>End Date</label>
          <DatePicker
            style={{ width: "100%" }}
            value={draftRange[1] ? dayjs(draftRange[1]) : null}
            onChange={(d) => setDraftRange((prev) => [prev[0], d])}
            format="DD-MM-YYYY"
            placeholder="Select end date"
            disabled={!draftRange[0]}
            disabledDate={(c) => draftRange[0] && c && c.isBefore(dayjs(draftRange[0]), "day")}
          />
        </div>
      </div>
      <div className={styles.filterActions}>
        <AppButton size="small" onClick={handleReset}>Reset</AppButton>
        <AppButton size="small" type="primary" className="btn-dark" onClick={handleApply}>Apply</AppButton>
      </div>
    </div>
  );

  const columns = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: "13%",
      render: (v) => <span style={{ fontSize: 12 }}>{formatDate(v)}</span>,
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: "10%",
      render: (v) => v === "in"
        ? <Tag color="success" style={{ borderRadius: 5, fontWeight: 700, fontSize: 11 }}><PlusCircleOutlined /> In</Tag>
        : <Tag color="warning" style={{ borderRadius: 5, fontWeight: 700, fontSize: 11 }}><MinusCircleOutlined /> Out</Tag>,
    },
    {
      title: "Qty",
      dataIndex: "quantity",
      key: "qty",
      width: "9%",
      render: (v, r) => (
        <span style={{ fontWeight: 800, color: r.type === "in" ? "#22c55e" : "#f97316" }}>
          {r.type === "in" ? "+" : "−"}{Number(v)}
        </span>
      ),
    },
    {
      title: "Reason",
      dataIndex: "reason",
      key: "reason",
      width: "18%",
      render: (v) => <span style={{ fontSize: 12 }}>{val(v)}</span>,
    },
    {
      title: "Notes",
      dataIndex: "note",
      key: "note",
      ellipsis: true,
      render: (v) => <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{val(v)}</span>,
    },
    {
      title: "Before",
      dataIndex: "stockBefore",
      key: "sb",
      width: "11%",
      render: (v) => <span style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>{Number(v)}</span>,
    },
    {
      title: "After",
      dataIndex: "stockAfter",
      key: "sa",
      width: "11%",
      render: (v) => <span style={{ fontWeight: 700, fontSize: 13 }}>{Number(v)}</span>,
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width="78vw"
      centered
      destroyOnClose
      closable={false}
      styles={{ body: { padding: 0, overflow: "hidden" } }}
      zIndex={1100}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.avatar}>
            <RiseOutlined style={{ fontSize: 18, color: "#7c5cfc" }} />
          </div>
          <div>
            <h2 className={styles.title}>Stock History</h2>
            <p className={styles.sub}>{item.name} &nbsp;·&nbsp; {item.itemCode}</p>
          </div>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
      </div>

      <div style={{ padding: "12px 20px 16px" }}>
        {/* Cards + Filter in one row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div className={styles.statCard} style={{ borderColor: "rgba(34,197,94,0.25)", background: "rgba(34,197,94,0.08)", flex: 1 }}>
            <span className={styles.statLabel} style={{ color: "#16a34a" }}>Total In</span>
            <div className={styles.statValue} style={{ color: "#22c55e" }}>
              +{totalIn} <span className={styles.statUnit}>{item.unit}</span>
            </div>
          </div>
          <div className={styles.statCard} style={{ borderColor: "rgba(249,115,22,0.25)", background: "rgba(249,115,22,0.08)", flex: 1 }}>
            <span className={styles.statLabel} style={{ color: "#ea580c" }}>Total Out</span>
            <div className={styles.statValue} style={{ color: "#f97316" }}>
              −{totalOut} <span className={styles.statUnit}>{item.unit}</span>
            </div>
          </div>
          <Dropdown
            open={filterOpen}
            onOpenChange={(v) => { setFilterOpen(v); if (v) setDraftRange(appliedRange); }}
            trigger={["click"]}
            dropdownRender={() => filterDropdown}
          >
            <div style={{ position: "relative", display: "inline-flex", alignSelf: "center" }}>
              <AppButton icon={<FilterOutlined />}>
                {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filters"}
              </AppButton>
              {activeFilterCount > 0 && (
                <span style={{
                  position: "absolute", top: -2, right: -2,
                  width: 8, height: 8, borderRadius: "50%",
                  background: "var(--color-danger)",
                  border: "2px solid var(--color-surface)",
                }} />
              )}
            </div>
          </Dropdown>
        </div>

        <Table
          columns={columns}
          dataSource={history}
          rowKey="id"
          size="small"
          loading={histLoading}
          pagination={{
            current:         histPage,
            pageSize:        PAGE_SIZE,
            total:           histTotal,
            showSizeChanger: false,
            size:            "small",
            onChange:        (page) => { setHistPage(page); fetchHistory(page, appliedRange); },
          }}
          locale={{ emptyText: "No stock movements recorded yet" }}
          scroll={{ y: 260 }}
          style={{ border: "1px solid var(--color-border)", borderRadius: 8, overflow: "hidden" }}
          rowClassName={(r) => r.type === "in" ? styles.rowIn : styles.rowOut}
        />
      </div>
    </Modal>
  );
};

export default StockHistoryModal;
