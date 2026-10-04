/**
 * ==============================================================================
 * COMMUNITY ANIMATION HUB: Asset Handoff Module
 * File: src/js/modules/handoff.js
 * ==============================================================================
 */

import { $, $$, escapeHtml } from '../utils/dom.js';
import { getSupabase, subscribeTable } from '../api/supabase.js';
import { showToast } from '../components/toast.js';
import { formatDate } from '../utils/format.js';
import { Modal } from '../components/modal.js';

let currentHandoffs = [];
let handoffModal = null;
let currentProjectId = null;

/**
 * Initialize Handoff Section for a Project
 */
export async function initHandoffModule(projectId) {
  currentProjectId = projectId;
  setupHandoffModal();
  await loadHandoffs();
  setupRealtimeHandoffs();
}

/**
 * Load Handoffs from Supabase
 */
async function loadHandoffs() {
  const container = $('#handoff-list-container');
  if (!container || !currentProjectId) return;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('handoffs')
      .select('*');

    if (error) throw error;

    currentHandoffs = data ? data.filter(h => h.project_id === currentProjectId) : [];
    renderHandoffs();

  } catch (err) {
    console.error('[Handoff] Error loading:', err);
    if (container) {
      container.innerHTML = `<div class="text-rose-400 text-xs py-2">Gagal memuat riwayat serah terima aset.</div>`;
    }
  }
}

/**
 * Setup Realtime Subscription for Handoffs
 */
function setupRealtimeHandoffs() {
  subscribeTable(
    'handoffs',
    (newHandoff) => {
      if (newHandoff.project_id === currentProjectId) {
        if (!currentHandoffs.some(h => h.id === newHandoff.id)) {
          currentHandoffs.unshift(newHandoff);
          renderHandoffs();
          showToast('info', `Serah terima aset baru dicatat dari ${newHandoff.from_member}!`);
        }
      }
    },
    (updatedHandoff) => {
      if (updatedHandoff.project_id === currentProjectId) {
        currentHandoffs = currentHandoffs.map(h => h.id === updatedHandoff.id ? updatedHandoff : h);
        renderHandoffs();
      }
    }
  );
}

/**
 * Render Handoffs List
 */
function renderHandoffs() {
  const container = $('#handoff-list-container');
  if (!container) return;

  if (currentHandoffs.length === 0) {
    container.innerHTML = `
      <div class="p-6 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-slate-500 text-xs">
        Belum ada serah terima aset mentah tercatat untuk proyek ini.
      </div>
    `;
    return;
  }

  container.innerHTML = currentHandoffs.map(h => {
    const isReceived = h.status === 'received';
    const dateStr = formatDate(h.created_at);

    return `
      <div class="glass-card p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border border-slate-800">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="font-bold text-white">${escapeHtml(h.from_member)}</span>
            <span class="text-slate-500">➔</span>
            <span class="font-bold text-indigo-300">${escapeHtml(h.to_member)}</span>
            <span class="text-[10px] text-slate-500 font-mono ml-2">(${dateStr})</span>
          </div>
          ${h.note ? `<p class="text-slate-400">${escapeHtml(h.note)}</p>` : ''}
          <div class="pt-0.5">
            <a href="${escapeHtml(h.gdrive_url)}" target="_blank" rel="noopener noreferrer" 
               class="text-indigo-400 hover:text-indigo-300 font-semibold underline inline-flex items-center gap-1">
              <span>Buka Google Drive File</span>
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            </a>
          </div>
        </div>

        <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button data-handoff-id="${h.id}" data-current-status="${h.status}"
                  class="btn-toggle-handoff px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isReceived 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-emerald-500/20'
                  }">
            ${isReceived ? '✓ Sudah Diterima' : 'Tandai Diterima'}
          </button>
        </div>
      </div>
    `;
  }).join('');

  $$('.btn-toggle-handoff', container).forEach(btn => {
    btn.addEventListener('click', async () => {
      const handoffId = btn.getAttribute('data-handoff-id');
      const currentStatus = btn.getAttribute('data-current-status');
      const newStatus = currentStatus === 'sent' ? 'received' : 'sent';
      await toggleHandoffStatus(handoffId, newStatus);
    });
  });
}

/**
 * Toggle Handoff Status (sent <-> received)
 */
async function toggleHandoffStatus(handoffId, newStatus) {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('handoffs')
      .update({ status: newStatus })
      .eq('id', handoffId);

    if (error) throw error;

    const target = currentHandoffs.find(h => h.id === handoffId);
    if (target) target.status = newStatus;
    renderHandoffs();

    showToast('success', `Status serah terima diperbarui ke "${newStatus}".`);
  } catch (err) {
    console.error('[Handoff] Error updating status:', err);
    showToast('error', 'Gagal memperbarui status handoff.');
  }
}

/**
 * Setup Handoff Modal
 */
function setupHandoffModal() {
  const modalEl = $('#modal-add-handoff');
  if (modalEl) {
    handoffModal = new Modal(modalEl);
    const openBtn = $('#btn-open-add-handoff');
    if (openBtn) {
      openBtn.addEventListener('click', () => handoffModal.open());
    }

    const form = $('#form-add-handoff');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAddHandoff(form);
      });
    }
  }
}

/**
 * Submit New Handoff Record
 */
async function handleAddHandoff(form) {
  const fromMember = $('#handoff-from').value.trim();
  const toMember = $('#handoff-to').value.trim();
  const gdriveUrl = $('#handoff-gdrive').value.trim();
  const note = $('#handoff-note').value.trim();

  if (!fromMember || !toMember || !gdriveUrl) {
    showToast('warning', 'Pengirim, penerima, dan link Google Drive wajib diisi.');
    return;
  }

  // Validate GDrive URL
  if (!gdriveUrl.includes('drive.google.com')) {
    showToast('warning', 'Pastikan link adalah URL Google Drive yang valid.');
    return;
  }

  const submitBtn = $('#btn-submit-handoff');
  submitBtn.disabled = true;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('handoffs').insert({
      project_id: currentProjectId,
      from_member: fromMember,
      to_member: toMember,
      gdrive_url: gdriveUrl,
      note,
      status: 'sent'
    });

    if (error) throw error;

    showToast('success', 'Serah terima file berhasil dicatat!');
    form.reset();
    handoffModal.close();

    // Reload
    await loadHandoffs();

  } catch (err) {
    console.error('[Handoff] Error creating:', err);
    showToast('error', 'Gagal mencatat serah terima aset.');
  } finally {
    submitBtn.disabled = false;
  }
}
