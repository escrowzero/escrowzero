import { useEffect, useLayoutEffect, useRef } from "react";

const COLS = 61;
const ROWS = 29;
const ASP = 1.8;
const R0 = 2;
const R1 = 26;
const C0 = 4;
const C1 = 56;
const IW = C1 - C0 + 1;
const CY = 14;
const RR = 7;
const TAU = Math.PI * 2;
const TH = -Math.PI / 2;

const STATUS: Record<string, string> = {
  locked: "Locked.",
  unbolt: "Bolts retracting...",
  swing: "Door moving...",
  open: "Open.",
  closing: "Closing...",
  rebolt: "Locking bolts...",
};

const BUTTON: Record<string, string> = {
  locked: "Open vault",
  open: "Close vault",
};

type Mode = "locked" | "unbolt" | "swing" | "open" | "closing" | "rebolt";

function ease(x: number) {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x * x * (3 - 2 * x);
}

function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}

function hash(a: number, b: number, s: number) {
  const x = Math.sin(a * 12.9898 + b * 78.233 + s * 37.719) * 43758.5453;
  return x - Math.floor(x);
}

export function VaultAscii() {
  const preRef = useRef<HTMLPreElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const statRef = useRef<HTMLParagraphElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const htmlRef = useRef("");
  const toggleRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    if (preRef.current && htmlRef.current) preRef.current.innerHTML = htmlRef.current;
  });

  useEffect(() => {
    const pre = preRef.current;
    const stage = stageRef.current;
    const statEl = statRef.current;
    const tog = btnRef.current;
    if (!pre || !stage || !statEl || !tog) return;

    const reduce = false;
    const state = { mode: "locked" as Mode, bolt: 0, f: 1, t: 0 };
    const spot = { x: COLS / 2, y: ROWS / 2, str: 0.55, target: 0.55, has: false, tx: COLS / 2, ty: ROWS / 2 };
    const ripples: { x: number; y: number; t0: number }[] = [];
    let last = performance.now();
    let raf = 0;
    let alive = true;

    const setMode = (mode: Mode) => {
      state.mode = mode;
      state.t = 0;
      tog.textContent = BUTTON[mode] || tog.textContent || "";
      tog.disabled = !(mode === "locked" || mode === "open");
      statEl.textContent = STATUS[mode];
    };

    const render = (now: number) => {
      const seed = Math.floor(now / 160);
      const g: string[][] = [];
      const w: number[][] = [];
      const body: boolean[][] = [];
      for (let r = 0; r < ROWS; r++) {
        g.push(Array(COLS).fill("#"));
        w.push(Array(COLS).fill(0.1));
        body.push(Array(COLS).fill(false));
      }
      const put = (x: number, y: number, ch: string, wt = 0, b = false) => {
        const cx = Math.round(x);
        const cy = Math.round(y);
        if (cy < 0 || cy >= ROWS || cx < 0 || cx >= COLS) return;
        g[cy][cx] = ch;
        w[cy][cx] = wt;
        body[cy][cx] = b;
      };
      for (let r = 1; r <= 27; r++) {
        for (let c = 2; c <= 58; c++) {
          g[r][c] = " ";
          w[r][c] = 0;
        }
      }
      for (let c = 2; c <= 58; c++) {
        g[1][c] = "=";
        g[27][c] = "=";
        w[1][c] = 0.05;
        w[27][c] = 0.05;
      }
      for (let r = 1; r <= 27; r++) {
        g[r][2] = "|";
        g[r][58] = "|";
        w[r][2] = 0.05;
        w[r][58] = 0.05;
      }
      g[1][2] = "+";
      g[1][58] = "+";
      g[27][2] = "+";
      g[27][58] = "+";

      const bolts = [6, 10, 14, 18, 22];
      bolts.forEach((y) => put(59, y, ":", 0.1));
      const width = Math.max(2, Math.round(IW * state.f));
      const open = state.mode === "open";
      for (let r = R0; r <= R1; r++) {
        for (let c = C0 + width; c <= C1; c++) {
          const i = c - C0;
          let ch = " ";
          let wt = 0;
          if (r === 19) {
            ch = "=";
            wt = 0.15;
          } else if (r >= 20 && r <= 25) {
            ch = "[$$$]"[(i + (r % 2) * 3) % 5];
            wt = 0.12;
            if (!reduce && ch === "$" && hash(r, c, seed) < 0.03) {
              ch = "*";
              wt = 0.3;
            }
          } else if (r < 19 && !reduce && hash(r, c, seed) < 0.014) {
            ch = ".*+'"[Math.floor(hash(c, r, seed + 3) * 4)];
            wt = 0.3;
          }
          put(c, r, ch, wt + (open ? 0.1 : 0));
        }
        for (let c = C0; c < C0 + width; c++) {
          const hatch = (c + r) % 4 === 0 ? ":" : "·";
          put(c, r, hatch, 0.42, true);
        }
      }
      for (let c = C0; c < C0 + width; c++) {
        put(c, R0, "=", 0.05);
        put(c, R1, "=", 0.05);
      }
      for (let r = R0; r <= R1; r++) {
        put(C0, r, "|", 0.05);
        put(C0 + width - 1, r, "|", 0.05);
      }
      if (width > 24) {
        put(C0 + 2, R0 + 2, "o", 0.1);
        put(C0 + width - 3, R0 + 2, "o", 0.1);
        put(C0 + 2, R1 - 2, "o", 0.1);
        put(C0 + width - 3, R1 - 2, "o", 0.1);
        for (let c = C0 + 4; c <= C0 + width - 5; c++) {
          put(c, R0 + 3, "-", 0.05);
          put(c, R1 - 3, "-", 0.05);
        }
        for (let r = R0 + 3; r <= R1 - 3; r++) {
          put(C0 + 4, r, "|", 0.05);
          put(C0 + width - 5, r, "|", 0.05);
        }
      }
      if (state.f > 0.98) {
        const len = Math.round(3 * (1 - state.bolt));
        bolts.forEach((y) => {
          for (let k = 0; k < len; k++) put(C1 + 1 + k, y, "=", 0.2);
        });
      }
      if (state.f > 0.5) {
        const cx = C0 + (width - 1) / 2;
        const sx = ASP * state.f;
        put(cx, CY - RR - 3, "v", 0.3);
        for (let a = 0; a < TAU; a += 0.07) put(cx + RR * sx * Math.cos(a), CY + RR * Math.sin(a), "o", 0.25);
        for (let k = 0; k < 12; k++) {
          const a = TH + (k * TAU) / 12;
          put(cx + (RR + 1.8) * sx * Math.cos(a), CY + (RR + 1.8) * Math.sin(a), k === 0 ? "#" : "+", 0.2);
        }
        for (let s = 0; s < 3; s++) {
          const a = TH + (s * TAU) / 3;
          for (let t = 0.12; t <= 1; t += 0.05) {
            put(cx + t * (RR - 1) * sx * Math.cos(a), CY + t * (RR - 1) * Math.sin(a), "#", 0.2);
          }
          put(cx + (RR - 1) * sx * Math.cos(a), CY + (RR - 1) * Math.sin(a), "O", 0.28);
        }
        put(cx - 1, CY, "(", 0.3);
        put(cx, CY, "@", 0.3);
        put(cx + 1, CY, ")", 0.3);
      }

      const out: string[] = [];
      const radius = 7.5;
      for (let r = 0; r < ROWS; r++) {
        let line = "";
        let cur = -1;
        let buf = "";
        const base = 0.14 + 0.5 * (r / (ROWS - 1));
        for (let c = 0; c < COLS; c++) {
          let ch = g[r][c];
          const d = Math.hypot((c - spot.x) / ASP, r - spot.y);
          let shine = d < radius ? (1 - d / radius) ** 2 * 0.75 * spot.str : 0;
          for (const ripple of ripples) {
            const age = (now - ripple.t0) / 1000;
            const rd = Math.hypot((c - ripple.x) / ASP, r - ripple.y);
            const df = Math.abs(rd - age * 17);
            if (df < 1.6) shine += 0.65 * (1 - age / 1.3) * (1 - df / 1.6);
          }
          if (body[r][c] && width > 20 && shine > 0.1 && ch === " ") {
            ch = (c + r) % 6 === 0 ? "/" : (c - r + 60) % 6 === 0 ? "\\" : " ";
            if (ch !== " ") shine += 0.12;
          }
          const shade = ch === " " ? cur : clamp(Math.round((base + w[r][c] + shine) * 9), 0, 9);
          const ink = "o#+@()|=Ov·:".includes(ch) && shade < 6 ? 6 : shade;
          if (ink !== cur) {
            if (buf) line += `<i class="c${cur}">${buf}</i>`;
            buf = "";
            cur = ink;
          }
          buf += ch;
        }
        line += `<i class="c${cur}">${buf}</i>`;
        out.push(line);
      }
      const html = out.join("\n");
      htmlRef.current = html;
      pre.innerHTML = html;
      pre.dataset.door = String(width);
    };

    const update = (dt: number, now: number) => {
      const mode = state.mode;
      if (mode === "unbolt") {
        state.t += dt / 0.6;
        state.bolt = ease(state.t);
        if (state.t >= 1) {
          state.bolt = 1;
          setMode("swing");
        }
      } else if (mode === "swing") {
        state.t += dt / 1.4;
        state.f = 1 - 0.88 * ease(state.t);
        if (state.t >= 1) {
          state.f = 0.12;
          setMode("open");
        }
      } else if (mode === "closing") {
        state.t += dt / 1.1;
        state.f = 0.12 + 0.88 * ease(state.t);
        if (state.t >= 1) {
          state.f = 1;
          setMode("rebolt");
        }
      } else if (mode === "rebolt") {
        state.t += dt / 0.5;
        state.bolt = 1 - ease(state.t);
        if (state.t >= 1) {
          state.bolt = 0;
          setMode("locked");
        }
      }
      if (!spot.has) {
        spot.tx = COLS / 2 + Math.sin(now / 1900) * 20;
        spot.ty = ROWS / 2 + Math.cos(now / 1300) * 8;
        spot.target = 0.55;
      }
      const k = 1 - 0.0005 ** dt;
      spot.x += (spot.tx - spot.x) * k;
      spot.y += (spot.ty - spot.y) * k;
      spot.str += (spot.target - spot.str) * k;
      for (let i = ripples.length - 1; i >= 0; i--) {
        if (now - ripples[i].t0 >= 1300) ripples.splice(i, 1);
      }
    };

    const frame = (now: number) => {
      if (!alive) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      update(dt, now);
      render(now);
      raf = requestAnimationFrame(frame);
    };

    const toGrid = (event: PointerEvent) => {
      const box = pre.getBoundingClientRect();
      return {
        c: ((event.clientX - box.left) / box.width) * COLS,
        r: ((event.clientY - box.top) / box.height) * ROWS,
      };
    };

    const toggle = () => {
      if (state.mode === "locked") setMode("unbolt");
      else if (state.mode === "open") setMode("closing");
    };
    toggleRef.current = () => {
      ripples.push({ x: COLS / 2, y: CY, t0: performance.now() });
      toggle();
    };

    const onMove = (event: PointerEvent) => {
      const point = toGrid(event);
      spot.has = true;
      spot.tx = point.c;
      spot.ty = point.r;
      spot.target = 1;
    };
    const onLeave = () => {
      spot.has = false;
    };
    const onDown = (event: PointerEvent) => {
      const point = toGrid(event);
      spot.has = true;
      spot.tx = point.c;
      spot.ty = point.r;
      spot.target = 1;
      ripples.push({ x: point.c, y: point.r, t0: performance.now() });
      toggle();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        ripples.push({ x: COLS / 2, y: CY, t0: performance.now() });
        toggle();
      }
    };

    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    pre.addEventListener("pointerdown", onDown);
    stage.addEventListener("keydown", onKey);
    setMode("locked");
    render(performance.now());
    raf = requestAnimationFrame(frame);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      pre.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="vault-ascii bg-[#101916] px-3 py-5 text-center text-[#d7f5e4]">
      <h3 className="font-mono text-[18px] font-semibold tracking-wide">VAULT/0</h3>
      <p className="mx-auto mt-1 max-w-[46ch] text-[12px] leading-5 text-[#4d7a60]">
        Move the cursor to light the vault face. Click to open or close the door.
      </p>
      <div
        ref={stageRef}
        tabIndex={0}
        role="button"
        aria-label="Vault. Press Enter or Space to open or close the door."
        className="mx-auto mt-3 flex w-full justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#82f5ad]"
        style={{ containerType: "inline-size" }}
      >
        <pre
          ref={preRef}
          aria-hidden="true"
          className="m-0 cursor-pointer whitespace-pre text-left font-mono font-semibold leading-[1.1] tracking-normal select-none"
          style={{ fontSize: "clamp(6px, calc(100cqi / 38), 15px)" }}
        />
      </div>
      <p ref={statRef} className="mt-3 min-h-5 text-center font-mono text-[12px] text-[#4d7a60]" aria-live="polite">
        Locked.
      </p>
      <button
        ref={btnRef}
        type="button"
        onClick={() => toggleRef.current()}
        className="mx-auto mt-1 block border border-[#82f5ad]/40 bg-[#07110c] px-4 py-2 font-mono text-[13px] text-[#d7f5e4] hover:bg-[#82f5ad] hover:text-[#07110c] disabled:cursor-default disabled:opacity-60"
      >
        Open vault
      </button>
      <p className="mx-auto mt-4 max-w-[48ch] text-[12px] leading-5 text-[#4d7a60]">
        The highlight reveals engraving hidden in the door. Each click sends a wave from the cursor.
      </p>
      <style>{`
        .vault-ascii .c0{color:#163528}.vault-ascii .c1{color:#1e4a34}.vault-ascii .c2{color:#2a6244}
        .vault-ascii .c3{color:#3a7d56}.vault-ascii .c4{color:#4e9a6a}.vault-ascii .c5{color:#68b883}
        .vault-ascii .c6{color:#86d4a2}.vault-ascii .c7{color:#a8e8c0}.vault-ascii .c8{color:#cff6de}
        .vault-ascii .c9{color:#f3fff7}
        .vault-ascii i{font-style:normal}
      `}</style>
    </div>
  );
}
