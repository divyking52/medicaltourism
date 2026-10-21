/**
 * Site language switcher (Spanish <-> English)
 * -------------------------------------------
 * The markup ships in Spanish. This engine swaps the visible copy for its
 * English equivalent by matching the (whitespace-normalised) source text,
 * so no per-element keys are needed and new content keeps working
 * automatically once it is added to `i18n.js`.
 *
 * Every translated node keeps a record of its original Spanish text, so
 * switching back restores the pristine copy in place — no page reload, no
 * lost scroll position.
 *
 * Usage:
 *   window.SiteI18n.setLocale('en' | 'es')
 *   window.SiteI18n.toggle()
 */
(function (global) {
  'use strict';

  var DICT = (global.SITE_I18N && global.SITE_I18N.en) || {};
  var STORAGE_KEY = 'ctm-locale';
  var ATTRS = ['aria-label', 'placeholder', 'title', 'alt', 'value'];

  var current = 'es';
  var applied = false;

  // node -> { original }
  var textRecords = new Map();
  // [{ el, attr, original }]
  var attrRecords = [];

  function normalise(str) {
    return String(str).replace(/\s+/g, ' ').trim();
  }

  function has(key) {
    return Object.prototype.hasOwnProperty.call(DICT, key);
  }

  // The site's "decode" animation caches each label's source text in
  // `data-text` and replays it on hover. Keep that cache in sync with the
  // language, otherwise hovering would restore the Spanish wording.
  function syncDecodeCache(el, value) {
    if (!el || !el.dataset) return;
    if (typeof el.dataset.text === 'string') el.dataset.text = value.trim();
  }

  function translateNode(node) {
    if (node.nodeType !== 3) return;
    var rec = textRecords.get(node);
    var raw = rec ? rec.original : node.nodeValue;
    if (!raw || !raw.trim()) return;

    var lead = raw.match(/^\s*/)[0];
    var trail = raw.match(/\s*$/)[0];
    var key = normalise(raw);
    if (!has(key)) return;

    var out = DICT[key];
    if (!out || out === key) return;

    node.nodeValue = lead + out + trail;
    textRecords.set(node, { original: raw, el: node.parentElement });
    syncDecodeCache(node.parentElement, out);
  }

  function findAttrRecord(el, attr) {
    for (var i = 0; i < attrRecords.length; i++) {
      if (attrRecords[i].el === el && attrRecords[i].attr === attr) return attrRecords[i];
    }
    return null;
  }

  function translateAttributes(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var attr = ATTRS[i];
      var val = el.getAttribute && el.getAttribute(attr);
      if (!val) continue;

      var rec = findAttrRecord(el, attr);
      var src = rec ? rec.original : val;
      var key = normalise(src);
      if (!has(key)) continue;

      var out = DICT[key];
      if (!out || out === key) continue;

      el.setAttribute(attr, out);
      if (!rec) attrRecords.push({ el: el, attr: attr, original: src });
    }
  }

  function translateTree(root) {
    if (!root) return;

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var p = node.parentNode;
        while (p && p !== root) {
          var tag = p.nodeName;
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'CODE' || tag === 'PRE') {
            return NodeFilter.FILTER_REJECT;
          }
          p = p.parentNode;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    var node;
    while ((node = walker.nextNode())) translateNode(node);

    var elements = root.querySelectorAll('*');
    for (var i = 0; i < elements.length; i++) translateAttributes(elements[i]);
  }

  // <head> content lives outside the body — translate it explicitly
  var headRecords = {};

  function translateHead() {
    if (headRecords.title === undefined) {
      headRecords.title = document.title;
    }
    var key = normalise(headRecords.title);
    if (has(key) && DICT[key] !== key) document.title = DICT[key];

    var desc = document.querySelector('meta[name="description"]');
    if (desc) {
      if (headRecords.desc === undefined) headRecords.desc = desc.getAttribute('content') || '';
      var dkey = normalise(headRecords.desc);
      if (has(dkey) && DICT[dkey] !== dkey) desc.setAttribute('content', DICT[dkey]);
    }
  }

  function restoreHead() {
    if (headRecords.title !== undefined) document.title = headRecords.title;
    var desc = document.querySelector('meta[name="description"]');
    if (desc && headRecords.desc !== undefined) desc.setAttribute('content', headRecords.desc);
  }

  function restoreAll() {
    textRecords.forEach(function (rec, node) {
      if (node.isConnected) {
        node.nodeValue = rec.original;
      } else if (rec.el && rec.el.isConnected) {
        // The node was replaced (e.g. by the decode animation) — fall back
        // to restoring the whole element.
        rec.el.textContent = rec.original;
      }
      syncDecodeCache(rec.el, rec.original);
    });
    textRecords.clear();

    for (var i = 0; i < attrRecords.length; i++) {
      attrRecords[i].el.setAttribute(attrRecords[i].attr, attrRecords[i].original);
    }
    attrRecords.length = 0;

    restoreHead();
  }

  function setLocale(locale) {
    var target = locale === 'en' ? 'en' : 'es';

    if (target === current) {
      if (target === 'en') {
        // Re-apply: pick up any content added since the last pass.
        translateHead();
        translateTree(document.body);
        applied = true;
      }
      syncToggle();
      return;
    }

    if (target === 'es') {
      restoreAll();
      document.documentElement.setAttribute('lang', 'es');
      current = 'es';
      applied = false;
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* private mode */ }
      syncToggle();
      document.dispatchEvent(new CustomEvent('site:locale', { detail: { locale: 'es' } }));
      return;
    }

    document.documentElement.setAttribute('lang', 'en');
    translateHead();
    translateTree(document.body);
    current = 'en';
    applied = true;
    try { localStorage.setItem(STORAGE_KEY, 'en'); } catch (e) { /* private mode */ }
    syncToggle();
    document.dispatchEvent(new CustomEvent('site:locale', { detail: { locale: 'en' } }));
  }

  function syncToggle() {
    var buttons = document.querySelectorAll('[data-lang-toggle]');
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      b.setAttribute('aria-pressed', current === 'en' ? 'true' : 'false');
      b.setAttribute('aria-label', current === 'en'
        ? 'Cambiar a español / Switch to Spanish'
        : 'Switch to English / Cambiar a inglés');
    }
  }

  // Pick up content injected at runtime (modals, lightboxes, dynamic cards)
  var observer = null;
  var pending = null;

  function scheduleRefresh() {
    if (pending) return;
    pending = setTimeout(function () {
      pending = null;
      if (current !== 'en') return;
      translateHead();
      translateTree(document.body);
    }, 120);
  }

  function init() {
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { /* ignore */ }

    var buttons = document.querySelectorAll('[data-lang-toggle]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        setLocale(current === 'en' ? 'es' : 'en');
      });
    }

    if (saved === 'en') {
      document.documentElement.setAttribute('lang', 'en');
      translateHead();
      translateTree(document.body);
      current = 'en';
      applied = true;
    }
    syncToggle();

    if (typeof MutationObserver !== 'undefined' && !observer) {
      observer = new MutationObserver(scheduleRefresh);
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  global.SiteI18n = {
    setLocale: setLocale,
    toggle: function () { setLocale(current === 'en' ? 'es' : 'en'); },
    getLocale: function () { return current; },
    refresh: function () { if (current === 'en') { translateHead(); translateTree(document.body); } },
    init: init
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
