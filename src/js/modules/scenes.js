/**
 * ==============================================================================
 * COMMUNITY ANIMATION HUB: Project Detail & Scene Checklist Module
 * File: src/js/modules/scenes.js
 * ==============================================================================
 */

import { $, $$, escapeHtml } from '../utils/dom.js';
import { getSupabase, subscribeTable } from '../api/supabase.js';
import { showToast } from '../components/toast.js';
import { Modal } from '../components/modal.js';
import { formatDate } from '../utils/format.js';
import { initHandoffModule } from './handoff.js';
import { initRelayModule } from './relay.js';
import { initFeedbackModule } from './feedback.js';
import { initCreditsModule } from './credits.js';

let currentProject = null;
let currentScenes = [];
let currentMembers = [];
let addSceneModal = null;
let addMemberModal = null;

/**
 * Initialize Project Detail Page
 */
export async function initProjectDetailPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug');

  if (!slug) {
    renderNotFound('Parameter slug proyek tidak ditemukan di URL.');
    return;
  }

  setupModals();
  await loadProjectDetail(slug);
  setupRealtimeDetail();
}

/**
 * Load Project, Scenes, and Members
 */
async function loadProjectDetail(slug) {
  try {
    const supabase = getSupabase();

    // 1. Fetch Project
    const { data: projects, error: projErr } = await supabase
      .from('projects')
      .select('*');

    if (projErr) throw projErr;

    currentProject = projects ? projects.find(p => p.slug === slug) : null;

    if (!currentProject) {
      renderNotFound(`Proyek dengan slug "${slug}" tidak ditemukan.`);
      return;
    }

    // 2. Fetch Scenes
    const { data: scenes, error: scnErr } = await supabase
      .from('scenes')
      .select('*');

    if (scnErr) throw scnErr;
    currentScenes = scenes ? scenes.filter(s => s.project_id === currentProject.id) : [];
    currentScenes.sort((a, b) => (Number(a.scene_no) || 0) - (Number(b.scene_no) || 0));

    // 3. Fetch Members
    const { data: members, error: memErr } = await supabase
      .from('project_members')
      .select('*');

    if (!memErr && members) {
      currentMembers = members.filter(m => m.project_id === currentProject.id);
    }

    renderProjectHeader();
    renderSceneChecklist();
    renderMembersList();

    // Initialize Collaboration Modules
    initHandoffModule(currentProject.id);
    initRelayModule(currentProject.id);
    initFeedbackModule(currentProject.id);
    initCreditsModule(currentProject);

  } catch (err) {
    console.error('[ProjectDetail] Error loading detail:', err);
    renderNotFound('Gagal memuat detail proyek. Silakan coba kembali.');
  }
}

/**
 * Setup Realtime Listeners for this Project
 */
function setupRealtimeDetail() {
  if (!currentProject) return;

  // Realtime scenes
  subscribeTable(
    'scenes',
    (newScene) => {
      if (newScene.project_id === currentProject.id) {
        if (!currentScenes.some(s => s.id === newScene.id)) {
          currentScenes.push(newScene);
          currentScenes.sort((a, b) => (Number(a.scene_no) || 0) - (Number(b.scene_no) || 0));
          renderSceneChecklist();
          updateProgressBar();
        }
      }
    },
    (updatedScene) => {
      if (updatedScene.project_id === currentProject.id) {
        currentScenes = currentScenes.map(s => s.id === updatedScene.id ? updatedScene : s);
        renderSceneChecklist();
        updateProgressBar();
      }
    },
    (deletedScene) => {
      currentScenes = currentScenes.filter(s => s.id !== deletedScene.id);
      renderSceneChecklist();
      updateProgressBar();
    }
  );

  // Realtime project status changes
  subscribeTable(
    'projects',
    null,
    (updatedProj) => {
      if (updatedProj.id === currentProject.id) {
        currentProject = updatedProj;
        renderProjectHeader();
      }
    }
  );
}

/**
 * Render Project Header & Status
 */
function renderProjectHeader() {
  if (!currentProject) return;

  const titleEl = $('#proj-detail-title');
  const descEl = $('#proj-detail-desc');
  const badgeEl = $('#proj-detail-badge');
  const coordEl = $('#proj-detail-coord');
  const dateEl = $('#proj-detail-date');
  const coverBg = $('#proj-detail-cover');

  if (titleEl) titleEl.textContent = currentProject.title;
  if (descEl) descEl.textContent = currentProject.description || 'Tidak ada deskripsi.';
  if (coordEl) coordEl.textContent = currentProject.coordinator_name || 'Community';
  if (dateEl) dateEl.textContent = formatDate(currentProject.created_at);

  if (badgeEl) {
    badgeEl.className = `badge-pipeline badge-${currentProject.status}`;
    badgeEl.textContent = currentProject.status.toUpperCase();
  }

  if (coverBg && currentProject.cover_url) {
    coverBg.style.backgroundImage = `url('${currentProject.cover_url}')`;
  }

  updateProgressBar();
}

/**
 * Update Scene Progress Bar & Percentage
 */
function updateProgressBar() {
  const total = currentScenes.length;
  const done = currentScenes.filter(s => s.is_done).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const barEl = $('#proj-progress-bar');
  const textEl = $('#proj-progress-text');
  const countEl = $('#proj-progress-count');

  if (barEl) barEl.style.width = `${pct}%`;
  if (textEl) textEl.textContent = `${pct}%`;
  if (countEl) countEl.textContent = `${done} dari ${total} scene selesai`;
}

/**
 * Render Interactive Scene Checklist
 */
function renderSceneChecklist() {
  const container = $('#scenes-list-container');
  if (!container) return;

  if (currentScenes.length === 0) {
    container.innerHTML = `
      <div class="py-12 px-6 text-center glass-card rounded-2xl border border-dashed border-slate-800 space-y-3">
        <div class="w-12 h-12 mx-auto rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        </div>
        <h4 class="font-heading font-semibold text-white">Belum Ada Scene</h4>
        <p class="text-xs text-slate-400 max-w-sm mx-auto">
          Proyek ini belum memiliki checklist scene. Tambahkan scene pertama untuk mulai memantau progres animasi!
        </p>
        <button id="btn-empty-add-scene" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors">
          + Tambah Scene Pertama
        </button>
      </div>
    `;

    const emptyBtn = $('#btn-empty-add-scene');
    if (emptyBtn && addSceneModal) {
      emptyBtn.addEventListener('click', () => addSceneModal.open());
    }
    return;
  }

  container.innerHTML = currentScenes.map(scene => {
    return `
      <div class="glass-card p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 ${
        scene.is_done ? 'border-emerald-500/30 bg-emerald-950/10' : 'hover:border-slate-700'
      }">
        <!-- Left: Checkbox & Info -->
        <div class="flex items-start gap-4">
          <!-- Realtime Checkbox Toggle -->
          <label class="relative flex items-center cursor-pointer mt-0.5">
            <input type="checkbox" data-scene-id="${scene.id}" ${scene.is_done ? 'checked' : ''} 
                   class="scene-checkbox sr-only peer" />
            <div class="w-6 h-6 rounded-lg border-2 border-slate-600 peer-checked:border-emerald-500 peer-checked:bg-emerald-500 flex items-center justify-center transition-all">
              <svg class="w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </label>

          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                scene.is_done ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-300'
              }">
                Scene ${scene.scene_no}
              </span>
              <h4 class="font-heading font-semibold text-sm sm:text-base ${scene.is_done ? 'line-through text-slate-400' : 'text-white'}">
                ${escapeHtml(scene.title)}
              </h4>
            </div>

            ${scene.notes ? `<p class="text-xs text-slate-400 leading-relaxed">${escapeHtml(scene.notes)}</p>` : ''}
          </div>
        </div>

        <!-- Right: Assignee & Status -->
        <div class="flex items-center gap-3 self-end sm:self-center shrink-0">
          <div class="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <svg class="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            <span class="text-slate-300 font-medium">${escapeHtml(scene.assignee || 'Unassigned')}</span>
          </div>

          <span class="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full ${
            scene.is_done ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }">
            ${scene.is_done ? 'Selesai' : 'Pengerjaan'}
          </span>
        </div>
      </div>
    `;
  }).join('');

  // Attach click listener for instant checkbox toggling
  $$('.scene-checkbox', container).forEach(checkbox => {
    checkbox.addEventListener('change', async (e) => {
      const sceneId = checkbox.getAttribute('data-scene-id');
      const isDone = checkbox.checked;
      await handleToggleScene(sceneId, isDone);
    });
  });
}

/**
 * Handle Realtime Scene Toggle
 */
async function handleToggleScene(sceneId, isDone) {
  const scene = currentScenes.find(s => s.id === sceneId);
  if (!scene) return;

  // Optimistic UI update
  scene.is_done = isDone;
  renderSceneChecklist();
  updateProgressBar();

  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('scenes')
      .update({ is_done: isDone })
      .eq('id', sceneId);

    if (error) throw error;

    showToast(isDone ? 'success' : 'info', `Scene ${scene.scene_no} ditandai ${isDone ? 'selesai' : 'belum selesai'}.`);

  } catch (err) {
    console.error('[ToggleScene] Error:', err);
    // Rollback
    scene.is_done = !isDone;
    renderSceneChecklist();
    updateProgressBar();
    showToast('error', 'Gagal memperbarui status scene.');
  }
}

/**
 * Render Project Contributors / Members List
 */
function renderMembersList() {
  const container = $('#members-list-container');
  if (!container) return;

  if (currentMembers.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-4 text-center text-slate-500 text-xs">
        Belum ada anggota tim terdaftar.
      </div>
    `;
    return;
  }

  container.innerHTML = currentMembers.map(m => {
    return `
      <div class="glass-card p-3 rounded-xl flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-bold text-xs text-indigo-300">
          ${m.member_name.charAt(0).toUpperCase()}
        </div>
        <div class="min-w-0">
          <div class="text-xs font-semibold text-white truncate">${escapeHtml(m.member_name)}</div>
          <div class="text-[11px] text-slate-400">${escapeHtml(m.role || 'Contributor')}</div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Setup Modals (Add Scene & Add Member)
 */
function setupModals() {
  // Add Scene Modal
  const addSceneEl = $('#modal-add-scene');
  if (addSceneEl) {
    addSceneModal = new Modal(addSceneEl);
    const openBtn = $('#btn-open-add-scene');
    if (openBtn) {
      openBtn.addEventListener('click', () => addSceneModal.open());
    }

    const form = $('#form-add-scene');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAddScene(form);
      });
    }
  }

  // Add Member Modal
  const addMemberEl = $('#modal-add-member');
  if (addMemberEl) {
    addMemberModal = new Modal(addMemberEl);
    const openMemBtn = $('#btn-open-add-member');
    if (openMemBtn) {
      openMemBtn.addEventListener('click', () => addMemberModal.open());
    }

    const form = $('#form-add-member');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAddMember(form);
      });
    }
  }
}

/**
 * Add New Scene to Supabase
 */
async function handleAddScene(form) {
  if (!currentProject) return;

  const sceneNo = Number($('#scene-no').value) || (currentScenes.length + 1);
  const title = $('#scene-title').value.trim();
  const assignee = $('#scene-assignee').value.trim() || 'Unassigned';
  const notes = $('#scene-notes').value.trim();

  if (!title) {
    showToast('warning', 'Judul scene wajib diisi.');
    return;
  }

  const supabase = getSupabase();
  const submitBtn = $('#btn-submit-scene');
  submitBtn.disabled = true;

  try {
    const { data, error } = await supabase.from('scenes').insert({
      project_id: currentProject.id,
      scene_no: sceneNo,
      title,
      assignee,
      notes,
      is_done: false
    });

    if (error) throw error;

    showToast('success', `Scene ${sceneNo}: "${title}" berhasil ditambahkan!`);
    form.reset();
    addSceneModal.close();

    // Reload scenes
    const { data: scenes } = await supabase.from('scenes').select('*');
    if (scenes) {
      currentScenes = scenes.filter(s => s.project_id === currentProject.id);
      currentScenes.sort((a, b) => (Number(a.scene_no) || 0) - (Number(b.scene_no) || 0));
      renderSceneChecklist();
      updateProgressBar();
    }

  } catch (err) {
    console.error('[AddScene] Error:', err);
    showToast('error', 'Gagal menambahkan scene: ' + err.message);
  } finally {
    submitBtn.disabled = false;
  }
}

/**
 * Add New Member to Supabase
 */
async function handleAddMember(form) {
  if (!currentProject) return;

  const memberName = $('#member-name').value.trim();
  const role = $('#member-role').value.trim();

  if (!memberName || !role) {
    showToast('warning', 'Nama anggota dan divisi/peran wajib diisi.');
    return;
  }

  const supabase = getSupabase();
  const submitBtn = $('#btn-submit-member');
  submitBtn.disabled = true;

  try {
    const { data, error } = await supabase.from('project_members').insert({
      project_id: currentProject.id,
      member_name: memberName,
      role
    });

    if (error) throw error;

    showToast('success', `${memberName} ditambahkan sebagai ${role}!`);
    form.reset();
    addMemberModal.close();

    // Reload members
    const { data: members } = await supabase.from('project_members').select('*');
    if (members) {
      currentMembers = members.filter(m => m.project_id === currentProject.id);
      renderMembersList();
    }

  } catch (err) {
    console.error('[AddMember] Error:', err);
    showToast('error', 'Gagal menambahkan anggota.');
  } finally {
    submitBtn.disabled = false;
  }
}

/**
 * Render 404 / Not Found State
 */
function renderNotFound(message) {
  const main = $('main');
  if (main) {
    main.innerHTML = `
      <div class="py-20 text-center space-y-4 max-w-lg mx-auto">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        </div>
        <h2 class="text-2xl font-bold font-heading text-white">Proyek Tidak Ditemukan</h2>
        <p class="text-sm text-slate-400">${escapeHtml(message)}</p>
        <div class="pt-4">
          <a href="projects.html" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors">
            ← Kembali ke Pipeline Kanban
          </a>
        </div>
      </div>
    `;
  }
}
