/**
 * ==============================================================================
 * COMMUNITY ANIMATION HUB: Lightweight Identity & Device Fingerprint
 * File: src/js/utils/identity.js
 * ==============================================================================
 */

const VOTER_ID_KEY = 'cah_voter_id';
const USERNAME_KEY = 'cah_user_name';
const PIN_KEY = 'cah_coordinator_pin';

/**
 * Generate a standard UUID v4
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Get or initialize persistent voter identity
 */
export function getVoterId() {
  let voterId = localStorage.getItem(VOTER_ID_KEY);
  if (!voterId) {
    voterId = 'voter_' + generateUUID();
    localStorage.setItem(VOTER_ID_KEY, voterId);
  }
  return voterId;
}

/**
 * Get or set the local contributor name
 */
export function getUserName() {
  return localStorage.getItem(USERNAME_KEY) || 'Animator Sahabat';
}

export function setUserName(name) {
  if (name && typeof name === 'string') {
    localStorage.setItem(USERNAME_KEY, name.trim());
  }
}

/**
 * Simple Coordinator PIN management for MVP pipeline protection
 */
export function getSavedCoordinatorPin() {
  return localStorage.getItem(PIN_KEY) || '';
}

export function saveCoordinatorPin(pin) {
  localStorage.setItem(PIN_KEY, String(pin).trim());
}
