import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card } from "antd";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  ShoppingCartOutlined, WalletOutlined, CreditCardOutlined, ClockCircleOutlined,
  FallOutlined, RiseOutlined, ShopOutlined, CheckCircleOutlined, BankOutlined,
  ArrowUpOutlined, ArrowDownOutlined, HistoryOutlined, UserAddOutlined, ThunderboltOutlined,
} from "@ant-design/icons";
import { CompanyLogo } from "@/components/common";
import { recentTransactions } from "@/mock/dashboard";
import { getCompanyInfo } from "@/utils/companyInfoStore";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency, formatDate } from "@/utils";
import { getDashboardCards, getDashboardCharts } from "@/services/dashboardService";
import { useDashboardFilter } from "@/context/DashboardFilterContext";
import styles from "./styles.module.css";

const CARD_META = [
  { id: 1, title: "Total Sales",       color: "#7c5cfc", gradient: "linear-gradient(135deg, #7c5cfc, #a78bfa)", icon: <ShoppingCartOutlined /> },
  { id: 2, title: "Cash Sales",        color: "#22c55e", gradient: "linear-gradient(135deg, #22c55e, #4ade80)", icon: <WalletOutlined /> },
  { id: 3, title: "Credit Sales",      color: "#3b82f6", gradient: "linear-gradient(135deg, #3b82f6, #60a5fa)", icon: <CreditCardOutlined /> },
  { id: 4, title: "Receivable",        color: "#f59e0b", gradient: "linear-gradient(135deg, #f59e0b, #fbbf24)", icon: <ClockCircleOutlined /> },
  { id: 5, title: "Outgoing Expense",  color: "#ef4444", gradient: "linear-gradient(135deg, #ef4444, #f87171)", icon: <FallOutlined /> },
  { id: 6, title: "Profit",            color: "#10b981", gradient: "linear-gradient(135deg, #10b981, #34d399)", icon: <RiseOutlined /> },
  { id: 7, title: "Supplier Payable",  color: "#f43f5e", gradient: "linear-gradient(135deg, #f43f5e, #fb7185)", icon: <ShopOutlined /> },
  { id: 8, title: "Supplier Paid",     color: "#06b6d4", gradient: "linear-gradient(135deg, #06b6d4, #22d3ee)", icon: <CheckCircleOutlined /> },
  { id: 9, title: "Incoming Cash",     color: "#8b5cf6", gradient: "linear-gradient(135deg, #8b5cf6, #c084fc)", icon: <BankOutlined /> },
];

const HERO_IDS = [1, 6, 4]; // Total Sales, Profit, Receivable

const QUICK_ACTIONS = [
  { label: "Sale Invoice",     icon: <ShoppingCartOutlined />, path: "/sale-invoice",     color: "#7c5cfc" },
  { label: "Purchase Invoice", icon: <ShopOutlined />,         path: "/purchase-invoice", color: "#3b82f6" },
  { label: "Add Expense",      icon: <WalletOutlined />,       path: "/daily-expense",    color: "#ef4444" },
  { label: "Receive Payment",  icon: <BankOutlined />,         path: "/daily-income",     color: "#22c55e" },
  { label: "Customer Khata",   icon: <UserAddOutlined />,      path: "/customer-khata",   color: "#f59e0b" },
];

const formatK = (val) => {
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
  return val;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const calcTrend = (data, key) => {
  if (!data || data.length < 2) return null;
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const lastVal = key === "profit" ? last.income - last.expense : last[key];
  const prevVal = key === "profit" ? prev.income - prev.expense : prev[key];
  if (!prevVal) return null;
  return ((lastVal - prevVal) / Math.abs(prevVal)) * 100;
};

const normalizeCards = (data) => {
  const n = (v) => parseFloat(v) || 0;
  return [
    { ...CARD_META[0], value: n(data.totalSales      ?? data.total_sales) },
    { ...CARD_META[1], value: n(data.cashSales        ?? data.cash_sales) },
    { ...CARD_META[2], value: n(data.creditSales      ?? data.credit_sales) },
    { ...CARD_META[3], value: n(data.receivable       ?? data.total_receivable) },
    { ...CARD_META[4], value: n(data.outgoingExpense  ?? data.outgoing_expense  ?? data.totalExpense ?? data.total_expense) },
    { ...CARD_META[5], value: n(data.profit           ?? data.net_profit) },
    { ...CARD_META[6], value: n(data.supplierPayable  ?? data.supplier_payable) },
    { ...CARD_META[7], value: n(data.supplierPaid     ?? data.supplier_paid) },
    { ...CARD_META[8], value: n(data.incomingCash     ?? data.incoming_cash) },
  ];
};

const normalizeCharts = (data) => {
  const rows = Array.isArray(data) ? data : (data.monthly ?? data.chartData ?? data.data ?? data.results ?? []);
  return rows.map((item) => ({
    month:   item.month   || item.period || item.label || "",
    income:  parseFloat(item.income  ?? item.total_income  ?? 0) || 0,
    expense: parseFloat(item.expense ?? item.total_expense ?? 0) || 0,
  }));
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color, margin: "2px 0", fontSize: 13, fontWeight: 600 }}>
          {entry.name}: Rs {entry.value.toLocaleString("en-PK")}
        </p>
      ))}
    </div>
  );
};

const Dashboard = () => {
  const [cards, setCards]         = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading]     = useState(true);
  const { dateRange } = useDashboardFilter();
  const companyInfo = getCompanyInfo();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const fromDate = dateRange?.[0] ? dateRange[0].format("YYYY-MM-DD") : "";
      const toDate   = dateRange?.[1] ? dateRange[1].format("YYYY-MM-DD") : "";
      try {
        const [cardsRes, chartsRes] = await Promise.all([
          getDashboardCards({ fromDate, toDate }),
          getDashboardCharts({ fromDate, toDate }),
        ]);
        setCards(normalizeCards(cardsRes));
        setChartData(normalizeCharts(chartsRes));
      } catch {
        // keep empty state on error
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [dateRange]);

  const heroCards  = cards.filter((c) => HERO_IDS.includes(c.id));
  const gridCards  = cards.filter((c) => !HERO_IDS.includes(c.id));
  const trendById  = { 1: calcTrend(chartData, "income"), 6: calcTrend(chartData, "profit") };
  const today = new Date().toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <section className={styles.dashboard}>
      <section className={`${styles.pageHeader} animate-fade-in-up`}>
        <section>
          <h1 className={styles.pageTitle}>{getGreeting()}, {user?.name || user?.username || "there"} 👋</h1>
          <p className={styles.pageSubtitle}>Here's what's happening with your business — {today}</p>
        </section>
        <section className={styles.companyChip}>
          <CompanyLogo size={34} />
          <span className={styles.companyChipName}>{companyInfo.name}</span>
        </section>
      </section>

      {/* Hero stats */}
      <Row gutter={[14, 14]}>
        {heroCards.map((card, index) => {
          const trend = trendById[card.id];
          return (
            <Col xs={24} sm={12} lg={8} key={card.id}>
              <section
                className={`${styles.heroCard} animate-fade-in-up`}
                style={{ animationDelay: `${index * 0.05}s`, "--accent": card.color, background: card.gradient }}
              >
                <span className={styles.heroIcon}>{card.icon}</span>
                <span className={styles.heroLabel}>{card.title}</span>
                <span className={styles.heroValue}>{formatCurrency(card.value)}</span>
                {trend !== null && trend !== undefined && (
                  <span className={`${styles.heroTrend} ${trend >= 0 ? styles.trendUp : styles.trendDown}`}>
                    {trend >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    {Math.abs(trend).toFixed(1)}% vs last month
                  </span>
                )}
                <span className={styles.heroGlow} />
              </section>
            </Col>
          );
        })}
      </Row>

      {/* Quick actions */}
      <section className={`${styles.quickActions} animate-fade-in-up`}>
        <span className={styles.quickActionsLabel}><ThunderboltOutlined /> Quick Actions</span>
        <section className={styles.quickActionsRow}>
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa.path}
              className={styles.quickActionBtn}
              style={{ "--accent": qa.color }}
              onClick={() => navigate(qa.path)}
            >
              <span className={styles.quickActionIcon}>{qa.icon}</span>
              {qa.label}
            </button>
          ))}
        </section>
      </section>

      {/* Secondary KPI grid */}
      <Row gutter={[14, 14]}>
        {gridCards.map((card, index) => (
          <Col xs={24} sm={12} md={8} key={card.id}>
            <section
              className={`${styles.kpiCard} animate-fade-in-up`}
              style={{ animationDelay: `${index * 0.04}s`, "--accent": card.color }}
            >
              <span className={styles.kpiIcon}>{card.icon}</span>
              <span className={styles.kpiBody}>
                <span className={styles.kpiLabel}>{card.title}</span>
                <span className={styles.kpiValue}>{formatCurrency(card.value)}</span>
              </span>
            </section>
          </Col>
        ))}
      </Row>

      <Row gutter={[14, 14]}>
        <Col xs={24} lg={14}>
          <Card
            title={
              <span className={styles.chartTitleWrap}>
                <span className={styles.chartTitle}>Income vs Expense</span>
                <span className={styles.chartSubtitle}>Last {chartData.length || "—"} months</span>
              </span>
            }
            className={styles.chartCard}
          >
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#7c5cfc" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#7c5cfc" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatK} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={48} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }} />
                <Area type="monotone" dataKey="income" name="Income" stroke="#7c5cfc" strokeWidth={2.5} fill="url(#incomeGrad)" dot={{ r: 3, fill: "#7c5cfc" }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" strokeWidth={2.5} fill="url(#expenseGrad)" dot={{ r: 3, fill: "#ef4444" }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title={
              <span className={styles.chartTitleWrap}>
                <span className={styles.chartTitle}>Monthly Breakdown</span>
                <span className={styles.chartSubtitle}>Last {chartData.length || "—"} months</span>
              </span>
            }
            className={styles.chartCard}
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barSize={14} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatK} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={48} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }} />
                <Bar dataKey="income"  name="Income"  fill="#7c5cfc" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[14, 14]}>
        <Col xs={24}>
          <Card
            title={<span className={styles.chartTitle}><HistoryOutlined /> Recent Activity</span>}
            className={styles.chartCard}
          >
            <ul className={styles.activityList}>
              {recentTransactions.map((t) => (
                <li key={`${t.category}-${t.id}`} className={styles.activityItem}>
                  <span className={`${styles.activityIcon} ${t.type === "credit" ? styles.iconUp : styles.iconDown}`}>
                    {t.type === "credit" ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  </span>
                  <span className={styles.activityInfo}>
                    <span className={styles.activityName}>{t.partyName}</span>
                    <span className={styles.activityMeta}>
                      {t.category === "received" ? "Payment received" : "Payment made"} · {formatDate(t.date)}
                    </span>
                  </span>
                  <span className={`${styles.activityAmount} ${t.type === "credit" ? styles.amountGreen : styles.amountRed}`}>
                    {t.type === "credit" ? "+" : "-"}{formatCurrency(t.amount)}
                  </span>
                </li>
              ))}
              {recentTransactions.length === 0 && (
                <li className={styles.activityEmpty}>No recent activity</li>
              )}
            </ul>
          </Card>
        </Col>
      </Row>
    </section>
  );
};

export default Dashboard;
