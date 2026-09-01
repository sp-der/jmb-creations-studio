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

async function loadLogo() {
  try {
    const response = await fetch("/logo.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
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

export async function downloadInvoicePdf(input: { invoice: JmbInvoice; lines: InvoicePdfLine[] }) {
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

  function drawContinuationHeader() {
    setFill(COLORS.pale);
    doc.rect(0, 0, pageWidth, 58, "F");
    setText(COLORS.plum);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("JMB 2 CREATIONS", margin, 35);
    setText(COLORS.ink);
    doc.text(code, pageWidth - margin, 35, { align: "right" });
  }

  setFill(COLORS.blush);
  doc.rect(0, 0, pageWidth * 0.55, 112, "F");
  setFill(COLORS.lavender);
  doc.rect(pageWidth * 0.55, 0, pageWidth * 0.45, 112, "F");
  if (logo) doc.addImage(logo, "PNG", margin, 22, 105, 68, undefined, "FAST");
  else {
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

  for (const line of input.lines) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const description = doc.splitTextToSize(
      line.description || line.line_type,
      contentWidth - 180,
    ) as string[];
    const rowHeight = Math.max(48, 29 + description.length * 12);
    if (y + rowHeight > pageHeight - 118) {
      doc.addPage();
      drawContinuationHeader();
      y = 80;
      drawTableHeader();
    }
    setDraw(COLORS.border);
    doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
    setText(COLORS.ink);
    doc.text(description, margin + 12, y + 18);
    setText(COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      `${line.line_type}  •  ${money(line.unit_price)} each`,
      margin + 12,
      y + rowHeight - 11,
    );
    setText(COLORS.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(String(line.quantity), pageWidth - margin - 112, y + 22, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.text(money(line.line_total), pageWidth - margin - 12, y + 22, { align: "right" });
    y += rowHeight;
  }

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
  const requiredHeight = 94 + (notesLines.length ? 42 + notesLines.length * 11 : 0);
  if (y + requiredHeight > pageHeight - 55) {
    doc.addPage();
    drawContinuationHeader();
    y = 82;
  }

  y += 20;
  const summaryX = pageWidth - margin - 220;
  doc.setFontSize(10);
  for (const [label, value] of summaryRows) {
    setText(COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.text(label, summaryX, y);
    setText(COLORS.ink);
    doc.setFont("helvetica", "bold");
    doc.text(value, pageWidth - margin, y, { align: "right" });
    y += 19;
  }
  setDraw(COLORS.border);
  doc.line(summaryX, y, pageWidth - margin, y);
  y += 22;
  setText(COLORS.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Total", summaryX, y);
  doc.text(money(input.invoice.total), pageWidth - margin, y, { align: "right" });

  if (notesLines.length) {
    y += 28;
    const noteHeight = 27 + notesLines.length * 11;
    setFill(COLORS.pale);
    doc.roundedRect(margin, y, contentWidth, noteHeight, 8, 8, "F");
    setText(COLORS.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("NOTES", margin + 12, y + 17);
    setText(COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.text(notesLines, margin + 12, y + 32);
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    setText(COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Thank you for supporting JMB 2 Creations.", margin, pageHeight - 28);
    doc.text(`Page ${page} of ${pages}`, pageWidth - margin, pageHeight - 28, { align: "right" });
  }

  const customer = safeFilePart(input.invoice.customer_name) || "Customer";
  const filename = `${code}-${customer}.pdf`;
  triggerPdfDownload(doc.output("blob"), filename);
  return filename;
}
