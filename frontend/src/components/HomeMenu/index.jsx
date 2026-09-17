import "./index.css";

export default function HomeMenu({ onNavigate, authorName = "IRFIX" }) {
  return (
    <div className="home">
      <div className="home__hero">
        <div className="home__logo">✦</div>
        <h1 className="home__title">{authorName}</h1>
        <p className="home__tagline">Кастомные эмодзи-паки для Telegram</p>
      </div>

      <div className="stack">
        <button className="btn btn-primary home__cta" onClick={() => onNavigate("free-emoji")}>
          🎁 Получить бесплатный эмодзи
        </button>
        <button className="btn btn-secondary" onClick={() => onNavigate("portfolio")}>
          ✨ Примеры работ
        </button>
        <button className="btn btn-secondary" onClick={() => onNavigate("about")}>
          👤 О дизайнере
        </button>
      </div>
    </div>
  );
}
