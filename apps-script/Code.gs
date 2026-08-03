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

// Mã quản trị: cần để xoá bài trên web (mở web với ?admin=1).
// Để trống '' nếu muốn TẮT hẳn tính năng xoá.
var ADMIN_KEY = '';

// Tên sheet lưu các bài đã xoá (xoá mềm — không mất dữ liệu)
var TRASH_SHEET_NAME = 'Đã xoá';

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
//   .../exec              → kiểm tra sức khỏe (mở URL bằng trình duyệt để test)
//   .../exec?action=list  → danh sách công khai các bài đã nộp (tên, nhóm, tác phẩm, giờ nộp)
function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === 'list') return handleList();
  return json({ ok: true, service: 'nop-bai-du-thi', time: new Date() });
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
    (data.files || []).forEach(function (f) {
      var bytes = Utilities.base64Decode(f.data);
      var sizeMb = bytes.length / (1024 * 1024);
      if (sizeMb > MAX_FILE_MB) {
        throw new Error('File "' + f.name + '" vượt giới hạn ' + MAX_FILE_MB + 'MB. Hãy dùng ô dán link.');
      }
      var blob = Utilities.newBlob(bytes, f.mimeType || 'application/octet-stream', f.name);
      var file = folder.createFile(blob);
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
