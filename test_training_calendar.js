const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, 'admin.html'), 'utf8');

// Guard the integrated admin page against syntax regressions.
const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1])
  .filter(source => source.trim());
assert.ok(inlineScripts.length > 0, 'admin.html must contain an inline application script');
inlineScripts.forEach(source => new Function(source));

[
  'id="sidebarNavCalendar"',
  'id="viewCalendar"',
  'id="trainingCalendarGrid"',
  'id="trainingCalendarAgenda"',
  'id="trainingCalendarInspector"'
].forEach(marker => assert.ok(html.includes(marker), `missing calendar integration marker: ${marker}`));

// Execute the real calendar helpers from admin.html and verify meaningful source-data cases.
const helperStart = html.indexOf('let trainingCalendarCursor =');
const helperEnd = html.indexOf('let adminSortOrder =', helperStart);
assert.ok(helperStart > -1 && helperEnd > helperStart, 'calendar helper block not found');

const context = vm.createContext({
  Date,
  Map,
  Set,
  String,
  Number,
  Array,
  Object,
  RegExp,
  Math,
  console,
  _initialDate: new Date(2026, 9, 28),
  currentAdminYear: 2026,
  THAI_MONTH_SHORT: ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
  THAI_MONTH_FULL: ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'],
  coursesData: [],
  extractCourseStartDate: () => '9999-99-99',
  escapeHtml: value => String(value || ''),
  formatDisplayDate: value => value,
  document: { getElementById: () => null }
});
vm.runInContext(html.slice(helperStart, helperEnd), context);

function sessions(course) {
  context.__course = course;
  return vm.runInContext('getCourseCalendarSessions(__course)', context);
}

const batchSessions = sessions({
  id: 'batch-course',
  title: 'หลักสูตรแบบแบ่งรุ่น',
  time: '09.00 - 12.00 น.',
  batchDetails: [
    { name: 'รุ่นที่ 1', dateIso: '2026-10-15', timeRange: '09.00 - 12.00 น.' },
    { name: 'รุ่นที่ 2', dateIso: '2026-10-15', timeRange: '13.00 - 16.00 น.' }
  ]
});
assert.strictEqual(batchSessions.length, 2, 'each valid batch must remain a separate calendar session');
assert.deepStrictEqual(Array.from(batchSessions, item => item.label), ['รุ่นที่ 1', 'รุ่นที่ 2']);

const topicSessions = sessions({
  id: 'orientation',
  title: 'ปฐมนิเทศพนักงานใหม่',
  time: '08.00 - 17.00 น.',
  topics: [
    { date: '2026-10-01', title: 'หัวข้อ 1' },
    { date: '2026-10-01', title: 'หัวข้อ 2' },
    { date: '2026-10-02', title: 'หัวข้อ 3' }
  ]
});
assert.strictEqual(topicSessions.length, 2, 'topics on the same day must aggregate into one course-day');
assert.deepStrictEqual(Array.from(topicSessions, item => item.label), ['2 หัวข้อ', '1 หัวข้อ']);

const rangeSessions = sessions({
  id: 'range-course',
  title: 'หลักสูตรสองวัน',
  date: '1-2 ตุลาคม 2569',
  time: '08.00 - 17.00 น.'
});
assert.deepStrictEqual(
  Array.from(rangeSessions, item => item.date),
  ['2026-10-01', '2026-10-02'],
  'Thai same-month ranges must expand into each training day'
);

const invalidSessions = sessions({
  id: 'invalid-course',
  title: 'ยังไม่กำหนดวัน',
  batchDetails: [{ dateIso: '2026-02-31' }]
});
assert.strictEqual(invalidSessions.length, 0, 'invalid dates must never appear in the calendar');

console.log('Training calendar integration tests passed.');
