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
      className={`game-reward__ref ${selected ? "is-selected" : ""}`}
      onClick={onClick}
    >
      <div className="game-reward__ref-anim" ref={ref} />
    </button>
  );
}

export default function GameReward({ channelUsername, authorUsername, packs = [] }) {
  const [state, setState] = useState("loading");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const [description, setDescription] = useState("");
  const [nick, setNick] = useState("");
  const [logo, setLogo] = useState("");
  const [colors, setColors] = useState("");
  const [refEmoji, setRefEmoji] = useState(null);
  const [code, setCode] = useState(null);

  const examples = useMemo(() => {
    const preferred = packs.filter(
      (p) =>
        (p.id || "").toLowerCase().includes("irfix") ||
        (p.title || "").toLowerCase().includes("irfix") ||
        (p.tags || []).includes("free-ref")
    );
    const source = preferred.length ? preferred : packs.slice(0, 1);
    const list = [];
    for (const pack of source) {
      for (const e of pack.emoji || []) {
        list.push({ packId: pack.id, emojiId: e.id, url: e.url });
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
    if (!nick.trim()) {
      setError("Укажи ник или имя для эмодзи.");
      return;
    }
    setChecking(true);
    setError(null);
    try {
      const res = await claimFreeEmoji({
        description: `[Pong победа] ${text}`,
        nick: nick.trim(),
        logo: logo.trim() || null,
        colors: colors.trim() || null,
        reference_emoji: refEmoji?.emojiId || null,
      });
      if (res.status === "claimed") {
        setCode(res.code || null);
        setState("claimed");
        haptic?.("success");
      } else if (res.status === "already_claimed") {
        setCode(res.code || null);
        setState("already_claimed");
      } else {
        setError("Не удалось оформить награду. Попробуй ещё раз.");
      }
    } catch (e) {
      setError(e?.message || "Ошибка сети");
    } finally {
      setChecking(false);
    }
  };

  if (state === "loading") {
    return (
      <div className="screen game-reward">
        <p className="muted">Загрузка…</p>
      </div>
    );
  }

  if (state === "claimed" || state === "already_claimed") {
    const isNew = state === "claimed";
    return (
      <div className="screen game-reward">
        <h2>{isNew ? "🎉 Награда оформлена!" : "Уже забирал эмодзи"}</h2>
        <p className="muted">
          {isNew
            ? "Напиши автору и отправь код — так он поймёт, что ты победил в Pong."
            : "Ранее уже была заявка. Напиши автору с кодом ниже."}
        </p>
        {code && (
          <div className="game-reward__code">
            <span>Код</span>
            <strong>{code}</strong>
          </div>
        )}
        {authorUsername && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => openChat(authorUsername)}
          >
            Написать автору
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="screen game-reward">
      <div className="game-reward__hero">
        <h2>🏆 Поздравляем!</h2>
        <p className="game-reward__sub">
          Ты выиграл в Pong. Заполни заявку — получишь <strong>1 эмодзи</strong> от автора.
        </p>
      </div>

      <label className="game-reward__label">Опиши желаемый эмодзи</label>
      <textarea
        className="game-reward__input"
        rows={3}
        placeholder="Например: улыбающийся кот с короной…"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <label className="game-reward__label">Ник / имя на эмодзи</label>
      <input
        className="game-reward__input"
        placeholder="@username или текст"
        value={nick}
        onChange={(e) => setNick(e.target.value)}
      />

      <label className="game-reward__label">Цвета (необязательно)</label>
      <input
        className="game-reward__input"
        placeholder="голубой, белый…"
        value={colors}
        onChange={(e) => setColors(e.target.value)}
      />

      <label className="game-reward__label">Лого / ссылка SVG (необязательно)</label>
      <input
        className="game-reward__input"
        placeholder="ссылка или описание"
        value={logo}
        onChange={(e) => setLogo(e.target.value)}
      />

      {examples.length > 0 && (
        <>
          <label className="game-reward__label">Похожий пример (тап)</label>
          <div className="game-reward__refs">
            {examples.slice(0, 24).map((ex) => (
              <RefThumb
                key={`${ex.packId}-${ex.emojiId}`}
                url={ex.url}
                selected={refEmoji?.emojiId === ex.emojiId}
                onClick={() => setRefEmoji(ex)}
              />
            ))}
          </div>
        </>
      )}

      {error && <p className="game-reward__error">{error}</p>}

      {channelUsername && (
        <p className="muted game-reward__note">
          Нужна подписка на канал @{channelUsername.replace(/^@/, "")}
        </p>
      )}

      <button
        type="button"
        className="btn btn-primary"
        disabled={checking}
        onClick={handleSubmit}
      >
        {checking ? "Отправка…" : "Забрать эмодзи"}
      </button>
    </div>
  );
}
