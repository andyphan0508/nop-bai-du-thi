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

// Tên 3 sheet phục vụ React + Bình luận — TÁCH RIÊNG có chủ đích:
// "Người bình chọn" chỉ lưu mã băm tài khoản Google (ai đã dùng lượt — chặn
// dùng 2 lần), "Kết quả bình chọn" chỉ lưu bài được React (2 điểm/dòng),
// "Bình luận" lưu bài + nội dung bình luận (1 điểm/dòng, hiển thị công khai).
// KHÔNG sheet nào lưu kèm danh tính người tương tác → phiếu kín, không ai
// (kể cả quản trị viên) tra ngược được ai đã react/bình luận bài nào.
var VOTERS_SHEET_NAME = 'Người bình chọn';
var VOTES_SHEET_NAME = 'Kết quả bình chọn'; // mỗi dòng = 1 lượt React (2 điểm)
var COMMENTS_SHEET_NAME = 'Bình luận'; // mỗi dòng = 1 lượt bình luận (1 điểm), nội dung hiển thị công khai
var COMMENT_MAX_LEN = 500;

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
//   .../exec?action=voteEntries   → danh sách bài dự thi khổ A3 để React/bình luận (kèm ID ảnh bìa)
//   .../exec?action=comments      → bình luận công khai của mọi bài (ẩn danh), gộp theo bài
//   .../exec?action=voteStats     → thống kê công khai & xếp hạng bình chọn (xem sau khi vote)
//   .../exec?action=voteResults&key=ADMIN_KEY      → bảng xếp hạng chi tiết có tên thí sinh (quản trị)
//   .../exec?action=syncImages[&key=ADMIN_KEY]     → đồng bộ quyền chia sẻ công khai cho toàn bộ ảnh trên Drive
function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === 'list') return handleList();
  if (action === 'voteEntries') return handleVoteEntries();
  if (action === 'comments') return handleComments();
  if (action === 'voteStats') return handleVoteStats(e);
  if (action === 'voteResults') return handleVoteResults(e);
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
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return json({ ok: true, count: 0, entries: [] });

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

    return json({ ok: true, count: entries.length, entries: entries });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

// Bình luận công khai (ẩn danh — không kèm tên người bình luận) của mọi bài
// dự thi, gộp theo entryId — dùng để hiển thị lời khích lệ ngay trên trang
// bình chọn. Trả về dạng { entryId: [nội dung, nội dung, ...] }.
function handleComments() {
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(COMMENTS_SHEET_NAME);
    var byEntry = {};
    if (sheet && sheet.getLastRow() > 1) {
      var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues(); // Mã bài dự thi, Nội dung
      rows.forEach(function (r) {
        var entryId = String(r[0] || '');
        var text = String(r[1] || '');
        if (!entryId || !text) return;
        if (!byEntry[entryId]) byEntry[entryId] = [];
        byEntry[entryId].push(text);
      });
    }
    return json({ ok: true, comments: byEntry });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
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

// Thống kê công khai sau khi bình chọn (không lộ thông tin cá nhân của thí sinh):
// Trả về tổng người tham gia, tổng reacts, tổng bình luận, tổng điểm, phân bổ nhóm,
// và bảng xếp hạng tác phẩm công khai.
function handleVoteStats(e) {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var votersSheet = ss.getSheetByName(VOTERS_SHEET_NAME);
    var totalVoters = (votersSheet && votersSheet.getLastRow() > 1) ? (votersSheet.getLastRow() - 1) : 0;

    var reactCounts = countByEntryId(ss.getSheetByName(VOTES_SHEET_NAME), 1);
    var commentCounts = countByEntryId(ss.getSheetByName(COMMENTS_SHEET_NAME), 1);

    var totalReacts = 0;
    for (var k in reactCounts) totalReacts += reactCounts[k];

    var totalComments = 0;
    for (var k2 in commentCounts) totalComments += commentCounts[k2];

    var mainSheet = ss.getSheets()[0];
    var lastRow = mainSheet.getLastRow();
    var rankedEntries = [];
    var groupBreakdown = {};
    var totalPoints = 0;

    if (lastRow > 1) {
      var values = mainSheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
      values.forEach(function (r) {
        var uploadCell = String(r[10] || '');
        var sourceLink = String(r[9] || '');
        var folderUrl = String(r[11] || '');
        var imgId = findBestCoverImageId(uploadCell, sourceLink, folderUrl);
        if (!imgId) return;

        var id = entryIdOf(r[0]);
        var group = String(r[4] || 'Khác');
        var title = String(r[5] || 'Chưa đặt tên');
        var reacts = reactCounts[id] || 0;
        var comms = commentCounts[id] || 0;
        var points = reacts * 2 + comms * 1;
        totalPoints += points;

        if (!groupBreakdown[group]) groupBreakdown[group] = { entries: 0, points: 0 };
        groupBreakdown[group].entries += 1;
        groupBreakdown[group].points += points;

        rankedEntries.push({
          id: id,
          title: title,
          group: group,
          points: points,
          reactCount: reacts,
          commentCount: comms,
          imageFileId: imgId,
        });
      });
    }

    rankedEntries.sort(function (a, b) {
      if (b.points !== a.points) return b.points - a.points;
      if (b.reactCount !== a.reactCount) return b.reactCount - a.reactCount;
      return b.commentCount - a.commentCount;
    });

    return json({
      ok: true,
      stats: {
        totalEntries: rankedEntries.length,
        totalVoters: totalVoters,
        totalReacts: totalReacts,
        totalComments: totalComments,
        totalPoints: totalPoints,
        groupBreakdown: groupBreakdown,
        rankedEntries: rankedEntries,
      },
    });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

// Bảng xếp hạng điểm chi tiết (chỉ quản trị viên có ADMIN_KEY) — bao gồm Họ tên tác giả
function handleVoteResults(e) {
  var key = e && e.parameter && e.parameter.key;
  if (!ADMIN_KEY || String(key || '') !== ADMIN_KEY) {
    return json({ ok: false, error: 'Không có quyền xem kết quả.' });
  }
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var reactCounts = countByEntryId(ss.getSheetByName(VOTES_SHEET_NAME), 1);
    var commentCounts = countByEntryId(ss.getSheetByName(COMMENTS_SHEET_NAME), 1);

    var mainSheet = ss.getSheets()[0];
    var lastRow = mainSheet.getLastRow();
    var results = [];
    var totalPoints = 0;
    if (lastRow > 1) {
      var values = mainSheet.getRange(2, 1, lastRow - 1, 6).getValues();
      values.forEach(function (r) {
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
    results.sort(function (a, b) { return b.points - a.points; });
    return json({ ok: true, totalPoints: totalPoints, results: results });
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

// Tìm 1 bài dự thi theo entryId, trả về email đã dùng để nộp bài đó (chữ
// thường, trim) — hoặc null nếu không tìm thấy entryId này trong Sheet.
function findEntryEmail(entryId) {
  var mainSheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  var lastRow = mainSheet.getLastRow();
  if (lastRow > 1) {
    var idAndEmail = mainSheet.getRange(2, 1, lastRow - 1, 3).getValues(); // Thời gian, Họ tên, Email
    for (var i = 0; i < idAndEmail.length; i++) {
      if (entryIdOf(idAndEmail[i][0]) === entryId) {
        return String(idAndEmail[i][2] || '').trim().toLowerCase();
      }
    }
  }
  return null;
}

// Bài có email nộp bài "entryEmailNorm" có phải của cùng người đang đăng nhập
// bằng "voterEmailNorm" không — gồm cả cụm email liên kết (nếu quản trị viên
// đã khai báo cho trường hợp 1 người nộp nhiều bài bằng nhiều email khác nhau).
function isSameContestant(entryEmailNorm, voterEmailNorm) {
  if (!entryEmailNorm || !voterEmailNorm) return false;
  var cluster = [entryEmailNorm].concat(findLinkedEmailCluster(entryEmailNorm));
  return cluster.indexOf(voterEmailNorm) !== -1;
}

// Ghi nhận 1 lượt React + bình luận — "phiếu kín, chống spam":
//  1) Honeypot 'hp' (field ẩn, chỉ bot điền vào) → coi như đã xử lý, không lộ lý do.
//  2) Chặn gửi quá nhanh sau khi tải trang (bot gửi ngay lập tức) — đo bằng số ms
//     đã trôi qua do CHÍNH TRÌNH DUYỆT tính (elapsedMs), không so trực tiếp với
//     Date.now() của server, để tránh đồng hồ máy người dùng lệch giờ làm từ chối
//     oan người tương tác thật.
//  3) Xác minh reCAPTCHA v3 (điểm hành vi người/bot).
//  4) Xác minh token đăng nhập Google thật (không phải tự khai SĐT) — đây là
//     lý do mở ẩn danh (incognito) không giúp dùng thêm lượt: vẫn phải đăng
//     nhập lại bằng 1 tài khoản Google thật, không thể chỉ gõ số khác.
//  5) Bài dự thi CỦA CHÍNH MÌNH chỉ được nhận 1 trong 2 (React HOẶC bình luận,
//     không phải cả hai) — so email Google đã xác minh với email đã dùng để
//     nộp (các) bài đó, cộng cụm email liên kết (dùng cho trường hợp 1 người
//     nộp nhiều bài bằng nhiều email khác nhau).
//  6) LockService khoá toàn script khi kiểm tra-và-ghi → 2 yêu cầu gửi cùng lúc
//     (double-click, mạng chậm gửi lại...) không thể cùng lọt qua bước kiểm tra
//     "đã dùng lượt chưa" (tránh race condition khiến 1 người dùng được 2 lần).
//  7) Danh tính chỉ lưu dưới dạng băm SHA-256 (có muối VOTE_SALT) ở sheet riêng
//     "Người bình chọn"; React lưu ở sheet "Kết quả bình chọn", bình luận lưu ở
//     sheet "Bình luận" — cả hai không kèm danh tính → không sheet nào nối
//     được "ai" với "đã tương tác bài nào".
function handleEngage(data) {
  if (String(data.hp || '').trim()) return json({ ok: true }); // bot dính honeypot

  if (Number(data.elapsedMs || 0) < 1500) {
    return json({ ok: false, error: 'Vui lòng thử lại sau ít giây.' });
  }

  var reactEntryId = String(data.reactEntryId || '').trim();
  var commentEntryId = String(data.commentEntryId || '').trim();
  var commentText = String(data.commentText || '').trim();

  if (!reactEntryId && !commentEntryId) {
    return json({ ok: false, error: 'Vui lòng chọn ít nhất 1 bài để React hoặc để lại bình luận.' });
  }
  if (commentEntryId && !commentText) {
    return json({ ok: false, error: 'Vui lòng nhập nội dung bình luận.' });
  }
  if (commentText.length > COMMENT_MAX_LEN) {
    return json({ ok: false, error: 'Bình luận quá dài (tối đa ' + COMMENT_MAX_LEN + ' ký tự).' });
  }

  var recaptchaCheck = verifyRecaptcha(data.recaptchaToken);
  if (!recaptchaCheck.ok) return json({ ok: false, error: recaptchaCheck.error });

  var googleCheck = verifyGoogleIdToken(data.googleIdToken);
  if (!googleCheck.ok) return json({ ok: false, error: googleCheck.error });

  var voterEmailNorm = String(googleCheck.email || '').trim().toLowerCase();

  var reactEmail = reactEntryId ? findEntryEmail(reactEntryId) : undefined;
  if (reactEntryId && reactEmail === null) {
    return json({ ok: false, error: 'Bài để React không hợp lệ — hãy tải lại trang.' });
  }
  var commentEmail = commentEntryId ? findEntryEmail(commentEntryId) : undefined;
  if (commentEntryId && commentEmail === null) {
    return json({ ok: false, error: 'Bài để bình luận không hợp lệ — hãy tải lại trang.' });
  }

  var reactIsSelf = reactEntryId ? isSameContestant(reactEmail, voterEmailNorm) : false;
  var commentIsSelf = commentEntryId ? isSameContestant(commentEmail, voterEmailNorm) : false;
  if (reactIsSelf && commentIsSelf) {
    return json({
      ok: false,
      error: 'Bài dự thi của bạn chỉ được nhận 1 trong 2: React hoặc bình luận, không phải cả hai.',
    });
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
      votersSheet.appendRow(['Mã định danh (băm tài khoản Google)', 'Thời gian dùng lượt']);
      votersSheet.getRange(1, 1, 1, 2).setFontWeight('bold');
      votersSheet.setFrozenRows(1);
    }
    var votersLastRow = votersSheet.getLastRow();
    if (votersLastRow > 1) {
      var existingHashes = votersSheet.getRange(2, 1, votersLastRow - 1, 1).getValues();
      for (var h = 0; h < existingHashes.length; h++) {
        if (String(existingHashes[h][0]) === voterHash) {
          return json({
            ok: false,
            error: 'Tài khoản Google này đã dùng hết lượt React + bình luận rồi.',
          });
        }
      }
    }
    votersSheet.appendRow([voterHash, Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss')]);

    if (reactEntryId) {
      var votesSheet = ss.getSheetByName(VOTES_SHEET_NAME) || ss.insertSheet(VOTES_SHEET_NAME);
      if (votesSheet.getLastRow() === 0) {
        votesSheet.appendRow(['Mã bài dự thi', 'Thời gian']);
        votesSheet.getRange(1, 1, 1, 2).setFontWeight('bold');
        votesSheet.setFrozenRows(1);
      }
      votesSheet.appendRow([reactEntryId, Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss')]);
    }

    if (commentEntryId) {
      var commentsSheet = ss.getSheetByName(COMMENTS_SHEET_NAME) || ss.insertSheet(COMMENTS_SHEET_NAME);
      if (commentsSheet.getLastRow() === 0) {
        commentsSheet.appendRow(['Mã bài dự thi', 'Nội dung bình luận', 'Thời gian']);
        commentsSheet.getRange(1, 1, 1, 3).setFontWeight('bold');
        commentsSheet.setFrozenRows(1);
      }
      commentsSheet.appendRow([commentEntryId, commentText, Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss')]);
    }

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
