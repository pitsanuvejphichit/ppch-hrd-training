/**
 * ============================================================================
 * HRD AI - Target Audience & Unregistered Tracking Inspector Modal
 * โรงพยาบาลพิษณุเวช • Project 02: ระบบเว็บลงทะเบียนเข้าอบรม
 * ============================================================================
 * จัดการแสดงผลกลุ่มเป้าหมายของหลักสูตร:
 * 1. แสดงรายชื่อแผนกที่เป็นกลุ่มเป้าหมาย พร้อมสถานะจำนวนลงทะเบียนแล้ว / ยังไม่ลงทะเบียน
 * 2. คลิกที่แผนกเพื่อดูรายชื่อบุคลากรกลุ่มเป้าหมายในแผนกนั้นที่ยังไม่ได้ลงทะเบียน
 * 3. มีปุ่มลัดให้เลือกพนักงานคนนั้นเพื่อลงทะเบียนได้ทันที
 */

(function() {
  'use strict';

  let currentTargetData = null;
  let activeDeptFilter = 'all'; // 'all' | 'has_unregistered' | 'completed'
  let currentDrilldownDept = null;
  let activeEmpStatusFilter = 'unregistered'; // 'unregistered' | 'registered' | 'all'

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getGlobalState() {
    const course = (typeof currentCourse !== 'undefined' && currentCourse) ? currentCourse : null;
    const employees = (typeof employeeDatabase !== 'undefined' && Array.isArray(employeeDatabase)) ? employeeDatabase : [];
    const attendees = (typeof allAttendees !== 'undefined' && Array.isArray(allAttendees)) ? allAttendees : [];
    return { course, employees, attendees };
  }

  function calculateTargetAudienceData() {
    const { course, employees, attendees } = getGlobalState();
    if (!course) return null;

    const ta = course.targetAudience;
    const isAll = !ta || ta.type === 'all' || !ta.type;

    // Build registered attendees lookup map
    const regMap = new Map();
    attendees.forEach(a => {
      if (a && a.id) {
        const rawId = String(a.id).trim();
        regMap.set(rawId, a);
        if (/^\d+$/.test(rawId) && rawId.length < 6) {
          regMap.set(('000000' + rawId).slice(-6), a);
        }
      }
    });

    // Identify target employees
    const targetEmps = [];
    employees.forEach(emp => {
      if (!emp || !emp.id) return;
      const eid = String(emp.id).trim();
      const dept = String(emp.department || '').trim();
      const pos = String(emp.position || '').trim();

      let isTarget = false;
      if (isAll) {
        isTarget = true;
      } else {
        const hasId = Array.isArray(ta.employeeIds) && (
          ta.employeeIds.includes(eid) ||
          ta.employeeIds.includes(Number(eid)) ||
          ta.employeeIds.includes(('000000' + eid).slice(-6))
        );
        const hasDept = Array.isArray(ta.departments) && ta.departments.includes(dept);
        const hasPos = Array.isArray(ta.positions) && ta.positions.includes(pos);
        isTarget = hasId || hasDept || hasPos;
      }

      if (isTarget) {
        const regInfo = regMap.get(eid) || (/^\d+$/.test(eid) ? regMap.get(('000000' + eid).slice(-6)) : null);
        targetEmps.push({
          id: eid,
          title: emp.title || '',
          firstName: emp.firstName || '',
          lastName: emp.lastName || '',
          position: pos,
          department: dept || 'ไม่ระบุแผนก',
          isRegistered: !!regInfo,
          registeredBatch: regInfo ? (regInfo.batch || 'ลงทะเบียนแล้ว') : null,
          registeredTimestamp: regInfo ? regInfo.timestamp : null
        });
      }
    });

    // Group by department
    const deptMap = new Map();
    targetEmps.forEach(emp => {
      const dName = emp.department;
      if (!deptMap.has(dName)) {
        deptMap.set(dName, {
          name: dName,
          total: 0,
          registered: 0,
          unregistered: 0,
          employees: []
        });
      }
      const g = deptMap.get(dName);
      g.total++;
      if (emp.isRegistered) {
        g.registered++;
      } else {
        g.unregistered++;
      }
      g.employees.push(emp);
    });

    // Sort departments: highest number of unregistered first, then alphabetical
    const sortedDepts = Array.from(deptMap.values()).sort((a, b) => {
      if (b.unregistered !== a.unregistered) {
        return b.unregistered - a.unregistered;
      }
      return a.name.localeCompare(b.name, 'th');
    });

    const totalTarget = targetEmps.length;
    const totalRegistered = targetEmps.filter(e => e.isRegistered).length;
    const totalUnregistered = totalTarget - totalRegistered;
    const regPercent = totalTarget > 0 ? Math.round((totalRegistered / totalTarget) * 100) : 0;

    return {
      isAll,
      summary: (ta && ta.summary) ? ta.summary : (isAll ? 'เปิดรับบุคลากรทุกแผนกและทุกตำแหน่ง' : 'กำหนดกลุ่มเป้าหมายเฉพาะกลุ่ม'),
      totalTarget,
      totalRegistered,
      totalUnregistered,
      regPercent,
      departments: sortedDepts,
      allTargetEmployees: targetEmps
    };
  }

  function ensureModalDom() {
    let modal = document.getElementById('targetAudienceModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'targetAudienceModal';
    modal.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99990] flex items-center justify-center p-3 sm:p-5 opacity-0 pointer-events-none transition-all duration-200 ease-out font-sans';
    modal.innerHTML = `
      <div id="targetAudienceCard" class="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 transform scale-95 transition-all duration-200 ease-out flex flex-col max-h-[90vh] overflow-hidden">
        
        <!-- Header -->
        <div class="px-5 sm:px-6 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50/40 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-amber-100/90 border border-amber-200 text-amber-700 flex items-center justify-center text-base shadow-xs shrink-0">
              🎯
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
                กลุ่มเป้าหมายของหลักสูตร
                <span id="targetModalScopeBadge" class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                  ทุกแผนก
                </span>
              </h3>
              <p id="targetModalSummaryText" class="text-xs text-slate-500 font-light truncate max-w-xs sm:max-w-xl mt-0.5">
                เปิดรับบุคลากรทุกแผนกและทุกตำแหน่ง
              </p>
            </div>
          </div>
          <button type="button" id="targetAudienceCloseBtn" class="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center text-sm font-semibold transition-all cursor-pointer">
            ✕
          </button>
        </div>

        <!-- Overview Stat Counter (Compact) -->
        <div class="px-5 sm:px-6 py-2.5 bg-slate-50/90 border-b border-slate-100 grid grid-cols-3 gap-2 sm:gap-3 text-center shrink-0">
          <div class="bg-white rounded-xl py-1.5 px-3 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-center sm:gap-2">
            <span class="text-[11px] text-slate-500 font-medium">เป้าหมายทั้งหมด:</span>
            <div class="flex items-baseline gap-1">
              <span id="statTargetTotal" class="text-base sm:text-lg font-extrabold text-slate-800">0</span>
              <span class="text-[10px] text-slate-400">ท่าน</span>
            </div>
          </div>
          <div class="bg-white rounded-xl py-1.5 px-3 border border-emerald-200/90 bg-emerald-50/20 shadow-2xs flex flex-col sm:flex-row items-center justify-center sm:gap-2">
            <span class="text-[11px] text-emerald-700 font-medium">ลงทะเบียนแล้ว:</span>
            <div class="flex items-baseline gap-1">
              <span id="statTargetRegistered" class="text-base sm:text-lg font-extrabold text-emerald-600">0</span>
              <span id="statTargetRegPercent" class="text-[10px] text-emerald-500 font-medium">(0%)</span>
            </div>
          </div>
          <div class="bg-white rounded-xl py-1.5 px-3 border border-amber-300 bg-amber-50/40 shadow-2xs flex flex-col sm:flex-row items-center justify-center sm:gap-2">
            <span class="text-[11px] text-amber-800 font-bold">ยังไม่ลงทะเบียน:</span>
            <div class="flex items-baseline gap-1">
              <span id="statTargetUnregistered" class="text-base sm:text-lg font-extrabold text-amber-600">0</span>
              <span class="text-[10px] text-amber-600 font-medium">ท่าน</span>
            </div>
          </div>
        </div>

        <!-- Modal Body Content -->
        <div class="flex-1 overflow-y-auto custom-scroll p-4 sm:p-5 bg-slate-50/40">
          
          <!-- ================= VIEW 1: DEPARTMENT LIST ================= -->
          <div id="targetDeptView" class="space-y-3">
            <!-- Filter & Search Toolbar -->
            <div class="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              <div class="relative flex-1">
                <svg class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <input type="text" id="targetDeptSearchInput" placeholder="ค้นหาแผนก..." class="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2e5e8b]/20 focus:border-[#2e5e8b] transition-all" />
                <button type="button" id="targetDeptClearSearchBtn" class="hidden absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1">✕</button>
              </div>
              <!-- Filter Tabs -->
              <div class="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 shrink-0 text-xs">
                <button type="button" id="filterDeptAllBtn" class="px-3 py-1.5 rounded-lg font-medium transition-all bg-[#2e5e8b] text-white shadow-2xs">
                  ทั้งหมด (<span id="countFilterDeptAll">0</span>)
                </button>
                <button type="button" id="filterDeptUnregBtn" class="px-3 py-1.5 rounded-lg font-medium transition-all bg-white text-slate-600 border border-slate-200 hover:bg-slate-50">
                  ยังมีผู้ไม่ลงทะเบียน (<span id="countFilterDeptUnreg">0</span>)
                </button>
                <button type="button" id="filterDeptCompBtn" class="px-3 py-1.5 rounded-lg font-medium transition-all bg-white text-slate-600 border border-slate-200 hover:bg-slate-50">
                  ครบ 100% (<span id="countFilterDeptComp">0</span>)
                </button>
              </div>
            </div>

            <!-- Department Cards Grid (Compact 3 Columns) -->
            <div id="targetDeptGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              <!-- Rendered via JS -->
            </div>

            <!-- Empty Search State -->
            <div id="targetDeptEmptyState" class="hidden text-center py-10 bg-white rounded-2xl border border-slate-200">
              <span class="text-3xl block mb-2">🔍</span>
              <p class="text-sm font-medium text-slate-700">ไม่พบแผนกที่ตรงกับคำค้นหา</p>
              <p class="text-xs text-slate-400 mt-1">ลองพิมพ์คำค้นหาใหม่อีกครั้งค่ะ</p>
            </div>
          </div>

          <!-- ================= VIEW 2: EMPLOYEE DRILLDOWN ================= -->
          <div id="targetEmpView" class="hidden space-y-3.5">
            <!-- Navigation Back Bar & Dept Title -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div class="flex items-center gap-3">
                <button type="button" id="targetDrilldownBackBtn" class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0">
                  <span>←</span>
                  <span>กลับหน้ารวมแผนก</span>
                </button>
                <div>
                  <h4 id="targetDrilldownDeptName" class="text-sm sm:text-base font-bold text-slate-800 leading-tight">
                    แผนก: -
                  </h4>
                  <p id="targetDrilldownDeptSubtitle" class="text-xs text-slate-500 font-light mt-0.5">
                    เป้าหมาย 0 ท่าน • ยังไม่ลงทะเบียน 0 ท่าน • ลงทะเบียนแล้ว 0 ท่าน
                  </p>
                </div>
              </div>
              <div id="targetDrilldownProgressPill" class="shrink-0 flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 self-start sm:self-auto">
                <!-- Dynamically populated -->
              </div>
            </div>

            <!-- Search & Status Filter Bar -->
            <div class="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              <div class="relative flex-1">
                <svg class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <input type="text" id="targetEmpSearchInput" placeholder="ค้นหารหัส, ชื่อ, หรือตำแหน่งในแผนกนี้..." class="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#2e5e8b]/20 focus:border-[#2e5e8b] transition-all" />
                <button type="button" id="targetEmpClearSearchBtn" class="hidden absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1">✕</button>
              </div>
              <!-- Status Tabs -->
              <div class="flex items-center gap-1.5 shrink-0 text-xs">
                <button type="button" id="filterEmpUnregBtn" class="px-3 py-1.5 rounded-lg font-bold transition-all bg-amber-500 text-white shadow-2xs">
                  ยังไม่ลงทะเบียน (<span id="countEmpUnreg">0</span>)
                </button>
                <button type="button" id="filterEmpRegBtn" class="px-3 py-1.5 rounded-lg font-medium transition-all bg-white text-slate-600 border border-slate-200 hover:bg-slate-50">
                  ลงทะเบียนแล้ว (<span id="countEmpReg">0</span>)
                </button>
                <button type="button" id="filterEmpAllBtn" class="px-3 py-1.5 rounded-lg font-medium transition-all bg-white text-slate-600 border border-slate-200 hover:bg-slate-50">
                  ทั้งหมด (<span id="countEmpAll">0</span>)
                </button>
              </div>
            </div>

            <!-- Employee List Container -->
            <div class="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th class="py-2.5 px-4 w-28">รหัสพนักงาน</th>
                      <th class="py-2.5 px-4">ชื่อ - นามสกุล</th>
                      <th class="py-2.5 px-4">ตำแหน่ง</th>
                      <th class="py-2.5 px-4 text-center w-36">สถานะ</th>
                      <th class="py-2.5 px-4 text-right w-36">ดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody id="targetEmpTableBody" class="divide-y divide-slate-100 text-xs text-slate-700">
                    <!-- Dynamically populated -->
                  </tbody>
                </table>
              </div>
              <!-- Empty state inside employee list -->
              <div id="targetEmpEmptyState" class="hidden text-center py-10 px-4">
                <!-- Dynamically populated -->
              </div>
            </div>

          </div>

        </div>

        <!-- Footer -->
        <div class="px-5 sm:px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0 text-xs text-slate-500">
          <span class="flex items-center gap-1.5 text-slate-500">
            <span>💡</span> <span class="hidden sm:inline">คลิกปุ่ม</span> "เลือกคนนี้เพื่อลงทะเบียน" <span class="hidden sm:inline">เพื่อกรอกข้อมูลลงทะเบียนทันที</span>
          </span>
          <button type="button" id="targetAudienceFooterCloseBtn" class="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold transition-all cursor-pointer">
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(modal);

    // Bind Close events
    const closeBtns = [
      document.getElementById('targetAudienceCloseBtn'),
      document.getElementById('targetAudienceFooterCloseBtn')
    ];
    closeBtns.forEach(btn => {
      if (btn) btn.addEventListener('click', closeTargetAudienceModal);
    });

    // Close on backdrop click
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeTargetAudienceModal();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && modal.classList.contains('opacity-100')) {
        closeTargetAudienceModal();
      }
    });

    // Department view search & filter
    const deptSearchInput = document.getElementById('targetDeptSearchInput');
    if (deptSearchInput) {
      deptSearchInput.addEventListener('input', renderTargetDepartments);
    }
    const clearDeptBtn = document.getElementById('targetDeptClearSearchBtn');
    if (clearDeptBtn) {
      clearDeptBtn.addEventListener('click', () => {
        deptSearchInput.value = '';
        renderTargetDepartments();
      });
    }

    document.getElementById('filterDeptAllBtn').addEventListener('click', () => setTargetDeptFilter('all'));
    document.getElementById('filterDeptUnregBtn').addEventListener('click', () => setTargetDeptFilter('has_unregistered'));
    document.getElementById('filterDeptCompBtn').addEventListener('click', () => setTargetDeptFilter('completed'));

    // Employee drilldown back & filter
    document.getElementById('targetDrilldownBackBtn').addEventListener('click', backToTargetDeptView);

    const empSearchInput = document.getElementById('targetEmpSearchInput');
    if (empSearchInput) {
      empSearchInput.addEventListener('input', renderDrilldownEmployees);
    }
    const clearEmpBtn = document.getElementById('targetEmpClearSearchBtn');
    if (clearEmpBtn) {
      clearEmpBtn.addEventListener('click', () => {
        empSearchInput.value = '';
        renderDrilldownEmployees();
      });
    }

    document.getElementById('filterEmpUnregBtn').addEventListener('click', () => setTargetEmpStatusFilter('unregistered'));
    document.getElementById('filterEmpRegBtn').addEventListener('click', () => setTargetEmpStatusFilter('registered'));
    document.getElementById('filterEmpAllBtn').addEventListener('click', () => setTargetEmpStatusFilter('all'));

    return modal;
  }

  function setTargetDeptFilter(filter) {
    activeDeptFilter = filter;
    const allBtn = document.getElementById('filterDeptAllBtn');
    const unregBtn = document.getElementById('filterDeptUnregBtn');
    const compBtn = document.getElementById('filterDeptCompBtn');

    [allBtn, unregBtn, compBtn].forEach(b => {
      b.className = 'px-3 py-1.5 rounded-lg font-medium transition-all bg-white text-slate-600 border border-slate-200 hover:bg-slate-50';
    });

    if (filter === 'all') {
      allBtn.className = 'px-3 py-1.5 rounded-lg font-bold transition-all bg-[#2e5e8b] text-white shadow-2xs';
    } else if (filter === 'has_unregistered') {
      unregBtn.className = 'px-3 py-1.5 rounded-lg font-bold transition-all bg-amber-500 text-white shadow-2xs';
    } else if (filter === 'completed') {
      compBtn.className = 'px-3 py-1.5 rounded-lg font-bold transition-all bg-emerald-600 text-white shadow-2xs';
    }

    renderTargetDepartments();
  }

  function setTargetEmpStatusFilter(filter) {
    activeEmpStatusFilter = filter;
    const unregBtn = document.getElementById('filterEmpUnregBtn');
    const regBtn = document.getElementById('filterEmpRegBtn');
    const allBtn = document.getElementById('filterEmpAllBtn');

    [unregBtn, regBtn, allBtn].forEach(b => {
      b.className = 'px-3 py-1.5 rounded-lg font-medium transition-all bg-white text-slate-600 border border-slate-200 hover:bg-slate-50';
    });

    if (filter === 'unregistered') {
      unregBtn.className = 'px-3 py-1.5 rounded-lg font-bold transition-all bg-amber-500 text-white shadow-2xs';
    } else if (filter === 'registered') {
      regBtn.className = 'px-3 py-1.5 rounded-lg font-bold transition-all bg-emerald-600 text-white shadow-2xs';
    } else if (filter === 'all') {
      allBtn.className = 'px-3 py-1.5 rounded-lg font-bold transition-all bg-[#2e5e8b] text-white shadow-2xs';
    }

    renderDrilldownEmployees();
  }

  function openTargetAudienceModal() {
    ensureModalDom();
    const modal = document.getElementById('targetAudienceModal');
    const card = document.getElementById('targetAudienceCard');

    currentTargetData = calculateTargetAudienceData();
    if (!currentTargetData) {
      if (typeof HrdModal !== 'undefined' && HrdModal.info) {
        HrdModal.info('ไม่พบข้อมูลหลักสูตรที่กำลังเปิดอยู่ค่ะ', 'ข้อมูลไม่พร้อมใช้งาน');
      } else {
        alert('ไม่พบข้อมูลหลักสูตรที่กำลังเปิดอยู่ค่ะ');
      }
      return;
    }

    // Populate Overview Stats
    document.getElementById('statTargetTotal').textContent = currentTargetData.totalTarget.toLocaleString('th-TH');
    document.getElementById('statTargetRegistered').textContent = currentTargetData.totalRegistered.toLocaleString('th-TH');
    document.getElementById('statTargetRegPercent').textContent = `(${currentTargetData.regPercent}%)`;
    document.getElementById('statTargetUnregistered').textContent = currentTargetData.totalUnregistered.toLocaleString('th-TH');
    document.getElementById('targetModalSummaryText').textContent = currentTargetData.summary;

    const scopeBadge = document.getElementById('targetModalScopeBadge');
    if (currentTargetData.isAll) {
      scopeBadge.textContent = 'ทุกแผนกและตำแหน่ง';
      scopeBadge.className = 'text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200';
    } else {
      scopeBadge.textContent = 'กำหนดเฉพาะกลุ่ม';
      scopeBadge.className = 'text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300';
    }

    // Reset View to Department List View
    backToTargetDeptView();

    // Show Modal
    modal.classList.remove('opacity-0', 'pointer-events-none');
    modal.classList.add('opacity-100', 'pointer-events-auto');
    card.classList.remove('scale-95');
    card.classList.add('scale-100');
  }

  function closeTargetAudienceModal() {
    const modal = document.getElementById('targetAudienceModal');
    const card = document.getElementById('targetAudienceCard');
    if (!modal) return;

    modal.classList.remove('opacity-100', 'pointer-events-auto');
    modal.classList.add('opacity-0', 'pointer-events-none');
    if (card) {
      card.classList.remove('scale-100');
      card.classList.add('scale-95');
    }
  }

  function backToTargetDeptView() {
    currentDrilldownDept = null;
    document.getElementById('targetDeptView').classList.remove('hidden');
    document.getElementById('targetEmpView').classList.add('hidden');

    const searchInput = document.getElementById('targetDeptSearchInput');
    if (searchInput) searchInput.value = '';
    renderTargetDepartments();
  }

  function renderTargetDepartments() {
    if (!currentTargetData) return;

    const grid = document.getElementById('targetDeptGrid');
    const emptyState = document.getElementById('targetDeptEmptyState');
    const searchInput = document.getElementById('targetDeptSearchInput');
    const clearBtn = document.getElementById('targetDeptClearSearchBtn');

    const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
    if (clearBtn) {
      clearBtn.classList.toggle('hidden', query.length === 0);
    }

    const allDepts = currentTargetData.departments || [];
    const unregDeptsCount = allDepts.filter(d => d.unregistered > 0).length;
    const compDeptsCount = allDepts.filter(d => d.unregistered === 0).length;

    document.getElementById('countFilterDeptAll').textContent = allDepts.length;
    document.getElementById('countFilterDeptUnreg').textContent = unregDeptsCount;
    document.getElementById('countFilterDeptComp').textContent = compDeptsCount;

    // Filter by tab & query
    let filtered = allDepts.filter(d => {
      if (activeDeptFilter === 'has_unregistered' && d.unregistered === 0) return false;
      if (activeDeptFilter === 'completed' && d.unregistered > 0) return false;
      if (query && !d.name.toLowerCase().includes(query)) return false;
      return true;
    });

    if (filtered.length === 0) {
      grid.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    grid.innerHTML = filtered.map(dept => {
      const isComplete = dept.unregistered === 0;
      const percent = dept.total > 0 ? Math.round((dept.registered / dept.total) * 100) : 0;

      const badgeHtml = isComplete
        ? `<span class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
             <span>✓</span> ครบ
           </span>`
        : `<span class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 shrink-0">
             <span>⏳</span> รอ ${dept.unregistered} ท่าน
           </span>`;

      return `
        <div onclick="window.HRD_TARGET_INSPECTOR.openDepartmentDrilldown('${escapeHtml(dept.name)}')" 
             class="group p-3 bg-white rounded-xl border border-slate-200 hover:border-[#2e5e8b] hover:shadow-md transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-2">
          
          <!-- Row 1: Dept Name & Status Badge -->
          <div class="flex items-center justify-between gap-1.5 min-w-0">
            <div class="flex items-center gap-1.5 min-w-0 flex-1">
              <span class="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-xs group-hover:bg-blue-50 group-hover:text-[#2e5e8b] shrink-0 transition-colors">
                🏢
              </span>
              <h4 class="font-bold text-slate-800 text-xs sm:text-[13px] group-hover:text-[#2e5e8b] transition-colors truncate" title="${escapeHtml(dept.name)}">
                ${escapeHtml(dept.name)}
              </h4>
            </div>
            ${badgeHtml}
          </div>

          <!-- Row 2: Slim Progress Bar -->
          <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all duration-300 ${isComplete ? 'bg-emerald-500' : 'bg-[#5facde]'}" style="width: ${percent}%;"></div>
          </div>

          <!-- Row 3: Stats & Action Arrow -->
          <div class="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
            <span>ลงแล้ว <strong class="${isComplete ? 'text-emerald-600' : 'text-slate-700'}">${dept.registered}</strong>/${dept.total} ท่าน (${percent}%)</span>
            <span class="font-semibold text-[#2e5e8b] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 text-[11px]">
              ดูรายชื่อ ❯
            </span>
          </div>

        </div>
      `;
    }).join('');
  }

  function openDepartmentDrilldown(deptName) {
    if (!currentTargetData) return;
    const dept = currentTargetData.departments.find(d => d.name === deptName);
    if (!dept) return;

    currentDrilldownDept = dept;
    document.getElementById('targetDeptView').classList.add('hidden');
    document.getElementById('targetEmpView').classList.remove('hidden');

    document.getElementById('targetDrilldownDeptName').textContent = `แผนก: ${dept.name}`;
    document.getElementById('targetDrilldownDeptSubtitle').textContent = 
      `เป้าหมายทั้งหมด ${dept.total} ท่าน • ยังไม่ลงทะเบียน ${dept.unregistered} ท่าน • ลงทะเบียนแล้ว ${dept.registered} ท่าน`;

    const progressPill = document.getElementById('targetDrilldownProgressPill');
    if (dept.unregistered === 0) {
      progressPill.className = 'shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800';
      progressPill.innerHTML = `<span>✓</span><span>ลงทะเบียนครบ 100%</span>`;
    } else {
      progressPill.className = 'shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-800';
      progressPill.innerHTML = `<span>⏳</span><span>ยังไม่ลงทะเบียน ${dept.unregistered} ท่าน</span>`;
    }

    // Default to show unregistered employees first
    setTargetEmpStatusFilter(dept.unregistered > 0 ? 'unregistered' : 'all');

    const searchInput = document.getElementById('targetEmpSearchInput');
    if (searchInput) searchInput.value = '';

    renderDrilldownEmployees();
  }

  function renderDrilldownEmployees() {
    if (!currentDrilldownDept) return;

    const tbody = document.getElementById('targetEmpTableBody');
    const emptyState = document.getElementById('targetEmpEmptyState');
    const searchInput = document.getElementById('targetEmpSearchInput');
    const clearBtn = document.getElementById('targetEmpClearSearchBtn');

    const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
    if (clearBtn) {
      clearBtn.classList.toggle('hidden', query.length === 0);
    }

    const deptEmps = currentDrilldownDept.employees || [];
    const unregCount = deptEmps.filter(e => !e.isRegistered).length;
    const regCount = deptEmps.filter(e => e.isRegistered).length;

    document.getElementById('countEmpUnreg').textContent = unregCount;
    document.getElementById('countEmpReg').textContent = regCount;
    document.getElementById('countEmpAll').textContent = deptEmps.length;

    let filtered = deptEmps.filter(e => {
      if (activeEmpStatusFilter === 'unregistered' && e.isRegistered) return false;
      if (activeEmpStatusFilter === 'registered' && !e.isRegistered) return false;

      if (query) {
        const matchId = e.id.toLowerCase().includes(query);
        const matchFirst = e.firstName.toLowerCase().includes(query);
        const matchLast = e.lastName.toLowerCase().includes(query);
        const matchPos = e.position.toLowerCase().includes(query);
        if (!matchId && !matchFirst && !matchLast && !matchPos) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      emptyState.classList.remove('hidden');
      if (query) {
        emptyState.innerHTML = `
          <span class="text-3xl block mb-2">🔍</span>
          <p class="text-sm font-medium text-slate-700">ไม่พบรายชื่อที่ตรงกับ "${escapeHtml(query)}"</p>
          <p class="text-xs text-slate-400 mt-1">ลองค้นหาด้วยรหัสพนักงาน ชื่อ หรือตำแหน่งใหม่อีกครั้งค่ะ</p>
        `;
      } else if (activeEmpStatusFilter === 'unregistered') {
        emptyState.innerHTML = `
          <div class="py-6">
            <span class="text-4xl block mb-2">🎉</span>
            <p class="text-sm font-bold text-emerald-800">ยอดเยี่ยม! ไม่มีบุคลากรที่ยังค้างลงทะเบียนในแผนกนี้</p>
            <p class="text-xs text-slate-500 mt-1">บุคลากรกลุ่มเป้าหมายในแผนก ${escapeHtml(currentDrilldownDept.name)} ลงทะเบียนเข้าอบรมครบถ้วน 100% แล้วค่ะ</p>
          </div>
        `;
      } else {
        emptyState.innerHTML = `
          <p class="text-xs text-slate-400">ไม่มีข้อมูลพนักงานในหมวดหมู่นี้</p>
        `;
      }
      return;
    }

    emptyState.classList.add('hidden');
    tbody.innerHTML = filtered.map(emp => {
      const fullName = (emp.title ? emp.title + ' ' : '') + emp.firstName + ' ' + emp.lastName;
      const statusBadge = emp.isRegistered
        ? `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
             <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> ลงทะเบียนแล้ว
           </span>`
        : `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
             <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> ยังไม่ลงทะเบียน
           </span>`;

      const actionBtn = emp.isRegistered
        ? `<span class="text-[11px] text-slate-400 italic">
             ${emp.registeredBatch ? escapeHtml(emp.registeredBatch) : 'บันทึกแล้ว'}
           </span>`
        : `<button type="button" onclick="window.HRD_TARGET_INSPECTOR.quickSelectEmployee('${emp.id}')"
                   class="px-2.5 py-1 rounded-lg bg-[#2e5e8b] hover:bg-[#204466] active:scale-95 text-white font-medium text-[11px] transition-all cursor-pointer shadow-2xs flex items-center gap-1 ml-auto">
             <span>ลงทะเบียนคนนี้</span>
             <span>➔</span>
           </button>`;

      return `
        <tr class="hover:bg-slate-50/70 transition-colors">
          <td class="py-2.5 px-4 font-mono font-bold text-slate-800">
            <span class="px-2 py-0.5 bg-slate-100 rounded text-[11px] border border-slate-200">
              ${escapeHtml(emp.id)}
            </span>
          </td>
          <td class="py-2.5 px-4 font-medium text-slate-800">
            ${escapeHtml(fullName)}
          </td>
          <td class="py-2.5 px-4 text-slate-600">
            ${escapeHtml(emp.position)}
          </td>
          <td class="py-2.5 px-4 text-center">
            ${statusBadge}
          </td>
          <td class="py-2.5 px-4 text-right">
            ${actionBtn}
          </td>
        </tr>
      `;
    }).join('');
  }

  function quickSelectEmployee(empId) {
    const { employees } = getGlobalState();
    const emp = employees.find(e => String(e.id).trim() === String(empId).trim());
    if (!emp) return;

    closeTargetAudienceModal();

    // Check if on Desktop
    if (typeof selectEmployee === 'function' && document.getElementById('empSearchInput')) {
      if (typeof switchTab === 'function') {
        switchTab('register', true);
      }
      const input = document.getElementById('empSearchInput');
      if (input) {
        input.value = emp.id + ' ' + (emp.title || '') + emp.firstName + ' ' + emp.lastName;
      }
      selectEmployee(emp.id);

      // Scroll smoothly to batch selection section so user immediately sees batch options!
      setTimeout(() => {
        const batchSec = document.getElementById('desktopBatchSection');
        if (batchSec && !batchSec.classList.contains('hidden')) {
          batchSec.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (input) {
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    // Check if on Mobile
    if (typeof selectMobileEmployee === 'function') {
      if (typeof switchMobileTab === 'function') {
        switchMobileTab('register');
      }
      const mInput = document.getElementById('mEmpSearchInput');
      if (mInput) {
        mInput.value = emp.id + ' ' + (emp.title || '') + emp.firstName + ' ' + emp.lastName;
      }
      selectMobileEmployee(emp.id);

      setTimeout(() => {
        const mBatchSec = document.getElementById('mBatchSection');
        if (mBatchSec && !mBatchSec.classList.contains('hidden')) {
          mBatchSec.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (mInput) {
          mInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
    }
  }

  // Expose global interface
  window.HRD_TARGET_INSPECTOR = {
    openModal: openTargetAudienceModal,
    closeModal: closeTargetAudienceModal,
    openDepartmentDrilldown: openDepartmentDrilldown,
    quickSelectEmployee: quickSelectEmployee,
    calculateData: calculateTargetAudienceData
  };

  window.openTargetAudienceModal = openTargetAudienceModal;
  window.closeTargetAudienceModal = closeTargetAudienceModal;

})();
