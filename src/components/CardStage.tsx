"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import TiltCard from "@/components/TiltCard";
import { useLang } from "@/lib/lang";

/**
 * 詳細ページの主役カードの「置き台」。カード面のデザインには触れず、
 * トレカアプリのような操作だけを足す。
 *  - 指でなぞる / マウスを乗せる → 傾いて光がすべる（TiltCard）
 *  - タップ                     → 全画面で「かざす」（ジャイロで傾く）
 *  - 左右にフリック             → 前後のカードへ
 */
export default function CardStage({
  prevNo,
  nextNo,
  children,
}: {
  prevNo?: string;
  nextNo?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { lang } = useLang();
  const en = lang === "en";
  const [zoom, setZoom] = useState(false);
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const swiped = useRef(false);

  // 前後カードを先読みしておき、フリックでの移動を一瞬にする
  useEffect(() => {
    if (prevNo) router.prefetch(`/jobs/${prevNo}`);
    if (nextNo) router.prefetch(`/jobs/${nextNo}`);
  }, [prevNo, nextNo, router]);

  const go = useCallback(
    (no: string) => {
      navigator.vibrate?.(10);
      router.push(`/jobs/${no}`);
    },
    [router]
  );

  return (
    <>
      <div
        // 「かざす」中は背面のカードを読み上げ対象から外す（同じカードが二重に読まれるため）
        aria-hidden={zoom || undefined}
        className="mx-auto max-w-[340px] cursor-pointer touch-pan-y select-none"
        onPointerDown={(e) => {
          start.current = { x: e.clientX, y: e.clientY, t: Date.now() };
          swiped.current = false;
        }}
        onPointerUp={(e) => {
          const s = start.current;
          start.current = null;
          if (!s) return;
          const dx = e.clientX - s.x;
          const dy = e.clientY - s.y;
          // 横フリック → 前後のカードへ（縦スクロールと取り違えないよう横成分を重視）
          if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) {
            swiped.current = true;
            if (dx < 0 && nextNo) go(nextNo);
            else if (dx > 0 && prevNo) go(prevNo);
          }
        }}
        // 途中でジェスチャが打ち切られたとき、古い開始点を残さない
        // （残すと次の無関係な指離しで誤って隣のカードへ飛ぶ）
        onPointerCancel={() => {
          start.current = null;
          swiped.current = false;
        }}
        // タップ／クリックで「かざす」。直前がフリックだったときは開かない。
        onClick={() => {
          if (swiped.current) {
            swiped.current = false;
            return;
          }
          navigator.vibrate?.(8);
          setZoom(true);
        }}
      >
        <TiltCard variant="hero">{children}</TiltCard>
      </div>

      <p className="mt-3 text-center font-mono-label text-[10px] tracking-[0.25em] text-vja-ink-soft">
        {en ? "TAP TO HOLD IT UP · SWIPE TO FLIP" : "タップでかざす ・ 左右スワイプでめくる"}
      </p>

      {zoom && <CardViewer onClose={() => setZoom(false)}>{children}</CardViewer>}
    </>
  );
}

/** 全画面でカードだけを見る「かざす」モード。端末を傾けると光が動く。 */
function CardViewer({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const { lang } = useLang();
  const en = lang === "en";
  const box = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const [needsGyroTap, setNeedsGyroTap] = useState(false);
  const [gyro, setGyro] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // 開くきっかけになったクリックがそのまま「閉じる」に流れないようにする
  const openedAt = useRef(Date.now());
  const safeClose = useCallback(() => {
    if (Date.now() - openedAt.current < 250) return;
    onClose();
  }, [onClose]);

  const setTilt = useCallback((rx: number, ry: number, gx: number, gy: number) => {
    const el = box.current;
    if (!el) return;
    el.style.setProperty("--rx", `${rx}deg`);
    el.style.setProperty("--ry", `${ry}deg`);
    el.style.setProperty("--gx", `${gx}%`);
    el.style.setProperty("--gy", `${gy}%`);
    el.style.setProperty("--glare", "0.8");
  }, []);

  // 開いている間は背面をスクロールさせない。
  // iOS Safari は overflow:hidden だけでは止まらないので、位置を固定して戻す方式にする。
  useEffect(() => {
    const y = window.scrollY;
    const s = document.body.style;
    const prev = { position: s.position, top: s.top, width: s.width, overflow: s.overflow };
    s.position = "fixed";
    s.top = `-${y}px`;
    s.width = "100%";
    s.overflow = "hidden";
    return () => {
      s.position = prev.position;
      s.top = prev.top;
      s.width = prev.width;
      s.overflow = prev.overflow;
      window.scrollTo(0, y);
    };
  }, []);

  // Esc で閉じる／Tab をこの中に閉じ込める／閉じたら元の場所へフォーカスを戻す
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const root = shell.current;
    root?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !root) return;
      const f = root.querySelectorAll<HTMLElement>("button, [href], [tabindex]:not([tabindex='-1'])");
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [onClose]);

  // ジャイロ: iOSは明示的な許可が要るのでボタンを出す。それ以外はそのまま使う。
  useEffect(() => {
    const DOE = window.DeviceOrientationEvent as
      | (typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> })
      | undefined;
    if (!DOE) return;
    if (typeof DOE.requestPermission === "function") setNeedsGyroTap(true);
    else setGyro(true);
  }, []);

  useEffect(() => {
    if (!gyro) return;
    const clamp = (v: number, m: number) => Math.min(Math.max(v, -m), m);
    const onOrient = (e: DeviceOrientationEvent) => {
      const beta = e.beta ?? 0; // 前後の傾き
      const gamma = e.gamma ?? 0; // 左右の傾き
      // 端末を立てて持っている状態(beta≒60°)を基準にする
      const rx = clamp((60 - beta) * 0.35, 16);
      const ry = clamp(gamma * 0.35, 16);
      setTilt(rx, ry, 50 + ry * 2.4, 50 - rx * 2.4);
    };
    window.addEventListener("deviceorientation", onOrient);
    return () => window.removeEventListener("deviceorientation", onOrient);
  }, [gyro, setTilt]);

  const enableGyro = async () => {
    const DOE = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<string>;
    };
    try {
      const res = await DOE.requestPermission?.();
      if (res === "granted") {
        setGyro(true);
        setNeedsGyroTap(false);
      }
    } catch {
      /* 許可されなければ指でなぞる操作だけ残る */
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      ref={shell}
      className="vja-viewer fixed inset-0 z-[100] flex flex-col items-center justify-center px-6"
      onClick={safeClose}
      role="dialog"
      aria-modal="true"
      aria-label={en ? "Card, full screen" : "カードを全画面で見る"}
    >
      {/* 登場アニメは外側で。内側(.vja-tilt)の transform を上書きしないため */}
      <div
        className="vja-viewer-card w-full"
        style={{ width: "min(86vw, 52svh)", maxWidth: 460 }}
      >
        <div
          ref={box}
          className="vja-tilt is-live"
          onClick={(e) => e.stopPropagation()}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width;
            const py = (e.clientY - r.top) / r.height;
            setTilt((0.5 - py) * 32, (px - 0.5) * 32, px * 100, py * 100);
          }}
          onPointerLeave={() => setTilt(0, 0, 50, 50)}
        >
          {children}
          <span className="vja-glare" aria-hidden />
          <span className="vja-holo" aria-hidden />
        </div>
      </div>

      <div className="mt-7 flex items-center gap-3">
        {needsGyroTap && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              enableGyro();
            }}
            className="rounded-full border border-vja-cream/50 px-5 py-2 text-xs tracking-[0.2em] text-vja-cream"
          >
            {en ? "USE MOTION" : "かたむけて見る"}
          </button>
        )}
        <button
          onClick={onClose}
          className="rounded-full bg-vja-cream px-6 py-2 text-xs tracking-[0.2em] text-vja-ink"
        >
          {en ? "CLOSE" : "とじる"}
        </button>
      </div>
    </div>,
    document.body
  );
}
