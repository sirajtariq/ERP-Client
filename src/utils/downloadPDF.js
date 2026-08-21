export const downloadPDF = async (htmlString, filename = "document") => {
  const html2pdf = (await import("html2pdf.js")).default;

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");

  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:210mm;background:#fff;";

  const styleEl = document.createElement("style");
  styleEl.textContent = Array.from(doc.head.querySelectorAll("style"))
    .map((s) => s.textContent)
    .join("\n");
  wrapper.appendChild(styleEl);

  const content = document.createElement("div");
  content.innerHTML = doc.body.innerHTML;
  wrapper.appendChild(content);

  document.body.appendChild(wrapper);

  try {
    await html2pdf()
      .set({
        margin:     [8, 8, 8, 8],
        filename:   `${filename}.pdf`,
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF:       { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(wrapper)
      .save();
  } finally {
    document.body.removeChild(wrapper);
  }
};
