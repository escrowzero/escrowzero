import { useEffect, useRef } from "react";

const QUIET = [" ", "·", "·", ":", "−"];
const LOUD = ["−", "=", "≡", "#", "•"];

export function AsciiField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const frame = canvas?.parentElement;
    if (!canvas || !frame) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const pointer = { x: -9999, y: -9999, on: false };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let running = true;

    const onMove = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      pointer.x = event.clientX - box.left;
      pointer.y = event.clientY - box.top;
      pointer.on = pointer.x >= 0 && pointer.y >= 0 && pointer.x <= box.width && pointer.y <= box.height;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const draw = (now: number) => {
      if (!running) return;
      const viewW = window.innerWidth;
      const viewH = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pw = Math.floor(viewW * dpr);
      const ph = Math.floor(viewH * dpr);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }

      const page = frame.getBoundingClientRect();
      const shift = Math.max(0, -page.top);
      canvas.style.transform = `translate3d(0, ${shift}px, 0)`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#07110c";
      ctx.fillRect(0, 0, viewW, viewH);

      const cell = viewW < 640 ? 12 : 9;
      const cols = Math.ceil(viewW / cell);
      const rows = Math.ceil(viewH / cell);
      const time = reduce ? 1.4 : now * 0.00032;

      ctx.font = `${cell - 1}px "IBM Plex Mono", ui-monospace, monospace`;
      ctx.textBaseline = "top";
      ctx.fillStyle = "rgba(130, 245, 173, 0.28)";

      for (let y = 0; y < rows; y++) {
        const band = Math.sin(y * 0.62 + time * 1.7) * 0.5 + Math.sin(y * 0.19 - time * 0.6) * 0.5;
        const rowLift = band * 0.5 + 0.5;
        for (let x = 0; x < cols; x++) {
          const wave =
            Math.sin(x * 0.085 + y * 0.28 + time * 1.35) * 0.55 +
            Math.sin(x * 0.018 - time * 0.7 + band * 3.1) * 0.45;
          const density = wave * 0.5 + 0.5;
          const ink = density * 0.55 + rowLift * 0.45;
          if (ink < 0.46) continue;
          const glyph = QUIET[ink > 0.78 ? 4 : ink > 0.66 ? 3 : ink > 0.56 ? 2 : 1];
          ctx.fillText(glyph, x * cell, y * cell);
        }
      }

      const driftX = viewW * (0.5 + Math.sin(time * 0.45) * 0.28);
      const driftY = viewH * (0.42 + Math.cos(time * 0.33) * 0.22);
      const spots = pointer.on
        ? [{ x: pointer.x, y: pointer.y, radius: 190 }]
        : [{ x: driftX, y: driftY, radius: 170 }];

      for (const spot of spots) {
        const r2 = spot.radius * spot.radius;
        const minX = Math.max(0, Math.floor((spot.x - spot.radius) / cell));
        const maxX = Math.min(cols - 1, Math.ceil((spot.x + spot.radius) / cell));
        const minY = Math.max(0, Math.floor((spot.y - spot.radius) / cell));
        const maxY = Math.min(rows - 1, Math.ceil((spot.y + spot.radius) / cell));
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const cx = x * cell + cell * 0.35;
            const cy = y * cell + cell * 0.35;
            const dx = cx - spot.x;
            const dy = cy - spot.y;
            const dist = dx * dx + dy * dy;
            if (dist > r2) continue;
            const fall = 1 - Math.sqrt(dist) / spot.radius;
            if (fall < 0.08) continue;
            ctx.fillStyle = fall > 0.45 ? "rgba(130, 245, 173, 0.95)" : "rgba(90, 196, 140, 0.62)";
            const wave = Math.sin(x * 0.22 + y * 0.4 + time * 2.4) * 0.5 + 0.5;
            const glyph = LOUD[fall > 0.72 ? 4 : fall > 0.48 ? 3 : wave > 0.45 ? 2 : 1];
            ctx.fillText(glyph, x * cell, y * cell);
          }
        }
      }

      if (!reduce) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#07110c]" aria-hidden>
      <canvas ref={ref} className="absolute left-0 top-0 h-screen w-full bg-[#07110c]" />
    </div>
  );
}
