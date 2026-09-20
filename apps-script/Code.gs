/**
 * ============================================================================
 *  NỘP BÀI DỰ THI THIẾT KẾ BÌA — Ban Thanh Niên HTTL Sài Gòn
 *  Google Apps Script Web App: nhận bài nộp → lưu file vào Google Drive
 *  của bạn → ghi 1 dòng vào Google Sheet.
 *
 *  Cách triển khai xem file HUONG-DAN.md (Bước 3).
 * ============================================================================
 */

// ------------------------- CẤU HÌNH (bạn điền) -------------------------------
// ID thư mục Drive nơi lưu bài dự thi (lấy từ URL thư mục Drive)
var FOLDER_ID = 'PASTE_FOLDER_ID';

// ID Google Sheet dùng để ghi record (lấy từ URL của Sheet)
var SHEET_ID = 'PASTE_SHEET_ID';

// Mã quản trị: cần để xoá bài trên web (mở web với ?admin=1),
// và để xem kết quả bình chọn (?action=voteResults&key=...).
// Để trống '' nếu muốn TẮT hẳn tính năng xoá / xem kết quả.
var ADMIN_KEY = '';

// Chuỗi bí mật để "băm" mã thiết bị người bình chọn — đổi thành chuỗi ngẫu
// nhiên của riêng bạn (không cần nhớ, chỉ cần giữ cố định trong suốt đợt bình
// chọn). Không dùng tài khoản Google nữa (đã bỏ đăng nhập) — mã thiết bị do
// TRÌNH DUYỆT tự sinh (xem src/utils/deviceId.ts), lưu localStorage, gửi kèm
// mỗi lượt bình chọn để server chặn dùng quá 1 lần trên CÙNG 1 THIẾT BỊ. Đây
// là chặn Ở MỨC THIẾT BỊ, không phải danh tính thật — xoá dữ liệu trình duyệt
// hoặc đổi máy/trình duyệt khác vẫn có thể bình chọn lại (đánh đổi chấp nhận
// được khi bỏ yêu cầu đăng nhập).
var VOTE_SALT = 'doi-chuoi-nay-truoc-khi-deploy-binh-chon';

// reCAPTCHA v3 — Secret Key (KHÔNG dán vào frontend, chỉ dùng ở đây).
// Tạo tại https://www.google.com/recaptcha/admin — để trống '' để tắt kiểm tra.
var RECAPTCHA_SECRET_KEY = 'PASTE_RECAPTCHA_SECRET_KEY';
var RECAPTCHA_MIN_SCORE = 0.5; // 0 (giống bot) → 1 (giống người thật)

// Tên sheet lưu các bài đã xoá (xoá mềm — không mất dữ liệu)
var TRASH_SHEET_NAME = 'Đã xoá';

// Tên 3 sheet phục vụ React + Bình luận — TÁCH RIÊNG có chủ đích:
// "Người bình chọn" chỉ lưu mã băm THIẾT BỊ (ai đã dùng lượt — chặn dùng 2
// lần trên cùng thiết bị), "Kết quả bình chọn" chỉ lưu bài được React (2
// điểm/dòng), "Bình luận" lưu bài + nội dung bình luận (1 điểm/dòng, hiển thị
// công khai). KHÔNG sheet nào lưu kèm danh tính người tương tác → phiếu kín,
// không ai (kể cả quản trị viên) tra ngược được ai đã react/bình luận bài nào.
var VOTERS_SHEET_NAME = 'Người bình chọn';
var VOTES_SHEET_NAME = 'Kết quả bình chọn'; // mỗi dòng = 1 lượt React (2 điểm)
var COMMENTS_SHEET_NAME = 'Bình luận'; // mỗi dòng = 1 lượt bình luận (1 điểm), nội dung hiển thị công khai
var COMMENT_MAX_LEN = 500;
var COMMENT_MIN_WORDS = 20; // chặn bình luận spam kiểu "hay quá", "đẹp" — bắt buộc viết nội dung thật

// Giới hạn dung lượng mỗi file upload trực tiếp (MB). File nặng hơn → dùng link.
var MAX_FILE_MB = 45;

// Múi giờ hiển thị
var TZ = 'GMT+7';

// --- Thời gian giữ cache (giây) — điều chỉnh theo mức độ đông người ----------
// Danh sách bài + ảnh bìa gần như KHÔNG đổi trong suốt đợt bình chọn, nhưng
// tính lại thì rất đắt (quét thư mục Drive của từng bài). Giữ 6 giờ (mức tối đa
// của CacheService) và xoá cache thủ công khi cần bằng ?action=syncImages.
var CACHE_TTL_ENTRIES = 21600;
// Bình luận công khai. KHÔNG xoá cache này mỗi lượt gửi: 60-70 người bấm gửi liên
// tục sẽ khiến gần như lượt mở trang nào cũng phải đọc lại Sheet. Chậm tối đa
// 30 giây là chấp nhận được — người vừa bình luận đã thấy ngay bình luận của
// mình nhờ trang tự thêm vào (xem useVoteSession).
var CACHE_TTL_BOARD = 30;
var BOARD_CACHE_KEY = 'voteBoard';
// Sheet lưu tổng điểm (React ×2 + Bình luận ×1) — chỉ quản trị viên xem trong
// Google Sheet, web KHÔNG hiển thị điểm/xếp hạng. Xem exportScores().
var SCORES_SHEET_NAME = 'Tổng điểm';
// Danh sách mã băm người đã dùng lượt — giữ trong bộ nhớ đệm để bước kiểm tra
// trùng lượt không phải đọc Sheet (đọc Sheet ~300ms, đọc cache ~5ms). Đây là
// bước nằm TRONG khoá, nên nhanh được bao nhiêu thì chịu tải tốt bấy nhiêu.
var CACHE_TTL_VOTERS = 21600;
var VOTERS_CACHE_KEY = 'voterHashes';
// Nhớ rằng 3 sheet bình chọn đã có dòng tiêu đề, để mỗi lượt gửi không phải
// gọi getLastRow() 3 lần chỉ để hỏi đi hỏi lại cùng một câu (mỗi lần ~150ms).
var SHEETS_READY_CACHE_KEY = 'voteSheetsReady';
var ENTRIES_CACHE_KEY = 'voteEntries';
var ENTRY_IDS_CACHE_KEY = 'voteEntryIds';
// ----------------------------------------------------------------------------

var HEADERS = [
  'Thời gian nộp', 'Họ tên', 'Email', 'SĐT', 'Nhóm/Ban ngành',
  'Tên tác phẩm', 'Hình thức', 'Thành viên nhóm', 'Ghi chú',
  'Link file nguồn (dán)', 'File đã upload', 'Thư mục bài nộp',
];

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Cache dữ liệu CHỈ ĐỌC qua CacheService (dùng chung giữa mọi lượt gọi script,
// tối đa 6 giờ) để giảm số lần đọc Sheet/Drive khi đông người truy cập. Chỉ
// cache kết quả THÀNH CÔNG (ok:true) — lỗi tạm thời không bị cache lại.
function cachedData(cacheKey, ttlSeconds, computeFn) {
  var cache = CacheService.getScriptCache();
  var cached = readCacheJson(cache, cacheKey);
  if (cached) return cached;

  var result = computeFn();
  if (result && result.ok) {
    try {
      cache.put(cacheKey, JSON.stringify(result), ttlSeconds);
    } catch (writeErr) {
      // Kết quả quá lớn để cache (>100KB) hoặc lỗi tạm thời — bỏ qua, vẫn trả kết quả bình thường
    }
  }
  return result;
}

// Như cachedData nhưng có "single-flight": khi cache hết hạn mà CÓ ĐÔNG NGƯỜI
// cùng mở trang (VD 60-70 người vào /binh-chon trong vài giây), chỉ 1 lượt
// chạy thật sự tính lại, các lượt còn lại đợi rồi đọc cache. Không có bước này
// thì cả 70 lượt cùng quét Google Drive để tìm ảnh bìa (mỗi lượt hàng chục
// giây) → vượt giới hạn số lượt chạy đồng thời của Apps Script và gần như ai
// cũng gặp lỗi. Chỉ dùng cho dữ liệu ĐẮT (voteEntries); dữ liệu rẻ thì khoá
// lại phản tác dụng vì phải xếp hàng chung với lượt gửi bình chọn.
function cachedDataSingleFlight(cacheKey, ttlSeconds, computeFn) {
  var cache = CacheService.getScriptCache();
  var cached = readCacheJson(cache, cacheKey);
  if (cached) return cached;

  var lock = LockService.getScriptLock();
  var locked = false;
  try { locked = lock.tryLock(30000); } catch (lockErr) { locked = false; }
  try {
    if (locked) {
      // Đợi xong khoá: rất có thể lượt chạy trước đã tính và điền cache rồi
      cached = readCacheJson(cache, cacheKey);
      if (cached) return cached;
    }
    var result = computeFn();
    if (result && result.ok) {
      try {
        cache.put(cacheKey, JSON.stringify(result), ttlSeconds);
      } catch (writeErr) {}
    }
    return result;
  } finally {
    if (locked) lock.releaseLock();
  }
}

function readCacheJson(cache, cacheKey) {
  try {
    var raw = cache.get(cacheKey);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null; // Cache lỗi/hỏng (hiếm) → tính lại bình thường
  }
}

// Xoá cache công khai để trang tải lại dữ liệu mới nhất (dùng sau syncImages).
function invalidatePublicCache(keys) {
  try {
    CacheService.getScriptCache().removeAll(keys);
  } catch (err) {
    // Không ảnh hưởng chức năng nếu xoá cache lỗi — TTL sẽ tự hết hạn sau đó
  }
}

// GET:
//   .../exec                      → kiểm tra sức khỏe (mở URL bằng trình duyệt để test)
//   .../exec?action=list          → danh sách công khai các bài đã nộp (tên, nhóm, tác phẩm, giờ nộp)
//   .../exec?action=voteEntries   → danh sách bài dự thi khổ A3 để React/bình luận (kèm ID ảnh bìa)
//   .../exec?action=votePage&deviceId=... → phần động của trang bình chọn: bình luận, thiết bị đã vote chưa
//   .../exec?action=voteResults&key=ADMIN_KEY      → bảng xếp hạng chi tiết có tên thí sinh (quản trị)
//   .../exec?action=top3&key=ADMIN_KEY             → 3 bài điểm cao nhất, KHÔNG theo thứ hạng (quản trị)
//   .../exec?action=voteState&key=ADMIN_KEY        → số dòng đang có ở 3 sheet bình chọn (kiểm tra sau khi xoá)
//   .../exec?action=syncImages[&key=ADMIN_KEY]     → đồng bộ quyền chia sẻ công khai cho toàn bộ ảnh trên Drive
function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === 'list') return handleList();
  if (action === 'voteEntries') return handleVoteEntries();
  if (action === 'votePage') return handleVotePage(e);
  if (action === 'voteResults') return handleVoteResults(e);
  if (action === 'top3') return handleTop3(e);
  if (action === 'voteState') return handleVoteState(e);
  if (action === 'syncImages' || action === 'fixImageSharing') return handleSyncImages(e);
  if (action === 'debugEntry') return handleDebugEntry(e);
  return json({ ok: true, service: 'nop-bai-du-thi', time: new Date() });
}

// Trích xuất Google Drive File ID từ bất kỳ định dạng link hoặc chuỗi ID nào
function extractDriveFileId(str) {
  if (!str) return '';
  var s = String(str).trim();
  var match = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
              s.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
              s.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
              s.match(/id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  var rawMatch = s.match(/^[a-zA-Z0-9_-]{25,}$/);
  return rawMatch ? rawMatch[0] : '';
}

// Trích xuất Google Drive Folder ID từ link thư mục
function extractDriveFolderId(str) {
  if (!str) return '';
  var s = String(str).trim();
  var match = s.match(/\/folders\/([a-zA-Z0-9_-]+)/) ||
              s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : '';
}

// Tìm ID ảnh bìa tốt nhất của 1 bài dự thi:
// 1. ƯU TIÊN SỐ 1: Quét trực tiếp thư mục Google Drive của bài nộp (cột 12).
//    Google Drive là nơi phản ánh chính xác nhất khi thí sinh/quản trị viên thêm hoặc sửa file bìa.
//    - Tìm file có chữ "bia" hoặc "cover" VÀ là file ảnh (.png, .jpg, .jpeg, .webp, .gif)
//    - Nếu không có chữ "bia", lấy file ảnh web có thời gian cập nhật mới nhất (getLastUpdated)
// 2. ƯU TIÊN SỐ 2 (FALLBACK): Quét các dòng trong cột "File đã upload" (cột 11)
// 3. ƯU TIÊN SỐ 3: Cột link nguồn (cột 10)
function findBestCoverImageId(uploadCellStr, sourceLinkStr, folderUrlStr) {
  // 1. Quét thư mục bài nộp trên Google Drive (cột 12)
  if (folderUrlStr) {
    var folderId = extractDriveFolderId(folderUrlStr);
    if (folderId) {
      try {
        var folder = DriveApp.getFolderById(folderId);
        var files = folder.getFiles();
        var candidates = [];

        while (files.hasNext()) {
          var f = files.next();
          var fn = f.getName().toLowerCase();
          var mime = f.getMimeType();
          var isImg = mime.indexOf('image/') === 0 || /\.(png|jpe?g|webp|gif)$/i.test(fn);

          if (isImg) {
            var score = 0;
            // File có chữ "bia" hoặc "cover" trong tên
            if (fn.indexOf('bia') !== -1 || fn.indexOf('cover') !== -1) score += 100;
            // File định dạng ảnh web thông dụng
            if (/\.(png|jpe?g|webp)$/i.test(fn)) score += 20;

            var updatedTime = 0;
            try { updatedTime = f.getLastUpdated().getTime(); } catch (uErr) {}

            candidates.push({
              id: f.getId(),
              name: f.getName(),
              score: score,
              updatedTime: updatedTime,
              fileObj: f,
            });
          }
        }

        if (candidates.length > 0) {
          // Sắp xếp: điểm cao hơn trước (ưu tiên chữ "bia"), nếu bằng điểm thì file cập nhật mới hơn trước
          candidates.sort(function (a, b) {
            if (b.score !== a.score) return b.score - a.score;
            return b.updatedTime - a.updatedTime;
          });

          var chosen = candidates[0];
          try {
            chosen.fileObj.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          } catch (shareErr) {}

          return chosen.id;
        }
      } catch (fErr) {}
    }
  }

  // 2. Fallback: Đọc từ cột "File đã upload" (cột 11)
  var rawUpload = String(uploadCellStr || '').trim();
  var lines = rawUpload ? rawUpload.split('\n').map(function (l) { return l.trim(); }).filter(String) : [];

  // Duyệt từ dưới lên trên (dòng sau thường là file mới hơn)
  for (var i = lines.length - 1; i >= 0; i--) {
    var line = lines[i];
    if (/bia|cover/i.test(line) && /\.(png|jpe?g|webp|gif)($|:|\?|\s)/i.test(line)) {
      var id = extractDriveFileId(line);
      if (id) return id;
    }
  }

  for (var j = lines.length - 1; j >= 0; j--) {
    if (/\.(png|jpe?g|webp|gif)($|:|\?|\s)/i.test(lines[j])) {
      var id2 = extractDriveFileId(lines[j]);
      if (id2) return id2;
    }
  }

  for (var k = lines.length - 1; k >= 0; k--) {
    if (/bia|cover/i.test(lines[k])) {
      var id3 = extractDriveFileId(lines[k]);
      if (id3) return id3;
    }
  }

  for (var m = lines.length - 1; m >= 0; m--) {
    if (!/\.(ai|psd|eps|zip|rar|7z|indd)($|:|\?|\s)/i.test(lines[m])) {
      var id4 = extractDriveFileId(lines[m]);
      if (id4) return id4;
    }
  }

  if (lines.length > 0) {
    var id5 = extractDriveFileId(lines[lines.length - 1]);
    if (id5) return id5;
  }

  // 3. Fallback: Cột link nguồn (sourceLink)
  return extractDriveFileId(sourceLinkStr);
}

// Mã định danh ổn định cho 1 bài dự thi dùng khi bình chọn: chính là "Thời gian nộp"
// (đã có sẵn cho mọi dòng, đủ duy nhất ở độ chính xác từng giây cho quy mô cuộc thi này)
function entryIdOf(timeValue) {
  return timeValue instanceof Date
    ? Utilities.formatDate(timeValue, TZ, 'yyyy-MM-dd HH:mm:ss')
    : String(timeValue || '');
}

// Danh sách bài dự thi để hiển thị trang bình chọn: nhóm, tác phẩm, mô tả ý
// tưởng + ảnh bìa khổ A3 Ngang.
// CỐ Ý KHÔNG trả về Họ tên/Thành viên nhóm — để người bình chọn không biết
// bài nào của ai, tránh thiên vị theo quen biết thay vì đánh giá tác phẩm.
function handleVoteEntries() {
  return json(getVoteEntriesData());
}

// Danh sách bài dự thi + ảnh bìa (quét Drive — RẤT chậm, cache 6 giờ). Chỉ
// scripts/snapshot.mjs gọi (?action=voteEntries) để đóng gói thành dữ liệu tĩnh
// cho web; trang bình chọn và bước gửi phiếu không đụng tới hàm này nữa.
function getVoteEntriesData() {
  return cachedDataSingleFlight(ENTRIES_CACHE_KEY, CACHE_TTL_ENTRIES, function () {
    try {
      var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
      var lastRow = sheet.getLastRow();
      if (lastRow <= 1) return { ok: true, count: 0, entries: [] };

      var values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
      var entries = values
        .map(function (r) {
          var uploadCell = String(r[10] || '');
          var sourceLink = String(r[9] || '');
          var folderUrl = String(r[11] || '');
          var fileId = findBestCoverImageId(uploadCell, sourceLink, folderUrl);

          return {
            id: entryIdOf(r[0]),
            group: String(r[4] || ''),
            title: String(r[5] || ''),
            entryType: String(r[6] || ''),
            description: String(r[8] || ''), // "Ghi chú" (mô tả ý tưởng) — an toàn để công khai
            imageFileId: fileId,
            thumbUrl: fileId ? ('https://drive.google.com/thumbnail?id=' + fileId + '&sz=w800') : '',
            fullUrl: fileId ? ('https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1600') : '',
          };
        })
        .filter(function (entry) { return entry.imageFileId; }); // ẩn bài không có ảnh hợp lệ

      return { ok: true, count: entries.length, entries: entries };
    } catch (err) {
      return { ok: false, error: String(err && err.message ? err.message : err) };
    }
  });
}

// Hâm nóng cache trước giờ mở bình chọn. Lần tính đầu tiên phải quét thư mục
// Drive của TỪNG bài (khoảng 0,7 giây/bài) — nếu để nguội thì người đầu tiên
// vào trang phải đợi cả chục giây và mọi người vào cùng lúc cũng đợi theo.
// Cách dùng: mở Apps Script → chọn hàm warmCache → Run, hoặc đặt Trigger theo
// thời gian (mỗi 4 giờ) để cache không bao giờ nguội trong suốt đợt bình chọn.
function warmCache() {
  CacheService.getScriptCache().remove(ENTRIES_CACHE_KEY);
  var data = getVoteEntriesData();
  checkEntryIdsExist(['warm']);
  getVoteBoard();
  readVoterHashes();
  return 'Đã nạp sẵn ' + ((data.entries || []).length) + ' bài dự thi vào bộ nhớ đệm.';
}

// Phần ĐỘNG của trang bình chọn, 1 lượt gọi: bình luận + thiết bị này vote
// chưa. Danh sách bài + ảnh là snapshot tĩnh trên web (scripts/snapshot.mjs),
// web tự xáo trộn thứ tự. KHÔNG trả điểm hay thứ tự theo điểm — kết quả chỉ
// quản trị viên xem (nút Top 3 / sheet "Tổng điểm").
function handleVotePage(e) {
  try {
    var board = getVoteBoard();
    if (!board.ok) return json(board);

    var deviceId = String((e && e.parameter && e.parameter.deviceId) || '').trim();
    var voted = false;
    if (deviceId) {
      try { voted = readVoterHashes().indexOf(voterHashOf(deviceId)) !== -1; } catch (vErr) {}
    }

    return json({ ok: true, comments: board.comments, voted: voted });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

// Bình luận công khai (ẩn danh) gộp theo bài: { entryId: [nội dung, ...] }.
function readComments(ss) {
  var comments = {};
  var commentsSheet = ss.getSheetByName(COMMENTS_SHEET_NAME);
  if (commentsSheet && commentsSheet.getLastRow() > 1) {
    commentsSheet.getRange(2, 1, commentsSheet.getLastRow() - 1, 2).getValues().forEach(function (r) {
      var entryId = String(r[0] || '');
      var text = String(r[1] || '');
      if (!entryId || !text) return;
      if (!comments[entryId]) comments[entryId] = [];
      comments[entryId].push(text);
    });
  }
  return comments;
}

// Bình luận cho trang bình chọn, cache 30 giây dùng chung.
function getVoteBoard() {
  return cachedData(BOARD_CACHE_KEY, CACHE_TTL_BOARD, function () {
    try {
      return { ok: true, comments: readComments(SpreadsheetApp.openById(SHEET_ID)) };
    } catch (err) {
      return { ok: false, error: String(err && err.message ? err.message : err) };
    }
  });
}

// Đồng bộ / Bật chia sẻ "Anyone with link — Viewer" cho toàn bộ ảnh bài thi trên Drive:
// Quét toàn bộ dòng trong Sheet (cả cột upload, link nguồn, và thư mục Drive của từng bài).
// Chạy qua: .../exec?action=syncImages (hoặc .../exec?action=fixImageSharing)
function handleSyncImages(e) {
  var key = e && e.parameter && e.parameter.key;
  if (ADMIN_KEY && String(key || '') !== ADMIN_KEY) {
    return json({ ok: false, error: 'Mã quản trị không đúng.' });
  }
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    var lastRow = sheet.getLastRow();
    var fixed = 0;
    var failed = 0;
    var checked = 0;
    var updatedRows = 0;

    if (lastRow > 1) {
      var range = sheet.getRange(2, 10, lastRow - 1, 3); // Cột 10 (Link nguồn), Cột 11 (Uploads), Cột 12 (Thư mục)
      var rows = range.getValues();

      rows.forEach(function (r, rowIndex) {
        var sourceLinkStr = String(r[0] || '');
        var uploadCellStr = String(r[1] || '');
        var folderUrlStr = String(r[2] || '');

        var lines = uploadCellStr ? uploadCellStr.split('\n').filter(String) : [];
        var allIds = [];

        // 1. Quét tất cả ID có trong uploadCellStr (từng dòng)
        lines.forEach(function (line) {
          var id = extractDriveFileId(line);
          if (id && allIds.indexOf(id) === -1) allIds.push(id);
        });

        // 2. Quét ID trong sourceLink
        var sId = extractDriveFileId(sourceLinkStr);
        if (sId && allIds.indexOf(sId) === -1) allIds.push(sId);

        // 3. Quét thư mục bài nộp trên Drive để tìm file ảnh mới nhất
        var folderId = extractDriveFolderId(folderUrlStr);
        var folderFileLinks = [];
        if (folderId) {
          try {
            var folder = DriveApp.getFolderById(folderId);
            var fIter = folder.getFiles();
            while (fIter.hasNext()) {
              var file = fIter.next();
              var fId = file.getId();
              if (allIds.indexOf(fId) === -1) allIds.push(fId);
              folderFileLinks.push(file.getName() + ': ' + file.getUrl());
            }
          } catch (fErr) {}
        }

        // Bật quyền xem Anyone with link cho tất cả file tìm được
        allIds.forEach(function (id) {
          checked++;
          try {
            DriveApp.getFileById(id).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            fixed++;
          } catch (shareErr) {
            failed++;
          }
        });

        // Nếu trong thư mục có file mới mà cột upload chưa ghi nhận đầy đủ, bổ sung vào Sheet
        if (folderFileLinks.length > lines.length) {
          try {
            sheet.getRange(rowIndex + 2, 11).setValue(folderFileLinks.join('\n'));
            updatedRows++;
          } catch (wErr) {}
        }
      });
    }

    // Danh sách bài + ảnh bìa được cache tới 6 giờ (xem CACHE_TTL_ENTRIES) nên
    // sau khi đồng bộ ảnh phải xoá cache, nếu không thì ảnh mới 6 giờ sau mới
    // hiện. Đây cũng là cách quản trị viên ép trang tải lại dữ liệu mới nhất.
    invalidatePublicCache([ENTRIES_CACHE_KEY, ENTRY_IDS_CACHE_KEY, BOARD_CACHE_KEY]);

    return json({
      ok: true,
      synced: fixed,
      failed: failed,
      totalFiles: checked,
      updatedRows: updatedRows,
    });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

// Đếm số dòng trong 1 sheet [Mã bài dự thi, ...] theo entryId (cột 1)
function countByEntryId(sheet, columnCount) {
  var counts = {};
  if (sheet && sheet.getLastRow() > 1) {
    var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, columnCount).getValues();
    rows.forEach(function (r) {
      var id = String(r[0] || '');
      if (id) counts[id] = (counts[id] || 0) + 1;
    });
  }
  return counts;
}

// Bảng điểm đầy đủ (có Họ tên tác giả) — chỉ dùng cho quản trị viên.
function computeResults(ss) {
  var reactCounts = countByEntryId(ss.getSheetByName(VOTES_SHEET_NAME), 1);
  var commentCounts = countByEntryId(ss.getSheetByName(COMMENTS_SHEET_NAME), 1);

  var mainSheet = ss.getSheets()[0];
  var lastRow = mainSheet.getLastRow();
  var results = [];
  var totalPoints = 0;
  if (lastRow > 1) {
    mainSheet.getRange(2, 1, lastRow - 1, 6).getValues().forEach(function (r) {
      var id = entryIdOf(r[0]);
      var reactCount = reactCounts[id] || 0;
      var commentCount = commentCounts[id] || 0;
      var points = reactCount * 2 + commentCount;
      totalPoints += points;
      results.push({
        id: id, name: String(r[1] || ''), group: String(r[4] || ''), title: String(r[5] || ''),
        points: points, reactCount: reactCount, commentCount: commentCount,
      });
    });
  }
  results.sort(function (a, b) {
    if (b.points !== a.points) return b.points - a.points;
    return b.reactCount - a.reactCount;
  });
  return { totalPoints: totalPoints, results: results };
}

// Bảng xếp hạng điểm chi tiết (chỉ quản trị viên có ADMIN_KEY) — bao gồm Họ tên tác giả
function handleVoteResults(e) {
  var key = e && e.parameter && e.parameter.key;
  if (!ADMIN_KEY || String(key || '') !== ADMIN_KEY) {
    return json({ ok: false, error: 'Không có quyền xem kết quả.' });
  }
  try {
    var data = computeResults(SpreadsheetApp.openById(SHEET_ID));
    return json({ ok: true, totalPoints: data.totalPoints, results: data.results });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

// 3 bài điểm cao nhất (chỉ quản trị viên) — xếp theo TÊN, không theo điểm, để
// công bố "top 3" mà không lộ ai hạng 1-2-3. Bài đồng hạng 3 (bằng cả điểm lẫn
// số React) được đưa vào luôn cho công bằng, nên danh sách có thể hơn 3 bài.
// Không trả số điểm.
function handleTop3(e) {
  var key = e && e.parameter && e.parameter.key;
  if (!ADMIN_KEY || String(key || '') !== ADMIN_KEY) {
    return json({ ok: false, error: 'Mã quản trị không đúng.' });
  }
  try {
    var ranked = computeResults(SpreadsheetApp.openById(SHEET_ID)).results.filter(function (r) { return r.points > 0; });
    var cut = ranked[2];
    var top = ranked.filter(function (r, i) {
      return i < 3 || (cut && r.points === cut.points && r.reactCount === cut.reactCount);
    });
    top.sort(function (a, b) { return a.title.localeCompare(b.title, 'vi'); });
    return json({
      ok: true,
      entries: top.map(function (r) { return { id: r.id, title: r.title, name: r.name }; }),
    });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

// Đếm dòng thật đang có ở 3 sheet bình chọn (chỉ quản trị viên) — dùng để
// kiểm tra từ xa rằng resetVotes đã xoá sạch trước giờ mở bình chọn.
function handleVoteState(e) {
  var key = e && e.parameter && e.parameter.key;
  if (!ADMIN_KEY || String(key || '') !== ADMIN_KEY) {
    return json({ ok: false, error: 'Mã quản trị không đúng.' });
  }
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var countRows = function (name) {
      var sheet = ss.getSheetByName(name);
      return sheet ? Math.max(0, sheet.getLastRow() - 1) : 0;
    };
    return json({
      ok: true,
      voters: countRows(VOTERS_SHEET_NAME),
      reacts: countRows(VOTES_SHEET_NAME),
      comments: countRows(COMMENTS_SHEET_NAME),
    });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

// XOÁ TOÀN BỘ DỮ LIỆU BÌNH CHỌN (tim, bình luận, người đã bình chọn) để bắt
// đầu lại từ đầu — VD sau khi chạy thử. Chỉ chạy tay trong trình soạn Apps
// Script: chọn hàm resetVotes → Run. KHÔNG có đường gọi qua web.
// An toàn: trước khi xoá, sao chép mỗi sheet thành "<tên> (sao lưu ...)" —
// cần khôi phục thì copy dữ liệu từ bản sao lưu về.
function resetVotes() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var stamp = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH-mm-ss');
  var report = [];
  [VOTERS_SHEET_NAME, VOTES_SHEET_NAME, COMMENTS_SHEET_NAME, SCORES_SHEET_NAME].forEach(function (name) {
    // Mỗi sheet xử lý độc lập: 1 sheet lỗi (VD trùng tên bản sao lưu) KHÔNG
    // được làm dừng cả hàm, nếu không các sheet sau vẫn còn nguyên dữ liệu cũ.
    try {
      var sheet = ss.getSheetByName(name);
      if (!sheet) { report.push(name + ': không có sheet'); return; }
      var rows = sheet.getLastRow() - 1;
      if (rows <= 0) { report.push(name + ': đã trống'); return; }

      try {
        sheet.copyTo(ss).setName(name + ' (sao lưu ' + stamp + ')');
      } catch (copyErr) {
        report.push(name + ': KHÔNG sao lưu được (' + copyErr.message + ') — vẫn xoá');
      }
      // Xoá nội dung thay vì deleteRows: Sheets không cho xoá hết mọi dòng không
      // cố định (dòng tiêu đề đang freeze). appendRow sau đó ghi tiếp từ dòng 2.
      sheet.getRange(2, 1, rows, sheet.getMaxColumns()).clearContent();
      report.push(name + ': đã xoá ' + rows + ' dòng');
    } catch (err) {
      report.push(name + ': LỖI ' + err.message);
    }
  });
  // Bộ nhớ đệm còn giữ danh sách người đã vote + bình luận → phải xoá theo
  invalidatePublicCache([VOTERS_CACHE_KEY, BOARD_CACHE_KEY, SHEETS_READY_CACHE_KEY]);
  return report.join(' | ');
}

// Ghi bảng điểm vào sheet "Tổng điểm" (điểm cao → thấp). Web không hiển thị
// điểm/xếp hạng — quản trị viên xem ở đây hoặc tải về Excel (File → Download).
// Sau cột Tổng điểm là TOÀN BỘ lời bình luận của bài, mỗi lời 1 cột sang ngang
// ("Bình luận 1", "Bình luận 2", ...) để BGK đọc nội dung ngay trên cùng hàng.
// Chạy tay: chọn hàm exportScores → Run. Tự động: chạy setupScoreTrigger 1 lần.
function exportScores() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var data = computeResults(ss);
  var comments = readComments(ss);
  var maxComments = 0;
  data.results.forEach(function (r) { maxComments = Math.max(maxComments, (comments[r.id] || []).length); });

  var header = ['Hạng', 'Tên tác phẩm', 'Họ tên', 'Nhóm/Ban ngành', 'Lượt React (×2)', 'Lượt bình luận (×1)', 'Tổng điểm'];
  var fixedColumns = header.length;
  for (var c = 1; c <= maxComments; c++) header.push('Bình luận ' + c);
  // Bài bằng cả tổng điểm lẫn số React mang CÙNG số hạng (1, 2, 2, 4...) — đánh
  // số chạy liên tiếp thì BGK dễ trao giải nhầm cho bài tình cờ đứng trên, trong
  // khi thực chất 2 bài ngang nhau. Cột Hạng vẫn là SỐ để lọc/sắp xếp được.
  // Bài CHƯA có điểm thì để trống cột Hạng — nếu không, lúc chưa ai bình chọn
  // mọi bài đều 0 điểm và cùng mang hạng 1, nhìn như bảng bị lỗi.
  var rankOf = [];
  data.results.forEach(function (r, i) {
    if (!r.points) { rankOf.push(''); return; }
    var prev = data.results[i - 1];
    var tied = prev && prev.points === r.points && prev.reactCount === r.reactCount;
    rankOf.push(tied ? rankOf[i - 1] : i + 1);
  });

  var rows = data.results.map(function (r, i) {
    var texts = comments[r.id] || [];
    var row = [rankOf[i], r.title, r.name, r.group, r.reactCount, r.commentCount, r.points];
    for (var k = 0; k < maxComments; k++) row.push(texts[k] || '');
    return row;
  });

  var sheet = ss.getSheetByName(SCORES_SHEET_NAME) || ss.insertSheet(SCORES_SHEET_NAME);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  // Giữ cột Tên tác phẩm đứng yên khi kéo ngang đọc bình luận
  sheet.setFrozenColumns(2);
  if (rows.length) sheet.getRange(2, 1, rows.length, header.length).setValues(rows);
  if (maxComments && rows.length) {
    sheet.setColumnWidths(fixedColumns + 1, maxComments, 320);
    sheet.getRange(2, fixedColumns + 1, rows.length, maxComments).setWrap(true).setVerticalAlignment('top');
  }
  sheet.getRange(1, header.length + 2).setValue(
    'Cập nhật: ' + Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss') + ' · Tổng điểm: ' + data.totalPoints,
  );
  return 'Đã ghi ' + rows.length + ' bài vào sheet "' + SCORES_SHEET_NAME + '".';
}

// Chạy 1 LẦN để sheet "Tổng điểm" tự cập nhật mỗi 5 phút (chạy lại không bị nhân đôi trigger).
function setupScoreTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'exportScores') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('exportScores').timeBased().everyMinutes(5).create();
  return exportScores();
}

// Trả về danh sách bài nộp (chỉ các cột công khai — KHÔNG gồm email/SĐT), mới nhất trước
function handleList() {
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return json({ ok: true, count: 0, entries: [] });

    var values = sheet.getRange(2, 1, lastRow - 1, 8).getValues(); // Thời gian, Họ tên, Email, SĐT, Nhóm, Tác phẩm, Hình thức, Thành viên
    var entries = values.map(function (r, i) {
      var time = r[0];
      if (time instanceof Date) time = Utilities.formatDate(time, TZ, 'dd/MM HH:mm');
      else time = String(time || '').replace(/^\d{4}-(\d{2})-(\d{2}) (\d{2}:\d{2}).*$/, '$2/$1 $3');
      var members = String(r[7] || '').split(',').map(function (m) { return m.trim(); }).filter(String);
      // row: số dòng thật trong Sheet — dùng cho chức năng xoá của quản trị viên
      return {
        time: time, name: String(r[1] || ''), group: String(r[4] || ''), title: String(r[5] || ''),
        entryType: String(r[6] || ''), members: members, row: i + 2,
      };
    });
    entries.reverse(); // mới nhất lên đầu

    return json({ ok: true, count: entries.length, entries: entries });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json({ ok: false, error: 'Không có dữ liệu gửi lên.' });
    }
    var data = JSON.parse(e.postData.contents);

    // Yêu cầu xoá bài (chỉ quản trị viên có ADMIN_KEY)
    if (data.action === 'delete') return handleDelete(data);

    // Gửi lượt React + bình luận
    if (data.action === 'engage') return handleEngage(data);

    // 1) Kiểm tra thông tin bắt buộc
    var required = [
      ['fullName', 'Họ tên'], ['email', 'Email'], ['phone', 'SĐT'],
      ['group', 'Nhóm/Ban ngành'], ['title', 'Tên tác phẩm'],
      ['entryType', 'Hình thức dự thi'], ['notes', 'Mô tả ý tưởng'],
    ];
    for (var i = 0; i < required.length; i++) {
      if (!String(data[required[i][0]] || '').trim()) {
        return json({ ok: false, error: 'Vui lòng nhập đầy đủ thông tin: thiếu "' + required[i][1] + '".' });
      }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(data.email).trim())) {
      return json({ ok: false, error: 'Email không hợp lệ.' });
    }
    if (!/^(0|\+84)(\d[\s.-]?){8,10}$/.test(String(data.phone).trim())) {
      return json({ ok: false, error: 'Số điện thoại không hợp lệ.' });
    }
    if (String(data.entryType) === 'Làm nhóm') {
      var members = (data.members || []).map(function (m) { return String(m || '').trim(); }).filter(String);
      if (members.length < 3) {
        return json({ ok: false, error: 'Vui lòng nhập đủ họ tên 3 thành viên nhóm.' });
      }
    }
    if ((!data.files || !data.files.length) && !data.sourceLink) {
      return json({ ok: false, error: 'Cần tải lên ít nhất 1 file hoặc dán link bài dự thi.' });
    }

    // 2) Chặn nộp lần 2: email hoặc SĐT đã có bài trong Sheet thì từ chối
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var contactRows = sheet.getRange(2, 3, lastRow - 1, 2).getValues(); // Email, SĐT
      var emailNorm = String(data.email).trim().toLowerCase();
      var phoneNorm = normalizePhone(data.phone);
      for (var c = 0; c < contactRows.length; c++) {
        if (String(contactRows[c][0] || '').trim().toLowerCase() === emailNorm) {
          return json({ ok: false, error: 'Email này đã nộp bài rồi — mỗi người chỉ được nộp 1 lần.' });
        }
        if (phoneNorm && normalizePhone(contactRows[c][1]) === phoneNorm) {
          return json({ ok: false, error: 'Số điện thoại này đã nộp bài rồi — mỗi người chỉ được nộp 1 lần.' });
        }
      }
    }

    // 3) Tạo thư mục con cho bài nộp
    var parent = DriveApp.getFolderById(FOLDER_ID);
    var stamp = Utilities.formatDate(new Date(), TZ, 'yyyyMMdd-HHmmss');
    var safeName = String(data.fullName).replace(/[\\/:*?"<>|]/g, '').slice(0, 60).trim();
    var safeTitle = String(data.title).replace(/[\\/:*?"<>|]/g, '').slice(0, 60).trim();
    var folder = parent.createFolder(stamp + ' · ' + safeName + ' · ' + safeTitle);

    // 4) Lưu từng file
    var fileLinks = [];
    (data.files || []).forEach(function (f, index) {
      var bytes = Utilities.base64Decode(f.data);
      var sizeMb = bytes.length / (1024 * 1024);
      if (sizeMb > MAX_FILE_MB) {
        throw new Error('File "' + f.name + '" vượt giới hạn ' + MAX_FILE_MB + 'MB. Hãy dùng ô dán link.');
      }
      var blob = Utilities.newBlob(bytes, f.mimeType || 'application/octet-stream', f.name);
      var file = folder.createFile(blob);
      if (index === 0) {
        // File đầu tiên luôn là ảnh bìa dự thi (form bắt buộc chọn ảnh trước —
        // xem SubmitForm/validateSubmission phía web). Bật chia sẻ "xem qua
        // link" để trang bình chọn hiển thị được ảnh mà không cần đăng nhập.
        // File nguồn (.ai/.psd/...) nếu có KHÔNG bật chia sẻ — vẫn giữ riêng tư.
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      }
      fileLinks.push(f.name + ': ' + file.getUrl());
    });

    if ((!data.files || !data.files.length) && data.sourceLink) {
      var sourceDriveId = extractDriveFileId(data.sourceLink);
      if (sourceDriveId) {
        try {
          DriveApp.getFileById(sourceDriveId).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (linkShareErr) {}
      }
    }

    // 5) Ghi record vào Sheet
    ensureHeader(sheet);
    sheet.appendRow([
      Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'),
      data.fullName || '',
      data.email || '',
      data.phone || '',
      data.group || '',
      data.title || '',
      data.entryType || '',
      (data.members || []).join(', '),
      data.notes || '',
      data.sourceLink || '',
      fileLinks.join('\n'),
      folder.getUrl(),
    ]);

    // Số thứ tự bài dự thi (tổng số dòng dữ liệu sau khi ghi)
    var count = sheet.getLastRow() - 1;

    return json({ ok: true, folderUrl: folder.getUrl(), files: fileLinks, count: count });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

// Chuẩn hoá SĐT về dạng 0xxxxxxxxx để so trùng (bỏ khoảng trắng/gạch, +84 → 0)
function normalizePhone(phone) {
  var digits = String(phone || '').replace(/\D/g, '');
  if (digits.indexOf('84') === 0) digits = '0' + digits.slice(2);
  return digits;
}

// Gọi Google để xác minh 1 token reCAPTCHA v3 — trả điểm 0 (giống bot) → 1
// (giống người thật). Nếu chưa cấu hình RECAPTCHA_SECRET_KEY thì bỏ qua bước
// này (cho phép chạy thử trước khi setup xong).
function verifyRecaptcha(token) {
  if (!RECAPTCHA_SECRET_KEY || RECAPTCHA_SECRET_KEY.indexOf('PASTE_') === 0) return { ok: true };
  if (!token) return { ok: false, error: 'Thiếu xác minh reCAPTCHA — hãy tải lại trang.' };
  try {
    var response = UrlFetchApp.fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'post',
      payload: { secret: RECAPTCHA_SECRET_KEY, response: token },
      muteHttpExceptions: true,
    });
    var result = JSON.parse(response.getContentText());
    if (!result.success || (typeof result.score === 'number' && result.score < RECAPTCHA_MIN_SCORE)) {
      return { ok: false, error: 'Hệ thống nghi ngờ đây là bot — vui lòng thử lại.' };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: 'Không xác minh được reCAPTCHA, vui lòng thử lại.' };
  }
}

// Kiểm tra 1 danh sách entryId có thực sự là bài dự thi không. Chỉ đọc CỘT MÃ
// BÀI của sheet chính (cache 6 giờ) — KHÔNG dùng danh sách bài có ảnh bìa, vì
// danh sách đó phải quét Drive (~0,7 giây/bài) và giữ khoá chung với bước gửi
// phiếu: lúc cache nguội, người gửi đầu tiên sẽ chặn tất cả người sau.
// Trả về { entryId: true|false }.
function checkEntryIdsExist(entryIds) {
  var result = {};
  entryIds.forEach(function (id) { if (id) result[id] = false; });
  if (!Object.keys(result).length) return result;

  var data = cachedData(ENTRY_IDS_CACHE_KEY, CACHE_TTL_ENTRIES, function () {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    var lastRow = sheet.getLastRow();
    var ids = lastRow > 1
      ? sheet.getRange(2, 1, lastRow - 1, 1).getValues().map(function (r) { return entryIdOf(r[0]); })
      : [];
    return { ok: true, ids: ids };
  });
  (data.ids || []).forEach(function (id) {
    if (Object.prototype.hasOwnProperty.call(result, id)) result[id] = true;
  });
  return result;
}

// Mã băm 1 chiều của 1 thiết bị (SHA-256 + VOTE_SALT) — thứ duy nhất được lưu
// lại để chặn dùng quá 1 lượt, không lần ngược ra mã thiết bị gốc được.
function voterHashOf(deviceId) {
  return Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(deviceId) + VOTE_SALT),
  );
}

// Danh sách mã băm đã dùng lượt, ưu tiên đọc từ cache. Cache hết hạn/bị dọn →
// đọc lại từ sheet "Người bình chọn" (nguồn gốc bền vững) rồi cache lại.
// ponytail: nếu cache bị dọn ĐÚNG lúc 1 lượt vừa giữ chỗ nhưng chưa ghi xong
// sheet (cửa sổ ~2 giây, rất hiếm), thiết bị đó có thể bình chọn thêm 1 lần.
// Cần chặt hơn thì chuyển dedupe sang ghi thẳng 1 dòng "khoá" vào sheet trong
// lock, đổi lại mỗi lượt gửi chậm thêm ~300ms.
function readVoterHashes() {
  var cache = CacheService.getScriptCache();
  var cached = readCacheJson(cache, VOTERS_CACHE_KEY);
  if (cached) return cached;

  var hashes = [];
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(VOTERS_SHEET_NAME);
  if (sheet && sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().forEach(function (r) {
      if (r[0]) hashes.push(String(r[0]));
    });
  }
  writeVoterHashes(hashes);
  return hashes;
}

function writeVoterHashes(hashes) {
  try {
    var payload = JSON.stringify(hashes);
    // CacheService giới hạn 100KB/khoá (~2000 mã băm). Vượt ngưỡng thì thôi
    // không cache — mỗi lượt sẽ đọc lại Sheet, chậm hơn nhưng vẫn đúng.
    if (payload.length < 90000) CacheService.getScriptCache().put(VOTERS_CACHE_KEY, payload, CACHE_TTL_VOTERS);
  } catch (err) {}
}

// Ghi nhận 1 lượt React + bình luận — "phiếu kín, chống spam", KHÔNG yêu cầu
// đăng nhập tài khoản nào (đã bỏ Google Sign-In):
//  1) Honeypot 'hp' (field ẩn, chỉ bot điền vào) → coi như đã xử lý, không lộ lý do.
//  2) Chặn gửi quá nhanh sau khi tải trang (bot gửi ngay lập tức) — đo bằng số ms
//     đã trôi qua do CHÍNH TRÌNH DUYỆT tính (elapsedMs), không so trực tiếp với
//     Date.now() của server, để tránh đồng hồ máy người dùng lệch giờ làm từ chối
//     oan người tương tác thật.
//  3) Xác minh reCAPTCHA v3 (điểm hành vi người/bot).
//  4) Mỗi bài dự thi chỉ được nhận 1 trong 2 từ CÙNG 1 lượt bình chọn (React
//     HOẶC bình luận, không phải cả hai) — chặn thẳng nếu reactEntryId trùng
//     commentEntryId.
//  5) deviceId (mã thiết bị do trình duyệt tự sinh, xem src/utils/deviceId.ts)
//     đóng vai trò thay thế tài khoản Google — băm SHA-256 (có muối VOTE_SALT)
//     rồi so với sheet "Người bình chọn" để chặn CÙNG 1 THIẾT BỊ dùng quá 1
//     lượt. ĐÂY LÀ CHẶN Ở MỨC THIẾT BỊ, không phải danh tính thật — không còn
//     chặn được 1 người cố tình đổi máy/trình duyệt/xoá localStorage để bình
//     chọn lại, và không còn chặn được thí sinh tự bình chọn bài của chính
//     mình (cả 2 đều cần biết danh tính thật, đã bỏ khi bỏ đăng nhập).
//  6) LockService khoá toàn script khi kiểm tra-và-ghi → 2 yêu cầu gửi cùng lúc
//     (double-click, mạng chậm gửi lại...) không thể cùng lọt qua bước kiểm tra
//     "đã dùng lượt chưa" (tránh race condition khiến 1 thiết bị được 2 lần).
//  7) Danh tính chỉ lưu dưới dạng băm SHA-256 (có muối VOTE_SALT) ở sheet riêng
//     "Người bình chọn"; React lưu ở sheet "Kết quả bình chọn", bình luận lưu ở
//     sheet "Bình luận" — cả hai không kèm mã thiết bị → không sheet nào nối
//     được "thiết bị nào" với "đã tương tác bài nào".
function handleEngage(data) {
  if (String(data.hp || '').trim()) return json({ ok: true }); // bot dính honeypot

  if (Number(data.elapsedMs || 0) < 1500) {
    return json({ ok: false, error: 'Vui lòng thử lại sau ít giây.' });
  }

  var deviceId = String(data.deviceId || '').trim();
  if (!deviceId) {
    return json({ ok: false, error: 'Phiên bình chọn không hợp lệ — hãy tải lại trang rồi thử lại.' });
  }

  var reactEntryId = String(data.reactEntryId || '').trim();
  var commentEntryId = String(data.commentEntryId || '').trim();
  var commentText = String(data.commentText || '').trim();

  if (!reactEntryId && !commentEntryId) {
    return json({ ok: false, error: 'Vui lòng chọn ít nhất 1 bài để React hoặc để lại bình luận.' });
  }
  if (reactEntryId && commentEntryId && reactEntryId === commentEntryId) {
    return json({ ok: false, error: 'Không thể vừa React vừa bình luận trên cùng 1 bài dự thi — hãy chọn 2 bài khác nhau.' });
  }
  if (commentEntryId && !commentText) {
    return json({ ok: false, error: 'Vui lòng nhập nội dung bình luận.' });
  }
  if (commentEntryId) {
    var commentWordCount = commentText.split(/\s+/).filter(function (w) { return w.length > 0; }).length;
    if (commentWordCount < COMMENT_MIN_WORDS) {
      return json({
        ok: false,
        error: 'Bình luận cần tối thiểu ' + COMMENT_MIN_WORDS + ' từ (đang có ' + commentWordCount + ' từ) — viết cảm nhận thật để tránh spam.',
      });
    }
  }
  if (commentText.length > COMMENT_MAX_LEN) {
    return json({ ok: false, error: 'Bình luận quá dài (tối đa ' + COMMENT_MAX_LEN + ' ký tự).' });
  }

  var recaptchaCheck = verifyRecaptcha(data.recaptchaToken);
  if (!recaptchaCheck.ok) return json({ ok: false, error: recaptchaCheck.error });

  var entryExists = checkEntryIdsExist([reactEntryId, commentEntryId].filter(String));
  if (reactEntryId && !entryExists[reactEntryId]) {
    return json({ ok: false, error: 'Bài để React không hợp lệ — hãy tải lại trang.' });
  }
  if (commentEntryId && !entryExists[commentEntryId]) {
    return json({ ok: false, error: 'Bài để bình luận không hợp lệ — hãy tải lại trang.' });
  }

  var voterHash = voterHashOf(deviceId);

  // --- Phần DUY NHẤT cần khoá: "giữ chỗ" mã băm thiết bị ---------------------
  // Chỉ đọc/ghi bộ nhớ đệm (vài ms) rồi nhả khoá ngay. Trước đây cả phần ghi 3
  // sheet nằm trong khoá (~1.5-2.5 giây mỗi lượt) → 60-70 người bấm gửi cùng
  // lúc phải xếp hàng hơn 100 giây, quá mức chờ 10 giây nên đa số nhận lỗi
  // "Hệ thống đang bận". Nay mỗi lượt giữ khoá ~10ms → cả 70 lượt qua hết
  // trong khoảng 1 giây.
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return json({ ok: false, code: 'BUSY', error: 'Hệ thống đang bận, vui lòng thử lại.' });
  }
  var hashes;
  try {
    hashes = readVoterHashes();
    if (hashes.indexOf(voterHash) !== -1) {
      return json({
        ok: false,
        code: 'ALREADY_VOTED',
        error: 'Bạn đã bình chọn rồi.',
      });
    }
    hashes.push(voterHash);
    writeVoterHashes(hashes);
  } finally {
    lock.releaseLock();
  }

  // --- Ghi dữ liệu: chạy NGOÀI khoá -----------------------------------------
  // appendRow tự nối vào cuối sheet nên 2 lượt ghi song song không đè lên nhau.
  // Nếu ghi hỏng (hết hạn mức/timeout) thì trả lại "chỗ" đã giữ để người dùng
  // gửi lại được, tránh mất lượt oan.
  try {
    writeEngagement(voterHash, reactEntryId, commentEntryId, commentText);
  } catch (writeErr) {
    releaseVoterHash(voterHash);
    return json({ ok: false, code: 'BUSY', error: 'Chưa ghi nhận được, vui lòng gửi lại sau ít giây.' });
  }

  return json({ ok: true });
}

// Ghi 1 lượt bình chọn vào 3 sheet tách biệt (giữ nguyên nguyên tắc phiếu kín:
// sheet nào cũng không nối được "thiết bị nào" với "bài nào").
function writeEngagement(voterHash, reactEntryId, commentEntryId, commentText) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var now = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');

  // Lượt gửi đầu tiên kiểm tra tiêu đề 3 sheet rồi ghi nhớ; các lượt sau bỏ
  // qua hẳn bước đó — tiết kiệm ~450ms mỗi lượt bình chọn.
  var cache = CacheService.getScriptCache();
  var sheetsReady = cache.get(SHEETS_READY_CACHE_KEY) === '1';

  var votersSheet = ensureSheet(ss, VOTERS_SHEET_NAME, ['Mã định danh (băm thiết bị)', 'Thời gian dùng lượt'], sheetsReady);
  votersSheet.appendRow([voterHash, now]);

  if (reactEntryId) {
    ensureSheet(ss, VOTES_SHEET_NAME, ['Mã bài dự thi', 'Thời gian'], sheetsReady)
      .appendRow([reactEntryId, now]);
  }
  if (commentEntryId) {
    ensureSheet(ss, COMMENTS_SHEET_NAME, ['Mã bài dự thi', 'Nội dung bình luận', 'Thời gian'], sheetsReady)
      .appendRow([commentEntryId, commentText, now]);
  }

  if (!sheetsReady) {
    try { cache.put(SHEETS_READY_CACHE_KEY, '1', CACHE_TTL_VOTERS); } catch (err) {}
  }
}

// Bỏ "chỗ đã giữ" của 1 thiết bị khỏi bộ nhớ đệm khi ghi sheet thất bại
function releaseVoterHash(voterHash) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(5000); } catch (lockErr) { return; }
  try {
    var hashes = readVoterHashes();
    var index = hashes.indexOf(voterHash);
    if (index !== -1) {
      hashes.splice(index, 1);
      writeVoterHashes(hashes);
    }
  } finally {
    lock.releaseLock();
  }
}

// Lấy sheet theo tên, tạo mới kèm dòng tiêu đề nếu chưa có.
// assumeReady = đã biết chắc sheet tồn tại và có tiêu đề (xem SHEETS_READY_CACHE_KEY)
// → trả về ngay, bỏ được 1 lần gọi getLastRow().
function ensureSheet(ss, name, headerRow, assumeReady) {
  var existing = ss.getSheetByName(name);
  if (existing && assumeReady) return existing;

  var sheet = existing || ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headerRow);
    sheet.getRange(1, 1, 1, headerRow.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Xoá mềm 1 bài: chuyển dòng sang sheet "Đã xoá" rồi xoá khỏi sheet chính.
// An toàn: cần đúng ADMIN_KEY, và tên trên dòng phải khớp với tên phía web gửi lên
// (nếu Sheet đã bị thay đổi giữa chừng thì từ chối để tránh xoá nhầm dòng khác).
function handleDelete(data) {
  if (!ADMIN_KEY) {
    return json({ ok: false, error: 'Tính năng xoá đang tắt (chưa đặt ADMIN_KEY).' });
  }
  if (String(data.adminKey || '') !== ADMIN_KEY) {
    return json({ ok: false, error: 'Mã quản trị không đúng.' });
  }
  var row = Number(data.row);
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheets()[0];
  if (!row || row < 2 || row > sheet.getLastRow()) {
    return json({ ok: false, error: 'Dòng không hợp lệ, hãy tải lại danh sách.' });
  }
  var values = sheet.getRange(row, 1, 1, HEADERS.length).getValues()[0];
  if (String(values[1] || '') !== String(data.name || '')) {
    return json({ ok: false, error: 'Danh sách đã thay đổi, hãy tải lại rồi thử xoá lại.' });
  }
  var trash = ss.getSheetByName(TRASH_SHEET_NAME) || ss.insertSheet(TRASH_SHEET_NAME);
  if (trash.getLastRow() === 0) {
    trash.appendRow(HEADERS.concat(['Xoá lúc']));
    trash.getRange(1, 1, 1, HEADERS.length + 1).setFontWeight('bold');
    trash.setFrozenRows(1);
  }
  trash.appendRow(values.concat([Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss')]));
  sheet.deleteRow(row);
  return json({ ok: true, count: Math.max(0, sheet.getLastRow() - 1) });
}

// Ghi dòng tiêu đề nếu Sheet trống, hoặc tự cập nhật khi tiêu đề cũ lệch chuẩn
function ensureHeader(sheet) {
  var needWrite = sheet.getLastRow() === 0;
  if (!needWrite) {
    var current = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
    needWrite = HEADERS.some(function (header, i) {
      return String(current[i] || '') !== header;
    });
  }
  if (needWrite) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}

// Endpoint kiểm tra gỡ lỗi file của 1 dòng: ?action=debugEntry&row=2
function handleDebugEntry(e) {
  try {
    var rowNum = Number(e && e.parameter && e.parameter.row ? e.parameter.row : 2);
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    var rowValues = sheet.getRange(rowNum, 1, 1, HEADERS.length).getValues()[0];
    var folderUrl = String(rowValues[11] || '');
    var folderId = extractDriveFolderId(folderUrl);
    var filesInFolder = [];
    if (folderId) {
      try {
        var fIter = DriveApp.getFolderById(folderId).getFiles();
        while (fIter.hasNext()) {
          var f = fIter.next();
          filesInFolder.push({
            name: f.getName(),
            id: f.getId(),
            sizeMb: (f.getSize() / (1024 * 1024)).toFixed(2) + ' MB',
            mime: f.getMimeType(),
            updated: Utilities.formatDate(f.getLastUpdated(), TZ, 'yyyy-MM-dd HH:mm:ss'),
          });
        }
      } catch (dErr) {}
    }
    var uploadCell = String(rowValues[10] || '');
    var sourceLink = String(rowValues[9] || '');
    var bestId = findBestCoverImageId(uploadCell, sourceLink, folderUrl);

    return json({
      ok: true,
      row: rowNum,
      title: String(rowValues[5] || ''),
      author: String(rowValues[1] || ''),
      uploadCell: uploadCell,
      folderUrl: folderUrl,
      filesInFolder: filesInFolder,
      chosenImageId: bestId,
      chosenImageUrl: bestId ? ('https://drive.google.com/thumbnail?id=' + bestId + '&sz=w800') : '',
    });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}
