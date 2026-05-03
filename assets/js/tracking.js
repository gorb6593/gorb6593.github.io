(function () {
  if (window.location.protocol === 'file:') {
    return;
  }

  var apiBaseUrl = window.TRACKING_API_BASE_URL || null;
  if (!apiBaseUrl) {
    return;
  }

  var localStorageRef = getStorage('localStorage');
  var sessionStorageRef = getStorage('sessionStorage');
  if (!localStorageRef || !sessionStorageRef) {
    return;
  }

  var visitorStorageKey = 'portfolioVisitorId';
  var sessionStorageKey = 'portfolioSessionId';
  var pageTrackedKey = 'portfolioTracked:' + window.location.pathname + window.location.search;
  var visitorId = ensureStorageValue(localStorageRef, visitorStorageKey);
  var sessionId = ensureStorageValue(sessionStorageRef, sessionStorageKey);
  var params = new URLSearchParams(window.location.search);

  if (!sessionStorageRef.getItem(pageTrackedKey)) {
    sendTrackingEvent('page_view', {
      source: 'gorb6593.github.io'
    }, true, function () {
      sessionStorageRef.setItem(pageTrackedKey, '1');
    });
  }

  document.addEventListener('click', handleClickEvent, true);

  function handleClickEvent(event) {
    var target = event.target.closest('[data-track-click="true"], a[href], [role="link"]');
    if (!target) {
      return;
    }

    var href = target.getAttribute('data-track-href') || target.getAttribute('href') || '';
    var label = target.getAttribute('data-track-label') || extractLabel(target);
    var sectionName = findSectionName(target);

    sendTrackingEvent('click', {
      eventName: label || 'click',
      elementText: label,
      linkUrl: href,
      sectionName: sectionName,
      source: 'gorb6593.github.io'
    }, false);
  }

  function sendTrackingEvent(eventType, extraPayload, useBeacon, onSuccess) {
    var payload = buildBasePayload(eventType, extraPayload || {});
    var endpoint = normalizeApiBase(apiBaseUrl) + '/api/v1/portfolio/visits';
    var body = JSON.stringify(payload);

    if (useBeacon && navigator.sendBeacon) {
      var blob = new Blob([body], { type: 'application/json' });
      var sent = navigator.sendBeacon(endpoint, blob);
      if (sent && typeof onSuccess === 'function') {
        onSuccess();
      }
      return;
    }

    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: body,
      keepalive: useBeacon,
      mode: 'cors'
    }).then(function (response) {
      if (response.ok && typeof onSuccess === 'function') {
        onSuccess();
      }
    }).catch(function (error) {
      console.warn('Portfolio tracking failed:', error);
    });
  }

  function buildBasePayload(eventType, extraPayload) {
    return {
      visitorId: visitorId,
      sessionId: sessionId,
      eventType: eventType,
      eventName: extraPayload.eventName || null,
      source: extraPayload.source || 'gorb6593.github.io',
      sectionName: extraPayload.sectionName || null,
      elementText: extraPayload.elementText || null,
      linkUrl: extraPayload.linkUrl || null,
      durationMs: null,
      scrollDepthPercent: null,
      pageTitle: document.title,
      pagePath: window.location.pathname,
      pageUrl: window.location.href,
      referrer: document.referrer || '',
      utmSource: params.get('utm_source'),
      utmMedium: params.get('utm_medium'),
      utmCampaign: params.get('utm_campaign'),
      utmTerm: params.get('utm_term'),
      utmContent: params.get('utm_content'),
      language: navigator.language || '',
      languages: Array.isArray(navigator.languages) ? navigator.languages.join(',') : '',
      timezone: getTimezone(),
      platform: navigator.userAgentData && navigator.userAgentData.platform ? navigator.userAgentData.platform : (navigator.platform || ''),
      screenWidth: window.screen ? window.screen.width : null,
      screenHeight: window.screen ? window.screen.height : null,
      viewportWidth: window.innerWidth || null,
      viewportHeight: window.innerHeight || null,
      devicePixelRatio: window.devicePixelRatio || null,
      colorDepth: window.screen ? window.screen.colorDepth : null,
      touchPoints: typeof navigator.maxTouchPoints === 'number' ? navigator.maxTouchPoints : null,
      hardwareConcurrency: navigator.hardwareConcurrency || null,
      deviceMemory: navigator.deviceMemory || null,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack || window.doNotTrack || null,
      visitedAtClient: new Date().toISOString()
    };
  }

  function ensureStorageValue(storage, key) {
    var existing = storage.getItem(key);
    if (existing) {
      return existing;
    }

    var created = createId();
    storage.setItem(key, created);
    return created;
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }

    return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }

  function getTimezone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch (e) {
      return '';
    }
  }

  function getStorage(type) {
    try {
      var storage = window[type];
      var testKey = '__portfolio_tracking_test__';
      storage.setItem(testKey, '1');
      storage.removeItem(testKey);
      return storage;
    } catch (e) {
      console.warn('Portfolio tracking storage unavailable:', e);
      return null;
    }
  }

  function extractLabel(element) {
    return (element.getAttribute('title') || element.getAttribute('aria-label') || element.innerText || element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 255);
  }

  function findSectionName(element) {
    var section = element.closest('[data-track-section]');
    return section ? section.getAttribute('data-track-section') : null;
  }

  function normalizeApiBase(url) {
    return String(url).replace(/\/$/, '');
  }
})();
