import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, Modal } from "antd";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import {
  ShoppingCartOutlined, WalletOutlined, CreditCardOutlined, ClockCircleOutlined,
  FallOutlined, RiseOutlined, ShopOutlined, CheckCircleOutlined, BankOutlined,
  ArrowUpOutlined, ArrowDownOutlined, UserAddOutlined, ThunderboltOutlined,
  InfoCircleOutlined, FundOutlined,
} from "@ant-design/icons";
import { CompanyLogo } from "@/components/common";
import { getCompanyInfo } from "@/utils/companyInfoStore";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/utils";
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
      {payload.map((entry) => {
        const isProfit = entry.dataKey === "profit";
        const color = isProfit
          ? (entry.value >= 0 ? "#10b981" : "#ef4444")
          : entry.fill || entry.color;
        return (
          <p key={entry.name} style={{ color, margin: "2px 0", fontSize: 13, fontWeight: 600 }}>
            {entry.name}: {entry.value < 0 ? "-" : ""}Rs {Math.abs(entry.value).toLocaleString("en-PK")}
          </p>
        );
      })}
    </div>
  );
};

const InsightRow = ({ label, value, color, sub }) => (
  <section style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "9px 0", borderBottom: "1px solid var(--color-border-light)" }}>
    <span style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>{label}</span>
    <section style={{ textAlign: "right" }}>
      <span style={{ fontWeight: 700, fontSize: 13, color: color || "var(--color-text)" }}>{value}</span>
      {sub && <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: 0 }}>{sub}</p>}
    </section>
  </section>
);

const Dashboard = () => {
  const [cards, setCards]         = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [chartGuide, setChartGuide]       = useState(false);
  const [insightsOpen, setInsightsOpen]   = useState(false);
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
  const enrichedChartData = chartData.map((d) => ({ ...d, profit: d.income - d.expense }));
  const totalIncome  = chartData.reduce((s, d) => s + d.income,  0);
  const totalExpense = chartData.reduce((s, d) => s + d.expense, 0);
  const netProfit    = totalIncome - totalExpense;
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
                <span className={styles.heroGlow} />
                <span className={styles.heroShine} />
                <section className={styles.heroTop}>
                  <span className={styles.heroLabel}>{card.title}</span>
                  <span className={styles.heroIcon}>{card.icon}</span>
                </section>
                <span className={styles.heroValue}>{formatCurrency(card.value)}</span>
                {trend !== null && trend !== undefined && (
                  <span className={`${styles.heroTrend} ${trend >= 0 ? styles.trendUp : styles.trendDown}`}>
                    {trend >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    {Math.abs(trend).toFixed(1)}% vs last month
                  </span>
                )}
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
        <Col xs={24}>
          <Card
            className={styles.chartCard}
            title={
              <section className={styles.chartHeader}>
                <section style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <section>
                    <p className={styles.chartTitle}>Financial Overview</p>
                    <p className={styles.chartSubtitle}>Income · Expense · Net Profit — last {enrichedChartData.length || "—"} months</p>
                  </section>
                  <button
                    onClick={() => setChartGuide(true)}
                    title="How to read this chart"
                    style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 22, height: 22, borderRadius: "50%",
                      background: "var(--color-border-light)", border: "1px solid var(--color-border)",
                      color: "var(--color-text-secondary)", fontSize: 12, cursor: "pointer",
                      flexShrink: 0, marginTop: 2,
                    }}
                  >
                    <InfoCircleOutlined />
                  </button>
                  <button
                    onClick={() => setInsightsOpen(true)}
                    title="View financial insights"
                    style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      gap: 4, padding: "2px 10px", height: 22, borderRadius: 11,
                      background: "linear-gradient(135deg, #7c5cfc, #a78bfa)",
                      border: "none", color: "#fff", fontSize: 11, fontWeight: 600,
                      cursor: "pointer", flexShrink: 0, marginTop: 2, letterSpacing: "0.01em",
                    }}
                  >
                    <FundOutlined style={{ fontSize: 11 }} /> Insights
                  </button>
                </section>
                <section className={styles.chartSummary}>
                  <section className={styles.summaryItem}>
                    <span className={styles.summaryDot} style={{ background: "#7c5cfc" }} />
                    <span className={styles.summaryLabel}>Income</span>
                    <span className={styles.summaryValue}>{formatCurrency(totalIncome)}</span>
                  </section>
                  <section className={styles.summaryItem}>
                    <span className={styles.summaryDot} style={{ background: "#ef4444" }} />
                    <span className={styles.summaryLabel}>Expense</span>
                    <span className={styles.summaryValue}>{formatCurrency(totalExpense)}</span>
                  </section>
                  <section className={styles.summaryItem}>
                    <span className={styles.summaryDot} style={{ background: netProfit >= 0 ? "#10b981" : "#f43f5e" }} />
                    <span className={styles.summaryLabel}>Net</span>
                    <span className={styles.summaryValue} style={{ color: netProfit >= 0 ? "#10b981" : "#ef4444" }}>
                      {netProfit < 0 ? "-" : ""}{ formatCurrency(Math.abs(netProfit)) }
                    </span>
                  </section>
                </section>
              </section>
            }
          >
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={enrichedChartData} margin={{ top: 10, right: 56, left: 0, bottom: 0 }} barGap={4}>
                <defs>
                  <linearGradient id="incomeBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#7c5cfc" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="expenseBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#ef4444" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#f87171" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                {/* Left axis — Income & Expense bars */}
                <YAxis
                  yAxisId="bars"
                  orientation="left"
                  tickFormatter={formatK}
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                {/* Right axis — Net Profit line (own scale, can go negative) */}
                <YAxis
                  yAxisId="profit"
                  orientation="right"
                  tickFormatter={formatK}
                  tick={{ fontSize: 11, fill: "#10b981" }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-border-light)", opacity: 0.5 }} />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
                  formatter={(value) => <span style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>{value}</span>}
                />
                <ReferenceLine yAxisId="profit" y={0} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1} strokeOpacity={0.5} />
                <Bar yAxisId="bars" dataKey="income"  name="Income"  fill="url(#incomeBarGrad)" radius={[5, 5, 0, 0]} barSize={18} />
                <Bar yAxisId="bars" dataKey="expense" name="Expense" fill="url(#expenseBarGrad)" radius={[5, 5, 0, 0]} barSize={18} />
                <Line
                  yAxisId="profit"
                  type="monotone"
                  dataKey="profit"
                  name="Net Profit"
                  strokeWidth={2.5}
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    const color = payload.profit >= 0 ? "#10b981" : "#ef4444";
                    return <circle key={cx} cx={cx} cy={cy} r={4} fill={color} stroke="#fff" strokeWidth={2} />;
                  }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
                  stroke="#10b981"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Modal
        open={chartGuide}
        onCancel={() => setChartGuide(false)}
        footer={null}
        title={
          <section style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <InfoCircleOutlined style={{ color: "#7c5cfc" }} />
            <span>How to Read the Financial Chart</span>
          </section>
        }
        width={520}
        destroyOnClose
      >
        <section style={{ fontSize: 13, color: "var(--color-text)", lineHeight: 1.7, maxHeight: 420, overflowY: "auto", paddingRight: 4 }}>

          {/* Axes */}
          <p style={{ fontWeight: 700, marginBottom: 8, marginTop: 4, color: "var(--color-text)" }}>Axes</p>
          <section style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            <section style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ minWidth: 100, fontWeight: 600, color: "#94a3b8", fontSize: 12 }}>Left Side (Y)</span>
              <span style={{ color: "var(--color-text-secondary)" }}>Income &amp; Expense amounts in Rs — matches the purple and red bars. Higher bars = more money in/out that month.</span>
            </section>
            <section style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ minWidth: 100, fontWeight: 600, color: "#10b981", fontSize: 12 }}>Right Side (Y)</span>
              <span style={{ color: "var(--color-text-secondary)" }}>Net Profit scale in Rs — matches the green line only. Can show negative values (loss). Has its own scale independent of the bars.</span>
            </section>
            <section style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ minWidth: 100, fontWeight: 600, color: "#94a3b8", fontSize: 12 }}>Bottom (X)</span>
              <span style={{ color: "var(--color-text-secondary)" }}>Months — each column represents one month of data.</span>
            </section>
          </section>

          <div style={{ borderTop: "1px solid var(--color-border-light)", margin: "12px 0" }} />

          {/* Elements */}
          <p style={{ fontWeight: 700, marginBottom: 8, color: "var(--color-text)" }}>Chart Elements</p>
          <section style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            <section style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ minWidth: 16, height: 16, borderRadius: 3, background: "#7c5cfc", display: "inline-block", flexShrink: 0, marginTop: 2 }} />
              <span style={{ color: "var(--color-text-secondary)" }}><strong style={{ color: "var(--color-text)" }}>Purple bar</strong> — Total Income for that month (sales, payments received). Read value on the <strong>left axis</strong>.</span>
            </section>
            <section style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ minWidth: 16, height: 16, borderRadius: 3, background: "#ef4444", display: "inline-block", flexShrink: 0, marginTop: 2 }} />
              <span style={{ color: "var(--color-text-secondary)" }}><strong style={{ color: "var(--color-text)" }}>Red bar</strong> — Total Expenses for that month (purchases, payments made). Read value on the <strong>left axis</strong>.</span>
            </section>
            <section style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <svg width="32" height="16" style={{ flexShrink: 0, marginTop: 2 }}>
                <line x1="0" y1="8" x2="32" y2="8" stroke="#10b981" strokeWidth="2.5" />
                <circle cx="16" cy="8" r="4" fill="#10b981" stroke="#fff" strokeWidth="2" />
              </svg>
              <span style={{ color: "var(--color-text-secondary)" }}><strong style={{ color: "var(--color-text)" }}>Green solid line</strong> — Net Profit trend (Income − Expense). Read value on the <strong>right axis</strong>. Green dot = profit month, Red dot = loss month.</span>
            </section>
            <section style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <svg width="32" height="16" style={{ flexShrink: 0, marginTop: 2 }}>
                <line x1="0" y1="8" x2="32" y2="8" stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.7" />
              </svg>
              <span style={{ color: "var(--color-text-secondary)" }}><strong style={{ color: "var(--color-text)" }}>Green dotted line</strong> — Zero profit baseline. When the green line is <strong>above</strong> this, you are in profit. When <strong>below</strong>, you are in loss.</span>
            </section>
          </section>

          <div style={{ borderTop: "1px solid var(--color-border-light)", margin: "12px 0" }} />

          {/* Summary row */}
          <p style={{ fontWeight: 700, marginBottom: 8, color: "var(--color-text)" }}>Header Summary (Top Right)</p>
          <section style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            <section style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ minWidth: 10, height: 10, borderRadius: "50%", background: "#7c5cfc", display: "inline-block", flexShrink: 0, marginTop: 3 }} />
              <span style={{ color: "var(--color-text-secondary)" }}><strong style={{ color: "var(--color-text)" }}>Income</strong> — Total income collected in the selected date range.</span>
            </section>
            <section style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ minWidth: 10, height: 10, borderRadius: "50%", background: "#ef4444", display: "inline-block", flexShrink: 0, marginTop: 3 }} />
              <span style={{ color: "var(--color-text-secondary)" }}><strong style={{ color: "var(--color-text)" }}>Expense</strong> — Total expenses paid in the selected date range.</span>
            </section>
            <section style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ minWidth: 10, height: 10, borderRadius: "50%", background: "#10b981", display: "inline-block", flexShrink: 0, marginTop: 3 }} />
              <span style={{ color: "var(--color-text-secondary)" }}><strong style={{ color: "var(--color-text)" }}>Net</strong> — Overall net profit (Income − Expense). Shows in red if total is a loss.</span>
            </section>
          </section>

          <div style={{ borderTop: "1px solid var(--color-border-light)", margin: "12px 0" }} />

          {/* Legend */}
          <p style={{ fontWeight: 700, marginBottom: 8, color: "var(--color-text)" }}>Legend (Bottom of Chart)</p>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: 16 }}>
            The three labels at the bottom — <strong style={{ color: "var(--color-text)" }}>Income</strong>, <strong style={{ color: "var(--color-text)" }}>Expense</strong>, <strong style={{ color: "var(--color-text)" }}>Net Profit</strong> — identify each element. They match the bar colors and the green line.
          </p>

          <div style={{ borderTop: "1px solid var(--color-border-light)", margin: "12px 0" }} />

          {/* Date filter */}
          <p style={{ fontWeight: 700, marginBottom: 8, color: "var(--color-text)" }}>Date Range Filter</p>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: 16 }}>
            The date picker at the top of the dashboard controls which period the chart shows. Change the range to zoom in on a specific period — the chart and all summary values update automatically.
          </p>

          <div style={{ borderTop: "1px solid var(--color-border-light)", margin: "12px 0" }} />

          {/* Tips */}
          <p style={{ fontWeight: 700, marginBottom: 8, color: "var(--color-text)" }}>Quick Tips</p>
          <ul style={{ paddingLeft: 18, margin: 0, color: "var(--color-text-secondary)", display: "flex", flexDirection: "column", gap: 4 }}>
            <li>Hover over any bar or dot to see exact Rs values in a tooltip.</li>
            <li>If the purple (Income) bar is much taller than the red (Expense) bar, that month had strong profit.</li>
            <li>A red dot on the green line means expenses exceeded income that month.</li>
            <li>The green line going below the dotted baseline signals a loss month — investigate expenses.</li>
            <li>Left and right axes have different scales — do not compare their numbers directly.</li>
          </ul>

        </section>
      </Modal>

      {/* Financial Insights Modal */}
      {insightsOpen && (() => {
        const hasData      = enrichedChartData.length > 0;
        const bestIncome   = hasData ? enrichedChartData.reduce((a, b) => b.income  > a.income  ? b : a) : null;
        const bestExpense  = hasData ? enrichedChartData.reduce((a, b) => b.expense > a.expense ? b : a) : null;
        const bestProfit   = hasData ? enrichedChartData.reduce((a, b) => b.profit  > a.profit  ? b : a) : null;
        const worstProfit  = hasData ? enrichedChartData.reduce((a, b) => b.profit  < a.profit  ? b : a) : null;
        const profitMonths = enrichedChartData.filter(d => d.profit > 0).length;
        const lossMonths   = enrichedChartData.filter(d => d.profit < 0).length;
        const avgIncome    = hasData ? totalIncome  / enrichedChartData.length : 0;
        const avgExpense   = hasData ? totalExpense / enrichedChartData.length : 0;
        const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0;
        const last2        = enrichedChartData.slice(-2);
        const trend        = last2.length === 2
          ? last2[1].profit > last2[0].profit ? "improving" : last2[1].profit < last2[0].profit ? "declining" : "stable"
          : null;

        return (
          <Modal
            open
            onCancel={() => setInsightsOpen(false)}
            footer={null}
            title={<section style={{ display: "flex", alignItems: "center", gap: 8 }}><FundOutlined style={{ color: "#7c5cfc" }} /><span>Financial Insights</span></section>}
            width={500}
            destroyOnClose
          >
            {!hasData ? (
              <p style={{ color: "var(--color-text-secondary)", textAlign: "center", padding: "32px 0" }}>No data available for the selected period.</p>
            ) : (
              <section style={{ maxHeight: 440, overflowY: "auto", paddingRight: 4 }}>

                <p style={{ fontWeight: 700, fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Period Summary</p>
                <InsightRow label="Total Income"        value={formatCurrency(totalIncome)}  color="#7c5cfc" />
                <InsightRow label="Total Expenses"      value={formatCurrency(totalExpense)} color="#ef4444" />
                <InsightRow label="Net Profit"          value={formatCurrency(Math.abs(netProfit))} color={netProfit >= 0 ? "#10b981" : "#ef4444"} sub={netProfit < 0 ? "Overall Loss" : "Overall Profit"} />
                <InsightRow label="Profit Margin"       value={`${profitMargin}%`} color={Number(profitMargin) >= 0 ? "#10b981" : "#ef4444"} />
                <InsightRow label="Avg Monthly Income"  value={formatCurrency(avgIncome)} />
                <InsightRow label="Avg Monthly Expense" value={formatCurrency(avgExpense)} />

                <p style={{ fontWeight: 700, fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 16 }}>Monthly Highlights</p>
                <InsightRow label="Best Income Month"     value={formatCurrency(bestIncome.income)}   sub={bestIncome.month}  color="#7c5cfc" />
                <InsightRow label="Highest Expense Month" value={formatCurrency(bestExpense.expense)} sub={bestExpense.month} color="#ef4444" />
                <InsightRow label="Best Profit Month"     value={formatCurrency(bestProfit.profit)}   sub={bestProfit.month}  color="#10b981" />
                {worstProfit.profit < 0 && (
                  <InsightRow label="Biggest Loss Month" value={formatCurrency(Math.abs(worstProfit.profit))} sub={worstProfit.month} color="#ef4444" />
                )}

                <p style={{ fontWeight: 700, fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 16 }}>Performance</p>
                <InsightRow label="Profitable Months" value={`${profitMonths} of ${enrichedChartData.length}`} color="#10b981" />
                {lossMonths > 0 && <InsightRow label="Loss Months" value={`${lossMonths} of ${enrichedChartData.length}`} color="#ef4444" />}
                {trend && (
                  <InsightRow
                    label="Recent Trend"
                    value={trend === "improving" ? "↑ Improving" : trend === "declining" ? "↓ Declining" : "→ Stable"}
                    color={trend === "improving" ? "#10b981" : trend === "declining" ? "#ef4444" : "#94a3b8"}
                    sub="Based on last 2 months"
                  />
                )}

                <p style={{ fontWeight: 700, fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 16 }}>Month-by-Month Breakdown</p>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
                      <th style={{ textAlign: "left",  padding: "6px 4px", color: "var(--color-text-secondary)", fontWeight: 600 }}>Month</th>
                      <th style={{ textAlign: "right", padding: "6px 4px", color: "#7c5cfc", fontWeight: 600 }}>Income</th>
                      <th style={{ textAlign: "right", padding: "6px 4px", color: "#ef4444", fontWeight: 600 }}>Expense</th>
                      <th style={{ textAlign: "right", padding: "6px 4px", color: "#10b981", fontWeight: 600 }}>Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrichedChartData.map((d, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                        <td style={{ padding: "7px 4px", color: "var(--color-text)", fontWeight: 500 }}>{d.month}</td>
                        <td style={{ padding: "7px 4px", textAlign: "right", color: "#7c5cfc", fontWeight: 600 }}>{formatCurrency(d.income)}</td>
                        <td style={{ padding: "7px 4px", textAlign: "right", color: "#ef4444", fontWeight: 600 }}>{formatCurrency(d.expense)}</td>
                        <td style={{ padding: "7px 4px", textAlign: "right", fontWeight: 700, color: d.profit >= 0 ? "#10b981" : "#ef4444" }}>
                          {d.profit < 0 ? "-" : ""}{formatCurrency(Math.abs(d.profit))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: "2px solid var(--color-border)" }}>
                      <td style={{ padding: "7px 4px", fontWeight: 700, color: "var(--color-text)", fontSize: 12 }}>Total</td>
                      <td style={{ padding: "7px 4px", textAlign: "right", fontWeight: 700, color: "#7c5cfc" }}>{formatCurrency(totalIncome)}</td>
                      <td style={{ padding: "7px 4px", textAlign: "right", fontWeight: 700, color: "#ef4444" }}>{formatCurrency(totalExpense)}</td>
                      <td style={{ padding: "7px 4px", textAlign: "right", fontWeight: 700, color: netProfit >= 0 ? "#10b981" : "#ef4444" }}>
                        {netProfit < 0 ? "-" : ""}{formatCurrency(Math.abs(netProfit))}
                      </td>
                    </tr>
                  </tfoot>
                </table>

              </section>
            )}
          </Modal>
        );
      })()}

    </section>
  );
};

export default Dashboard;
