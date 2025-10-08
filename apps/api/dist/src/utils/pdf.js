"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPrefillPdf = buildPrefillPdf;
const pdf_lib_1 = require("pdf-lib");
async function buildPrefillPdf(fields) {
    const doc = await pdf_lib_1.PDFDocument.create();
    const page = doc.addPage([595, 842]); // A4
    const font = await doc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
    const title = fields.title ?? "Convenzione GTC";
    page.drawText(title, { x: 50, y: 780, size: 22, font, color: (0, pdf_lib_1.rgb)(0, 0, 0) });
    let y = 740;
    const drawLine = (label, value) => {
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
    const sigBoxX = 50;
    const sigBoxY = y - 50;
    const sigBoxW = 220;
    const sigBoxH = 50;
    page.drawRectangle({ x: sigBoxX, y: sigBoxY, width: sigBoxW, height: sigBoxH, borderColor: (0, pdf_lib_1.rgb)(0, 0, 0), borderWidth: 1 });
    // If a signature data URL is provided, embed it into the box area (scale to fit)
    if (fields.signatureDataUrl) {
        try {
            // expect data URL like: data:image/png;base64,....
            const m = /^data:image\/(png|jpeg);base64,(.+)$/.exec(fields.signatureDataUrl);
            if (m && m[2]) {
                const imgBytes = Buffer.from(m[2], "base64");
                const img = await doc.embedPng(imgBytes);
                const imgDims = img.scale(1);
                // compute scale to fit into box with padding
                const pad = 6;
                const maxW = sigBoxW - pad * 2;
                const maxH = sigBoxH - pad * 2;
                const scale = Math.min(maxW / imgDims.width, maxH / imgDims.height, 1);
                const drawW = imgDims.width * scale;
                const drawH = imgDims.height * scale;
                const drawX = sigBoxX + (sigBoxW - drawW) / 2;
                const drawY = sigBoxY + (sigBoxH - drawH) / 2;
                page.drawImage(img, { x: drawX, y: drawY, width: drawW, height: drawH });
            }
        }
        catch (e) {
            // embedding failed - continue without signature
            console.warn("Failed to embed signature image into PDF:", e);
        }
    }
    y -= 60;
    const bytes = await doc.save();
    return Buffer.from(bytes);
}
