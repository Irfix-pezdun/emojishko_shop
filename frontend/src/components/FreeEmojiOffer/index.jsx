import { useEffect, useMemo, useState } from "react";
import { openChat, haptic } from "../../telegram";
import { getStatus, claimFreeEmoji } from "../../api";
import { useTgs } from "../../lib/tgs";
import "./index.css";

function RefThumb({ url, selected, onClick }) {
  const ref = useTgs(url, { loop: true, autoplay: true, active: true });
  return (
    <button
      type="button"
      className={`free-emoji__ref ${selected ? "is-selected" : ""}`}
      onClick={onClick}
    >
      <div className="free-emoji__ref-anim" ref={ref} />
    </button>
  );
}

export default function FreeEmojiOffer({ channelUsername, authorUsername, packs = [], onOrder }) {
  const [state, setState] = useState("loading");
  // loading | form | already_claimed | claimed | subscribe_required
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const [description, setDescription] = useState("");
  const [refEmoji, setRefEmoji] = useState(null); // { packId, emojiId, url }
  const [code, setCode] = useState(null);

  const examples = useMemo(() => {
    const list = [];
    for (const pack of packs) {
      for (const e of pack.emoji || []) {
        list.push({ packId: pack.id, emojiId: e.id, url: e.url });
        if (list.length >= 12) return list;
      }
    }
    return list;
  }, [packs]);

  useEffect(() => {
    getStatus()
      .then((res) => {
        if (res.status === "already_claimed") {
          setState("already_claimed");
          setCode(res.code || null);
        } else {
          setState("form");
        }
      })
      .catch(() => setState("form"));
  }, []);

  const handleSubmit = async () => {
    const text = description.trim();
    if (text.length < 3) {
      setError("Опиши эмодзи хотя бы в паре слов (минимум 3 символа).");
      return;
    }
    setChecking(true);
    setError(null);
    try {
      const res = await claimFreeEmoji({
        description: text,
        reference_emoji: refEmoji?.emojiId || null,
        reference_pack: refEmoji?.packId || null,
      });
      if (res.status === "claimed") {
        haptic("success");
        setCode(res.code);
        setState("claimed");
      } else if (res.status === "already_claimed") {
        haptic("light");
        setCode(res.code);
        setState("already_claimed");
      } else if (res.status === "subscribe_required") {
        haptic("warning");
        setState("subscribe_required");
      } else {
        setError("Неожиданный ответ сервера. Попробуй ещё раз.");
      }
    } catch (e) {
      setError(e.message || "Не получилось отправить. Попробуй через минуту.");
    } finally {
      setChecking(false);
    }
  };

  if (state === "loading") {
    return <div className="screen" />;
  }

  if (state === "claimed" || state === "already_claimed") {
    const isNew = state === "claimed";
    return (
      <div className="screen">
        <h2>🎁 Бесплатный эмодзи</h2>
        <div className="card free-emoji__card">
          {isNew ? (
            <p>Заявка принята! Я нарисую эмодзи вручную и пришлю в личку.</p>
          ) : (
            <p>Вы уже оставляли заявку на бесплатный эмодзи 🙂</p>
          )}
          {code && (
            <p className="free-emoji__code">
              Твой код: <strong>{code}</strong>
              <br />
              <span className="muted">Назови его, если напишешь мне в чат.</span>
            </p>
          )}
        </div>
        <button className="btn btn-secondary" onClick={() => openChat(authorUsername)}>
          Написать автору
        </button>
        <button className="btn btn-primary" onClick={onOrder}>
          Заказать полный пак
        </button>
      </div>
    );
  }

  return (
    <div className="screen">
      <h2>🎁 Бесплатный эмодзи</h2>
      <div className="card free-emoji__card">
        <p>
          Один кастомный анимированный эмодзи бесплатно — чтобы увидеть качество работы.
          Условие: подписка на канал, один раз на человека.
        </p>
      </div>

      <ol className="free-emoji__steps">
        <li>Подпишись на канал</li>
        <li>Опиши, какой эмодзи хочешь (и при желании выбери похожий из примеров)</li>
        <li>Отправь заявку — я получу код и сделаю вручную</li>
      </ol>

      <label className="free-emoji__label">Что нарисовать? *</label>
      <textarea
        className="free-emoji__textarea"
        rows={3}
        maxLength={500}
        placeholder="Например: котёнок машет лапкой, в стиле мемов"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      {examples.length > 0 && (
        <>
          <label className="free-emoji__label">Похожий пример (необязательно)</label>
          <div className="free-emoji__refs">
            {examples.map((ex) => (
              <RefThumb
                key={`${ex.packId}-${ex.emojiId}`}
                url={ex.url}
                selected={refEmoji?.emojiId === ex.emojiId && refEmoji?.packId === ex.packId}
                onClick={() =>
                  setRefEmoji(
                    refEmoji?.emojiId === ex.emojiId && refEmoji?.packId === ex.packId ? null : ex
                  )
                }
              />
            ))}
          </div>
        </>
      )}

      {state === "subscribe_required" && (
        <div className="warning-banner">Сначала подпишись на канал 🙂</div>
      )}
      {error && <div className="warning-banner">{error}</div>}

      <button className="btn btn-secondary" onClick={() => openChat(channelUsername)}>
        📢 Подписаться на канал
      </button>
      <button className="btn btn-primary" onClick={handleSubmit} disabled={checking}>
        {checking ? "Отправляю…" : "✍️ Отправить заявку"}
      </button>
    </div>
  );
}
