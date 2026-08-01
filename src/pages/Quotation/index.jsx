import { useEffect, useState } from "react";
import { Space, Tag, message, Typography } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, SwapOutlined, EyeOutlined } from "@ant-design/icons";
import { AppTable, AppButton, AppModal, PageHeader, FilterPanel } from "@/components/common";
import { formatCurrency, formatDate } from "@/utils";
import { useSearch } from "@/context/SearchContext";
import { filterConfig } from "@/utils/filterConfig";
import { buildFilterQueryParams } from "@/utils/filterUtils";
import { QUOTATION_STATUS_OPTIONS } from "@/constants/filterOptions";
import QuotationDrawer from "./QuotationDrawer";
import PreviewModal from "./PreviewModal";

const { Text } = Typography;

const mockQuotations = [
  { id: 1, quotationNo: "QT-0001", customerName: "Ahmed Electronics", total: 29000, date: "2026-06-20", validDays: "30", status: "pending" },
  { id: 2, quotationNo: "QT-0002", customerName: "Bilal Store", total: 42000, date: "2026-06-18", validDays: "15", status: "accepted" },
  { id: 3, quotationNo: "QT-0003", customerName: "Farooq Traders", total: 21500, date: "2026-06-15", validDays: "7", status: "rejected" },
];

const Quotation = () => {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, quotation: null });
  const [viewQuotation, setViewQuotation] = useState(null);
  const [appliedFilters, setAppliedFilters] = useState({});
  const { searchText, setPlaceholder, clearSearch } = useSearch();

  const fetchQuotations = () => {
    setLoading(true);
    setTimeout(() => { setQuotations(mockQuotations); setLoading(false); }, 300);
  };

  useEffect(() => {
    setPlaceholder("Search by quotation, customer...");
    fetchQuotations();
    return () => clearSearch();
  }, []);

  const handleCreate = () => { setEditingQuotation(null); setDrawerOpen(true); };

  // Filters are collected and turned into a query-param string here, but NOT sent to
  // the API yet — backend doesn't support these params.
  const handleApplyFilters = (filters) => {
    setAppliedFilters(filters);
    const filterQuery = buildFilterQueryParams(filters); // eslint-disable-line no-unused-vars
    fetchQuotations();
  };

  const handleResetFilters = () => {
    setAppliedFilters({});
    fetchQuotations();
  };
  const handleEdit = (record) => { setEditingQuotation(record); setDrawerOpen(true); };
  const handleDeleteClick = (record) => { setDeleteModal({ open: true, quotation: record }); };

  const handleDeleteConfirm = () => {
    message.success(`"${deleteModal.quotation.quotationNo}" deleted`);
    setDeleteModal({ open: false, quotation: null });
    fetchQuotations();
  };

  const handleDrawerSubmit = () => {
    message.success(editingQuotation ? "Quotation updated" : "Quotation created");
    setDrawerOpen(false);
    fetchQuotations();
  };

  const statusColors = { pending: "orange", accepted: "green", rejected: "red", expired: "default" };

  const columns = [
    { title: "Quotation No", dataIndex: "quotationNo", key: "quotationNo", width: "15%", render: (val) => <span style={{ fontWeight: 600, color: "#7c5cfc" }}>{val}</span> },
    { title: "Customer", dataIndex: "customerName", key: "customerName", width: "25%", ellipsis: true, render: (val) => <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{val || "-"}</span> },
    { title: "Total", dataIndex: "total", key: "total", width: "15%", render: (val) => <span style={{ fontWeight: 600 }}>{formatCurrency(val || 0)}</span> },
    { title: "Valid Days", dataIndex: "validDays", key: "validDays", width: "10%", render: (val) => `${val || "-"} days` },
    { title: "Status", dataIndex: "status", key: "status", width: "12%", render: (val) => <Tag color={statusColors[val] || "default"} style={{ borderRadius: 6, fontWeight: 600, textTransform: "capitalize" }}>{val}</Tag> },
    { title: "Date", dataIndex: "date", key: "date", width: "12%", render: (val) => <span style={{ color: "var(--color-text-secondary)" }}>{val ? formatDate(val) : "-"}</span> },
    {
      title: "Action", key: "actions", width: "16%",
      render: (_, record) => (
        <Space size={4}>
          <AppButton type="text" icon={<EyeOutlined />} size="small" onClick={() => setViewQuotation(record)} />
          <AppButton type="text" icon={<SwapOutlined />} size="small" title="Convert to Invoice" onClick={() => message.success(`"${record.quotationNo}" converted to invoice`)} />
          <AppButton type="text" icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} />
          <AppButton type="text" icon={<DeleteOutlined />} size="small" danger onClick={() => handleDeleteClick(record)} />
        </Space>
      ),
    },
  ];

  const filteredData = quotations.filter((q) =>
    (q.quotationNo || "").toLowerCase().includes(searchText.toLowerCase()) ||
    (q.customerName || "").toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Quotations"
        subtitle="Create and manage quotations"
        extra={
          <>
            <FilterPanel
              config={filterConfig.quotation}
              options={{ status: QUOTATION_STATUS_OPTIONS }}
              values={appliedFilters}
              onApply={handleApplyFilters}
              onReset={handleResetFilters}
            />
            <AppButton type="primary" icon={<PlusOutlined />} onClick={handleCreate} className="btn-dark">Create Quotation</AppButton>
          </>
        }
      />

      <AppTable columns={columns} dataSource={filteredData} loading={loading} scroll={{ y: "calc(100vh - 320px)" }} />

      <QuotationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSubmit={handleDrawerSubmit} editingQuotation={editingQuotation} />

      <AppModal title="Delete this quotation?" open={deleteModal.open} onClose={() => setDeleteModal({ open: false, quotation: null })} onSubmit={handleDeleteConfirm} submitText="Delete quotation" cancelText="Keep quotation" danger width={460}>
        <Text style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          This will permanently remove <strong style={{ color: "var(--color-text)" }}>"{deleteModal.quotation?.quotationNo}"</strong>. Are you sure?
        </Text>
      </AppModal>

      <PreviewModal
        open={!!viewQuotation}
        onClose={() => setViewQuotation(null)}
        data={{
          customer: { name: viewQuotation?.customerName || "N/A" },
          date: viewQuotation?.date,
          validDays: viewQuotation?.validDays,
          paymentTerms: "",
          vatPercent: 0,
          vatAmount: 0,
          discount: 0,
          items: [],
          itemsTotal: viewQuotation?.total || 0,
          grandTotal: viewQuotation?.total || 0,
        }}
      />
    </div>
  );
};

export default Quotation;
