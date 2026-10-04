/**
 * ==============================================================================
 * COMMUNITY ANIMATION HUB: Main Homepage Controller
 * File: src/js/main.js
 * ==============================================================================
 */

import { $, $$ } from './utils/dom.js';
import { getSupabase } from './api/supabase.js';
import { fetchSheetTab } from './api/sheets.js';
import { showToast } from './components/toast.js';
import { getVoterId } from './utils/identity.js';

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  loadHomepageData();
});

/**
 * Mobile Drawer Menu Handler
 */
function initMobileMenu() {
  const btn = $('#btn-mobile-menu');
  const menu = $('#mobile-menu');
  if (btn && menu) {
    btn.addEventListener('click', () => {
      menu.classList.toggle('hidden');
    });
  }
}

/**
 * Load Dynamic Data for Homepage (Teasers & Live Metrics)
 */
async function loadHomepageData() {
  try {
    const supabase = getSupabase();

    // 1. Load Projects & Scenes for Pipeline Preview
    const { data: projects } = await supabase.from('projects').select('*');
    const { data: scenes } = await supabase.from('scenes').select('*');

    renderProjectsTeaser(projects || [], scenes || []);

    // 2. Load Top Ideas & Supabase Votes
    const ideas = await fetchSheetTab('Ideas');
    const { data: votes } = await supabase.from('idea_votes').select('*');

    renderIdeasTeaser(ideas || [], votes || []);

    // 3. Load Active Challenge
    const challenges = await fetchSheetTab('Challenges');
    if (challenges && challenges.length > 0) {
      renderActiveChallenge(challenges[0]);
    }

  } catch (err) {
    console.error('[Homepage] Gagal memuat data:', err);
    showToast('error', 'Gagal memuat beberapa data komunitas.');
  }
}

/**
 * Render Projects Teaser Cards
 */
function renderProjectsTeaser(projects, scenes) {
  const container = $('#home-projects-grid');
  if (!container) return;

  if (projects.length === 0) {
    container.innerHTML = `<div class="col-span-3 text-center py-8 text-slate-500 text-sm">Belum ada proyek aktif di pipeline.</div>`;
    return;
  }

  // Update counter
  const statCount = $('#stat-projects-count');
  if (statCount) statCount.textContent = projects.length;

  container.innerHTML = projects.slice(0, 3).map(proj => {
    const projScenes = scenes.filter(s => s.project_id === proj.id);
    const totalScenes = projScenes.length;
    const doneScenes = projScenes.filter(s => s.is_done).length;
    const progressPct = totalScenes > 0 ? Math.round((doneScenes / totalScenes) * 100) : 0;

    const badgeClass = `badge-${proj.status}`;

    return `
      <div class="glass-card rounded-2xl overflow-hidden flex flex-col justify-between group">
        <div class="relative h-36 bg-slate-900 overflow-hidden">
          <img src="${proj.cover_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600'}" 
               alt="${proj.title}" 
               class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80" />
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
          <div class="absolute top-3 right-3">
            <span class="badge-pipeline ${badgeClass}">${proj.status}</span>
          </div>
        </div>

        <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
          <div>
            <h3 class="font-heading font-bold text-lg text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
              ${proj.title}
            </h3>
            <p class="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              ${proj.description || 'Tidak ada deskripsi.'}
            </p>
          </div>

          <!-- Progress Bar -->
          <div class="space-y-1.5 pt-2 border-t border-slate-800/80">
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-400">Progres Scene</span>
              <span class="font-semibold text-indigo-400 font-mono">${doneScenes}/${totalScenes} (${progressPct}%)</span>
            </div>
            <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500" style="width: ${progressPct}%"></div>
            </div>
          </div>

          <div class="pt-2">
            <a href="pages/project-detail.html?slug=${proj.slug}" class="block text-center py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-xs font-semibold text-slate-200 transition-colors">
              Buka Detail & Checklist Scene →
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render Ideas Teaser Cards with Live Upvoting
 */
function renderIdeasTeaser(ideas, votes) {
  const container = $('#home-ideas-grid');
  if (!container) return;

  if (ideas.length === 0) {
    container.innerHTML = `<div class="col-span-3 text-center py-8 text-slate-500 text-sm">Belum ada ide yang diajukan.</div>`;
    return;
  }

  const voterId = getVoterId();

  // Calculate vote count per idea
  const ideasWithVotes = ideas.map(idea => {
    const ideaVotes = votes.filter(v => v.idea_id === idea.idea_id);
    const hasVoted = ideaVotes.some(v => v.voter_id === voterId);
    return {
      ...idea,
      votesCount: ideaVotes.length,
      hasVoted
    };
  });

  // Sort by highest votes
  ideasWithVotes.sort((a, b) => b.votesCount - a.votesCount);

  // Update counter
  const statIdeas = $('#stat-ideas-count');
  if (statIdeas) statIdeas.textContent = ideas.length;

  container.innerHTML = ideasWithVotes.slice(0, 3).map(idea => {
    return `
      <div class="glass-card p-5 rounded-2xl flex flex-col justify-between space-y-4">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              ${idea.category || 'General'}
            </span>
            <span class="text-xs text-slate-500">Oleh ${idea.author || 'Anonim'}</span>
          </div>
          <h3 class="font-heading font-bold text-base text-white line-clamp-2">
            ${idea.title}
          </h3>
          <p class="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            ${idea.description}
          </p>
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-slate-800/80">
          <span class="text-xs text-slate-400 font-medium">Dukungan: <strong class="text-white font-mono">${idea.votesCount}</strong> vote</span>
          <button data-vote-id="${idea.idea_id}" class="btn-quick-vote inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            idea.hasVoted 
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
              : 'bg-slate-800 hover:bg-indigo-600/40 text-slate-200'
          }">
            <svg class="w-3.5 h-3.5 ${idea.hasVoted ? 'text-white' : 'text-indigo-400'}" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a2 2 0 00-.8 1.4z" />
            </svg>
            <span>${idea.hasVoted ? 'Didukung' : 'Vote'}</span>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Attach quick vote listeners
  $$('.btn-quick-vote').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const ideaId = btn.getAttribute('data-vote-id');
      await handleQuickVote(ideaId);
    });
  });
}

/**
 * Handle Upvoting from Homepage Teaser
 */
async function handleQuickVote(ideaId) {
  const supabase = getSupabase();
  const voterId = getVoterId();

  try {
    // Check if voted
    const { data: existing } = await supabase
      .from('idea_votes')
      .select('*');

    const alreadyVoted = existing && existing.some(v => v.idea_id === ideaId && v.voter_id === voterId);

    if (alreadyVoted) {
      await supabase.from('idea_votes').delete().match({ idea_id: ideaId, voter_id: voterId });
      showToast('info', 'Dukungan suara dibatalkan.');
    } else {
      await supabase.from('idea_votes').insert({ idea_id: ideaId, voter_id: voterId });
      showToast('success', 'Terima kasih atas dukungan suara Anda!');
    }

    // Refresh data
    const ideas = await fetchSheetTab('Ideas');
    const { data: votes } = await supabase.from('idea_votes').select('*');
    renderIdeasTeaser(ideas, votes || []);

  } catch (err) {
    console.error('[QuickVote] Error:', err);
    showToast('error', 'Gagal memproses vote.');
  }
}

/**
 * Render Challenge Banner
 */
function renderActiveChallenge(challenge) {
  const titleEl = $('#home-challenge-title');
  const promptEl = $('#home-challenge-prompt');
  if (titleEl && challenge.title) titleEl.textContent = challenge.title;
  if (promptEl && challenge.prompt) promptEl.textContent = challenge.prompt;
}
