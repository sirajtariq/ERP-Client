import { useEffect, useState } from "react";
import { message, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { AppTable, AppButton, AppModal, PageHeader } from "@/components/common";
import { getAllUsers, deleteUser, normalizeUser } from "@/services/userService";
import { getUserColumns } from "./columns";
import UserDrawer from "./UserDrawer";
import UserViewDrawer from "./UserViewDrawer";

const { Text } = Typography;

const Users = () => {
  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [viewUser, setViewUser]       = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, user: null });

  const [page, setPage] = useState({ current: 1, size: 10, total: 0, totalPages: 0 });

  const fetchUsers = async (pageNo = page.current, pageSize = page.size) => {
    setLoading(true);
    try {
      const response = await getAllUsers({ page: pageNo, pageSize });
      const normalized = (response.results || []).map(normalizeUser);
      setUsers(normalized);
      setPage((prev) => ({
        ...prev,
        current:    response.page       || pageNo,
        size:       response.page_size  || pageSize,
        total:      response.count      || 0,
        totalPages: response.total_pages || 0,
      }));
    } catch {
      message.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1, page.size);
  }, []);

  const handlePagination = (pageNo, pageSize) => {
    const size = pageSize || page.size;
    setPage((prev) => ({ ...prev, current: pageNo, size }));
    fetchUsers(pageNo, size);
  };

  const handleCreate = () => {
    setEditingUser(null);
    setDrawerOpen(true);
  };

  const handleEdit = (record) => {
    setEditingUser(record);
    setDrawerOpen(true);
  };

  const handleDeleteClick = (record) => {
    setDeleteModal({ open: true, user: record });
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteUser(deleteModal.user.id);
      message.success(`"${deleteModal.user.username}" deleted`);
      setDeleteModal({ open: false, user: null });
      fetchUsers(page.current, page.size);
    } catch (err) {
      message.error(err.response?.data?.detail || "Failed to delete user");
    }
  };

  const handleDrawerSubmit = () => {
    message.success(editingUser ? "User updated successfully" : "User created successfully");
    setDrawerOpen(false);
    fetchUsers(page.current, page.size);
  };

  const columns = getUserColumns({
    onView:   (record) => setViewUser(record),
    onEdit:   handleEdit,
    onDelete: handleDeleteClick,
  });

  return (
    <section>
      <PageHeader
        title="Users"
        subtitle="Manage system user accounts and roles"
        extra={
          <AppButton type="primary" icon={<PlusOutlined />} onClick={handleCreate} className="btn-dark">
            Add User
          </AppButton>
        }
      />

      <AppTable
        columns={columns}
        dataSource={users}
        loading={loading}
        scroll={{ y: "calc(100vh - 320px)" }}
        page={page}
        handlePagination={handlePagination}
      />

      <UserDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleDrawerSubmit}
        editingUser={editingUser}
      />

      <UserViewDrawer
        open={!!viewUser}
        onClose={() => setViewUser(null)}
        user={viewUser}
      />

      <AppModal
        title="Delete this user?"
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, user: null })}
        onSubmit={handleDeleteConfirm}
        submitText="Delete user"
        cancelText="Keep user"
        danger
        width={460}
      >
        <Text style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          This will permanently remove{" "}
          <strong style={{ color: "var(--color-text)" }}>"{deleteModal.user?.username}"</strong>{" "}
          and all associated data. Are you sure?
        </Text>
      </AppModal>
    </section>
  );
};

export default Users;
