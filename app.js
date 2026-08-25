(() => {
  'use strict';

  const THEME_KEY = 'luisa_hub_theme_v1';
  const TEXT_KEY = 'luisa_hub_text_level_v1';
  const THEMES = new Set(['system', 'light', 'dark']);
  const TEXT_LEVELS = new Set(['small', 'normal', 'large', 'xlarge']);
  const DEFAULT_THEME = 'system';
  const DEFAULT_TEXT = 'normal';
  const LIGHT_THEME_COLOR = '#F9F6F0';
  const DARK_THEME_COLOR = '#171717';

  const root = document.documentElement;
  const live = document.getElementById('live');
  const themeMetas = [...document.querySelectorAll('meta[name="theme-color"]')];

  const safeStorage = {
    get(key) {
      try {
        return { ok: true, value: window.localStorage.getItem(key) };
      } catch (error) {
        return { ok: false, value: null, error };
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, value);
        return { ok: true };
      } catch (error) {
        return { ok: false, error };
      }
    },
    remove(key) {
      try {
        window.localStorage.removeItem(key);
        return { ok: true };
      } catch (error) {
        return { ok: false, error };
      }
    }
  };

  function validated(value, allowed, fallback) {
    return allowed.has(value) ? value : fallback;
  }

  const storedTheme = safeStorage.get(THEME_KEY);
  const storedText = safeStorage.get(TEXT_KEY);
  const initialTheme = validated(root.dataset.theme, THEMES, DEFAULT_THEME);
  const initialText = validated(root.dataset.text, TEXT_LEVELS, DEFAULT_TEXT);

  const prefState = {
    theme: {
      effective: initialTheme,
      durableValue: validated(storedTheme.value, THEMES, DEFAULT_THEME),
      durable: storedTheme.ok
    },
    text: {
      effective: initialText,
      durableValue: validated(storedText.value, TEXT_LEVELS, DEFAULT_TEXT),
      durable: storedText.ok
    }
  };

  function announce(message) {
    if (!live) return;
    live.textContent = '';
    window.requestAnimationFrame(() => {
      live.textContent = message;
    });
  }

  function setThemeColor(theme) {
    if (theme === 'light' || theme === 'dark') {
      const color = theme === 'light' ? LIGHT_THEME_COLOR : DARK_THEME_COLOR;
      themeMetas.forEach((meta) => { meta.content = color; });
      return;
    }
    themeMetas.forEach((meta, index) => {
      meta.content = index === 0 ? LIGHT_THEME_COLOR : DARK_THEME_COLOR;
    });
  }

  function applyTheme(value) {
    const theme = validated(value, THEMES, DEFAULT_THEME);
    prefState.theme.effective = theme;
    root.dataset.theme = theme;
    setThemeColor(theme);
  }

  function applyText(value) {
    const text = validated(value, TEXT_LEVELS, DEFAULT_TEXT);
    prefState.text.effective = text;
    root.dataset.text = text;
  }

  function syncRadios() {
    document.querySelectorAll('input[name="hub-theme"]').forEach((input) => {
      input.checked = input.value === prefState.theme.effective;
    });
    document.querySelectorAll('input[name="hub-text"]').forEach((input) => {
      input.checked = input.value === prefState.text.effective;
    });
  }

  function persistPreference(kind, value) {
    const isTheme = kind === 'theme';
    const allowed = isTheme ? THEMES : TEXT_LEVELS;
    const fallback = isTheme ? DEFAULT_THEME : DEFAULT_TEXT;
    const key = isTheme ? THEME_KEY : TEXT_KEY;
    const candidate = validated(value, allowed, fallback);

    if (isTheme) applyTheme(candidate);
    else applyText(candidate);

    const result = safeStorage.set(key, candidate);
    const state = prefState[kind];
    if (result.ok) {
      state.durable = true;
      state.durableValue = candidate;
    } else {
      state.durable = false;
      announce('Préférence appliquée pour cette session uniquement.');
    }
    syncRadios();
    return result.ok;
  }

  function installPreferenceControls() {
    document.querySelectorAll('input[name="hub-theme"]').forEach((input) => {
      input.addEventListener('change', () => {
        if (input.checked) persistPreference('theme', input.value);
      });
    });
    document.querySelectorAll('input[name="hub-text"]').forEach((input) => {
      input.addEventListener('change', () => {
        if (!input.checked) return;
        persistPreference('text', input.value);
        const label = input.closest('label');
        if (label) label.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
    });
  }

  let settingsOpener = null;
  let savedScrollY = 0;

  function lockPageScroll() {
    savedScrollY = window.scrollY;
    document.body.classList.add('is-scroll-locked');
    document.body.style.top = `-${savedScrollY}px`;
  }

  function unlockPageScroll() {
    document.body.classList.remove('is-scroll-locked');
    document.body.style.top = '';
    window.scrollTo(0, savedScrollY);
  }

  function installSettingsDialog() {
    const dialog = document.getElementById('settings-dialog');
    const heading = document.getElementById('settings-heading');
    const closeButton = document.getElementById('settings-close');
    const triggers = [...document.querySelectorAll('.js-settings-trigger')];
    if (!dialog || !heading || !closeButton || !triggers.length) return;

    triggers.forEach((trigger) => {
      trigger.hidden = false;
      trigger.addEventListener('click', () => {
        settingsOpener = trigger;
        syncRadios();
        lockPageScroll();
        dialog.showModal();
        heading.focus();
      });
    });

    closeButton.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
      unlockPageScroll();
      if (settingsOpener && settingsOpener.isConnected) settingsOpener.focus();
      settingsOpener = null;
    });
  }

  function installStorageSync() {
    window.addEventListener('storage', (event) => {
      if (event.key === THEME_KEY) {
        const value = event.newValue === null ? DEFAULT_THEME : validated(event.newValue, THEMES, DEFAULT_THEME);
        prefState.theme.durable = true;
        prefState.theme.durableValue = value;
        applyTheme(value);
        syncRadios();
      } else if (event.key === TEXT_KEY) {
        const value = event.newValue === null ? DEFAULT_TEXT : validated(event.newValue, TEXT_LEVELS, DEFAULT_TEXT);
        prefState.text.durable = true;
        prefState.text.durableValue = value;
        applyText(value);
        syncRadios();
      }
    });
  }



  // PWA lifecycle. This code never probes module origins.
  const pwaState = {
    registration: null,
    waitingWorker: null,
    shellRev: 'unknown',
    swState: 'unsupported',
    lastUpdateCheck: 0,
    reloadIssued: false
  };
  const banner = document.getElementById('system-banner');
  const bannerText = document.getElementById('system-banner-text');
  const bannerAction = document.getElementById('system-banner-action');
  const CLEANUP_FLAG = 'luisa_hub_cleanup_after_update_v1';

  function renderSystemBanner() {
    if (!banner || !bannerText || !bannerAction) return;
    if (!navigator.onLine) {
      banner.hidden = false;
      bannerText.textContent = 'Hors connexion. L’ouverture des autres applications dépend de ce qui est déjà disponible sur cet appareil.';
      bannerAction.hidden = true;
      return;
    }
    if (pwaState.waitingWorker) {
      banner.hidden = false;
      bannerText.textContent = 'Mise à jour disponible.';
      bannerAction.textContent = 'Actualiser';
      bannerAction.hidden = false;
      return;
    }
    banner.hidden = true;
    bannerText.textContent = '';
    bannerAction.hidden = true;
  }

  function queryWorkerStatus(worker) {
    return new Promise((resolve) => {
      if (!worker || !navigator.serviceWorker) { resolve(null); return; }
      const channel = new MessageChannel();
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        channel.port1.close();
        resolve(value);
      };
      const timer = window.setTimeout(() => finish(null), 1500);
      channel.port1.onmessage = (event) => finish(event.data || null);
      worker.postMessage({ type: 'GET_STATUS' }, [channel.port2]);
    });
  }

  function requestWorkerStatus(worker) {
    queryWorkerStatus(worker).then((data) => {
      if (!data) return;
      if (typeof data.shellRev === 'string') pwaState.shellRev = data.shellRev;
      if (typeof data.cacheName === 'string') pwaState.swState = `active:${data.cacheName}`;
    });
  }

  function requestCacheCleanup(worker, expectedShellRev) {
    return new Promise((resolve) => {
      if (!worker) { resolve(false); return; }
      const channel = new MessageChannel();
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        channel.port1.close();
        resolve(value);
      };
      const timer = window.setTimeout(() => finish(false), 2000);
      channel.port1.onmessage = (event) => {
        const data = event.data || {};
        finish(data.ok === true && data.shellRev === expectedShellRev);
      };
      worker.postMessage({ type: 'CLEAN_OLD_HUB_CACHES' }, [channel.port2]);
    });
  }

  function setWaitingWorker(worker) {
    if (!worker) return;
    pwaState.waitingWorker = worker;
    pwaState.swState = `waiting:${worker.state}`;
    renderSystemBanner();
  }

  function watchInstallingWorker(registration) {
    const worker = registration.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      pwaState.swState = `installing:${worker.state}`;
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        setWaitingWorker(registration.waiting || worker);
      }
    });
  }

  function activateWaitingWorker() {
    const worker = pwaState.registration?.waiting || pwaState.waitingWorker;
    if (!worker || pwaState.reloadIssued) return;
    const maybeReload = () => {
      if (worker.state !== 'activated' || pwaState.reloadIssued) return;
      pwaState.reloadIssued = true;
      try { sessionStorage.setItem(CLEANUP_FLAG, '1'); } catch (_error) {}
      window.location.reload();
    };
    worker.addEventListener('statechange', maybeReload);
    worker.postMessage({ type: 'SKIP_WAITING' });
    maybeReload();
  }

  async function maybeCleanupOldCaches() {
    let shouldClean = false;
    try { shouldClean = sessionStorage.getItem(CLEANUP_FLAG) === '1'; } catch (_error) {}
    if (!shouldClean) return;
    const controller = navigator.serviceWorker?.controller;
    if (!controller) return; // keep the flag so a later controlled load can retry cleanup
    let expectedShellRev = null;
    try {
      const response = await fetch('./version.json', { cache: 'no-store' });
      if (!response.ok) return;
      const version = await response.json();
      if (typeof version.shell_rev !== 'string') return;
      expectedShellRev = version.shell_rev;
    } catch (_error) { return; } // offline cleanup may safely wait; stale caches are non-critical
    const status = await queryWorkerStatus(controller);
    if (!status || status.shellRev !== expectedShellRev) return;
    const cleaned = await requestCacheCleanup(controller, expectedShellRev);
    if (!cleaned) return;
    try { sessionStorage.removeItem(CLEANUP_FLAG); } catch (_error) {}
  }

  async function checkForUpdate(registration, force = false) {
    const now = Date.now();
    if (!force && now - pwaState.lastUpdateCheck < 60 * 60 * 1000) return;
    pwaState.lastUpdateCheck = now;
    try { await registration.update(); } catch (_error) { /* offline is already represented by banner */ }
    if (registration.waiting && navigator.serviceWorker.controller) setWaitingWorker(registration.waiting);
  }

  async function installPwa() {
    if (!('serviceWorker' in navigator)) {
      renderSystemBanner();
      return;
    }
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
      pwaState.registration = registration;
      pwaState.swState = registration.active ? 'registered-active' : 'registered';
      if (registration.waiting && navigator.serviceWorker.controller) setWaitingWorker(registration.waiting);
      if (registration.installing) watchInstallingWorker(registration);
      registration.addEventListener('updatefound', () => watchInstallingWorker(registration));
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Deliberately no reload here. Reload is tied only to the waiting worker reaching activated.
        requestWorkerStatus(navigator.serviceWorker.controller);
      });
      requestWorkerStatus(navigator.serviceWorker.controller || registration.active);
      await maybeCleanupOldCaches();
      window.setTimeout(() => checkForUpdate(registration, true), 0);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate(registration, false);
      });
    } catch (_error) {
      pwaState.swState = 'registration-failed';
    }
    renderSystemBanner();
  }

  window.addEventListener('online', renderSystemBanner);
  window.addEventListener('offline', renderSystemBanner);
  if (bannerAction) bannerAction.addEventListener('click', activateWaitingWorker);
  renderSystemBanner();
  installPwa();

  function durableLabel(value) {
    if (value === true) return 'yes';
    if (value === false) return 'no';
    return 'unknown';
  }

  function displayMode() {
    if (window.matchMedia('(display-mode: standalone)').matches) return 'standalone';
    if (window.matchMedia('(display-mode: fullscreen)').matches) return 'fullscreen';
    if (window.matchMedia('(display-mode: minimal-ui)').matches) return 'minimal-ui';
    return 'browser';
  }

  function diagnosticPayload() {
    const meta = (name) => document.querySelector(`meta[name="${name}"]`)?.content || 'unknown';
    return [
      `app_version=${meta('x-app-version')}`,
      `build_date=${meta('x-build-date')}`,
      'manifest_id=/Collection-Luisa/',
      `shell_rev=${pwaState.shellRev}`,
      `sw_state=${pwaState.swState}`,
      `display_mode=${displayMode()}`,
      `theme_effective=${prefState.theme.effective}`,
      `theme_durable=${durableLabel(prefState.theme.durable)}`,
      `text_level_effective=${prefState.text.effective}`,
      `text_level_durable=${durableLabel(prefState.text.durable)}`,
      `viewport=${window.innerWidth}x${window.innerHeight}`
    ].join('\n');
  }

  function revealClipboardFallback(payload) {
    const fallback = document.getElementById('diagnostics-fallback');
    const textarea = document.getElementById('diagnostics-text');
    if (!fallback || !textarea) return;
    textarea.value = payload;
    fallback.hidden = false;
    textarea.focus();
    textarea.select();
    announce('Copie automatique impossible. Sélectionnez le texte ci-dessous.');
  }

  function installSupportTools() {
    const section = document.getElementById('technical-support');
    const copy = document.getElementById('copy-diagnostics');
    const reset = document.getElementById('reset-preferences');
    const confirm = document.getElementById('reset-confirmation');
    const cancel = document.getElementById('reset-cancel');
    const accept = document.getElementById('reset-confirm');
    if (!section) return;
    section.hidden = false;

    if (copy) {
      copy.addEventListener('click', async () => {
        const payload = diagnosticPayload();
        try {
          if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') throw new Error('clipboard unavailable');
          await navigator.clipboard.writeText(payload);
          announce('Diagnostics copiés.');
        } catch (_error) {
          revealClipboardFallback(payload);
        }
      });
    }

    if (reset && confirm && cancel && accept) {
      reset.addEventListener('click', () => {
        confirm.hidden = false;
        accept.focus();
      });
      cancel.addEventListener('click', () => {
        confirm.hidden = true;
        reset.focus();
      });
      accept.addEventListener('click', () => {
        const themeResult = safeStorage.remove(THEME_KEY);
        const textResult = safeStorage.remove(TEXT_KEY);
        applyTheme(DEFAULT_THEME);
        applyText(DEFAULT_TEXT);
        syncRadios();
        confirm.hidden = true;
        if (themeResult.ok && textResult.ok) {
          prefState.theme.durable = true;
          prefState.theme.durableValue = DEFAULT_THEME;
          prefState.text.durable = true;
          prefState.text.durableValue = DEFAULT_TEXT;
          announce('Préférences de Collection Luisa réinitialisées.');
        } else {
          prefState.theme.durable = false;
          prefState.text.durable = false;
          announce('Réinitialisation appliquée pour cette session uniquement. Les préférences enregistrées n’ont pas pu être effacées.');
        }
        reset.focus();
      });
    }
  }

  applyTheme(initialTheme);
  applyText(initialText);
  syncRadios();
  installPreferenceControls();
  installSettingsDialog();
  installStorageSync();
  installSupportTools();
})();
