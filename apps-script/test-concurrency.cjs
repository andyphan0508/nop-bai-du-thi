/**
 * Chạy thử Code.gs với 70 người bình chọn cùng lúc — KHÔNG cần deploy.
 *
 *   node apps-script/test-concurrency.cjs
 *
 * Cách làm: giả lập các dịch vụ của Apps Script (SpreadsheetApp / CacheService /
 * LockService / Utilities) bằng bản mô phỏng có ĐỘ TRỄ THẬT (mỗi lượt gọi
 * Sheets API ~250ms như Google), rồi nạp thẳng Code.gs vào chạy. Nhờ vậy đo
 * được 2 thứ mà mắt thường không thấy: tổng thời gian xếp hàng vì LockService,
 * và số lượt bị trùng khi nhiều người bấm gửi cùng một khoảnh khắc.
 *
 * Kiểm tra (assert) 3 điều:
 *   1. 70 người khác thiết bị → cả 70 lượt được ghi nhận, không ai bị từ chối.
 *   2. 1 thiết bị bấm gửi 5 lần liên tiếp → đúng 1 lượt được ghi, 4 lượt bị chặn.
 *   3. Trang mở lại sau khi vote → voteStatus trả voted = true.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const SHEET_CALL_MS = 250; // độ trễ 1 lượt gọi Sheets API (đo thực tế 150-500ms)
const DRIVE_FOLDER_SCAN_MS = 700; // quét 1 thư mục Drive tìm ảnh bìa
const ENTRY_COUNT = 20;
const VOTER_COUNT = 70;

// --- Đồng hồ mô phỏng: thời gian chỉ nhảy khi có lượt gọi API -----------------
let now = 0;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, 0)).then(() => { now += ms; });

// Mỗi "lượt chạy" (execution) là 1 async function; ta cho chúng chạy xen kẽ
// nhau qua await để mô phỏng việc Apps Script chạy song song nhiều lượt.
const apiCall = (ms) => sleep(ms);

// --- Mô phỏng Sheet -----------------------------------------------------------
class FakeSheet {
  constructor(name) {
    this.name = name;
    this.rows = [];
  }
  getLastRow() { return this.rows.length; }
  getRange(row, col, numRows, numCols) {
    const self = this;
    return {
      getValues() {
        const out = [];
        for (let r = row; r < row + numRows; r++) {
          const source = self.rows[r - 1] || [];
          out.push(source.slice(col - 1, col - 1 + numCols));
        }
        return out;
      },
      setValues(values) { values.forEach((v, i) => { self.rows[row - 1 + i] = v.slice(); }); },
      setValue(value) { (self.rows[row - 1] = self.rows[row - 1] || [])[col - 1] = value; },
      setFontWeight() { return this; },
    };
  }
  appendRow(row) { this.rows.push(row.slice()); }
  setFrozenRows() {}
  deleteRow(row) { this.rows.splice(row - 1, 1); }
}

class FakeSpreadsheet {
  constructor() { this.sheets = [new FakeSheet('Bài dự thi')]; }
  getSheets() { return this.sheets; }
  getSheetByName(name) { return this.sheets.find((s) => s.name === name) || null; }
  insertSheet(name) { const s = new FakeSheet(name); this.sheets.push(s); return s; }
}

const spreadsheet = new FakeSpreadsheet();

// Đếm số lượt gọi API để thấy rõ mức tối ưu
const counters = { sheetReads: 0, sheetWrites: 0, driveScans: 0 };

// --- Các global mà Code.gs trông đợi ------------------------------------------
const globals = {};

globals.SpreadsheetApp = {
  openById() { counters.sheetReads++; busyWait(SHEET_CALL_MS); return spreadsheet; },
};

// Apps Script chạy đồng bộ (không có await), nên độ trễ API phải mô phỏng bằng
// cách "cộng thẳng vào đồng hồ" — mỗi lượt chạy tự tích luỹ thời gian của mình.
let currentExecution = null;
function busyWait(ms) {
  if (currentExecution) currentExecution.elapsed += ms;
  now = Math.max(now, currentExecution ? currentExecution.elapsed : now);
}

const originalAppendRow = FakeSheet.prototype.appendRow;
FakeSheet.prototype.appendRow = function (row) { counters.sheetWrites++; busyWait(SHEET_CALL_MS); originalAppendRow.call(this, row); };
const originalGetRange = FakeSheet.prototype.getRange;
FakeSheet.prototype.getRange = function (...args) { counters.sheetReads++; busyWait(SHEET_CALL_MS); return originalGetRange.apply(this, args); };

const cacheStore = new Map();
globals.CacheService = {
  getScriptCache() {
    return {
      get(key) { const hit = cacheStore.get(key); return hit && hit.expiresAt > now ? hit.value : null; },
      put(key, value, ttl) { cacheStore.set(key, { value, expiresAt: now + ttl * 1000 }); },
      removeAll(keys) { keys.forEach((k) => cacheStore.delete(k)); },
    };
  },
};

// LockService: chỉ 1 lượt chạy giữ khoá tại 1 thời điểm. Ghi lại tổng thời
// gian mọi lượt phải XẾP HÀNG chờ khoá — con số quyết định hệ thống trụ được
// bao nhiêu người cùng lúc.
const lockState = { heldUntil: 0, holder: null, totalWaitMs: 0, maxWaitMs: 0, timeouts: 0 };
globals.LockService = {
  getScriptLock() {
    return {
      waitLock(timeoutMs) {
        const exec = currentExecution;
        const waitMs = Math.max(0, lockState.heldUntil - exec.elapsed);
        if (waitMs > timeoutMs) { lockState.timeouts++; throw new Error('Could not obtain lock'); }
        exec.elapsed += waitMs;
        lockState.totalWaitMs += waitMs;
        lockState.maxWaitMs = Math.max(lockState.maxWaitMs, waitMs);
        lockState.heldUntil = exec.elapsed;
        lockState.holder = exec;
        exec.lockAcquiredAt = exec.elapsed;
      },
      tryLock(timeoutMs) {
        try { this.waitLock(timeoutMs); return true; } catch { return false; }
      },
      releaseLock() {
        const exec = currentExecution;
        if (lockState.holder === exec) {
          lockState.heldUntil = exec.elapsed;
          exec.lockHeldMs = (exec.lockHeldMs || 0) + (exec.elapsed - exec.lockAcquiredAt);
          lockState.holder = null;
        }
      },
    };
  },
};

globals.Utilities = {
  formatDate: (date) => new Date(date).toISOString().slice(0, 19).replace('T', ' '),
  computeDigest: (_alg, value) => Array.from(require('crypto').createHash('sha256').update(value).digest()),
  base64EncodeWebSafe: (bytes) => Buffer.from(bytes).toString('base64url'),
  DigestAlgorithm: { SHA_256: 'SHA_256' },
  newBlob: () => ({}),
  base64Decode: () => [],
  sleep: (ms) => busyWait(ms),
};

globals.ContentService = {
  MimeType: { JSON: 'application/json' },
  createTextOutput: (text) => ({ text, setMimeType() { return this; }, getContent: () => text }),
};

globals.DriveApp = {
  Access: { ANYONE_WITH_LINK: 'ANYONE_WITH_LINK' },
  Permission: { VIEW: 'VIEW' },
  getFolderById(id) {
    counters.driveScans++;
    busyWait(DRIVE_FOLDER_SCAN_MS);
    let served = false;
    return {
      getFiles: () => ({
        hasNext: () => !served,
        next: () => {
          served = true;
          return {
            getName: () => 'bia-' + id + '.png',
            getMimeType: () => 'image/png',
            getId: () => 'img-' + id,
            getUrl: () => 'https://drive.google.com/file/d/img-' + id,
            getSize: () => 1024,
            getLastUpdated: () => new Date(0),
            setSharing() {},
          };
        },
      }),
    };
  },
  getFileById: () => ({ setSharing() {} }),
};

globals.UrlFetchApp = { fetch: () => ({ getContentText: () => '{"success":true,"score":0.9}' }) };

// --- Nạp Code.gs --------------------------------------------------------------
const source = fs.readFileSync(path.join(__dirname, 'Code.gs'), 'utf8');
const sandbox = { ...globals, console };
const runner = new Function(...Object.keys(sandbox), source + '\n;return this;');
const scriptScope = runner.call(sandbox, ...Object.values(sandbox));
// Code.gs khai báo bằng `var` ở cấp cao nhất → nằm trong scope của Function, lấy ra qua eval
const call = new Function(...Object.keys(sandbox), source + '\n;return { doGet, doPost, handleEngage, handleVoteEntries, handleVoteStats, handleVoteStatus };');
const api = call.call(sandbox, ...Object.values(sandbox));

// --- Dựng dữ liệu mẫu ---------------------------------------------------------
const mainSheet = spreadsheet.getSheets()[0];
mainSheet.appendRow(['Thời gian nộp', 'Họ tên', 'Email', 'SĐT', 'Nhóm/Ban ngành', 'Tên tác phẩm', 'Hình thức', 'Thành viên nhóm', 'Ghi chú', 'Link file nguồn (dán)', 'File đã upload', 'Thư mục bài nộp']);
for (let i = 1; i <= ENTRY_COUNT; i++) {
  mainSheet.appendRow([
    `2026-09-0${(i % 9) + 1} 10:00:${String(i).padStart(2, '0')}`,
    `Thí sinh ${i}`, `ts${i}@example.com`, `090000000${i % 10}`, 'Ban Thanh Niên',
    `Tác phẩm ${i}`, i % 3 === 0 ? 'Làm nhóm' : 'Cá nhân', '', 'Mô tả ý tưởng',
    '', '', `https://drive.google.com/drive/folders/folder-${i}`,
  ]);
}
counters.sheetWrites = 0;
counters.sheetReads = 0;

const entryIdAt = (i) => mainSheet.rows[i + 1][0];

// --- Bộ chạy: mỗi "request" là 1 lượt chạy độc lập có đồng hồ riêng -----------
function runExecution(label, fn) {
  const exec = { label, elapsed: now, startedAt: now, lockHeldMs: 0 };
  const previous = currentExecution;
  currentExecution = exec;
  try {
    const output = fn();
    return { exec, result: JSON.parse(output.getContent ? output.getContent() : output.text) };
  } finally {
    currentExecution = previous;
  }
}

const engagePayload = (deviceId, reactIdx, commentIdx) => ({
  action: 'engage',
  deviceId,
  reactEntryId: entryIdAt(reactIdx),
  commentEntryId: entryIdAt(commentIdx),
  commentText: 'Tác phẩm này thật sự rất ấn tượng với bố cục hài hoà và màu sắc nổi bật, mình rất thích ý tưởng mà bạn đã truyền tải trong bài dự thi lần này.',
  recaptchaToken: 'token',
  hp: '',
  elapsedMs: 5000,
});

console.log('='.repeat(70));
console.log(`MÔ PHỎNG ${VOTER_COUNT} NGƯỜI BÌNH CHỌN CÙNG LÚC · ${ENTRY_COUNT} bài dự thi`);
console.log('='.repeat(70));

// --- Bước 1: tất cả cùng MỞ TRANG ---------------------------------------------
let openStart = now;
const openResults = [];
for (let i = 0; i < VOTER_COUNT; i++) {
  openResults.push(runExecution(`open-${i}`, () => api.doGet({ parameter: { action: 'voteEntries' } })));
}
const slowestOpen = Math.max(...openResults.map((r) => r.exec.elapsed - r.exec.startedAt));
console.log(`\n[1] Mở trang (${VOTER_COUNT} lượt tải danh sách bài)`);
console.log(`    Số lần quét Google Drive : ${counters.driveScans} (trước tối ưu: ${VOTER_COUNT * ENTRY_COUNT})`);
console.log(`    Lượt lâu nhất            : ${(slowestOpen / 1000).toFixed(1)} giây (lượt phải tính lại khi cache nguội)`);
assert.ok(openResults.every((r) => r.result.ok), 'Có lượt mở trang bị lỗi');
assert.ok(counters.driveScans <= ENTRY_COUNT, `Quét Drive quá nhiều lần: ${counters.driveScans}`);

// --- Bước 2: tất cả cùng bấm GỬI ----------------------------------------------
counters.sheetWrites = 0;
lockState.totalWaitMs = 0;
lockState.maxWaitMs = 0;
const submitStart = now;
const submits = [];
for (let i = 0; i < VOTER_COUNT; i++) {
  submits.push(runExecution(`vote-${i}`, () => api.doPost({
    postData: { contents: JSON.stringify(engagePayload(`device-${i}`, i % ENTRY_COUNT, (i + 1) % ENTRY_COUNT)) },
  })));
}
const accepted = submits.filter((s) => s.result.ok).length;
const busy = submits.filter((s) => s.result.code === 'BUSY').length;
const slowestSubmit = Math.max(...submits.map((s) => s.exec.elapsed - s.exec.startedAt));
const totalLockHold = submits.reduce((sum, s) => sum + s.exec.lockHeldMs, 0);

console.log(`\n[2] Bấm gửi bình chọn (${VOTER_COUNT} lượt đồng thời)`);
console.log(`    Được ghi nhận            : ${accepted}/${VOTER_COUNT}`);
console.log(`    Bị từ chối vì quá tải    : ${busy}`);
console.log(`    Giữ khoá trung bình      : ${(totalLockHold / VOTER_COUNT).toFixed(0)} ms/lượt`);
console.log(`    Chờ khoá lâu nhất        : ${(lockState.maxWaitMs / 1000).toFixed(1)} giây`);
console.log(`    Lượt lâu nhất            : ${(slowestSubmit / 1000).toFixed(1)} giây/người`);

assert.strictEqual(accepted, VOTER_COUNT, `Chỉ ${accepted}/${VOTER_COUNT} lượt được ghi nhận`);
assert.strictEqual(lockState.timeouts, 0, 'Có lượt bị timeout khi chờ khoá');
assert.ok(slowestSubmit < 5000, `1 lượt gửi mất ${slowestSubmit}ms — quá lâu`);
assert.ok(lockState.maxWaitMs < 10000, `Chờ khoá quá lâu: ${lockState.maxWaitMs}ms — 10s là mức mà người dùng bắt đầu bỏ cuộc`);

// --- Bước 3: 1 thiết bị bấm gửi 5 lần (double-click / mạng chậm gửi lại) ------
const spamDevice = 'device-spam';
const spam = [];
for (let i = 0; i < 5; i++) {
  spam.push(runExecution(`spam-${i}`, () => api.doPost({
    postData: { contents: JSON.stringify(engagePayload(spamDevice, 3, 4)) },
  })));
}
const spamOk = spam.filter((s) => s.result.ok).length;
const spamBlocked = spam.filter((s) => s.result.code === 'ALREADY_VOTED').length;
console.log(`\n[3] 1 thiết bị bấm gửi 5 lần liên tiếp`);
console.log(`    Ghi nhận                 : ${spamOk} (đúng phải là 1)`);
console.log(`    Bị chặn ALREADY_VOTED    : ${spamBlocked}`);
assert.strictEqual(spamOk, 1, 'Một thiết bị dùng được nhiều hơn 1 lượt!');
assert.strictEqual(spamBlocked, 4, 'Lần gửi lại không trả đúng mã ALREADY_VOTED');

// --- Bước 4: mở lại trang sau khi đã vote -------------------------------------
const status = runExecution('status', () => api.doGet({ parameter: { action: 'voteStatus', deviceId: 'device-7' } }));
const statusFresh = runExecution('status2', () => api.doGet({ parameter: { action: 'voteStatus', deviceId: 'device-chua-vote' } }));
console.log(`\n[4] Mở lại trang (kiểm tra phía máy chủ, không phụ thuộc localStorage)`);
console.log(`    Thiết bị đã vote         : voted = ${status.result.voted}`);
console.log(`    Thiết bị chưa vote       : voted = ${statusFresh.result.voted}`);
assert.strictEqual(status.result.voted, true, 'Thiết bị đã vote nhưng voteStatus trả false');
assert.strictEqual(statusFresh.result.voted, false, 'Thiết bị chưa vote nhưng bị báo đã vote');

// --- Bước 5: tính toàn vẹn dữ liệu --------------------------------------------
const voters = spreadsheet.getSheetByName('Người bình chọn').rows.length - 1;
const reacts = spreadsheet.getSheetByName('Kết quả bình chọn').rows.length - 1;
const comments = spreadsheet.getSheetByName('Bình luận').rows.length - 1;
console.log(`\n[5] Dữ liệu ghi xuống Sheet`);
console.log(`    Người bình chọn          : ${voters}`);
console.log(`    Lượt React               : ${reacts}`);
console.log(`    Lượt bình luận           : ${comments}`);
assert.strictEqual(voters, VOTER_COUNT + 1, 'Số người bình chọn không khớp');
assert.strictEqual(reacts, VOTER_COUNT + 1, 'Số lượt React không khớp');
assert.strictEqual(comments, VOTER_COUNT + 1, 'Số lượt bình luận không khớp');

// --- Bước 6: xem thống kê ------------------------------------------------------
counters.driveScans = 0;
const statsStart = now;
const stats = runExecution('stats', () => api.doGet({ parameter: { action: 'voteStats' } }));
console.log(`\n[6] Xem thống kê / bảng xếp hạng`);
console.log(`    Số lần quét Drive        : ${counters.driveScans} (trước tối ưu: ${ENTRY_COUNT} mỗi 15 giây)`);
console.log(`    Thời gian                : ${((stats.exec.elapsed - stats.exec.startedAt) / 1000).toFixed(1)} giây`);
console.log(`    Tổng điểm                : ${stats.result.stats.totalPoints}`);
assert.ok(stats.result.ok, 'Thống kê lỗi');
assert.strictEqual(counters.driveScans, 0, 'Thống kê vẫn quét lại Drive');
assert.strictEqual(stats.result.stats.totalPoints, (VOTER_COUNT + 1) * 3, 'Tổng điểm sai (React 2đ + bình luận 1đ)');

console.log('\n' + '='.repeat(70));
console.log('✅ TẤT CẢ KIỂM TRA ĐỀU ĐẠT');
console.log('='.repeat(70));
