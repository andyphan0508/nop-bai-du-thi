import type { VoteEntry } from "../../types";

export type TurnAction = "react" | "comment";

// null = chưa làm gì; "skipped" = người dùng chủ động bỏ qua lượt này;
// object = đã chọn xong 1 bài + 1 hành động (kèm nội dung bình luận nếu có).
export type TurnResult = { entry: VoteEntry; action: TurnAction; commentText: string } | "skipped" | null;

export const turnActionOf = (turn: TurnResult): TurnAction | null =>
  turn && turn !== "skipped" ? turn.action : null;

export const turnEntryIdOf = (turn: TurnResult): string | null =>
  turn && turn !== "skipped" ? turn.entry.id : null;
