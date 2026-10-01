import "./index.css";

const ACTIONS = [
  {
    id: "free",
    screen: "free-emoji",
    title: "Free emoji",
    caption: "Бесплатный набор",
    badge: "HOT",
    icon: "gift",
  },
  {
    id: "portfolio",
    screen: "portfolio",
    title: "Примеры работ",
    caption: "Портфолио",
    icon: "grid",
  },
  {
    id: "about",
    screen: "about",
    title: "INFO IRFIX",
    caption: "О сервисе",
    icon: "info",
  },
  {
    id: "games",
    screen: "games",
    title: "GAME",
    caption: "Играй и получай",
    icon: "game",
  },
];

function Icon({ name }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  if (name === "gift")
    return (
      <svg {...common}>
        <path d="M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8" />
        <path d="M12 22V12" />
        <path d="M2 7h20v5H2z" />
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
      </svg>
    );
  if (name === "grid")
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    );
  if (name === "info")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    );
  if (name === "game")
    return (
      <svg {...common}>
        <path d="M6 12h4" />
        <path d="M8 10v4" />
        <path d="M15 13h.01" />
        <path d="M18 11h.01" />
        <path d="M17.32 5H6.68a4 4 0 0 0-3.98 3.59c-.28 2.33.14 4.67 1.17 6.7A3 3 0 0 0 6.5 17h11a3 3 0 0 0 2.63-1.71c1.03-2.03 1.45-4.37 1.17-6.7A4 4 0 0 0 17.32 5z" />
      </svg>
    );
  if (name === "home")
    return (
      <svg {...common}>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 10v9a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1v-9" />
      </svg>
    );
  if (name === "catalog")
    return (
      <svg {...common}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    );
  if (name === "user")
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    );
  if (name === "arrow")
    return (
      <svg {...common} width={16} height={16}>
        <path d="M7 17 17 7" />
        <path d="M8 7h9v9" />
      </svg>
    );
  return null;
}

export default function HomeMenu({ onNavigate, isAdmin }) {
  return (
    <div className="ir-home">
      <main className="ir-home__main">
        <header className="ir-home__header">
          <div className="ir-home__brand">
            <span className="ir-home__logo-text">IRFIX EMOJI</span>
            <span className="ir-home__logo-dot" aria-hidden="true" />
          </div>
          <p className="ir-home__tagline">Анимированные эмодзи для Telegram</p>
        </header>

        <section className="ir-hero" aria-labelledby="hero-title">
          <div className="ir-hero__grid" aria-hidden="true" />
          <div className="ir-hero__ring ir-hero__ring--lg" aria-hidden="true" />
          <div className="ir-hero__ring ir-hero__ring--sm" aria-hidden="true" />
          <span className="ir-hero__watermark" aria-hidden="true">
            IRFIX
          </span>
          <span className="ir-hero__eyebrow">
            <span className="ir-hero__eyebrow-line" />
            Custom studio
          </span>
          <h1 id="hero-title" className="ir-hero__title">
            Эмодзи,
            <br />
            которые оживают
          </h1>
          <button
            type="button"
            className="ir-hero__cta"
            onClick={() => onNavigate("order")}
          >
            Заказать свой
            <Icon name="arrow" />
          </button>
        </section>

        <button
          type="button"
          className="ir-news"
          onClick={() => onNavigate("portfolio")}
        >
          <span className="ir-news__pulse" aria-hidden="true">
            <span className="ir-news__pulse-ring" />
            <span className="ir-news__pulse-dot" />
          </span>
          <span className="ir-news__label">Новинки недели</span>
          <span className="ir-news__chevron" aria-hidden="true">
            →
          </span>
        </button>

        <div className="ir-grid">
          {ACTIONS.map((a) => (
            <button
              key={a.id}
              type="button"
              className="ir-card"
              onClick={() => onNavigate(a.screen)}
            >
              <span className="ir-card__top">
                <span className="ir-card__icon">
                  <Icon name={a.icon} />
                </span>
                {a.badge ? (
                  <span className="ir-card__badge">{a.badge}</span>
                ) : (
                  <span className="ir-card__arrow" aria-hidden="true">
                    <Icon name="arrow" />
                  </span>
                )}
              </span>
              <span className="ir-card__text">
                <span className="ir-card__title">{a.title}</span>
                <span className="ir-card__caption">{a.caption}</span>
              </span>
            </button>
          ))}
        </div>

        {isAdmin && (
          <button
            type="button"
            className="ir-admin"
            onClick={() => onNavigate("admin")}
          >
            Паки (админ)
          </button>
        )}

        <p className="ir-proof">✦ 10 паков созданы</p>
      </main>

      <nav className="ir-nav" aria-label="Главное меню">
        <button
          type="button"
          className="ir-nav__item ir-nav__item--active"
          onClick={() => onNavigate("home")}
        >
          <Icon name="home" />
          <span>Меню</span>
        </button>
        <button
          type="button"
          className="ir-nav__item"
          onClick={() => onNavigate("portfolio")}
        >
          <Icon name="catalog" />
          <span>Каталог</span>
        </button>
        <button
          type="button"
          className="ir-nav__item"
          onClick={() => onNavigate("my-orders")}
        >
          <Icon name="user" />
          <span>Мои заказы</span>
        </button>
      </nav>
    </div>
  );
}
