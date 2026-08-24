import { useState, useEffect, useCallback } from "react";
import { Drawer, Table, Modal, Input, Space, Empty, message, Tag } from "antd";
import { DeleteOutlined, UndoOutlined, UserSwitchOutlined, WarningOutlined } from "@ant-design/icons";
import { AppButton } from "@/components/common";

const CONFIRM_WORD = "Confirm";

const TrashDrawer = ({
  open,
  onClose,
  title,
  fetchFn,
  restoreFn,
  permanentDeleteFn,
  convertFn,
  onSuccess,
  columns = [],
  rowKey = "id",
  pageSize = 10,
}) => {
  const [data, setData]                   = useState([]);
  const [loading, setLoading]             = useState(false);
  const [total, setTotal]                 = useState(0);
  const [page, setPage]                   = useState(1);
  const [actionLoading, setActionLoading] = useState({});
  const [confirmId, setConfirmId]         = useState(null);
  const [confirmText, setConfirmText]     = useState("");

  const load = useCallback(async (p) => {
    setLoading(true);
    try {
      const res = await fetchFn({ page: p, pageSize });
      setData(res.results || []);
      setTotal(res.count || 0);
    } catch {
      message.error("Failed to load trashed items");
    } finally {
      setLoading(false);
    }
  }, [fetchFn, pageSize]);

  useEffect(() => {
    if (open) {
      setPage(1);
      load(1);
    }
  }, [open, load]);

  const setLoaderFor = (id, state) =>
    setActionLoading((prev) =>
      state
        ? { ...prev, [id]: state }
        : Object.fromEntries(Object.entries(prev).filter(([k]) => k !== String(id)))
    );

  const handleRestore = async (record) => {
    const id = record[rowKey];
    setLoaderFor(id, "restore");
    try {
      await restoreFn(id);
      message.success("Restored successfully");
      load(page);
      onSuccess?.();
    } catch (err) {
      message.error(err?.response?.data?.detail || "Restore failed");
    } finally {
      setLoaderFor(id, null);
    }
  };

  const handleConvert = async (record) => {
    const id = record[rowKey];
    setLoaderFor(id, "convert");
    try {
      await convertFn(id);
      message.success("Converted to permanent customer");
      load(page);
      onSuccess?.();
    } catch (err) {
      message.error(err?.response?.data?.detail || "Conversion failed");
    } finally {
      setLoaderFor(id, null);
    }
  };

  const handlePermanentDelete = async () => {
    if (confirmText !== CONFIRM_WORD) return;
    const id = confirmId;
    setConfirmId(null);
    setConfirmText("");
    setLoaderFor(id, "delete");
    try {
      await permanentDeleteFn(id);
      message.success("Permanently deleted");
      load(page);
      onSuccess?.();
    } catch (err) {
      message.error(err?.response?.data?.detail || "Delete failed");
    } finally {
      setLoaderFor(id, null);
    }
  };

  const actionColumn = {
    title: "Actions",
    key: "_trash_actions",
    fixed: "right",
    width: permanentDeleteFn && convertFn ? 200 : permanentDeleteFn || convertFn ? 150 : 100,
    render: (_, record) => {
      const id = record[rowKey];
      const al = actionLoading[id];
      return (
        <Space size={6}>
          <button
            onClick={() => !al && handleRestore(record)}
            disabled={!!al}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 10px",
              fontSize: 12,
              fontWeight: 600,
              color: al === "restore" ? "rgba(255,255,255,0.6)" : "#fff",
              background: al === "restore"
                ? "linear-gradient(135deg, #16a34a, #15803d)"
                : "linear-gradient(135deg, #22c55e, #16a34a)",
              border: "none",
              borderRadius: 6,
              cursor: al ? "not-allowed" : "pointer",
              boxShadow: al ? "none" : "0 2px 6px rgba(34,197,94,0.35)",
              transition: "all 0.2s",
              opacity: al && al !== "restore" ? 0.5 : 1,
              letterSpacing: "0.01em",
            }}
            onMouseEnter={(e) => { if (!al) e.currentTarget.style.boxShadow = "0 4px 12px rgba(34,197,94,0.5)"; }}
            onMouseLeave={(e) => { if (!al) e.currentTarget.style.boxShadow = "0 2px 6px rgba(34,197,94,0.35)"; }}
          >
            {al === "restore" ? (
              <span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.5)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
            ) : (
              <UndoOutlined style={{ fontSize: 11 }} />
            )}
            Restore
          </button>

          {convertFn && (
            <AppButton
              size="small"
              icon={<UserSwitchOutlined />}
              loading={al === "convert"}
              onClick={() => handleConvert(record)}
              style={{ fontSize: 12 }}
            >
              To Permanent
            </AppButton>
          )}

          {permanentDeleteFn && (
            <AppButton
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={al === "delete"}
              onClick={() => { setConfirmId(id); setConfirmText(""); }}
            />
          )}
        </Space>
      );
    },
  };

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <Drawer
        title={
          <section style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <DeleteOutlined style={{ color: "#ef4444" }} />
            <span>Trash — {title}</span>
            {total > 0 && (
              <Tag color="red" style={{ marginLeft: 4, fontSize: 11 }}>{total}</Tag>
            )}
          </section>
        }
        open={open}
        onClose={onClose}
        width={860}
        destroyOnClose
        styles={{ body: { padding: "16px" } }}
      >
        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 12 }}>
          Items here were soft-deleted. Restore them to bring them back, or permanently delete to remove forever.
        </p>

        <Table
          rowKey={rowKey}
          columns={[...columns, actionColumn]}
          dataSource={data}
          loading={loading}
          size="small"
          scroll={{ x: true }}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (p) => { setPage(p); load(p); },
            showTotal: (t) => `${t} trashed record${t !== 1 ? "s" : ""}`,
            size: "small",
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Trash is empty"
              />
            ),
          }}
        />
      </Drawer>

      <Modal
        open={!!confirmId}
        onCancel={() => { setConfirmId(null); setConfirmText(""); }}
        onOk={handlePermanentDelete}
        okText="Delete Forever"
        okButtonProps={{ disabled: confirmText !== CONFIRM_WORD, danger: true }}
        cancelText="Cancel"
        title={
          <section style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <WarningOutlined style={{ color: "#ef4444" }} />
            Permanently Delete
          </section>
        }
        width={420}
        destroyOnClose
      >
        <p style={{ color: "var(--color-text-secondary)", fontSize: 13, marginBottom: 12 }}>
          This record will be <strong>permanently deleted</strong> and cannot be recovered.
        </p>
        <p style={{ fontSize: 13, marginBottom: 8 }}>
          Type <strong>{CONFIRM_WORD}</strong> to proceed:
        </p>
        <Input
          autoFocus
          placeholder={CONFIRM_WORD}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          onPressEnter={() => confirmText === CONFIRM_WORD && handlePermanentDelete()}
          status={confirmText && confirmText !== CONFIRM_WORD ? "error" : ""}
        />
      </Modal>
    </>
  );
};

export default TrashDrawer;
