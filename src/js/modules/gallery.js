/**
 * ==============================================================================
 * COMMUNITY ANIMATION HUB: Finished Works Gallery Module
 * File: src/js/modules/gallery.js
 * ==============================================================================
 */

import { $, $$, escapeHtml } from '../utils/dom.js';
import { fetchSheetTab } from '../api/sheets.js';
import { Modal } from '../components/modal.js';
import { formatDate } from '../utils/format.js';

let allGalleryItems = [];
let videoModal = null;

/**
 * Initialize Gallery Page
 */
export async function initGalleryPage() {
  setupVideoModal();
  setupSearch();
  await loadGalleryItems();
}

/**
 * Load Gallery from Google Sheets tab 'Gallery'
 */
async function loadGalleryItems() {
  const container = $('#gallery-grid-container');
  if (container) {
    container.innerHTML = `
      <div class="glass-card p-6 rounded-2xl skeleton h-72"></div>
      <div class="glass-card p-6 rounded-2xl skeleton h-72"></div>
      <div class="glass-card p-6 rounded-2xl skeleton h-72"></div>
    `;
  }

  try {
    allGalleryItems = await fetchSheetTab('Gallery');
    renderGallery();
  } catch (err) {
    console.error('[Gallery] Error loading:', err);
    if (container) {
      container.innerHTML = `<div class="col-span-full text-center text-rose-400 text-xs py-8">Gagal memuat galeri karya.</div>`;
    }
  }
}

/**
 * Render Gallery Grid
 */
function renderGallery(filtered = null) {
  const container = $('#gallery-grid-container');
  const countBadge = $('#gallery-count-badge');
  if (!container) return;

  const items = filtered || allGalleryItems;

  if (countBadge) {
    countBadge.textContent = `${items.length} Karya Rilis`;
  }

  if (items.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 px-6 text-center glass-card rounded-3xl space-y-3">
        <div class="w-14 h-14 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
        </div>
        <h3 class="font-heading font-bold text-base text-white">Belum Ada Karya yang Selesai</h3>
        <p class="text-xs text-slate-400 max-w-sm mx-auto">
          Karya yang 100% selesai diproduksi dan dirilis akan dikurasi di etalase galeri ini.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => {
    const releaseDate = formatDate(item.released_at);

    return `
      <article class="glass-card rounded-3xl overflow-hidden flex flex-col justify-between border border-slate-800/80 hover:border-indigo-500/40 transition-all duration-300 group">
        <!-- 16:9 Thumbnail Container -->
        <div class="relative aspect-video bg-slate-950 overflow-hidden cursor-pointer btn-open-video" 
             data-video-url="${escapeHtml(item.video_url)}" 
             data-video-title="${escapeHtml(item.title)}"
             data-video-credits="${escapeHtml(item.credits || '')}">
          <img src="${item.thumbnail || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800'}" 
               alt="${escapeHtml(item.title)}" 
               class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80" />
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent"></div>

          <!-- Play Button Overlay -->
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-14 h-14 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-xl shadow-indigo-600/40 group-hover:scale-110 transition-transform pl-1">
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>

          <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-mono">
            <span class="px-2.5 py-1 rounded-md bg-slate-950/80 text-emerald-300 font-bold border border-emerald-500/30">
              ✓ 100% RILIS
            </span>
            <span class="px-2 py-1 rounded-md bg-slate-950/80 text-slate-300">
              ${releaseDate}
            </span>
          </div>
        </div>

        <!-- Info & Credits -->
        <div class="p-6 space-y-4 flex-1 flex flex-col justify-between">
          <div class="space-y-1.5">
            <h3 class="font-heading font-extrabold text-lg text-white group-hover:text-indigo-300 transition-colors leading-snug">
              ${escapeHtml(item.title)}
            </h3>
            <p class="text-xs text-slate-400 line-clamp-2 leading-relaxed">
              ${escapeHtml(item.credits || 'Karya kolaboratif komunitas.')}
            </p>
          </div>

          <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3 text-xs">
            <button class="btn-open-video text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1.5"
                    data-video-url="${escapeHtml(item.video_url)}" 
                    data-video-title="${escapeHtml(item.title)}"
                    data-video-credits="${escapeHtml(item.credits || '')}">
              <span>Putar Animasi</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </button>

            <span class="text-[11px] text-slate-500 font-mono">#${escapeHtml(item.project_slug || 'indie')}</span>
          </div>
        </div>
      </article>
    `;
  }).join('');

  // Attach click listeners
  $$('.btn-open-video', container).forEach(trigger => {
    trigger.addEventListener('click', () => {
      const url = trigger.getAttribute('data-video-url');
      const title = trigger.getAttribute('data-video-title');
      const credits = trigger.getAttribute('data-video-credits');
      openPlayerModal(url, title, credits);
    });
  });
}

/**
 * Setup Video Player Modal
 */
function setupVideoModal() {
  const modalEl = $('#modal-video-player');
  if (modalEl) {
    videoModal = new Modal(modalEl);

    // Stop video on modal close
    const closeBtns = modalEl.querySelectorAll('[data-close-modal]');
    closeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const frame = $('#player-iframe');
        if (frame) frame.src = '';
      });
    });
  }
}

/**
 * Open Video Modal Player
 */
function openPlayerModal(url, title, credits) {
  if (!videoModal) return;

  const titleEl = $('#modal-player-title');
  const creditsEl = $('#modal-player-credits');
  const iframe = $('#player-iframe');

  if (titleEl) titleEl.textContent = title;
  if (creditsEl) creditsEl.textContent = credits;

  // Transform standard YouTube watch link to embed format if needed
  let embedUrl = url;
  if (url && url.includes('watch?v=')) {
    embedUrl = url.replace('watch?v=', 'embed/');
  }

  if (iframe) {
    iframe.src = embedUrl;
  }

  videoModal.open();
}

/**
 * Setup Search
 */
function setupSearch() {
  const searchInput = $('#search-gallery');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) {
        renderGallery();
        return;
      }
      const filtered = allGalleryItems.filter(item => 
        (item.title || '').toLowerCase().includes(q) ||
        (item.credits || '').toLowerCase().includes(q) ||
        (item.project_slug || '').toLowerCase().includes(q)
      );
      renderGallery(filtered);
    });
  }
}
