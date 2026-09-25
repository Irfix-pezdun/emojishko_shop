import { useEffect, useRef } from "react";
import pako from "pako";
import lottie from "lottie-web/build/player/lottie_canvas";

// Кэш распакованных Lottie JSON по url
const dataCache = new Map();
const inflight = new Map();

async function fetchAnimationData(url) {
  if (dataCache.has(url)) return dataCache.get(url);
  if (inflight.has(url)) return inflight.get(url);

  const promise = fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`Не удалось загрузить ${url}: ${res.status}`);
      return res.arrayBuffer();
    })
    .then((buf) => {
      const json = pako.inflate(new Uint8Array(buf), { to: "string" });
      const data = JSON.parse(json);
      dataCache.set(url, data);
      inflight.delete(url);
      return data;
    })
    .catch((err) => {
      inflight.delete(url);
      throw err;
    });

  inflight.set(url, promise);
  return promise;
}

export async function mountTgs(container, url, { loop = true, autoplay = true } = {}) {
  if (!container) return null;
  const animationData = await fetchAnimationData(url);
  if (!container.isConnected) return null;

  const animation = lottie.loadAnimation({
    container,
    renderer: "canvas",
    loop,
    autoplay,
    animationData,
    rendererSettings: { clearCanvas: true, preserveAspectRatio: "xMidYMid meet" },
  });

  return {
    animation,
    destroy: () => animation.destroy(),
  };
}

export function preloadTgs(url) {
  if (!url) return Promise.resolve(null);
  return fetchAnimationData(url).catch(() => null);
}

/**
 * Параллельный preload с лимитом одновременных запросов.
 * onProgress(done, total) — для прогресс-бара.
 */
export async function preloadTgsMany(urls, { concurrency = 6, onProgress } = {}) {
  const list = [...new Set((urls || []).filter(Boolean))];
  const total = list.length;
  let done = 0;
  if (total === 0) {
    onProgress?.(0, 0);
    return;
  }

  let index = 0;
  async function worker() {
    while (index < list.length) {
      const i = index++;
      const url = list[i];
      try {
        await preloadTgs(url);
      } catch {
        /* ignore */
      }
      done += 1;
      onProgress?.(done, total);
    }
  }

  const n = Math.min(concurrency, list.length);
  await Promise.all(Array.from({ length: n }, () => worker()));
}

export function isTgsCached(url) {
  return Boolean(url && dataCache.has(url));
}

export function useTgs(url, { loop = true, autoplay = true, active = true } = {}) {
  const containerRef = useRef(null);
  const handleRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (!url || !active) return undefined;

    mountTgs(containerRef.current, url, { loop, autoplay }).then((handle) => {
      if (cancelled || !handle) {
        handle?.destroy();
        return;
      }
      handleRef.current = handle;
    });

    return () => {
      cancelled = true;
      handleRef.current?.destroy();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, loop, autoplay, active]);

  return containerRef;
}
