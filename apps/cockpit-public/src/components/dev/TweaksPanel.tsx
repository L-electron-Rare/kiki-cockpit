// TweaksPanel.tsx — dev-only design-tweaks side panel.
// Loaded via React.lazy gated by import.meta.env.DEV in __root.tsx,
// so this entire module is tree-shaken from the production bundle.

import { useCallback, useEffect, useRef, useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

type Tweaks = {
  theme: 'paper' | 'dark';
  density: 'compact' | 'comfortable' | 'airy';
  accent: string; // hex like '#1c3fbb'
  showTopstrip: boolean;
};

// ── CSS injected into <head> once (panel chrome + controls) ──────────────────

const PANEL_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}
  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}
  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;overflow-wrap:anywhere}
  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}
  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}
  .hide-topstrip .topstrip{display:none}
`;

// ── Helper: inject panel CSS + topstrip rule once ────────────────────────────

let styleInjected = false;
function ensureStyle() {
  if (styleInjected) return;
  styleInjected = true;
  const el = document.createElement('style');
  el.setAttribute('data-twk', '1');
  el.textContent = PANEL_STYLE;
  document.head.appendChild(el);
}

// ── Read initial state from document / localStorage ──────────────────────────

function readInitialTweaks(): Tweaks {
  if (typeof document === 'undefined') {
    return { theme: 'paper', density: 'comfortable', accent: '#1c3fbb', showTopstrip: true };
  }
  const html = document.documentElement;
  const theme = (html.dataset.theme as Tweaks['theme']) ?? 'paper';
  const density = (html.dataset.density as Tweaks['density']) ?? 'comfortable';
  const accent = getComputedStyle(html).getPropertyValue('--accent').trim() || '#1c3fbb';
  const showTopstrip = !html.classList.contains('hide-topstrip');
  return { theme, density, accent, showTopstrip };
}

// ── TweakSection ─────────────────────────────────────────────────────────────

interface TweakSectionProps {
  label: string;
  children?: React.ReactNode;
}
function TweakSection({ label, children }: TweakSectionProps) {
  return (
    <>
      <div className="twk-sect">{label}</div>
      {children}
    </>
  );
}

// ── TweakToggle ──────────────────────────────────────────────────────────────

interface TweakToggleProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}
function TweakToggle({ label, value, onChange }: TweakToggleProps) {
  return (
    <div className="twk-row twk-row-h">
      <div className="twk-lbl">
        <span>{label}</span>
      </div>
      <button
        type="button"
        className="twk-toggle"
        data-on={value ? '1' : '0'}
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
      >
        <i />
      </button>
    </div>
  );
}

// ── TweakRadio (segmented control) ───────────────────────────────────────────

interface TweakRadioProps<T extends string> {
  label: string;
  value: T;
  options: T[];
  onChange: (v: T) => void;
}
function TweakRadio<T extends string>({ label, value, options, onChange }: TweakRadioProps<T>) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  const n = options.length;
  const idx = Math.max(0, options.indexOf(value));

  const segAt = useCallback(
    (clientX: number): T => {
      if (!trackRef.current) return options[0]!;
      const r = trackRef.current.getBoundingClientRect();
      const inner = r.width - 4;
      const i = Math.floor(((clientX - r.left - 2) / inner) * n);
      return options[Math.max(0, Math.min(n - 1, i))]!;
    },
    [n, options],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      setDragging(true);
      const v0 = segAt(e.clientX);
      if (v0 !== valueRef.current) onChange(v0);
      const move = (ev: PointerEvent) => {
        if (!trackRef.current) return;
        const v = segAt(ev.clientX);
        if (v !== valueRef.current) onChange(v);
      };
      const up = () => {
        setDragging(false);
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    [segAt, onChange],
  );

  return (
    <div className="twk-row">
      <div className="twk-lbl">
        <span>{label}</span>
      </div>
      <div
        ref={trackRef}
        role="radiogroup"
        onPointerDown={onPointerDown}
        className={dragging ? 'twk-seg dragging' : 'twk-seg'}
      >
        <div
          className="twk-seg-thumb"
          style={{
            left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
            width: `calc((100% - 4px) / ${n})`,
          }}
        />
        {options.map((o) => (
          // biome-ignore lint/a11y/useSemanticElements: styled segmented control, button with role=radio by design
          <button key={o} type="button" role="radio" aria-checked={o === value}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── TweakColor (native color input) ──────────────────────────────────────────

interface TweakColorProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}
function TweakColor({ label, value, onChange }: TweakColorProps) {
  return (
    <div className="twk-row twk-row-h">
      <div className="twk-lbl">
        <span>{label}</span>
      </div>
      <input
        type="color"
        className="twk-swatch"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// ── TweakButton ───────────────────────────────────────────────────────────────

interface TweakButtonProps {
  label: string;
  onClick: () => void;
  secondary?: boolean;
}
function TweakButton({ label, onClick, secondary = false }: TweakButtonProps) {
  return (
    <button
      type="button"
      className={secondary ? 'twk-btn secondary' : 'twk-btn'}
      style={{
        appearance: 'none',
        height: 26,
        padding: '0 12px',
        border: 0,
        borderRadius: 7,
        background: secondary ? 'rgba(0,0,0,.06)' : 'rgba(0,0,0,.78)',
        color: secondary ? 'inherit' : '#fff',
        font: 'inherit',
        fontWeight: 500,
        cursor: 'default',
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

// ── TweaksPanel (main export) ────────────────────────────────────────────────

const PAD = 16;

export default function TweaksPanel() {
  const [open, setOpen] = useState(false);
  const [tweaks, setTweaksState] = useState<Tweaks>(readInitialTweaks);
  const dragRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ x: PAD, y: PAD });

  // Inject styles once
  useEffect(() => {
    ensureStyle();
  }, []);

  // Sync tweaks → DOM + localStorage
  useEffect(() => {
    const html = document.documentElement;
    html.dataset.theme = tweaks.theme;
    html.dataset.density = tweaks.density;
    html.style.setProperty('--accent', tweaks.accent);
    if (tweaks.showTopstrip) {
      html.classList.remove('hide-topstrip');
    } else {
      html.classList.add('hide-topstrip');
    }
    try {
      localStorage.setItem('theme', tweaks.theme);
      localStorage.setItem('density', tweaks.density);
      localStorage.setItem('accent', tweaks.accent);
    } catch {
      // ignore storage errors (private browsing, etc.)
    }
  }, [tweaks]);

  // Keyboard shortcut: Ctrl+Shift+T opens/closes panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const clampToViewport = useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y)),
    };
    panel.style.right = `${offsetRef.current.x}px`;
    panel.style.bottom = `${offsetRef.current.y}px`;
  }, []);

  useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);

  const onDragStart = (e: React.MouseEvent) => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX;
    const sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = (ev: MouseEvent) => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy),
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const set = <K extends keyof Tweaks>(key: K, val: Tweaks[K]) => {
    setTweaksState((prev) => ({ ...prev, [key]: val }));
  };

  const resetDefaults = () => {
    setTweaksState({
      theme: 'paper',
      density: 'comfortable',
      accent: '#1c3fbb',
      showTopstrip: true,
    });
  };

  if (!open) {
    // Floating trigger button when panel is closed
    return (
      <button
        type="button"
        aria-label="Open design tweaks panel"
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          right: PAD,
          bottom: PAD,
          zIndex: 2147483645,
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: '.5px solid rgba(0,0,0,.12)',
          background: 'rgba(250,249,247,.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 2px 8px rgba(0,0,0,.15)',
          cursor: 'default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          color: 'rgba(41,38,27,.6)',
        }}
      >
        ✦
      </button>
    );
  }

  return (
    <div
      ref={dragRef}
      className="twk-panel"
      style={{ right: offsetRef.current.x, bottom: offsetRef.current.y }}
    >
      <div className="twk-hd" onMouseDown={onDragStart}>
        <b>Design tweaks</b>
        <button
          type="button"
          className="twk-x"
          aria-label="Close tweaks panel"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => setOpen(false)}
        >
          ✕
        </button>
      </div>
      <div className="twk-body">
        <TweakSection label="Apparence">
          <TweakRadio
            label="Thème"
            value={tweaks.theme}
            options={['paper', 'dark'] as const}
            onChange={(v) => set('theme', v)}
          />
          <TweakRadio
            label="Densité"
            value={tweaks.density}
            options={['compact', 'comfortable', 'airy'] as const}
            onChange={(v) => set('density', v)}
          />
          <TweakColor label="Accent" value={tweaks.accent} onChange={(v) => set('accent', v)} />
        </TweakSection>
        <TweakSection label="Layout">
          <TweakToggle
            label="Topstrip"
            value={tweaks.showTopstrip}
            onChange={(v) => set('showTopstrip', v)}
          />
        </TweakSection>
        <TweakSection label="Actions">
          <TweakButton label="Reset defaults" onClick={resetDefaults} secondary />
        </TweakSection>
      </div>
    </div>
  );
}
