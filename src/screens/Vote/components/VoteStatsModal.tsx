import { useEffect, useState } from "react";
import {
  MdBarChart,
  MdClose,
  MdEmojiEvents,
  MdFavorite,
  MdGroups,
  MdModeComment,
  MdStars,
  MdVolunteerActivism,
} from "react-icons/md";
import { submissionApi } from "../../../api/submissionApi";
import type { EntryCommentsMap, VoteEntry, VoteRankedEntry, VoteStats } from "../../../types";

type VoteStatsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  entries: VoteEntry[];
  comments: EntryCommentsMap;
};

const MEDAL = ["🥇", "🥈", "🥉"];

// Dữ liệu dự phòng khi chưa gọi được server (chỉ tính được số bình luận —
// không có số React vì đó là dữ liệu riêng chỉ server mới đọc được).
const buildFallbackStats = (entries: VoteEntry[], comments: EntryCommentsMap): VoteStats => {
  const commentCounts: Record<string, number> = {};
  let totalComments = 0;
  for (const [id, list] of Object.entries(comments)) {
    commentCounts[id] = list.length;
    totalComments += list.length;
  }
  const ranked: VoteRankedEntry[] = entries.map((e) => ({
    id: e.id,
    title: e.title,
    group: e.group,
    points: commentCounts[e.id] || 0,
    reactCount: 0,
    commentCount: commentCounts[e.id] || 0,
    imageFileId: e.imageFileId,
  }));
  ranked.sort((a, b) => b.points - a.points);
  return {
    totalEntries: entries.length,
    totalVoters: 0,
    totalReacts: 0,
    totalComments,
    totalPoints: totalComments,
    rankedEntries: ranked,
    encouragementEntry: null,
  };
};

const PodiumCard = ({ rank, item }: { rank: 1 | 2 | 3; item: VoteRankedEntry }) => (
  <div className={`podium-card podium-card-${rank}`}>
    <span className="podium-medal">{MEDAL[rank - 1]}</span>
    {item.imageFileId && (
      <img className="podium-thumb" src={submissionApi.voteImageUrl(item.imageFileId, 240)} alt="" loading="lazy" />
    )}
    <div className="podium-title" title={item.title}>
      {item.title}
    </div>
    <div className="podium-score">
      <span>
        <MdFavorite size={12} /> {item.reactCount}
      </span>
      <span>
        <MdModeComment size={12} /> {item.commentCount}
      </span>
      <b>{item.points}đ</b>
    </div>
    <div className={`podium-block podium-block-${rank}`} />
  </div>
);

const VoteStatsModal = ({ isOpen, onClose, entries, comments }: VoteStatsModalProps) => {
  const [serverStats, setServerStats] = useState<VoteStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [revealStep, setRevealStep] = useState<number>(0); // 0=chưa gì, 1..3=hạng 1-2-3, 4=khuyến khích

  useEffect(() => {
    if (!isOpen) return;
    setRevealStep(0);
    setIsLoading(true);
    submissionApi
      .getVoteStats()
      .then((res) => {
        if (res.ok && res.stats) setServerStats(res.stats);
      })
      .catch(() => {
        // Giữ dữ liệu dự phòng từ client
      })
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const stats = serverStats || buildFallbackStats(entries, comments);
  const top3 = stats.rankedEntries.slice(0, 3);
  const hasEncouragement = Boolean(stats.encouragementEntry);
  const maxStep = hasEncouragement ? 4 : 3;
  const isDone = revealStep >= maxStep;

  const nextLabel =
    revealStep === 0
      ? "Bắt đầu"
      : revealStep === 1
        ? "Công bố Hạng 2 →"
        : revealStep === 2
          ? "Công bố Hạng 3 →"
          : revealStep === 3 && hasEncouragement
            ? "Công bố Giải Khuyến Khích →"
            : "Hoàn tất";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal stats-modal podium-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="stats-head-icon">
              <MdBarChart size={20} />
            </div>
            <div>
              <h2 className="modal-title" style={{ margin: 0, fontSize: "1.15rem" }}>
                Công Bố Kết Quả Bình Chọn
              </h2>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--md-on-surface-variant)" }}>
                {stats.totalVoters} người tham gia · {stats.totalReacts} React · {stats.totalComments} bình luận
              </p>
            </div>
          </div>
          <button className="modal-close" type="button" onClick={onClose} title="Đóng">
            <MdClose size={20} />
          </button>
        </div>

        {isLoading && !serverStats && <div className="list-note">Đang tải kết quả…</div>}

        {!isLoading && top3.length === 0 && (
          <p style={{ textAlign: "center", color: "var(--md-on-surface-variant)", padding: "20px 0" }}>
            Chưa có dữ liệu bình chọn.
          </p>
        )}

        {top3.length > 0 && revealStep === 0 && (
          <div className="podium-intro">
            <MdEmojiEvents size={56} color="var(--md-primary)" />
            <h3>Sẵn sàng để ra kết quả chưa?</h3>
            <p>Bấm "Bắt đầu" để lần lượt công bố Hạng 1, Hạng 2, Hạng 3 và Giải khuyến khích.</p>
          </div>
        )}

        {top3.length > 0 && revealStep > 0 && (
          <div className="podium-stage">
            <div className="podium-slot podium-slot-2">{revealStep >= 2 && top3[1] && <PodiumCard rank={2} item={top3[1]} />}</div>
            <div className="podium-slot podium-slot-1">{revealStep >= 1 && top3[0] && <PodiumCard rank={1} item={top3[0]} />}</div>
            <div className="podium-slot podium-slot-3">{revealStep >= 3 && top3[2] && <PodiumCard rank={3} item={top3[2]} />}</div>
          </div>
        )}

        {revealStep >= 4 && stats.encouragementEntry && (
          <div className="encouragement-card">
            <div className="encouragement-badge">
              <MdVolunteerActivism size={18} />
              Giải Khuyến Khích — Nội Dung Xuất Sắc
            </div>
            <div className="encouragement-body">
              {stats.encouragementEntry.imageFileId && (
                <img
                  src={submissionApi.voteImageUrl(stats.encouragementEntry.imageFileId, 160)}
                  alt=""
                  className="encouragement-thumb"
                />
              )}
              <div>
                <div className="encouragement-title">{stats.encouragementEntry.title}</div>
                <div className="encouragement-sub">
                  <MdModeComment size={13} /> {stats.encouragementEntry.commentCount} lời bình luận nhiều nhất
                  (ngoài top 3)
                </div>
              </div>
            </div>
          </div>
        )}

        {top3.length > 0 && (
          <div className="modal-actions" style={{ marginTop: 20 }}>
            {!isDone ? (
              <button className="btn" type="button" style={{ width: "100%" }} onClick={() => setRevealStep((s) => s + 1)}>
                <MdStars size={18} style={{ verticalAlign: -3, marginRight: 6 }} />
                {nextLabel}
              </button>
            ) : (
              <div style={{ display: "flex", gap: 10, width: "100%" }}>
                <button className="btn btn-tonal" type="button" style={{ flex: 1 }} onClick={() => setRevealStep(0)}>
                  <MdGroups size={16} style={{ verticalAlign: -3, marginRight: 6 }} />
                  Xem lại từ đầu
                </button>
                <button className="btn" type="button" style={{ flex: 1 }} onClick={onClose}>
                  Đóng
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoteStatsModal;
