/**
 * ==============================================================================
 * COMMUNITY ANIMATION HUB: Universal Modal Dialog Component
 * File: src/js/components/modal.js
 * ==============================================================================
 */

import { $, $$ } from '../utils/dom.js';

export class Modal {
  constructor(modalElementOrId) {
    this.el = typeof modalElementOrId === 'string' ? $(modalElementOrId) : modalElementOrId;
    this.isOpen = false;
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._initEvents();
  }

  _initEvents() {
    if (!this.el) return;

    // Close on backdrop click (elements with [data-close-modal])
    this.el.addEventListener('click', (e) => {
      if (e.target.hasAttribute('data-close-modal') || e.target === this.el) {
        this.close();
      }
    });
  }

  _handleKeyDown(e) {
    if (e.key === 'Escape' && this.isOpen) {
      this.close();
    }
  }

  open() {
    if (!this.el) return;
    this.el.classList.remove('hidden');
    // slight delay for CSS animation
    requestAnimationFrame(() => {
      this.el.classList.add('flex');
      this.el.classList.remove('opacity-0');
      this.el.classList.add('opacity-100');
    });

    document.body.classList.add('overflow-hidden');
    document.addEventListener('keydown', this._handleKeyDown);
    this.isOpen = true;

    // Focus first input if any
    const firstInput = this.el.querySelector('input, textarea, select');
    if (firstInput) firstInput.focus();
  }

  close() {
    if (!this.el) return;
    this.el.classList.add('opacity-0');
    this.el.classList.remove('opacity-100');

    setTimeout(() => {
      this.el.classList.add('hidden');
      this.el.classList.remove('flex');
      document.body.classList.remove('overflow-hidden');
      document.removeEventListener('keydown', this._handleKeyDown);
      this.isOpen = false;
    }, 200);
  }
}

/**
 * Helper to initialize all modal triggers on a page
 */
export function setupModalTriggers() {
  $$('[data-open-modal]').forEach(trigger => {
    const targetId = trigger.getAttribute('data-open-modal');
    const modalEl = $(targetId);
    if (modalEl) {
      const modal = new Modal(modalEl);
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        modal.open();
      });
    }
  });
}
