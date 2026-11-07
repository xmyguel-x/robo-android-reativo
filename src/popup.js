/* Popup do Robô Android Reativo. */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const tab = { id: null };

  function activeTab() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        tab.id = tabs && tabs.length ? tabs[0].id : null;
        resolve(tab.id);
      });
    });
  }

  function send(msg) {
    return new Promise((resolve) => {
      if (!tab.id) return resolve(null);
      chrome.tabs.sendMessage(tab.id, msg, (res) => {
        if (chrome.runtime.lastError) return resolve(null);
        resolve(res);
      });
    });
  }

  function setToggle(id, value, patch) {
    $(id).checked = !!value;
    $(id).addEventListener('change', (e) => {
      const p = Object.assign({}, patch);
      p[patch.key] = e.target.checked;
      chrome.storage.local.set(p);
      send({ type: 'ar-set', patch: p });
    });
  }

  async function init() {
    const stored = await chrome.storage.local.get(['enabled', 'walk', 'speak']);
    setToggle('t-enabled', stored.enabled !== false, { key: 'enabled' });
    setToggle('t-walk', stored.walk !== false, { key: 'walk' });
    setToggle('t-speak', !!stored.speak, { key: 'speak' });

    $('options').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
      window.close();
    });

    $('b-pick').addEventListener('click', async () => {
      await activeTab();
      const res = await send({ type: 'ar-pick' });
      $('status').innerHTML = res
        ? 'Modo seleção ativo na aba — clique na mensagem do assistente.'
        : 'Não foi possível acessar esta aba (página restrita do Chrome).';
      $('dot').className = 'dot on';
      window.close();
    });

    await activeTab();
    const state = await send({ type: 'ar-state' });
    const dot = $('dot');
    if (!state) {
      $('status').innerHTML = 'Abra uma página de chat para o robô aparecer.';
      return;
    }
    dot.className = 'dot on';
    const sel = state.selector || '(detectando…)';
    $('status').innerHTML = 'Mensagem monitorada: <code>' + escapeHtml(sel) + '</code>';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  document.addEventListener('DOMContentLoaded', init);
})();
