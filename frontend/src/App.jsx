import { useEffect, useMemo, useState } from "react";
import StarfieldBackground from "./components/StarfieldBackground";
import HomeMenu from "./components/HomeMenu";
import PortfolioGallery from "./components/PortfolioGallery";
import AboutDesigner from "./components/AboutDesigner";
import FreeEmojiOffer from "./components/FreeEmojiOffer";
import OrderForm from "./components/OrderForm";
import AdminPacks from "./components/AdminPacks";
import PongGame from "./components/PongGame";
import { initTelegram, setBackButton, getTelegramUser } from "./telegram";
import { getCatalog, getConfig } from "./api";
import { preloadTgsMany, useTgs, preloadTgs } from "./lib/tgs";

function BootScreen({ progress, label, emojiUrl }) {
  const pct = Math.round((progress || 0) * 100);
  const ref = useTgs(emojiUrl, { loop: true, autoplay: true, active: Boolean(emojiUrl) });
  return (
    <div className="boot-screen">
      <div className="boot-screen__emoji" ref={ref} />
      {!emojiUrl && <div className="boot-screen__logo">IRFIX</div>}
      <p className="boot-screen__label">{label || "Готовим эмодзи…"}</p>
      <div className="boot-screen__bar">
        <div className="boot-screen__bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="boot-screen__pct muted">{pct}%</p>
    </div>
  );
}

function pickIrfixBootEmoji(packs) {
  const irfix = (packs || []).find(
    (p) =>
      (p.id || "").toLowerCase().includes("irfix") ||
      (p.title || "").toLowerCase().includes("irfix") ||
      (p.tags || []).includes("free-ref")
  );
  if (!irfix) return null;
  // обложка пака, иначе первый эмодзи
  return irfix.cover_url || irfix.emoji?.[0]?.url || null;
}

/** Приоритет: обложки всех паков + весь IRFIX (FREE-референсы) */
function collectPriorityUrls(packs) {
  const urls = [];
  for (const p of packs || []) {
    if (p.cover_url) urls.push(p.cover_url);
    const isIrfix =
      (p.id || "").toLowerCase().includes("irfix") ||
      (p.title || "").toLowerCase().includes("irfix") ||
      (p.tags || []).includes("free-ref");
    if (isIrfix) {
      for (const e of p.emoji || []) {
        if (e.url) urls.push(e.url);
      }
    }
  }
  return urls;
}

export default function App() {
  const [stack, setStack] = useState(["home"]);
  const [packs, setPacks] = useState([]);
  const [config, setConfig] = useState({
    channel_username: "",
    author_username: "",
    author_telegram_id: "",
  });
  const [orderPrefill, setOrderPrefill] = useState(null);
  const [booting, setBooting] = useState(true);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootLabel, setBootLabel] = useState("Загрузка каталога…");
  const [bootEmojiUrl, setBootEmojiUrl] = useState(null);

  const screen = stack[stack.length - 1];

  const isAdmin = useMemo(() => {
    const uid = getTelegramUser()?.id;
    const aid = String(config.author_telegram_id || "").trim();
    if (!uid || !aid) return false;
    return String(uid) === aid;
  }, [config.author_telegram_id]);

  useEffect(() => {
    let cancelled = false;
    initTelegram();

    (async () => {
      try {
        setBootLabel("Загрузка каталога…");
        setBootProgress(0.05);
        const [catalog, cfg] = await Promise.all([
          getCatalog().catch(() => ({ packs: [] })),
          getConfig().catch(() => ({})),
        ]);
        if (cancelled) return;
        const nextPacks = catalog.packs || [];
        setPacks(nextPacks);
        setConfig((c) => ({ ...c, ...cfg }));

        const bootEmoji = pickIrfixBootEmoji(nextPacks);
        if (bootEmoji) {
          setBootEmojiUrl(bootEmoji);
          // сначала эта эмодзи — чтобы сразу крутилась на сплэше
          await preloadTgs(bootEmoji);
        }

        const priority = collectPriorityUrls(nextPacks);
        setBootLabel(
          priority.length
            ? `Кэшируем эмодзи (${priority.length})…`
            : "Почти готово…"
        );
        await preloadTgsMany(priority, {
          concurrency: 6,
          onProgress: (done, total) => {
            if (cancelled || !total) return;
            // 5%…100%
            setBootProgress(0.05 + 0.95 * (done / total));
          },
        });
      } finally {
        if (!cancelled) {
          setBootProgress(1);
          setBooting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return setBackButton(stack.length > 1, () => setStack((s) => s.slice(0, -1)));
  }, [stack.length]);

  const push = (name) => setStack((s) => [...s, name]);
  const goHome = () => setStack(["home"]);

  const openOrder = (styleHint) => {
    setOrderPrefill(styleHint || null);
    push("order");
  };

  const backgroundEmojiUrls = useMemo(
    () => packs.flatMap((p) => (p.emoji || []).slice(0, 2).map((e) => e.url)),
    [packs]
  );

  if (booting) {
    return <BootScreen progress={bootProgress} label={bootLabel} emojiUrl={bootEmojiUrl} />;
  }

  return (
    <>
      {screen !== "home" && (
        <StarfieldBackground emojiUrls={backgroundEmojiUrls} density={0.5} />
      )}

      {screen === "home" && <HomeMenu onNavigate={push} isAdmin={isAdmin} />}

      {screen === "portfolio" && (
        <PortfolioGallery packs={packs} onOrderSimilar={openOrder} />
      )}

      {screen === "about" && (
        <AboutDesigner
          authorUsername={config.author_username}
          avatarUrl={packs[0]?.cover_url}
          onOrder={() => openOrder(null)}
        />
      )}

      {screen === "free-emoji" && (
        <FreeEmojiOffer
          channelUsername={config.channel_username}
          authorUsername={config.author_username}
          packs={packs}
          onOrder={() => openOrder(null)}
        />
      )}

      {screen === "order" && <OrderForm prefillStyle={orderPrefill} onDone={goHome} />}

      {screen === "admin" && isAdmin && (
        <AdminPacks packs={packs} onPacksChange={setPacks} />
      )}

      {screen === "games" && (
        <PongGame
          packs={packs}
          onClaimReward={() => {
            setOrderPrefill(null);
            setStack((s) => {
              // убрать games, открыть free-emoji
              const base = s.filter((x) => x !== "games");
              return [...base, "free-emoji"];
            });
          }}
        />
      )}
    </>
  );
}
