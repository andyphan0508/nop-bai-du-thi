import { useEffect, useMemo, useRef, useState } from "react";
import {
  MdSearch,
  MdClose,
  MdFavorite,
  MdModeComment,
  MdDescription,
  MdHowToVote,
  MdInfoOutline,
} from "react-icons/md";
import BackgroundDecor from "../Submit/components/BackgroundDecor";
import SubmitHeader from "../Submit/components/SubmitHeader";
import ToastStack, { type ToastItem } from "../Submit/components/Toast";
import VoteCard from "./components/VoteCard";
import VoteLightbox from "./components/VoteLightbox";
import EngageModal from "./components/EngageModal";
import VoteDoneCard from "./components/VoteDoneCard";
import AdminResultsPanel from "./components/AdminResultsPanel";
import { submissionApi } from "../../api/submissionApi";
import { IS_CONFIGURED } from "../../config";
import { getRecaptchaToken } from "../../utils/recaptcha";
import { readEngagedRecord, writeEngagedRecord, type EngagedRecord } from "../../utils/engagedRecord";
import type { EntryCommentsMap, VoteEntry } from "../../types";

const GROUP_OPTIONS = [
  "Tất cả",
  "Áp-ra-ham",
  "Ti-mô-thê",
  "Phao-lô",
  "Đa-ni-ên",
  "Nhóm ban ngành",
];

const VoteScreen = () => {
  const [entries, setEntries] = useState<VoteEntry[]>([]);
  const [comments, setComments] = useState<EntryCommentsMap>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<string>("Tất cả");
  const [selectedType, setSelectedType] = useState<string>("Tất cả");
  const [sortBy, setSortBy] = useState<"order" | "title" | "comments">("order");

  // Selection state
  const [reactTarget, setReactTarget] = useState<VoteEntry | null>(null);
  const [commentTarget, setCommentTarget] = useState<VoteEntry | null>(null);
  const [commentText, setCommentText] = useState<string>("");

  // Lightbox state (index based for Prev / Next)
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);

  // Engage modal state
  const [isEngageModalOpen, setIsEngageModalOpen] = useState<boolean>(false);
  const [isSubmittingEngage, setIsSubmittingEngage] = useState<boolean>(false);
  const [engageError, setEngageError] = useState<string | null>(null);

  const [engagedRecord, setEngagedRecord] = useState<EngagedRecord | null>(readEngagedRecord);

  const [isAdmin] = useState<boolean>(() => new URLSearchParams(window.location.search).has("admin"));

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef<number>(0);
  const pageLoadedAtRef = useRef<number>(Date.now());

  const showToast = (message: string, type: ToastItem["type"] = "error") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4500);
  };
  const dismissToast = (id: number) => setToasts((prev) => prev.filter((toast) => toast.id !== id));

  useEffect(() => {
    if (!IS_CONFIGURED) {
      setIsLoading(false);
      return;
    }
    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [entriesResponse, commentsResponse] = await Promise.all([
          submissionApi.getVoteEntries(),
          submissionApi.getComments(),
        ]);
        if (!entriesResponse.ok) throw new Error(entriesResponse.error || "Không tải được danh sách bài dự thi.");
        setEntries(entriesResponse.entries || []);
        setComments(commentsResponse.ok ? commentsResponse.comments || {} : {});
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleToggleReact = (entry: VoteEntry) => {
    if (engagedRecord) {
      showToast("Bạn đã hoàn tất lượt bình chọn của mình rồi — cảm ơn bạn!", "info");
      return;
    }
    setReactTarget((prev) => (prev?.id === entry.id ? null : entry));
  };

  const handleToggleComment = (entry: VoteEntry) => {
    if (engagedRecord) {
      showToast("Bạn đã hoàn tất lượt bình luận của mình rồi — cảm ơn bạn!", "info");
      return;
    }
    setCommentTarget((prev) => (prev?.id === entry.id ? null : entry));
    setCommentText("");
  };

  // Filtered and sorted entries
  const filteredEntries = useMemo(() => {
    let result = entries.map((entry, index) => ({ entry, originalIndex: index + 1 }));

    // Group filter
    if (selectedGroup !== "Tất cả") {
      result = result.filter(({ entry }) => entry.group === selectedGroup);
    }

    // Type filter
    if (selectedType !== "Tất cả") {
      result = result.filter(({ entry }) =>
        selectedType === "Nhóm" ? entry.entryType === "Làm nhóm" : entry.entryType !== "Làm nhóm",
      );
    }

    // Search query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        ({ entry }) =>
          entry.title.toLowerCase().includes(q) ||
          (entry.description && entry.description.toLowerCase().includes(q)) ||
          (entry.group && entry.group.toLowerCase().includes(q)),
      );
    }

    // Sort
    if (sortBy === "title") {
      result.sort((a, b) => a.entry.title.localeCompare(b.entry.title, "vi"));
    } else if (sortBy === "comments") {
      result.sort((a, b) => {
        const countA = (comments[a.entry.id] || []).length;
        const countB = (comments[b.entry.id] || []).length;
        return countB - countA;
      });
    }

    return result;
  }, [entries, comments, selectedGroup, selectedType, searchQuery, sortBy]);

  const handleConfirmEngage = async (googleIdToken: string, honeypot: string) => {
    if (!reactTarget && !commentTarget) return;
    if (commentTarget && !commentText.trim()) {
      setEngageError("Vui lòng nhập nội dung bình luận.");
      return;
    }
    setIsSubmittingEngage(true);
    setEngageError(null);
    try {
      const recaptchaToken = await getRecaptchaToken("engage");
      const response = await submissionApi.submitEngagement({
        reactEntryId: reactTarget?.id || "",
        commentEntryId: commentTarget?.id || "",
        commentText: commentTarget ? commentText.trim() : "",
        googleIdToken,
        recaptchaToken,
        hp: honeypot,
        elapsedMs: Date.now() - pageLoadedAtRef.current,
      });
      if (!response.ok) throw new Error(response.error || "Gửi tương tác thất bại.");

      const record: EngagedRecord = {
        reactedTitle: reactTarget?.title || null,
        commentedTitle: commentTarget?.title || null,
        at: new Date().toISOString(),
      };
      writeEngagedRecord(record);
      setEngagedRecord(record);
      setIsEngageModalOpen(false);
      showToast("Đã ghi nhận bình chọn — cảm ơn bạn đã tham gia!", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setEngageError(message);
      showToast(message);
    } finally {
      setIsSubmittingEngage(false);
    }
  };

  const totalPointsSelected = (reactTarget ? 2 : 0) + (commentTarget ? 1 : 0);

  // Active zoomed entry
  const activeZoomed = zoomIndex !== null && filteredEntries[zoomIndex] ? filteredEntries[zoomIndex] : null;

  return (
    <div style={{ minHeight: "100vh" }}>
      <BackgroundDecor />

      <div className="wrap">
        <SubmitHeader
          title="React & Bình chọn tác phẩm dự thi"
          subtitle="Mỗi tài khoản có 1 lượt React (2 điểm) + 1 lượt bình luận (1 điểm) dành tặng cho các bài thi bạn ấn tượng nhất."
          nav={
            <>
              <a className="nav-link" href="/">
                ← Về trang nộp bài
              </a>
              {" · "}
              <a className="nav-link" href="/binh-chon/mobile">
                Đang dùng điện thoại? Thử bản mobile gọn nhẹ →
              </a>
            </>
          }
        />

        {/* Banner tóm tắt điểm và thể lệ */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "10px",
            margin: "0 auto 16px",
            maxWidth: "720px",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#ffe4e8",
              color: "#e11d48",
              padding: "5px 12px",
              borderRadius: "999px",
              fontSize: "0.82rem",
              fontWeight: 700,
            }}
          >
            <MdFavorite size={15} /> 1 React = 2 điểm
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "var(--md-primary-container)",
              color: "var(--md-primary)",
              padding: "5px 12px",
              borderRadius: "999px",
              fontSize: "0.82rem",
              fontWeight: 700,
            }}
          >
            <MdModeComment size={15} /> 1 Bình luận = 1 điểm
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "var(--md-surface-container-high)",
              color: "var(--md-on-surface)",
              padding: "5px 12px",
              borderRadius: "999px",
              fontSize: "0.82rem",
              fontWeight: 600,
            }}
          >
            <MdDescription size={15} /> Chuẩn bản in khổ A3 (297 × 420mm)
          </span>
        </div>

        {!IS_CONFIGURED && (
          <div className="card">
            <div className="banner">Trang chưa cấu hình ENDPOINT (Apps Script). Xem HUONG-DAN.md.</div>
          </div>
        )}

        {IS_CONFIGURED && engagedRecord && (
          <div className="card" style={{ marginBottom: 24 }}>
            <VoteDoneCard reactedTitle={engagedRecord.reactedTitle} commentedTitle={engagedRecord.commentedTitle} />
          </div>
        )}

        {IS_CONFIGURED && (
          <>
            {engagedRecord && (
              <div className="section-head" style={{ marginTop: 20, marginBottom: 12 }}>
                <MdDescription size={18} />
                Triển lãm các tác phẩm dự thi (Khổ A3)
              </div>
            )}

            {isLoading && <div className="list-note">Đang tải danh sách tác phẩm khổ A3…</div>}

            {!isLoading && loadError && (
              <div className="card">
                <div className="msg err">{loadError}</div>
              </div>
            )}

            {!isLoading && !loadError && entries.length === 0 && (
              <div className="card">
                <div className="list-empty">Chưa có bài dự thi nào để tương tác.</div>
              </div>
            )}

            {!isLoading && !loadError && entries.length > 0 && (
              <>
                {/* Thanh tìm kiếm & bộ lọc */}
                <div className="vote-toolbar">
                  <div className="vote-toolbar-top">
                    <div className="vote-search-box">
                      <MdSearch className="vote-search-icon" size={20} />
                      <input
                        className="vote-search-input"
                        placeholder="Tìm theo tên tác phẩm, ý tưởng, nhóm…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <button
                          className="vote-search-clear"
                          type="button"
                          onClick={() => setSearchQuery("")}
                          title="Xoá tìm kiếm"
                        >
                          <MdClose size={18} />
                        </button>
                      )}
                    </div>

                    <div className="vote-filter-chips">
                      {GROUP_OPTIONS.map((grp) => (
                        <button
                          key={grp}
                          type="button"
                          className={`vote-filter-chip${selectedGroup === grp ? " active" : ""}`}
                          onClick={() => setSelectedGroup(grp)}
                        >
                          {grp}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="vote-toolbar-bottom">
                    <div>
                      Đang hiển thị{" "}
                      <span className="vote-count-badge">
                        {filteredEntries.length} / {entries.length}
                      </span>{" "}
                      tác phẩm khổ A3
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span>Sắp xếp:</span>
                      <select
                        className="vote-sort-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as "order" | "title" | "comments")}
                      >
                        <option value="order">Thứ tự nộp bài</option>
                        <option value="title">Tên tác phẩm (A-Z)</option>
                        <option value="comments">Nhiều bình luận nhất</option>
                      </select>
                    </div>
                  </div>
                </div>

                {filteredEntries.length === 0 ? (
                  <div className="card" style={{ textAlign: "center", padding: "36px 20px" }}>
                    <p style={{ color: "var(--md-on-surface-variant)", margin: 0 }}>
                      Không tìm thấy tác phẩm nào khớp với điều kiện lọc.
                    </p>
                    <button
                      className="btn btn-tonal"
                      type="button"
                      style={{ width: "auto", margin: "14px auto 0" }}
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedGroup("Tất cả");
                        setSelectedType("Tất cả");
                      }}
                    >
                      Xoá bộ lọc
                    </button>
                  </div>
                ) : (
                  <div className="vote-grid">
                    {filteredEntries.map(({ entry, originalIndex }, index) => (
                      <VoteCard
                        key={entry.id}
                        entry={entry}
                        order={originalIndex}
                        imgSrc={submissionApi.voteImageUrl(entry.imageFileId, 800)}
                        isReactSelected={
                          reactTarget?.id === entry.id ||
                          (Boolean(engagedRecord) && engagedRecord?.reactedTitle === entry.title)
                        }
                        isCommentSelected={
                          commentTarget?.id === entry.id ||
                          (Boolean(engagedRecord) && engagedRecord?.commentedTitle === entry.title)
                        }
                        commentText={commentTarget?.id === entry.id ? commentText : ""}
                        comments={comments[entry.id] || []}
                        onToggleReact={() => handleToggleReact(entry)}
                        onToggleComment={() => handleToggleComment(entry)}
                        onCommentTextChange={setCommentText}
                        onZoom={() => setZoomIndex(index)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {isAdmin && (
          <div style={{ marginTop: 24 }}>
            <AdminResultsPanel />
          </div>
        )}

        <div className="foot">© {new Date().getFullYear()} Ban Thanh Niên · HTTL Chi Hội Sài Gòn</div>
      </div>

      {/* Floating Action Dock dính đáy */}
      {(reactTarget || commentTarget) && !engagedRecord && (
        <div className="vote-actionbar">
          <div className="vote-actionbar-inner">
            <div className="vote-dock-items">
              {reactTarget && (
                <div className="vote-dock-slot">
                  <img
                    className="vote-dock-thumb"
                    src={submissionApi.voteImageUrl(reactTarget.imageFileId, 160)}
                    alt=""
                  />
                  <div className="vote-dock-text">
                    <span className="vote-dock-badge react">
                      <MdFavorite size={11} /> +2đ
                    </span>
                    <b>{reactTarget.title}</b>
                  </div>
                </div>
              )}

              {commentTarget && (
                <div className="vote-dock-slot">
                  <img
                    className="vote-dock-thumb"
                    src={submissionApi.voteImageUrl(commentTarget.imageFileId, 160)}
                    alt=""
                  />
                  <div className="vote-dock-text">
                    <span className="vote-dock-badge comment">
                      <MdModeComment size={11} /> +1đ
                    </span>
                    <b>{commentTarget.title}</b>
                  </div>
                </div>
              )}

              {/* Gợi ý nếu mới chọn 1 trong 2 */}
              {reactTarget && !commentTarget && (
                <span className="vote-dock-hint">
                  <MdInfoOutline size={12} style={{ verticalAlign: -1, marginRight: 3 }} />
                  Còn 1 lượt bình luận (1đ) chưa dùng!
                </span>
              )}
              {!reactTarget && commentTarget && (
                <span className="vote-dock-hint">
                  <MdInfoOutline size={12} style={{ verticalAlign: -1, marginRight: 3 }} />
                  Còn 1 lượt React (2đ) chưa dùng!
                </span>
              )}
            </div>

            <button
              className="btn"
              type="button"
              style={{ width: "auto", padding: "10px 20px", display: "inline-flex", alignItems: "center", gap: 6 }}
              onClick={() => setIsEngageModalOpen(true)}
            >
              <MdHowToVote size={18} />
              Xác nhận ({totalPointsSelected}đ)
            </button>
          </div>
        </div>
      )}

      {/* Lightbox chuẩn A3 với duyệt trái/phải */}
      {activeZoomed && (
        <VoteLightbox
          entry={activeZoomed.entry}
          order={activeZoomed.originalIndex}
          total={entries.length}
          imgSrc={submissionApi.voteImageUrl(activeZoomed.entry.imageFileId, 1600)}
          onClose={() => setZoomIndex(null)}
          onPrev={zoomIndex! > 0 ? () => setZoomIndex(zoomIndex! - 1) : undefined}
          onNext={zoomIndex! < filteredEntries.length - 1 ? () => setZoomIndex(zoomIndex! + 1) : undefined}
        />
      )}

      {isEngageModalOpen && (reactTarget || commentTarget) && (
        <EngageModal
          reactTarget={reactTarget}
          commentTarget={commentTarget}
          commentText={commentText}
          isSubmitting={isSubmittingEngage}
          errorMessage={engageError}
          onCancel={() => {
            if (isSubmittingEngage) return;
            setIsEngageModalOpen(false);
            setEngageError(null);
          }}
          onConfirm={handleConfirmEngage}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default VoteScreen;
