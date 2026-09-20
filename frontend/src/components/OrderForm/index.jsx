import { submitOrder as createOrder } from "../../api";
import { createOrder } from "../../api";
import { haptic, setMainButton, hideMainButton } from "../../telegram";
import "./index.css";

const STYLE_PRESETS = ["Минимализм", "Мемы", "Персонажи", "Неон", "Cute", "Киберпанк"];

export default function OrderForm({ prefillStyle, onDone }) {
  const [theme, setTheme] = useState("");
  const [count, setCount] = useState(16);
  const [styles, setStyles] = useState([]);
  const [nick, setNick] = useState("");
  const [logo, setLogo] = useState("");
  const [colors, setColors] = useState("");
  const [references, setReferences] = useState("");
  const [contact, setContact] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const valid = theme.trim().length >= 2 && nick.trim().length >= 1;

  const toggleStyle = (s) => {
    setStyles((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const handleSubmit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await createOrder({
        theme: theme.trim(),
        emoji_count: count,
        styles,
        nick: nick.trim(),
        logo: logo.trim() || null,
        colors: colors.trim() || null,
        references: references.trim() || null,
        contact: contact.trim() || null,
        comment: comment.trim() || null,
        pack_style_hint: prefillStyle || null,
      });
      haptic("success");
      setSubmitted(true);
      hideMainButton();
    } catch (e) {
      setError(e.message || "Не удалось отправить. Попробуй позже.");
      haptic("error");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    setMainButton({
      text: submitting ? "Отправляю…" : "Отправить заявку",
      visible: !submitted,
      active: valid && !submitting,
      onClick: handleSubmit,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valid, submitting, submitted, theme, nick, logo, colors, count, styles, references, contact, comment]);

  useEffect(() => () => hideMainButton(), []);

  if (submitted) {
    return (
      <div className="screen">
        <h2>Заявка отправлена ✅</h2>
        <p className="muted">
          Я напишу вам в течение суток. Если есть SVG-логотип — пришлите его в личку.
        </p>
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
        <span>Ник / бренд *</span>
        <input
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          placeholder="Как подписать эмодзи"
          maxLength={64}
        />
      </label>

      <label className="order-form__field">
        <span>Цвета</span>
        <input
          value={colors}
          onChange={(e) => setColors(e.target.value)}
          placeholder="Синий и белый или #00A3FF #FFFFFF"
          maxLength={200}
        />
      </label>

      <label className="order-form__field">
        <span>Логотип (ссылка SVG/PNG или «в личку»)</span>
        <input
          value={logo}
          onChange={(e) => setLogo(e.target.value)}
          placeholder="Ссылка или: пришлю в личку"
          maxLength={500}
        />
      </label>

      <label className="order-form__field">
        <span>Тема / концепция пака *</span>
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

      <button className="btn btn-primary" onClick={handleSubmit} disabled={!valid || submitting}>
        {submitting ? "Отправляю…" : "Отправить заявку"}
      </button>
    </div>
  );
}
