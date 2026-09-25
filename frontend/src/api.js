import { getInitData } from "./telegram";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export function assetUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  if (!API_BASE) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

function normalizePack(pack) {
  return {
    ...pack,
    cover_url: assetUrl(pack.cover_url),
    emoji: (pack.emoji || []).map((e) => ({
      ...e,
      url: assetUrl(e.url),
    })),
  };
}

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": getInitData(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    const msg =
      typeof detail.detail === "string"
        ? detail.detail
        : Array.isArray(detail.detail)
          ? detail.detail.map((d) => d.msg || JSON.stringify(d)).join("; ")
          : `Ошибка запроса: ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

export const getCatalog = async () => {
  const data = await request("/api/catalog");
  return {
    ...data,
    packs: (data.packs || []).map(normalizePack),
  };
};

export const getConfig = () => request("/api/config");
export const getStatus = () => request("/api/free-emoji/status");

/** @param {{ description: string, nick?: string, logo?: string, colors?: string, reference_emoji?: string, reference_pack?: string }} payload */
export const claimFreeEmoji = (payload) =>
  request("/api/free-emoji/claim", { method: "POST", body: payload });

export const submitOrder = (order) => request("/api/order", { method: "POST", body: order });
export const createOrder = submitOrder;

export async function updatePack(packId, body) {
  const data = await request(`/api/admin/packs/${encodeURIComponent(packId)}`, {
    method: "PATCH",
    body,
  });
  return { ...data, packs: (data.packs || []).map(normalizePack) };
}

export async function createPack(body) {
  const data = await request("/api/admin/packs", { method: "POST", body });
  return { ...data, packs: (data.packs || []).map(normalizePack) };
}

export async function uploadPackEmoji(packId, file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/admin/packs/${encodeURIComponent(packId)}/emoji`, {
    method: "POST",
    headers: { "X-Telegram-Init-Data": getInitData() },
    body: form,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(typeof detail.detail === "string" ? detail.detail : `Ошибка: ${res.status}`);
  }
  const data = await res.json();
  return { ...data, packs: (data.packs || []).map(normalizePack) };
}

export async function deletePackEmoji(packId, emojiId) {
  const data = await request(
    `/api/admin/packs/${encodeURIComponent(packId)}/emoji/${encodeURIComponent(emojiId)}`,
    { method: "DELETE" }
  );
  return { ...data, packs: (data.packs || []).map(normalizePack) };
}
