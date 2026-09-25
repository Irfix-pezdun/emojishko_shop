import { useState, useRef, useEffect } from "react";
import { useTgs, preloadTgsMany } from "../../lib/tgs";
import "./index.css";

function PackCover({ url }) {
  const ref = useTgs(url, { loop: false, autoplay: true });
  return <div className="pack-card__cover" ref={ref} />;
}

function EmojiFrame({ url, active }) {
  const ref = useTgs(url, { loop: true, autoplay: active, active });
  return <div className="pack-viewer__emoji" ref={ref} />;
}

function PackViewer({ pack, onBack, onOrderSimilar }) {
  const [index, setIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const touchStartX = useRef(null);

  // догружаем весь пак в кэш — листание без ожидания сети
  useEffect(() => {
    const urls = (pack.emoji || []).map((e) => e.url);
    preloadTgsMany(urls, { concurrency: 4 });
  }, [pack.id]);

  const go = (delta) => {
    setIndex((i) => (i + delta + pack.emoji.length) % pack.emoji.length);
    setAnimKey((k) => k + 1);
  };

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) go(dx > 0 ? -1 : 1);
    touchStartX.current = null;
  };

  const current = pack.emoji[index];

  return (
    <div className="pack-viewer">
      <button className="btn-ghost pack-viewer__back" onClick={onBack}>
        ← Все паки
      </button>

      <h2>{pack.title}</h2>
      {pack.tags?.length > 0 && <p className="muted">{pack.tags.join(" · ")}</p>}

      <div className="pack-viewer__stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <button className="pack-viewer__nav pack-viewer__nav--prev" onClick={() => go(-1)} aria-label="Предыдущий">
          ‹
        </button>
        {current && (
          <div key={`${current.id}-${animKey}`} className="pack-viewer__slide pack-viewer__slide--anim">
            <EmojiFrame url={current.url} active />
          </div>
        )}
        <button className="pack-viewer__nav pack-viewer__nav--next" onClick={() => go(1)} aria-label="Следующий">
          ›
        </button>
      </div>

      <p className="muted pack-viewer__counter">
        {index + 1} / {pack.emoji.length}
      </p>

      <button className="btn btn-primary" onClick={() => onOrderSimilar(pack.title)}>
        Заказать похожий стиль
      </button>
    </div>
  );
}

const HIDDEN_TITLES = new Set(["первая коллекция", "first collection"]);
const HIDDEN_IDS = new Set(["pack-001", "pack_001", "first"]);

export default function PortfolioGallery({ packs, onOrderSimilar }) {
  const [selectedId, setSelectedId] = useState(null);

  const visible = (packs || []).filter((p) => {
    const title = (p.title || "").trim().toLowerCase();
    const id = (p.id || "").trim().toLowerCase();
    if (HIDDEN_IDS.has(id)) return false;
    if (HIDDEN_TITLES.has(title)) return false;
    return true;
  });

  const selected = visible.find((p) => p.id === selectedId);

  if (selected) {
    return (
      <div className="screen">
        <PackViewer pack={selected} onBack={() => setSelectedId(null)} onOrderSimilar={onOrderSimilar} />
      </div>
    );
  }

  return (
    <div className="screen">
      <h2>Примеры работ</h2>
      {visible.length === 0 && <p className="muted">Паки скоро появятся здесь.</p>}
      <div className="pack-grid">
        {visible.map((pack) => (
          <button key={pack.id} className="pack-card card" onClick={() => setSelectedId(pack.id)}>
            <PackCover url={pack.cover_url} />
            <div className="pack-card__title">{pack.title}</div>
            <div className="pack-card__count muted">{pack.emoji.length} эмодзи</div>
          </button>
        ))}
      </div>
    </div>
  );
}
