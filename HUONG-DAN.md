# Hướng dẫn thiết lập — Trang nộp bài dự thi Thiết kế bìa

Trang này là **ứng dụng React + TypeScript (Vite)**, hoạt động theo mô hình **hoàn toàn miễn phí, không cần server riêng**:

```
Người dự thi → Trang React (build tĩnh, deploy Netlify) → Google Apps Script (chạy dưới quyền BẠN)
                                                              ├─ Lưu file vào Google Drive của bạn
                                                              └─ Ghi 1 dòng vào Google Sheet
```

## Chạy thử & build (cần Node.js)

```bash
npm install      # cài dependencies (lần đầu)
npm run dev      # chạy thử tại http://localhost:5173
npm run build    # build ra thư mục dist/ để deploy
```

Người dự thi **không cần tài khoản Google**, và bạn **không lộ mật khẩu/credential** nào.

---

## Bước 1 — Tạo thư mục Drive nhận bài

1. Vào https://drive.google.com → tạo thư mục, ví dụ **"Bài dự thi Thiết kế bìa 2026"**.
2. Mở thư mục, nhìn thanh địa chỉ:
   `https://drive.google.com/drive/folders/`**`1AbC...XyZ`** → phần in đậm là **FOLDER_ID**.

## Bước 2 — Tạo Google Sheet ghi record

1. Vào https://sheets.google.com → tạo bảng mới, ví dụ **"Record bài dự thi"**.
2. Lấy **SHEET_ID** từ URL:
   `https://docs.google.com/spreadsheets/d/`**`1DeF...123`**`/edit`
   (Không cần tự tạo tiêu đề cột — script sẽ tự thêm ở lần nộp đầu tiên.)

## Bước 3 — Tạo Apps Script Web App

1. Vào https://script.google.com → **New project**.
2. Xoá nội dung mẫu, dán toàn bộ file **`apps-script/Code.gs`** vào.
3. Sửa 2 dòng cấu hình đầu file:
   ```js
   var FOLDER_ID = '1AbC...XyZ';   // ID thư mục ở Bước 1
   var SHEET_ID  = '1DeF...123';   // ID Sheet ở Bước 2
   var ACCESS_CODE = '';           // để trống, hoặc đặt mã VD 'BTN2026'
   ```
4. Bấm **Deploy → New deployment** → chọn loại **Web app**.
   - **Description:** nộp bài dự thi
   - **Execute as:** **Me** (chính bạn)
   - **Who has access:** **Anyone**
5. Bấm **Deploy** → **Authorize access** → chọn tài khoản → "Advanced" → "Go to (project)" → **Allow**.
   (Cảnh báo "chưa xác minh" là bình thường vì đây là script của riêng bạn.)
6. Sao chép **Web app URL** (kết thúc bằng `/exec`).

> Mỗi lần sửa `Code.gs`, vào **Deploy → Manage deployments → Edit (bút chì) → Version: New version → Deploy** để cập nhật.

## Bước 4 — Gắn URL vào trang web

Mở **`src/config.ts`** và dán URL vừa copy:
```ts
export const ENDPOINT = 'https://script.google.com/macros/s/AKfy.../exec';
export const REQUIRE_CODE = false;   // đổi true nếu bạn đặt ACCESS_CODE ở Bước 3
export const MAX_UPLOAD_MB = 45;     // khớp với MAX_FILE_MB trong Code.gs
```

Sau khi sửa config phải **build lại** (`npm run build`) rồi deploy lại.

## Bước 5 — Deploy lên Netlify (miễn phí)

**Cách A — Netlify Drop (nhanh nhất, không cần Git):**
1. Chạy `npm run build` → có thư mục **`dist/`**.
2. Vào https://app.netlify.com/drop → kéo thả **thư mục `dist`** vào. Xong ngay, có link `*.netlify.app`.
3. Vào Site settings → Domain để gắn tên miền riêng (nếu muốn).

**Cách B — Kết nối Git (tự deploy mỗi lần push):**
1. Đẩy code lên GitHub/GitLab.
2. Netlify → Add new site → Import from Git → chọn repo.
3. Netlify tự đọc **`netlify.toml`** trong repo (build `npm run build`, publish `dist`) — không cần cấu hình gì thêm.

> Cloudflare Pages / Vercel / GitHub Pages cũng dùng được với cùng lệnh build.

## Bước 6 — Kiểm tra

1. Mở trang web, nộp thử 1 bài (PDF nhỏ + 1 file .psd nhỏ hoặc link).
2. Kiểm tra: thư mục Drive có thư mục con mới chứa file; Google Sheet có thêm 1 dòng.
3. Panel **"Danh sách dự thi"** bên phải trang phải hiện tên bạn vừa nộp + bộ đếm tăng lên.

## Danh sách dự thi (tự động)

Trang web hiển thị **danh sách các bạn đã nộp bài + tổng số lượng** ở cột bên phải:

- Dữ liệu lấy trực tiếp từ Google Sheet qua `.../exec?action=list`.
- Chỉ hiển thị thông tin công khai: **Họ tên, Nhóm/Chi hội, Tên tác phẩm, giờ nộp** — KHÔNG lộ email/SĐT.
- Sau khi nộp thành công, danh sách tự cập nhật và người vừa nộp được gắn nhãn "MỚI", kèm thông báo "Bạn là bài dự thi thứ N".
- Nút ↻ ở góc panel để tải lại danh sách thủ công.

> **Lưu ý:** nếu bạn đã deploy `Code.gs` phiên bản cũ, phải **Deploy → Manage deployments → Edit → New version → Deploy** thì `?action=list` mới hoạt động.

---

## Lưu ý & giới hạn

- **Dung lượng:** mỗi file upload trực tiếp nên **< ~45MB**. File .ai/.psd nặng hơn → người dự thi tải lên Google Drive của họ, đặt chia sẻ "Bất kỳ ai có link" rồi **dán link** vào form (form đã có sẵn ô này).
- **Chống spam:** bật `ACCESS_CODE` (Bước 3) + `REQUIRE_CODE = true` (Bước 4) để chỉ người có mã mới nộp được.
- **Riêng tư:** bài nộp nằm trong Drive của bạn; chỉ bạn (và người bạn chia sẻ) xem được.
- **Bảo mật:** trang không thu thập mật khẩu; script chạy dưới quyền bạn nên không cần đăng nhập phía người dự thi.
- Muốn đổi cột ghi nhận: sửa mảng `HEADERS` và dòng `sheet.appendRow([...])` trong `Code.gs`.

## Cấu trúc dự án (React + Vite, feature-based)

```
nop-bai-du-thi/
├─ index.html                       Entry HTML của Vite
├─ netlify.toml                     Cấu hình deploy Netlify
├─ public/logo.jpg                  Logo (favicon)
├─ src/
│  ├─ main.tsx                      Điểm khởi động React
│  ├─ config.ts                     ENDPOINT / REQUIRE_CODE / MAX_UPLOAD_MB
│  ├─ types.ts                      Kiểu dữ liệu chung
│  ├─ api/submissionApi.ts          Gọi API Apps Script (list + submit có % upload)
│  ├─ assets/logobtnsg.jpg          Logo Ban Thanh Niên
│  ├─ styles/global.css             Theme màu logo (nâu · cam · vàng) + hiệu ứng
│  ├─ utils/                        format / avatar / đọc file base64
│  └─ screens/Submit/
│     ├─ index.tsx                  CHỈ logic: state, validate, gọi API
│     └─ components/                UI tách riêng từng phần
│        ├─ SubmitHeader.tsx        Logo + tiêu đề
│        ├─ SubmitForm.tsx          Form nhập + upload
│        ├─ FileDropBox.tsx         Ô kéo-thả file
│        ├─ UploadProgress.tsx      Thanh % upload
│        ├─ SuccessCard.tsx         Màn hình nộp thành công
│        ├─ Confetti.tsx            Pháo giấy ăn mừng
│        ├─ EntryListPanel.tsx      Panel danh sách dự thi
│        ├─ EntryItem.tsx           1 dòng thí sinh
│        ├─ AnimatedCounter.tsx     Bộ đếm chạy số
│        └─ BackgroundDecor.tsx     Nền quầng sáng + hạt
├─ apps-script/Code.gs              Backend Google Apps Script
├─ legacy/index-static.html         Bản HTML tĩnh cũ (backup, không dùng nữa)
└─ HUONG-DAN.md                     File này
```
