const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;

const isTelegram = Boolean(tg);

export function initTelegram() {
  if (!tg) return;
  tg.ready();
  tg.expand();
  try {
    tg.setHeaderColor("#0B0B1E");
    tg.setBackgroundColor("#05050B");
  } catch {
    // старые клиенты Telegram могут не поддерживать эти методы — не критично
  }
}

export function getInitData() {
  return tg?.initData ?? "";
}

export function getTelegramUser() {
  return tg?.initDataUnsafe?.user ?? null;
}

export function getThemeParams() {
  return tg?.themeParams ?? {};
}

export function openChat(username) {
  // fallback, если с API не пришёл AUTHOR_USERNAME
  const raw = (username || "IRFIX_Factor").trim();
  if (!raw) return;
  const clean = raw.replace(/^@/, "");
  const url = `https://t.me/${clean}`;
  try {
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(url);
      return;
    }
    if (tg?.openLink) {
      tg.openLink(url);
      return;
    }
  } catch (_) {
    /* fallback below */
  }
  window.open(url, "_blank");
}

export function haptic(kind = "light") {
  const h = tg?.HapticFeedback;
  if (!h) return;
  if (kind === "success" || kind === "error" || kind === "warning") {
    h.notificationOccurred(kind);
  } else {
    h.impactOccurred(kind);
  }
}

export function setBackButton(visible, onClick) {
  const btn = tg?.BackButton;
  if (!btn) return () => {};
  if (visible) {
    btn.show();
    btn.onClick(onClick);
  } else {
    btn.hide();
  }
  return () => btn.offClick(onClick);
}

export function setMainButton({ text, visible, onClick, disabled = false, color, textColor }) {
  const btn = tg?.MainButton;
  if (!btn) return () => {};
  btn.setText(text || "Продолжить");
  if (color) btn.color = color;
  if (textColor) btn.textColor = textColor;
  disabled ? btn.disable() : btn.enable();
  if (visible) {
    btn.show();
  } else {
    btn.hide();
  }
  btn.onClick(onClick);
  return () => btn.offClick(onClick);
}

export function hideMainButton() {
  tg?.MainButton?.hide();
}

export { isTelegram };
