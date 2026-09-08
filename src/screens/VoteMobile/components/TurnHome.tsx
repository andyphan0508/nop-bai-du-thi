import { MdEdit, MdFavorite, MdModeComment } from "react-icons/md";
import { turnActionOf, type TurnResult } from "../turnTypes";

type TurnHomeProps = {
  turn1: TurnResult;
  turn2: TurnResult;
  onStartTurn: (turn: 1 | 2) => void;
  onSubmit: () => void;
};

const TurnTile = ({
  label,
  turn,
  locked,
  onStart,
}: {
  label: string;
  turn: TurnResult;
  locked: boolean;
  onStart: () => void;
}) => {
  if (turn === "skipped") {
    return (
      <div className="turn-tile done">
        <div className="turn-tile-label">{label}</div>
        <div className="turn-tile-body">Đã bỏ qua</div>
        <button className="turn-tile-edit" type="button" onClick={onStart}>
          <MdEdit size={14} /> Đổi lựa chọn
        </button>
      </div>
    );
  }

  if (turn) {
    return (
      <div className="turn-tile done">
        <div className="turn-tile-label">{label}</div>
        <div className="turn-tile-body">
          {turn.action === "react" ? <MdFavorite size={18} /> : <MdModeComment size={17} />}
          {turn.action === "react" ? "Đã React cho" : "Đã bình luận cho"} <b>{turn.entry.title}</b>
        </div>
        <button className="turn-tile-edit" type="button" onClick={onStart}>
          <MdEdit size={14} /> Đổi lựa chọn
        </button>
      </div>
    );
  }

  return (
    <button className={`turn-tile${locked ? " locked" : ""}`} type="button" disabled={locked} onClick={onStart}>
      <div className="turn-tile-label">{label}</div>
      <div className="turn-tile-body">{locked ? "Hoàn thành lượt trước đã" : "Bấm để bắt đầu"}</div>
    </button>
  );
};

const TurnHome = ({ turn1, turn2, onStartTurn, onSubmit }: TurnHomeProps) => {
  const bothResolved = turn1 !== null && turn2 !== null;
  const nothingChosen = turnActionOf(turn1) === null && turnActionOf(turn2) === null;

  return (
    <div className="card">
      <TurnTile label="Lượt 1" turn={turn1} locked={false} onStart={() => onStartTurn(1)} />
      <TurnTile label="Lượt 2" turn={turn2} locked={turn1 === null} onStart={() => onStartTurn(2)} />

      {bothResolved && (
        <button className="btn" type="button" disabled={nothingChosen} onClick={onSubmit} style={{ marginTop: 8 }}>
          Xác nhận &amp; Gửi
        </button>
      )}

      {bothResolved && nothingChosen && (
        <p className="ballot-note-plain" style={{ textAlign: "center", marginTop: 10 }}>
          Bạn đã bỏ qua cả 2 lượt — không có gì để gửi.
        </p>
      )}
    </div>
  );
};

export default TurnHome;
