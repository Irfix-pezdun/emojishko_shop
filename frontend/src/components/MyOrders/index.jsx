import { useEffect, useState } from "react";
import { getMyOrders } from "../../api";
import "./index.css";

const STATUS_RU = {
  new: "Новая",
  claimed: "Принята",
  contacted: "На связи",
  in_progress: "В работе",
  completed: "Готово",
  cancelled: "Отменена",
};

const TYPE_RU = {
  free_trial: "Бесплатный эмодзи",
  full_order: "Заказ пака",
};

function formatDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export default function MyOrders({ onBack, onOrder }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getMyOrders()
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || "Не удалось загрузить");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="screen my-orders">
      <button type="button" className="my-orders__back" onClick={onBack}>
        ← Назад
      </button>
      <h2 className="my-orders__title">Мои заказы</h2>
      <p className="my-orders__hint muted">
        Заявки на паки и бесплатные эмодзи, которые ты отправлял через бота.
      </p>

      {loading && <p className="muted">Загрузка…</p>}
      {error && <p className="my-orders__error">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <div className="my-orders__empty">
          <p>Пока заявок нет.</p>
          <button type="button" className="btn btn-primary" onClick={onOrder}>
            Заказать пак
          </button>
        </div>
      )}

      <ul className="my-orders__list">
        {items.map((o) => (
          <li key={o.id} className="my-orders__card">
            <div className="my-orders__row">
              <span className="my-orders__type">
                {TYPE_RU[o.type] || o.type}
              </span>
              <span className={`my-orders__status my-orders__status--${o.status}`}>
                {STATUS_RU[o.status] || o.status}
              </span>
            </div>
            {o.title && <p className="my-orders__desc">{o.title}</p>}
            <div className="my-orders__meta">
              {o.code && (
                <span className="my-orders__code">
                  Код: <code>{o.code}</code>
                </span>
              )}
              <span className="my-orders__date">{formatDate(o.created_at)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
