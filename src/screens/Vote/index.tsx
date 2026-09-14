import { useCallback, useMemo, useState } from "react";
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
  MdLockOutline,
  MdOutlineVisibility,
} from "react-icons/md";
import BackgroundDecor from "../Submit/components/BackgroundDecor";
import SubmitHeader from "../Submit/components/SubmitHeader";
import ToastStack from "../Submit/components/Toast";
import VoteCard from "./components/VoteCard";
import VoteLightbox from "./components/VoteLightbox";
import EngageModal from "./components/EngageModal";
import VoteDoneCard from "./components/VoteDoneCard";
import VoteStatsModal from "./components/VoteStatsModal";
import VoteSkeleton from "./components/VoteSkeleton";
import AdminResultsPanel from "./components/AdminResultsPanel";
import { submissionApi } from "../../api/submissionApi";
import { IS_CONFIGURED } from "../../config";
import { useVoteSession } from "./useVoteSession";
import type { VoteEntry } from "../../types";

// Mảng rỗng dùng chung cho các bài chưa có bình luận nào. Nếu viết `|| []` ở
// chỗ truyền props thì mỗi lần dựng lại sinh ra một mảng MỚI, React.memo coi
// như dữ liệu đã đổi và dựng lại thẻ — đúng thứ mình đang muốn tránh.
const NO_COMMENTS: string[] = [];

const VoteScreen = () => {
  // Tải dữ liệu + gửi phiếu + trạng thái "đã bình chọn" dùng chung với bản
  // mobile (xem useVoteSession) để 2 giao diện không bao giờ lệch hành vi.
  const {
    entries,
    comments,
    isLoading,
    isSlowLoading,
    loadError,
    reload,
    hasVoted,
    engagedRecord,
    isSubmitting: isSubmittingEngage,
    engageError,
    setEngageError,
    submit,
    toasts,
    showToast,
    dismissToast,
  } = useVoteSession();

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
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);

  const [isAdmin] = useState<boolean>(() => new URLSearchParams(window.location.search).has("admin"));

  const handleToggleReact = useCallback(
    (entry: VoteEntry) => {
      if (hasVoted) {
        showToast("Bạn đã hoàn tất lượt bình chọn của mình rồi — cảm ơn bạn!", "info");
        return;
      }
      setReactTarget((prev) => (prev?.id === entry.id ? null : entry));
    },
    [hasVoted, showToast],
  );

  const handleToggleComment = useCallback(
    (entry: VoteEntry) => {
      if (hasVoted) {
        showToast("Bạn đã hoàn tất lượt bình luận của mình rồi — cảm ơn bạn!", "info");
        return;
      }
      setCommentTarget((prev) => (prev?.id === entry.id ? null : entry));
      setCommentText("");
    },
    [hasVoted, showToast],
  );

  // Bỏ chọn ngay trên thẻ. Chỉ xoá nội dung đang gõ khi đúng là bài đang bình
  // luận, để không làm mất bài viết dở của người dùng khi họ bỏ chọn bài khác.
  const handleDeselect = useCallback(
    (entry: VoteEntry) => {
      setReactTarget((prev) => (prev?.id === entry.id ? null : prev));
      if (commentTarget?.id === entry.id) {
        setCommentTarget(null);
        setCommentText("");
      }
    },
    [commentTarget],
  );

  const handleZoom = useCallback((cardIndex: number) => setZoomIndex(cardIndex), []);

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

  const handleConfirmEngage = async (honeypot: string) => {
    const sent = await submit({
      reactEntry: reactTarget,
      commentEntry: commentTarget,
      commentText,
      honeypot,
    });
    if (sent) setIsEngageModalOpen(false);
  };

  const totalPointsSelected = (reactTarget ? 2 : 0) + (commentTarget ? 1 : 0);

  // Thanh xác nhận dính đáy che mất phần cuối trang. Đánh dấu lên khung ngoài
  // để CSS chỉ chừa chỗ khi thanh đó thật sự đang hiện — chưa chọn bài nào thì
  // không để lại khoảng trống thừa ở cuối trang.
  const isDockVisible = Boolean(reactTarget || commentTarget) && !hasVoted;

  // Active zoomed entry
  const activeZoomed = zoomIndex !== null && filteredEntries[zoomIndex] ? filteredEntries[zoomIndex] : null;

  return (
    <div style={{ minHeight: "100vh" }}>
      <BackgroundDecor />

      <div className={`wrap${isDockVisible ? " has-dock" : ""}`}>
        <SubmitHeader
          title="React & Bình chọn tác phẩm dự thi"
          subtitle="Mỗi thiết bị có 1 lượt thả tim (2 điểm) + 1 lượt bình luận (1 điểm) dành tặng cho các tác phẩm bạn ấn tượng nhất."
          nav={
            <a className="nav-link" href="/binh-chon/mobile">
              Đang dùng điện thoại? Thử bản mobile gọn nhẹ →
            </a>
          }
        />

        {/* Thể lệ 3 bước — đặt ngay đầu trang để người vào lần đầu hiểu
            "được làm gì / được mấy điểm / có mất lượt không" trước khi bấm. */}
        <div className="vote-hero">
          <div className="vote-hero-steps">
            <div className="vote-step">
              <span className="vote-step-num">1</span>
              <div>
                <div className="vote-step-title">
                  Thả tim 1 tác phẩm
                  <span className="vote-point-tag react">
                    <MdFavorite size={11} /> +2 điểm
                  </span>
                </div>
                <div className="vote-step-desc">Chọn bài bạn ấn tượng nhất — mỗi thiết bị 1 lượt.</div>
              </div>
            </div>

            <div className="vote-step">
              <span className="vote-step-num">2</span>
              <div>
                <div className="vote-step-title">
                  Bình luận 1 tác phẩm khác
                  <span className="vote-point-tag comment">
                    <MdModeComment size={11} /> +1 điểm
                  </span>
                </div>
                <div className="vote-step-desc">Viết cảm nhận thật, tối thiểu 20 từ. Có thể bỏ qua.</div>
              </div>
            </div>

            <div className="vote-step">
              <span className="vote-step-num">3</span>
              <div>
                <div className="vote-step-title">Xác nhận gửi</div>
                <div className="vote-step-desc">Gửi 1 lần duy nhất cho cả 2 lượt — cân nhắc kỹ trước khi bấm.</div>
              </div>
            </div>
          </div>

          <div className="vote-hero-foot">
            <span>
              <MdDescription size={14} /> Tác phẩm khổ A3 Ngang (420 × 297mm)
            </span>
            <span>
              <MdLockOutline size={14} /> Phiếu kín — bình luận hiển thị ẩn danh
            </span>
          </div>
        </div>

        {!IS_CONFIGURED && (
          <div className="card">
            <div className="banner">Trang chưa cấu hình ENDPOINT (Apps Script). Xem HUONG-DAN.md.</div>
          </div>
        )}

        {IS_CONFIGURED && hasVoted && (
          <div className="card" style={{ marginBottom: 24 }}>
            <VoteDoneCard
              reactedTitle={engagedRecord?.reactedTitle}
              commentedTitle={engagedRecord?.commentedTitle}
              onViewStats={() => setIsStatsOpen(true)}
            />
          </div>
        )}

        {/* Đã bình chọn xong → vẫn xem được toàn bộ tác phẩm nhưng ở CHẾ ĐỘ
            CHỈ XEM: mọi nút thả tim/bình luận bị ẩn và thanh xác nhận không
            hiện nữa. Trạng thái "đã bình chọn" lấy từ máy chủ (theo mã thiết
            bị) chứ không chỉ từ localStorage, nên xoá dữ liệu trang hay mở lại
            ở tab khác vẫn không bình chọn thêm được. */}
        {IS_CONFIGURED && (
          <>
            {isLoading && <VoteSkeleton variant="grid" isSlow={isSlowLoading} />}

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
                {hasVoted && (
                  <div className="vote-readonly-note">
                    <MdOutlineVisibility size={17} />
                    Chế độ chỉ xem — bạn đã dùng hết lượt, mời xem lại toàn bộ tác phẩm dự thi.
                  </div>
                )}

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
                    <div className="vote-toolbar-count">
                      Hiển thị{" "}
                      <span className="vote-count-badge">
                        {filteredEntries.length}/{entries.length}
                      </span>{" "}
                      tác phẩm
                    </div>

                    <div className="vote-toolbar-controls">
                      <button
                        className={`refresh vote-toolbar-refresh${isLoading ? " spin" : ""}`}
                        type="button"
                        onClick={reload}
                        title="Tải lại danh sách bài dự thi"
                        aria-label="Tải lại danh sách bài dự thi"
                      >
                        <MdRefresh size={18} />
                      </button>

                      <button
                        className="btn btn-tonal vote-toolbar-stats"
                        type="button"
                        onClick={() => setIsStatsOpen(true)}
                        title="Xem thống kê tổng quan và xếp hạng bình chọn"
                      >
                        <MdBarChart size={16} />
                        Thống kê
                      </button>

                      <label className="vote-toolbar-sort">
                        <span className="vote-toolbar-sort-label">Sắp xếp:</span>
                        <select
                          className="vote-sort-select"
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as "order" | "title" | "comments")}
                        >
                          <option value="order">Thứ tự nộp bài</option>
                          <option value="title">Tên tác phẩm (A-Z)</option>
                          <option value="comments">Nhiều bình luận nhất</option>
                        </select>
                      </label>
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
                      // Đã bình chọn xong thì mọi nút đều bị ẩn ở dưới (chế độ chỉ xem),
                      // nên phần tính toán này chỉ có ý nghĩa khi người dùng còn lượt.
                      const isThisEntryVoted =
                        reactTarget?.id === entry.id || commentTarget?.id === entry.id;
                      const hasReactSelection = Boolean(reactTarget);
                      const hasCommentSelection = Boolean(commentTarget);

                      // 1. Khi người dùng select lượt react: các bài còn lại disable nút react và chỉ hiển thị comment
                      // 2. Ngược lại, khi select lượt comment: các bài còn lại disable nút comment và chỉ hiển thị react
                      const hideReact = !isThisEntryVoted && hasReactSelection && !hasCommentSelection;
                      const hideComment = !isThisEntryVoted && hasCommentSelection && !hasReactSelection;

                      // 3. Bài nào đã vote 1 trong 2 thì disable cả 2 của bài đó luôn
                      // Ngoài ra, nếu lượt đó đã được dùng ở bài khác hoặc đã nộp thì cũng disable
                      const disableReact = isThisEntryVoted || hasReactSelection;
                      const disableComment = isThisEntryVoted || hasCommentSelection;

                      // Cho phép hủy chọn trực tiếp trên thẻ đối với bài đang được chọn trong phiên hiện tại
                      const canDeselect = isThisEntryVoted && !hasVoted;

                      return (
                        <VoteCard
                          key={entry.id}
                          entry={entry}
                          order={originalIndex}
                          cardIndex={index}
                          imgSrc={submissionApi.voteImageUrl(entry.imageFileId, 800)}
                          isReactSelected={reactTarget?.id === entry.id}
                          isCommentSelected={commentTarget?.id === entry.id}
                          isReactDisabled={disableReact}
                          isCommentDisabled={disableComment}
                          hideReactButton={hasVoted || hideReact}
                          hideCommentButton={hasVoted || hideComment}
                          canDeselect={canDeselect}
                          onDeselect={handleDeselect}
                          commentText={commentTarget?.id === entry.id ? commentText : ""}
                          comments={comments[entry.id] || NO_COMMENTS}
                          onToggleReact={handleToggleReact}
                          onToggleComment={handleToggleComment}
                          onCommentTextChange={setCommentText}
                          onZoom={handleZoom}
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
      {isDockVisible && (
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
                      <MdFavorite size={11} /> +2đ<span className="vote-dock-badge-word"> React</span>
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
                      <MdModeComment size={11} /> +1đ<span className="vote-dock-badge-word"> Bình luận</span>
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
