/**
 * ==============================================================================
 * COMMUNITY ANIMATION HUB: Auto-Credits Generator Module
 * File: src/js/modules/credits.js
 * ==============================================================================
 */

import { $, escapeHtml } from '../utils/dom.js';
import { getSupabase } from '../api/supabase.js';
import { showToast } from '../components/toast.js';
import { Modal } from '../components/modal.js';

let creditsModal = null;
let generatedText = '';

/**
 * Initialize Auto-Credits Generator
 */
export function initCreditsModule(project) {
  const modalEl = $('#modal-auto-credits');
  if (modalEl) {
    creditsModal = new Modal(modalEl);
    const triggerBtn = $('#btn-generate-credits');
    if (triggerBtn) {
      triggerBtn.addEventListener('click', async () => {
        await generateCreditsForProject(project);
      });
    }

    const copyBtn = $('#btn-copy-credits');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        if (!generatedText) return;
        navigator.clipboard.writeText(generatedText).then(() => {
          showToast('success', 'Teks kredit berhasil disalin ke clipboard!');
        }).catch(() => {
          showToast('error', 'Gagal menyalin teks ke clipboard.');
        });
      });
    }
  }
}

/**
 * Aggregate Contributors and Generate Text
 */
async function generateCreditsForProject(project) {
  if (!project) return;

  const outputEl = $('#credits-output-text');
  if (outputEl) {
    outputEl.textContent = 'Mengumpulkan data kontributor dari database...';
  }
  creditsModal.open();

  try {
    const supabase = getSupabase();

    // 1. Fetch Members
    const { data: members } = await supabase.from('project_members').select('*');
    const projMembers = members ? members.filter(m => m.project_id === project.id) : [];

    // 2. Fetch Scenes Assignees
    const { data: scenes } = await supabase.from('scenes').select('*');
    const projScenes = scenes ? scenes.filter(s => s.project_id === project.id) : [];

    // 3. Fetch Render Volunteers
    const { data: renders } = await supabase.from('render_requests').select('*');
    const projRenders = renders ? renders.filter(r => r.project_id === project.id && r.claimed_by) : [];

    // Grouping by departments
    const rolesMap = {
      'Project Coordinator & Director': [project.coordinator_name || 'Community Leader'],
      'Story & Concept': [],
      'Lead Animators': [],
      'Scene Animators': [],
      '3D Rigging & Modeling': [],
      'Relay Render Volunteers': [],
      'Audio & Sound FX': [],
      'Special Thanks': []
    };

    // Populate from project_members
    projMembers.forEach(m => {
      const roleLower = (m.role || '').toLowerCase();
      if (roleLower.includes('lead')) {
        rolesMap['Lead Animators'].push(m.member_name);
      } else if (roleLower.includes('rig') || roleLower.includes('model')) {
        rolesMap['3D Rigging & Modeling'].push(m.member_name);
      } else if (roleLower.includes('audio') || roleLower.includes('sound')) {
        rolesMap['Audio & Sound FX'].push(m.member_name);
      } else if (roleLower.includes('story')) {
        rolesMap['Story & Concept'].push(m.member_name);
      } else {
        rolesMap['Scene Animators'].push(m.member_name);
      }
    });

    // Populate from scene assignees
    projScenes.forEach(s => {
      if (s.assignee && s.assignee !== 'Unassigned') {
        rolesMap['Scene Animators'].push(s.assignee);
      }
    });

    // Populate from render volunteers
    projRenders.forEach(r => {
      if (r.claimed_by) {
        rolesMap['Relay Render Volunteers'].push(r.claimed_by);
      }
    });

    // Clean & Deduplicate arrays
    for (const key of Object.keys(rolesMap)) {
      rolesMap[key] = Array.from(new Set(rolesMap[key].filter(Boolean)));
    }

    // Format text
    const lines = [];
    lines.push(`=================================================`);
    lines.push(`🎬 ${project.title.toUpperCase()}`);
    lines.push(`Produced by Community Animation Hub Studio`);
    lines.push(`=================================================\n`);

    for (const [dept, people] of Object.entries(rolesMap)) {
      if (people.length > 0) {
        lines.push(`--- ${dept.toUpperCase()} ---`);
        people.forEach(person => {
          lines.push(`• ${person}`);
        });
        lines.push('');
      }
    }

    lines.push(`--- SPECIAL THANKS ---`);
    lines.push(`• Komunitas Animator Indonesia`);
    lines.push(`• All Render Relay PC Contributors`);
    lines.push(`• Generated automatically by Community Animation Hub (2026)`);

    generatedText = lines.join('\n');

    if (outputEl) {
      outputEl.textContent = generatedText;
    }

  } catch (err) {
    console.error('[Credits] Error generating:', err);
    if (outputEl) {
      outputEl.textContent = 'Gagal menghasilkan kredit otomatis.';
    }
  }
}
