const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const serviceSource = fs.readFileSync(path.join(__dirname, 'supabase-service.js'), 'utf8');
const desktopHtml = fs.readFileSync(path.join(__dirname, 'desktop.html'), 'utf8');
const adminHtml = fs.readFileSync(path.join(__dirname, 'admin.html'), 'utf8');

let remoteReadCount = 0;
const neverResolvingQuery = {
  select() { return this; },
  eq() { return this; },
  single() {
    remoteReadCount += 1;
    return new Promise(() => {});
  }
};

const context = vm.createContext({
  window: {
    supabase: {
      createClient: () => ({ from: () => Object.create(neverResolvingQuery) })
    }
  },
  localStorage: { getItem: () => null },
  setTimeout,
  clearTimeout,
  Promise,
  Date,
  Map,
  Object,
  String,
  Number,
  Array,
  Boolean,
  RegExp,
  console: { log() {}, warn() {}, error() {} }
});

vm.runInContext(serviceSource, context);

(async () => {
  const firstStartedAt = Date.now();
  const firstResult = await context.SupabaseService.getCourseById('offline-course');
  const firstElapsed = Date.now() - firstStartedAt;

  assert.strictEqual(firstResult, null, 'an unavailable Supabase read must fall back with null');
  assert.ok(firstElapsed >= 800 && firstElapsed < 1500, `read timeout should be bounded near 900ms, got ${firstElapsed}ms`);
  assert.strictEqual(context.SupabaseService.isEnabled(), false, 'network failure must open the circuit breaker');

  const secondStartedAt = Date.now();
  const secondResult = await context.SupabaseService.getCourseById('offline-course');
  const secondElapsed = Date.now() - secondStartedAt;

  assert.strictEqual(secondResult, null);
  assert.ok(secondElapsed < 100, `open circuit must skip repeated requests immediately, got ${secondElapsed}ms`);
  assert.strictEqual(remoteReadCount, 1, 'circuit breaker must prevent repeated DNS/network requests');

  assert.ok(desktopHtml.includes('await decodeAndInitCourse(true);'), 'desktop first paint must use cache-only course loading');
  assert.ok(desktopHtml.includes('setTimeout(refreshLiveCourseDataInBackground, 0);'), 'desktop live refresh must run after first paint');

  const printStart = adminHtml.indexOf('async function printNormalCourseRoster');
  const printEnd = adminHtml.indexOf('function printTopicRoster', printStart);
  const printSource = adminHtml.slice(printStart, printEnd);
  assert.ok(printSource.includes("localStorage.getItem('hrd_attendees_' + course.id)"), 'printing must read cached attendees first');
  assert.ok(!printSource.includes('attendees = await SupabaseService.getAttendeesByCourse'), 'printing must not await Supabase');
  assert.ok(adminHtml.includes("wrapper.classList.contains('click-pinned')"), 'click-opened action tray must stay pinned');
  assert.ok(adminHtml.includes("wrapper.classList.add('open', 'click-pinned')"), 'action tray click must add pinned state');

  console.log('Fast failover and local-first print tests passed.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
