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
import { dashboardCards, recentTransactions } from "@/mock/dashboard";
import { getCompanyInfo } from "@/utils/companyInfoStore";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency, formatDate } from "@/utils";
import styles from "./styles.module.css";

const monthlyData = [
  { month: "Jan", income: 420000, expense: 180000 },
  { month: "Feb", income: 380000, expense: 210000 },
  { month: "Mar", income: 510000, expense: 160000 },
  { month: "Apr", income: 470000, expense: 230000 },
  { month: "May", income: 620000, expense: 195000 },
  { month: "Jun", income: 580000, expense: 250000 },
  { month: "Jul", income: 540000, expense: 175000 },
];

const CARD_ICONS = {
  1: <ShoppingCartOutlined />,
  2: <WalletOutlined />,
  3: <CreditCardOutlined />,
  4: <ClockCircleOutlined />,
  5: <FallOutlined />,
  6: <RiseOutlined />,
  7: <ShopOutlined />,
  8: <CheckCircleOutlined />,
  9: <BankOutlined />,
};

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

// Derives a real (not fabricated) trend from the same monthly series shown in the chart below.
const calcTrend = (key) => {
  if (monthlyData.length < 2) return null;
  const last = monthlyData[monthlyData.length - 1];
  const prev = monthlyData[monthlyData.length - 2];
  const lastVal = key === "profit" ? last.income - last.expense : last[key];
  const prevVal = key === "profit" ? prev.income - prev.expense : prev[key];
  if (!prevVal) return null;
  return ((lastVal - prevVal) / Math.abs(prevVal)) * 100;
};

const TREND_BY_ID = {
  1: calcTrend("income"),  // Total Sales
  6: calcTrend("profit"),  // Profit
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
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const companyInfo = getCompanyInfo();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setTimeout(() => {
      setCards(dashboardCards);
      setLoading(false);
    }, 300);
  }, []);

  const heroCards = cards.filter((c) => HERO_IDS.includes(c.id));
  const gridCards = cards.filter((c) => !HERO_IDS.includes(c.id));
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
          const trend = TREND_BY_ID[card.id];
          return (
            <Col xs={24} sm={12} lg={8} key={card.id}>
              <section
                className={`${styles.heroCard} animate-fade-in-up`}
                style={{ animationDelay: `${index * 0.05}s`, "--accent": card.color, background: card.gradient }}
              >
                <span className={styles.heroIcon}>{CARD_ICONS[card.id]}</span>
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
              <span className={styles.kpiIcon}>{CARD_ICONS[card.id]}</span>
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
                <span className={styles.chartSubtitle}>Last 7 months</span>
              </span>
            }
            className={styles.chartCard}
          >
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
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
                <span className={styles.chartSubtitle}>Last 7 months</span>
              </span>
            }
            className={styles.chartCard}
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barSize={14} barGap={4}>
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
