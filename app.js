// App Logic for Training Seat Booking System (Project 02)
let employeeDatabase = typeof DEMO_EMPLOYEES !== 'undefined' ? DEMO_EMPLOYEES : [];
const STORAGE_KEY = 'hrd_attendees_cpr2026';

const DEFAULT_ATTENDEES = [
  {
    no: 1,
    id: "000023",
    title: "นางสาว",
    firstName: "กมลชนก",
    lastName: "แก้วคำฟู",
    position: "HoD, Human Resource",
    department: "Human Resource Department",
    batch: "รุ่นที่ 1 (ช่วงเช้า 09:00 - 12:00 น.)",
    timestamp: "08/09/2569 10:15:20"
  },
  {
    no: 2,
    id: "000456",
    title: "นางสาว",
    firstName: "ศิริพร",
    lastName: "สิทธิการ",
    position: "Officer 1, Procurement",
    department: "Procurement Department",
    batch: "รุ่นที่ 1 (ช่วงเช้า 09:00 - 12:00 น.)",
    timestamp: "08/09/2569 10:22:45"
  },
  {
    no: 3,
    id: "000462",
    title: "นางสาว",
    firstName: "สุมิตรา",
    lastName: "สาทอง",
    position: "Officer 1, Accounting",
    department: "Accounting Department",
    batch: "รุ่นที่ 2 (ช่วงบ่าย 13:00 - 16:00 น.)",
    timestamp: "08/09/2569 11:05:10"
  }
];

function loadStoredAttendees() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("localStorage read failed:", e);
  }
  return [...DEFAULT_ATTENDEES];
}

let allAttendees = loadStoredAttendees();

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Fetch employees.json if DEMO_EMPLOYEES wasn't present or empty
  if (!employeeDatabase || employeeDatabase.length === 0) {
    fetch('employees.json')
      .then(res => res.json())
      .then(data => {
        employeeDatabase = data;
        console.log("Loaded " + employeeDatabase.length + " employees from employees.json");
      })
      .catch(err => console.log("Using embedded employee data"));
  }

  renderAttendees(allAttendees);

  // Close search dropdown on click outside
  document.addEventListener('click', (e) => {
    const input = document.getElementById('empSearchInput');
    const results = document.getElementById('searchResults');
    if (input && results && !input.contains(e.target) && !results.contains(e.target)) {
      results.classList.add('hidden');
    }
  });
});

// Tab Switching
function switchTab(tab) {
  const tabReg = document.getElementById('tabRegister');
  const tabList = document.getElementById('tabList');
  const btnReg = document.getElementById('tabRegisterBtn');
  const btnList = document.getElementById('tabListBtn');

  if (tab === 'register') {
    tabReg.classList.remove('hidden');
    tabList.classList.add('hidden');
    btnReg.className = "flex-1 pb-3 text-center font-bold text-sm text-blue-600 border-b-2 border-blue-600 transition-all flex items-center justify-center space-x-2";
    btnList.className = "flex-1 pb-3 text-center font-medium text-sm text-slate-500 hover:text-slate-800 transition-all flex items-center justify-center space-x-2";
  } else {
    tabReg.classList.add('hidden');
    tabList.classList.remove('hidden');
    btnList.className = "flex-1 pb-3 text-center font-bold text-sm text-blue-600 border-b-2 border-blue-600 transition-all flex items-center justify-center space-x-2";
    btnReg.className = "flex-1 pb-3 text-center font-medium text-sm text-slate-500 hover:text-slate-800 transition-all flex items-center justify-center space-x-2";
    renderAttendees(allAttendees);
  }
}

// Search Employee with Instant Dropdown
function searchEmployee(query) {
  const container = document.getElementById('searchResults');
  if (!query || query.trim().length < 1) {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }

  const q = query.toLowerCase().trim();
  const matches = employeeDatabase.filter(emp => {
    const empId = (emp.id || '').toString().toLowerCase();
    const first = (emp.firstName || '').toLowerCase();
    const last = (emp.lastName || '').toLowerCase();
    const full = ((emp.title || '') + first + last).toLowerCase();
    const fullSpace = (first + ' ' + last).toLowerCase();
    const pos = (emp.position || '').toLowerCase();
    const dept = (emp.department || '').toLowerCase();

    return empId.includes(q) || first.includes(q) || last.includes(q) || full.includes(q) || fullSpace.includes(q) || pos.includes(q) || dept.includes(q);
  }).slice(0, 10);

  if (matches.length === 0) {
    container.innerHTML = '<div class="p-3 text-xs text-slate-400 text-center">ไม่พบข้อมูลพนักงานที่ตรงกับคำค้นหา</div>';
    container.classList.remove('hidden');
    return;
  }

  container.innerHTML = matches.map(emp => {
    const name = (emp.title || '') + ' ' + (emp.firstName || '') + ' ' + (emp.lastName || '');
    const deptInfo = (emp.position || '-') + ' • ' + (emp.department || '-');
    return '<div onclick="selectEmployee(\'' + emp.id + '\')" class="p-3 hover:bg-blue-50/80 cursor-pointer transition-all flex items-center justify-between border-b border-slate-100 last:border-b-0">' +
      '<div>' +
        '<div class="text-xs font-bold text-slate-900">' + name + ' <span class="text-blue-600 font-semibold font-mono">(' + emp.id + ')</span></div>' +
        '<div class="text-[11px] text-slate-500">' + deptInfo + '</div>' +
      '</div>' +
      '<span class="text-xs text-blue-600 font-medium px-2 py-1 bg-blue-50 rounded-lg hover:bg-blue-100">เลือก ➜</span>' +
    '</div>';
  }).join('');

  container.classList.remove('hidden');
}

// Select Employee from Dropdown
function selectEmployee(empId) {
  const emp = employeeDatabase.find(e => e.id.toString() === empId.toString());
  if (!emp) return;

  const fullName = (emp.title || '') + ' ' + (emp.firstName || '') + ' ' + (emp.lastName || '');
  document.getElementById('empSearchInput').value = emp.id + ' - ' + fullName;
  document.getElementById('searchResults').classList.add('hidden');

  // Populate preview card
  document.getElementById('dispEmpId').textContent = emp.id;
  document.getElementById('dispEmpName').textContent = fullName;
  document.getElementById('dispEmpPosition').textContent = emp.position || '-';
  document.getElementById('dispEmpDept').textContent = emp.department || '-';

  // Set hidden form inputs
  document.getElementById('empId').value = emp.id;
  document.getElementById('empTitle').value = emp.title || '';
  document.getElementById('empFirstName').value = emp.firstName || '';
  document.getElementById('empLastName').value = emp.lastName || '';
  document.getElementById('empPosition').value = emp.position || '';
  document.getElementById('empDepartment').value = emp.department || '';

  document.getElementById('empDetailsCard').classList.remove('hidden');
}

// Form Submission
function handleRegistration(event) {
  event.preventDefault();

  const empId = document.getElementById('empId').value;
  if (!empId) {
    if (window.HrdModal) HrdModal.warning('กรุณาพิมพ์ค้นหาและคลิกเลือกรายชื่อพนักงานจากดรอปดาวน์ก่อนค่ะ', 'ยังไม่ได้เลือกพนักงาน');
    else alert('กรุณาพิมพ์ค้นหาและคลิกเลือกรายชื่อพนักงานจากดรอปดาวน์ก่อนค่ะ');
    return;
  }

  const batch = document.getElementById('batchSelect').value;
  if (!batch) {
    if (window.HrdModal) HrdModal.warning('กรุณาเลือกรุ่นที่ต้องการเข้าอบรมค่ะ', 'ยังไม่ได้เลือกรุ่น');
    else alert('กรุณาเลือกรุ่นที่ต้องการเข้าอบรมค่ะ');
    return;
  }

  // Duplicate Check
  const isDuplicate = allAttendees.some(a => a.id.toString() === empId.toString());
  if (isDuplicate) {
    if (window.HrdModal) HrdModal.warning('รหัสพนักงาน ' + empId + ' ได้ลงทะเบียนหลักสูตรนี้ไปเรียบร้อยแล้วค่ะ\nท่านสามารถตรวจสอบรายชื่อได้ที่แท็บ "ตรวจสอบรายชื่อผู้ลงทะเบียน" ค่ะ', 'ลงทะเบียนไปแล้ว');
    else alert('⚠️ แจ้งเตือน: รหัสพนักงาน ' + empId + ' ได้ลงทะเบียนหลักสูตรนี้ไปเรียบร้อยแล้วค่ะ\n\nท่านสามารถตรวจสอบรายชื่อได้ที่แท็บ "ตรวจสอบรายชื่อผู้ลงทะเบียน" ค่ะ');
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  const btnText = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');

  submitBtn.disabled = true;
  btnText.textContent = 'กำลังบันทึกข้อมูลลงระบบ...';
  btnSpinner.classList.remove('hidden');

  setTimeout(() => {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const thaiYear = now.getFullYear() + 543;
    const timeStr = pad(now.getDate()) + '/' + pad(now.getMonth() + 1) + '/' + thaiYear + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());

    const title = document.getElementById('empTitle').value;
    const firstName = document.getElementById('empFirstName').value;
    const lastName = document.getElementById('empLastName').value;
    const position = document.getElementById('empPosition').value;
    const department = document.getElementById('empDepartment').value;

    const newRecord = {
      no: allAttendees.length + 1,
      id: empId,
      title: title,
      firstName: firstName,
      lastName: lastName,
      position: position,
      department: department,
      batch: batch,
      timestamp: timeStr
    };

    allAttendees.push(newRecord);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allAttendees));
    } catch (e) {
      console.warn("Save to localStorage failed:", e);
    }

    submitBtn.disabled = false;
    btnText.textContent = 'ยืนยันการลงทะเบียนจองที่นั่ง';
    btnSpinner.classList.add('hidden');

    const displayName = (title ? title + ' ' : '') + firstName + ' ' + lastName;
    if (window.HrdModal) {
      HrdModal.success('ลำดับที่: ' + newRecord.no + '\nรหัสพนักงาน: ' + newRecord.id + '\nชื่อ-นามสกุล: ' + displayName + '\nรุ่นที่เลือก: ' + newRecord.batch + '\nเวลาที่บันทึก: ' + newRecord.timestamp, 'ลงทะเบียนสำเร็จ 🎉');
    } else {
      alert('🎉 ลงทะเบียนสำเร็จเรียบร้อยแล้วค่ะ!\n\nลำดับที่: ' + newRecord.no + '\nรหัสพนักงาน: ' + newRecord.id + '\nชื่อ-นามสกุล: ' + displayName + '\nรุ่นที่เลือก: ' + newRecord.batch + '\nเวลาที่บันทึก: ' + newRecord.timestamp + '\n\nข้อมูลได้รับการบันทึกลงสู่ตารางรายชื่อเรียบร้อยแล้วค่ะ');
    }

    document.getElementById('regForm').reset();
    document.getElementById('empId').value = '';
    document.getElementById('empDetailsCard').classList.add('hidden');

    // Switch to Attendee List
    switchTab('list');
  }, 600);
}

// Render Attendees Table
function renderAttendees(list) {
  const tbody = document.getElementById('attendeeTableBody');
  const data = list || allAttendees;

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-slate-400">ยังไม่มีผู้ลงทะเบียนในหลักสูตรนี้</td></tr>';
    return;
  }

  tbody.innerHTML = data.map((att, idx) => {
    const name = (att.title ? att.title + ' ' : '') + (att.firstName || '') + ' ' + (att.lastName || '');
    const deptInfo = (att.position || '-') + ' <span class="text-slate-400">(' + (att.department || '-') + ')</span>';
    return '<tr class="hover:bg-slate-50 transition-all">' +
      '<td class="py-2.5 px-3 font-semibold text-slate-500">' + (att.no || (idx + 1)) + '</td>' +
      '<td class="py-2.5 px-3 font-mono font-bold text-blue-600">' + (att.id || '-') + '</td>' +
      '<td class="py-2.5 px-3 font-medium text-slate-900">' + name + '</td>' +
      '<td class="py-2.5 px-3 text-slate-600">' + deptInfo + '</td>' +
      '<td class="py-2.5 px-3"><span class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[11px] font-medium">' + (att.batch || '-') + '</span></td>' +
      '<td class="py-2.5 px-3 text-slate-400 text-[11px]">' + (att.timestamp || '-') + '</td>' +
    '</tr>';
  }).join('');
}

// Filter Attendees in Table
function filterAttendees(q) {
  if (!q || !q.trim()) {
    renderAttendees(allAttendees);
    return;
  }
  const term = q.toLowerCase().trim();
  const filtered = allAttendees.filter(a => {
    const id = (a.id || '').toLowerCase();
    const first = (a.firstName || '').toLowerCase();
    const last = (a.lastName || '').toLowerCase();
    const name = ((a.title || '') + first + last).toLowerCase();
    const pos = (a.position || '').toLowerCase();
    const dept = (a.department || '').toLowerCase();
    const batch = (a.batch || '').toLowerCase();

    return id.includes(term) || first.includes(term) || last.includes(term) || name.includes(term) || pos.includes(term) || dept.includes(term) || batch.includes(term);
  });
  renderAttendees(filtered);
}
