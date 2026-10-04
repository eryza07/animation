/**
 * ==============================================================================
 * COMMUNITY ANIMATION HUB: Google Sheets & Apps Script Client
 * File: src/js/api/sheets.js
 * ==============================================================================
 */

import { CONFIG } from '../config.js';
import { withCache } from '../utils/storage.js';

/**
 * Fetch records from a Google Sheet tab
 * @param {'Ideas'|'Challenges'|'Collab'|'Assets'|'Tutorials'|'Gallery'} tabName 
 */
export async function fetchSheetTab(tabName) {
  const cacheKey = `sheet_tab_${tabName}`;

  return withCache(cacheKey, async () => {
    // 1. If Apps Script Web App URL is configured
    if (CONFIG.APPS_SCRIPT.WEB_APP_URL && !CONFIG.APPS_SCRIPT.WEB_APP_URL.includes('YOUR_APPS_SCRIPT')) {
      try {
        const res = await fetch(`${CONFIG.APPS_SCRIPT.WEB_APP_URL}?tab=${encodeURIComponent(tabName)}`);
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.data)) {
          return json.data;
        }
      } catch (err) {
        console.warn(`[Sheets API] Gagal fetch tab ${tabName} via Apps Script:`, err);
      }
    }

    // 2. Fallback to Mock Data
    console.info(`[Sheets API] Menampilkan mock data untuk tab ${tabName}.`);
    return getMockSheetData(tabName);
  }, CONFIG.SHEETS.CACHE_TTL_MS);
}

/**
 * Post submission data to Google Apps Script Web App
 */
export async function submitToSheets(payload) {
  if (CONFIG.APPS_SCRIPT.WEB_APP_URL && !CONFIG.APPS_SCRIPT.WEB_APP_URL.includes('YOUR_APPS_SCRIPT')) {
    try {
      const response = await fetch(CONFIG.APPS_SCRIPT.WEB_APP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8' // avoids CORS preflight OPTIONS in Apps Script
        },
        body: JSON.stringify(payload)
      });
      return await response.json();
    } catch (err) {
      console.error('[Sheets API] Gagal mengirim data ke Apps Script:', err);
      return { status: 'error', message: err.message };
    }
  }

  // Mock submission fallback
  console.info('[Sheets API] Simulasi submit berhasil (Mock mode):', payload);
  const targetTab = payload.target_sheet || 'Ideas';
  const current = getMockSheetData(targetTab);
  
  const newItem = {
    ...payload,
    idea_id: payload.idea_id || 'IDEA-MOCK-' + Date.now(),
    post_id: payload.post_id || 'COL-MOCK-' + Date.now(),
    submitted_at: new Date().toISOString(),
    status: 'approved'
  };

  saveMockSheetData(targetTab, [newItem, ...current]);

  return {
    status: 'success',
    message: 'Data berhasil disubmit (Simulasi Mock Mode)!',
    data: newItem
  };
}

/**
 * Default Mock Data for Google Sheets
 */
function getMockSheetData(tab) {
  try {
    const stored = localStorage.getItem(`cah_mock_sheet_${tab}`);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.warn(e);
  }

  if (tab === 'Ideas') {
    return [
      {
        idea_id: 'IDEA-01',
        title: 'Animasi Pertarungan Mecha Reog Ponorogo',
        description: 'Konsep pendekar cybernetic yang mengendalikan robot mecha berbentuk Singa Barong melawan monster polusi kota.',
        author: 'Fajar Studio',
        category: 'Short Film',
        submitted_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        status: 'approved'
      },
      {
        idea_id: 'IDEA-02',
        title: 'Parodi Minecraft: Pedagang Keliling yang Sakti',
        description: 'Wandering trader yang selalu membawa lalat dan llama ternyata mantan agen rahasia dunia bawah Nether.',
        author: 'Rizky Animator',
        category: 'Meme/Parody',
        submitted_at: new Date(Date.now() - 86400000 * 4).toISOString(),
        status: 'approved'
      },
      {
        idea_id: 'IDEA-03',
        title: 'Kamera Sinematik 3D: Tutorial & Rigging Test',
        description: 'Eksperimen angle kamera dinamis ala Spider-Verse untuk adegan kejar-kejaran di jalanan Jakarta.',
        author: 'Erik Kurniawan',
        category: 'Technical Test',
        submitted_at: new Date(Date.now() - 86400000 * 6).toISOString(),
        status: 'approved'
      }
    ];
  }

  if (tab === 'Challenges') {
    return [
      {
        challenge_id: 'CHAL-OCT-2026',
        type: 'Monthly',
        title: 'Tantangan Animasi: "Cyber-Folklore Nusantara"',
        prompt: 'Buat scene animasi berdurasi 5-15 detik yang menggabungkan elemen mitologi lokal dengan teknologi masa depan!',
        start_date: '2026-10-01',
        end_date: '2026-10-31'
      }
    ];
  }

  if (tab === 'Collab') {
    return [
      {
        post_id: 'COL-01',
        project_slug: 'cyber-samurai-2026',
        role_needed: 'Rigger (Blender)',
        description: 'Mencari rigger untuk model robot musuh dengan 4 tangan (quad-arm). Rig sudah ada referensi humanoid.',
        contact: 'Discord: @erik_animator#1234',
        is_open: 'true'
      },
      {
        post_id: 'COL-02',
        project_slug: 'kancil-reborn-series',
        role_needed: 'Background Artist (2D/3D)',
        description: 'Dibutuhkan pembuat environment hutan neon cyberpunk (2-3 shot matte painting / 3D blockout).',
        contact: 'WA: 0812-3456-7890 (Dimas)',
        is_open: 'true'
      }
    ];
  }

  if (tab === 'Assets') {
    return [
      {
        asset_id: 'AST-01',
        name: 'Keris Laser Cyberpunk 3D Model',
        file_ext: '.blend',
        category: 'Props',
        gdrive_url: 'https://drive.google.com/drive/folders/demo-keris',
        author: 'Bayu 3D',
        preview_url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80'
      },
      {
        asset_id: 'AST-02',
        name: 'Minecraft Custom Mob Rig (Mine-imator)',
        file_ext: '.miobject',
        category: 'Rigs',
        gdrive_url: 'https://drive.google.com/drive/folders/demo-mob-rig',
        author: 'AldoCraft',
        preview_url: 'https://images.unsplash.com/photo-1627856013091-fed6e4e30025?w=600&auto=format&fit=crop&q=80'
      },
      {
        asset_id: 'AST-03',
        name: 'Sci-Fi Hologram Overlay Pack (4K 60fps)',
        file_ext: 'Green Screen',
        category: 'VFX',
        gdrive_url: 'https://drive.google.com/drive/folders/demo-hologram',
        author: 'MotionFX ID',
        preview_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80'
      }
    ];
  }

  if (tab === 'Tutorials') {
    return [
      {
        id: 'TUT-01',
        title: 'Dasar Animasi Pose-to-Pose di Blender untuk Pemula',
        type: 'Video',
        url: 'https://youtube.com',
        tags: 'Blender, Beginner, Keyframing'
      },
      {
        id: 'TUT-02',
        title: 'Trik Lighting Sinematik Neon di Eevee & Cycles',
        type: 'Article',
        url: 'https://youtube.com',
        tags: 'Lighting, Shader, Render'
      }
    ];
  }

  if (tab === 'Gallery') {
    return [
      {
        id: 'GAL-01',
        project_slug: 'legend-of-garuda',
        title: 'Legend of Garuda: Awakening (CGI Teaser)',
        video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
        released_at: '2026-08-15',
        credits: 'Director: Erik K. | Lead Animator: Rian | Rigger: Bayu | Sound: Dimas P.'
      }
    ];
  }

  return [];
}

function saveMockSheetData(tab, items) {
  try {
    localStorage.setItem(`cah_mock_sheet_${tab}`, JSON.stringify(items));
  } catch (e) {
    console.error(e);
  }
}
