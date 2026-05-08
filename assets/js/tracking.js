(function () {
  var params = new URLSearchParams(window.location.search);
  var debugMode = params.get('q') === '1';

  function debugLog() {
    if (!debugMode || !window.console || typeof window.console.log !== 'function') {
      return;
    }

    var args = Array.prototype.slice.call(arguments);
    args.unshift('[portfolio-tracking]');
    window.console.log.apply(window.console, args);
  }

  function debugWarn() {
    if (!debugMode || !window.console || typeof window.console.warn !== 'function') {
      return;
    }

    var args = Array.prototype.slice.call(arguments);
    args.unshift('[portfolio-tracking]');
    window.console.warn.apply(window.console, args);
  }

  if (window.location.protocol === 'file:') {
    debugWarn('Skipped because page is opened with file:// protocol.');
    return;
  }

  var apiBaseUrl = window.TRACKING_API_BASE_URL || null;
  if (!apiBaseUrl) {
    debugWarn('Skipped because TRACKING_API_BASE_URL is missing.');
    return;
  }

  var localStorageRef = getStorage('localStorage');
  var sessionStorageRef = getStorage('sessionStorage');
  if (!localStorageRef || !sessionStorageRef) {
    debugWarn('Skipped because browser storage is unavailable.');
    return;
  }

  var visitorStorageKey = 'portfolioVisitorId';
  var sessionStorageKey = 'portfolioSessionId';
  var previousPageStorageKey = 'portfolioPreviousPageUrl';
  var pageTrackedKey = 'portfolioTracked:' + window.location.pathname + window.location.search;
  var visitorId = ensureStorageValue(localStorageRef, visitorStorageKey);
  var sessionId = ensureStorageValue(sessionStorageRef, sessionStorageKey);
  var previousPageUrl = sessionStorageRef.getItem(previousPageStorageKey) || '';

  debugLog('Debug mode enabled.', {
    endpoint: normalizeApiBase(apiBaseUrl) + '/api/v1/portfolio/visits',
    visitorId: visitorId,
    sessionId: sessionId,
    pageTrackedKey: pageTrackedKey
  });

  if (!sessionStorageRef.getItem(pageTrackedKey)) {
    sendTrackingEvent('page_view', {
      source: 'gorb6593.github.io'
    }, function () {
      sessionStorageRef.setItem(pageTrackedKey, '1');
      sessionStorageRef.setItem(previousPageStorageKey, window.location.href);
      debugLog('Marked page as tracked for this session.', pageTrackedKey);
    });
  } else {
    debugLog('Skipped page_view because this page was already tracked in the current session.', pageTrackedKey);
  }

  function sendTrackingEvent(eventType, extraPayload, onSuccess) {
    var payload = buildBasePayload(extraPayload || {});
    var endpoint = normalizeApiBase(apiBaseUrl) + '/api/v1/portfolio/visits';
    var body = JSON.stringify(payload);

    debugLog('Sending event.', {
      eventType: eventType,
      payload: payload
    });

    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: body,
      keepalive: false,
      mode: 'cors'
    }).then(function (response) {
      debugLog('Tracking response received.', {
        eventType: eventType,
        ok: response.ok,
        status: response.status
      });

      if (response.ok && typeof onSuccess === 'function') {
        onSuccess();
      }

      if (!response.ok) {
        debugWarn('Tracking request failed.', {
          eventType: eventType,
          status: response.status
        });
      }
    }).catch(function (error) {
      console.warn('Portfolio tracking failed:', error);
      debugWarn('Tracking request threw an error.', error);
    });
  }

  function buildBasePayload(extraPayload) {
    return {
      visitorId: visitorId,
      sessionId: sessionId,
      source: extraPayload.source || 'gorb6593.github.io',
      pageTitle: document.title,
      pagePath: window.location.pathname,
      pageUrl: window.location.href,
      previousPageUrl: previousPageUrl,
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
      debugWarn('Storage unavailable.', { storageType: type, error: e });
      return null;
    }
  }

  function normalizeApiBase(url) {
    return String(url).replace(/\/$/, '');
  }
})();
