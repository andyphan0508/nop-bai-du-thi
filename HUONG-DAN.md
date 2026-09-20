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

- **Mỗi thiết bị có đúng 1 lượt React (2 điểm) + 1 lượt bình luận (1 điểm)**, dùng 1 lần duy nhất cho cả cuộc thi — có thể dùng cả 2, chỉ 1, hoặc bỏ qua. Không cần đăng nhập tài khoản nào.
- Có thể React/bình luận cho **bất kỳ bài nào** — **không được chọn cùng 1 bài cho cả React lẫn bình luận** trong cùng 1 lượt (phải là 2 bài khác nhau).
- Bình luận **bắt buộc tối thiểu 20 từ** (kiểm tra cả 2 phía: hiện đếm số từ ngay khi gõ, và server từ chối nếu dưới 20 từ) — tránh kiểu bình luận spam "hay quá", "đẹp" chỉ để lấy điểm.
- Bình luận **hiển thị công khai** ngay trên trang (dạng lời khích lệ) nhưng **ẩn danh** — không kèm tên người bình luận. Điểm/xếp hạng thì **ngược lại**: web KHÔNG hiện số điểm hay số hạng ở đâu cả.

**Dữ liệu bài dự thi là snapshot tĩnh (không đọc Sheet khi mở trang):**
- Chạy `npm run snapshot` → script gọi `?action=voteEntries` 1 lần, tải ảnh bìa từ Drive về `public/entries/` (2 cỡ: 640px + 1600px, JPEG) và ghi tên/mô tả/mã bài vào `src/data/entries.json` (đóng thẳng vào bundle JS).
- **Commit cả `src/data/entries.json` lẫn `public/entries/`** rồi deploy. Trang có bài ngay khi JS chạy (~0,3 giây), ảnh phục vụ từ CDN Vercel và cache vĩnh viễn (tên file chứa mã băm nội dung).
- Apps Script chỉ còn trả **phần động** (bình luận, đã vote chưa) — tải ở nền, lỗi/chậm cũng không chặn trang. Phiếu bầu vẫn ghi vào Sheet như cũ.
- **Thêm/sửa bài hoặc đổi ảnh bìa** → chạy lại `npm run snapshot`, commit, deploy. Bài chưa bật chia sẻ ảnh sẽ được báo trong output (chạy `?action=syncImages` rồi chạy lại).

**Web hiển thị thế nào:**
- 1 danh sách duy nhất, **xáo trộn lại mỗi lần tải trang** (mỗi lượt truy cập một thứ tự khác; trong lúc đang xem thì thứ tự đứng yên) — không đánh số, không hiện điểm. Máy chủ không gửi điểm hay thứ tự theo điểm ra web; kết quả chỉ xem bằng nút Top 3 hoặc sheet "Tổng điểm".
- Mỗi bài có sẵn 2 nút **Thả tim** / **Bình luận** ngay trên dòng; bấm ảnh/tên để xem ảnh lớn, mô tả, bình luận. Thanh dưới đáy cho thấy 2 lựa chọn hiện tại + nút **Gửi**.
- Gửi xong → màn **"Bạn đã bình chọn!"** (thay cho danh sách). Giao diện không nhắc tới "thiết bị".
- `/binh-chon/mobile` (link cũ) mở cùng giao diện này.

**Điểm & cách chấm giải (chỉ quản trị viên):**
- **Nút Top 3**: mở `<domain>/binh-chon?admin=1` → nút 🏆 góc trên → nhập `ADMIN_KEY` → hiện các bài có điểm cao nhất (kèm tên tác giả), **xếp theo tên, không theo hạng 1-2-3**. Bài đồng hạng 3 (bằng cả điểm lẫn số React) được hiện thêm. Người thường không thấy nút; có mở link cũng cần đúng mã quản trị.
- **Xoá dữ liệu bình chọn** (VD sau khi chạy thử): trong Apps Script chọn hàm `resetVotes` → **Run**, rồi đọc dòng kết quả trong khung Execution log (ghi rõ từng sheet xoá bao nhiêu dòng / lỗi gì). Kiểm tra lại từ xa: mở `<ENDPOINT>?action=voteState&key=<ADMIN_KEY>` — phải thấy `voters: 0, reacts: 0, comments: 0`. Hàm sao lưu 4 sheet (Người bình chọn, Kết quả bình chọn, Bình luận, Tổng điểm) thành "… (sao lưu <ngày giờ>)" rồi mới xoá, và xoá luôn bộ nhớ đệm. Máy đã vote thử sẽ tự quay về danh sách khi mở lại trang. Không có cách gọi hàm này qua web.
- Điểm được ghi vào sheet **"Tổng điểm"** trong Google Sheet (Hạng · Tên tác phẩm · Họ tên · Nhóm · React · Bình luận · Tổng điểm), tiếp theo là **toàn bộ lời bình luận của bài, mỗi lời 1 cột sang ngang** ("Bình luận 1", "Bình luận 2"…) — cột Tên tác phẩm đứng yên khi kéo ngang. Muốn file Excel thì **File → Download → Microsoft Excel (.xlsx)**.
- Cập nhật sheet: trong Apps Script chọn hàm `exportScores` → **Run** (cập nhật ngay), hoặc chạy `setupScoreTrigger` **1 lần** để sheet tự cập nhật mỗi 5 phút.
- **Hạng 1 – 2 – 3**: tổng điểm cao nhất; bằng điểm thì xét **số React cao hơn** (sheet đã xếp sẵn theo quy tắc này).
- **Đồng hạng**: 2 bài bằng cả tổng điểm lẫn số React thì mang **cùng số hạng** trong sheet (VD 1, 2, 2, 4) và nút Top 3 hiện thêm bài đó (có thể hơn 3 bài). Lúc đó BGK tự quyết định, hệ thống không tự phân định.
- **Giải khuyến khích (nội dung)**: bài có **số bình luận cao nhất** trong các bài **ngoài top 3** — xem cột "Lượt bình luận" trong sheet.

**Cơ chế chống spam / đảm bảo công bằng** (đã cài sẵn trong `Code.gs`):

1. **Định danh bằng mã thiết bị** — không dùng tài khoản/đăng nhập nào. Trình duyệt tự sinh 1 mã ngẫu nhiên khi mở trang lần đầu, lưu vĩnh viễn trong `localStorage` (`src/utils/deviceId.ts`) và gửi kèm mỗi lượt bình chọn. Server băm SHA-256 (kèm `VOTE_SALT`) rồi đối chiếu với sheet **"Người bình chọn"** để chặn CÙNG 1 THIẾT BỊ dùng quá 1 lượt.
2. **reCAPTCHA v3** (vô hình, không cần người dùng làm gì) — Google chấm điểm hành vi giống người/bot, lượt bị nghi là bot sẽ bị từ chối.
3. **Danh tính giữ kín** — mã thiết bị chỉ lưu dạng băm ở sheet riêng **"Người bình chọn"** (không lưu email/tên vì không còn thu thập); React lưu ở sheet **"Kết quả bình chọn"**, bình luận lưu ở sheet **"Bình luận"** — cả 2 không kèm mã thiết bị. Không sheet nào nối lại được → không ai, kể cả bạn, tra ngược được "thiết bị nào đã react/bình luận bài nào".
4. **Chống race-condition** — dùng `LockService` để khoá lúc kiểm tra "đã dùng lượt chưa" + ghi lượt, tránh trường hợp bấm 2 lần liên tiếp / mạng lag khiến 1 thiết bị lọt qua vòng kiểm tra và dùng được 2 lần.
5. **Chống bot bổ sung** — 1 field ẩn (honeypot, bot tự động điền vào nhưng người dùng không thấy) + chặn gửi nếu trang mới tải dưới 1.5 giây (bot thường gửi ngay lập tức).
6. **Ẩn điểm/xếp hạng** — web KHÔNG hiển thị số điểm/số hạng. Quản trị viên xem ở sheet **"Tổng điểm"** hoặc `?action=voteResults&key=<ADMIN_KEY>` (JSON).
7. **Kín danh khi tương tác (blind)** — trang `/binh-chon` KHÔNG hiển thị Họ tên/Thành viên nhóm/Nhóm-ban ngành của thí sinh, chỉ có tên tác phẩm + hình thức (Cá nhân/Nhóm) + mô tả ý tưởng. `?action=votePage` cũng không trả Họ tên/Nhóm/điểm về — tránh chấm theo quen biết thay vì theo chất lượng tác phẩm. Tên đầy đủ vẫn hiện trong bảng kết quả cho quản trị viên (`?action=voteResults`) để công bố người thắng cuộc.
8. **Không được React lẫn bình luận cùng 1 bài** — nếu chọn cùng 1 bài cho cả 2 lượt trong 1 lần gửi, server từ chối và yêu cầu chọn 2 bài khác nhau.

> **Đánh đổi khi bỏ đăng nhập:** mã thiết bị chỉ chặn được ở MỨC THIẾT BỊ — xoá dữ liệu trình duyệt (localStorage), dùng chế độ ẩn danh, hoặc đổi sang máy/trình duyệt khác đều tạo được mã thiết bị mới và bình chọn lại được. Hệ thống cũng KHÔNG còn biết ai nộp bài nào, nên **không còn chặn được thí sinh tự React/bình luận cho chính bài của mình**. Đây là đánh đổi hợp lý cho quy mô nội bộ (~50-60 người), không phù hợp nếu cần chống gian lận chặt ở quy mô lớn/công khai — muốn chặt hơn cần quay lại xác thực tài khoản.

**Việc bạn cần làm:**

1. **Tạo reCAPTCHA v3** (miễn phí): vào https://www.google.com/recaptcha/admin → Register a new site → chọn **v3** → điền domain thật + `localhost` → copy **Site Key** và **Secret Key**.
2. Dán **Site Key** vào `src/config.ts` (`RECAPTCHA_SITE_KEY`) → commit/push để Vercel build lại.
3. Dán **Secret Key** vào `apps-script/Code.gs` (`RECAPTCHA_SECRET_KEY`); đổi `VOTE_SALT` thành 1 chuỗi ngẫu nhiên của riêng bạn.
4. Đặt `ADMIN_KEY` — **bắt buộc** để dùng nút Top 3 (và `?action=voteResults`).
5. Sau khi cập nhật `Code.gs`, nhớ **Deploy → Manage deployments → Edit → New version → Deploy** (như mọi lần sửa script).
6. Trong Apps Script chạy `warmCache` (nạp sẵn dữ liệu) và `setupScoreTrigger` (sheet "Tổng điểm" tự cập nhật mỗi 5 phút) — mỗi hàm 1 lần.
7. Mở `<domain>/binh-chon` để React/bình luận; xem điểm trong sheet **"Tổng điểm"**.

> **Chưa kịp setup reCAPTCHA?** Trang **vẫn bình chọn bình thường** — bước lấy token được bỏ qua ở cả web lẫn `Code.gs`. Các lớp chặn spam còn lại vẫn hoạt động: 1 lượt/thiết bị (đối chiếu ở máy chủ), honeypot, chặn gửi quá nhanh sau khi tải trang, và bình luận tối thiểu 20 từ. Dán đủ Site Key + Secret Key khi nào bạn sẵn sàng để bật thêm lớp chấm điểm hành vi của Google.

> **Về khổ bài dự thi:** Cuộc thi sử dụng chuẩn **Khổ A3 Ngang (420 × 297mm, tỉ lệ 1.414 : 1)** cho thiết kế bìa sách trải rộng toàn bộ (bìa trước, gáy, bìa sau). Giao diện web và xem ảnh được căn vừa khít 100% không bị viền trống hay méo hình.


> **Về hiệu năng khi 60–70 người vào cùng lúc:**
>
> Chạy thử bằng bộ mô phỏng có sẵn (không cần deploy):
>
> ```bash
> node apps-script/test-concurrency.cjs
> ```
>
> Bộ này giả lập 70 người mở trang và bấm gửi đồng thời, có tính độ trễ thật của mỗi lượt gọi Sheets/Drive API, rồi kiểm tra: đủ 70 lượt được ghi nhận, 1 thiết bị bấm 5 lần chỉ tính 1 lượt, và số dòng ghi xuống Sheet khớp.
>
> Những điểm đã tối ưu để chịu được mức đó:
>
> - **Danh sách bài + ảnh bìa cache 6 giờ** (`CACHE_TTL_ENTRIES`) thay vì 30 giây, kèm cơ chế *single-flight*: khi cache hết hạn mà nhiều người vào cùng lúc, chỉ **1** lượt chạy quét lại Drive, số còn lại đợi rồi đọc cache. Trước đây 70 người mở trang lúc cache nguội là 70 lượt cùng quét thư mục Drive của từng bài.
> - **Mở trang không chờ máy chủ** — bài dự thi + ảnh là snapshot tĩnh trên CDN; chỉ 1 lượt gọi nền `?action=votePage` (thứ tự + bình luận + "thiết bị này vote chưa"), không đọc danh sách bài, không quét Drive. 70 người mở trang = 70 lượt chạy nhẹ thay vì 210 lượt như trước.
> - **Gửi phiếu không đụng Drive** — kiểm tra "mã bài có thật" chỉ đọc cột mã bài của Sheet (cache 6 giờ).
> - **Không xoá cache mỗi lượt gửi** — bình luận cache 30 giây; người vừa bình luận thấy ngay bình luận của mình vì web tự thêm vào.
> - **Khoá (LockService) chỉ bao đúng bước kiểm tra trùng lượt** (~10ms, đọc/ghi bộ nhớ đệm) — phần ghi 3 sheet đã chuyển ra ngoài khoá. Trước đây mỗi lượt giữ khoá 1,5–2,5 giây, 70 người bấm gửi cùng lúc phải xếp hàng hơn 100 giây trong khi mức chờ tối đa chỉ 10 giây → đa số nhận lỗi *"Hệ thống đang bận"*.
> - **Tự gửi lại khi quá tải**: máy chủ trả mã `BUSY`, web tự thử lại tối đa 3 lần có giãn cách ngẫu nhiên thay vì bắt người dùng bấm lại.
> - **Mỗi lượt gửi không hỏi lại Sheet 3 lần** về dòng tiêu đề nữa (nhớ trong bộ nhớ đệm) — bớt ~0,45 giây mỗi phiếu.
> - **Ping giữ máy chủ "thức"**: Apps Script tắt máy khi script rảnh, lần gọi kế tiếp phải khởi động lại — đo thực tế **17,5 giây** cho một lượt gọi không làm gì cả, so với **1,7 giây** khi máy đang thức. Trang chỉ gọi rỗng (tối đa 2 phút/lần) khi người dùng **đã chọn bài và sắp gửi** — không ping vô ích từ mọi người đang xem.
> - **Hâm nóng cache trước giờ G**: mở Apps Script → chọn hàm `warmCache` → **Run** (hoặc đặt Trigger theo thời gian, mỗi 4 giờ). Lần tính đầu tiên mất khoảng 0,7 giây/bài, làm trước thì người vào đầu tiên không phải chờ.
> - Trang nộp bài cũ (`/`) không còn được render nữa — mọi lượt truy cập tự chuyển sang `/binh-chon` (chuyển ở tầng Vercel qua `vercel.json`).
>
> **Một lượt bình chọn mất bao lâu (số đo thật, đo bằng `curl` vào chính endpoint):**
>
> | Việc | Thời gian |
> |---|---|
> | `/exec` — không đụng Sheet, chỉ trả 1 dòng JSON | **1,7 – 3,6s** |
> | `?action=list` — mở Sheet + đọc 1 lần | 2,1 – 2,8s |
> | Lượt gọi đầu sau khi script "ngủ" (khởi động lại) | **17,5s** |
>
> Nghĩa là **1,7 giây là sàn cứng của Apps Script**, không phụ thuộc code — gồm thời gian khởi tạo môi trường và chặng chuyển hướng `script.google.com` → `script.googleusercontent.com`. Muốn nhanh hơn mức này thì phải đổi hẳn nền tảng (VD Cloudflare Workers + Supabase/Postgres), không phải việc tối ưu code Apps Script làm được.
>
> Phần code mình kiểm soát được, sau tối ưu, chỉ còn khoảng **0,8 giây** (mở Sheet + ghi 3 dòng). Đổi sang cơ chế "ghi tạm rồi 1 phút sau mới đổ vào Sheet" thì tiết kiệm thêm được tối đa ~0,6 giây, nhưng đánh đổi bằng nguy cơ mất phiếu nếu trigger hỏng — **không đáng**, nên cố ý không làm.
>
> **Về độ nhẹ & mượt của giao diện:**
>
> | Chỗ tốn | Trước | Sau |
> |---|---|---|
> | CSS tải về | 53 KB (gồm cả trang nộp bài đã đóng) | 12 KB |
> | JS tải về | 255 KB | 220 KB |
> | Lượt gọi máy chủ khi mở trang | 3 | 1 |
> | Hiệu ứng nền chạy vô tận | quầng sáng, sao, nốt nhạc, logo nhún | không còn |
> | Ảnh trong danh sách | thẻ lớn tải ảnh 800px + mô tả + bình luận ngay trên thẻ | dòng gọn ảnh 240px; mô tả/bình luận nằm trong khung chi tiết |
> | Cuộn để bình chọn | lưới thẻ cao, phải cuộn tìm nút | 3 bài nổi bật + danh sách dòng, nút ♥ ngay trên dòng, nút Gửi dính đáy |
> | Font | chặn hiển thị cho tới khi tải xong | hiện ngay bằng font hệ thống, Inter tải sau |
> | Dòng ngoài màn hình | dựng hết | `content-visibility: auto` |

> **Về việc "đã bình chọn rồi thì vào lại có biết không":**
> - Khi mở trang, lượt gọi `.../exec?action=votePage&deviceId=...` trả kèm luôn trạng thái đã vote của thiết bị. Đã dùng lượt → hiện ngay **biên nhận bình chọn** + chế độ **chỉ xem** (xem lại được toàn bộ tác phẩm nhưng không còn nút thả tim/bình luận), thay vì để người dùng chọn bài xong mới báo lỗi lúc gửi.
> - Nếu máy đã xoá dữ liệu trang thì biên nhận không còn tên tác phẩm đã chọn, nhưng vẫn xác nhận đúng là "đã dùng hết lượt" theo mã thiết bị lưu ở máy chủ.
> - Trường hợp phiếu gửi thành công nhưng rớt mạng nên web không nhận được phản hồi: lần gửi lại sẽ nhận mã `ALREADY_VOTED` và web chuyển thẳng sang màn "đã bình chọn" (coi như thành công) thay vì báo lỗi.
>
> **Về ảnh bìa hiển thị & đồng bộ Drive:**
> - Bài nộp mới qua web tự động bật quyền xem công khai ("Anyone with the link — Viewer") cho ảnh bìa.
> - Để đồng bộ / sửa quyền chia sẻ cho toàn bộ các bài đã nộp trước đó (hoặc bài nộp qua dán link Google Drive), bạn chỉ cần mở 1 lần link sau trên trình duyệt:
>   `<ENDPOINT>/exec?action=syncImages` (hoặc `?action=syncImages&key=<ADMIN_KEY>`).
>   Hệ thống sẽ tự động quét cả cột upload lẫn cột link nguồn để bật quyền xem, trả về `{ ok: true, fixed, failed, total }`.
> - `syncImages` đồng thời **xoá cache danh sách bài** — vì danh sách được giữ tới 6 giờ, nên sau khi thay/thêm ảnh trên Drive hãy chạy link này 1 lần để trang cập nhật ngay.

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
│  ├─ data/entries.json             Snapshot bài dự thi (sinh bởi npm run snapshot — đừng sửa tay)
│  ├─ screens/Vote/                 Trang bình chọn (mobile-first) — route "/binh-chon" và "/binh-chon/mobile"
│  │  ├─ index.tsx                  Bố cục: thể lệ, 3 bài nổi bật, danh sách, thanh Gửi dính đáy
│  │  ├─ useVoteSession.ts          Tải dữ liệu (1 lượt gọi + cache máy), gửi phiếu, trạng thái đã vote
│  │  ├─ vote.css                   Toàn bộ CSS của trang
│  │  └─ components/
│  │     ├─ EntryItem.tsx           1 bài (thẻ nổi bật hoặc dòng gọn) + nút ♥
│  │     ├─ Sheet.tsx               Khung trượt từ đáy lên (dùng chung)
│  │     ├─ EntrySheet.tsx          Chi tiết bài: ảnh lớn, mô tả, bình luận, thả tim/viết bình luận
│  │     └─ ConfirmSheet.tsx        Xác nhận gửi phiếu
├─ scripts/snapshot.mjs            Kéo bài + ảnh từ Apps Script/Drive thành dữ liệu tĩnh
├─ public/entries/                 Ảnh bìa đã tải về (sinh bởi npm run snapshot)
├─ apps-script/Code.gs              Backend Google Apps Script (nộp bài + bình chọn)
├─ legacy/index-static.html         Bản HTML tĩnh cũ (backup, không dùng nữa)
└─ HUONG-DAN.md                     File này
```
