# Project: HRD Training Admin Portal - Native SPA & Supabase Overhaul
**Hospital:** โรงพยาบาลพิษณุเวช พิจิตร (Phitsanuvej Phichit Hospital - Princ Health)  
**Target Codebase:** `h:/My Drive/HRD AI/projects/02-เว็บลงทะเบียนเข้าอบรม/ระบบ/src/web/`  
**Updated:** 2026-10-28 (100% Native SPA, Supabase Primary Database, DCC A4 Landscape Roster, Orientation & Employee Management)  

---

## Architecture

The HRD Training Admin Portal has been overhauled into a **100% Native Single Page Application (SPA)** with zero page reloads, zero `<iframe>` usage, and sub-0.1s Supabase database operations:

```
+-------------------------------------------------------------------------------------------------------------------------+
|  PERMANENT STICKY HEADER (z-40)                                                                                         |
|  [Logo + Hospital Name]      [⚡ Supabase 0.08s Active]   [Archive Modal]   [+ สร้างหลักสูตรใหม่]                           |
+-------------------------------------------------------------------------------------------------------------------------+
| PERMANENT LEFT SIDEBAR       | WORKSPACE CONTAINER                                                                      |
|                              | [Dynamic Breadcrumb Navigation Bar: หน้าหลัก > View Label]                               |
| [ระบบฝึกอบรม & ปฐมนิเทศ]      |-----------------------------------------------------------------------------------------|
|  - รายการหลักสูตร (#courses)   |  <main id="adminMainContent">                                                           |
|  - กำหนดกลุ่มเป้าหมาย (#target)|    +- VIEW 1: #viewCourses (Native DOM) ----------------------------------------------+ |
|  - ปฐมนิเทศพนักงานใหม่        |    |  KPI Summary, Search/Filters, Speed Dial (Excel/CSV/Print), Clinical Cards        | |
|    (#orientation)            |    +------------------------------------------------------------------------------------+ |
|  - จัดการพนักงาน (#settings)  |    +- VIEW 2: #viewTarget (Native DOM) -------------------------------------------------+ |
|  - สร้างหลักสูตร (#create)     |    |  Course Selector, Target Scope Toggle, Dept/Pos Union Matrix                       | |
|                              |    +------------------------------------------------------------------------------------+ |
|                              |    +- VIEW 3: #viewCreate (Native DOM) -------------------------------------------------+ |
|                              |    |  General Info, Category, Batches CRUD, Uploads, Save Progress                      | |
|                              |    +------------------------------------------------------------------------------------+ |
|                              |    +- VIEW 4: #viewOrientation (New Employee Orientation Suite) ------------------------+ |
|                              |    |  Monthly Batches, Dynamic Date Topics, Date Pickers, Time Selectors, Roster A4     | |
|                              |    +------------------------------------------------------------------------------------+ |
|                              |    +- VIEW 5: #viewSettings (Master Employee Management) -------------------------------+ |
|                              |    |  Employee Registry, Strict 6-Digit ID, CRUD, Filters, Export UTF-8 BOM             | |
|                              |    +------------------------------------------------------------------------------------+ |
|                              |  </main>                                                                                 |
+-------------------------------------------------------------------------------------------------------------------------+
| MODAL LAYER (Root Body):                                                                                                |
| - #saveProgressModal   - #successModal (QR Code)   - #archiveModal   - #orientationPrintModal (DCC A4 Landscape)        |
| - #editBatchScheduleModal (Native Date Picker & Time Dropdowns)       - HrdModal (Branded Hospital Toasts & Alerts)     |
+-------------------------------------------------------------------------------------------------------------------------+
```

### Data Layer Architecture
- **Primary Database (Direct PostgreSQL via Supabase REST API < 0.1s):** `SupabaseService.saveCourse()`, `updateCourseTarget()`, `deleteCourse()`, `getAllCourses()`, `registerAttendee()`, `getAttendeesByCourse()`, `deleteAttendee()`, `getEmployees()`, `saveEmployees()`.
- **Fast Failover Guard (0.9s Timeout + 60s Circuit Breaker):** bounded Supabase reads fail fast, then repeated requests are skipped during the cooldown while the UI continues from `courses.json` and `localStorage`.
- **Roster & Record Printing:** Replaced Google Sheets entirely with native web-based printable A4 landscape rosters (DCC `FM-PPCH-HR-012`, 26 rows per page with a protected footer safe area).
- **Strict 6-Digit Employee ID Formatting:** Always padded with leading zeros (`padStart(6, '0')`) across all databases and inputs.

---

## Feature Inventory

| # | Feature | Description | Status | Source |
|---|---------|-------------|:---:|--------|
| F1 | Native SPA Shell | Header and Sidebar permanently mounted; dynamic breadcrumbs; zero page refresh | DONE | Golden Design Rules |
| F2 | 0ms View Switching | Instantaneous view toggle via Tailwind `.hidden` classes for all 5 views | DONE | SPA Overhaul |
| F3 | Zero `<iframe>` Architecture | Completely eliminated all iframes; 100% native DOM containers | DONE | SPA Overhaul |
| F4 | Native Course Form | In-house 4-section course form DOM directly in `#viewCreate` | DONE | SPA Overhaul |
| F5 | Direct Supabase CRUD (<0.1s) | Client CRUD operations on Supabase `courses`, `registrations`, and `sys-employees-registry` | DONE | Database Rules |
| F6 | Fast Failover Loader Guard | Registration first paint uses cache/static data without waiting for remote sources; a 0.9s read timeout and 60s circuit breaker protect background refreshes | DONE | Zero-Flicker Policy |
| F7 | New Employee Orientation (View 4) | Monthly batches, default venue propagation to all 14 topics, clickable card surfaces, and attendee enrollment matrix | DONE | User Request |
| F8 | Dynamic Date Topic Scheduling | Replaced Day 1-3 with dynamic actual dates; automatic date grouping with Thai badges | DONE | User Request |
| F9 | Native Date & Time Selectors | HTML5 `<input type="date">` with Thai full-date preview; standardized time dropdowns | DONE | User Request |
| F10 | Master Employee Registry (View 5) | Full CRUD for hospital employees; strict 6-digit ID format; department filters | DONE | User Request |
| F11 | Hospital DCC Standard A4 Roster | `FM-PPCH-HR-012 แก้ไขครั้งที่ 1 วันที่บังคับใช้ 1 ม.ค. 2569 (DCC)`, 26 rows/page A4 landscape with footer safe area | DONE | Hospital DCC Rule |
| F12 | Normal Course A4 Roster | Extended DCC A4 landscape printable template to all general courses | DONE | User Request |
| F13 | Complete Google Sheets Removal | Fully removed Google Sheets dependency for registrations and rosters | DONE | User Directive |
| F14 | Excel / CSV Export UTF-8 BOM | Strict UTF-8 BOM (`\uFEFF`) on all Excel and CSV exports | DONE | Golden Design Rules |
| F15 | Speed Dial Filter Toolbar | Single-row filter bar with Floating Action Speed Dial for Excel, CSV, and Print | DONE | Golden Design Rules |
| F16 | Training Calendar (View 2) | Monthly calendar, agenda, KPIs, multi-batch sessions, topic-day aggregation, and course shortcuts | DONE | User Request |
| F17 | Usability-First Design System | Persistent labeled navigation, restrained hospital palette, responsive filter wrapping, accessible forms, tables, cards, and mobile agenda | DONE | Anti-Slop Design |
| F18 | Full-Workspace Page Layout | Every main SPA view fills the available workspace after the sidebar, with responsive gutters; the A4 preview shell also fills the work area while sheets retain their print ratio | DONE | User Request |
| F19 | Orientation Monthly Defaults | The selected month is the batch-summary source of truth; start date must stay inside that month, and one required venue seeds every topic while remaining editable per topic | DONE | User Request |
| F20 | Local-First Roster Printing | Course-list print builds immediately from the active roster/local cache, refreshes Supabase asynchronously, and keeps click-opened action trays pinned until explicitly closed | DONE | Bug Fix |

---

## Interface Contracts

### 1. Navigation Controller Contract (`admin.html`)
- `switchAdminView(viewName: 'courses' | 'calendar' | 'create' | 'target' | 'orientation' | 'settings', courseId: string | null = null, pushHistory: boolean = true): void`
  - Toggles `.hidden` class across all six native SPA views.
  - Updates Sidebar active indicators.
  - Updates Breadcrumbs (`#adminBreadcrumbCurrent`).
  - Calls view initialization:
    - `'courses'` -> `renderCourseList()`
    - `'calendar'` -> `renderTrainingCalendar()`
    - `'create'` -> `setupCreateOrEditView(courseId)`
    - `'target'` -> `initTargetView(courseId || targetActiveCourseId)`
    - `'orientation'` -> `initOrientationView()`
    - `'settings'` -> `initSettingsView()`

### Presentation Layer Contract
- `admin-redesign.css` owns the redesign tokens and presentation overrides only.
- It must not redefine persistence, navigation, CRUD, registration, export, print, or course scheduling logic.
- The page remains functional without changing any existing data schema; `admin.html` loads this stylesheet after its legacy inline styles so the redesign is reversible and isolated.
- Main views use the full available workspace width with 26px desktop, 16px tablet, and 10px mobile gutters; content is not capped by a page-level `max-width`.
- Printable A4 sheets keep their physical aspect ratio. Only the surrounding preview shell expands to the available workspace.

### 2. Loading Lifecycle Contract (`admin.html`)
- `showLoader(title?: string, subtitle?: string): void`
  - Ensures `#loading` is displayed with `z-index: 9999` and flex display.
- `hideLoader(): void`
  - Smoothly transitions loader opacity to 0 (0.35s ease) and sets `display: none`.
  - Clears safety failsafe timer (`loaderFailsafeTimer`).
- **Guarantee:** `#loading` remains active on initial page load until `loadAdminCourses()` has completely loaded data and rendered KPI ribbon and course cards.

### 3. Database Service Contract (`supabase-service.js`)
- `SupabaseService.saveCourse(courseData: Object): Promise<{ success: boolean, data?: Object, error?: Object }>`
- `SupabaseService.updateCourseTarget(courseId: string, targetData: Object): Promise<{ success: boolean, data?: Object, error?: Object }>`
- `SupabaseService.deleteCourse(courseId: string): Promise<{ success: boolean, error?: Object }>`
- `SupabaseService.getAllCourses(): Promise<Array<Object> | null>`
- `SupabaseService.registerAttendee(attendee: Object, courseId: string, sheetId: string): Promise<Object>`
- `SupabaseService.getAttendeesByCourse(courseId: string): Promise<Array<Object>>`
- `SupabaseService.deleteAttendee(courseId: string, empId: string): Promise<Object>`
- `SupabaseService.getEmployees(): Promise<Array<Object>>`
- `SupabaseService.saveEmployees(employees: Array<Object>): Promise<Object>`

---

## Automated Verification Suites (100% Pass)

Total 56 programmatic assertions passing across 4 dedicated test suites:
1. `test_admin_spa_suite.js`: 11 / 11 tests (100%)
2. `test_orientation_suite.js`: 32 / 32 tests (100%)
3. `test_frontend_redesign_suite.js`: 7 / 7 tests (100%)
4. `test_loader_lifecycle.js`: 6 / 6 tests (100%)
