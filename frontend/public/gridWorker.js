/**
 * gridWorker.js
 * Web Worker for fetching and parsing flood-risk grid GeoJSON data
 * off the main thread to avoid UI jank on large payloads.
 *
 * Expected incoming message: { url: string }
 * Outgoing message (success):  { success: true,  data: GeoJSON }
 * Outgoing message (failure):  { success: false, error: string }
 */

self.onmessage = async function (e) {
  const { url } = e.data;

  if (!url || typeof url !== 'string') {
    self.postMessage({ success: false, error: 'No valid URL provided to gridWorker.' });
    return;
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Grid fetch failed: HTTP ${response.status} ${response.statusText}`
      );
    }

    // Stream + parse JSON without blocking main thread
    const data = await response.json();

    // Basic sanity-check: expect a GeoJSON FeatureCollection
    if (!data || typeof data !== 'object') {
      throw new Error('Grid response is not a valid JSON object.');
    }

    if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
      throw new Error(
        `Unexpected grid format: type="${data.type}", features=${Array.isArray(data.features)}`
      );
    }

    self.postMessage({ success: true, data });

  } catch (err) {
    // Never let an unhandled rejection silently kill the worker
    self.postMessage({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

// Catch any uncaught errors inside the worker scope
self.onerror = function (event) {
  self.postMessage({
    success: false,
    error: `Uncaught worker error: ${event.message} (${event.filename}:${event.lineno})`,
  });
  // Return true to prevent the error from propagating further
  return true;
};