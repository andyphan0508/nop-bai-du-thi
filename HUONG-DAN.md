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

## Bình chọn (trang `/binh-chon`)

Sau khi đóng nhận bài, trang **`/binh-chon`** hiển thị toàn bộ ảnh bìa dự thi (đọc trực tiếp từ Google Drive qua Apps Script) để mọi người bình chọn bài yêu thích nhất — **1 người chỉ được bình chọn 1 lần**, phiếu bầu **kín** (không ai xem được ai đã chọn bài nào).

**Cơ chế chống spam / đảm bảo công bằng** (đã cài sẵn trong `Code.gs`):

1. **Định danh người bình chọn bằng đăng nhập Google thật** (Google Sign-In) — KHÔNG dùng tự khai SĐT nữa, vì tự khai thì ai cũng bịa số khác được. Bắt buộc đăng nhập Google mới gửi được phiếu → mở ẩn danh (incognito) không giúp ích gì vì vẫn phải đăng nhập lại bằng 1 tài khoản Google thật; muốn bình chọn nhiều lần phải có nhiều tài khoản Google khác nhau (khó hơn nhiều so với gõ SĐT khác).
2. **reCAPTCHA v3** (vô hình, không cần người dùng làm gì) — Google chấm điểm hành vi giống người/bot, phiếu bị nghi là bot sẽ bị từ chối.
3. **Phiếu kín thật sự** — mã định danh Google (`sub`) được băm SHA-256 (kèm `VOTE_SALT`) và lưu ở sheet riêng **"Người bình chọn"** (chỉ để chặn bình chọn 2 lần, không lưu email/tên); lựa chọn bài dự thi lưu ở sheet riêng **"Kết quả bình chọn"** (không kèm danh tính). Hai sheet không có cột chung để nối lại → không ai, kể cả bạn, tra ngược được "ai chọn bài nào".
4. **Chống race-condition** — dùng `LockService` để khoá lúc kiểm tra "đã bình chọn chưa" + ghi phiếu, tránh trường hợp bấm 2 lần liên tiếp / mạng lag khiến 1 người lọt qua vòng kiểm tra và bình chọn được 2 lần.
5. **Chống bot bổ sung** — 1 field ẩn (honeypot, bot tự động điền vào nhưng người dùng không thấy) + chặn gửi phiếu nếu trang mới tải dưới 1.5 giây (bot thường gửi ngay lập tức).
6. **Ẩn kết quả khi đang bình chọn** — số phiếu từng bài KHÔNG hiển thị công khai (tránh hiệu ứng chạy theo số đông / bị soi để spam vào bài dẫn đầu). Chỉ quản trị viên xem được qua `?admin=1` (cần đúng `ADMIN_KEY`, cấu hình giống Bước 3).

**Việc bạn cần làm:**

1. **Tạo Google OAuth Client ID** (miễn phí, dùng chung tài khoản Google đang chạy Apps Script):
   - Vào https://console.cloud.google.com/apis/credentials (tạo project mới nếu chưa có).
   - Nếu chưa cấu hình **OAuth consent screen**: chọn **External** → điền tên app + email → Save (không cần submit verify, dùng nội bộ vẫn chạy được, chỉ hiện cảnh báo "chưa xác minh" — bình thường).
   - **Create Credentials → OAuth client ID → Application type: Web application**.
   - **Authorized JavaScript origins**: thêm domain thật (VD `https://nop-bai-du-thi.vercel.app`) và `http://localhost:5173` (để chạy thử `npm run dev`).
   - Copy **Client ID** (dạng `xxxx.apps.googleusercontent.com`).
2. **Tạo reCAPTCHA v3** (miễn phí): vào https://www.google.com/recaptcha/admin → Register a new site → chọn **v3** → điền domain thật + `localhost` → copy **Site Key** và **Secret Key**.
3. Dán **Client ID** + **Site Key** vào `src/config.ts` (`GOOGLE_CLIENT_ID`, `RECAPTCHA_SITE_KEY`) → commit/push để Vercel build lại.
4. Dán **Client ID** (phải khớp) + **Secret Key** vào `apps-script/Code.gs` (`GOOGLE_CLIENT_ID`, `RECAPTCHA_SECRET_KEY`); đổi `VOTE_SALT` thành 1 chuỗi ngẫu nhiên của riêng bạn.
5. Đặt `ADMIN_KEY` (nếu chưa đặt) để xem kết quả sau khi đóng bình chọn.
6. Sau khi cập nhật `Code.gs`, nhớ **Deploy → Manage deployments → Edit → New version → Deploy** (như mọi lần sửa script).
7. Mở `<domain>/binh-chon` để bình chọn, `<domain>/binh-chon?admin=1` để xem bảng kết quả (nhập `ADMIN_KEY` vào ô "Mã quản trị").

> **Chưa kịp setup Google Sign-In / reCAPTCHA?** Trang vẫn chạy được (xem được ảnh, chọn bài) nhưng nút "Gửi phiếu bầu" sẽ báo lỗi/không hiện nút đăng nhập cho tới khi bạn dán đủ 4 giá trị ở bước 3–4. Đây là chủ đích — tránh mở bình chọn "chay" (ai cũng gửi được, không xác thực).

> **Giới hạn cần biết:** đăng nhập Google chặn được kiểu spam phổ biến nhất (mở ẩn danh/đổi SĐT), nhưng không phải tuyệt đối — người thật sự muốn gian lận vẫn có thể tạo nhiều tài khoản Google khác nhau để bình chọn nhiều lần. Muốn chặt hơn nữa (VD: chỉ cho phép domain email nội bộ, hoặc yêu cầu OTP SĐT qua dịch vụ SMS trả phí) cần thêm cấu hình ngoài phạm vi bản miễn phí này.

> **Về ảnh bìa hiển thị:** trang dùng thẳng link thumbnail công khai của Google Drive (`https://drive.google.com/thumbnail?id=...`) — **không** proxy qua Apps Script (đã thử cách `doGet` trả blob ảnh trực tiếp nhưng Apps Script Web App không hỗ trợ kiểu trả về này, chỉ nhận `HtmlOutput`/`TextOutput`). Vì vậy ảnh bìa cần được bật chia sẻ "Anyone with the link — Viewer":
> - **Bài nộp mới** (sau khi cập nhật `Code.gs` này): tự động bật chia sẻ ngay lúc nộp, không cần làm gì thêm.
> - **Bài đã nộp trước đó**: mở 1 lần trên trình duyệt `<ENDPOINT>/exec?action=fixImageSharing&key=<ADMIN_KEY>` để bật chia sẻ hàng loạt cho ảnh của các bài cũ (trả về `{ ok, fixed, failed }`).
> File nguồn (.ai/.psd/...) đính kèm KHÔNG bị đổi quyền — vẫn riêng tư, chỉ ảnh bìa mới công khai xem-qua-link.

---

## Lưu ý & giới hạn

- **Dung lượng:** mỗi file upload trực tiếp nên **< ~45MB**. File .ai/.psd nặng hơn → người dự thi tải lên Google Drive của họ, đặt chia sẻ "Bất kỳ ai có link" rồi **dán link** vào form (form đã có sẵn ô này).
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
│  ├─ config.ts                     ENDPOINT / MAX_UPLOAD_MB
│  ├─ types.ts                      Kiểu dữ liệu chung
│  ├─ api/submissionApi.ts          Gọi API Apps Script (list + submit có % upload)
│  ├─ assets/logobtnsg.jpg          Logo Ban Thanh Niên
│  ├─ styles/global.css             Theme màu logo (nâu · cam · vàng) + hiệu ứng
│  ├─ utils/                        format / avatar / đọc file base64
│  ├─ screens/Submit/
│  │  ├─ index.tsx                  CHỈ logic: state, validate, gọi API
│  │  └─ components/                UI tách riêng từng phần
│  │     ├─ SubmitHeader.tsx        Logo + tiêu đề (dùng chung với trang Bình chọn)
│  │     ├─ SubmitForm.tsx          Form nhập + upload
│  │     ├─ FileDropBox.tsx         Ô kéo-thả file
│  │     ├─ UploadProgress.tsx      Thanh % upload
│  │     ├─ SuccessCard.tsx         Màn hình nộp thành công
│  │     ├─ ClosedCard.tsx          Màn hình sau khi hết hạn nhận bài
│  │     ├─ Confetti.tsx            Pháo giấy ăn mừng
│  │     ├─ EntryListPanel.tsx      Panel danh sách dự thi
│  │     ├─ EntryItem.tsx           1 dòng thí sinh
│  │     ├─ AnimatedCounter.tsx     Bộ đếm chạy số
│  │     ├─ Toast.tsx               Thông báo dạng snackbar (dùng chung)
│  │     └─ BackgroundDecor.tsx     Nền quầng sáng + hạt
│  └─ screens/Vote/                 Trang bình chọn — route "/binh-chon"
│     ├─ index.tsx                  CHỈ logic: tải danh sách, chọn bài, gửi phiếu
│     └─ components/
│        ├─ VoteCard.tsx            1 thẻ bài dự thi (ảnh + chọn)
│        ├─ VoteLightbox.tsx        Xem ảnh bìa cỡ lớn
│        ├─ BallotModal.tsx         Modal xác nhận phiếu bầu (họ tên + SĐT)
│        ├─ VoteDoneCard.tsx        Màn hình đã bình chọn xong
│        └─ AdminResultsPanel.tsx   Bảng kết quả (chỉ quản trị viên, ?admin=1)
├─ apps-script/Code.gs              Backend Google Apps Script (nộp bài + bình chọn)
├─ legacy/index-static.html         Bản HTML tĩnh cũ (backup, không dùng nữa)
└─ HUONG-DAN.md                     File này
```
