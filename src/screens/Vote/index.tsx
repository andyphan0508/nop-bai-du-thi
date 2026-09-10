import { useEffect, useMemo, useRef, useState } from "react";
import {
  MdSearch,
  MdClose,
  MdFavorite,
  MdModeComment,
  MdDescription,
  MdHowToVote,
  MdInfoOutline,
  MdBarChart,
  MdRefresh,
} from "react-icons/md";
import BackgroundDecor from "../Submit/components/BackgroundDecor";
import SubmitHeader from "../Submit/components/SubmitHeader";
import ToastStack, { type ToastItem } from "../Submit/components/Toast";
import VoteCard from "./components/VoteCard";
import VoteLightbox from "./components/VoteLightbox";
import EngageModal from "./components/EngageModal";
import VoteDoneCard from "./components/VoteDoneCard";
import VoteStatsModal from "./components/VoteStatsModal";
import AdminResultsPanel from "./components/AdminResultsPanel";
import { submissionApi } from "../../api/submissionApi";
import { IS_CONFIGURED } from "../../config";
import { getRecaptchaToken } from "../../utils/recaptcha";
import { readEngagedRecord, writeEngagedRecord, type EngagedRecord } from "../../utils/engagedRecord";
import { COMMENT_MIN_WORDS, countWords } from "../../utils/wordCount";
import type { EntryCommentsMap, VoteEntry } from "../../types";

const VoteScreen = () => {
  const [entries, setEntries] = useState<VoteEntry[]>([]);
  const [comments, setComments] = useState<EntryCommentsMap>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
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
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);

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

  const fetchData = async () => {
    if (!IS_CONFIGURED) {
      setIsLoading(false);
      return;
    }
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
  };

  useEffect(() => {
    fetchData();
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
          (entry.description && entry.description.toLowerCase().includes(q)),
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
  }, [entries, comments, selectedType, searchQuery, sortBy]);

  const handleConfirmEngage = async (googleIdToken: string, honeypot: string) => {
    if (!reactTarget && !commentTarget) return;
    if (commentTarget && countWords(commentText) < COMMENT_MIN_WORDS) {
      setEngageError(`Bình luận cần tối thiểu ${COMMENT_MIN_WORDS} từ (đang có ${countWords(commentText)} từ).`);
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
            <a className="nav-link" href="/binh-chon/mobile">
              Đang dùng điện thoại? Thử bản mobile gọn nhẹ →
            </a>
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
            <MdDescription size={15} /> Khổ A3 Ngang (420 × 297mm)
          </span>
        </div>

        {!IS_CONFIGURED && (
          <div className="card">
            <div className="banner">Trang chưa cấu hình ENDPOINT (Apps Script). Xem HUONG-DAN.md.</div>
          </div>
        )}

        {IS_CONFIGURED && engagedRecord && (
          <div className="card" style={{ marginBottom: 24 }}>
            <VoteDoneCard
              reactedTitle={engagedRecord.reactedTitle}
              commentedTitle={engagedRecord.commentedTitle}
              onViewStats={() => setIsStatsOpen(true)}
            />
          </div>
        )}

        {IS_CONFIGURED && (
          <>
            {engagedRecord && (
              <div className="section-head" style={{ marginTop: 20, marginBottom: 12 }}>
                <MdDescription size={18} />
                Triển lãm các tác phẩm dự thi (Khổ A3 Ngang)
              </div>
            )}

            {isLoading && <div className="list-note">Đang tải danh sách tác phẩm khổ A3 Ngang…</div>}

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
                        placeholder="Tìm theo tên tác phẩm, ý tưởng…"
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
                  </div>

                  <div className="vote-toolbar-bottom">
                    <div>
                      Đang hiển thị{" "}
                      <span className="vote-count-badge">
                        {filteredEntries.length} / {entries.length}
                      </span>{" "}
                      tác phẩm khổ A3 Ngang
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button
                        className={isLoading ? "refresh spin" : "refresh"}
                        type="button"
                        onClick={fetchData}
                        title="Tải lại danh sách bài dự thi (xoá cache)"
                        style={{
                          border: "1px solid rgba(215, 194, 184, 0.45)",
                          width: 32,
                          height: 32,
                        }}
                      >
                        <MdRefresh size={18} />
                      </button>

                      <button
                        className="btn btn-tonal"
                        type="button"
                        style={{
                          width: "auto",
                          padding: "6px 12px",
                          fontSize: "0.82rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                        onClick={() => setIsStatsOpen(true)}
                        title="Xem thống kê tổng quan và xếp hạng bình chọn"
                      >
                        <MdBarChart size={16} />
                        Thống kê
                      </button>

                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
                        setSelectedType("Tất cả");
                      }}
                    >
                      Xoá bộ lọc
                    </button>
                  </div>
                ) : (
                  <div className="vote-grid">
                    {filteredEntries.map(({ entry, originalIndex }, index) => {
                      const isReactChosenForThis =
                        reactTarget?.id === entry.id ||
                        (Boolean(engagedRecord) && engagedRecord?.reactedTitle === entry.title);
                      const isCommentChosenForThis =
                        commentTarget?.id === entry.id ||
                        (Boolean(engagedRecord) && engagedRecord?.commentedTitle === entry.title);
                      const isThisEntryVoted = isReactChosenForThis || isCommentChosenForThis;
                      const hasReactSelection = Boolean(reactTarget);
                      const hasCommentSelection = Boolean(commentTarget);
                      const isAlreadyEngaged = Boolean(engagedRecord);

                      // 1. Khi người dùng select lượt react: các bài còn lại disable nút react và chỉ hiển thị comment
                      // 2. Ngược lại, khi select lượt comment: các bài còn lại disable nút comment và chỉ hiển thị react
                      const hideReact =
                        !isAlreadyEngaged && !isThisEntryVoted && hasReactSelection && !hasCommentSelection;
                      const hideComment =
                        !isAlreadyEngaged && !isThisEntryVoted && hasCommentSelection && !hasReactSelection;

                      // 3. Bài nào đã vote 1 trong 2 thì disable cả 2 của bài đó luôn
                      // Ngoài ra, nếu lượt đó đã được dùng ở bài khác hoặc đã nộp thì cũng disable
                      const disableReact = isAlreadyEngaged || isThisEntryVoted || hasReactSelection;
                      const disableComment = isAlreadyEngaged || isThisEntryVoted || hasCommentSelection;

                      // Cho phép hủy chọn trực tiếp trên thẻ đối với bài đang được chọn trong phiên hiện tại
                      const canDeselectThis =
                        !isAlreadyEngaged &&
                        (reactTarget?.id === entry.id || commentTarget?.id === entry.id);
                      const handleDeselectThis = canDeselectThis
                        ? () => {
                            if (reactTarget?.id === entry.id) setReactTarget(null);
                            if (commentTarget?.id === entry.id) {
                              setCommentTarget(null);
                              setCommentText("");
                            }
                          }
                        : undefined;

                      return (
                        <VoteCard
                          key={entry.id}
                          entry={entry}
                          order={originalIndex}
                          imgSrc={submissionApi.voteImageUrl(entry.imageFileId, 800)}
                          isReactSelected={isReactChosenForThis}
                          isCommentSelected={isCommentChosenForThis}
                          isReactDisabled={disableReact}
                          isCommentDisabled={disableComment}
                          hideReactButton={hideReact}
                          hideCommentButton={hideComment}
                          onDeselect={handleDeselectThis}
                          commentText={commentTarget?.id === entry.id ? commentText : ""}
                          comments={comments[entry.id] || []}
                          onToggleReact={() => handleToggleReact(entry)}
                          onToggleComment={() => handleToggleComment(entry)}
                          onCommentTextChange={setCommentText}
                          onZoom={() => setZoomIndex(index)}
                        />
                      );
                    })}
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
            <div className="vote-dock-slots">
              {reactTarget && (
                <div className="vote-dock-card" title={`React (+2đ): ${reactTarget.title}`}>
                  <img
                    className="vote-dock-thumb"
                    src={submissionApi.voteImageUrl(reactTarget.imageFileId, 180)}
                    alt={reactTarget.title}
                  />
                  <div className="vote-dock-meta">
                    <span className="vote-dock-badge react">
                      <MdFavorite size={11} /> +2đ React
                    </span>
                    <span className="vote-dock-title">{reactTarget.title}</span>
                  </div>
                  <button
                    type="button"
                    className="vote-dock-remove"
                    title="Bỏ chọn React"
                    aria-label="Bỏ chọn React"
                    onClick={() => setReactTarget(null)}
                  >
                    <MdClose size={13} />
                  </button>
                </div>
              )}

              {commentTarget && (
                <div className="vote-dock-card" title={`Bình luận (+1đ): ${commentTarget.title}`}>
                  <img
                    className="vote-dock-thumb"
                    src={submissionApi.voteImageUrl(commentTarget.imageFileId, 180)}
                    alt={commentTarget.title}
                  />
                  <div className="vote-dock-meta">
                    <span className="vote-dock-badge comment">
                      <MdModeComment size={11} /> +1đ Bình luận
                    </span>
                    <span className="vote-dock-title">{commentTarget.title}</span>
                  </div>
                  <button
                    type="button"
                    className="vote-dock-remove"
                    title="Bỏ chọn Bình luận"
                    aria-label="Bỏ chọn Bình luận"
                    onClick={() => {
                      setCommentTarget(null);
                      setCommentText("");
                    }}
                  >
                    <MdClose size={13} />
                  </button>
                </div>
              )}

              {/* Gợi ý nếu mới chọn 1 trong 2 */}
              {reactTarget && !commentTarget && (
                <div className="vote-dock-hint" title="Bạn có thể chọn thêm 1 bài để bình luận nhận thêm 1 điểm">
                  <MdInfoOutline size={13} />
                  <span>Còn 1đ Bình luận</span>
                </div>
              )}
              {!reactTarget && commentTarget && (
                <div className="vote-dock-hint" title="Bạn có thể chọn thêm 1 bài để thả tim nhận thêm 2 điểm">
                  <MdInfoOutline size={13} />
                  <span>Còn 2đ React</span>
                </div>
              )}
            </div>

            <div className="vote-dock-actions">
              <div className="vote-dock-points" title="Tổng điểm bình chọn đã chọn">
                <span className="vote-dock-points-num">{totalPointsSelected}</span>
                <span className="vote-dock-points-max">/3đ</span>
              </div>

              <button
                className="vote-dock-submit"
                type="button"
                onClick={() => setIsEngageModalOpen(true)}
              >
                <MdHowToVote size={18} />
                <span>Xác nhận ({totalPointsSelected}đ)</span>
              </button>
            </div>
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

      <VoteStatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        entries={entries}
        comments={comments}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default VoteScreen;
