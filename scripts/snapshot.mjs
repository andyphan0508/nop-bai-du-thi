// Đóng gói toàn bộ bài dự thi thành dữ liệu TĨNH cho trang bình chọn:
//   - src/data/entries.json   tên, hình thức, mô tả, mã bài (đóng thẳng vào bundle JS)
//   - public/entries/*.jpg    ảnh bìa 2 cỡ, tải từ Drive về, host trên CDN Vercel
// Trang mở ra là có bài ngay, không chờ Apps Script/Sheet/Drive.
//
// Chạy lại mỗi khi bài dự thi hoặc ảnh bìa thay đổi, rồi commit + deploy:
//   npm run snapshot
//
// Mã bài (id) giữ nguyên như máy chủ nên phiếu bầu vẫn gửi về Apps Script bình thường.

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";

const ROOT = new URL("..", import.meta.url);
const IMAGE_DIR = new URL("public/entries/", ROOT);
const DATA_FILE = new URL("src/data/entries.json", ROOT);

// Cỡ nhỏ cho danh sách/thẻ nổi bật (~320px hiển thị ×2 màn hình nét),
// cỡ lớn cho khung chi tiết + phóng to.
const SIZES = { thumb: 640, image: 1600 };
const PARALLEL = 6;

const configSource = await readFile(new URL("src/config.ts", ROOT), "utf8");
const endpoint = configSource.match(/ENDPOINT\s*=\s*"([^"]+)"/)?.[1];
if (!endpoint || endpoint.startsWith("PASTE_")) throw new Error("Chưa cấu hình ENDPOINT trong src/config.ts");

console.log("Đang lấy danh sách bài từ Apps Script (lần đầu có thể mất vài chục giây vì quét Drive)…");
const response = await fetch(`${endpoint}?action=voteEntries&_t=${Date.now()}`);
const data = await response.json();
if (!data.ok) throw new Error(`Apps Script báo lỗi: ${data.error || "không rõ"}`);
if (!data.entries?.length) throw new Error("Apps Script trả về 0 bài — không ghi đè snapshot cũ.");

const download = async (fileId, width) => {
  const url = `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w${width}`;
  // Drive chuyển hướng sang máy chủ ảnh googleusercontent; thêm "-rj" vào link đó
  // để Google trả JPEG thay vì PNG gốc — ảnh bìa PNG nhẹ đi ~7 lần (1,6MB → 200KB).
  const redirect = await fetch(url, { redirect: "manual" });
  const location = redirect.headers.get("location");
  const res = location?.includes("googleusercontent.com") ? await fetch(`${location}-rj`) : await fetch(url);
  const type = res.headers.get("content-type") || "";
  // Ảnh chưa bật chia sẻ công khai → Drive trả trang HTML đăng nhập thay vì ảnh
  if (!res.ok || !type.startsWith("image/")) throw new Error(`HTTP ${res.status} ${type}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
  // Tên file kèm mã băm nội dung → đổi ảnh là đổi tên, CDN cache vĩnh viễn được
  const name = `${createHash("sha1").update(bytes).digest("hex").slice(0, 12)}-w${width}.${ext}`;
  await writeFile(new URL(name, IMAGE_DIR), bytes);
  return `/entries/${name}`;
};

await rm(IMAGE_DIR, { recursive: true, force: true });
await mkdir(IMAGE_DIR, { recursive: true });
await mkdir(new URL("src/data/", ROOT), { recursive: true });

const failed = [];
const entries = new Array(data.entries.length);
let next = 0;
const worker = async () => {
  while (next < data.entries.length) {
    const index = next++;
    const entry = data.entries[index];
    const base = {
      id: entry.id,
      title: entry.title,
      entryType: entry.entryType,
      description: entry.description,
    };
    try {
      entries[index] = {
        ...base,
        thumb: await download(entry.imageFileId, SIZES.thumb),
        image: await download(entry.imageFileId, SIZES.image),
      };
      console.log(`  ✓ ${entry.title}`);
    } catch (err) {
      // Không bỏ bài: dùng tạm link Drive để bài vẫn hiện và vẫn bình chọn được
      failed.push(`${entry.title}: ${err.message}`);
      const drive = (w) => `https://drive.google.com/thumbnail?id=${encodeURIComponent(entry.imageFileId)}&sz=w${w}`;
      entries[index] = { ...base, thumb: drive(SIZES.thumb), image: drive(SIZES.image) };
      console.log(`  ✗ ${entry.title} — dùng tạm link Drive`);
    }
  }
};
await Promise.all(Array.from({ length: PARALLEL }, worker));

await writeFile(DATA_FILE, JSON.stringify(entries, null, 2) + "\n");

const files = await readdir(IMAGE_DIR);
console.log(`\nĐã ghi ${entries.length} bài → src/data/entries.json, ${files.length} ảnh → public/entries/`);
if (failed.length) {
  console.log(`\n⚠️  ${failed.length} bài không tải được ảnh (chạy ?action=syncImages để bật chia sẻ rồi chạy lại):`);
  failed.forEach((line) => console.log(`   - ${line}`));
  process.exitCode = 1;
}
