/**
 * ==============================================================================
 * COMMUNITY ANIMATION HUB: Storage & Caching Utilities (Stale-While-Revalidate)
 * File: src/js/utils/storage.js
 * ==============================================================================
 */

const STORAGE_PREFIX = 'cah_cache_';

/**
 * Save data to localStorage with a Time-To-Live (TTL)
 */
export function setCachedData(key, data, ttlMs = 5 * 60 * 1000) {
  try {
    const payload = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    };
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload));
  } catch (err) {
    console.warn('[Storage] Failed to save to localStorage:', err);
  }
}

/**
 * Get cached data with freshness status
 * Returns: { data: any, isFresh: boolean } or null if no cache exists
 */
export function getCachedData(key) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;

    const payload = JSON.parse(raw);
    const age = Date.now() - payload.timestamp;
    const isFresh = age < payload.ttl;

    return {
      data: payload.data,
      isFresh,
      age
    };
  } catch (err) {
    console.warn('[Storage] Failed to read from localStorage:', err);
    return null;
  }
}

/**
 * Remove cached item
 */
export function removeCachedData(key) {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch (err) {
    console.warn('[Storage] Failed to remove cache:', err);
  }
}

/**
 * Stale-While-Revalidate wrapper:
 * Returns cached data immediately if available, while executing fetcher in background
 */
export async function withCache(key, fetcherFn, ttlMs = 5 * 60 * 1000, onBackgroundUpdate = null) {
  const cached = getCachedData(key);

  if (cached && cached.isFresh) {
    return cached.data;
  }

  // If we have stale data, return it immediately and revalidate in background
  if (cached && !cached.isFresh) {
    // Background revalidation
    fetcherFn().then(freshData => {
      setCachedData(key, freshData, ttlMs);
      if (typeof onBackgroundUpdate === 'function') {
        onBackgroundUpdate(freshData);
      }
    }).catch(err => {
      console.warn('[Storage] Background cache revalidation failed:', err);
    });

    return cached.data;
  }

  // No cache at all: must fetch synchronously
  const freshData = await fetcherFn();
  setCachedData(key, freshData, ttlMs);
  return freshData;
}
