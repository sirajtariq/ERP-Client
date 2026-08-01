import logoRaw from "@/assets/images/future-electric-logo.svg?raw";
import { getCompanyInfo } from "./companyInfoStore";

export const logoSvgString = (size = 50) => {
  const { logo } = getCompanyInfo();
  if (logo) {
    return `<img src="${logo}" width="${size}" height="${size}" style="object-fit:contain;border-radius:8px;" alt="Company logo" />`;
  }
  return logoRaw
    .replace('width="600"', `width="${size}"`)
    .replace('height="600"', `height="${size}"`);
};
