/**
 * ==============================================================================
 * COMMUNITY ANIMATION HUB: Supabase API Client & Realtime Manager
 * File: src/js/api/supabase.js
 * ==============================================================================
 */

import { CONFIG } from '../config.js';

let supabaseClient = null;

/**
 * Initialize or get existing Supabase Client
 */
export function getSupabase() {
  if (supabaseClient) return supabaseClient;

  if (window.supabase && typeof window.supabase.createClient === 'function') {
    // Only initialize real client if configured
    if (CONFIG.SUPABASE.URL && !CONFIG.SUPABASE.URL.includes('YOUR_SUPABASE')) {
      supabaseClient = window.supabase.createClient(
        CONFIG.SUPABASE.URL,
        CONFIG.SUPABASE.ANON_KEY
      );
      return supabaseClient;
    }
  }

  // Fallback / Mock client if Supabase is not yet configured
  console.info('[Supabase] Menggunakan mock/local fallback client (kredensial belum diisi).');
  return createMockSupabase();
}

/**
 * Subscribe to realtime changes on a specific table
 */
export function subscribeTable(table, onInsert, onUpdate, onDelete) {
  const sb = getSupabase();
  if (!sb || !sb.channel) {
    console.warn('[Supabase Realtime] Tidak tersedia di environment ini.');
    return null;
  }

  const channel = sb
    .channel(`public:${table}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table }, payload => {
      if (onInsert) onInsert(payload.new);
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table }, payload => {
      if (onUpdate) onUpdate(payload.new, payload.old);
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table }, payload => {
      if (onDelete) onDelete(payload.old);
    })
    .subscribe();

  return channel;
}

/**
 * Mock Client Provider for Instant Local Testing without API Keys
 */
function createMockSupabase() {
  // Read/write from memory & localStorage
  const MOCK_STORAGE_KEY = 'cah_mock_db_';
  
  const getTableData = (table) => {
    try {
      const data = localStorage.getItem(MOCK_STORAGE_KEY + table);
      return data ? JSON.parse(data) : getDefaultMockData(table);
    } catch {
      return getDefaultMockData(table);
    }
  };

  const saveTableData = (table, items) => {
    try {
      localStorage.setItem(MOCK_STORAGE_KEY + table, JSON.stringify(items));
    } catch (e) {
      console.error(e);
    }
  };

  return {
    from(table) {
      return {
        async select(columns = '*') {
          const items = getTableData(table);
          return { data: items, error: null };
        },
        async insert(records) {
          const items = getTableData(table);
          const toAdd = Array.isArray(records) ? records : [records];
          const newRecords = toAdd.map(r => ({
            id: r.id || 'mock_' + Math.random().toString(36).substr(2, 9),
            created_at: new Date().toISOString(),
            ...r
          }));
          const updated = [...items, ...newRecords];
          saveTableData(table, updated);
          return { data: newRecords, error: null };
        },
        async update(updates) {
          return {
            eq(col, val) {
              const items = getTableData(table);
              const updated = items.map(item => item[col] === val ? { ...item, ...updates } : item);
              saveTableData(table, updated);
              return Promise.resolve({ data: updated, error: null });
            }
          };
        },
        async delete() {
          return {
            match(matchObj) {
              const items = getTableData(table);
              const updated = items.filter(item => {
                for (const [k, v] of Object.entries(matchObj)) {
                  if (item[k] !== v) return true;
                }
                return false;
              });
              saveTableData(table, updated);
              return Promise.resolve({ data: updated, error: null });
            }
          };
        }
      };
    },
    channel() {
      return {
        on() { return this; },
        subscribe() { return this; },
        unsubscribe() {}
      };
    }
  };
}

/**
 * Initial Default Mock Data for Instant Preview
 */
function getDefaultMockData(table) {
  if (table === 'projects') {
    return [
      {
        id: 'proj-1',
        slug: 'cyber-samurai-2026',
        title: 'Cyber Samurai 2026 (Short Film)',
        description: 'Animasi laga cyberpunk 3 menit bertema pendekar masa depan.',
        status: 'animating',
        cover_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
        coordinator_name: 'Erik Kurniawan',
        created_at: new Date(Date.now() - 86400000 * 5).toISOString()
      },
      {
        id: 'proj-2',
        slug: 'kancil-reborn-series',
        title: 'Kancil Reborn: The Forest Sentinel',
        description: 'Proyek serial animasi fabel Indonesia dengan sentuhan mecha & fantasy.',
        status: 'storyboard',
        cover_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
        coordinator_name: 'Dimas Pratama',
        created_at: new Date(Date.now() - 86400000 * 12).toISOString()
      },
      {
        id: 'proj-3',
        slug: 'warteg-space-odyssey',
        title: 'Warteg Space Odyssey',
        description: 'Animasi komedi sci-fi tentang warung tegal yang tersasar di galaksi Andromeda.',
        status: 'render',
        cover_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
        coordinator_name: 'Budi Santoso',
        created_at: new Date(Date.now() - 86400000 * 20).toISOString()
      }
    ];
  }

  if (table === 'scenes') {
    return [
      { id: 'sc-1', project_id: 'proj-1', scene_no: 1, title: 'Scene 1: Rooftop Ambush', assignee: 'Rian (Animator)', is_done: true, notes: 'Keyframing selesai' },
      { id: 'sc-2', project_id: 'proj-1', scene_no: 2, title: 'Scene 2: Katana Clash Action', assignee: 'Bayu (Lead Animator)', is_done: true, notes: 'Sudah approved' },
      { id: 'sc-3', project_id: 'proj-1', scene_no: 3, title: 'Scene 3: Drone Chase Sequence', assignee: 'Rian (Animator)', is_done: false, notes: 'In-betweening' },
      { id: 'sc-4', project_id: 'proj-1', scene_no: 4, title: 'Scene 4: Final Smoke Escape', assignee: 'Unassigned', is_done: false, notes: 'Butuh bantuan rig' }
    ];
  }

  if (table === 'idea_votes') {
    return [
      { id: 'v-1', idea_id: 'IDEA-01', voter_id: 'mock_user_1' },
      { id: 'v-2', idea_id: 'IDEA-01', voter_id: 'mock_user_2' },
      { id: 'v-3', idea_id: 'IDEA-02', voter_id: 'mock_user_1' }
    ];
  }

  if (table === 'render_requests') {
    return [
      {
        id: 'rr-1',
        project_id: 'proj-1',
        scene_id: 'sc-3',
        scene_title: 'Scene 3: Drone Chase Sequence',
        specs: 'Blender 4.2 Cycles GPU (Min RTX 3060), 1080p 60fps',
        status: 'open',
        claimed_by: null,
        created_at: new Date().toISOString()
      }
    ];
  }

  return [];
}
