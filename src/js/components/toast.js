/**
 * ==============================================================================
 * COMMUNITY ANIMATION HUB: Global Toast Notification Component
 * File: src/js/components/toast.js
 * ==============================================================================
 */

import { createElement, $ } from '../utils/dom.js';

let container = null;

function ensureContainer() {
  if (!container || !document.body.contains(container)) {
    container = $('#toast-container');
    if (!container) {
      container = createElement('div', {
        attributes: { id: 'toast-container' },
        className: 'fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none max-w-sm w-full px-4'
      });
      document.body.appendChild(container);
    }
  }
  return container;
}

const ICONS = {
  success: `<svg class="w-5 h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  error: `<svg class="w-5 h-5 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  info: `<svg class="w-5 h-5 text-sky-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  warning: `<svg class="w-5 h-5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`
};

const BORDER_COLORS = {
  success: 'border-emerald-500/30 bg-emerald-950/40 text-emerald-200',
  error: 'border-rose-500/30 bg-rose-950/40 text-rose-200',
  info: 'border-sky-500/30 bg-sky-950/40 text-sky-200',
  warning: 'border-amber-500/30 bg-amber-950/40 text-amber-200'
};

/**
 * Show a floating toast message
 * @param {'success'|'error'|'info'|'warning'} type 
 * @param {string} message 
 * @param {number} durationMs 
 */
export function showToast(type = 'info', message = '', durationMs = 3500) {
  const cont = ensureContainer();
  const icon = ICONS[type] || ICONS.info;
  const colorClass = BORDER_COLORS[type] || BORDER_COLORS.info;

  const toast = createElement('div', {
    className: `toast-item pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur-xl shadow-xl transition-all duration-300 ${colorClass}`
  });

  toast.innerHTML = `
    ${icon}
    <div class="text-sm font-medium leading-snug flex-1">${message}</div>
    <button class="text-slate-400 hover:text-white shrink-0 ml-1 text-xs" aria-label="Tutup">✕</button>
  `;

  const closeBtn = toast.querySelector('button');
  const removeToast = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => toast.remove(), 300);
  };

  closeBtn.addEventListener('click', removeToast);

  cont.appendChild(toast);

  if (durationMs > 0) {
    setTimeout(removeToast, durationMs);
  }

  return toast;
}
