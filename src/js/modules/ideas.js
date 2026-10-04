/**
 * ==============================================================================
 * COMMUNITY ANIMATION HUB: Ideas & Upvotes Module
 * File: src/js/modules/ideas.js
 * ==============================================================================
 */

import { $, $$, escapeHtml, debounce } from '../utils/dom.js';
import { fetchSheetTab, submitToSheets } from '../api/sheets.js';
import { getSupabase, subscribeTable } from '../api/supabase.js';
import { getVoterId, getUserName, setUserName } from '../utils/identity.js';
import { showToast } from '../components/toast.js';
import { formatRelativeTime } from '../utils/format.js';

let allIdeas = [];
let allVotes = [];
let currentCategory = 'all';
let currentSort = 'most-votes';
let searchQuery = '';

/**
 * Initialize Ideas Page
 */
export async function initIdeasPage() {
  setupFormHandler();
  setupFilterAndSearch();
  await loadIdeasData();
  setupRealtimeVotes();
}

/**
 * Fetch and merge ideas from Sheets & votes from Supabase
 */
async function loadIdeasData() {
  const container = $('#ideas-list-container');
  if (container) {
    container.innerHTML = `
      <div class="glass-card p-8 rounded-2xl skeleton h-48"></div>
      <div class="glass-card p-8 rounded-2xl skeleton h-48"></div>
      <div class="glass-card p-8 rounded-2xl skeleton h-48"></div>
    `;
  }

  try {
    const supabase = getSupabase();

    // 1. Fetch ideas from Google Sheets
    allIdeas = await fetchSheetTab('Ideas');

    // 2. Fetch votes from Supabase
    const { data: votes, error } = await supabase.from('idea_votes').select('*');
    if (!error && votes) {
      allVotes = votes;
    }

    renderIdeas();
  } catch (err) {
    console.error('[Ideas] Error loading ideas:', err);
    if (container) {
      container.innerHTML = `
        <div class="col-span-full p-8 text-center glass-card rounded-2xl text-rose-400">
          Gagal memuat daftar ide. Silakan muat ulang halaman.
        </div>
      `;
    }
  }
}

/**
 * Listen for Realtime Upvotes across users
 */
function setupRealtimeVotes() {
  subscribeTable(
    'idea_votes',
    (newVote) => {
      // Avoid duplicate push
      if (!allVotes.some(v => v.id === newVote.id)) {
        allVotes.push(newVote);
        renderIdeas();
      }
    },
    null,
    (deletedVote) => {
      allVotes = allVotes.filter(v => v.id !== deletedVote.id);
      renderIdeas();
    }
  );
}

/**
 * Render filtered & sorted ideas into DOM
 */
function renderIdeas() {
  const container = $('#ideas-list-container');
  const countBadge = $('#ideas-count-badge');
  if (!container) return;

  const voterId = getVoterId();

  // 1. Filter by category
  let filtered = allIdeas.filter(idea => {
    if (currentCategory !== 'all') {
      const cat = (idea.category || '').toLowerCase();
      if (cat !== currentCategory.toLowerCase()) return false;
    }
    // 2. Filter by search query
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const titleMatch = (idea.title || '').toLowerCase().includes(q);
      const descMatch = (idea.description || '').toLowerCase().includes(q);
      const authorMatch = (idea.author || '').toLowerCase().includes(q);
      if (!titleMatch && !descMatch && !authorMatch) return false;
    }
    return true;
  });

  // 3. Attach vote counts & user voted state
  const enriched = filtered.map(idea => {
    const votesForIdea = allVotes.filter(v => v.idea_id === idea.idea_id);
    const hasVoted = votesForIdea.some(v => v.voter_id === voterId);
    return {
      ...idea,
      votesCount: votesForIdea.length,
      hasVoted
    };
  });

  // 4. Sort
  if (currentSort === 'most-votes') {
    enriched.sort((a, b) => b.votesCount - a.votesCount);
  } else if (currentSort === 'newest') {
    enriched.sort((a, b) => new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0));
  }

  // Update total count indicator
  if (countBadge) {
    countBadge.textContent = `${enriched.length} Ide`;
  }

  // 5. Empty State
  if (enriched.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 px-6 text-center glass-card rounded-3xl space-y-4">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
        </div>
        <h3 class="font-heading font-bold text-lg text-white">Belum Ada Ide yang Cocok</h3>
        <p class="text-sm text-slate-400 max-w-sm mx-auto">
          Tidak ada ide ditemukan untuk filter atau pencarian saat ini. Jadilah yang pertama mengajukan ide cerita!
        </p>
        <a href="#drop-box" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors">
          + Drop Ide Cerita Sekarang
        </a>
      </div>
    `;
    return;
  }

  // 6. Render Cards
  container.innerHTML = enriched.map(idea => {
    const timeAgo = formatRelativeTime(idea.submitted_at);
    const categoryClass = getCategoryBadgeClass(idea.category);

    return `
      <article class="glass-card p-6 rounded-2xl flex flex-col justify-between space-y-5 transition-all duration-300 hover:border-indigo-500/40 group">
        <div class="space-y-3">
          <!-- Card Header (Category & Time) -->
          <div class="flex items-center justify-between gap-2">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase ${categoryClass}">
              ${escapeHtml(idea.category || 'General')}
            </span>
            <span class="text-xs text-slate-400 font-mono">${timeAgo}</span>
          </div>

          <!-- Title -->
          <h3 class="font-heading font-bold text-xl text-white group-hover:text-indigo-300 transition-colors leading-snug">
            ${escapeHtml(idea.title)}
          </h3>

          <!-- Description -->
          <p class="text-sm text-slate-300 leading-relaxed line-clamp-3">
            ${escapeHtml(idea.description)}
          </p>
        </div>

        <!-- Card Footer -->
        <div class="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-4">
          <!-- Author Info -->
          <div class="flex items-center gap-2 min-w-0">
            <div class="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold uppercase shrink-0">
              ${(idea.author || 'A').charAt(0)}
            </div>
            <span class="text-xs text-slate-400 truncate">
              Oleh <strong class="text-slate-200 font-medium">${escapeHtml(idea.author || 'Anonim')}</strong>
            </span>
          </div>

          <!-- Upvote Action Button -->
          <button data-idea-id="${escapeHtml(idea.idea_id)}" 
                  class="btn-vote-idea shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    idea.hasVoted 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105' 
                      : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 hover:text-white border border-slate-700/60'
                  }">
            <svg class="w-4 h-4 ${idea.hasVoted ? 'text-white' : 'text-indigo-400 group-hover:scale-110'} transition-transform" fill="${idea.hasVoted ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
            <span class="vote-label">${idea.hasVoted ? 'Didukung' : 'Vote'}</span>
            <span class="px-1.5 py-0.5 rounded-md font-mono text-[11px] ${idea.hasVoted ? 'bg-indigo-700 text-white' : 'bg-slate-900 text-indigo-300'} font-bold">
              ${idea.votesCount}
            </span>
          </button>
        </div>
      </article>
    `;
  }).join('');

  // Attach click listeners to vote buttons
  $$('.btn-vote-idea', container).forEach(button => {
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      const ideaId = button.getAttribute('data-idea-id');
      await toggleVote(ideaId, button);
    });
  });
}

/**
 * Handle 1-Click Upvote & Unvote with Optimistic UI
 */
async function toggleVote(ideaId, buttonEl) {
  const supabase = getSupabase();
  const voterId = getVoterId();

  buttonEl.disabled = true;

  try {
    const existingIndex = allVotes.findIndex(v => v.idea_id === ideaId && v.voter_id === voterId);

    if (existingIndex !== -1) {
      // UNVOTE: Optimistic local delete
      const removedVote = allVotes.splice(existingIndex, 1)[0];
      renderIdeas();

      const { error } = await supabase
        .from('idea_votes')
        .delete()
        .match({ idea_id: ideaId, voter_id: voterId });

      if (error) {
        // Rollback on network failure
        allVotes.push(removedVote);
        renderIdeas();
        showToast('error', 'Gagal membatalkan vote. Silakan coba lagi.');
      } else {
        showToast('info', 'Dukungan suara dibatalkan.');
      }
    } else {
      // UPVOTE: Optimistic local insert
      const tempVote = {
        id: 'vote_temp_' + Date.now(),
        idea_id: ideaId,
        voter_id: voterId,
        created_at: new Date().toISOString()
      };
      allVotes.push(tempVote);
      renderIdeas();

      const { data, error } = await supabase
        .from('idea_votes')
        .insert({ idea_id: ideaId, voter_id: voterId });

      if (error) {
        // Rollback
        allVotes = allVotes.filter(v => v !== tempVote);
        renderIdeas();
        showToast('error', 'Gagal memberikan vote. Silakan coba lagi.');
      } else {
        showToast('success', 'Terima kasih atas dukungan suara Anda!');
      }
    }
  } catch (err) {
    console.error('[Upvote] Error:', err);
    showToast('error', 'Terjadi kesalahan jaringan.');
  } finally {
    buttonEl.disabled = false;
  }
}

/**
 * Setup Category, Search, and Sort Handlers
 */
function setupFilterAndSearch() {
  // Category buttons
  $$('.btn-category-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.btn-category-filter').forEach(b => {
        b.classList.remove('bg-indigo-600', 'text-white', 'shadow-md', 'shadow-indigo-600/30');
        b.classList.add('bg-slate-800/80', 'text-slate-300');
      });
      btn.classList.add('bg-indigo-600', 'text-white', 'shadow-md', 'shadow-indigo-600/30');
      btn.classList.remove('bg-slate-800/80', 'text-slate-300');

      currentCategory = btn.getAttribute('data-category') || 'all';
      renderIdeas();
    });
  });

  // Search Input with Debounce
  const searchInput = $('#search-ideas');
  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      searchQuery = e.target.value;
      renderIdeas();
    }, 250));
  }

  // Sort Dropdown
  const sortSelect = $('#sort-ideas');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderIdeas();
    });
  }
}

/**
 * Setup Idea Drop-Box Form Submission
 */
function setupFormHandler() {
  const form = $('#form-idea-drop');
  if (!form) return;

  // Pre-fill author with saved identity if any
  const authorInput = $('#idea-author');
  if (authorInput) {
    const savedName = getUserName();
    if (savedName && savedName !== 'Animator Sahabat') {
      authorInput.value = savedName;
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const titleInput = $('#idea-title');
    const descInput = $('#idea-desc');
    const catSelect = $('#idea-category');
    const hpInput = $('#idea-hp');
    const submitBtn = $('#btn-submit-idea');

    const title = titleInput.value.trim();
    const description = descInput.value.trim();
    const category = catSelect.value;
    const author = (authorInput && authorInput.value.trim()) || 'Anonim';
    const _hp = hpInput ? hpInput.value.trim() : '';

    if (!title || !description) {
      showToast('warning', 'Judul dan deskripsi cerita wajib diisi!');
      return;
    }

    // Save author name locally for future submissions
    if (author && author !== 'Anonim') {
      setUserName(author);
    }

    // Set loading state
    submitBtn.disabled = true;
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = `
      <svg class="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
      <span>Mengirim ke Google Sheets...</span>
    `;

    try {
      const result = await submitToSheets({
        target_sheet: 'Ideas',
        title,
        description,
        category,
        author,
        _hp
      });

      if (result.status === 'success') {
        showToast('success', 'Ide cerita Anda berhasil dikirim ke Idea Bank!');
        
        // Optimistic UI: insert to local array
        const newIdea = {
          idea_id: (result.data && result.data.idea_id) || 'IDEA-' + Date.now(),
          title,
          description,
          category,
          author,
          submitted_at: new Date().toISOString(),
          status: 'approved'
        };
        allIdeas.unshift(newIdea);
        renderIdeas();

        // Reset form
        form.reset();
        if (authorInput && author !== 'Anonim') {
          authorInput.value = author;
        }

        // Scroll smoothly to ideas list
        const listSection = $('#ideas-section');
        if (listSection) {
          listSection.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        showToast('error', result.message || 'Gagal mengirim ide.');
      }
    } catch (err) {
      console.error('[FormSubmit] Error:', err);
      showToast('error', 'Gagal mengirim data, periksa koneksi internet Anda.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });
}

/**
 * Color classes for category badges
 */
function getCategoryBadgeClass(category) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('short')) return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
  if (cat.includes('series')) return 'bg-sky-500/15 text-sky-300 border border-sky-500/30';
  if (cat.includes('meme') || cat.includes('parody')) return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
  if (cat.includes('tech') || cat.includes('test')) return 'bg-purple-500/15 text-purple-300 border border-purple-500/30';
  if (cat.includes('challenge')) return 'bg-pink-500/15 text-pink-300 border border-pink-500/30';
  return 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30';
}
