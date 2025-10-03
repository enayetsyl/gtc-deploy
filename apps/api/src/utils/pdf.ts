import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function buildPrefillPdf(fields: {
  title?: string;           // e.g. "GTC Convention"
  applicantName?: string;   // optional
  pointName?: string;       // optional
  sectorName?: string;      // optional
  services?: string[];      // optional list of service names
}) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const title = fields.title ?? "Convenzione GTC";
  page.drawText(title, { x: 50, y: 780, size: 22, font, color: rgb(0, 0, 0) });

  let y = 740;
  const drawLine = (label: string, value?: string) => {
    page.drawText(label, { x: 50, y, size: 12, font });
    page.drawText(value ?? "", { x: 200, y, size: 12, font });
    y -= 24;
  };

  drawLine("Nome richiedente:", fields.applicantName ?? "");
  drawLine("Punto GTC:", fields.pointName ?? "");
  drawLine("Settore:", fields.sectorName ?? "");
  if (fields.services && fields.services.length) {
    page.drawText("Servizi:", { x: 50, y, size: 12, font });
    let sx = 200;
    for (const s of fields.services) {
      page.drawText(s, { x: sx, y, size: 12, font });
      sx += 100;
      // wrap line if needed
      if (sx > 480) {
        sx = 200;
        y -= 18;
      }
    }
    y -= 24;
  }
  drawLine("Data:", new Date().toISOString().split("T")[0]);

  // signature label then box (placed below the date)
  page.drawText("Firma (dopo stampa & firma):", { x: 50, y, size: 10, font });
  // move down and draw signature rectangle
  y -= 16;
  page.drawRectangle({ x: 50, y: y - 50, width: 220, height: 50, borderColor: rgb(0, 0, 0), borderWidth: 1 });
  y -= 60;

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
