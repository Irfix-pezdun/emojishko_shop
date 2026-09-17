import { useTgs } from "../../lib/tgs";
import { openChat } from "../../telegram";
import "./index.css";

function Avatar({ url }) {
  const ref = useTgs(url, { loop: true, autoplay: true });
  return <div className="about__avatar" ref={ref} />;
}

export default function AboutDesigner({ authorUsername, avatarUrl, onOrder }) {
  return (
    <div className="screen about">
      {avatarUrl && <Avatar url={avatarUrl} />}

      <div>
        <h2>О дизайнере</h2>
        <p className="muted">Автор кастомных эмодзи-паков для Telegram</p>
      </div>

      <div className="card about__bio">
        <p>
          Рисую анимированные эмодзи-паки под конкретный проект, канал или команду — от минималистичных
          реакций до персонажей с характером. Каждый пак собирается индивидуально: без шаблонов и
          готовых заготовок.
        </p>
      </div>

      <div className="about__stats">
        <div className="card about__stat">
          <div className="about__stat-num">20+</div>
          <div className="muted">паков создано</div>
        </div>
        <div className="card about__stat">
          <div className="about__stat-num">500+</div>
          <div className="muted">эмодзи нарисовано</div>
        </div>
      </div>

      <div className="stack">
        <button className="btn btn-primary" onClick={onOrder}>
          Заказать пак
        </button>
        <button className="btn btn-secondary" onClick={() => openChat(authorUsername)}>
          Написать напрямую
        </button>
      </div>
    </div>
  );
}
