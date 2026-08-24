export const downloadPDF = async (htmlString, filename = "document") => {
  const [h2cMod, jspdfMod] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  const html2canvas = h2cMod.default ?? h2cMod;
  const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default ?? jspdfMod;

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");

  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "position:fixed;top:0;left:0;width:794px;background:#fff;z-index:99999;font-family:Arial,sans-serif;color:#1e293b;font-size:12px;padding:28px;box-sizing:border-box;";

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
    const canvas = await html2canvas(wrapper, {
      scale: 1.5,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0,
      windowWidth: 794,
    });

    document.body.removeChild(wrapper);

    const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    // Full image scaled to page width, multi-page via Y offset
    const imgData  = canvas.toDataURL("image/jpeg", 0.85);
    const imgH     = (canvas.height * pageW) / canvas.width;
    let heightLeft = imgH;
    let yOffset    = 0;

    pdf.addImage(imgData, "JPEG", 0, yOffset, pageW, imgH, "", "FAST");
    heightLeft -= pageH;

    while (heightLeft > 0) {
      yOffset -= pageH;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, yOffset, pageW, imgH, "", "FAST");
      heightLeft -= pageH;
    }

    // Explicit anchor download (more reliable than pdf.save() in some browsers)
    const blob = new Blob([pdf.output("arraybuffer")], { type: "application/pdf" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
  } catch (err) {
    if (document.body.contains(wrapper)) document.body.removeChild(wrapper);
    throw err;
  }
};
