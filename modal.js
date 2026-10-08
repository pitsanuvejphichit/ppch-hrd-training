/**
 * ============================================================================
 * HRD AI - Custom Branded Modal & Toast Popup System
 * โรงพยาบาลพิษณุเวช • Project 02: ระบบเว็บลงทะเบียนเข้าอบรม
 * ============================================================================
 * แทนที่ Browser Alert / Confirm / Prompt ด้วย Modal สวยงามตาม CI โรงพยาบาล
 */

(function() {
  'use strict';

  // SVG Icons
  const ICONS = {
    success: `
      <div class="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shadow-inner mx-auto mb-4">
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>`,
    warning: `
      <div class="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shadow-inner mx-auto mb-4">
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
      </div>`,
    error: `
      <div class="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center shadow-inner mx-auto mb-4">
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </div>`,
    info: `
      <div class="w-14 h-14 rounded-2xl bg-[#f0f6fa] border border-[#cfe2f3] text-[#2e5e8b] flex items-center justify-center shadow-inner mx-auto mb-4">
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      </div>`,
    question: `
      <div class="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 flex items-center justify-center shadow-inner mx-auto mb-4">
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      </div>`,
    delete: `
      <div class="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-inner mx-auto mb-4">
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
        </svg>
      </div>`
  };

  function ensureElements() {
    let backdrop = document.getElementById('hrdModalBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'hrdModalBackdrop';
      backdrop.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 opacity-0 pointer-events-none transition-all duration-200 ease-out font-sans';
      backdrop.innerHTML = `
        <div id="hrdModalCard" class="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 transform scale-95 transition-all duration-200 ease-out text-center relative max-h-[90vh] overflow-y-auto">
          <button id="hrdModalCloseBtn" class="absolute top-4 right-4 w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center text-sm transition-all cursor-pointer">✕</button>
          <div id="hrdModalIcon"></div>
          <h3 id="hrdModalTitle" class="text-base sm:text-lg font-bold text-slate-800 tracking-tight leading-snug mb-2"></h3>
          <div id="hrdModalBody" class="text-xs sm:text-sm text-slate-600 font-light leading-relaxed mb-6 space-y-2"></div>
          <div id="hrdModalInputContainer" class="hidden mb-5 text-left">
            <label id="hrdModalInputLabel" class="block text-xs font-semibold text-slate-600 mb-1.5"></label>
            <input type="text" id="hrdModalInput" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2e5e8b]/20 focus:border-[#2e5e8b] transition-all bg-slate-50/50">
          </div>
          <div id="hrdModalActions" class="flex items-center justify-center gap-2.5 pt-1">
            <button id="hrdModalCancelBtn" class="hidden flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer">ยกเลิก</button>
            <button id="hrdModalConfirmBtn" class="flex-1 py-2.5 px-5 bg-gradient-to-r from-[#2e5e8b] to-[#5facde] hover:from-[#23496d] hover:to-[#489ad0] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer">ตกลง</button>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);
    }

    let toastContainer = document.getElementById('hrdToastContainer');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'hrdToastContainer';
      toastContainer.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[100000] flex flex-col items-center space-y-2 pointer-events-none w-full max-w-sm px-4';
      document.body.appendChild(toastContainer);
    }
  }

  function parseMessage(text) {
    if (typeof text !== 'string') return { title: '', body: String(text || '') };
    
    let trimmed = text.trim();
    let autoType = null;

    if (trimmed.startsWith('🎉') || trimmed.includes('สำเร็จ')) {
      autoType = 'success';
    } else if (trimmed.startsWith('⚠️') || trimmed.includes('ขออภัย') || trimmed.includes('คำเตือน') || trimmed.includes('เต็มโควตา')) {
      autoType = 'warning';
    } else if (trimmed.includes('ผิดพลาด') || trimmed.includes('ไม่สามารถ') || trimmed.startsWith('❌')) {
      autoType = 'error';
    }

    const parts = trimmed.split(/\n\s*\n|\n/);
    if (parts.length > 1) {
      const firstLine = parts[0].trim();
      const rest = parts.slice(1).join('\n').trim();
      return { title: firstLine, body: rest, autoType: autoType };
    }
    return { title: '', body: trimmed, autoType: autoType };
  }

  function formatBodyContent(bodyText) {
    if (!bodyText) return '';
    const lines = bodyText.split('\n');
    let html = '';
    let inCard = false;

    lines.forEach(line => {
      const l = line.trim();
      if (!l) return;

      const kvMatch = l.match(/^([^:：]{2,15})[:：]\s*(.+)$/);
      if (kvMatch) {
        if (!inCard) {
          html += '<div class="bg-slate-50/80 border border-slate-100 rounded-2xl p-3.5 my-2 space-y-1.5 text-left">';
          inCard = true;
        }
        html += `
          <div class="flex items-baseline justify-between text-xs gap-2">
            <span class="text-slate-400 font-light shrink-0">${kvMatch[1]}</span>
            <span class="text-slate-700 font-medium text-right">${kvMatch[2]}</span>
          </div>`;
      } else {
        if (inCard) {
          html += '</div>';
          inCard = false;
        }
        html += `<p class="text-xs sm:text-sm text-slate-600 font-light leading-relaxed">${l}</p>`;
      }
    });

    if (inCard) {
      html += '</div>';
    }
    return html;
  }

  const HrdModal = {
    show: function(opts) {
      ensureElements();
      opts = opts || {};

      return new Promise((resolve) => {
        const backdrop = document.getElementById('hrdModalBackdrop');
        const card = document.getElementById('hrdModalCard');
        const iconContainer = document.getElementById('hrdModalIcon');
        const titleEl = document.getElementById('hrdModalTitle');
        const bodyEl = document.getElementById('hrdModalBody');
        const inputContainer = document.getElementById('hrdModalInputContainer');
        const inputEl = document.getElementById('hrdModalInput');
        const inputLabel = document.getElementById('hrdModalInputLabel');
        const cancelBtn = document.getElementById('hrdModalCancelBtn');
        const confirmBtn = document.getElementById('hrdModalConfirmBtn');
        const closeBtn = document.getElementById('hrdModalCloseBtn');

        const type = opts.type || 'info';
        iconContainer.innerHTML = ICONS[type] || ICONS.info;

        const title = opts.title || (type === 'success' ? 'ดำเนินการสำเร็จ' : (type === 'warning' ? 'แจ้งเตือน' : (type === 'error' ? 'เกิดข้อผิดพลาด' : 'แจ้งเตือนจากระบบ')));
        titleEl.textContent = title;
        titleEl.className = 'text-base sm:text-lg font-bold tracking-tight leading-snug mb-2 ' + 
          (type === 'error' ? 'text-rose-700' : (type === 'warning' ? 'text-amber-800' : (type === 'success' ? 'text-emerald-800' : 'text-slate-800')));

        if (opts.html) {
          bodyEl.innerHTML = opts.html;
        } else if (opts.message) {
          bodyEl.innerHTML = formatBodyContent(opts.message);
        } else {
          bodyEl.innerHTML = '';
        }

        if (opts.input) {
          inputContainer.classList.remove('hidden');
          inputLabel.textContent = opts.inputLabel || 'ระบุข้อมูล:';
          inputEl.type = opts.inputType || 'text';
          inputEl.value = opts.inputValue || '';
          inputEl.placeholder = opts.inputPlaceholder || '';
        } else {
          inputContainer.classList.add('hidden');
          inputEl.value = '';
        }

        if (opts.showCancel) {
          cancelBtn.classList.remove('hidden');
          cancelBtn.textContent = opts.cancelText || 'ยกเลิก';
        } else {
          cancelBtn.classList.add('hidden');
        }

        confirmBtn.textContent = opts.confirmText || 'ตกลง';
        if (opts.danger) {
          confirmBtn.className = 'flex-1 py-2.5 px-5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer';
        } else {
          confirmBtn.className = 'flex-1 py-2.5 px-5 bg-gradient-to-r from-[#2e5e8b] to-[#5facde] hover:from-[#23496d] hover:to-[#489ad0] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer';
        }

        backdrop.classList.remove('opacity-0', 'pointer-events-none');
        backdrop.classList.add('opacity-100', 'pointer-events-auto');
        card.classList.remove('scale-95');
        card.classList.add('scale-100');

        if (opts.input) {
          setTimeout(() => {
            inputEl.focus();
            inputEl.select();
          }, 100);
        } else {
          confirmBtn.focus();
        }

        function cleanup() {
          backdrop.classList.remove('opacity-100', 'pointer-events-auto');
          backdrop.classList.add('opacity-0', 'pointer-events-none');
          card.classList.remove('scale-100');
          card.classList.add('scale-95');
          document.removeEventListener('keydown', onKeyDown);
        }

        function handleConfirm() {
          const val = opts.input ? inputEl.value : true;
          cleanup();
          resolve(val);
        }

        function handleCancel() {
          cleanup();
          resolve(opts.input ? null : false);
        }

        function onKeyDown(e) {
          if (e.key === 'Escape' && (opts.showCancel || !opts.input)) {
            handleCancel();
          } else if (e.key === 'Enter') {
            handleConfirm();
          }
        }

        confirmBtn.onclick = handleConfirm;
        cancelBtn.onclick = handleCancel;
        closeBtn.onclick = handleCancel;
        document.addEventListener('keydown', onKeyDown);
      });
    },

    alert: function(message, title, type) {
      let parsed = parseMessage(message);
      let finalTitle = title || parsed.title;
      let finalBody = parsed.title && !title ? parsed.body : message;
      let finalType = type || parsed.autoType || 'info';

      return this.show({
        type: finalType,
        title: finalTitle,
        message: finalBody,
        showCancel: false,
        confirmText: 'ตกลง'
      });
    },

    success: function(message, title) {
      return this.alert(message, title || 'ดำเนินการสำเร็จเรียบร้อยแล้วค่ะ', 'success');
    },

    warning: function(message, title) {
      return this.alert(message, title || 'แจ้งเตือนจากระบบ', 'warning');
    },

    error: function(message, title) {
      return this.alert(message, title || 'เกิดข้อผิดพลาด', 'error');
    },

    confirm: function(message, title, opts) {
      opts = opts || {};
      let parsed = parseMessage(message);
      return this.show({
        type: opts.type || (opts.danger ? 'delete' : 'question'),
        title: title || opts.title || (opts.danger ? 'ยืนยันการลบข้อมูล' : 'ยืนยันการทำรายการ'),
        message: message,
        showCancel: true,
        confirmText: opts.confirmText || (opts.danger ? 'ยืนยันลบ' : 'ตกลง'),
        cancelText: opts.cancelText || 'ยกเลิก',
        danger: opts.danger || false
      });
    },

    prompt: function(message, defaultValue, title, opts) {
      opts = opts || {};
      return this.show({
        type: opts.type || (opts.danger ? 'delete' : 'info'),
        title: title || opts.title || (opts.danger ? 'ยืนยันการลบข้อมูล' : 'ระบุข้อมูล'),
        message: message,
        input: true,
        inputValue: defaultValue || '',
        inputType: opts.inputType || 'text',
        inputPlaceholder: opts.placeholder || 'พิมพ์ที่นี่...',
        inputLabel: opts.label || '',
        showCancel: true,
        confirmText: opts.confirmText || (opts.danger ? 'ยืนยันลบข้อมูล' : 'ตกลง'),
        cancelText: opts.cancelText || 'ยกเลิก',
        danger: opts.danger || false
      });
    },

    toast: function(message, type, durationMs) {
      ensureElements();
      type = type || 'success';
      durationMs = durationMs || 2800;

      const container = document.getElementById('hrdToastContainer');
      const toast = document.createElement('div');
      
      let badgeIcon = '✨';
      let borderColor = 'border-slate-700/60';
      if (type === 'success') {
        badgeIcon = '✅';
        borderColor = 'border-emerald-500/40';
      } else if (type === 'warning') {
        badgeIcon = '⚠️';
        borderColor = 'border-amber-500/40';
      } else if (type === 'error') {
        badgeIcon = '❌';
        borderColor = 'border-rose-500/40';
      }

      toast.className = `bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border ${borderColor} flex items-center space-x-2.5 text-xs font-medium transform translate-y-4 opacity-0 transition-all duration-200 ease-out pointer-events-auto`;
      toast.innerHTML = `
        <span class="text-sm shrink-0">${badgeIcon}</span>
        <span class="leading-snug">${message}</span>
      `;

      container.appendChild(toast);

      requestAnimationFrame(() => {
        toast.classList.remove('translate-y-4', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
      });

      setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-2', 'opacity-0');
        setTimeout(() => {
          if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 250);
      }, durationMs);
    }
  };

  window.HrdModal = HrdModal;

  // Intercept standard alert
  const originalAlert = window.alert;
  window.alert = function(msg) {
    try {
      HrdModal.alert(msg);
    } catch(e) {
      originalAlert(msg);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureElements);
  } else {
    ensureElements();
  }

})();
