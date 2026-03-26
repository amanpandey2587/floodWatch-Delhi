// public/gridWorker.js

self.onmessage = async function (e) {
  const { url } = e.data;
  console.log("Url in the frontend is ",url);
  if (!url || typeof url !== 'string' || url.startsWith('undefined')) {
    self.postMessage({
      success: false,
      error: `Invalid URL received: "${url}". Check API_BASE_URL env variable.`,
    });
    return;
  }

  // Internal fetch timeout — gives a clear error instead of silent hang
  const controller = new AbortController();
  const fetchTimeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    console.log("Response",response);
    clearTimeout(fetchTimeout);

    if (!response.ok) {
      throw new Error(`Grid fetch failed: HTTP ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

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
    clearTimeout(fetchTimeout);
    const message = err instanceof Error ? err.message : String(err);
    // AbortError means our internal timeout fired, not the outer 60s one
    const friendlyMessage = err.name === 'AbortError'
      ? `Grid API did not respond within 30s. URL: ${url}`
      : message;

    self.postMessage({ success: false, error: friendlyMessage });
  }
};

self.onerror = function (event) {
  self.postMessage({
    success: false,
    error: `Uncaught worker error: ${event.message} (${event.filename}:${event.lineno})`,
  });
  return true;
};