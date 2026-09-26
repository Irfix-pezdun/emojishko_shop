import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTgs } from "../../lib/tgs";
import "./index.css";

const WIN_SCORE = 10;
const BALL_R = 14;

function pickIrfixEmojis(packs) {
  const p = (packs || []).find(
    (x) =>
      (x.id || "").toLowerCase().includes("irfix") ||
      (x.title || "").toLowerCase().includes("irfix") ||
      (x.tags || []).includes("free-ref")
  );
  return (p?.emoji || []).map((e) => e.url).filter(Boolean);
}

function BallSkin({ url }) {
  const ref = useTgs(url, { loop: true, autoplay: true, active: Boolean(url) });
  return <div className="pong__ball-skin" ref={ref} />;
}

export default function PongGame({ packs, onClaimReward }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(0);
  const [score, setScore] = useState({ player: 0, bot: 0 });
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(null); // 'win' | 'lose' | null
  const [ballUrl, setBallUrl] = useState(null);
  const [ballPos, setBallPos] = useState({ x: 0.5, y: 0.5 }); // normalized for overlay

  const emojiUrls = useMemo(() => pickIrfixEmojis(packs), [packs]);

  const randomBall = useCallback(() => {
    if (!emojiUrls.length) {
      setBallUrl(null);
      return;
    }
    const u = emojiUrls[Math.floor(Math.random() * emojiUrls.length)];
    setBallUrl(u);
  }, [emojiUrls]);

  const resetBall = useCallback(
    (st, toPlayer) => {
      const W = st.W;
      const H = st.H;
      st.ball.x = W / 2;
      st.ball.y = H / 2;
      const speed = Math.min(W, H) * 0.42;
      const angle = (Math.random() * 0.6 - 0.3) * Math.PI; // ±~30°
      const dir = toPlayer ? -1 : 1;
      st.ball.vx = Math.cos(angle) * speed * dir;
      st.ball.vy = Math.sin(angle) * speed;
      randomBall();
    },
    [randomBall]
  );

  const initState = useCallback(
    (W, H) => {
      const ph = Math.max(48, H * 0.18);
      const st = {
        W,
        H,
        paddleH: ph,
        paddleW: 10,
        playerY: H / 2,
        botY: H / 2,
        ball: { x: W / 2, y: H / 2, vx: 0, vy: 0 },
        playerScore: 0,
        botScore: 0,
        targetPlayerY: H / 2,
        lastTs: 0,
        serving: true,
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
    const W = Math.floor(rect.width);
    const H = Math.floor(Math.min(rect.width * 0.72, 420));
    canvas.width = W;
    canvas.height = H;
    initState(W, H);
    setRunning(true);
  };

  // pointer control
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

  // game loop
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

      // player paddle smooth
      st.playerY += (st.targetPlayerY - st.playerY) * Math.min(1, dt * 14);
      st.playerY = Math.max(paddleH / 2, Math.min(H - paddleH / 2, st.playerY));

      // fair bot: track ball with lag + small error
      const reaction = 3.2; // slower = more human
      const error = Math.sin(ts / 400) * (paddleH * 0.12);
      const botTarget = st.ball.y + error;
      // only move strongly when ball goes toward bot
      const towardBot = st.ball.vx > 0 ? 1 : 0.35;
      st.botY += (botTarget - st.botY) * Math.min(1, dt * reaction * towardBot);
      st.botY = Math.max(paddleH / 2, Math.min(H - paddleH / 2, st.botY));

      // ball
      st.ball.x += st.ball.vx * dt;
      st.ball.y += st.ball.vy * dt;

      // walls
      if (st.ball.y < BALL_R) {
        st.ball.y = BALL_R;
        st.ball.vy *= -1;
      } else if (st.ball.y > H - BALL_R) {
        st.ball.y = H - BALL_R;
        st.ball.vy *= -1;
      }

      // paddles
      const hitPaddle = (px, py) => {
        const top = py - paddleH / 2;
        const bot = py + paddleH / 2;
        return (
          st.ball.y > top - BALL_R &&
          st.ball.y < bot + BALL_R &&
          Math.abs(st.ball.x - px) < paddleW / 2 + BALL_R
        );
      };

      // player left
      if (st.ball.vx < 0 && st.ball.x < paddleW + BALL_R + 8) {
        if (hitPaddle(paddleW / 2 + 6, st.playerY)) {
          st.ball.x = paddleW + BALL_R + 8;
          const rel = (st.ball.y - st.playerY) / (paddleH / 2);
          const speed = Math.hypot(st.ball.vx, st.ball.vy) * 1.03;
          const ang = rel * 0.55;
          st.ball.vx = Math.cos(ang) * speed;
          st.ball.vy = Math.sin(ang) * speed;
          if (st.ball.vx < 0) st.ball.vx *= -1;
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

      // bot right
      if (st.ball.vx > 0 && st.ball.x > W - paddleW - BALL_R - 8) {
        if (hitPaddle(W - paddleW / 2 - 6, st.botY)) {
          st.ball.x = W - paddleW - BALL_R - 8;
          const rel = (st.ball.y - st.botY) / (paddleH / 2);
          const speed = Math.hypot(st.ball.vx, st.ball.vy) * 1.03;
          const ang = rel * 0.55;
          st.ball.vx = -Math.cos(ang) * speed;
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

      setBallPos({ x: st.ball.x / W, y: st.ball.y / H });

      // draw
      ctx.clearRect(0, 0, W, H);
      // field
      ctx.fillStyle = "#020b2e";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(100,180,255,0.35)";
      ctx.lineWidth = 2;
      ctx.strokeRect(2, 2, W - 4, H - 4);
      // center dashed
      ctx.setLineDash([6, 10]);
      ctx.beginPath();
      ctx.moveTo(W / 2, 8);
      ctx.lineTo(W / 2, H - 8);
      ctx.strokeStyle = "rgba(150,200,255,0.25)";
      ctx.stroke();
      ctx.setLineDash([]);
      // score
      ctx.font = "bold 28px monospace";
      ctx.fillStyle = "rgba(200,230,255,0.85)";
      ctx.textAlign = "center";
      ctx.fillText(String(st.playerScore), W * 0.25, 36);
      ctx.fillText(String(st.botScore), W * 0.75, 36);
      // paddles
      ctx.fillStyle = "#7ec8ff";
      ctx.shadowColor = "rgba(80,160,255,0.6)";
      ctx.shadowBlur = 12;
      ctx.fillRect(6, st.playerY - paddleH / 2, paddleW, paddleH);
      ctx.fillRect(W - paddleW - 6, st.botY - paddleH / 2, paddleW, paddleH);
      ctx.shadowBlur = 0;
      // ball fallback circle under emoji
      ctx.beginPath();
      ctx.arc(st.ball.x, st.ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(180,210,255,0.35)";
      ctx.fill();

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

      <div className="pong__stage" ref={wrapRef}>
        <canvas ref={canvasRef} className="pong__canvas" />
        {running && ballUrl && (
          <div
            className="pong__ball-layer"
            style={{
              left: `${ballPos.x * 100}%`,
              top: `${ballPos.y * 100}%`,
            }}
          >
            <BallSkin url={ballUrl} />
          </div>
        )}
        {!running && !over && (
          <div className="pong__overlay">
            <button type="button" className="btn btn-primary" onClick={startGame}>
              Играть
            </button>
          </div>
        )}
        {over && (
          <div className="pong__overlay">
            <p className="pong__result">{over === "win" ? "Победа! 🎉" : "Поражение"}</p>
            <p className="muted">
              {score.player} : {score.bot}
            </p>
            {over === "win" && (
              <button type="button" className="btn btn-primary" onClick={() => onClaimReward?.()}>
                Забрать эмодзи
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
