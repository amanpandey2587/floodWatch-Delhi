self.onmessage = async (e) => {
  const { url } = e.data;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 50_000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const text = await res.text();
    clearTimeout(timeout);
    const data = JSON.parse(text);
    self.postMessage({ success: true, data });
  } catch (error) {
    clearTimeout(timeout);
    self.postMessage({ success: false, error: error.message });
  }
};