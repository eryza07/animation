/**
 * ==============================================================================
 * COMMUNITY ANIMATION HUB: Multi-Format Asset Catalog & Tutorials Module
 * File: src/js/modules/assets.js
 * ==============================================================================
 */

import { $, $$, escapeHtml } from '../utils/dom.js';
import { fetchSheetTab } from '../api/sheets.js';

let allAssets = [];
let allTutorials = [];
let currentExtFilter = 'all';
let currentCatFilter = 'all';
let searchQuery = '';
let currentViewTab = 'assets'; // 'assets' or 'tutorials'

/**
 * Initialize Assets & Tutorials Page
 */
export async function initAssetsPage() {
  setupFilterAndSearch();
  setupViewTabs();
  await loadAssetsAndTutorials();
}

/**
 * Load Assets and Tutorials from Google Sheets
 */
async function loadAssetsAndTutorials() {
  const assetsContainer = $('#assets-grid-container');
  const tutorialsContainer = $('#tutorials-grid-container');

  try {
    const [assets, tutorials] = await Promise.all([
      fetchSheetTab('Assets'),
      fetchSheetTab('Tutorials')
    ]);

    allAssets = assets || [];
    allTutorials = tutorials || [];

    renderAssets();
    renderTutorials();

  } catch (err) {
    console.error('[Assets] Error loading data:', err);
    if (assetsContainer) {
      assetsContainer.innerHTML = `<div class="col-span-full text-center text-rose-400 text-xs py-8">Gagal memuat katalog aset.</div>`;
    }
  }
}

/**
 * Render Assets Grid
 */
function renderAssets() {
  const container = $('#assets-grid-container');
  const countBadge = $('#assets-count-badge');
  if (!container) return;

  let filtered = allAssets.filter(item => {
    // Extension filter
    if (currentExtFilter !== 'all') {
      const ext = (item.file_ext || '').toLowerCase();
      if (!ext.includes(currentExtFilter.toLowerCase())) return false;
    }
    // Category filter
    if (currentCatFilter !== 'all') {
      const cat = (item.category || '').toLowerCase();
      if (cat !== currentCatFilter.toLowerCase()) return false;
    }
    // Search query
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const nameMatch = (item.name || '').toLowerCase().includes(q);
      const authorMatch = (item.author || '').toLowerCase().includes(q);
      const catMatch = (item.category || '').toLowerCase().includes(q);
      if (!nameMatch && !authorMatch && !catMatch) return false;
    }
    return true;
  });

  if (countBadge) {
    countBadge.textContent = `${filtered.length} Aset`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 px-6 text-center glass-card rounded-3xl space-y-3">
        <div class="w-14 h-14 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
        </div>
        <h3 class="font-heading font-bold text-base text-white">Tidak Ada Aset yang Sesuai</h3>
        <p class="text-xs text-slate-400 max-w-sm mx-auto">
          Coba ganti filter ekstensi atau kata kunci pencarian Anda.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const extBadgeClass = getExtBadgeClass(item.file_ext);

    return `
      <article class="glass-card rounded-2xl overflow-hidden flex flex-col justify-between border border-slate-800/80 hover:border-indigo-500/40 transition-all duration-200 group">
        <!-- Thumbnail / Preview -->
        <div class="relative h-40 bg-slate-900 overflow-hidden">
          <img src="${item.preview_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600'}" 
               alt="${escapeHtml(item.name)}" 
               class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-85" />
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
          
          <!-- Extension Pill -->
          <div class="absolute top-3 left-3">
            <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wider ${extBadgeClass}">
              ${escapeHtml(item.file_ext || 'FILE')}
            </span>
          </div>

          <!-- Category Pill -->
          <div class="absolute top-3 right-3">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-950/80 text-slate-300 border border-slate-700/60">
              ${escapeHtml(item.category || 'General')}
            </span>
          </div>
        </div>

        <!-- Info & Actions -->
        <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
          <div class="space-y-1">
            <h3 class="font-heading font-bold text-base text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
              ${escapeHtml(item.name)}
            </h3>
            <p class="text-xs text-slate-400">
              Kreator: <strong class="text-slate-300 font-medium">${escapeHtml(item.author || 'Komunitas')}</strong>
            </p>
          </div>

          <!-- Download Button -->
          <div class="pt-3 border-t border-slate-800/80">
            <a href="${escapeHtml(item.gdrive_url || '#')}" target="_blank" rel="noopener noreferrer" 
               class="w-full py-2 px-3 rounded-xl bg-slate-800/90 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-semibold transition-all duration-150 flex items-center justify-center gap-2 group-hover:shadow-md group-hover:shadow-indigo-600/30">
              <svg class="w-3.5 h-3.5 text-indigo-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              <span>Unduh dari Google Drive ↗</span>
            </a>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

/**
 * Render Tutorials & Templates Grid
 */
function renderTutorials() {
  const container = $('#tutorials-grid-container');
  if (!container) return;

  if (allTutorials.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-500 text-xs">
        Belum ada tutorial atau starter template yang terdaftar.
      </div>
    `;
    return;
  }

  container.innerHTML = allTutorials.map(tut => {
    const isVideo = (tut.type || '').toLowerCase().includes('video');

    return `
      <article class="glass-card p-5 rounded-2xl flex flex-col justify-between space-y-4 border border-slate-800">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
              isVideo ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
            }">
              <span>${isVideo ? '🎥' : '📄'}</span>
              ${escapeHtml(tut.type || 'Guide')}
            </span>
            <span class="text-[11px] text-slate-500 font-mono">${escapeHtml(tut.id || '')}</span>
          </div>

          <h3 class="font-heading font-bold text-sm text-white line-clamp-2">
            ${escapeHtml(tut.title)}
          </h3>

          <div class="flex flex-wrap gap-1 pt-1">
            ${(tut.tags || '').split(',').map(tag => `
              <span class="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                #${escapeHtml(tag.trim())}
              </span>
            `).join('')}
          </div>
        </div>

        <div class="pt-3 border-t border-slate-800/80">
          <a href="${escapeHtml(tut.url || '#')}" target="_blank" rel="noopener noreferrer" 
             class="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5">
            <span>Buka Materi / Panduan ↗</span>
          </a>
        </div>
      </article>
    `;
  }).join('');
}

/**
 * Setup Tabs (Assets vs Tutorials)
 */
function setupViewTabs() {
  const tabAssetsBtn = $('#tab-btn-assets');
  const tabTutorialsBtn = $('#tab-btn-tutorials');
  const assetsSection = $('#assets-view-section');
  const tutorialsSection = $('#tutorials-view-section');

  if (tabAssetsBtn && tabTutorialsBtn) {
    tabAssetsBtn.addEventListener('click', () => {
      currentViewTab = 'assets';
      tabAssetsBtn.classList.add('bg-indigo-600', 'text-white', 'shadow-md', 'shadow-indigo-600/30');
      tabAssetsBtn.classList.remove('bg-slate-900', 'text-slate-400');
      tabTutorialsBtn.classList.remove('bg-indigo-600', 'text-white', 'shadow-md', 'shadow-indigo-600/30');
      tabTutorialsBtn.classList.add('bg-slate-900', 'text-slate-400');

      if (assetsSection) assetsSection.classList.remove('hidden');
      if (tutorialsSection) tutorialsSection.classList.add('hidden');
    });

    tabTutorialsBtn.addEventListener('click', () => {
      currentViewTab = 'tutorials';
      tabTutorialsBtn.classList.add('bg-indigo-600', 'text-white', 'shadow-md', 'shadow-indigo-600/30');
      tabTutorialsBtn.classList.remove('bg-slate-900', 'text-slate-400');
      tabAssetsBtn.classList.remove('bg-indigo-600', 'text-white', 'shadow-md', 'shadow-indigo-600/30');
      tabAssetsBtn.classList.add('bg-slate-900', 'text-slate-400');

      if (tutorialsSection) tutorialsSection.classList.remove('hidden');
      if (assetsSection) assetsSection.classList.add('hidden');
    });
  }
}

/**
 * Setup Filter Chips and Search Bar
 */
function setupFilterAndSearch() {
  // Extension Chips
  $$('.btn-ext-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.btn-ext-filter').forEach(b => {
        b.classList.remove('bg-indigo-600', 'text-white', 'shadow-md', 'shadow-indigo-600/30');
        b.classList.add('bg-slate-800/80', 'text-slate-300');
      });
      btn.classList.add('bg-indigo-600', 'text-white', 'shadow-md', 'shadow-indigo-600/30');
      btn.classList.remove('bg-slate-800/80', 'text-slate-300');

      currentExtFilter = btn.getAttribute('data-ext') || 'all';
      renderAssets();
    });
  });

  // Category select
  const catSelect = $('#select-asset-category');
  if (catSelect) {
    catSelect.addEventListener('change', (e) => {
      currentCatFilter = e.target.value;
      renderAssets();
    });
  }

  // Search input
  const searchInput = $('#search-assets');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderAssets();
    });
  }
}

function getExtBadgeClass(ext) {
  const e = (ext || '').toLowerCase();
  if (e.includes('.blend')) return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
  if (e.includes('.miobject') || e.includes('.schematic')) return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
  if (e.includes('.obj') || e.includes('.fbx')) return 'bg-sky-500/20 text-sky-300 border border-sky-500/30';
  if (e.includes('green') || e.includes('screen') || e.includes('vfx')) return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
  return 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
}
