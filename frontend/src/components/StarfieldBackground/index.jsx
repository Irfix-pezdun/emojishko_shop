import { useEffect, useMemo, useRef } from "react";
import { mountTgs } from "../../lib/tgs";
import "./index.css";

// Сколько эмодзи реально анимируются Lottie. Остальные — лёгкие «звёзды» без TGS
// (слабые телефоны не тянут 18 canvas-анимаций).
const DEFAULT_MAX_ACTIVE = 10;
const DEFAULT_TOTAL_STARS = 22;

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function buildStars(emojiUrls, maxActive, totalStars) {
  const rand = seededRandom(42);
  const count = Math.max(totalStars, maxActive);

  return Array.from({ length: count }).map((_, i) => {
    const url = emojiUrls.length ? emojiUrls[i % emojiUrls.length] : null;
    const depth = 0.3 + rand() * 0.7;
    const animated = Boolean(url) && i < maxActive;
    return {
      id: `star-${i}`,
      url,
      animated,
      depth,
      left: rand() * 100,
      top: rand() * 100,
      size: animated ? Math.round(34 + depth * 70) : Math.round(4 + depth * 10),
      driftX: Math.round((rand() - 0.5) * 60),
      driftY: Math.round((rand() - 0.5) * 60),
      duration: 14 + rand() * 16,
      delay: -rand() * 20,
      twinkleDuration: 3 + rand() * 4,
      twinkleDelay: -rand() * 5,
    };
  });
}

export default function StarfieldBackground({
  emojiUrls = [],
  density = 1,
  maxActive = DEFAULT_MAX_ACTIVE,
  totalStars = DEFAULT_TOTAL_STARS,
}) {
  const activeCount = Math.max(4, Math.round(maxActive * density));
  const totalCount = Math.max(activeCount, Math.round(totalStars * density));

  const stars = useMemo(
    () => buildStars(emojiUrls, activeCount, totalCount),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [emojiUrls.join("|"), density, maxActive, totalStars]
  );

  const rootRef = useRef(null);
  const starRefs = useRef({});

  // Монтируем TGS только у animated-звёзд
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

  // parallax
  useEffect(() => {
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let raf;

    function onPointerMove(e) {
      const x = (e.clientX ?? e.touches?.[0]?.clientX) / window.innerWidth;
      const y = (e.clientY ?? e.touches?.[0]?.clientY) / window.innerHeight;
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
        const shift = 10 * star.depth;
        wrap.style.transform = `translate3d(${current.x * shift}px, ${current.y * shift}px, 0)`;
      });
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("touchmove", onPointerMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("touchmove", onPointerMove);
      cancelAnimationFrame(raf);
    };
  }, [stars]);

  return (
    <div className="starfield" ref={rootRef} aria-hidden="true">
      {stars.map((star) => (
        <div
          key={star.id}
          data-parallax={star.id}
          className="starfield__parallax"
          style={{ left: `${star.left}%`, top: `${star.top}%` }}
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
                opacity: star.animated ? 0.35 + star.depth * 0.5 : 0.25 + star.depth * 0.4,
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
