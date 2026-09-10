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

## React & bình luận (trang `/binh-chon`)

Sau khi đóng nhận bài, trang **`/binh-chon`** hiển thị toàn bộ ảnh bìa dự thi (đọc trực tiếp từ Google Drive qua Apps Script) để mọi người ủng hộ bài yêu thích. Đây **không phải** kiểu "chọn 1 bài duy nhất" mà là chấm điểm theo tương tác:

- **Mỗi người (1 tài khoản Google) có đúng 1 lượt React (2 điểm) + 1 lượt bình luận (1 điểm)**, dùng 1 lần duy nhất cho cả cuộc thi — có thể dùng cả 2, chỉ 1, hoặc bỏ qua.
- Có thể React/bình luận cho **bất kỳ bài nào**, kể cả bài của chính mình — **riêng bài của chính mình chỉ được nhận 1 trong 2** (React HOẶC bình luận, không phải cả hai).
- Bình luận **bắt buộc tối thiểu 20 từ** (kiểm tra cả 2 phía: hiện đếm số từ ngay khi gõ, và server từ chối nếu dưới 20 từ) — tránh kiểu bình luận spam "hay quá", "đẹp" chỉ để lấy điểm.
- Bình luận **hiển thị công khai** ngay trên trang (dạng lời khích lệ) nhưng **ẩn danh** — không kèm tên người bình luận. Điểm/xếp hạng thì **ngược lại**, ẩn công khai, chỉ quản trị viên xem được.

**Cách chấm giải:**
- **Hạng 1 – 2 – 3**: xếp theo **tổng điểm** (React ×2 + Bình luận ×1) cao nhất; nếu 2 bài bằng điểm nhau thì xét **số lượt React cao hơn** để phân định trước (đúng yêu cầu "điểm tương ứng với lượt React cao"), sau đó mới đến số bình luận.
- **1 Giải khuyến khích (nội dung)**: trao cho bài có **số bình luận cao nhất** trong số các bài **không nằm trong top 3** — để giải nội dung tôn vinh 1 tác phẩm khác, không trùng với hạng 1-2-3. Nếu không có bài nào ngoài top 3 nhận được bình luận thì không trao giải này.

**Bản mobile — `/binh-chon/mobile`:** cùng backend, cùng luật, chỉ khác giao diện — hướng dẫn từng bước thay vì lưới ảnh:
1. Màn hình chính hiện 2 thẻ **"Lượt 1"** / **"Lượt 2"** (Lượt 2 khoá tới khi xong Lượt 1).
2. Bấm 1 lượt → hiện danh sách bài (dạng dòng, dễ bấm ngón tay) → chọn 1 bài → hiện ảnh to + mô tả ý tưởng + lời khích lệ đã có + 2 nút React/Bình luận.
3. Làm xong Lượt 1 tự chuyển sang chọn bài cho Lượt 2 — **bài đã chọn ở Lượt 1 không hiện lại**, và hành động đã dùng (React hoặc Bình luận) cũng bị khoá ở Lượt 2, chỉ còn hành động kia.
4. Xong cả 2 lượt (hoặc bấm "Bỏ qua lượt này" nếu không muốn dùng) → bấm **"Xác nhận & Gửi"** → hiện đúng modal đăng nhập Google như bản desktop để gửi đi.

**Cơ chế chống spam / đảm bảo công bằng** (đã cài sẵn trong `Code.gs`):

1. **Định danh bằng đăng nhập Google thật** (Google Sign-In) — KHÔNG dùng tự khai SĐT, vì tự khai thì ai cũng bịa số khác được. Bắt buộc đăng nhập Google mới gửi được lượt → mở ẩn danh (incognito) không giúp ích gì vì vẫn phải đăng nhập lại bằng 1 tài khoản Google thật; muốn dùng thêm lượt phải có nhiều tài khoản Google khác nhau.
2. **reCAPTCHA v3** (vô hình, không cần người dùng làm gì) — Google chấm điểm hành vi giống người/bot, lượt bị nghi là bot sẽ bị từ chối.
3. **Danh tính giữ kín** — mã định danh Google (`sub`) được băm SHA-256 (kèm `VOTE_SALT`) và lưu ở sheet riêng **"Người bình chọn"** (chỉ để chặn dùng 2 lần, không lưu email/tên); React lưu ở sheet **"Kết quả bình chọn"**, bình luận lưu ở sheet **"Bình luận"** — cả 2 không kèm danh tính. Không sheet nào nối lại được → không ai, kể cả bạn, tra ngược được "ai đã react/bình luận bài nào".
4. **Chống race-condition** — dùng `LockService` để khoá lúc kiểm tra "đã dùng lượt chưa" + ghi lượt, tránh trường hợp bấm 2 lần liên tiếp / mạng lag khiến 1 người lọt qua vòng kiểm tra và dùng được 2 lần.
5. **Chống bot bổ sung** — 1 field ẩn (honeypot, bot tự động điền vào nhưng người dùng không thấy) + chặn gửi nếu trang mới tải dưới 1.5 giây (bot thường gửi ngay lập tức).
6. **Ẩn điểm/xếp hạng khi đang mở tương tác** — KHÔNG hiển thị công khai (tránh hiệu ứng chạy theo số đông / bị soi để spam vào bài dẫn đầu). Chỉ quản trị viên xem được qua `?admin=1` (cần đúng `ADMIN_KEY`, cấu hình giống Bước 3).
7. **Kín danh khi tương tác (blind)** — trang `/binh-chon` KHÔNG hiển thị Họ tên/Thành viên nhóm/Nhóm-ban ngành của thí sinh, chỉ có tên tác phẩm + hình thức (Cá nhân/Nhóm) + mô tả ý tưởng. `?action=voteEntries` cũng không trả Họ tên/Thành viên nhóm về — tránh chấm theo quen biết thay vì theo chất lượng tác phẩm. Tên đầy đủ vẫn hiện trong bảng kết quả cho quản trị viên (`?action=voteResults`) để công bố người thắng cuộc.
8. **Bài của chính mình chỉ nhận 1 trong 2** — nếu email tài khoản Google đăng nhập trùng với email đã dùng để nộp bài đó, và người này đồng thời chọn CẢ React lẫn bình luận cho (các) bài của chính họ, server sẽ từ chối yêu cầu và nhắc chỉ được chọn 1 trong 2 (chưa tính là đã dùng hết lượt, có thể thử lại).

> **Trường hợp 1 người nộp nhiều bài bằng nhiều email khác nhau** (VD 5 bài của cùng 1 bạn nhưng mỗi bài dùng 1 email khác nhau): mục 8 ở trên chỉ so đúng 1 email/1 bài nên KHÔNG tự phát hiện được — hệ thống không thể tự biết 5 email đó là cùng 1 người thật. Cách xử lý: tạo thêm 1 sheet tên **đúng** `Email liên kết (cùng 1 người)` trong cùng Google Sheet, mỗi dòng (không có tiêu đề, bắt đầu từ dòng 1) là các email của 1 người, cách nhau bởi dấu phẩy — VD dòng: `email1@gmail.com, email2@gmail.com, email3@gmail.com, email4@gmail.com, email5@gmail.com`. Sau khi có sheet này, hễ ai đăng nhập bằng BẤT KỲ email nào trong nhóm đó và chọn CẢ React lẫn bình luận nhắm vào (các) bài trong nhóm đó (dù là 2 bài khác nhau) sẽ bị chặn — coi như "1 người, 1 hành động lên chính mình". Không tạo sheet này thì tính năng vẫn chạy bình thường theo mục 8, không bắt buộc phải dùng.
>
> Cố ý **không** dùng cách so tên/regex để tự động phát hiện: tên hiển thị Google do người dùng tự đặt (không xác minh được như email) nên dễ né tránh, và tên tiếng Việt rất dễ trùng giữa 2 người hoàn toàn khác nhau — tự động chặn theo tên giống sẽ dễ **chặn oan người vô tội** trùng tên với thí sinh, một lỗi công bằng còn tệ hơn việc bỏ sót vài lượt gian lận. Vì vậy việc xác nhận "đây là cùng 1 người" cần bạn (người biết rõ thành viên nhóm/hội thánh) khai báo thủ công qua sheet trên.

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
7. Mở `<domain>/binh-chon` để React/bình luận, `<domain>/binh-chon?admin=1` để xem bảng xếp hạng điểm (nhập `ADMIN_KEY` vào ô "Mã quản trị").

> **Chưa kịp setup Google Sign-In / reCAPTCHA?** Trang vẫn chạy được (xem được ảnh, chọn bài để React/bình luận) nhưng nút "Xác nhận" sẽ báo lỗi/không hiện nút đăng nhập cho tới khi bạn dán đủ 4 giá trị ở bước 3–4. Đây là chủ đích — tránh mở tương tác "chay" (ai cũng gửi được, không xác thực).

> **Giới hạn cần biết:** đăng nhập Google chặn được kiểu spam phổ biến nhất (mở ẩn danh/đổi SĐT), nhưng không phải tuyệt đối — người thật sự muốn gian lận vẫn có thể tạo nhiều tài khoản Google khác nhau để dùng thêm lượt. Muốn chặt hơn nữa (VD: chỉ cho phép domain email nội bộ, hoặc yêu cầu OTP SĐT qua dịch vụ SMS trả phí) cần thêm cấu hình ngoài phạm vi bản miễn phí này.

> **Về khổ bài dự thi:** Cuộc thi sử dụng chuẩn **Khổ A3 Ngang (420 × 297mm, tỉ lệ 1.414 : 1)** cho thiết kế bìa sách trải rộng toàn bộ (bìa trước, gáy, bìa sau). Giao diện web và xem ảnh được căn vừa khít 100% không bị viền trống hay méo hình.
>
> **Về xem Thống kê sau khi vote:**
> - Sau khi gửi bình chọn (hoặc bấm nút "Thống kê" trên thanh công cụ), người dùng thấy modal **"Công Bố Kết Quả Bình Chọn"** — mở ra là màn hình "Sẵn sàng để ra kết quả chưa?", bấm **Bắt đầu** thì lần lượt công bố Hạng 1 → Hạng 2 → Hạng 3 (dạng bục vinh danh/podium) → Giải khuyến khích, giống 1 buổi lễ trao giải thu nhỏ — có thể bấm "Xem lại từ đầu" để công bố lại.
> - Backend Apps Script hỗ trợ endpoint công khai `.../exec?action=voteStats` trả về: tổng người bình chọn, tổng React, tổng bình luận, tổng điểm, bảng xếp hạng tác phẩm và giải khuyến khích — không kèm thông tin cá nhân.

> **Về hiệu năng khi nhiều người vào cùng lúc (~50 người):**
> - `Code.gs` dùng `CacheService` (bộ nhớ đệm dùng chung của toàn script) để cache kết quả `voteEntries` (30 giây), `comments` và `voteStats` (15 giây) — tránh việc mỗi lượt tải trang đều phải quét lại Sheet + quét thư mục Drive để tìm ảnh bìa (bước tốn thời gian nhất). Khi có người gửi React/bình luận mới, cache `comments`/`voteStats` tự xoá ngay để không phải chờ hết 15 giây mới thấy cập nhật.
> - Trang nộp bài cũ (`/`) không còn được render nữa — mọi lượt truy cập tự chuyển sang `/binh-chon` (chuyển ở tầng Vercel qua `vercel.json`, không cần tải JS trước mới chuyển hướng). Bỏ luôn màn hình nộp bài khỏi gói JS build ra giúp trang tải nhẹ hơn.
>
> **Về ảnh bìa hiển thị & đồng bộ Drive:**
> - Bài nộp mới qua web tự động bật quyền xem công khai ("Anyone with the link — Viewer") cho ảnh bìa.
> - Để đồng bộ / sửa quyền chia sẻ cho toàn bộ các bài đã nộp trước đó (hoặc bài nộp qua dán link Google Drive), bạn chỉ cần mở 1 lần link sau trên trình duyệt:
>   `<ENDPOINT>/exec?action=syncImages` (hoặc `?action=syncImages&key=<ADMIN_KEY>`).
>   Hệ thống sẽ tự động quét cả cột upload lẫn cột link nguồn để bật quyền xem, trả về `{ ok: true, fixed, failed, total }`.

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
│  ├─ screens/Vote/                 Trang React + bình luận (dạng lưới) — route "/binh-chon"
│  │  ├─ index.tsx                  CHỈ logic: tải danh sách/bình luận, chọn React/comment, gửi
│  │  └─ components/
│  │     ├─ VoteCard.tsx            1 thẻ bài dự thi (ảnh + nút React/Bình luận + lời khích lệ)
│  │     ├─ VoteLightbox.tsx        Xem ảnh bìa cỡ lớn
│  │     ├─ GoogleSignIn.tsx        Nút đăng nhập Google (dùng chung trong modal)
│  │     ├─ EngageModal.tsx         Modal xác nhận React + bình luận (đăng nhập Google) — dùng chung với VoteMobile
│  │     ├─ VoteDoneCard.tsx        Màn hình đã dùng hết lượt — dùng chung với VoteMobile
│  │     └─ AdminResultsPanel.tsx   Bảng xếp hạng điểm (chỉ quản trị viên, ?admin=1)
│  └─ screens/VoteMobile/           Luồng "Lượt 1 / Lượt 2" từng bước — route "/binh-chon/mobile"
│     ├─ index.tsx                  Máy trạng thái home/list/detail cho từng lượt, tái dùng EngageModal
│     ├─ turnTypes.ts               Kiểu TurnResult (chưa làm / đã bỏ qua / đã chọn xong)
│     └─ components/
│        ├─ TurnHome.tsx            2 thẻ "Lượt 1"/"Lượt 2" + nút Xác nhận & Gửi
│        ├─ EntryPickerList.tsx     Danh sách bài dạng dòng để chọn cho 1 lượt
│        └─ EntryActionDetail.tsx   Ảnh + mô tả + chọn React/Bình luận cho 1 bài
├─ apps-script/Code.gs              Backend Google Apps Script (nộp bài + bình chọn)
├─ legacy/index-static.html         Bản HTML tĩnh cũ (backup, không dùng nữa)
└─ HUONG-DAN.md                     File này
```
