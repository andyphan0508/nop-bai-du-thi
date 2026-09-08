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

// Chuỗi bí mật để "băm" danh tính người bình chọn — đổi thành chuỗi ngẫu nhiên
// của riêng bạn (không cần nhớ, chỉ cần giữ cố định trong suốt đợt bình chọn).
var VOTE_SALT = 'doi-chuoi-nay-truoc-khi-deploy-binh-chon';

// Google Sign-In — PHẢI khớp với GOOGLE_CLIENT_ID bên src/config.ts (frontend).
// Dùng để xác minh token đăng nhập Google là thật + đúng đúng app này (chặn
// giả mạo token). Để trống '' thì server sẽ KHÔNG bắt buộc đăng nhập Google
// (không khuyến khích — dễ bị mở ẩn danh bình chọn nhiều lần).
var GOOGLE_CLIENT_ID = 'PASTE_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

// reCAPTCHA v3 — Secret Key (KHÔNG dán vào frontend, chỉ dùng ở đây).
// Tạo tại https://www.google.com/recaptcha/admin — để trống '' để tắt kiểm tra.
var RECAPTCHA_SECRET_KEY = 'PASTE_RECAPTCHA_SECRET_KEY';
var RECAPTCHA_MIN_SCORE = 0.5; // 0 (giống bot) → 1 (giống người thật)

// Tên sheet lưu các bài đã xoá (xoá mềm — không mất dữ liệu)
var TRASH_SHEET_NAME = 'Đã xoá';

// Tên 2 sheet phục vụ bình chọn — TÁCH RIÊNG có chủ đích:
// "Người bình chọn" chỉ lưu mã băm tài khoản Google (ai đã bình chọn — chặn
// bình chọn 2 lần), "Kết quả bình chọn" chỉ lưu bài được chọn (không kèm danh
// tính) → phiếu kín, không ai (kể cả quản trị viên) tra ngược được ai đã chọn
// bài nào.
var VOTERS_SHEET_NAME = 'Người bình chọn';
var VOTES_SHEET_NAME = 'Kết quả bình chọn';

// Sheet TUỲ CHỌN, tạo thủ công khi cần: dùng cho trường hợp 1 người nộp nhiều
// bài dự thi bằng NHIỀU EMAIL KHÁC NHAU (nên hệ thống không tự phát hiện được
// qua email nộp bài). Mỗi dòng là các email bạn XÁC NHẬN NGOÀI ĐỜI là CÙNG 1
// NGƯỜI, cách nhau bởi dấu phẩy, KHÔNG có dòng tiêu đề (bắt đầu từ dòng 1
// luôn). VD dòng: "email1@gmail.com, email2@gmail.com, email3@gmail.com".
// Không tạo sheet này thì tính năng chặn tự bình chọn vẫn hoạt động bình
// thường theo đúng email đã nộp bài (không ảnh hưởng gì nếu không dùng).
//
// CỐ Ý không dùng cách so tên (regex/độ giống tên) để tự phát hiện: tên hiển
// thị Google do người dùng tự đặt (không xác minh như email) nên dễ bị né
// tránh, và tên tiếng Việt rất dễ trùng giữa 2 người HOÀN TOÀN khác nhau →
// tự động chặn theo tên giống sẽ dễ chặn OAN người vô tội trùng tên với thí
// sinh, một lỗi công bằng còn tệ hơn việc bỏ sót vài phiếu gian lận.
var LINKED_EMAILS_SHEET_NAME = 'Email liên kết (cùng 1 người)';

// Giới hạn dung lượng mỗi file upload trực tiếp (MB). File nặng hơn → dùng link.
var MAX_FILE_MB = 45;

// Múi giờ hiển thị
var TZ = 'GMT+7';
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

// GET:
//   .../exec                      → kiểm tra sức khỏe (mở URL bằng trình duyệt để test)
//   .../exec?action=list          → danh sách công khai các bài đã nộp (tên, nhóm, tác phẩm, giờ nộp)
//   .../exec?action=voteEntries   → danh sách bài dự thi để bình chọn (kèm ID ảnh bìa)
//   .../exec?action=voteResults&key=ADMIN_KEY      → kết quả bình chọn (chỉ quản trị viên)
//   .../exec?action=fixImageSharing&key=ADMIN_KEY  → bật chia sẻ "xem qua link" cho ảnh
//                                                      bìa của các bài đã nộp TRƯỚC KHI có
//                                                      tính năng bình chọn (chạy 1 lần)
function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === 'list') return handleList();
  if (action === 'voteEntries') return handleVoteEntries();
  if (action === 'voteResults') return handleVoteResults(e);
  if (action === 'fixImageSharing') return handleFixImageSharing(e);
  return json({ ok: true, service: 'nop-bai-du-thi', time: new Date() });
}

// Mã định danh ổn định cho 1 bài dự thi dùng khi bình chọn: chính là "Thời gian nộp"
// (đã có sẵn cho mọi dòng, đủ duy nhất ở độ chính xác từng giây cho quy mô cuộc thi này)
function entryIdOf(timeValue) {
  return timeValue instanceof Date
    ? Utilities.formatDate(timeValue, TZ, 'yyyy-MM-dd HH:mm:ss')
    : String(timeValue || '');
}

// Danh sách bài dự thi để hiển thị trang bình chọn: nhóm, tác phẩm + ảnh bìa.
// CỐ Ý KHÔNG trả về Họ tên/Thành viên nhóm — để người bình chọn không biết
// bài nào của ai, tránh thiên vị theo quen biết thay vì đánh giá tác phẩm.
// (Tên đầy đủ vẫn có trong Sheet gốc và trong kết quả bình chọn cho quản trị
// viên xem qua ?action=voteResults, chỉ ẩn ở danh sách công khai này thôi.)
//
// Ảnh bìa luôn là file được upload ĐẦU TIÊN của mỗi bài (form bắt buộc chọn ảnh
// trước, xem SubmitForm/handleSubmit ở phía web) nên lấy link đầu tiên trong cột
// "File đã upload" là an toàn.
function handleVoteEntries() {
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return json({ ok: true, count: 0, entries: [] });

    var values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
    var entries = values
      .map(function (r) {
        var firstLink = String(r[10] || '').split('\n')[0] || '';
        var match = firstLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
        return {
          id: entryIdOf(r[0]),
          group: String(r[4] || ''),
          title: String(r[5] || ''),
          entryType: String(r[6] || ''),
          imageFileId: match ? match[1] : '',
        };
      })
      .filter(function (entry) { return entry.imageFileId; }); // ẩn bài không có ảnh hợp lệ

    return json({ ok: true, count: entries.length, entries: entries });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

// Bật chia sẻ "Anyone with link — Viewer" cho ảnh bìa của các bài đã nộp TRƯỚC
// khi có tính năng bình chọn (bài nộp MỚI đã tự bật chia sẻ ngay lúc nộp, xem
// doPost). Chỉ cần chạy 1 lần sau khi nâng cấp code này — mở URL này 1 lần
// trên trình duyệt là xong: .../exec?action=fixImageSharing&key=ADMIN_KEY
//
// (Lưu ý kỹ thuật: KHÔNG dùng cách "trả blob ảnh thẳng từ doGet" — Apps Script
// Web App không hỗ trợ kiểu trả về đó, chỉ nhận HtmlOutput/TextOutput. Vì vậy
// ảnh phải được đọc trực tiếp qua link chia sẻ Drive, không proxy qua script.)
function handleFixImageSharing(e) {
  var key = e && e.parameter && e.parameter.key;
  if (!ADMIN_KEY || String(key || '') !== ADMIN_KEY) {
    return json({ ok: false, error: 'Không có quyền.' });
  }
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    var lastRow = sheet.getLastRow();
    var fixed = 0;
    var failed = 0;
    if (lastRow > 1) {
      var uploads = sheet.getRange(2, 11, lastRow - 1, 1).getValues(); // cột "File đã upload"
      uploads.forEach(function (r) {
        var firstLink = String(r[0] || '').split('\n')[0] || '';
        var match = firstLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (!match) return;
        try {
          DriveApp.getFileById(match[1]).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          fixed++;
        } catch (fileErr) {
          failed++;
        }
      });
    }
    return json({ ok: true, fixed: fixed, failed: failed });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

// Kết quả bình chọn (chỉ quản trị viên, cần đúng ADMIN_KEY) — dùng để công bố
// người thắng cuộc sau khi đóng bình chọn. Không hiển thị công khai trong lúc
// đang bình chọn để tránh hiệu ứng "chạy theo số đông" / spam vào bài đang dẫn đầu.
function handleVoteResults(e) {
  var key = e && e.parameter && e.parameter.key;
  if (!ADMIN_KEY || String(key || '') !== ADMIN_KEY) {
    return json({ ok: false, error: 'Không có quyền xem kết quả.' });
  }
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var votesSheet = ss.getSheetByName(VOTES_SHEET_NAME);
    var tally = {};
    if (votesSheet && votesSheet.getLastRow() > 1) {
      var rows = votesSheet.getRange(2, 1, votesSheet.getLastRow() - 1, 1).getValues();
      rows.forEach(function (r) {
        var id = String(r[0] || '');
        if (id) tally[id] = (tally[id] || 0) + 1;
      });
    }
    var mainSheet = ss.getSheets()[0];
    var lastRow = mainSheet.getLastRow();
    var results = [];
    if (lastRow > 1) {
      var values = mainSheet.getRange(2, 1, lastRow - 1, 6).getValues();
      values.forEach(function (r) {
        var id = entryIdOf(r[0]);
        results.push({
          id: id, name: String(r[1] || ''), group: String(r[4] || ''), title: String(r[5] || ''),
          votes: tally[id] || 0,
        });
      });
    }
    results.sort(function (a, b) { return b.votes - a.votes; });
    var totalVotes = Object.keys(tally).reduce(function (sum, k) { return sum + tally[k]; }, 0);
    return json({ ok: true, totalVotes: totalVotes, results: results });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
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

    // Gửi phiếu bầu
    if (data.action === 'vote') return handleVote(data);

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

// Gọi Google để xác minh 1 ID token (JWT) từ Google Sign-In: đúng chữ ký,
// đúng ứng dụng (aud = GOOGLE_CLIENT_ID) và email đã xác minh. Đây là chốt
// chặn chính chống mở ẩn danh + bịa thông tin bình chọn nhiều lần — muốn vượt
// qua phải có nhiều tài khoản Google thật khác nhau, chứ không chỉ xoá
// localStorage hay gõ SĐT khác.
function verifyGoogleIdToken(token) {
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.indexOf('PASTE_') === 0) {
    return { ok: false, error: 'Trang chưa cấu hình đăng nhập Google — liên hệ Ban tổ chức.' };
  }
  if (!token) return { ok: false, error: 'Vui lòng đăng nhập Google để bình chọn.' };
  try {
    var response = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token),
      { muteHttpExceptions: true },
    );
    if (response.getResponseCode() !== 200) {
      return { ok: false, error: 'Đăng nhập Google không hợp lệ hoặc đã hết hạn — hãy đăng nhập lại.' };
    }
    var payload = JSON.parse(response.getContentText());
    if (payload.aud !== GOOGLE_CLIENT_ID) {
      return { ok: false, error: 'Token đăng nhập không khớp ứng dụng — hãy tải lại trang.' };
    }
    if (payload.email_verified !== 'true' && payload.email_verified !== true) {
      return { ok: false, error: 'Tài khoản Google chưa xác minh email.' };
    }
    return { ok: true, sub: String(payload.sub || ''), email: String(payload.email || '') };
  } catch (err) {
    return { ok: false, error: 'Không xác minh được đăng nhập Google, vui lòng thử lại.' };
  }
}

// Với 1 email nộp bài, tìm "cụm email" cùng 1 người thật — dựa vào sheet
// LINKED_EMAILS_SHEET_NAME do quản trị viên khai báo thủ công (xem giải thích
// ở khai báo hằng số phía trên). Trả về mảng email đã chuẩn hoá (chữ thường,
// trim); rỗng nếu sheet chưa tồn tại hoặc email không thuộc cụm nào đã khai.
function findLinkedEmailCluster(email) {
  var normalizedTarget = String(email || '').trim().toLowerCase();
  if (!normalizedTarget) return [];
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(LINKED_EMAILS_SHEET_NAME);
    if (!sheet || sheet.getLastRow() < 1) return [];
    var rows = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues();
    for (var i = 0; i < rows.length; i++) {
      var cluster = String(rows[i][0] || '')
        .split(',')
        .map(function (e) { return e.trim().toLowerCase(); })
        .filter(String);
      if (cluster.indexOf(normalizedTarget) !== -1) return cluster;
    }
    return [];
  } catch (err) {
    return [];
  }
}

// Ghi nhận 1 phiếu bầu — "phiếu kín, chống spam":
//  1) Honeypot 'hp' (field ẩn, chỉ bot điền vào) → coi như đã xử lý, không lộ lý do.
//  2) Chặn gửi quá nhanh sau khi tải trang (bot gửi ngay lập tức) — đo bằng số ms
//     đã trôi qua do CHÍNH TRÌNH DUYỆT tính (elapsedMs), không so trực tiếp với
//     Date.now() của server, để tránh đồng hồ máy người dùng lệch giờ làm từ chối
//     oan người bình chọn thật.
//  3) Xác minh reCAPTCHA v3 (điểm hành vi người/bot).
//  4) Xác minh token đăng nhập Google thật (không phải tự khai SĐT) — đây là
//     lý do mở ẩn danh (incognito) không giúp bình chọn thêm lần nữa: vẫn phải
//     đăng nhập lại bằng 1 tài khoản Google thật, không thể chỉ gõ số khác.
//  5) LockService khoá toàn script khi kiểm tra-và-ghi → 2 yêu cầu gửi cùng lúc
//     (double-click, mạng chậm gửi lại...) không thể cùng lọt qua bước kiểm tra
//     "đã bình chọn chưa" (tránh race condition khiến 1 người bình chọn được 2 lần).
//  6) Không cho tự bình chọn cho bài dự thi CỦA CHÍNH MÌNH — so email Google
//     đã xác minh với email đã dùng để nộp bài đó, CỘNG THÊM cụm email liên kết
//     (nếu quản trị viên đã khai báo — dùng cho trường hợp 1 người nộp nhiều
//     bài bằng nhiều email khác nhau). Chỉ chặn đúng (các) bài của người đó,
//     vẫn được chọn bài khác để bình chọn (không tính là đã dùng hết lượt).
//  7) Danh tính chỉ lưu dưới dạng băm SHA-256 (có muối VOTE_SALT) ở sheet riêng
//     "Người bình chọn"; lựa chọn bài dự thi lưu ở sheet riêng "Kết quả bình chọn"
//     không kèm danh tính → không sheet nào nối được "ai" với "chọn bài nào".
function handleVote(data) {
  if (String(data.hp || '').trim()) return json({ ok: true }); // bot dính honeypot

  if (Number(data.elapsedMs || 0) < 1500) {
    return json({ ok: false, error: 'Vui lòng thử lại sau ít giây.' });
  }

  var entryId = String(data.entryId || '').trim();
  if (!entryId) return json({ ok: false, error: 'Vui lòng chọn 1 bài dự thi để bình chọn.' });

  var recaptchaCheck = verifyRecaptcha(data.recaptchaToken);
  if (!recaptchaCheck.ok) return json({ ok: false, error: recaptchaCheck.error });

  var googleCheck = verifyGoogleIdToken(data.googleIdToken);
  if (!googleCheck.ok) return json({ ok: false, error: googleCheck.error });

  // Tìm bài dự thi theo entryId + lấy email đã dùng để nộp bài đó (đọc cùng
  // lúc để chặn tự bình chọn — không cần đọc lại Sheet lần 2).
  var mainSheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  var lastRow = mainSheet.getLastRow();
  var entryEmail = null; // null = không tìm thấy bài dự thi
  if (lastRow > 1) {
    var idAndEmail = mainSheet.getRange(2, 1, lastRow - 1, 3).getValues(); // Thời gian, Họ tên, Email
    for (var i = 0; i < idAndEmail.length; i++) {
      if (entryIdOf(idAndEmail[i][0]) === entryId) {
        entryEmail = String(idAndEmail[i][2] || '');
        break;
      }
    }
  }
  if (entryEmail === null) return json({ ok: false, error: 'Bài dự thi không hợp lệ — hãy tải lại trang.' });

  var voterEmailNorm = String(googleCheck.email || '').trim().toLowerCase();
  var sameContestantEmails = [entryEmail.trim().toLowerCase()].concat(findLinkedEmailCluster(entryEmail));
  if (voterEmailNorm && sameContestantEmails.indexOf(voterEmailNorm) !== -1) {
    return json({ ok: false, error: 'Đây là bài dự thi của bạn — hãy chọn 1 bài dự thi khác để bình chọn.' });
  }

  var voterHash = Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, googleCheck.sub + VOTE_SALT),
  );

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (lockErr) {
    return json({ ok: false, error: 'Hệ thống đang bận, vui lòng thử lại.' });
  }
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);

    var votersSheet = ss.getSheetByName(VOTERS_SHEET_NAME) || ss.insertSheet(VOTERS_SHEET_NAME);
    if (votersSheet.getLastRow() === 0) {
      votersSheet.appendRow(['Mã định danh (băm tài khoản Google)', 'Thời gian bình chọn']);
      votersSheet.getRange(1, 1, 1, 2).setFontWeight('bold');
      votersSheet.setFrozenRows(1);
    }
    var votersLastRow = votersSheet.getLastRow();
    if (votersLastRow > 1) {
      var existingHashes = votersSheet.getRange(2, 1, votersLastRow - 1, 1).getValues();
      for (var h = 0; h < existingHashes.length; h++) {
        if (String(existingHashes[h][0]) === voterHash) {
          return json({ ok: false, error: 'Tài khoản Google này đã bình chọn rồi — mỗi người chỉ được bình chọn 1 lần.' });
        }
      }
    }
    votersSheet.appendRow([voterHash, Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss')]);

    var votesSheet = ss.getSheetByName(VOTES_SHEET_NAME) || ss.insertSheet(VOTES_SHEET_NAME);
    if (votesSheet.getLastRow() === 0) {
      votesSheet.appendRow(['Mã bài dự thi', 'Thời gian']);
      votesSheet.getRange(1, 1, 1, 2).setFontWeight('bold');
      votesSheet.setFrozenRows(1);
    }
    votesSheet.appendRow([entryId, Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss')]);

    return json({ ok: true });
  } finally {
    lock.releaseLock();
  }
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
