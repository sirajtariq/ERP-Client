import { useEffect, useState } from "react";
import {
  Space,
  Tag,
  Form,
  message,
  Popconfirm,
  Row,
  Col,
  DatePicker,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { AppTable, AppButton, AppInput, AppSelect, AppModal, PageHeader } from "@/components/common";
import { transactionService, partyService } from "@/services";
import {
  transactionTypeOptions,
  categoryOptions,
  paymentModeOptions,
} from "@/mock";
import { formatCurrency, formatDate, getTransactionColor } from "@/utils";

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txData, partyData] = await Promise.all([
        transactionService.getAll(),
        partyService.getAll(),
      ]);
      setTransactions(txData);
      setParties(partyData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const partyOptions = parties.map((p) => ({
    label: p.name,
    value: p.id,
  }));

  const handleAdd = () => {
    setEditingTransaction(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (record) => {
    setEditingTransaction(record);
    form.setFieldsValue({
      ...record,
      date: dayjs(record.date),
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    await transactionService.delete(id);
    message.success("Transaction deleted");
    fetchData();
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const party = parties.find((p) => p.id === values.partyId);
    const payload = {
      ...values,
      partyName: party?.name || "",
      date: values.date?.format("YYYY-MM-DD"),
    };

    if (editingTransaction) {
      await transactionService.update(editingTransaction.id, payload);
      message.success("Transaction updated");
    } else {
      await transactionService.create(payload);
      message.success("Transaction added");
    }
    setModalOpen(false);
    form.resetFields();
    fetchData();
  };

  const columns = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date) => formatDate(date),
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
      defaultSortOrder: "descend",
    },
    {
      title: "Party",
      dataIndex: "partyName",
      key: "partyName",
      ellipsis: true,
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type) => (
        <Tag color={type === "credit" ? "green" : "red"}>
          {type === "credit" ? "Credit (Jama)" : "Debit (Udhar)"}
        </Tag>
      ),
      filters: [
        { text: "Credit", value: "credit" },
        { text: "Debit", value: "debit" },
      ],
      onFilter: (value, record) => record.type === value,
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (amount, record) => (
        <span style={{ color: getTransactionColor(record.type), fontWeight: 600 }}>
          {formatCurrency(amount)}
        </span>
      ),
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      render: (cat) => <Tag>{cat.toUpperCase()}</Tag>,
      filters: categoryOptions.map((c) => ({ text: c.label, value: c.value })),
      onFilter: (value, record) => record.category === value,
    },
    {
      title: "Payment Mode",
      dataIndex: "paymentMode",
      key: "paymentMode",
      render: (mode) => {
        const found = paymentModeOptions.find((m) => m.value === mode);
        return found?.label || mode;
      },
    },
    {
      title: "Reference",
      dataIndex: "reference",
      key: "reference",
      ellipsis: true,
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <AppButton
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete this transaction?"
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
        title="Transactions"
        subtitle="Track all your credits and debits"
        extra={
          <AppButton type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Add Transaction
          </AppButton>
        }
      />

      <AppTable
        columns={columns}
        dataSource={transactions}
        loading={loading}
        scroll={{ x: 1000 }}
      />

      <AppModal
        title={editingTransaction ? "Edit Transaction" : "Add Transaction"}
        open={modalOpen}
        onSubmit={handleSubmit}
        onClose={() => setModalOpen(false)}
        submitText={editingTransaction ? "Update" : "Create"}
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <AppSelect
                label="Party"
                name="partyId"
                placeholder="Select party"
                options={partyOptions}
                rules={[{ required: true, message: "Party is required" }]}
              />
            </Col>
            <Col span={12}>
              <AppSelect
                label="Type"
                name="type"
                placeholder="Select type"
                options={transactionTypeOptions}
                rules={[{ required: true, message: "Type is required" }]}
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <AppInput
                label="Amount"
                name="amount"
                type="number"
                placeholder="Enter amount"
                rules={[{ required: true, message: "Amount is required" }]}
              />
            </Col>
            <Col span={12}>
              <Form.Item label="Date" name="date" rules={[{ required: true, message: "Date is required" }]}>
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <AppSelect
                label="Category"
                name="category"
                placeholder="Select category"
                options={categoryOptions}
                rules={[{ required: true, message: "Category is required" }]}
              />
            </Col>
            <Col span={12}>
              <AppSelect
                label="Payment Mode"
                name="paymentMode"
                placeholder="Select payment mode"
                options={paymentModeOptions}
                rules={[{ required: true, message: "Payment mode is required" }]}
              />
            </Col>
          </Row>
          <AppInput
            label="Reference"
            name="reference"
            placeholder="Enter reference number"
          />
          <AppInput
            label="Description"
            name="description"
            type="textarea"
            placeholder="Enter description"
            rows={3}
          />
        </Form>
      </AppModal>
    </div>
  );
};

export default Transactions;
