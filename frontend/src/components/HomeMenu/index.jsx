import "./index.css";

/**
 * Главный экран = твой макет (home-bg.jpg).
 * Кнопки уже нарисованы на картинке — поверх невидимые hit-зоны.
 * Живые TGS на главной не ставим: не спорят с голубым IRFIX.
 */
export default function HomeMenu({ onNavigate }) {
  return (
    <div className="home">
      <div className="home__art" role="img" aria-label="IRFIX DESIGN — Animated Emoji Shop" />

      <div className="home__hits">
        <button
          type="button"
          className="home__hit home__hit--free"
          aria-label="Получить бесплатный эмодзи"
          onClick={() => onNavigate("free-emoji")}
        />
        <button
          type="button"
          className="home__hit home__hit--portfolio"
          aria-label="Примеры работ"
          onClick={() => onNavigate("portfolio")}
        />
        <button
          type="button"
          className="home__hit home__hit--about"
          aria-label="О дизайнере"
          onClick={() => onNavigate("about")}
        />
      </div>
    </div>
  );
}
