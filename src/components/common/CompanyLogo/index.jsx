import defaultLogo from "@/assets/images/future-electric-logo.svg";
import { getCompanyInfo } from "@/utils/companyInfoStore";
import styles from "./styles.module.css";

const CompanyLogo = ({ size = 48 }) => {
  const { logo, name } = getCompanyInfo();
  return (
    <img
      src={logo || defaultLogo}
      alt={name || "Company logo"}
      className={`${styles.logo} logo`}
      style={{ height: size, width: "auto" }}
    />
  );
};

export default CompanyLogo;
