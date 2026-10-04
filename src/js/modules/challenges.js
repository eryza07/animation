/**
 * ==============================================================================
 * COMMUNITY ANIMATION HUB: Challenges Module
 * File: src/js/modules/challenges.js
 * ==============================================================================
 */

import { $, escapeHtml } from '../utils/dom.js';
import { fetchSheetTab } from '../api/sheets.js';
import { formatDate } from '../utils/format.js';

/**
 * Load and render active community challenges
 */
export async function initChallenges(onSelectChallengeCategory = null) {
  const container = $('#challenge-board-section');
  if (!container) return;

  try {
    const challenges = await fetchSheetTab('Challenges');

    if (!challenges || challenges.length === 0) {
      container.innerHTML = `
        <div class="glass-card p-6 rounded-2xl text-center text-slate-400 text-sm">
          Belum ada tantangan animasi aktif saat ini. Tetap pantau pengumuman komunitas!
        </div>
      `;
      return;
    }

    // Render active challenge banner
    const active = challenges[0];
    const startDate = formatDate(active.start_date);
    const endDate = formatDate(active.end_date);

    container.innerHTML = `
      <div class="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-indigo-950/80 via-purple-950/60 to-slate-900 border border-indigo-500/30 shadow-2xl">
        <!-- Background Ambient Accent -->
        <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div class="space-y-3 max-w-3xl">
            <div class="flex flex-wrap items-center gap-2">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider border border-indigo-500/30">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Tantangan ${escapeHtml(active.type || 'Bulanan')}
              </span>
              <span class="text-xs text-slate-400 font-medium">
                Periode: <strong class="text-slate-200">${startDate}</strong> s/d <strong class="text-slate-200">${endDate}</strong>
              </span>
            </div>

            <h2 class="text-2xl sm:text-3xl font-extrabold font-heading text-white">
              ${escapeHtml(active.title)}
            </h2>

            <p class="text-sm sm:text-base text-slate-300 leading-relaxed">
              ${escapeHtml(active.prompt)}
            </p>
          </div>

          <div class="shrink-0 w-full md:w-auto">
            <button id="btn-participate-challenge" class="w-full md:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/30 transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              <span>Submit Ide untuk Tantangan Ini</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Hook participation button to form
    const btn = $('#btn-participate-challenge');
    if (btn) {
      btn.addEventListener('click', () => {
        const formSection = $('#drop-box');
        if (formSection) {
          formSection.scrollIntoView({ behavior: 'smooth' });
          const catSelect = $('#idea-category');
          if (catSelect) {
            catSelect.value = 'Challenge Submission';
          }
          const titleInput = $('#idea-title');
          if (titleInput) {
            titleInput.focus();
          }
        }
      });
    }

  } catch (err) {
    console.error('[Challenges] Error loading challenge:', err);
    container.innerHTML = `<div class="text-rose-400 text-xs">Gagal memuat tantangan komunitas.</div>`;
  }
}
