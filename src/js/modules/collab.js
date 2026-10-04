/**
 * ==============================================================================
 * COMMUNITY ANIMATION HUB: Open Collab Board Module
 * File: src/js/modules/collab.js
 * ==============================================================================
 */

import { $, $$, escapeHtml } from '../utils/dom.js';
import { fetchSheetTab, submitToSheets } from '../api/sheets.js';
import { showToast } from '../components/toast.js';
import { Modal } from '../components/modal.js';
import { getUserName, setUserName } from '../utils/identity.js';

let allCollabPosts = [];
let currentRoleFilter = 'all';
let searchQuery = '';
let newCollabModal = null;

/**
 * Initialize Collab Board Page
 */
export async function initCollabPage() {
  setupModal();
  setupFilterAndSearch();
  await loadCollabPosts();
}

/**
 * Load Collab Posts from Google Sheets tab 'Collab'
 */
async function loadCollabPosts() {
  const container = $('#collab-posts-grid');
  if (container) {
    container.innerHTML = `
      <div class="glass-card p-6 rounded-2xl skeleton h-48"></div>
      <div class="glass-card p-6 rounded-2xl skeleton h-48"></div>
      <div class="glass-card p-6 rounded-2xl skeleton h-48"></div>
    `;
  }

  try {
    allCollabPosts = await fetchSheetTab('Collab');
    renderCollabPosts();
  } catch (err) {
    console.error('[Collab] Error loading posts:', err);
    if (container) {
      container.innerHTML = `
        <div class="col-span-full p-8 text-center glass-card rounded-2xl text-rose-400 text-sm">
          Gagal memuat postingan kolaborasi. Silakan muat ulang.
        </div>
      `;
    }
  }
}

/**
 * Render Filtered Collab Posts
 */
function renderCollabPosts() {
  const container = $('#collab-posts-grid');
  const countBadge = $('#collab-count-badge');
  if (!container) return;

  let filtered = allCollabPosts.filter(post => {
    // Role filter
    if (currentRoleFilter !== 'all') {
      const role = (post.role_needed || '').toLowerCase();
      if (!role.includes(currentRoleFilter.toLowerCase())) return false;
    }
    // Search query
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const roleMatch = (post.role_needed || '').toLowerCase().includes(q);
      const descMatch = (post.description || '').toLowerCase().includes(q);
      const projMatch = (post.project_slug || '').toLowerCase().includes(q);
      if (!roleMatch && !descMatch && !projMatch) return false;
    }
    return true;
  });

  if (countBadge) {
    countBadge.textContent = `${filtered.length} Lowongan`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 px-6 text-center glass-card rounded-3xl space-y-4">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
        </div>
        <h3 class="font-heading font-bold text-lg text-white">Belum Ada Lowongan yang Cocok</h3>
        <p class="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
          Tidak ada pencarian peran yang cocok dengan filter saat ini.
        </p>
        <button id="btn-empty-create-collab" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors">
          + Posting Kebutuhan Tim Anda
        </button>
      </div>
    `;

    const emptyBtn = $('#btn-empty-create-collab');
    if (emptyBtn && newCollabModal) {
      emptyBtn.addEventListener('click', () => newCollabModal.open());
    }
    return;
  }

  container.innerHTML = filtered.map(post => {
    const isOpen = String(post.is_open).toLowerCase() !== 'false';
    const roleBadgeClass = getRoleBadgeClass(post.role_needed);

    return `
      <article class="glass-card p-6 rounded-2xl flex flex-col justify-between space-y-5 border border-slate-800/80 hover:border-indigo-500/40 transition-all duration-200 group">
        <div class="space-y-3">
          <!-- Role and Status Badge -->
          <div class="flex items-center justify-between gap-2">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${roleBadgeClass}">
              ${escapeHtml(post.role_needed)}
            </span>
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
              isOpen ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'
            }">
              <span class="w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}"></span>
              ${isOpen ? 'Masih Terbuka' : 'Terisi'}
            </span>
          </div>

          <!-- Project slug reference -->
          <div class="text-xs text-indigo-400 font-mono">
            Proyek: <strong class="text-slate-200">${escapeHtml(post.project_slug || 'General')}</strong>
          </div>

          <!-- Description -->
          <p class="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-4">
            ${escapeHtml(post.description || 'Tidak ada deskripsi detail.')}
          </p>
        </div>

        <!-- Contact & Action Footer -->
        <div class="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="text-xs text-slate-400 truncate">
            Kontak: <strong class="text-slate-200 font-medium">${escapeHtml(post.contact)}</strong>
          </div>

          <a href="${getContactLink(post.contact)}" target="_blank" rel="noopener noreferrer" 
             class="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-semibold transition-colors shrink-0">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
            <span>Hubungi Koordinator</span>
          </a>
        </div>
      </article>
    `;
  }).join('');
}

/**
 * Setup Post Modal and Form Submission
 */
function setupModal() {
  const modalEl = $('#modal-create-collab');
  if (modalEl) {
    newCollabModal = new Modal(modalEl);
    const openBtn = $('#btn-open-create-collab');
    if (openBtn) {
      openBtn.addEventListener('click', () => newCollabModal.open());
    }

    const form = $('#form-create-collab');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleCreateCollab(form);
      });
    }
  }
}

/**
 * Handle Posting New Collab Need to Google Sheets
 */
async function handleCreateCollab(form) {
  const projectSlug = $('#collab-project-slug').value.trim() || 'general';
  const roleNeeded = $('#collab-role-needed').value.trim();
  const description = $('#collab-desc').value.trim();
  const contact = $('#collab-contact').value.trim();

  if (!roleNeeded || !contact) {
    showToast('warning', 'Role yang dicari dan kontak wajib diisi.');
    return;
  }

  const submitBtn = $('#btn-submit-collab');
  submitBtn.disabled = true;

  try {
    const result = await submitToSheets({
      target_sheet: 'Collab',
      project_slug: projectSlug,
      role_needed: roleNeeded,
      description,
      contact,
      is_open: 'true'
    });

    if (result.status === 'success') {
      showToast('success', 'Lowongan kolaborasi berhasil diposting ke Google Sheets!');
      form.reset();
      newCollabModal.close();

      // Optimistic update
      allCollabPosts.unshift({
        post_id: (result.data && result.data.post_id) || 'COL-' + Date.now(),
        project_slug: projectSlug,
        role_needed: roleNeeded,
        description,
        contact,
        is_open: 'true'
      });
      renderCollabPosts();

    } else {
      showToast('error', result.message || 'Gagal mengirim postingan.');
    }
  } catch (err) {
    console.error('[Collab] Error creating post:', err);
    showToast('error', 'Gagal mengirim data kolaborasi.');
  } finally {
    submitBtn.disabled = false;
  }
}

/**
 * Setup Role Filters and Instant Search
 */
function setupFilterAndSearch() {
  $$('.btn-role-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.btn-role-filter').forEach(b => {
        b.classList.remove('bg-indigo-600', 'text-white', 'shadow-md', 'shadow-indigo-600/30');
        b.classList.add('bg-slate-800/80', 'text-slate-300');
      });
      btn.classList.add('bg-indigo-600', 'text-white', 'shadow-md', 'shadow-indigo-600/30');
      btn.classList.remove('bg-slate-800/80', 'text-slate-300');

      currentRoleFilter = btn.getAttribute('data-role') || 'all';
      renderCollabPosts();
    });
  });

  const searchInput = $('#search-collab');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderCollabPosts();
    });
  }
}

/**
 * Styling helpers
 */
function getRoleBadgeClass(role) {
  const r = (role || '').toLowerCase();
  if (r.includes('rig')) return 'bg-purple-500/15 text-purple-300 border border-purple-500/30';
  if (r.includes('animat')) return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
  if (r.includes('model') || r.includes('3d')) return 'bg-sky-500/15 text-sky-300 border border-sky-500/30';
  if (r.includes('audio') || r.includes('sound')) return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
  if (r.includes('background') || r.includes('env')) return 'bg-pink-500/15 text-pink-300 border border-pink-500/30';
  return 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30';
}

function getContactLink(contactStr) {
  if (!contactStr) return '#';
  const str = contactStr.trim();
  if (str.startsWith('http')) return str;
  if (str.includes('@') && !str.includes('Discord')) return `mailto:${str}`;
  if (str.startsWith('08') || str.startsWith('62')) {
    const cleanNum = str.replace(/[^0-9]/g, '');
    return `https://wa.me/${cleanNum.startsWith('0') ? '62' + cleanNum.slice(1) : cleanNum}`;
  }
  return '#';
}
