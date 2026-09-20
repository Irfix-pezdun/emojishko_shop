import { useEffect, useMemo, useRef, useState } from "react";
import { mountTgs } from "../../lib/tgs";
import "./index.css";

// На телефоне меньше «живых» TGS — меньше каши и нагрузки.
const DESKTOP_MAX_ACTIVE = 8;
const MOBILE_MAX_ACTIVE = 5;
const DESKTOP_TOTAL = 20;
const MOBILE_TOTAL = 14;

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** Равномерная сетка + лёгкий разброс, отступ от краёв — не кучкуются в центре. */
function buildStars(emojiUrls, maxActive, totalStars, isMobile) {
  const rand = seededRandom(42);
  const count = Math.max(totalStars, maxActive);
  const cols = isMobile ? 3 : 4;
  const rows = Math.ceil(count / cols);
  // отступы % от краёв экрана
  const padX = isMobile ? 8 : 6;
  const padY = isMobile ? 10 : 8;

  return Array.from({ length: count }).map((_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cellW = (100 - padX * 2) / cols;
    const cellH = (100 - padY * 2) / rows;
    const jitterX = (rand() - 0.5) * cellW * 0.55;
    const jitterY = (rand() - 0.5) * cellH * 0.55;
    const left = padX + cellW * (col + 0.5) + jitterX;
    const top = padY + cellH * (row + 0.5) + jitterY;

    const url = emojiUrls.length ? emojiUrls[i % emojiUrls.length] : null;
    const depth = 0.35 + rand() * 0.65;
    const animated = Boolean(url) && i < maxActive;
    const base = isMobile ? 28 : 36;
    const span = isMobile ? 36 : 52;

    return {
      id: `star-${i}`,
      url,
      animated,
      depth,
      left: Math.min(100 - padX, Math.max(padX, left)),
      top: Math.min(100 - padY, Math.max(padY, top)),
      size: animated ? Math.round(base + depth * span) : Math.round(3 + depth * 8),
      driftX: Math.round((rand() - 0.5) * (isMobile ? 28 : 48)),
      driftY: Math.round((rand() - 0.5) * (isMobile ? 28 : 48)),
      duration: 16 + rand() * 14,
      delay: -rand() * 18,
      twinkleDuration: 3.5 + rand() * 4,
      twinkleDelay: -rand() * 5,
    };
  });
}

export default function StarfieldBackground({ emojiUrls = [], density = 1 }) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 600 : true
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const maxActive = Math.max(
    3,
    Math.round((isMobile ? MOBILE_MAX_ACTIVE : DESKTOP_MAX_ACTIVE) * density)
  );
  const totalStars = Math.max(
    maxActive,
    Math.round((isMobile ? MOBILE_TOTAL : DESKTOP_TOTAL) * density)
  );

  const stars = useMemo(
    () => buildStars(emojiUrls, maxActive, totalStars, isMobile),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [emojiUrls.join("|"), density, maxActive, totalStars, isMobile]
  );

  const rootRef = useRef(null);
  const starRefs = useRef({});

  useEffect(() => {
    const handles = [];
    let cancelled = false;

    stars.forEach((star) => {
      if (!star.animated || !star.url) return;
      const el = starRefs.current[star.id];
      if (!el) return;
      mountTgs(el, star.url, { loop: true, autoplay: true }).then((h) => {
        if (cancelled || !h) {
          h?.destroy();
          return;
        }
        handles.push(h);
      });
    });

    return () => {
      cancelled = true;
      handles.forEach((h) => h.destroy());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stars]);

  // Параллакс только на десктопе — на таче он часто «сбивает» позиции
  useEffect(() => {
    if (isMobile) return undefined;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let raf;

    function onPointerMove(e) {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      if (Number.isNaN(x) || Number.isNaN(y)) return;
      target.x = x * 2 - 1;
      target.y = y * 2 - 1;
    }

    function tick() {
      current.x += (target.x - current.x) * 0.06;
      current.y += (target.y - current.y) * 0.06;
      stars.forEach((star) => {
        const wrap = rootRef.current?.querySelector(`[data-parallax="${star.id}"]`);
        if (!wrap) return;
        const shift = 8 * star.depth;
        wrap.style.transform = `translate(-50%, -50%) translate3d(${current.x * shift}px, ${current.y * shift}px, 0)`;
      });
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      cancelAnimationFrame(raf);
    };
  }, [stars, isMobile]);

  return (
    <div className="starfield" ref={rootRef} aria-hidden="true">
      {stars.map((star) => (
        <div
          key={star.id}
          data-parallax={star.id}
          className="starfield__parallax"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className="starfield__drift"
            style={{
              "--drift-x": `${star.driftX}px`,
              "--drift-y": `${star.driftY}px`,
              animationDuration: `${star.duration}s`,
              animationDelay: `${star.delay}s`,
            }}
          >
            <div
              className={star.animated ? "starfield__twinkle" : "starfield__dot"}
              style={{
                width: star.size,
                height: star.size,
                opacity: star.animated ? 0.4 + star.depth * 0.45 : 0.25 + star.depth * 0.35,
                animationDuration: `${star.twinkleDuration}s`,
                animationDelay: `${star.twinkleDelay}s`,
              }}
            >
              {star.animated ? (
                <div
                  className="starfield__emoji"
                  ref={(el) => {
                    if (el) starRefs.current[star.id] = el;
                  }}
                />
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
