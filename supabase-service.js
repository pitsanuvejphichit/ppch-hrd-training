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
  /**
   * แปลงข้อมูลหลักสูตรจาก Database (snake_case) เป็น Object ในระบบ (camelCase)
   */
  function formatCourseFromDb(row) {
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      speaker: row.speaker || '',
      date: row.date || '',
      time: row.time || '',
      planType: row.plan_type || '',
      category: row.category || '',
      type: row.type || '',
      batches: Array.isArray(row.batches) ? row.batches : [],
      quota: row.quota || {},
      batchDetails: Array.isArray(row.batch_details) ? row.batch_details : [],
      targetAudience: row.target_audience || { type: 'all', summary: 'เปิดรับบุคลากรทุกแผนกและทุกตำแหน่ง' },
      hasSubTopics: Boolean(row.has_sub_topics),
      topicMode: row.topic_mode || 'all',
      topics: Array.isArray(row.topics) ? row.topics : [],
      driveFolderName: row.drive_folder_name || '',
      folderUrl: row.folder_url || '',
      sheetId: row.sheet_id || '',
      sheetUrl: row.sheet_url || '',
      masterSheetUrl: row.master_sheet_url || '',
      status: row.status || 'active',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * ดึงหลักสูตรทั้งหมดจาก Supabase (สปีด 0.05 - 0.1 วิ)
   */
  async function getAllCourses() {
    const sb = getClient();
    if (!sb) return null;

    try {
      const { data, error } = await sb
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[SupabaseService] Fetch courses error:', error);
        return null;
      }

      return (data || []).map(formatCourseFromDb);
    } catch (err) {
      console.warn('[SupabaseService] getAllCourses failed:', err);
      return null;
    }
  }

  /**
   * ดึงหลักสูตรเดี่ยวตาม ID จาก Supabase
   */
  async function getCourseById(courseId) {
    const sb = getClient();
    if (!sb || !courseId) return null;

    try {
      const { data, error } = await sb
        .from('courses')
        .select('*')
        .eq('id', String(courseId).trim())
        .single();

      if (error) {
        console.warn('[SupabaseService] getCourseById error:', error);
        return null;
      }

      return formatCourseFromDb(data);
    } catch (err) {
      console.warn('[SupabaseService] getCourseById failed:', err);
      return null;
    }
  }

  /**
   * บันทึกหรืออัปเดตหลักสูตรลง Supabase ทันที (สปีด 0.08 วิ)
   */
  async function saveCourse(c) {
    const sb = getClient();
    if (!sb || !c || !c.id) {
      throw new Error('Course ID or Supabase client missing');
    }

    const payload = {
      id: String(c.id).trim(),
      title: c.title || '',
      speaker: c.speaker || '',
      date: c.date || '',
      time: c.time || '',
      plan_type: c.planType || '',
      category: c.category || '',
      type: c.type || '',
      batches: c.batches || [],
      quota: c.quota || {},
      batch_details: c.batchDetails || [],
      target_audience: c.targetAudience || { type: 'all', summary: 'เปิดรับบุคลากรทุกแผนกและทุกตำแหน่ง' },
      has_sub_topics: Boolean(c.hasSubTopics),
      topic_mode: c.topicMode || 'all',
      topics: c.topics || [],
      drive_folder_name: c.driveFolderName || c.title || '',
      folder_url: c.folderUrl || '',
      sheet_id: c.sheetId || '',
      sheet_url: c.sheetUrl || '',
      master_sheet_url: c.masterSheetUrl || '',
      status: c.status || 'active',
      updated_at: new Date().toISOString()
    };

    const { data, error } = await sb
      .from('courses')
      .upsert([payload], { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[SupabaseService] saveCourse error:', error);
      throw error;
    }

    return formatCourseFromDb(data);
  }

  /**
   * อัปเดตกลุ่มเป้าหมาย (Target Audience) ลง Supabase โดยตรง (สปีด 0.08 วิ)
   */
  async function updateCourseTarget(courseId, targetAudience) {
    const sb = getClient();
    if (!sb || !courseId) return false;

    try {
      const { data, error } = await sb
        .from('courses')
        .update({
          target_audience: targetAudience,
          updated_at: new Date().toISOString()
        })
        .eq('id', String(courseId).trim())
        .select('id, target_audience')
        .single();

      if (error) {
        console.error('[SupabaseService] updateCourseTarget error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[SupabaseService] updateCourseTarget failed:', err);
      return false;
    }
  }

  /**
   * ลบหลักสูตรจาก Supabase
   */
  async function deleteCourse(courseId) {
    const sb = getClient();
    if (!sb || !courseId) return false;

    try {
      const { error } = await sb
        .from('courses')
        .delete()
        .eq('id', String(courseId).trim());

      if (error) {
        console.error('[SupabaseService] deleteCourse error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[SupabaseService] deleteCourse failed:', err);
      return false;
    }
  }

  /**
   * บันทึกการประเมินผลการอบรม (Evaluation) ลง Supabase
   */
  async function saveEvaluation(evalData) {
    const sb = getClient();
    if (!sb || !evalData) return null;

    try {
      const { data, error } = await sb
        .from('evaluations')
        .insert([{
          course_id: String(evalData.courseId || evalData.course_id || ''),
          emp_id: String(evalData.empId || evalData.emp_id || ''),
          full_name: evalData.fullName || evalData.full_name || '',
          scores: evalData.scores || {},
          suggestions: evalData.suggestions || '',
          submitted_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch(err) {
      console.warn('[SupabaseService] saveEvaluation notice:', err);
      return null;
    }
  }

  /**
   * บันทึกการเช็คชื่อหน้างาน (Check-in) ลง Supabase
   */
  async function saveCheckin(checkinData) {
    const sb = getClient();
    if (!sb || !checkinData) return null;

    try {
      const { data, error } = await sb
        .from('checkins')
        .insert([{
          course_id: String(checkinData.courseId || checkinData.course_id || ''),
          emp_id: String(checkinData.empId || checkinData.emp_id || ''),
          full_name: checkinData.fullName || checkinData.full_name || '',
          department: checkinData.department || '',
          batch: checkinData.batch || '',
          checked_in_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch(err) {
      console.warn('[SupabaseService] saveCheckin notice:', err);
      return null;
    }
  }

  return {
    getClient,
    isEnabled,
    getAllCourses,
    getCourseById,
    saveCourse,
    updateCourseTarget,
    deleteCourse,
    registerAttendee,
    getAttendeesByCourse,
    deleteAttendee,
    mergeAttendees,
    markSynced,
    archiveOldRegistrations,
    saveEvaluation,
    saveCheckin,
    DEFAULT_SUPABASE_URL,
    DEFAULT_SUPABASE_KEY
  };
})();

if (typeof window !== 'undefined') {
  window.SupabaseService = SupabaseService;
}
