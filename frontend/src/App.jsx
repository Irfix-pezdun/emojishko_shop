import { useEffect, useMemo, useState } from "react";
import StarfieldBackground from "./components/StarfieldBackground";
import HomeMenu from "./components/HomeMenu";
import PortfolioGallery from "./components/PortfolioGallery";
import AboutDesigner from "./components/AboutDesigner";
import FreeEmojiOffer from "./components/FreeEmojiOffer";
import OrderForm from "./components/OrderForm";
import AdminPacks from "./components/AdminPacks";
import { initTelegram, setBackButton, getTelegramUser } from "./telegram";
import { getCatalog, getConfig } from "./api";

export default function App() {
  const [stack, setStack] = useState(["home"]);
  const [packs, setPacks] = useState([]);
  const [config, setConfig] = useState({
    channel_username: "",
    author_username: "",
    author_telegram_id: "",
  });
  const [orderPrefill, setOrderPrefill] = useState(null);

  const screen = stack[stack.length - 1];

  const isAdmin = useMemo(() => {
    const uid = getTelegramUser()?.id;
    const aid = String(config.author_telegram_id || "").trim();
    if (!uid || !aid) return false;
    return String(uid) === aid;
  }, [config.author_telegram_id]);

  useEffect(() => {
    initTelegram();
    getCatalog()
      .then((res) => setPacks(res.packs))
      .catch(() => setPacks([]));
    getConfig()
      .then(setConfig)
      .catch(() => {});
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
    () => packs.flatMap((p) => p.emoji.map((e) => e.url)),
    [packs]
  );

  return (
    <>
      {screen !== "home" && (
        <StarfieldBackground emojiUrls={backgroundEmojiUrls} density={0.5} />
      )}

      {screen === "home" && (
        <HomeMenu onNavigate={push} isAdmin={isAdmin} />
      )}

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
    </>
  );
}
