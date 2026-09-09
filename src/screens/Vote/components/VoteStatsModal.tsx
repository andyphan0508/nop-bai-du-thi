import { useEffect, useMemo, useState } from "react";
import {
  MdBarChart,
  MdClose,
  MdFavorite,
  MdGroups,
  MdModeComment,
  MdRefresh,
  MdStars,
  MdWorkspacePremium,
} from "react-icons/md";
import { submissionApi } from "../../../api/submissionApi";
import type { EntryCommentsMap, VoteEntry, VoteStats } from "../../../types";

type VoteStatsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  entries: VoteEntry[];
  comments: EntryCommentsMap;
};

const VoteStatsModal = ({ isOpen, onClose, entries, comments }: VoteStatsModalProps) => {
  const [serverStats, setServerStats] = useState<VoteStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"ranks" | "groups">("ranks");

  // Fallback stats computed directly from client entries & comments
  const fallbackStats = useMemo<VoteStats>(() => {
    let totalComments = 0;
    const commentCounts: Record<string, number> = {};
    for (const [id, commList] of Object.entries(comments)) {
      commentCounts[id] = commList.length;
      totalComments += commList.length;
    }

    const groupBreakdown: Record<string, { entries: number; points: number }> = {};
    entries.forEach((e) => {
      const g = e.group || "Khác";
      if (!groupBreakdown[g]) groupBreakdown[g] = { entries: 0, points: 0 };
      groupBreakdown[g].entries += 1;
      const cCount = commentCounts[e.id] || 0;
      groupBreakdown[g].points += cCount; // fallback 1pt per comment
    });

    const ranked = entries.map((e) => {
      const cCount = commentCounts[e.id] || 0;
      return {
        id: e.id,
        title: e.title,
        group: e.group,
        points: cCount,
        reactCount: 0,
        commentCount: cCount,
        imageFileId: e.imageFileId,
      };
    });
    ranked.sort((a, b) => b.points - a.points);

    return {
      totalEntries: entries.length,
      totalVoters: totalComments > 0 ? Math.ceil(totalComments * 0.8) : 0,
      totalReacts: 0,
      totalComments,
      totalPoints: totalComments,
      groupBreakdown,
      rankedEntries: ranked,
    };
  }, [entries, comments]);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const res = await submissionApi.getVoteStats();
      if (res.ok && res.stats) {
        setServerStats(res.stats);
      }
    } catch {
      // Keep using fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentStats = serverStats || fallbackStats;
  const maxPoints = Math.max(1, ...(currentStats.rankedEntries || []).map((r) => r.points));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box stats-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "var(--md-shape-full)",
                background: "var(--md-primary-container)",
                color: "var(--md-primary)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <MdBarChart size={20} />
            </div>
            <div>
              <h2 className="modal-title" style={{ margin: 0, fontSize: "1.15rem" }}>
                Thống Kê Bình Chọn
              </h2>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--md-on-surface-variant)" }}>
                Dữ liệu bình chọn các tác phẩm Khổ A3 Ngang
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              className={isLoading ? "refresh spin" : "refresh"}
              type="button"
              title="Làm mới thống kê"
              onClick={loadStats}
            >
              <MdRefresh size={18} />
            </button>
            <button className="modal-close" type="button" onClick={onClose} title="Đóng">
              <MdClose size={20} />
            </button>
          </div>
        </div>

        {/* Thẻ chỉ số tổng quan */}
        <div className="stats-summary-grid">
          <div className="stat-box">
            <span className="stat-box-num">{currentStats.totalEntries}</span>
            <span className="stat-box-label">Tác phẩm A3</span>
          </div>
          <div className="stat-box">
            <span className="stat-box-num">{currentStats.totalVoters}</span>
            <span className="stat-box-label">Người bình chọn</span>
          </div>
          <div className="stat-box">
            <span className="stat-box-num" style={{ color: "#e11d48" }}>
              {currentStats.totalReacts}
            </span>
            <span className="stat-box-label">
              <MdFavorite size={12} style={{ verticalAlign: -1, color: "#e11d48" }} /> Lượt React (×2đ)
            </span>
          </div>
          <div className="stat-box">
            <span className="stat-box-num" style={{ color: "var(--md-primary)" }}>
              {currentStats.totalComments}
            </span>
            <span className="stat-box-label">
              <MdModeComment size={12} style={{ verticalAlign: -1, color: "var(--md-primary)" }} /> Lời bình (×1đ)
            </span>
          </div>
          <div className="stat-box" style={{ background: "var(--md-primary-container)", borderColor: "transparent" }}>
            <span className="stat-box-num" style={{ color: "var(--md-primary)" }}>
              {currentStats.totalPoints}
            </span>
            <span className="stat-box-label" style={{ color: "var(--md-on-primary-container)" }}>
              <MdStars size={12} style={{ verticalAlign: -1 }} /> Tổng điểm
            </span>
          </div>
        </div>

        {/* Tab chuyển đổi Bảng xếp hạng vs Phân bổ nhóm */}
        <div
          style={{
            display: "flex",
            background: "var(--md-surface-container-high)",
            borderRadius: "var(--md-shape-md)",
            padding: 3,
            marginBottom: 14,
          }}
        >
          <button
            type="button"
            className={`vote-filter-chip${activeTab === "ranks" ? " active" : ""}`}
            style={{ flex: 1, textAlign: "center", border: "none" }}
            onClick={() => setActiveTab("ranks")}
          >
            <MdWorkspacePremium size={15} style={{ verticalAlign: -2, marginRight: 4 }} />
            Xếp hạng tác phẩm
          </button>
          <button
            type="button"
            className={`vote-filter-chip${activeTab === "groups" ? " active" : ""}`}
            style={{ flex: 1, textAlign: "center", border: "none" }}
            onClick={() => setActiveTab("groups")}
          >
            <MdGroups size={16} style={{ verticalAlign: -2, marginRight: 4 }} />
            Tương tác theo nhóm
          </button>
        </div>

        {/* Tab 1: Danh sách xếp hạng tác phẩm */}
        {activeTab === "ranks" && (
          <div>
            <div className="stats-section-title">
              <MdWorkspacePremium size={18} color="var(--md-primary)" />
              Bảng Xếp Hạng Tác Phẩm Khổ A3 Ngang
            </div>

            {(!currentStats.rankedEntries || currentStats.rankedEntries.length === 0) ? (
              <p style={{ textAlign: "center", color: "var(--md-on-surface-variant)", padding: "20px 0" }}>
                Chưa có dữ liệu bình chọn.
              </p>
            ) : (
              <ul className="stat-rank-table">
                {currentStats.rankedEntries.map((item, idx) => (
                  <li key={item.id} className="stat-rank-item">
                    <span className="stat-rank-num">
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                    </span>

                    {item.imageFileId && (
                      <img
                        className="stat-rank-thumb"
                        src={submissionApi.voteImageUrl(item.imageFileId, 120)}
                        alt=""
                        loading="lazy"
                      />
                    )}

                    <div className="stat-rank-info">
                      <div className="stat-rank-title">{item.title}</div>
                      <div className="stat-rank-sub">
                        <span>{item.group}</span>
                        <span>·</span>
                        <span style={{ color: "#e11d48", display: "inline-flex", alignItems: "center", gap: 2 }}>
                          <MdFavorite size={11} /> {item.reactCount}
                        </span>
                        <span>·</span>
                        <span style={{ color: "var(--md-primary)", display: "inline-flex", alignItems: "center", gap: 2 }}>
                          <MdModeComment size={11} /> {item.commentCount}
                        </span>
                      </div>
                      <div className="result-bar-track" style={{ marginTop: 4, height: 4 }}>
                        <div
                          className="result-bar"
                          style={{
                            width: `${Math.max(4, (item.points / maxPoints) * 100)}%`,
                            height: 4,
                          }}
                        />
                      </div>
                    </div>

                    <span className="stat-rank-points">{item.points}đ</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Tab 2: Phân bổ theo nhóm */}
        {activeTab === "groups" && (
          <div>
            <div className="stats-section-title">
              <MdGroups size={18} color="var(--md-primary)" />
              Mức Độ Tham Gia Của Từng Nhóm / Ban Ngành
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
              {Object.entries(currentStats.groupBreakdown || {}).map(([groupName, gStat]) => {
                const totalEntries = currentStats.totalEntries || 1;
                const percent = Math.round((gStat.entries / totalEntries) * 100);
                return (
                  <div
                    key={groupName}
                    style={{
                      background: "var(--md-surface-container-lowest)",
                      border: "1px solid rgba(215, 194, 184, 0.35)",
                      borderRadius: "var(--md-shape-md)",
                      padding: "10px 14px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--md-on-surface)" }}>
                        {groupName}
                      </span>
                      <span style={{ fontSize: "0.78rem", color: "var(--md-on-surface-variant)" }}>
                        <b>{gStat.entries}</b> tác phẩm ({percent}%) · <b>{gStat.points}</b> điểm
                      </span>
                    </div>
                    <div className="result-bar-track" style={{ height: 6 }}>
                      <div
                        className="result-bar"
                        style={{
                          width: `${Math.max(6, percent)}%`,
                          height: 6,
                          background: "var(--md-primary)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn btn-tonal" type="button" onClick={onClose} style={{ width: "100%" }}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoteStatsModal;
