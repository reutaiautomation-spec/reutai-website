(function () {
  'use strict';

  var reduceMotionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* =====================================================================
     The pain line: the real 22 customer sentences, one at a time, each
     flying in from a random corner of the screen. Paced on its own timer
     while the section is in view — not scroll-locked, so scrolling past
     is always free. Lands on the solution line with a sparkle burst and
     the CTA, then stops.
     ===================================================================== */
  function initPains() {
    var act = document.querySelector('.ch-pains');
    var el = document.getElementById('painsSentence');
    var sparkle = document.getElementById('painsSparkle');
    if (!act || !el) return;
    var STEP_MS = 1150;

    // Real content, unabridged: the 22 original pain-point sentences.
    var PAIN = [
      'אני חושב לגייס מזכירה.',
      'אנחנו מתכתבים הלוך ושוב כדי לקבוע.',
      'העובדת שלי יושבת שעות על זה.',
      'אני שולח את אותה הודעה לכל לקוח.',
      'אנחנו עושים את אותה פעולה שוב ושוב.',
      'צריך לעדכן את אותו דבר בכמה מערכות.',
      'יש לי מיליון אקסלים.',
      'כשמשהו משתנה פה, צריך לזכור לשנות גם שם.',
      'חלק בוואטסאפ, חלק במייל וחלק בדרייב.',
      'לפעמים אנחנו שוכחים לחזור ללידים.',
      'שואלים אותי כל היום אותן שאלות.',
      'אני שולח הודעה אחרי כמה ימים.',
      'אנחנו משלמים על מערכת ומשתמשים ב-10% ממנה.',
      'אם הוא לא עונה, בדרך כלל זה נגמר שם.',
      'אני צריך לעבור על המון מסמכים.',
      'כל פעם אני כותב כמעט את אותו מסמך.',
      'אני צריך לסנן מאות אפשרויות.',
      'אחרי שסוגרים לקוח יש מיליון דברים לעשות.',
      'צריך לבדוק מי שילם.',
      'אני לא יודע כמה לידים באמת הפכו ללקוחות.',
      'אני מוציא מסמכים אחד-אחד.',
      'אף CRM לא מתאים לנו.'
    ];
    var FINAL = 'לכל זה יש פתרון - שיחה איתי.';
    var ALL = PAIN.concat([FINAL]);

    // Eight entry vectors, roughly: top-right, bottom-left, mid-right,
    // top-left, bottom-right, mid-left, top-centre, bottom-centre.
    var ENTRIES = [
      'translate(38vw, -30vh) rotate(-6deg)',
      'translate(-38vw, 30vh) rotate(5deg)',
      'translate(32vw, 4vh) rotate(3deg)',
      'translate(-32vw, -26vh) rotate(-4deg)',
      'translate(34vw, 28vh) rotate(6deg)',
      'translate(-34vw, 2vh) rotate(-3deg)',
      'translate(2vw, -30vh) rotate(2deg)',
      'translate(-2vw, 30vh) rotate(-2deg)'
    ];

    var idx = -1;
    var lastEntry = -1;
    var timer = null;

    function pickEntry() {
      var i;
      do { i = Math.floor(Math.random() * ENTRIES.length); } while (i === lastEntry && ENTRIES.length > 1);
      lastEntry = i;
      return ENTRIES[i];
    }

    function showNext() {
      idx++;
      if (idx >= ALL.length) { idx = ALL.length - 1; stop(); return; }
      var isFinal = idx === ALL.length - 1;

      el.style.transition = 'none';
      el.style.opacity = '0';
      el.style.transform = pickEntry();
      void el.offsetWidth; // force reflow so the entry transform applies before we animate away from it
      el.style.transition = '';
      el.textContent = ALL[idx];
      el.classList.toggle('is-final', isFinal);
      requestAnimationFrame(function () {
        el.style.opacity = '1';
        el.style.transform = 'translate(0, 0) rotate(0deg)';
      });

      if (isFinal) {
        if (sparkle) {
          sparkle.classList.remove('burst');
          void sparkle.offsetWidth;
          sparkle.classList.add('burst');
        }
        stop();
      }
    }

    function start() {
      if (timer || idx >= ALL.length - 1) return;
      if (idx === -1) showNext();
      timer = setInterval(showNext, STEP_MS);
    }
    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    if (reduceMotionMQ.matches) {
      idx = ALL.length - 1;
      el.textContent = FINAL;
      el.classList.add('is-final');
      el.style.opacity = '1';
      el.style.transform = 'none';
      return;
    }

    // Paced by its own timer, gated only by visibility — never by scroll
    // position, so scrolling past is always free and immediate.
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.isIntersecting ? start() : stop(); });
    }, { threshold: 0.25 });
    io.observe(act);
  }

  /* =====================================================================
     Proof cases: wipe from problem to solution once each case is read.
     ===================================================================== */
  function initProofWipes() {
    var cases = Array.prototype.slice.call(document.querySelectorAll('[data-case]'));
    if (!cases.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && e.intersectionRatio > 0.55) {
          e.target.classList.add('is-solved');
        }
      });
    }, { threshold: [0, 0.55, 1] });
    cases.forEach(function (c) { io.observe(c); });
  }

  /* =====================================================================
     Lightweight, vendor-neutral conversion tracking. Pushes named events
     to window.dataLayer (GTM-compatible) and, if a GA4 gtag() is present,
     forwards them too. Does nothing harmful when no analytics is loaded —
     wire GA4 or GTM later without touching this file.
     Events: whatsapp_click, lead_form_start, lead_form_submit,
             lead_form_error, cta_click.
     ===================================================================== */
  function track(name, params) {
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: name }, params || {}));
      if (typeof window.gtag === 'function') { window.gtag('event', name, params || {}); }
    } catch (err) {}
  }

  function initTracking() {
    // WhatsApp — floating button, in-page links, and any wa.me / short link
    var waSel = '.wa-fab, [data-wa], a[href*="wa.me"], a[href*="katzr.net/c5e3a2"]';
    Array.prototype.forEach.call(document.querySelectorAll(waSel), function (a) {
      a.addEventListener('click', function () {
        track('whatsapp_click', {
          link_location: a.getAttribute('data-wa-loc') ||
            (a.classList.contains('wa-fab') ? 'floating_button' : 'inline_link')
        });
      });
    });
    // CTAs that route to the contact form
    Array.prototype.forEach.call(document.querySelectorAll('a[href="#contact"]'), function (a) {
      a.addEventListener('click', function () {
        track('cta_click', {
          cta_text: (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
          cta_location: a.className || 'link'
        });
      });
    });
  }

  /* =====================================================================
     Contact form -> Make webhook -> Airtable. Same field names/shape as
     the previous build; the automation on the other end is unchanged.
     ===================================================================== */
  function initContactForm() {
    var form = document.getElementById('contactForm');
    var status = document.getElementById('formStatus');
    if (!form || !status) return;
    var WEBHOOK = 'https://hook.eu1.make.com/nfhgrgadq0tvmrhe8j6e6uomyrbm5jly';
    var started = false;

    form.addEventListener('focusin', function () {
      if (!started) { started = true; track('lead_form_start', { form_id: 'contactForm' }); }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
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
      }).then(function () {
        status.textContent = 'תודה! ההודעה נשלחה, אחזור אליכם בהקדם.';
        track('lead_form_submit', { form_id: 'contactForm', has_business: !!payload.business });
        form.reset();
        started = false;
      }).catch(function () {
        status.textContent = 'משהו השתבש בשליחה. נסו שוב או צרו קשר ישירות.';
        track('lead_form_error', { form_id: 'contactForm' });
      }).finally(function () {
        btn.disabled = false;
      });
    });
  }

  /* =====================================================================
     Accessibility widget: text scale, high contrast, reduce motion.
     Independent of the scroll device kit; scrollcraft.css already
     handles prefers-reduced-motion for its own devices, this covers the
     things it does not (font scale, contrast) and lets a visitor force
     reduce-motion regardless of OS setting.
     ===================================================================== */
  function initA11yWidget() {
    var toggle = document.getElementById('a11yToggle');
    var panel = document.getElementById('a11yPanel');
    if (!toggle || !panel) return;
    var fontDec = document.getElementById('a11yFontDec');
    var fontInc = document.getElementById('a11yFontInc');
    var contrastBtn = document.getElementById('a11yContrastToggle');
    var motionBtn = document.getElementById('a11yMotionToggle');
    var resetBtn = document.getElementById('a11yReset');

    var STORAGE_KEY = 'a11yPrefsReut';
    var SCALE_STEPS = [1, 1.1, 1.2, 1.3];
    var prefs = { scaleIndex: 0, contrast: false, reduceMotion: reduceMotionMQ.matches };
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved) prefs = Object.assign(prefs, saved);
    } catch (err) {}

    function apply() {
      document.documentElement.style.setProperty('--a11y-scale', SCALE_STEPS[prefs.scaleIndex]);
      document.documentElement.classList.toggle('a11y-high-contrast', prefs.contrast);
      document.documentElement.classList.toggle('a11y-reduce-motion', prefs.reduceMotion);
      contrastBtn.setAttribute('aria-pressed', String(prefs.contrast));
      contrastBtn.textContent = prefs.contrast ? 'כיבוי' : 'הפעלה';
      motionBtn.setAttribute('aria-pressed', String(prefs.reduceMotion));
      motionBtn.textContent = prefs.reduceMotion ? 'כיבוי' : 'הפעלה';
    }
    function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); }

    toggle.addEventListener('click', function () {
      var open = panel.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', function (e) {
      if (!panel.contains(e.target) && !toggle.contains(e.target) && panel.classList.contains('open')) {
        panel.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
    fontInc.addEventListener('click', function () { prefs.scaleIndex = Math.min(prefs.scaleIndex + 1, SCALE_STEPS.length - 1); apply(); save(); });
    fontDec.addEventListener('click', function () { prefs.scaleIndex = Math.max(prefs.scaleIndex - 1, 0); apply(); save(); });
    contrastBtn.addEventListener('click', function () { prefs.contrast = !prefs.contrast; apply(); save(); });
    motionBtn.addEventListener('click', function () { prefs.reduceMotion = !prefs.reduceMotion; apply(); save(); location.reload(); });
    resetBtn.addEventListener('click', function () { prefs = { scaleIndex: 0, contrast: false, reduceMotion: reduceMotionMQ.matches }; apply(); save(); });

    apply();
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('year') && (document.getElementById('year').textContent = new Date().getFullYear());
    initPains();
    initProofWipes();
    initContactForm();
    initA11yWidget();
    initTracking();
    if (window.ScrollCraft && typeof window.ScrollCraft.mount === 'function') {
      window.ScrollCraft.mount(document.body);
    }
  });
})();
