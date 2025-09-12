import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function buildPrefillPdf(fields: {
  title?: string;           // e.g. "GTC Convention"
  applicantName?: string;   // optional
  pointName?: string;       // optional
}) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const title = fields.title ?? "GTC Convention";
  page.drawText(title, { x: 50, y: 780, size: 22, font, color: rgb(0, 0, 0) });

  let y = 740;
  const drawLine = (label: string, value?: string) => {
    page.drawText(label, { x: 50, y, size: 12, font });
    page.drawText(value ?? "", { x: 200, y, size: 12, font });
    y -= 24;
  };

  drawLine("Applicant Name:", fields.applicantName ?? "");
  drawLine("GTC Point:", fields.pointName ?? "");
  drawLine("Date:", new Date().toISOString().split("T")[0]);

  // signature box
  page.drawRectangle({ x: 50, y: 620, width: 220, height: 50, borderColor: rgb(0,0,0), borderWidth: 1 });
  page.drawText("Signature (after print & sign):", { x: 55, y: 675, size: 10, font });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
