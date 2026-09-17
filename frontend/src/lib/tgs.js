import { useEffect, useRef } from "react";
import pako from "pako";
import lottie from "lottie-web/build/player/lottie_canvas";

// Кэш распакованных Lottie JSON по url — один и тот же эмодзи может одновременно
// использоваться и в фоне, и в галерее, незачем качать/распаковывать его дважды.
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

/**
 * Создаёт и запускает lottie-анимацию из .tgs файла в переданном DOM-контейнере.
 * Использует canvas-рендерер (легче svg для десятков одновременных анимаций).
 * Возвращает объект { animation, destroy } либо null, если контейнер уже размонтирован.
 */
export async function mountTgs(container, url, { loop = true, autoplay = true } = {}) {
  if (!container) return null;
  const animationData = await fetchAnimationData(url);
  if (!container.isConnected) return null; // контейнер могли размонтировать пока грузили файл

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
  return fetchAnimationData(url).catch(() => null);
}

/**
 * React-хук: монтирует TGS-анимацию в элемент, на который указывает возвращённый ref.
 * Сама следит за жизненным циклом (перезапускает при смене url, чистит при анмаунте).
 */
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
