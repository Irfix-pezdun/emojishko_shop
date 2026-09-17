import { useState, useRef } from "react";
import { useTgs } from "../../lib/tgs";
import "./index.css";

function PackCover({ url }) {
  const ref = useTgs(url, { loop: true, autoplay: true });
  return <div className="pack-card__cover" ref={ref} />;
}

function EmojiFrame({ url, active }) {
  const ref = useTgs(url, { loop: true, autoplay: active, active });
  return <div className="pack-viewer__emoji" ref={ref} />;
}

function PackViewer({ pack, onBack, onOrderSimilar }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef(null);

  const go = (delta) => {
    setIndex((i) => (i + delta + pack.emoji.length) % pack.emoji.length);
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
        {pack.emoji.map((e, i) => (
          <div key={e.id} className="pack-viewer__slide" style={{ display: i === index ? "block" : "none" }}>
            <EmojiFrame url={e.url} active={i === index} />
          </div>
        ))}
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

export default function PortfolioGallery({ packs, onOrderSimilar }) {
  const [selectedId, setSelectedId] = useState(null);
  const selected = packs.find((p) => p.id === selectedId);

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
      {packs.length === 0 && <p className="muted">Паки скоро появятся здесь.</p>}
      <div className="pack-grid">
        {packs.map((pack) => (
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
