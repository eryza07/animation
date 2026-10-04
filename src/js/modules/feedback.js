/**
 * ==============================================================================
 * COMMUNITY ANIMATION HUB: Timestamp Feedback Module
 * File: src/js/modules/feedback.js
 * ==============================================================================
 */

import { $, $$, escapeHtml } from '../utils/dom.js';
import { getSupabase, subscribeTable } from '../api/supabase.js';
import { showToast } from '../components/toast.js';
import { secondsToTimecode, timecodeToSeconds } from '../utils/format.js';
import { getUserName } from '../utils/identity.js';

let currentFeedback = [];
let currentProjectId = null;

/**
 * Initialize Feedback Module for a Project
 */
export async function initFeedbackModule(projectId) {
  currentProjectId = projectId;
  setupFeedbackForm();
  await loadFeedback();
  setupRealtimeFeedback();
}

/**
 * Load Feedback from Supabase
 */
async function loadFeedback() {
  const container = $('#feedback-list-container');
  if (!container || !currentProjectId) return;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('feedback')
      .select('*');

    if (error) throw error;

    currentFeedback = data ? data.filter(f => f.project_id === currentProjectId) : [];
    currentFeedback.sort((a, b) => (Number(a.timestamp_sec) || 0) - (Number(b.timestamp_sec) || 0));

    renderFeedbackList();

  } catch (err) {
    console.error('[Feedback] Error loading:', err);
    if (container) {
      container.innerHTML = `<div class="text-rose-400 text-xs py-2">Gagal memuat catatan revisi.</div>`;
    }
  }
}

/**
 * Setup Realtime Listener for Feedback
 */
function setupRealtimeFeedback() {
  subscribeTable(
    'feedback',
    (newFb) => {
      if (newFb.project_id === currentProjectId) {
        if (!currentFeedback.some(f => f.id === newFb.id)) {
          currentFeedback.push(newFb);
          currentFeedback.sort((a, b) => (Number(a.timestamp_sec) || 0) - (Number(b.timestamp_sec) || 0));
          renderFeedbackList();
          showToast('info', `Catatan revisi baru di [${secondsToTimecode(newFb.timestamp_sec)}]!`);
        }
      }
    },
    (updatedFb) => {
      if (updatedFb.project_id === currentProjectId) {
        currentFeedback = currentFeedback.map(f => f.id === updatedFb.id ? updatedFb : f);
        renderFeedbackList();
      }
    }
  );
}

/**
 * Render Feedback List
 */
function renderFeedbackList() {
  const container = $('#feedback-list-container');
  const countBadge = $('#feedback-count-badge');
  if (!container) return;

  const total = currentFeedback.length;
  const resolvedCount = currentFeedback.filter(f => f.resolved).length;

  if (countBadge) {
    countBadge.textContent = `${resolvedCount}/${total} Selesai`;
  }

  if (currentFeedback.length === 0) {
    container.innerHTML = `
      <div class="p-6 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-slate-500 text-xs">
        Belum ada catatan revisi waktu (timestamp) untuk video draft ini.
      </div>
    `;
    return;
  }

  container.innerHTML = currentFeedback.map(item => {
    const timecodeStr = secondsToTimecode(item.timestamp_sec);
    const isResolved = item.resolved;

    return `
      <div class="glass-card p-4 rounded-xl flex items-start justify-between gap-4 text-xs border border-slate-800 transition-all ${
        isResolved ? 'opacity-60 bg-slate-900/30' : 'hover:border-slate-700'
      }">
        <div class="flex items-start gap-3 flex-1">
          <!-- Timecode Pill -->
          <span class="px-2.5 py-1 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-mono font-bold shrink-0">
            ⏱️ ${timecodeStr}
          </span>

          <div class="space-y-1 flex-1">
            <p class="text-slate-200 leading-relaxed ${isResolved ? 'line-through text-slate-400' : ''}">
              ${escapeHtml(item.comment)}
            </p>
            <div class="text-[11px] text-slate-500">
              Oleh <strong class="text-slate-400 font-medium">${escapeHtml(item.author || 'Member')}</strong>
            </div>
          </div>
        </div>

        <!-- Toggle Resolved -->
        <button data-feedback-id="${item.id}" data-resolved="${item.resolved}" 
                class="btn-toggle-feedback-resolved shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  isResolved 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300'
                }">
          ${isResolved ? '✓ Selesai' : 'Tandai Selesai'}
        </button>
      </div>
    `;
  }).join('');

  $$('.btn-toggle-feedback-resolved', container).forEach(btn => {
    btn.addEventListener('click', async () => {
      const fbId = btn.getAttribute('data-feedback-id');
      const isResolved = btn.getAttribute('data-resolved') === 'true';
      await toggleFeedbackResolved(fbId, !isResolved);
    });
  });
}

/**
 * Toggle Resolved Status
 */
async function toggleFeedbackResolved(fbId, newResolved) {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('feedback')
      .update({ resolved: newResolved })
      .eq('id', fbId);

    if (error) throw error;

    const target = currentFeedback.find(f => f.id === fbId);
    if (target) target.resolved = newResolved;
    renderFeedbackList();

    showToast('success', newResolved ? 'Revisi ditandai selesai!' : 'Revisi dibuka kembali.');

  } catch (err) {
    console.error('[Feedback] Error updating:', err);
    showToast('error', 'Gagal memperbarui status revisi.');
  }
}

/**
 * Setup Form Submission for New Feedback
 */
function setupFeedbackForm() {
  const form = $('#form-add-feedback');
  if (!form) return;

  const authorInput = $('#fb-author');
  if (authorInput) {
    authorInput.value = getUserName();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const timecodeRaw = $('#fb-timecode').value.trim();
    const comment = $('#fb-comment').value.trim();
    const author = ($('#fb-author') && $('#fb-author').value.trim()) || 'Member';

    if (!timecodeRaw || !comment) {
      showToast('warning', 'Format menit:detik dan komentar wajib diisi.');
      return;
    }

    const timestampSec = timecodeToSeconds(timecodeRaw);

    const submitBtn = $('#btn-submit-feedback');
    submitBtn.disabled = true;

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('feedback').insert({
        project_id: currentProjectId,
        timestamp_sec: timestampSec,
        comment,
        author,
        resolved: false
      });

      if (error) throw error;

      showToast('success', 'Catatan revisi berhasil disimpan!');
      form.reset();
      if (authorInput) authorInput.value = author;

      await loadFeedback();

    } catch (err) {
      console.error('[Feedback] Error adding:', err);
      showToast('error', 'Gagal menambahkan catatan revisi.');
    } finally {
      submitBtn.disabled = false;
    }
  });
}
