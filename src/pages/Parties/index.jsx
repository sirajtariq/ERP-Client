import { useEffect, useState } from "react";
import {
  Space,
  Tag,
  Form,
  message,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { AppTable, AppButton, AppInput, AppSelect, AppModal, PageHeader } from "@/components/common";
import { partyService } from "@/services";
import { partyTypeOptions } from "@/mock";
import { formatCurrency, formatDate, getBalanceColor } from "@/utils";

const Parties = () => {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [form] = Form.useForm();

  const fetchParties = async () => {
    setLoading(true);
    try {
      const data = await partyService.getAll();
      setParties(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParties();
  }, []);

  const handleAdd = () => {
    setEditingParty(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (record) => {
    setEditingParty(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    await partyService.delete(id);
    message.success("Party deleted");
    fetchParties();
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingParty) {
      await partyService.update(editingParty.id, values);
      message.success("Party updated");
    } else {
      await partyService.create(values);
      message.success("Party added");
    }
    setModalOpen(false);
    form.resetFields();
    fetchParties();
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Phone",
      dataIndex: "phone",
      key: "phone",
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type) => (
        <Tag color={type === "customer" ? "blue" : "orange"}>
          {type === "customer" ? "Customer" : "Vendor"}
        </Tag>
      ),
      filters: [
        { text: "Customer", value: "customer" },
        { text: "Vendor", value: "supplier" },
      ],
      onFilter: (value, record) => record.type === value,
    },
    {
      title: "Balance",
      dataIndex: "balance",
      key: "balance",
      render: (balance, record) => (
        <span style={{ color: getBalanceColor(record.balanceType), fontWeight: 600 }}>
          {formatCurrency(balance)}
        </span>
      ),
      sorter: (a, b) => a.balance - b.balance,
    },
    {
      title: "Status",
      dataIndex: "balanceType",
      key: "balanceType",
      render: (type) => {
        const colorMap = { receive: "green", pay: "red", settled: "default" };
        const labelMap = { receive: "To Receive", pay: "To Pay", settled: "Settled" };
        return <Tag color={colorMap[type]}>{labelMap[type]}</Tag>;
      },
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => formatDate(date),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <AppButton type="text" icon={<EyeOutlined />} size="small" />
          <AppButton
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete this party?"
            onConfirm={() => handleDelete(record.id)}
          >
            <AppButton type="text" icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Parties"
        subtitle="Manage your customers and suppliers"
        extra={
          <AppButton type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add Party
          </AppButton>
        }
      />

      <AppTable columns={columns} dataSource={parties} loading={loading} />

      <AppModal
        title={editingParty ? "Edit Party" : "Add Party"}
        open={modalOpen}
        onSubmit={handleSubmit}
        onClose={() => setModalOpen(false)}
        submitText={editingParty ? "Update" : "Create"}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <AppInput
            label="Name"
            name="name"
            placeholder="Enter party name"
            rules={[{ required: true, message: "Name is required" }]}
          />
          <AppInput
            label="Phone"
            name="phone"
            placeholder="Enter phone number"
            rules={[{ required: true, message: "Phone is required" }]}
          />
          <AppInput
            label="Email"
            name="email"
            type="email"
            placeholder="Enter email address"
          />
          <AppSelect
            label="Type"
            name="type"
            placeholder="Select party type"
            options={partyTypeOptions}
            rules={[{ required: true, message: "Type is required" }]}
          />
          <AppInput
            label="Address"
            name="address"
            type="textarea"
            placeholder="Enter address"
            rows={3}
          />
          <AppInput label="GST Number" name="gst" placeholder="Enter GST number" />
        </Form>
      </AppModal>
    </div>
  );
};

export default Parties;
