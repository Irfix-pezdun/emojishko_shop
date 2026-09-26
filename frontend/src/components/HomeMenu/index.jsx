import "./index.css";

const BUTTONS = [
  {
    id: "free",
    src: "/btn-free.svg",
    label: "Получить бесплатный эмодзи",
    screen: "free-emoji",
  },
  {
    id: "portfolio",
    src: "/btn-portfolio.svg",
    label: "Примеры работ",
    screen: "portfolio",
  },
  {
    id: "about",
    src: "/btn-about.svg",
    label: "О дизайнере",
    screen: "about",
  },
  {
    id: "games",
    src: "/btn-games.svg",
    label: "Игры — Pong",
    screen: "games",
  },
];

export default function HomeMenu({ onNavigate, isAdmin }) {
  return (
    <div className="home">
      <div className="home__bg" aria-hidden="true" />

      <div className="home__stars" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className={`home__star home__star--${i + 1}`} />
        ))}
      </div>

      <header className="home__header">
        <img className="home__logo" src="/logo-irfix.png" alt="IRFIX DESIGN" />
      </header>

      <nav className="home__nav">
        {BUTTONS.map((btn, i) => (
          <button
            key={btn.id}
            type="button"
            className={`home__btn${btn.id === "games" ? " home__btn--compact" : ""}`}
            style={{ animationDelay: `${0.12 + i * 0.1}s` }}
            aria-label={btn.label}
            onClick={() => onNavigate(btn.screen)}
          >
            <img src={btn.src} alt="" draggable={false} />
          </button>
        ))}
        {isAdmin && (
          <button
            type="button"
            className="home__admin-btn"
            onClick={() => onNavigate("admin")}
          >
            ⚙️ Паки (админ)
          </button>
        )}
      </nav>
    </div>
  );
}
