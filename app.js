/* =====================================================================
   Reut AI homepage: page behaviour.
   ===================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var osReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  function reduced() { return osReduce.matches || root.classList.contains('a11y-reduce-motion'); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ------------------------------------------------------------------
     The day. Three modes:
       stage  desktop: pinned, one situation per scroll step; within each
              step the "today" line is crossed out and "instead" appears.
       steps  phones: stacked; each situation resolves as it comes into view.
       static reduced motion / no JS: stacked, already resolved.
     ------------------------------------------------------------------ */
  var day, track, sits, countEl, mode = null, io = null, raf = 0;

  function pickMode() {
    if (reduced()) return 'static';
    return (window.innerWidth >= 760 && window.innerHeight >= 560) ? 'stage' : 'steps';
  }

  function setMode() {
    var next = pickMode();
    if (next === mode) return;
    mode = next;
    if (io) { io.disconnect(); io = null; }
    day.classList.toggle('is-live', mode !== 'static');
    day.classList.toggle('is-stage', mode === 'stage');
    sits.forEach(function (s) { s.classList.remove('is-active'); s.classList.toggle('is-instead', mode === 'static'); });

    if (mode === 'stage') { onScroll(); }
    if (mode === 'steps') {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('is-instead'); io.unobserve(e.target); }
        });
      }, { threshold: 0.75 });
      sits.forEach(function (s) { io.observe(s); });
    }
  }

  function onScroll() {
    if (mode !== 'stage' || raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      var n = sits.length;
      var rect = track.getBoundingClientRect();
      var travel = track.offsetHeight - window.innerHeight;
      var p = Math.min(Math.max(-rect.top / travel, 0), 0.9999);
      var idx = Math.floor(p * n);
      var local = p * n - idx;
      sits.forEach(function (s, i) {
        s.classList.toggle('is-active', i === idx);
        s.classList.toggle('is-instead', i < idx || (i === idx && local > 0.38));
      });
      countEl.textContent = idx + 1;
      day.style.setProperty('--dp', ((idx + Math.min(local / 0.38, 1)) / n).toFixed(4));
      day.setAttribute('data-kind', sits[idx].getAttribute('data-kind'));
    });
  }

  function initDay() {
    day = $('#day');
    if (!day) return;
    track = $('#dayTrack');
    sits = $all('.sit', day);
    countEl = $('#dayIndex');
    $('#dayTotal').textContent = sits.length;
    day.style.setProperty('--n', sits.length);
    setMode();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { setMode(); onScroll(); });
    if (osReduce.addEventListener) osReduce.addEventListener('change', setMode);
  }

  /* ------------------------------------------------------------------
     Scroll motion (styles: the "motion" block in styles.css). Adds
     html.js-motion only when motion is allowed; one rAF-throttled scroll
     handler writes 0..1 progress values as custom properties on the
     element that uses them, and adds .is-in to each entrance once its
     top passes into the lower part of the screen (or anything above it,
     so a jump to #contact never leaves skipped content hidden). Reduced motion (OS or the a11y widget) drops the class,
     and the CSS falls back to the still, complete page.
     ------------------------------------------------------------------ */
  function initMotion() {
    var backdrop = $('.backdrop'), hero = $('.hero'), steps = $('.start__steps'), about = $('.about');
    var stepItems = steps ? $all('li', steps) : [];
    var frame = 0, pending = [];

    function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
    function update() {
      frame = 0;
      if (!root.classList.contains('js-motion')) return;
      var vh = window.innerHeight;
      var max = document.documentElement.scrollHeight - vh;
      if (pending.length) {
        pending = pending.filter(function (el) {
          if (el.getBoundingClientRect().top < vh * 0.88) { el.classList.add('is-in'); return false; }
          return true;
        });
      }
      if (backdrop) backdrop.style.setProperty('--sp', clamp(window.scrollY / (max || 1)).toFixed(4));
      if (hero) {
        var hr = hero.getBoundingClientRect();
        if (hr.bottom > 0) hero.style.setProperty('--hp', clamp(-hr.top / (hr.height || 1)).toFixed(4));
      }
      if (steps) {
        var sr = steps.getBoundingClientRect();
        if (sr.top < vh && sr.bottom > 0) {
          // the thread starts drawing as the steps enter the lower third
          // of the screen and reaches the last number by mid-screen
          var sp = clamp((vh * 0.85 - sr.top) / (vh * 0.4));
          steps.style.setProperty('--stp', sp.toFixed(4));
          stepItems.forEach(function (li, i) {
            var at = stepItems.length > 1 ? i / (stepItems.length - 1) : 0;
            if (sp >= at * 0.98) li.classList.add('is-in');
          });
        }
      }
      if (about) {
        var ar = about.getBoundingClientRect();
        if (ar.top < vh && ar.bottom > 0) about.style.setProperty('--ap', clamp((vh - ar.top) / (vh + ar.height)).toFixed(4));
      }
    }
    function onScroll() { if (!frame) frame = requestAnimationFrame(update); }

    function enable() {
      var on = !reduced();
      root.classList.toggle('js-motion', on);
      if (on && !pending.length) {
        $all('.build__list li').forEach(function (li, i) { li.style.setProperty('--i', i); });
        $all('.faq details').forEach(function (d, i) { d.style.setProperty('--i', i); });
        var sel = '.build__list li, .build__note, .proof__list li, .day .sit, .form, .areas .panels, .faq';
        // on phones the steps stack: reveal each one as it scrolls in
        if (window.innerWidth < 900) sel += ', .start__steps li';
        pending = $all(sel).filter(function (el) { return !el.classList.contains('is-in'); });
      }
      update();
    }

    enable();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    if (osReduce.addEventListener) osReduce.addEventListener('change', enable);
    // the a11y widget toggles html.a11y-reduce-motion; follow it
    new MutationObserver(function () {
      if (root.classList.contains('js-motion') === reduced()) enable();
    }).observe(root, { attributes: true, attributeFilter: ['class'] });
  }

  /* ------------------------------------------- business-area tabs (ARIA) */
  function initTabs() {
    var tabs = $all('[role="tab"]');
    if (!tabs.length) return;
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        var panel = $('#' + t.getAttribute('aria-controls'));
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        panel.hidden = !on;
        panel.classList.remove('is-shown');
      });
      // replay the rows' entrance for the panel just shown
      var shown = $('#' + tab.getAttribute('aria-controls'));
      $all('.row', shown).forEach(function (r, i) { r.style.setProperty('--r', i); });
      void shown.offsetWidth;
      shown.classList.add('is-shown');
      if (focus) tab.focus();
      if (focus) tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab); });
      tab.addEventListener('keydown', function (e) {
        // RTL: the "next" tab sits to the left.
        var step = { ArrowLeft: 1, ArrowRight: -1, Home: -i, End: tabs.length - 1 - i }[e.key];
        if (step === undefined) return;
        e.preventDefault();
        select(tabs[(i + step + tabs.length) % tabs.length], true);
      });
    });
  }

  /* -------------------------------------------------------- contact form */
  /* Conversion events to window.dataLayer (GTM-compatible), forwarded to
     GA4 when gtag() is present. Same event names as the live site. */
  function trackEvent(name, params) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: name }, params || {}));
      if (typeof window.gtag === 'function') { window.gtag('event', name, params || {}); }
    } catch (err) {}
  }

  /* Contact form -> Make webhook -> Airtable, same payload as the live site. */
  function initForm() {
    var form = $('#contactForm');
    var status = $('#formStatus');
    if (!form || !status) return;
    var WEBHOOK = 'https://hook.eu1.make.com/nfhgrgadq0tvmrhe8j6e6uomyrbm5jly';
    var started = false;
    form.addEventListener('focusin', function () {
      if (!started) { started = true; trackEvent('lead_form_start', { form_id: 'contactForm' }); }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        status.classList.add('is-error');
        status.textContent = 'חסרים פרטים. מלאו את השדות המסומנים ואשרו את מדיניות הפרטיות.';
        form.reportValidity();
        return;
      }
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      status.classList.remove('is-error');
      status.textContent = 'שולח...';
      var areaInput = form.querySelector('input[name="area"]:checked');
      var area = areaInput ? areaInput.value : '';
      var payload = {
        fullName: form.fullName.value,
        email: form.email.value,
        business: form.business.value,
        message: (area ? 'תחום: ' + area + '\n\n' : '') + form.message.value,
        area: area
      };
      fetch(WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        status.textContent = 'תודה! ההודעה נשלחה, אחזור אליכם בהקדם.';
        trackEvent('lead_form_submit', { form_id: 'contactForm', has_business: !!payload.business, area: area || 'none' });
        form.reset();
        started = false;
      }).catch(function () {
        status.classList.add('is-error');
        status.textContent = 'משהו השתבש בשליחה. נסו שוב או כתבו לי בוואטסאפ.';
        trackEvent('lead_form_error', { form_id: 'contactForm' });
      }).finally(function () {
        btn.disabled = false;
      });
    });
  }
  function initWhatsApp() {
    $all('[data-wa]').forEach(function (a) {
      a.addEventListener('click', function () {
        trackEvent('whatsapp_click', { link_location: a.getAttribute('data-wa-loc') || 'inline_link' });
      });
    });
  }

  /* ---------------------------------------------- accessibility widget */
  function initA11y() {
    var toggle = $('#a11yToggle'), panel = $('#a11yPanel');
    var KEY = 'a11yPrefsReutAI', STEPS = [1, 1.1, 1.2, 1.3];
    var prefs = { scale: 0, contrast: false, motion: false };
    try { var saved = JSON.parse(localStorage.getItem(KEY)); if (saved) prefs = Object.assign(prefs, saved); } catch (err) {}

    function apply() {
      root.style.setProperty('--a11y-scale', STEPS[prefs.scale]);
      root.classList.toggle('a11y-high-contrast', prefs.contrast);
      root.classList.toggle('a11y-reduce-motion', prefs.motion);
      [['#a11yContrast', prefs.contrast], ['#a11yMotion', prefs.motion]].forEach(function (b) {
        var el = $(b[0]);
        el.setAttribute('aria-pressed', String(b[1]));
        el.textContent = b[1] ? 'כיבוי' : 'הפעלה';
      });
      if (day) setMode();
    }
    function save() { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (err) {} }
    function setOpen(open) { panel.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); }

    toggle.addEventListener('click', function () { setOpen(panel.hidden); });
    document.addEventListener('click', function (e) {
      if (!panel.hidden && !panel.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { setOpen(false); toggle.focus(); } });
    $('#a11yFontInc').addEventListener('click', function () { prefs.scale = Math.min(prefs.scale + 1, STEPS.length - 1); apply(); save(); });
    $('#a11yFontDec').addEventListener('click', function () { prefs.scale = Math.max(prefs.scale - 1, 0); apply(); save(); });
    $('#a11yContrast').addEventListener('click', function () { prefs.contrast = !prefs.contrast; apply(); save(); });
    $('#a11yMotion').addEventListener('click', function () { prefs.motion = !prefs.motion; apply(); save(); });
    $('#a11yReset').addEventListener('click', function () { prefs = { scale: 0, contrast: false, motion: false }; apply(); save(); });
    apply();
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Each part starts on its own, so a failure in one never stops the form.
    [initForm, initWhatsApp, initA11y, initDay, initTabs, initMotion, function () {
      $('#year').textContent = new Date().getFullYear();
    }].forEach(function (init) {
      try { init(); } catch (err) { if (window.console) console.error(err); }
    });
  });
})();
