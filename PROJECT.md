# Project: HRD Training Admin Portal - Native SPA & Supabase Overhaul
**Hospital:** โรงพยาบาลพิษณุเวช พิจิตร (Phitsanuvej Phichit Hospital - Princ Health)  
**Target Codebase:** `h:/My Drive/HRD AI/projects/02-เว็บลงทะเบียนเข้าอบรม/ระบบ/src/web/`  
**Date:** 2026-10-09  

---

## Architecture

The HRD Training Admin Portal has been overhauled into a **100% Native Single Page Application (SPA)** with zero page reloads, zero `<iframe>` usage, and sub-0.1s Tier-1 database operations:

```
+---------------------------------------------------------------------------------------------------+
|  PERMANENT STICKY HEADER (z-40)                                                                   |
|  [Logo + Hospital Name]      [⚡ Supabase 0.08s Active]   [Archive Modal]   [+ สร้างหลักสูตรใหม่]     |
+---------------------------------------------------------------------------------------------------+
| PERMANENT LEFT SIDEBAR       | WORKSPACE CONTAINER                                                |
|                              | [Dynamic Breadcrumb Navigation Bar: หน้าหลัก > View Label]         |
| [กลุ่มที่ 1: ระบบฝึกอบรม]        |-------------------------------------------------------------------|
|  - รายการหลักสูตร (#courses)   |  <main id="adminMainWorkspace">                                   |
|  - สร้างหลักสูตร (#create)     |    +- VIEW 1: #viewCourses (Native DOM) -------------------------+ |
|  - กลุ่มเป้าหมาย (#target)     |    |  KPI Summary, Search/Filters, Clinical Cards, FAB Dock     | |
|                              |    +--------------------------------------------------------------+ |
| [REMOVED: Training Record]   |    +- VIEW 2: #viewTarget (Native DOM - Pre-existing) ------------+ |
| [REMOVED: Training Dash]     |    |  Course Selector, Target Scope Toggle, Dept/Pos Union Matrix | |
| [REMOVED: Personal Dash]     |    +--------------------------------------------------------------+ |
|                              |    +- VIEW 3: #viewCreate (NATIVE DOM - Replaces iframe) ---------+ |
|                              |    |  1. ข้อมูลทั่วไป (ID, Title, Speaker, Cover Image Upload)    | |
|                              |    |  2. ประเภทและหมวดหมู่ (In-plan, Mandatory, etc.)             | |
|                              |    |  3. รุ่นการอบรม (Batches CRUD & Quota)                      | |
|                              |    |  4. หัวข้อย่อย / ฐานการเรียนรู้ (Subtopics CRUD)             | |
|                              |    |  5. เอกสารประกอบและบันทึก (Handout Links, Drive Folder)       | |
|                              |    +--------------------------------------------------------------+ |
|                              |  </main>                                                           |
+---------------------------------------------------------------------------------------------------+
| MODAL LAYER (Root Body):                                                                          |
| - #saveProgressModal   - #successModal (QR Code)   - #archiveModal   - HrdModal (Toasts & Alerts) |
+---------------------------------------------------------------------------------------------------+
```

### Data Layer Architecture
- **Tier 1 (Instant 0ms):** In-memory state and `localStorage` caching (`hrd_all_courses`).
- **Tier 1 DB (Direct PostgreSQL via Supabase REST API ~0.08s):** `SupabaseService.saveCourse()`, `updateCourseTarget()`, `deleteCourse()`, `getAllCourses()`.
- **Tier 2 (Background Sync):** Non-blocking asynchronous sync to Google Apps Script (`DEFAULT_GAS_URL`) ensuring zero UI stalling while updating institutional Google Spreadsheets.

---

## Feature Inventory

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Native SPA Shell | Header and Sidebar permanently mounted; dynamic breadcrumbs; zero page refresh | M1 | Survey (E1) |
| F2 | 0ms View Switching | Instantaneous view toggle via Tailwind `.hidden` classes for `#viewCourses`, `#viewCreate`, `#viewTarget` | M1 | Survey (E1, E2) |
| F3 | Remove `<iframe>` Container | Completely remove `<iframe id="createCourseFrame">` and inter-frame `postMessage` | M1 | Survey (E1) |
| F4 | Excise Training Record Links | Eliminate Group 2 external navigation links from Sidebar (`admin.html:241-280`) | M1 | Survey (E1) |
| F5 | Native Course Create/Edit View | Move 4-section course form DOM from `admin-create.html` directly into `#viewCreate` in `admin.html` | M2 | Survey (E1, E2) |
| F6 | Batch/Session Management | Dynamic add/remove batches, Thai date parsing, and quota management | M2 | Survey (E2) |
| F7 | Subtopics & Learning Stations | Dynamic subtopic addition with dates, times, speakers, and topic modes | M2 | Survey (E2) |
| F8 | Cover Image & Document Uploads | Add course poster/cover image upload with live preview and training document attachments | M2 | Survey (E2) |
| F9 | Direct Supabase CRUD (~0.08s) | Direct client CRUD operations on Supabase `courses` and `target_audience` tables | M3 | Survey (E3) |
| F10 | Google Sheets Background Sync | Non-blocking background sync to Google Apps Script without locking UI | M3 | Survey (E3) |
| F11 | Active Supabase Status Indicator | Live connection indicator badge in Header (`⚡ Supabase 0.08s Active`) | M3 | Survey (E2, E3) |
| F12 | Multi-Step Live Progress Modal | Transparent step-by-step progress feedback during course creation/saving | M3 | Survey (E2, E3) |
| F13 | Hospital Professional Styling | Phitsanuvej brand palette (Executive Navy `#0a2540`, Royal Blue `#0369a1`, Emerald `#059669`), tactile glassmorphism | M4 | Survey (E2) |
| F14 | HrdModal Dialogs & Toasts | Replace native `alert`/`confirm` with branded hospital modal alerts | M4 | Survey (E2) |
| F15 | Responsive & Ergonomic Layout | Desktop widescreen ergonomic max-width and mobile drawer navigation | M4 | Survey (E2) |
| F16 | Backward Compatibility Redirects | `admin-create.html` & `admin-target.html` redirect to `admin.html?view=...` | M1 | Survey (E1, E2) |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Native SPA Shell & Navigation Cleansing | Remove Training Record links; convert `#viewCreate` into native DOM container; implement `switchAdminView(0ms)`; update redirects | none | DONE |
| M2 | Native Course Form & Feature Unification | Insource 4-section course form DOM and controllers into `admin.html`; add cover image upload & document attachments; unify state | M1 | DONE |
| M3 | Direct Supabase CRUD & Dual-Tier Sync | Wire `SupabaseService` direct CRUD (~0.08s); setup non-blocking GAS background sync; add live progress modal & Supabase badge | M2 | DONE |
| M4 | Hospital Professional UI/UX & Responsive Polish | Apply Phitsanuvej hospital theme; tactile glassmorphism; dynamic quota indicators; `HrdModal` integration; mobile drawer | M3 | DONE |
| M5 | E2E Programmatic Verification & Audit | Opaque-box E2E testing (0ms switching, zero iframes, no external links, Supabase CRUD, syntax integrity); Challenger verification; Forensic Audit | M4 | DONE |

---

## Interface Contracts

### 1. Navigation Controller Contract (`admin.html`)
- `switchAdminView(viewName: 'courses' | 'create' | 'target', courseId: string | null = null, pushHistory: boolean = true): void`
  - Toggles `.hidden` class on `#viewCourses`, `#viewCreate`, and `#viewTarget`.
  - Updates Sidebar active indicators (`#sidebarCoursesDot`, `#sidebarCreateDot`, `#sidebarTargetDot`).
  - Updates Breadcrumbs (`#adminBreadcrumbCurrent`).
  - Calls view setup:
    - `'courses'` -> `renderCourseList()`
    - `'create'` -> `setupCreateOrEditView(courseId)`
    - `'target'` -> `initTargetView(courseId || targetActiveCourseId)`

### 2. Native Form Controller Contract (`admin.html`)
- `setupCreateOrEditView(courseId: string | null): void`
  - Resets form if `courseId === null`.
  - Populates existing course data if `courseId` provided.
- `handleSaveCourse(event: Event): Promise<void>`
  - Collects form data (general info, cover image, batches, subtopics, documents).
  - Validates required fields using `HrdModal.warning()`.
  - Executes dual-tier persistence:
    1. Writes to `localStorage` immediately.
    2. Calls `SupabaseService.saveCourse(courseData)` (<0.1s).
    3. Triggers background `syncToGas(courseData)` without awaiting.
    4. Displays `#successModal` with registration QR code and link.

### 3. Database Service Contract (`supabase-service.js`)
- `SupabaseService.saveCourse(courseData: Object): Promise<{ success: boolean, data?: Object, error?: Object }>`
- `SupabaseService.updateCourseTarget(courseId: string, targetData: Object): Promise<{ success: boolean, data?: Object, error?: Object }>`
- `SupabaseService.deleteCourse(courseId: string): Promise<{ success: boolean, error?: Object }>`
- `SupabaseService.getAllCourses(): Promise<{ success: boolean, data?: Array, error?: Object }>`

---

## Code Layout

- `projects/02-เว็บลงทะเบียนเข้าอบรม/ระบบ/src/web/admin.html`: Primary SPA application file containing Header, Sidebar, `#viewCourses`, `#viewCreate`, `#viewTarget`, and shared modals.
- `projects/02-เว็บลงทะเบียนเข้าอบรม/ระบบ/src/web/supabase-service.js`: Tier-1 PostgreSQL client service.
- `projects/02-เว็บลงทะเบียนเข้าอบรม/ระบบ/src/web/modal.js`: Branded modal & toast library.
- `projects/02-เว็บลงทะเบียนเข้าอบรม/ระบบ/src/web/demo_data.js`: Validated 177-employee fallback dataset with window export.
- `projects/02-เว็บลงทะเบียนเข้าอบรม/ระบบ/src/web/admin-create.html`: Backward-compatibility redirect shim to `admin.html?view=create`.
- `projects/02-เว็บลงทะเบียนเข้าอบรม/ระบบ/src/web/admin-target.html`: Backward-compatibility redirect shim to `admin.html?view=target`.
