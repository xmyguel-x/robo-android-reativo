/* Service worker: garante os padrões e responde ao clique no ícone. */
const DEFAULTS = {
  enabled: true,
  walk: true,
  speak: false,
  ttsRate: 1.05,
  ttsPitch: 1.0,
  ttsVoice: '',
  bubbleWidth: 320,
  scale: 1,
  selector: '',
  settleMs: 650,
  hideAfterMs: 9000,
  badge: true
};

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(null);
  const missing = {};
  Object.keys(DEFAULTS).forEach((k) => {
    if (current[k] === undefined) missing[k] = DEFAULTS[k];
  });
  if (Object.keys(missing).length) await chrome.storage.local.set(missing);
});

chrome.runtime.onStartup?.addListener(async () => {
  const current = await chrome.storage.local.get(null);
  const missing = {};
  Object.keys(DEFAULTS).forEach((k) => {
    if (current[k] === undefined) missing[k] = DEFAULTS[k];
  });
  if (Object.keys(missing).length) await chrome.storage.local.set(missing);
});
