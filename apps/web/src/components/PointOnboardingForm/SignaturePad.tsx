"use client";
import React, { useRef, useEffect } from "react";

type Props = {
  width?: number;
  height?: number;
  value?: string; // dataURL
  onChange?: (dataUrl: string | null) => void;
};

export default function SignaturePad({
  width = 320,
  height = 120,
  value,
  onChange = () => {},
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#f0f6ff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // if there's a value (dataURL) draw it
    if (value) {
      const img = new Image();
      img.src = value;
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
  }, [value]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pointerDown = (e: PointerEvent) => {
      drawing.current = true;
      canvas.setPointerCapture(e.pointerId);
      ctx.beginPath();
      ctx.moveTo(e.offsetX, e.offsetY);
    };
    const pointerMove = (e: PointerEvent) => {
      if (!drawing.current) return;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#111827";
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.stroke();
      onChange(canvas.toDataURL("image/png"));
    };
    const pointerUp = (e: PointerEvent) => {
      drawing.current = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {}
      onChange(canvas.toDataURL("image/png"));
    };
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    window.addEventListener("pointerup", pointerUp);
    return () => {
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerup", pointerUp);
    };
  }, [onChange]);

  return (
    <div className="signature-pad" style={{ borderRadius: 6 }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          background: "#eef5ff",
          display: "block",
          touchAction: "none",
        }}
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="px-2 py-1 rounded bg-gray-200 text-sm"
          onClick={() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#f0f6ff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            onChange(null);
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
