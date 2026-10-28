const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, 'admin.html'), 'utf8');

assert.ok(html.includes('id="newOrientVenueInput"'), 'monthly orientation modal must expose the default venue field');
assert.ok(!html.includes('id="newOrientDatesInput"'), 'manual aggregate date-summary input must be removed');
assert.strictEqual((html.match(/const ROWS_PER_PAGE = 26;/g) || []).length, 1, 'general roster must use 26 rows per page');
assert.strictEqual((html.match(/const TOTAL_ROWS = 26;/g) || []).length, 1, 'orientation roster must use 26 rows per sheet');

const functionStart = html.indexOf('function confirmCreateMonthlyOrientation()');
const functionEnd = html.indexOf('// --------------------------------------------------------------------------\n    // SINGLE TOPIC EDITING', functionStart);
assert.ok(functionStart > -1 && functionEnd > functionStart, 'orientation creation function not found');

const values = {
  newOrientMonthInput: '2026-11',
  newOrientInitialDateInput: '2026-11-05',
  newOrientVenueInput: 'ห้องประชุมทดสอบ ชั้น 9',
  newOrientTitleInput: 'ปฐมนิเทศพนักงานใหม่ ประจำเดือนพฤศจิกายน 2569'
};
const elements = Object.fromEntries(Object.entries(values).map(([id, value]) => [id, { value }]));
const savedPayloads = [];
const context = vm.createContext({
  document: { getElementById: id => elements[id] || null },
  THAI_MONTH_FULL: ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'],
  ORIENTATION_TEMPLATE_SHEET_URL: 'https://example.test/template',
  ORIENTATION_DEFAULT_SYLLABUS: Array.from({ length: 14 }, (_, index) => ({ id: `or-${index + 1}`, title: `หัวข้อ ${index + 1}`, venue: 'ค่าเดิม' })),
  orientationBatches: [],
  coursesData: [],
  SupabaseService: { saveCourse: payload => { savedPayloads.push(payload); return Promise.resolve(); } },
  HrdModal: { warning: message => { throw new Error(message); }, success: () => {} },
  Date: class extends Date { static now() { return 123456789; } },
  JSON,
  Set,
  console,
  localStorage: { setItem: () => {} },
  getDeletedOrientBatchIds: () => new Set(),
  getDeletedGeneralCourseIds: () => new Set(),
  formatIsoToThaiFull: value => value === '2026-11-05' ? '5 พฤศจิกายน 2569' : value,
  extractGoogleSheetId: () => '',
  updateCourseCountDisplay: () => {},
  closeCreateMonthlyOrientModal: () => {},
  openOrientationBatchDetail: () => {}
});

vm.runInContext(html.slice(functionStart, functionEnd), context);
vm.runInContext('confirmCreateMonthlyOrientation()', context);

assert.strictEqual(context.orientationBatches.length, 1, 'one orientation batch must be created');
const batch = context.orientationBatches[0];
assert.strictEqual(batch.dates, 'ประจำเดือนพฤศจิกายน 2569', 'batch summary must derive from the selected month');
assert.strictEqual(batch.defaultVenue, values.newOrientVenueInput, 'batch must retain its default venue');
assert.strictEqual(batch.topics.length, 14, 'all standard orientation topics must be cloned');
assert.ok(batch.topics.every(topic => topic.venue === values.newOrientVenueInput), 'default venue must seed every topic');
assert.ok(batch.topics.every(topic => topic.isoDate === values.newOrientInitialDateInput), 'start date must seed every topic');

assert.strictEqual(context.coursesData[0].location, values.newOrientVenueInput, 'calendar-facing course location must be saved');
assert.strictEqual(savedPayloads.length, 1, 'Supabase payload must be produced');
assert.strictEqual(savedPayloads[0].venue, values.newOrientVenueInput, 'Supabase payload must retain the default venue');
assert.ok(savedPayloads[0].topics.every(topic => topic.venue === values.newOrientVenueInput), 'Supabase topics must retain the default venue');

console.log('Orientation workflow integration tests passed.');
