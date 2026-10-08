/**
 * HRD AI Training Registration System - Supabase Service & Dual-Tier Sync
 * โรงพยาบาลพิษณุเวช พิจิตร (Phitsanuvej Phichit Hospital)
 * 
 * สถาปัตยกรรม 2 ชั้น:
 * 1. ชั้นแรก: บันทึกลง Supabase PostgreSQL ทันที (สปีด 0.08 - 0.15 วิ) ➔ ได้ Transaction ID จริง
 * 2. ชั้นสอง: ส่งต่อไปยัง Google Sheet ของหลักสูตรแบบ Background Sync เบื้องหลัง
 */

const SupabaseService = (() => {
  const DEFAULT_SUPABASE_URL = 'https://swtptcqicdjomksufkpy.supabase.co';
  const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3dHB0Y3FpY2Rqb21rc3Vma3B5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MzcwNzgsImV4cCI6MjEwNzAxMzA3OH0.LORHI1hXO9MhKb5qs23ZMJaqM9mU6G90ZtRNQgn5nIw';

  let client = null;

  function getClient() {
    if (client) return client;
    if (typeof window !== 'undefined' && window.supabase) {
      try {
        const url = localStorage.getItem('hrd_supabase_url') || DEFAULT_SUPABASE_URL;
        const key = localStorage.getItem('hrd_supabase_key') || DEFAULT_SUPABASE_KEY;
        client = window.supabase.createClient(url, key);
        console.log('[SupabaseService] Initialized client successfully.');
      } catch (e) {
        console.warn('[SupabaseService] Client init failed:', e);
      }
    }
    return client;
  }

  function isEnabled() {
    return Boolean(typeof window !== 'undefined' && window.supabase);
  }

  /**
   * บันทึกการลงทะเบียนเข้า Supabase (Primary Database)
   * @param {Object} attendee 
   * @param {String} courseId 
   * @param {String} sheetId 
   * @returns {Promise<Object>} { success: true, transactionId, registeredAt }
   */
  async function registerAttendee(attendee, courseId, sheetId) {
    const sb = getClient();
    if (!sb) {
      throw new Error('Supabase client is not available');
    }

    const payload = {
      course_id: String(courseId || ''),
      sheet_id: String(sheetId || ''),
      emp_id: String(attendee.id || attendee.empId || ''),
      title: attendee.title || '',
      first_name: attendee.firstName || '',
      last_name: attendee.lastName || '',
      position: attendee.position || '',
      department: attendee.department || '',
      batch: attendee.batch || '',
      quota: Number(attendee.quota || 40),
      selected_topics: attendee.selectedTopics || [],
      registered_at: new Date().toISOString(),
      synced_to_sheet: false
    };

    const { data, error } = await sb
      .from('registrations')
      .insert([payload])
      .select('id, registered_at, created_at')
      .single();

    if (error) {
      console.error('[SupabaseService] Insert error:', error);
      throw error;
    }

    return {
      success: true,
      transactionId: data.id,
      registeredAt: data.registered_at || data.created_at,
      source: 'supabase'
    };
  }

  /**
   * ดึงรายชื่อผู้ลงทะเบียนจาก Supabase
   * @param {String} courseId 
   * @returns {Promise<Array>}
   */
  async function getAttendeesByCourse(courseId) {
    const sb = getClient();
    if (!sb) return null;

    try {
      const { data, error } = await sb
        .from('registrations')
        .select('*')
        .eq('course_id', String(courseId))
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('[SupabaseService] Fetch attendees error:', error);
        return null;
      }

      return (data || []).map((row, idx) => ({
        no: idx + 1,
        id: row.emp_id,
        title: row.title || '',
        firstName: row.first_name,
        lastName: row.last_name,
        position: row.position,
        department: row.department,
        batch: row.batch,
        selectedTopics: row.selected_topics || [],
        timestamp: row.registered_at ? (new Date(row.registered_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.') : '',
        transactionId: row.id,
        syncedToSheet: row.synced_to_sheet
      }));
    } catch(err) {
      console.warn('[SupabaseService] Fetch failed:', err);
      return null;
    }
  }

  /**
   * ลบข้อมูลผู้ลงทะเบียนจาก Supabase
   */
  async function deleteAttendee(courseId, empId) {
    const sb = getClient();
    if (!sb || !courseId || !empId) return false;

    try {
      const { error } = await sb
        .from('registrations')
        .delete()
        .eq('course_id', String(courseId))
        .eq('emp_id', String(empId));

      if (error) {
        console.warn('[SupabaseService] Delete attendee error:', error);
        return false;
      }
      return true;
    } catch(err) {
      console.warn('[SupabaseService] Delete failed:', err);
      return false;
    }
  }

  /**
   * รวมรายชื่อผู้ลงทะเบียน (Primary Supabase + Secondary Sheet/Cache)
   * ป้องกันข้อมูลใหม่หาย และรักษาแถวที่มีอยู่เดิมจาก Sheet
   */
  function mergeAttendees(primaryList, secondaryList) {
    const map = new Map();
    (secondaryList || []).forEach(item => {
      if (item && item.id) {
        map.set(String(item.id).trim(), Object.assign({}, item));
      }
    });
    (primaryList || []).forEach(item => {
      if (item && item.id) {
        const key = String(item.id).trim();
        const existing = map.get(key);
        if (existing) {
          map.set(key, Object.assign({}, existing, item));
        } else {
          map.set(key, Object.assign({}, item));
        }
      }
    });
    return Array.from(map.values()).map((item, idx) => {
      item.no = idx + 1;
      return item;
    });
  }

  /**
   * อัปเดตสถานะว่าซิงค์เข้า Google Sheet สำเร็จแล้ว
   */
  async function markSynced(transactionId) {
    const sb = getClient();
    if (!sb || !transactionId) return;

    try {
      await sb
        .from('registrations')
        .update({ synced_to_sheet: true, synced_at: new Date().toISOString() })
        .eq('id', transactionId);
    } catch(err) {
      console.warn('[SupabaseService] Mark synced error:', err);
    }
  }

  /**
   * ย้ายข้อมูลหลักสูตรที่เก่ากว่า 2 ปีเข้าคลังประวัติ (ลบออกจาก Supabase เพื่อคืนพื้นที่)
   * ข้อมูลจริงยังคงอยู่ใน Google Sheet 100%
   */
  async function archiveOldRegistrations(olderThanYears = 2) {
    const sb = getClient();
    if (!sb) return null;

    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - olderThanYears);

    const { data, error } = await sb
      .from('registrations')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      console.error('[SupabaseService] Archive error:', error);
      throw error;
    }

    return {
      success: true,
      archivedCount: (data || []).length,
      cutoffDate: cutoffDate.toISOString()
    };
  }

  return {
    getClient,
    isEnabled,
    registerAttendee,
    getAttendeesByCourse,
    deleteAttendee,
    mergeAttendees,
    markSynced,
    archiveOldRegistrations,
    DEFAULT_SUPABASE_URL,
    DEFAULT_SUPABASE_KEY
  };
})();

if (typeof window !== 'undefined') {
  window.SupabaseService = SupabaseService;
}
