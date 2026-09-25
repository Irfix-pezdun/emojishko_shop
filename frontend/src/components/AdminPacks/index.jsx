import { useMemo, useState } from "react";
import {
  createPack,
  updatePack,
  uploadPackEmoji,
  deletePackEmoji,
} from "../../api";
import { useTgs } from "../../lib/tgs";
import "./index.css";

function MiniTgs({ url }) {
  const ref = useTgs(url, { loop: false, autoplay: true });
  return <div className="admin-mini-tgs" ref={ref} />;
}

export default function AdminPacks({ packs, onPacksChange }) {
  const [selectedId, setSelectedId] = useState(null);
  const [title, setTitle] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const selected = useMemo(
    () => packs.find((p) => p.id === selectedId) || null,
    [packs, selectedId]
  );

  const select = (pack) => {
    setSelectedId(pack.id);
    setTitle(pack.title || "");
    setMsg("");
    setErr("");
  };

  const run = async (fn) => {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const data = await fn();
      onPacksChange?.(data.packs || []);
      setMsg("Сохранено");
      return data;
    } catch (e) {
      setErr(e.message || "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const saveTitle = () => {
    if (!selected || !title.trim()) return;
    run(() => updatePack(selected.id, { title: title.trim() }));
  };

  const setCover = (emoji) => {
    if (!selected) return;
    run(() => updatePack(selected.id, { cover: emoji.id }));
  };

  const onUpload = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selected) return;
    run(() => uploadPackEmoji(selected.id, file));
  };

  const onDeleteEmoji = (emoji) => {
    if (!selected) return;
    if (!confirm(`Удалить ${emoji.id}?`)) return;
    run(() => deletePackEmoji(selected.id, emoji.id));
  };

  const onCreate = () => {
    if (!newTitle.trim()) return;
    run(async () => {
      const data = await createPack({ title: newTitle.trim() });
      setNewTitle("");
      return data;
    });
  };

  return (
    <div className="screen admin-packs">
      <h2>Управление паками</h2>
      <p className="muted admin-packs__hint">
        Только для автора. На Render бесплатный диск может сбрасываться при деплое —
        важные паки лучше дублировать в Git.
      </p>

      <div className="admin-packs__create card">
        <div className="admin-packs__row">
          <input
            className="admin-input"
            placeholder="Название нового пака"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <button className="btn btn-primary" disabled={busy || !newTitle.trim()} onClick={onCreate}>
            Создать
          </button>
        </div>
      </div>

      <div className="admin-packs__list">
        {packs.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`admin-pack-item card ${selectedId === p.id ? "is-active" : ""}`}
            onClick={() => select(p)}
          >
            <MiniTgs url={p.cover_url} />
            <div>
              <div className="admin-pack-item__title">{p.title}</div>
              <div className="muted">{p.emoji?.length || 0} эмодзи · {p.id}</div>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="admin-packs__editor card">
          <h3>{selected.title}</h3>
          <label className="admin-label">Название</label>
          <div className="admin-packs__row">
            <input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} />
            <button className="btn btn-primary" disabled={busy} onClick={saveTitle}>
              Сохранить
            </button>
          </div>

          <label className="admin-label">Обложка (нажми эмодзи)</label>
          <div className="admin-emoji-grid">
            {(selected.emoji || []).map((e) => (
              <button
                key={e.id}
                type="button"
                className="admin-emoji-cell"
                onClick={() => setCover(e)}
                onContextMenu={(ev) => {
                  ev.preventDefault();
                  onDeleteEmoji(e);
                }}
              >
                <MiniTgs url={e.url} />
                <span className="muted">{e.id}</span>
              </button>
            ))}
          </div>

          <label className="admin-label">Добавить .tgs</label>
          <input type="file" accept=".tgs,application/octet-stream" onChange={onUpload} disabled={busy} />
          <p className="muted">Долгое нажатие / ПКМ по эмодзи — удалить</p>
        </div>
      )}

      {msg && <p className="admin-ok">{msg}</p>}
      {err && <p className="admin-err">{err}</p>}
    </div>
  );
}
