/**
 * ==============================================================================
 * COMMUNITY ANIMATION HUB: DOM & Sanitization Helpers
 * File: src/js/utils/dom.js
 * ==============================================================================
 */

/**
 * Query selector shortcut
 */
export const $ = (selector, parent = document) => parent.querySelector(selector);

/**
 * Query selector all shortcut (returns array)
 */
export const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

/**
 * Escape HTML special characters to prevent XSS attacks
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Create element with classes, attributes, and innerHTML
 */
export function createElement(tag, { className = '', attributes = {}, html = '', text = '' } = {}) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  for (const [key, value] of Object.entries(attributes)) {
    el.setAttribute(key, value);
  }
  if (text) el.textContent = text;
  else if (html) el.innerHTML = html;
  return el;
}

/**
 * Debounce function for smooth search input handling
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
