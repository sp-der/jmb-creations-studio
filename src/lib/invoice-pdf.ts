import type { JmbInvoice, JmbInvoiceLine } from "@/lib/invoices";

type InvoicePdfLine = Pick<
  JmbInvoiceLine,
  "line_type" | "description" | "quantity" | "unit_price" | "line_total"
>;

const COLORS = {
  blush: [249, 201, 208] as const,
  lavender: [220, 215, 244] as const,
  plum: [88, 90, 170] as const,
  ink: [41, 35, 63] as const,
  muted: [111, 102, 128] as const,
  border: [234, 221, 233] as const,
  pale: [250, 242, 247] as const,
};

const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) || 0);

const invoiceCode = (invoice: Pick<JmbInvoice, "invoice_number">) =>
  `INV-${String(invoice.invoice_number).padStart(4, "0")}`;

type LoadedLogo = {
  dataUrl: string;
  width: number;
  height: number;
};

async function loadLogo(): Promise<LoadedLogo | null> {
  try {
    const response = await fetch("/logo.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("The JMB logo could not be decoded."));
      image.src = dataUrl;
    });
    return { dataUrl, ...dimensions };
  } catch {
    return null;
  }
}

function safeFilePart(value: string) {
  return value
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function triggerPdfDownload(blob: Blob, filename: string) {
  if (typeof document === "undefined") throw new Error("PDF downloads require a browser.");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function buildInvoicePdf(input: { invoice: JmbInvoice; lines: InvoicePdfLine[] }) {
  const [{ jsPDF }, logo] = await Promise.all([import("jspdf"), loadLogo()]);
  const doc = new jsPDF({ unit: "pt", format: "letter", compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  const code = invoiceCode(input.invoice);

  const setText = (color: readonly [number, number, number]) => doc.setTextColor(...color);
  const setFill = (color: readonly [number, number, number]) => doc.setFillColor(...color);
  const setDraw = (color: readonly [number, number, number]) => doc.setDrawColor(...color);

  setFill(COLORS.blush);
  doc.rect(0, 0, pageWidth * 0.55, 112, "F");
  setFill(COLORS.lavender);
  doc.rect(pageWidth * 0.55, 0, pageWidth * 0.45, 112, "F");
  if (logo) {
    const maxWidth = 105;
    const maxHeight = 68;
    const scale = Math.min(maxWidth / logo.width, maxHeight / logo.height);
    const logoWidth = logo.width * scale;
    const logoHeight = logo.height * scale;
    doc.addImage(
      logo.dataUrl,
      "PNG",
      margin + (maxWidth - logoWidth) / 2,
      22 + (maxHeight - logoHeight) / 2,
      logoWidth,
      logoHeight,
      undefined,
      "FAST",
    );
  } else {
    setText(COLORS.plum);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text("JMB 2 CREATIONS", margin, 63);
  }
  setText(COLORS.plum);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("INVOICE", pageWidth - margin, 38, { align: "right" });
  setText(COLORS.ink);
  doc.setFontSize(24);
  doc.text(code, pageWidth - margin, 65, { align: "right" });
  setText(COLORS.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("JMB 2 Creations", pageWidth - margin, 83, { align: "right" });

  let y = 146;
  setText(COLORS.plum);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("BILL TO", margin, y);
  doc.text("CREATED", pageWidth - margin, y, { align: "right" });
  setText(COLORS.ink);
  doc.setFontSize(12);
  doc.text(input.invoice.customer_name, margin, y + 21);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setText(COLORS.muted);
  doc.text(input.invoice.customer_email, margin, y + 38);
  setText(COLORS.ink);
  doc.text(new Date(input.invoice.created_at).toLocaleDateString(), pageWidth - margin, y + 21, {
    align: "right",
  });

  y = 212;
  const drawTableHeader = () => {
    setFill(COLORS.pale);
    doc.roundedRect(margin, y, contentWidth, 30, 7, 7, "F");
    setText(COLORS.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("ITEM", margin + 12, y + 19);
    doc.text("QTY", pageWidth - margin - 112, y + 19, { align: "center" });
    doc.text("AMOUNT", pageWidth - margin - 12, y + 19, { align: "right" });
    y += 30;
  };
  drawTableHeader();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const preparedLines = input.lines.map((line) => {
    const description = doc.splitTextToSize(
      line.description || line.line_type,
      contentWidth - 180,
    ) as string[];
    return { line, description, baseHeight: Math.max(42, 26 + description.length * 11) };
  });

  const summaryRows = [
    ["Subtotal", money(input.invoice.subtotal)],
    ["Shipping", money(input.invoice.shipping_amount)],
    ["Tax", money(input.invoice.tax_amount)],
    ...(input.invoice.discount_amount > 0
      ? [["Discount", `-${money(input.invoice.discount_amount)}`]]
      : []),
  ];
  const notes = input.invoice.notes?.trim();
  const notesLines = notes ? (doc.splitTextToSize(notes, contentWidth - 24) as string[]) : [];
  const rowsBaseHeight = preparedLines.reduce((total, line) => total + line.baseHeight, 0);
  const summaryBaseHeight = 20 + summaryRows.length * 19 + 44;
  const notesBaseHeight = notesLines.length ? 36 + notesLines.length * 11 : 0;
  const footerTop = pageHeight - 50;
  const availableHeight = footerTop - y;
  const contentScale = Math.min(
    1,
    availableHeight / Math.max(1, rowsBaseHeight + summaryBaseHeight + notesBaseHeight),
  );

  for (const { line, description, baseHeight } of preparedLines) {
    const rowHeight = baseHeight * contentScale;
    setDraw(COLORS.border);
    doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
    setText(COLORS.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10 * contentScale);
    doc.text(description, margin + 12, y + 18 * contentScale);
    setText(COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8 * contentScale);
    doc.text(
      `${line.line_type}  •  ${money(line.unit_price)} each`,
      margin + 12,
      y + rowHeight - 9 * contentScale,
    );
    setText(COLORS.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10 * contentScale);
    doc.text(String(line.quantity), pageWidth - margin - 112, y + 18 * contentScale, {
      align: "center",
    });
    doc.setFont("helvetica", "bold");
    doc.text(money(line.line_total), pageWidth - margin - 12, y + 18 * contentScale, {
      align: "right",
    });
    y += rowHeight;
  }

  y += 20 * contentScale;
  const summaryX = pageWidth - margin - 220;
  doc.setFontSize(10 * contentScale);
  for (const [label, value] of summaryRows) {
    setText(COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.text(label, summaryX, y);
    setText(COLORS.ink);
    doc.setFont("helvetica", "bold");
    doc.text(value, pageWidth - margin, y, { align: "right" });
    y += 19 * contentScale;
  }
  setDraw(COLORS.border);
  doc.line(summaryX, y, pageWidth - margin, y);
  y += 22 * contentScale;
  setText(COLORS.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15 * contentScale);
  doc.text("Total", summaryX, y);
  doc.text(money(input.invoice.total), pageWidth - margin, y, { align: "right" });

  if (notesLines.length) {
    y += 28 * contentScale;
    const noteHeight = (27 + notesLines.length * 11) * contentScale;
    setFill(COLORS.pale);
    doc.roundedRect(margin, y, contentWidth, noteHeight, 8, 8, "F");
    setText(COLORS.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9 * contentScale);
    doc.text("NOTES", margin + 12, y + 17 * contentScale);
    setText(COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.text(notesLines, margin + 12, y + 32 * contentScale);
  }

  setText(COLORS.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Thank you for supporting JMB 2 Creations.", pageWidth / 2, pageHeight - 28, {
    align: "center",
  });

  const customer = safeFilePart(input.invoice.customer_name) || "Customer";
  const filename = `${code}-${customer}.pdf`;
  return { bytes: doc.output("arraybuffer"), filename };
}

export async function createInvoicePdfBytes(input: {
  invoice: JmbInvoice;
  lines: InvoicePdfLine[];
}) {
  return await buildInvoicePdf(input);
}

export async function downloadInvoicePdf(input: { invoice: JmbInvoice; lines: InvoicePdfLine[] }) {
  const { bytes, filename } = await buildInvoicePdf(input);
  triggerPdfDownload(new Blob([bytes], { type: "application/pdf" }), filename);
  return filename;
}
