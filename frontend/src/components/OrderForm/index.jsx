import { useEffect, useState } from "react";
import { getTelegramUser, setMainButton, hideMainButton, haptic } from "../../telegram";
import { submitOrder } from "../../api";
import "./index.css";

const STYLE_PRESETS = ["Минимализм", "Мемные реакции", "Персонажи", "Брендированные под проект"];

export default function OrderForm({ prefillStyle, onDone }) {
  const tgUser = getTelegramUser();

  const [theme, setTheme] = useState("");
  const [count, setCount] = useState(16);
  const [styles, setStyles] = useState(prefillStyle ? [] : []);
  const [references, setReferences] = useState("");
  const [contact, setContact] = useState(tgUser?.username ? `@${tgUser.username}` : "");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const toggleStyle = (s) => {
    setStyles((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const valid = theme.trim().length > 0 && count >= 1;

  const handleSubmit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitOrder({
        theme,
        emoji_count: count,
        styles,
        references: references || null,
        contact: contact || null,
        comment: comment || null,
        pack_style_hint: prefillStyle || null,
      });
      haptic("success");
      setSubmitted(true);
    } catch (e) {
      haptic("error");
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (submitted) {
      hideMainButton();
      return undefined;
    }
    const off = setMainButton({
      text: "Отправить заявку",
      visible: true,
      disabled: !valid || submitting,
      onClick: handleSubmit,
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valid, submitting, submitted, theme, count, styles, references, contact, comment]);

  useEffect(() => () => hideMainButton(), []);

  if (submitted) {
    return (
      <div className="screen">
        <h2>Заявка отправлена ✅</h2>
        <p className="muted">Я напишу вам в течение суток.</p>
        <button className="btn btn-secondary" onClick={onDone}>
          На главную
        </button>
      </div>
    );
  }

  return (
    <div className="screen order-form">
      <h2>Заказать пак</h2>
      {prefillStyle && <p className="muted">В стиле пака «{prefillStyle}»</p>}

      <label className="order-form__field">
        <span>Тема / концепция пака</span>
        <textarea
          rows={3}
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="Например: реакции для игрового чата"
        />
      </label>

      <label className="order-form__field">
        <span>Количество эмодзи: {count}</span>
        <input type="range" min={1} max={100} value={count} onChange={(e) => setCount(Number(e.target.value))} />
      </label>

      <div className="order-form__field">
        <span>Стиль</span>
        <div className="order-form__chips">
          {STYLE_PRESETS.map((s) => (
            <button
              key={s}
              type="button"
              className={`order-form__chip ${styles.includes(s) ? "order-form__chip--active" : ""}`}
              onClick={() => toggleStyle(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <label className="order-form__field">
        <span>Референсы (по желанию)</span>
        <input
          value={references}
          onChange={(e) => setReferences(e.target.value)}
          placeholder="Ссылка или пара слов"
        />
      </label>

      <label className="order-form__field">
        <span>Контакт для связи</span>
        <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="@username" />
      </label>

      <label className="order-form__field">
        <span>Комментарий</span>
        <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
      </label>

      {error && <div className="warning-banner">{error}</div>}

      {/* запасная кнопка на случай если MainButton недоступен (например, открыто не из Telegram) */}
      <button className="btn btn-primary" onClick={handleSubmit} disabled={!valid || submitting}>
        {submitting ? "Отправляю…" : "Отправить заявку"}
      </button>
    </div>
  );
}
