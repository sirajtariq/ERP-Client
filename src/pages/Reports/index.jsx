import { useEffect, useState } from "react";
import { Row, Col, Card, Statistic, Table, Tag } from "antd";
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import { PageHeader } from "@/components/common";
import { dashboardService } from "@/services";
import { partyService } from "@/services";
import { formatCurrency } from "@/utils";
import styles from "./styles.module.css";

const Reports = () => {
  const [stats, setStats] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, monthly, partyData] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getMonthlyData(),
          partyService.getAll(),
        ]);
        setStats(statsData);
        setMonthlyData(monthly);
        setParties(partyData);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const receivableParties = parties
    .filter((p) => p.balanceType === "receive" && p.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  const payableParties = parties
    .filter((p) => p.balanceType === "pay" && p.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  const monthlyColumns = [
    { title: "Month", dataIndex: "month", key: "month" },
    {
      title: "Income",
      dataIndex: "income",
      key: "income",
      render: (val) => (
        <span style={{ color: "#52c41a", fontWeight: 600 }}>
          {formatCurrency(val)}
        </span>
      ),
    },
    {
      title: "Expense",
      dataIndex: "expense",
      key: "expense",
      render: (val) => (
        <span style={{ color: "#ff4d4f", fontWeight: 600 }}>
          {formatCurrency(val)}
        </span>
      ),
    },
    {
      title: "Profit / Loss",
      key: "pl",
      render: (_, record) => {
        const diff = record.income - record.expense;
        return (
          <span style={{ color: diff >= 0 ? "#52c41a" : "#ff4d4f", fontWeight: 600 }}>
            {formatCurrency(Math.abs(diff))} {diff >= 0 ? "Profit" : "Loss"}
          </span>
        );
      },
    },
  ];

  const partyColumns = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Phone", dataIndex: "phone", key: "phone" },
    {
      title: "Balance",
      dataIndex: "balance",
      key: "balance",
      render: (val) => <span style={{ fontWeight: 600 }}>{formatCurrency(val)}</span>,
    },
  ];

  return (
    <div className={styles.reports}>
      <PageHeader title="Reports" subtitle="Financial summaries and insights" />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Net Balance"
              value={Math.abs(stats?.netBalance || 0)}
              prefix={
                (stats?.netBalance || 0) >= 0 ? (
                  <ArrowUpOutlined />
                ) : (
                  <ArrowDownOutlined />
                )
              }
              valueStyle={{
                color: (stats?.netBalance || 0) >= 0 ? "#52c41a" : "#ff4d4f",
              }}
              formatter={(val) => formatCurrency(val)}
              suffix={
                <Tag color={(stats?.netBalance || 0) >= 0 ? "green" : "red"}>
                  {(stats?.netBalance || 0) >= 0 ? "Profit" : "Loss"}
                </Tag>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Receivable"
              value={stats?.totalReceivable || 0}
              valueStyle={{ color: "#52c41a" }}
              formatter={(val) => formatCurrency(val)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Payable"
              value={stats?.totalPayable || 0}
              valueStyle={{ color: "#ff4d4f" }}
              formatter={(val) => formatCurrency(val)}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Monthly Summary" style={{ marginBottom: 24 }}>
        <Table
          columns={monthlyColumns}
          dataSource={monthlyData}
          loading={loading}
          rowKey="month"
          pagination={false}
          bordered
          size="middle"
        />
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Top Receivables" className={styles.balanceCard}>
            <Table
              columns={partyColumns}
              dataSource={receivableParties}
              rowKey="id"
              pagination={false}
              bordered
              size="small"
              locale={{ emptyText: "No receivables" }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Top Payables" className={styles.balanceCard}>
            <Table
              columns={partyColumns}
              dataSource={payableParties}
              rowKey="id"
              pagination={false}
              bordered
              size="small"
              locale={{ emptyText: "No payables" }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Reports;
