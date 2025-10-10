/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from "react";
import html2canvas from "html2canvas";

// Declare module to avoid TypeScript errors when the package isn't installed yet
declare module "jspdf";

type Options = {
  filename?: string;
  orientation?: "portrait" | "landscape";
  unit?: "mm" | "pt" | "px" | "in";
  format?: string | [number, number];
};

export default function usePrintPdf(defaults?: Options) {
  const downloadPdf = useCallback(
    async (element: HTMLElement | null, opts?: Options) => {
      if (!element) throw new Error("No element provided to downloadPdf");
      const options = {
        orientation: "portrait",
        unit: "mm",
        filename: "document.pdf",
        ...defaults,
        ...opts,
      } as Options;
      // Clone the node to avoid mutating the live DOM and to sanitize styles
      const cloned = element.cloneNode(true) as HTMLElement;
      // Stronger sanitization: inject a safe stylesheet to avoid unsupported CSS (oklch) and heavy effects
      const safeStyle = document.createElement("style");
      safeStyle.innerHTML = `
        *, *::before, *::after {
          background-image: none !important;
          background: transparent !important;
          box-shadow: none !important;
          filter: none !important;
          -webkit-filter: none !important;
          text-shadow: none !important;
        }
        html, body { background: #ffffff !important; }
        img { max-width: 100% !important; height: auto !important; image-rendering: -moz-crisp-edges !important; }
        [style*=\"oklch\"] { background: #ffffff !important; color: #111111 !important; }
      `;
      cloned.prepend(safeStyle);
      // Normalize images inside the clone: set crossOrigin and ensure they're loaded as same-origin when possible
      const imgs = Array.from(cloned.querySelectorAll<HTMLImageElement>("img"));
      await Promise.all(
        imgs.map(async (img) => {
          try {
            // set crossOrigin to anonymous to attempt CORS-enabled fetch
            img.setAttribute("crossorigin", "anonymous");
            // reload image to ensure crossOrigin takes effect
            const src = img.src;
            if (src) {
              await new Promise<void>((resolve) => {
                const testImg = new Image();
                testImg.crossOrigin = "anonymous";
                testImg.onload = () => resolve();
                testImg.onerror = () => resolve();
                testImg.src = src;
              });
            }
          } catch {
            // ignore image normalization failures
          }
        })
      );
      // place cloned off-screen to render without affecting layout
      cloned.style.position = "fixed";
      cloned.style.left = "-9999px";
      cloned.style.top = "-9999px";
      cloned.style.width = element.clientWidth + "px";
      document.body.appendChild(cloned);

      // Render element to canvas (tryCORS + allowTaint fallback)
      let canvas;
      try {
        canvas = await html2canvas(cloned, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
        });
      } catch (err) {
        // cleanup clone
        document.body.removeChild(cloned);
        console.error("usePrintPdf: html2canvas failed", err);
        throw new Error("Unable to render document to canvas: " + String(err));
      }
      // cleanup clone
      document.body.removeChild(cloned);
      const imgData = canvas.toDataURL("image/png");
      // Dynamically import jspdf so the build won't fail if the package isn't installed yet.
      let jsPdfModule: unknown = null;
      jsPdfModule = await import("jspdf").catch(() => null);
      if (!jsPdfModule) {
        throw new Error(
          "The 'jspdf' package is required to generate PDFs. Please install it in the workspace."
        );
      }
      // prefer named export, fallback to default
      const jsPDFAny: any =
        (jsPdfModule as any).jsPDF ||
        (jsPdfModule as any).default ||
        jsPdfModule;
      // A4 size in mm
      const pdf: any = new jsPDFAny({
        unit: options.unit,
        format: options.format || "a4",
        orientation: options.orientation,
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      // compute image size from canvas pixel dimensions and PDF units
      const pxPerUnit = canvas.width / (pageWidth as number);
      const imgWidth = pageWidth;
      const imgHeight = canvas.height / pxPerUnit;

      // If the content fits a single page, add directly. Otherwise split into multiple pages.
      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      } else {
        // Multi-page: slice the large canvas into page-sized strips
        const sliceHeightPx = Math.floor(pageHeight * pxPerUnit);
        let remainingHeight = canvas.height;
        let offsetY = 0;
        while (remainingHeight > 0) {
          const sliceH = Math.min(sliceHeightPx, remainingHeight);
          // create an offscreen canvas for the slice
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceH;
          const sctx = sliceCanvas.getContext("2d");
          if (!sctx)
            throw new Error("Unable to create canvas context for PDF slice");
          sctx.drawImage(
            canvas,
            0,
            offsetY,
            canvas.width,
            sliceH,
            0,
            0,
            canvas.width,
            sliceH
          );
          const sliceData = sliceCanvas.toDataURL("image/png");
          const sliceImgHeight = sliceH / pxPerUnit;
          pdf.addImage(sliceData, "PNG", 0, 0, imgWidth, sliceImgHeight);
          remainingHeight -= sliceH;
          offsetY += sliceH;
          if (remainingHeight > 0) pdf.addPage();
        }
      }
      pdf.save(options.filename);
    },
    [defaults]
  );

  return { downloadPdf };
}
