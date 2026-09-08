import { useEffect } from "react";
import { MdClose } from "react-icons/md";
import type { VoteEntry } from "../../../types";

type VoteLightboxProps = {
  entry: VoteEntry;
  imgSrc: string;
  onClose: () => void;
};

const VoteLightbox = ({ entry, imgSrc, onClose }: VoteLightboxProps) => {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="lightbox" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" title="Đóng" onClick={onClose}>
          <MdClose size={20} />
        </button>
        <img className="lightbox-img" src={imgSrc} alt={`Bìa dự thi: ${entry.title}`} />
        <div className="lightbox-caption">
          <b>{entry.title}</b>
        </div>
      </div>
    </div>
  );
};

export default VoteLightbox;
