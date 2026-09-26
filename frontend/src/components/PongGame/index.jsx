import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTgs } from "../../lib/tgs";
import "./index.css";

const WIN_SCORE = 5;
const BALL_R = 18;
/** slower base so player can react */
const BASE_SPEED = 0.52;

function BallSkin({ url }) {
  const ref = useTgs(url, { loop: true, autoplay: true, active: Boolean(url) });
  return <div className="pong__ball-skin" ref={ref} />;
}

export default function PongGame({ packs, onClaimReward }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const ballLayerRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(0);
  const [score, setScore] = useState({ player: 0, bot: 0 });
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(null);
  const [ballUrl, setBallUrl] = useState(null);

  const emojiUrls = useMemo(() => {
    const p = (packs || []).find(
      (x) =>
        (x.id || "").toLowerCase().includes("irfix") ||
        (x.title || "").toLowerCase().includes("irfix") ||
        (x.tags || []).includes("free-ref")
    );
    return (p?.emoji || []).map((e) => e.url).filter(Boolean);
  }, [packs]);

  const randomBall = useCallback(() => {
    if (!emojiUrls.length) {
      setBallUrl(null);
      return;
    }
    setBallUrl(emojiUrls[Math.floor(Math.random() * emojiUrls.length)]);
  }, [emojiUrls]);

  const resetBall = useCallback(
    (st, toPlayer) => {
      const { W, H } = st;
      st.ball.x = W / 2;
      st.ball.y = H / 2;
      const speed = Math.min(W, H) * BASE_SPEED;
      const angle = (Math.random() * 0.45 - 0.225) * Math.PI;
      const dir = toPlayer ? -1 : 1;
      st.ball.vx = Math.cos(angle) * speed * dir;
      st.ball.vy = Math.sin(angle) * speed;
      randomBall();
    },
    [randomBall]
  );

  const initState = useCallback(
    (W, H) => {
      const ph = Math.max(56, H * 0.22);
      const st = {
        W,
        H,
        paddleH: ph,
        paddleW: 12,
        playerY: H / 2,
        botY: H / 2,
        ball: { x: W / 2, y: H / 2, vx: 0, vy: 0 },
        playerScore: 0,
        botScore: 0,
        targetPlayerY: H / 2,
        lastTs: 0,
      };
      resetBall(st, Math.random() > 0.5);
      stateRef.current = st;
      setScore({ player: 0, bot: 0 });
      setOver(null);
    },
    [resetBall]
  );

  const startGame = () => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.max(280, Math.floor(rect.width));
    const H = Math.floor(Math.min(W * 0.75, 440));
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    initState(W, H);
    setRunning(true);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !running) return;

    const move = (clientY) => {
      const st = stateRef.current;
      if (!st) return;
      const rect = canvas.getBoundingClientRect();
      const y = ((clientY - rect.top) / rect.height) * st.H;
      st.targetPlayerY = y;
    };

    const onPointer = (e) => {
      e.preventDefault();
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      move(y);
    };

    canvas.addEventListener("pointermove", onPointer);
    canvas.addEventListener("pointerdown", onPointer);
    canvas.addEventListener("touchmove", onPointer, { passive: false });
    canvas.addEventListener("touchstart", onPointer, { passive: false });
    return () => {
      canvas.removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("pointerdown", onPointer);
      canvas.removeEventListener("touchmove", onPointer);
      canvas.removeEventListener("touchstart", onPointer);
    };
  }, [running]);

  useEffect(() => {
    if (!running) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const loop = (ts) => {
      const st = stateRef.current;
      if (!st) return;
      if (!st.lastTs) st.lastTs = ts;
      let dt = (ts - st.lastTs) / 1000;
      st.lastTs = ts;
      dt = Math.min(dt, 0.033);

      const { W, H, paddleH, paddleW } = st;

      st.playerY += (st.targetPlayerY - st.playerY) * Math.min(1, dt * 18);
      st.playerY = Math.max(paddleH / 2, Math.min(H - paddleH / 2, st.playerY));

      // easier bot: slow reaction + big lag + misses more when ball is fast
      const reaction = 1.6;
      const error = Math.sin(ts / 280) * (paddleH * 0.28) + (Math.random() - 0.5) * 8;
      const botTarget = st.ball.y + error;
      const towardBot = st.ball.vx > 0 ? 0.85 : 0.2;
      st.botY += (botTarget - st.botY) * Math.min(1, dt * reaction * towardBot);
      st.botY = Math.max(paddleH / 2, Math.min(H - paddleH / 2, st.botY));

      st.ball.x += st.ball.vx * dt;
      st.ball.y += st.ball.vy * dt;

      if (st.ball.y < BALL_R) {
        st.ball.y = BALL_R;
        st.ball.vy *= -1;
      } else if (st.ball.y > H - BALL_R) {
        st.ball.y = H - BALL_R;
        st.ball.vy *= -1;
      }

      const hitPaddle = (px, py) => {
        const top = py - paddleH / 2;
        const bot = py + paddleH / 2;
        return (
          st.ball.y > top - BALL_R &&
          st.ball.y < bot + BALL_R &&
          Math.abs(st.ball.x - px) < paddleW / 2 + BALL_R
        );
      };

      if (st.ball.vx < 0 && st.ball.x < paddleW + BALL_R + 8) {
        if (hitPaddle(paddleW / 2 + 6, st.playerY)) {
          st.ball.x = paddleW + BALL_R + 8;
          const rel = (st.ball.y - st.playerY) / (paddleH / 2);
          const speed = Math.min(Math.hypot(st.ball.vx, st.ball.vy) * 1.04, Math.min(W, H) * 0.85);
          const ang = rel * 0.5;
          st.ball.vx = Math.abs(Math.cos(ang) * speed);
          st.ball.vy = Math.sin(ang) * speed;
        } else if (st.ball.x < -BALL_R) {
          st.botScore += 1;
          setScore({ player: st.playerScore, bot: st.botScore });
          if (st.botScore >= WIN_SCORE) {
            setOver("lose");
            setRunning(false);
            return;
          }
          resetBall(st, false);
        }
      }

      if (st.ball.vx > 0 && st.ball.x > W - paddleW - BALL_R - 8) {
        if (hitPaddle(W - paddleW / 2 - 6, st.botY)) {
          st.ball.x = W - paddleW - BALL_R - 8;
          const rel = (st.ball.y - st.botY) / (paddleH / 2);
          const speed = Math.min(Math.hypot(st.ball.vx, st.ball.vy) * 1.04, Math.min(W, H) * 0.85);
          const ang = rel * 0.5;
          st.ball.vx = -Math.abs(Math.cos(ang) * speed);
          st.ball.vy = Math.sin(ang) * speed;
        } else if (st.ball.x > W + BALL_R) {
          st.playerScore += 1;
          setScore({ player: st.playerScore, bot: st.botScore });
          if (st.playerScore >= WIN_SCORE) {
            setOver("win");
            setRunning(false);
            return;
          }
          resetBall(st, true);
        }
      }

      const layer = ballLayerRef.current;
      if (layer) {
        const sx = canvas.clientWidth / W;
        const sy = canvas.clientHeight / H;
        layer.style.left = `${st.ball.x * sx}px`;
        layer.style.top = `${st.ball.y * sy}px`;
      }

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#020b2e";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(100,180,255,0.4)";
      ctx.lineWidth = 2;
      ctx.strokeRect(2, 2, W - 4, H - 4);
      ctx.setLineDash([6, 10]);
      ctx.beginPath();
      ctx.moveTo(W / 2, 8);
      ctx.lineTo(W / 2, H - 8);
      ctx.strokeStyle = "rgba(150,200,255,0.3)";
      ctx.stroke();
      ctx.setLineDash([]);

      // crisp score
      ctx.imageSmoothingEnabled = false;
      ctx.font = "700 36px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
      ctx.fillStyle = "#e8f4ff";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.fillText(String(st.playerScore), W * 0.25, 14);
      ctx.fillText(String(st.botScore), W * 0.75, 14);

      ctx.fillStyle = "#7ec8ff";
      ctx.shadowColor = "rgba(80,160,255,0.55)";
      ctx.shadowBlur = 10;
      ctx.fillRect(6, st.playerY - paddleH / 2, paddleW, paddleH);
      ctx.fillRect(W - paddleW - 6, st.botY - paddleH / 2, paddleW, paddleH);
      ctx.shadowBlur = 0;

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, resetBall]);

  return (
    <div className="screen pong">
      <h2>Pong</h2>
      <p className="muted pong__hint">
        До {WIN_SCORE} очков · пальцем двигай левую ракетку · каждый розыгрыш — новый эмодзи IRFIX
      </p>

      <div className={`pong__stage${running || over ? " is-active" : ""}`} ref={wrapRef}>
        <canvas ref={canvasRef} className={`pong__canvas${running || over ? "" : " is-hidden"}`} />
        {running && (
          <div className="pong__ball-layer" ref={ballLayerRef}>
            {ballUrl ? <BallSkin url={ballUrl} /> : null}
          </div>
        )}
        {!running && !over && (
          <div className="pong__overlay pong__overlay--plain">
            <button type="button" className="btn btn-primary pong__play-btn" onClick={startGame}>
              Играть
            </button>
          </div>
        )}
        {over && (
          <div className="pong__overlay pong__overlay--plain">
            <p className="pong__result">{over === "win" ? "Победа! 🎉" : "Поражение"}</p>
            <p className="muted">
              {score.player} : {score.bot}
            </p>
            {over === "win" && (
              <button type="button" className="btn btn-primary" onClick={() => onClaimReward?.()}>
                Забрать награду
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={startGame}>
              Ещё раз
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
