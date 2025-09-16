"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPrefillPdf = buildPrefillPdf;
const pdf_lib_1 = require("pdf-lib");
async function buildPrefillPdf(fields) {
    const doc = await pdf_lib_1.PDFDocument.create();
    const page = doc.addPage([595, 842]); // A4
    const font = await doc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
    const title = fields.title ?? "GTC Convention";
    page.drawText(title, { x: 50, y: 780, size: 22, font, color: (0, pdf_lib_1.rgb)(0, 0, 0) });
    let y = 740;
    const drawLine = (label, value) => {
        page.drawText(label, { x: 50, y, size: 12, font });
        page.drawText(value ?? "", { x: 200, y, size: 12, font });
        y -= 24;
    };
    drawLine("Applicant Name:", fields.applicantName ?? "");
    drawLine("GTC Point:", fields.pointName ?? "");
    drawLine("Date:", new Date().toISOString().split("T")[0]);
    // signature box
    page.drawRectangle({ x: 50, y: 620, width: 220, height: 50, borderColor: (0, pdf_lib_1.rgb)(0, 0, 0), borderWidth: 1 });
    page.drawText("Signature (after print & sign):", { x: 55, y: 675, size: 10, font });
    const bytes = await doc.save();
    return Buffer.from(bytes);
}
