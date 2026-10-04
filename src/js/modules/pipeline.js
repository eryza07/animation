/**
 * ==============================================================================
 * COMMUNITY ANIMATION HUB: Pipeline & Kanban Board Module
 * File: src/js/modules/pipeline.js
 * ==============================================================================
 */

import { $, $$, escapeHtml } from '../utils/dom.js';
import { getSupabase, subscribeTable } from '../api/supabase.js';
import { CONFIG } from '../config.js';
import { showToast } from '../components/toast.js';
import { Modal } from '../components/modal.js';

let allProjects = [];
let allScenes = [];
let newProjectModal = null;
let statusChangeModal = null;
let selectedProjectForStatus = null;

/**
 * Initialize Pipeline Kanban Page
 */
export async function initPipelinePage() {
  setupModals();
  await loadPipelineData();
  setupRealtimePipeline();
  setupFilters();
}

/**
 * Load Projects and Scenes from Supabase
 */
async function loadPipelineData() {
  const board = $('#kanban-board');
  if (board) {
    // Show loading state across columns
    CONFIG.PIPELINE_STAGES.forEach(stage => {
      const colList = $(`#column-list-${stage.id}`);
      if (colList) {
        colList.innerHTML = `<div class="glass-card p-4 rounded-xl skeleton h-32"></div>`;
      }
    });
  }

  try {
    const supabase = getSupabase();
    const { data: projects, error: projErr } = await supabase.from('projects').select('*');
    const { data: scenes, error: scnErr } = await supabase.from('scenes').select('*');

    if (projErr) throw projErr;
    if (projects) allProjects = projects;
    if (scenes) allScenes = scenes;

    renderKanbanBoard();
  } catch (err) {
    console.error('[Pipeline] Error loading data:', err);
    showToast('error', 'Gagal memuat status pipeline proyek.');
  }
}

/**
 * Realtime Subscription for Projects & Scenes
 */
function setupRealtimePipeline() {
  // Subscribe to project updates / inserts / deletes
  subscribeTable(
    'projects',
    (newProj) => {
      if (!allProjects.some(p => p.id === newProj.id)) {
        allProjects.push(newProj);
        renderKanbanBoard();
      }
    },
    (updatedProj) => {
      allProjects = allProjects.map(p => p.id === updatedProj.id ? updatedProj : p);
      renderKanbanBoard();
      showToast('info', `Status proyek "${updatedProj.title}" diperbarui!`);
    },
    (deletedProj) => {
      allProjects = allProjects.filter(p => p.id !== deletedProj.id);
      renderKanbanBoard();
    }
  );

  // Subscribe to scenes to update progress bars
  subscribeTable(
    'scenes',
    (newScene) => {
      allScenes.push(newScene);
      renderKanbanBoard();
    },
    (updatedScene) => {
      allScenes = allScenes.map(s => s.id === updatedScene.id ? updatedScene : s);
      renderKanbanBoard();
    },
    (deletedScene) => {
      allScenes = allScenes.filter(s => s.id !== deletedScene.id);
      renderKanbanBoard();
    }
  );
}

/**
 * Render all 6 columns of the Kanban Board
 */
function renderKanbanBoard(filteredProjects = null) {
  const projectsToRender = filteredProjects || allProjects;

  CONFIG.PIPELINE_STAGES.forEach(stage => {
    const colList = $(`#column-list-${stage.id}`);
    const colCount = $(`#column-count-${stage.id}`);
    if (!colList) return;

    const stageProjects = projectsToRender.filter(p => p.status === stage.id);

    if (colCount) {
      colCount.textContent = stageProjects.length;
    }

    if (stageProjects.length === 0) {
      colList.innerHTML = `
        <div class="p-6 text-center rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs">
          Tidak ada proyek di tahap ${escapeHtml(stage.label)}.
        </div>
      `;
      return;
    }

    colList.innerHTML = stageProjects.map(proj => {
      const projScenes = allScenes.filter(s => s.project_id === proj.id);
      const totalScenes = projScenes.length;
      const doneScenes = projScenes.filter(s => s.is_done).length;
      const progressPct = totalScenes > 0 ? Math.round((doneScenes / totalScenes) * 100) : 0;

      return `
        <article class="glass-card rounded-2xl overflow-hidden border border-slate-800/80 hover:border-indigo-500/40 transition-all duration-200 group flex flex-col justify-between">
          <!-- Thumbnail cover -->
          <div class="relative h-28 bg-slate-900 overflow-hidden">
            <img src="${proj.cover_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600'}" 
                 alt="${escapeHtml(proj.title)}" 
                 class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80" />
            <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
            
            <!-- Quick Move Status Button -->
            <button data-change-status-id="${proj.id}" title="Ubah status tahap"
                    class="btn-open-status-modal absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-950/80 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700/60 text-xs transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
            </button>
          </div>

          <!-- Content Details -->
          <div class="p-4 space-y-3 flex-1 flex flex-col justify-between">
            <div class="space-y-1">
              <h4 class="font-heading font-bold text-sm text-white group-hover:text-indigo-300 transition-colors line-clamp-2">
                ${escapeHtml(proj.title)}
              </h4>
              <p class="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                ${escapeHtml(proj.description || 'Tidak ada deskripsi.')}
              </p>
            </div>

            <!-- Scene Progress Bar -->
            <div class="space-y-1 pt-2 border-t border-slate-800/80">
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-slate-400">Scene Selesai</span>
                <span class="font-mono font-semibold text-indigo-400">${doneScenes}/${totalScenes} (${progressPct}%)</span>
              </div>
              <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-300" style="width: ${progressPct}%"></div>
              </div>
            </div>

            <!-- Coordinator & Action Link -->
            <div class="pt-2 flex items-center justify-between gap-2 text-xs">
              <span class="text-[11px] text-slate-400 truncate">
                Koord: <strong class="text-slate-300 font-medium">${escapeHtml(proj.coordinator_name || 'Community')}</strong>
              </span>

              <a href="project-detail.html?slug=${encodeURIComponent(proj.slug)}" 
                 class="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-indigo-600 text-slate-200 hover:text-white text-[11px] font-semibold transition-colors flex items-center gap-1 shrink-0">
                Detail →
              </a>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Attach listeners to quick status buttons
    $$('.btn-open-status-modal', colList).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const projId = btn.getAttribute('data-change-status-id');
        openStatusChangeModal(projId);
      });
    });
  });
}

/**
 * Setup Modals (Create Project & Change Status)
 */
function setupModals() {
  const newModalEl = $('#modal-create-project');
  if (newModalEl) {
    newProjectModal = new Modal(newModalEl);
    const openBtn = $('#btn-open-create-project');
    if (openBtn) {
      openBtn.addEventListener('click', () => newProjectModal.open());
    }

    // Form submission
    const form = $('#form-create-project');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleCreateProject(form);
      });
    }
  }

  const statusModalEl = $('#modal-change-status');
  if (statusModalEl) {
    statusChangeModal = new Modal(statusModalEl);

    const form = $('#form-change-status');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleStatusChange(form);
      });
    }
  }
}

/**
 * Handle Creating a New Project
 */
async function handleCreateProject(form) {
  const title = $('#new-proj-title').value.trim();
  const description = $('#new-proj-desc').value.trim();
  const coverUrl = $('#new-proj-cover').value.trim();
  const coordinatorName = $('#new-proj-coordinator').value.trim() || 'Community';
  const initialStatus = $('#new-proj-status').value;

  if (!title) {
    showToast('warning', 'Judul proyek wajib diisi.');
    return;
  }

  // Generate URL slug: "Cyber Samurai 2026" -> "cyber-samurai-2026"
  const slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .concat('-' + Math.floor(100 + Math.random() * 900));

  const supabase = getSupabase();
  const submitBtn = $('#btn-submit-new-project');
  submitBtn.disabled = true;

  try {
    const { data, error } = await supabase.from('projects').insert({
      slug,
      title,
      description,
      status: initialStatus,
      cover_url: coverUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600',
      coordinator_name: coordinatorName
    });

    if (error) throw error;

    showToast('success', `Proyek "${title}" berhasil ditambahkan ke Pipeline!`);
    form.reset();
    newProjectModal.close();

    // Reload data if not automatically updated by realtime
    await loadPipelineData();

  } catch (err) {
    console.error('[CreateProject] Error:', err);
    showToast('error', 'Gagal membuat proyek baru: ' + err.message);
  } finally {
    submitBtn.disabled = false;
  }
}

/**
 * Open Status Change Modal
 */
function openStatusChangeModal(projectId) {
  const proj = allProjects.find(p => p.id === projectId);
  if (!proj || !statusChangeModal) return;

  selectedProjectForStatus = proj;
  const titleEl = $('#change-status-proj-title');
  const selectEl = $('#change-status-select');

  if (titleEl) titleEl.textContent = proj.title;
  if (selectEl) selectEl.value = proj.status;

  statusChangeModal.open();
}

/**
 * Handle Submitting Status Change
 */
async function handleStatusChange(form) {
  if (!selectedProjectForStatus) return;

  const newStatus = $('#change-status-select').value;
  const supabase = getSupabase();
  const submitBtn = $('#btn-submit-change-status');
  submitBtn.disabled = true;

  try {
    const { error } = await supabase
      .from('projects')
      .update({ status: newStatus })
      .eq('id', selectedProjectForStatus.id);

    if (error) throw error;

    showToast('success', `Status proyek berhasil dipindahkan ke "${newStatus.toUpperCase()}".`);
    statusChangeModal.close();

    // Optimistic local update
    selectedProjectForStatus.status = newStatus;
    renderKanbanBoard();

  } catch (err) {
    console.error('[StatusChange] Error:', err);
    showToast('error', 'Gagal memperbarui status proyek.');
  } finally {
    submitBtn.disabled = false;
  }
}

/**
 * Search and Filter Projects in Kanban
 */
function setupFilters() {
  const searchInput = $('#search-pipeline');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (!query) {
        renderKanbanBoard();
        return;
      }

      const filtered = allProjects.filter(p => 
        (p.title || '').toLowerCase().includes(query) ||
        (p.description || '').toLowerCase().includes(query) ||
        (p.coordinator_name || '').toLowerCase().includes(query)
      );

      renderKanbanBoard(filtered);
    });
  }
}
