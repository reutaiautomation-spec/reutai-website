/* =====================================================================
   Reut AI, redesign mock (direction 2): page behaviour.
   MOCK SAFETY: no network requests. The contact form and the WhatsApp
   link are intercepted and never leave the page.
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

  /* ------------------------------------------------ contact form (MOCK) */
  /* Conversion events to window.dataLayer (GTM-compatible), forwarded to
     GA4 when gtag() is present. Same event names as the live site. */
  function track(name, params) {
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
      if (!started) { started = true; track('lead_form_start', { form_id: 'contactForm' }); }
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
      var payload = {
        fullName: form.fullName.value,
        email: form.email.value,
        business: form.business.value,
        message: form.message.value
      };
      fetch(WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        status.textContent = 'תודה! ההודעה נשלחה, אחזור אליכם בהקדם.';
        track('lead_form_submit', { form_id: 'contactForm', has_business: !!payload.business });
        form.reset();
        started = false;
      }).catch(function () {
        status.classList.add('is-error');
        status.textContent = 'משהו השתבש בשליחה. נסו שוב או כתבו לי בוואטסאפ.';
        track('lead_form_error', { form_id: 'contactForm' });
      }).finally(function () {
        btn.disabled = false;
      });
    });
  }
  function initWhatsApp() {
    $all('[data-wa]').forEach(function (a) {
      a.addEventListener('click', function () {
        track('whatsapp_click', { link_location: a.getAttribute('data-wa-loc') || 'inline_link' });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    $('#year').textContent = new Date().getFullYear();
    initA11y();
    initDay();
    initForm();
    initWhatsApp();
  });
})();
