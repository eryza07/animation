/**
 * ==============================================================================
 * COMMUNITY ANIMATION HUB: Relay Render Hub Module
 * File: src/js/modules/relay.js
 * ==============================================================================
 */

import { $, $$, escapeHtml } from '../utils/dom.js';
import { getSupabase, subscribeTable } from '../api/supabase.js';
import { showToast } from '../components/toast.js';
import { Modal } from '../components/modal.js';
import { getUserName } from '../utils/identity.js';

let currentRequests = [];
let relayModal = null;
let currentProjectId = null;

/**
 * Initialize Relay Render Hub
 */
export async function initRelayModule(projectId) {
  currentProjectId = projectId;
  setupRelayModal();
  await loadRenderRequests();
  setupRealtimeRelay();
}

/**
 * Load Render Requests for this Project
 */
async function loadRenderRequests() {
  const container = $('#relay-list-container');
  if (!container || !currentProjectId) return;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('render_requests')
      .select('*');

    if (error) throw error;

    currentRequests = data ? data.filter(r => r.project_id === currentProjectId) : [];
    renderRequestsList();

  } catch (err) {
    console.error('[Relay] Error loading:', err);
    if (container) {
      container.innerHTML = `<div class="text-rose-400 text-xs py-2">Gagal memuat antrean render relay.</div>`;
    }
  }
}

/**
 * Setup Realtime Listener for Relay Requests
 */
function setupRealtimeRelay() {
  subscribeTable(
    'render_requests',
    (newReq) => {
      if (newReq.project_id === currentProjectId) {
        if (!currentRequests.some(r => r.id === newReq.id)) {
          currentRequests.unshift(newReq);
          renderRequestsList();
          showToast('info', `Permintaan render baru: "${newReq.scene_title}"!`);
        }
      }
    },
    (updatedReq) => {
      if (updatedReq.project_id === currentProjectId) {
        currentRequests = currentRequests.map(r => r.id === updatedReq.id ? updatedReq : r);
        renderRequestsList();
      }
    }
  );
}

/**
 * Render List of Render Requests
 */
function renderRequestsList() {
  const container = $('#relay-list-container');
  if (!container) return;

  if (currentRequests.length === 0) {
    container.innerHTML = `
      <div class="p-6 text-center rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-slate-500 text-xs">
        Belum ada permintaan bantuan render untuk proyek ini.
      </div>
    `;
    return;
  }

  container.innerHTML = currentRequests.map(req => {
    const statusBadge = getStatusBadge(req.status);
    const isOpen = req.status === 'open';
    const isClaimed = req.status === 'claimed';
    const isRendering = req.status === 'rendering';
    const isDone = req.status === 'done';

    return `
      <div class="glass-card p-4 rounded-xl space-y-3 border border-slate-800 text-xs">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="space-y-0.5">
            <div class="flex items-center gap-2">
              <h4 class="font-heading font-bold text-white text-sm">
                ${escapeHtml(req.scene_title || 'Permintaan Render Scene')}
              </h4>
              ${statusBadge}
            </div>
            <div class="text-[11px] text-slate-400">
              Spesifikasi: <strong class="text-indigo-300 font-mono">${escapeHtml(req.specs)}</strong>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 shrink-0">
            ${isOpen ? `
              <button data-claim-id="${req.id}" class="btn-claim-render px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-all shadow-md shadow-purple-600/30">
                ✋ Ambil Render (Claim)
              </button>
            ` : ''}

            ${isClaimed ? `
              <button data-advance-id="${req.id}" data-next-status="rendering" class="btn-advance-status px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30">
                ▶ Mulai Render
              </button>
            ` : ''}

            ${isRendering ? `
              <button data-advance-id="${req.id}" data-next-status="done" class="btn-advance-status px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30">
                ✓ Selesai Render
              </button>
            ` : ''}
          </div>
        </div>

        ${req.claimed_by ? `
          <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Volunteer Render: <strong class="text-slate-200">${escapeHtml(req.claimed_by)}</strong></span>
            ${req.result_url ? `
              <a href="${escapeHtml(req.result_url)}" target="_blank" class="text-emerald-400 font-semibold underline">
                Unduh Hasil Render ↗
              </a>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  // Attach Claim handler
  $$('.btn-claim-render', container).forEach(btn => {
    btn.addEventListener('click', async () => {
      const reqId = btn.getAttribute('data-claim-id');
      await handleClaimRender(reqId);
    });
  });

  // Attach Status advance handler
  $$('.btn-advance-status', container).forEach(btn => {
    btn.addEventListener('click', async () => {
      const reqId = btn.getAttribute('data-advance-id');
      const nextStatus = btn.getAttribute('data-next-status');
      await handleAdvanceStatus(reqId, nextStatus);
    });
  });
}

/**
 * Handle Atomic Claim
 */
async function handleClaimRender(reqId) {
  const volunteerName = prompt('Masukkan nama Anda untuk mengklaim tugas render ini:', getUserName());
  if (!volunteerName || !volunteerName.trim()) return;

  try {
    const supabase = getSupabase();

    // Atomic update
    const { error } = await supabase
      .from('render_requests')
      .update({
        status: 'claimed',
        claimed_by: volunteerName.trim()
      })
      .eq('id', reqId);

    if (error) throw error;

    showToast('success', `Tugas render berhasil diklaim oleh ${volunteerName.trim()}!`);
    await loadRenderRequests();

  } catch (err) {
    console.error('[Relay] Error claiming:', err);
    showToast('error', 'Gagal mengklaim tugas render.');
  }
}

/**
 * Advance Render Request Status (rendering / done)
 */
async function handleAdvanceStatus(reqId, nextStatus) {
  let resultUrl = '';
  if (nextStatus === 'done') {
    resultUrl = prompt('Masukkan Link Google Drive hasil video/frame render:') || '';
  }

  try {
    const supabase = getSupabase();
    const updatePayload = { status: nextStatus };
    if (resultUrl) updatePayload.result_url = resultUrl.trim();

    const { error } = await supabase
      .from('render_requests')
      .update(updatePayload)
      .eq('id', reqId);

    if (error) throw error;

    showToast('success', `Status render berhasil diubah ke "${nextStatus.toUpperCase()}".`);
    await loadRenderRequests();

  } catch (err) {
    console.error('[Relay] Error advancing status:', err);
    showToast('error', 'Gagal memperbarui status render.');
  }
}

/**
 * Setup Relay Modal for Requesting Render
 */
function setupRelayModal() {
  const modalEl = $('#modal-add-relay');
  if (modalEl) {
    relayModal = new Modal(modalEl);
    const openBtn = $('#btn-open-add-relay');
    if (openBtn) {
      openBtn.addEventListener('click', () => relayModal.open());
    }

    const form = $('#form-add-relay');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAddRelayRequest(form);
      });
    }
  }
}

/**
 * Create New Render Request
 */
async function handleAddRelayRequest(form) {
  const sceneTitle = $('#relay-scene-title').value.trim();
  const specs = $('#relay-specs').value.trim();

  if (!sceneTitle || !specs) {
    showToast('warning', 'Judul scene dan spesifikasi render wajib diisi.');
    return;
  }

  const submitBtn = $('#btn-submit-relay');
  submitBtn.disabled = true;

  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('render_requests').insert({
      project_id: currentProjectId,
      scene_title: sceneTitle,
      specs: specs,
      status: 'open'
    });

    if (error) throw error;

    showToast('success', 'Permintaan render relay berhasil diposting!');
    form.reset();
    relayModal.close();

    await loadRenderRequests();

  } catch (err) {
    console.error('[Relay] Error creating request:', err);
    showToast('error', 'Gagal membuat permintaan render.');
  } finally {
    submitBtn.disabled = false;
  }
}

function getStatusBadge(status) {
  if (status === 'open') {
    return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">Open / Butuh Bantuan</span>`;
  }
  if (status === 'claimed') {
    return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">Claimed (Siap Render)</span>`;
  }
  if (status === 'rendering') {
    return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20 animate-pulse">Rendering in Progress</span>`;
  }
  if (status === 'done') {
    return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Render Selesai</span>`;
  }
  return '';
}
