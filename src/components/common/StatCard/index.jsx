import { formatCurrency } from "@/utils";
import styles from "./styles.module.css";

const StatCard = ({
  title,
  value,
  subtitle,
  gradient,
  borderColor,
  variant = "gradient",
  delay = 0,
  className = "",
  isCurrency = true,
  children,
}) => {
  const cardClass = [
    styles.card,
    styles[variant],
    "animate-fade-in-up",
    className,
  ].filter(Boolean).join(" ");

  const cardStyle = {
    animationDelay: `${delay}s`,
    ...(variant === "gradient" && gradient ? { background: gradient } : {}),
    ...(variant === "bordered" && borderColor ? { borderLeftColor: borderColor } : {}),
  };

  return (
    <div className={cardClass} style={cardStyle}>
      <span className={styles.title}>{title}</span>
      <span className={styles.value}>
        {isCurrency ? formatCurrency(value) : value}
      </span>
      {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      {children}
      {variant === "gradient" && (
        <>
          <div className={styles.circle1} />
          <div className={styles.circle2} />
        </>
      )}
    </div>
  );
};

export default StatCard;
