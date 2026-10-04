/**
 * ==============================================================================
 * COMMUNITY ANIMATION HUB: Global Application Configuration
 * File: src/js/config.js
 * ==============================================================================
 */

export const CONFIG = {
  APP_NAME: 'Community Animation Hub',
  VERSION: '1.0.0',

  // 1. Supabase Credentials
  // Isi dengan kredensial project Supabase Anda (Project Settings > API)
  SUPABASE: {
    URL: 'https://YOUR_SUPABASE_PROJECT_ID.supabase.co',
    ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
    REALTIME_ENABLED: true
  },

  // 2. Google Apps Script Web App Endpoint
  // Isi dengan URL Web App hasil deploy Code.gs (Execute as: Me, Access: Anyone)
  APPS_SCRIPT: {
    WEB_APP_URL: 'https://script.google.com/macros/s/YOUR_APPS_SCRIPT_DEPLOYMENT_ID/exec'
  },

  // 3. Google Sheets Master Configuration
  // Untuk mode public read via published CSV/JSON atau Apps Script proxy
  SHEETS: {
    // ID Spreadsheet (dari URL https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit)
    SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID',
    // Tab names
    TABS: {
      IDEAS: 'Ideas',
      CHALLENGES: 'Challenges',
      COLLAB: 'Collab',
      ASSETS: 'Assets',
      TUTORIALS: 'Tutorials',
      GALLERY: 'Gallery'
    },
    // Cache Time-To-Live dalam milidetik (misal 5 menit = 300000 ms)
    CACHE_TTL_MS: 5 * 60 * 1000
  },

  // 4. Default Fallbacks & Mock Data (Aktif otomatis jika kredensial belum diisi)
  MOCK_MODE: true, // Ubah ke false jika sudah mengisi Supabase & Apps Script URL di atas

  // 5. Pipeline Stages Definition
  PIPELINE_STAGES: [
    { id: 'idea', label: 'Idea', color: 'slate', icon: 'bulb' },
    { id: 'storyboard', label: 'Storyboard', color: 'sky', icon: 'film' },
    { id: 'animating', label: 'Animating', color: 'amber', icon: 'play' },
    { id: 'render', label: 'Render Relay', color: 'purple', icon: 'cpu' },
    { id: 'review', label: 'Review & Revisions', color: 'rose', icon: 'check-circle' },
    { id: 'done', label: 'Released / Done', color: 'emerald', icon: 'sparkles' }
  ]
};
