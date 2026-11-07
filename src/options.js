/* Opções do Robô Android Reativo. */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const RANGES = ['settle', 'rate', 'pitch', 'scale', 'bubbleWidth', 'hideAfterMs'];
  const CHECKS = ['speak', 'badge'];

  function fmt(key, v) {
    if (key === 'settle') return Math.round(v) + ' ms';
    if (key === 'rate' || key === 'pitch') return Number(v).toFixed(2);
    if (key === 'scale') return Math.round(v * 100) + '%';
    if (key === 'bubbleWidth') return Math.round(v) + ' px';
    if (key === 'hideAfterMs') return v === 0 ? 'nunca' : Math.round(v / 1000) + ' s';
    return v;
  }

  function paint(key) {
    const el = $(key);
    if (!el) return;
    const out = $(key + '-val');
    if (out) out.textContent = fmt(key, el.type === 'range' ? Number(el.value) : el.value);
  }

  function fillVoices() {
    const sel = $('voice');
    const voices = ('speechSynthesis' in window) ? speechSynthesis.getVoices() : [];
    sel.innerHTML = '';
    const auto = document.createElement('option');
    auto.value = '';
    auto.textContent = voices.length ? 'Automática (pt-BR)' : 'Automática (sem vozes instaladas)';
    sel.appendChild(auto);
    voices.forEach((v) => {
      const o = document.createElement('option');
      o.value = v.name;
      o.textContent = v.name + ' (' + v.lang + ')';
      sel.appendChild(o);
    });
  }

  async function init() {
    const stored = await chrome.storage.local.get(null);
    RANGES.forEach((k) => {
      const el = $(k);
      if (!el) return;
      if (stored[k] !== undefined) el.value = stored[k];
      paint(k);
      el.addEventListener('input', () => {
        paint(k);
        const patch = {};
        patch[k] = Number(el.value);
        chrome.storage.local.set(patch);
        push(patch);
      });
    });
    CHECKS.forEach((k) => {
      const el = $(k);
      if (!el) return;
      el.checked = !!stored[k];
      el.addEventListener('change', () => {
        const patch = {};
        patch[k] = el.checked;
        chrome.storage.local.set(patch);
        push(patch);
      });
    });

    $('selector').value = stored.selector || '';
    $('selector').addEventListener('change', () => {
      const patch = { selector: $('selector').value.trim() };
      chrome.storage.local.set(patch);
      push(patch);
    });

    $('voice').value = stored.ttsVoice || '';
    $('voice').addEventListener('change', () => {
      const patch = { ttsVoice: $('voice').value };
      chrome.storage.local.set(patch);
      push(patch);
    });

    $('b-auto').addEventListener('click', () => {
      $('selector').value = '';
      const patch = { selector: '' };
      chrome.storage.local.set(patch);
      push(patch);
    });

    $('b-pick').addEventListener('click', async () => {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs.length) return;
      chrome.tabs.sendMessage(tabs[0].id, { type: 'ar-pick' }, () => {
        void chrome.runtime.lastError;
      });
    });

    $('b-reset').addEventListener('click', async () => {
      await chrome.storage.local.clear();
      await chrome.storage.local.set({
        enabled: true, walk: true, speak: false, ttsRate: 1.05, ttsPitch: 1,
        ttsVoice: '', bubbleWidth: 320, scale: 1, selector: '', settleMs: 650,
        hideAfterMs: 9000, badge: true
      });
      location.reload();
    });

    fillVoices();
    if ('speechSynthesis' in window) {
      speechSynthesis.onvoiceschanged = fillVoices;
    }
  }

  function push(patch) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs.length) return;
      chrome.tabs.sendMessage(tabs[0].id, { type: 'ar-set', patch: patch }, () => {
        void chrome.runtime.lastError;
      });
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
