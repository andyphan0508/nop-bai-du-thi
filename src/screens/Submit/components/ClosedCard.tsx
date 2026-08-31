import { FaFacebook } from "react-icons/fa";
import { MdEmojiEvents, MdVolunteerActivism } from "react-icons/md";

const FANPAGE_URL = "https://www.facebook.com/banthanhnienhttlsaigon";

type ClosedCardProps = {
  daysSinceEnd: number;
  endDateLabel: string;
  entryCount: number;
};

const ClosedCard = ({ daysSinceEnd, endDateLabel, entryCount }: ClosedCardProps) => {
  return (
    <div className="closed">
      <span className="closed-icon">
        <MdVolunteerActivism size={28} />
      </span>

      <div className="closed-kick">Đã khép lại nhận bài</div>

      <h2 className="closed-title">
        Úi, đã <span className="closed-days">{daysSinceEnd}</span> ngày rồi!
      </h2>
      <p className="closed-sub">
        kể từ ngày kết thúc nhận bài — <b>{endDateLabel}</b>
      </p>

      <p className="closed-thanks">
        Cảm ơn các bạn đã tham gia cuộc thi Thiết kế bìa cùng Ban Thanh Niên! 🙏
      </p>

      {entryCount > 0 && (
        <div className="order">
          <MdEmojiEvents size={18} />
          Ban tổ chức đã nhận {entryCount} bài dự thi
        </div>
      )}

      <a className="btn btn-tonal" href={FANPAGE_URL} target="_blank" rel="noreferrer">
        <FaFacebook size={18} />
        Theo dõi fanpage Ban Thanh Niên
      </a>
    </div>
  );
};

export default ClosedCard;
