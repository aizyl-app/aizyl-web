/* ============================================================
   JAK TO DZIAŁA — GSAP ScrollTrigger + ScrollToPlugin
   ============================================================ */

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

/* ============================================================
   AKT-09 GUARDIAN ORB — canvas 3D sphere z cząsteczkami
   Ciągła animacja, niezależna od scrolla.
   Logika przeniesiona z particle-orb.tsx (useEffect).
   ============================================================ */
(function initGuardianOrb() {
  var canvas = document.getElementById('guardian-orb-canvas-09');
  if (!canvas) return;

  /* ---- devicePixelRatio + resize ---- */
  var dpr = window.devicePixelRatio || 1;

  function resize() {
    var wrap = canvas.parentElement;
    if (!wrap) return;
    var w = wrap.offsetWidth;
    var h = wrap.offsetHeight;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
  }

  resize();

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { resize(); }, 150);
  }, { passive: true });

  var ctx = canvas.getContext('2d');

  /* ---- Parametry sfery (identyczne z particle-orb.tsx) ---- */
  var COUNT  = 80;
  var RADIUS = 90;   /* promień sfery w pikselach logicznych */
  var LINK_DIST = 60; /* próg odległości dla połączeń (px) */
  var ROT_X  = 0.003;
  var ROT_Y  = 0.005;

  /* ---- Kolor RGB (var(--primary) = #0B6951) ---- */
  var R_CH = 11;
  var G_CH = 105;
  var B_CH = 81;

  /* ---- Generuj cząsteczki na sferze (rozkład Fibonacciego) ---- */
  var particles = [];
  var goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (var i = 0; i < COUNT; i++) {
    var y3d = 1 - (i / (COUNT - 1)) * 2;          /* -1 … 1 */
    var r3d = Math.sqrt(1 - y3d * y3d);
    var theta = goldenAngle * i;
    particles.push({
      x: Math.cos(theta) * r3d,
      y: y3d,
      z: Math.sin(theta) * r3d,
    });
  }

  /* ---- Macierze rotacji ---- */
  var angleX = 0;
  var angleY = 0;

  function rotateX(p, a) {
    var cos = Math.cos(a);
    var sin = Math.sin(a);
    return {
      x: p.x,
      y: p.y * cos - p.z * sin,
      z: p.y * sin + p.z * cos,
    };
  }

  function rotateY(p, a) {
    var cos = Math.cos(a);
    var sin = Math.sin(a);
    return {
      x: p.x * cos + p.z * sin,
      y: p.y,
      z: -p.x * sin + p.z * cos,
    };
  }

  /* ---- Projekcja perspektywiczna ---- */
  var FOCAL = 300;

  function project(p) {
    var scale = FOCAL / (FOCAL + p.z * RADIUS);
    return {
      sx: p.x * RADIUS * scale,
      sy: p.y * RADIUS * scale,
      sz: p.z,
      scale: scale,
    };
  }

  /* ---- Pętla animacji ---- */
  var rafId = null;

  function draw() {
    var w = canvas.width;
    var h = canvas.height;
    var cx = w / 2;
    var cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    /* Przyrost rotacji */
    angleX += ROT_X;
    angleY += ROT_Y;

    /* Przelicz pozycje 3D → 2D */
    var projected = particles.map(function (p) {
      var rp = rotateY(rotateX(p, angleX), angleY);
      var pr = project(rp);
      return {
        x: cx + pr.sx * dpr,
        y: cy + pr.sy * dpr,
        z: pr.sz,
        scale: pr.scale,
      };
    });

    /* Sortuj po z (dalsze rysowane pierwsze) */
    projected.sort(function (a, b) { return a.z - b.z; });

    /* ---- Rysuj połączenia ---- */
    for (var i = 0; i < projected.length; i++) {
      for (var j = i + 1; j < projected.length; j++) {
        var dx = projected[i].x - projected[j].x;
        var dy = projected[i].y - projected[j].y;
        var dist = Math.sqrt(dx * dx + dy * dy) / dpr;
        if (dist > LINK_DIST) continue;

        /* Alpha zależy od odległości i głębokości obu punktów */
        var depthAlpha = ((projected[i].z + projected[j].z) / 2 + 1) / 2;
        var distAlpha  = 1 - dist / LINK_DIST;
        var alpha = depthAlpha * distAlpha * 0.45;

        ctx.beginPath();
        ctx.moveTo(projected[i].x, projected[i].y);
        ctx.lineTo(projected[j].x, projected[j].y);
        ctx.strokeStyle = 'rgba(' + R_CH + ',' + G_CH + ',' + B_CH + ',' + alpha.toFixed(3) + ')';
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();
      }
    }

    /* ---- Rysuj cząsteczki ---- */
    for (var k = 0; k < projected.length; k++) {
      var pt = projected[k];
      var depthA = (pt.z + 1) / 2;          /* 0 (tył) … 1 (przód) */
      var ptAlpha = 0.3 + depthA * 0.7;
      var ptRadius = (1.5 + pt.scale * 1.5) * dpr;

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, ptRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + R_CH + ',' + G_CH + ',' + B_CH + ',' + ptAlpha.toFixed(3) + ')';
      ctx.fill();
    }

    rafId = requestAnimationFrame(draw);
  }

  draw();

})();

(function () {
  'use strict';

  const dots = document.querySelectorAll('.dot-nav .dot');
  const akty = document.querySelectorAll('.akt');

  /* ----------------------------------------------------------
     Pomocnik: ustaw aktywną kropkę po numerze aktu
  ---------------------------------------------------------- */
  function setActiveDot(aktNum) {
    dots.forEach(function (dot) {
      if (dot.dataset.akt === aktNum) {
        dot.classList.add('is-active');
      } else {
        dot.classList.remove('is-active');
      }
    });
  }

  /* ----------------------------------------------------------
     Klik na .dot → smooth scroll przez GSAP
  ---------------------------------------------------------- */
  dots.forEach(function (dot) {
    dot.addEventListener('click', function (e) {
      e.preventDefault();

      const aktNum  = dot.dataset.akt;                          // np. "01"
      const target  = document.querySelector('[data-akt="' + aktNum + '"].akt');

      if (!target) return;

      gsap.to(window, {
        duration: 1,
        scrollTo: {
          y: target,
          offsetY: 0,
        },
        ease: 'power2.inOut',
      });
    });
  });

  /* ----------------------------------------------------------
     Nav scrolled shadow (wspólny wzorzec z głównego script.js)
  ---------------------------------------------------------- */
  const nav = document.getElementById('site-nav');
  if (nav) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 10) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    }, { passive: true });
  }

  /* ----------------------------------------------------------
     AKT-01 SCANNER — PIN + SCRUB TIMELINE (jednoscenowa)
     Fazy (progress 0–1):
       0.00–0.10  stan startowy — oba okna z danymi widocznymi
       0.10–0.75  .scan-beam przejeżdża od góry do dołu sceny;
                  w momencie mijania każdej poufnej linii/pola
                  tekst → [POUFNE] / pole → czarny blok redakcji
       0.75–0.92  hold — scena zanonimizowana, beam zanika,
                  badge "Zanonimizowano" fade-in
       0.92–1.00  koniec
  ---------------------------------------------------------- */
  (function initScannerScene() {
    var akt1 = document.getElementById('akt-1');
    if (!akt1) return;

    var scene    = akt1.querySelector('#scanner-scene-01');
    var beam     = akt1.querySelector('#scan-beam-01');
    var badge    = akt1.querySelector('#anon-badge-01');

    /* Poufne linie dokumentu (data-secret="true") */
    var docValues = [
      akt1.querySelector('#akt1-val-zleceniobiorca'),
      akt1.querySelector('#akt1-val-pesel'),
      akt1.querySelector('#akt1-val-konto'),
    ];

    /* Poufne pola CRM (data-secret="true") */
    var crmInputs = [
      akt1.querySelector('#akt1-val-imie'),
      akt1.querySelector('#akt1-val-email'),
    ];

    /* Oryginalne wartości tekstowe */
    var origDocValues = docValues.map(function (el) {
      return el ? el.textContent : '';
    });
    var origCrmValues = crmInputs.map(function (el) {
      return el ? el.textContent : '';
    });

    /* Wszystkie śledzone elementy + ich oryginalne wartości + typ */
    var trackedEls  = docValues.concat(crmInputs);
    var trackedOrig = origDocValues.concat(origCrmValues);
    /* typ: 'doc' dla linii dokumentu, 'crm' dla pól formularza */
    var trackedType = ['doc','doc','doc','crm','crm'];

    /* Progi (ułamek 0–1 całej timeline) — obliczane dynamicznie */
    var thresholds  = [0, 0, 0, 0, 0];

    /* Stany anonimizacji */
    var prevRedacted = [false, false, false, false, false];

    /* ---- Pomocnik: anonimizuj / przywróć ---- */
    function redact(el, origText, type, shouldRedact) {
      if (!el) return;
      if (shouldRedact) {
        if (type === 'doc') {
          el.textContent = '[POUFNE]';
          el.classList.add('is-redacted');
        } else {
          /* crm — czarny blok, tekst ukryty przez CSS */
          el.textContent = '';
          el.classList.add('is-redacted');
        }
      } else {
        el.textContent = origText;
        el.classList.remove('is-redacted');
      }
    }

    /* ---- Oblicz progi z rzeczywistego layoutu ---- */
    /*
      Belka startuje powyżej sceny (top = -beamH) i jedzie do
      bottom sceny (top = sceneH).
      Zakres ruchu belki w timeline: 0.10 → 0.75 (65% progresu).
      Próg elementu = moment, gdy środek belki mija środek elementu.

      beamTop(p) = -beamH + (p - 0.10) / 0.65 * (sceneH + beamH)
      środek belki = beamTop + beamH/2

      Szukamy p gdy: beamTop(p) + beamH/2 = elCenterY (względem sceny)
        → p = 0.10 + (elCenterY - beamH/2 + beamH) / (sceneH + beamH) * 0.65
        → p = 0.10 + (elCenterY + beamH/2) / (sceneH + beamH) * 0.65
    */
    function computeThresholds() {
      if (!scene || !beam) return;

      var sceneRect = scene.getBoundingClientRect();
      var beamH     = beam.offsetHeight || 28;
      var sceneH    = scene.offsetHeight;

      thresholds = trackedEls.map(function (el) {
        if (!el) return 0.10;
        var elRect    = el.getBoundingClientRect();
        /* środek elementu względem górnej krawędzi sceny */
        var elCenterY = (elRect.top - sceneRect.top) + el.offsetHeight / 2;
        var raw = 0.10 + (elCenterY + beamH / 2) / (sceneH + beamH) * 0.65;
        return Math.min(Math.max(raw, 0.10), 0.75);
      });
    }

    /* ---- Główna timeline ---- */
    var tl1 = null;
    var st1 = null;

    function buildTimeline1() {
      if (st1) { st1.kill(); }
      if (tl1) { tl1.kill(); }

      /* Stan początkowy */
      trackedEls.forEach(function (el, i) {
        redact(el, trackedOrig[i], trackedType[i], false);
      });
      prevRedacted.fill(false);

      if (window.innerWidth <= 860) return;

      if (beam) gsap.set(beam, { top: -(beam.offsetHeight || 28) + 'px', opacity: 1 });
      if (badge) gsap.set(badge, { opacity: 0 });

      tl1 = gsap.timeline({ paused: true });

      /* 0–10%: stan startowy (placeholder) */
      tl1.to({}, { duration: 0.10, ease: 'none' }, 0);

      /* 10–75%: beam przejeżdża od góry do dołu sceny */
      tl1.to(beam, {
        top: function () {
          return (scene ? scene.offsetHeight : 500) + 'px';
        },
        ease: 'none',
        duration: 0.65,
      }, 0.10);

      /* 75–85%: beam zanika */
      tl1.to(beam, {
        opacity: 0,
        duration: 0.10,
        ease: 'power2.in',
      }, 0.75);

      /* 78–90%: badge "Zanonimizowano" fade-in */
      tl1.to(badge, {
        opacity: 1,
        duration: 0.12,
        ease: 'power2.out',
      }, 0.78);

      /* 90–100%: hold */
      tl1.to({}, { duration: 0.10, ease: 'none' }, 0.90);

      /* ---- ScrollTrigger: pin + scrub ---- */
      st1 = ScrollTrigger.create({
        trigger: akt1,
        start: 'top top',
        end: '+=180%',
        pin: true,
        scrub: true,
        animation: tl1,
        onToggle: function (self) { if (self.isActive) setActiveDot('01'); },
        onUpdate: function (self) {
          var p = self.progress;

          trackedEls.forEach(function (el, i) {
            if (!el) return;
            var shouldRedact = p >= thresholds[i];
            if (shouldRedact !== prevRedacted[i]) {
              prevRedacted[i] = shouldRedact;
              redact(el, trackedOrig[i], trackedType[i], shouldRedact);
            }
          });
        },
      });
    }

    /* ---- Inicjalizacja po załadowaniu strony ---- */
    window.addEventListener('load', function () {
      computeThresholds();
      buildTimeline1();
    });

    /* ---- Resize: przelicz progi + przebuduj (debounced 150 ms) ---- */
    var resizeTimer1 = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer1);
      resizeTimer1 = setTimeout(function () {
        computeThresholds();
        buildTimeline1();
        ScrollTrigger.refresh();
      }, 150);
    }, { passive: true });

  })();

  /* ----------------------------------------------------------
     AKT-02 EXPLORER SCENE — PIN + SCRUB TIMELINE
     Fazy (progress 0–1):
       0.00–0.15  stan startowy — 7 plików widocznych, nowy ukryty
       0.15–0.30  fn-e-new: opacity 0→1, scale 0.7→1 (fade+scale in)
       0.30–0.65  .shine przejeżdża przez całe .win-explorer (tam-i-z-powrotem),
                  pulsujący box-shadow na .win-explorer w var(--primary),
                  toast "Watchdog: nowy plik wykryty, skanowanie..."
                  → w 2. połowie (≈0.475) zmienia się na "Plik bezpieczny ✓ — zapisano w historii"
       0.65–0.85  hold — wynik w pełni widoczny, bez zmian
       0.85–1.00  fade out toastu, comparison-summary fade-in
  ---------------------------------------------------------- */
  (function initFileScene() {
    var akt2 = document.getElementById('akt-2');
    if (!akt2) return;

    /* ---- Elementy DOM ---- */
    var winExplorer = akt2.querySelector('#win-explorer-02');
    var fnENew      = akt2.querySelector('#fn-e-new');
    var shineEl     = akt2.querySelector('#shine-explorer');

    /* Toast */
    var toastEl     = akt2.querySelector('#toast-explorer');
    var toastIcon   = akt2.querySelector('#toast-explorer-icon');
    var toastText   = akt2.querySelector('#toast-explorer-text');

    /* Porównanie */
    var comparison2 = akt2.querySelector('#comparison-summary-02');

    /* ---- Pomocnik: utwórz i wstrzyknij .ping-ring do node'a ---- */
    function createPingRing(node) {
      var ring = document.createElement('span');
      ring.className = 'ping-ring';
      node.appendChild(ring);
      return ring;
    }

    /* ---- Główna timeline (budowana po load, gdy layout jest gotowy) ---- */
    var tl2 = null;
    var st2 = null;

    function buildTimeline() {
      /* Usuń poprzednią instancję przy rebuild (resize) */
      if (st2) { st2.kill(); }
      if (tl2) { tl2.kill(); }

      /* Usuń stare ping-ringi */
      akt2.querySelectorAll('.ping-ring').forEach(function (r) { r.remove(); });

      if (window.innerWidth <= 860) return;

      /* Utwórz ping-ring dla nowego pliku */
      var ringNew = fnENew ? createPingRing(fnENew) : null;

      /* ---- Stan początkowy ---- */
      if (fnENew) {
        gsap.set(fnENew, { clearProps: 'all' });
        gsap.set(fnENew, { opacity: 0, scale: 0.7, transformOrigin: 'center center' });
      }

      /* Shine — poza ekranem (lewo) */
      if (shineEl) gsap.set(shineEl, { left: '-40%' });

      /* win-explorer — brak glow */
      if (winExplorer) gsap.set(winExplorer, { boxShadow: '0 2px 12px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.12)' });

      /* Toast — ukryty, tekst startowy */
      if (toastEl) {
        gsap.set(toastEl, { opacity: 0 });
        if (toastIcon) toastIcon.className = 'ti ti-shield-search toast__icon';
        if (toastText) toastText.textContent = 'Watchdog: nowy plik wykryty, skanowanie...';
      }

      /* Ping-ring — ukryty */
      if (ringNew) gsap.set(ringNew, { scale: 1, opacity: 0 });

      /* Porównanie — ukryte */
      if (comparison2) gsap.set(comparison2, { opacity: 0, visibility: 'hidden' });

      /* ---- Buduj timeline (totalDuration = 1, fazy jako ułamki) ---- */
      tl2 = gsap.timeline({ paused: true });

      /* ── FAZA 0–15%: stan startowy (placeholder) ── */
      tl2.to({}, { duration: 0.15, ease: 'none' }, 0);

      /* ── FAZA 15–30%: nowy plik pojawia się (fade + scale in) ── */
      if (fnENew) {
        tl2.to(fnENew, {
          opacity: 1,
          scale: 1,
          duration: 0.15,
          ease: 'back.out(1.6)',
        }, 0.15);
      }

      /* ── FAZA 30–65%: shine cykl tam-i-z-powrotem + glow + toast ── */

      /*
        Shine: left: -40% → 110% → -40%
        Czas całego cyklu: 0.35 (od 0.30 do 0.65)
        Połowa cyklu (tam): 0.175 → left: -40% → 110%
        Druga połowa (z powrotem): 0.175 → left: 110% → -40%
      */
      if (shineEl) {
        /* Tam: -40% → 110% */
        tl2.fromTo(shineEl,
          { left: '-40%' },
          { left: '110%', duration: 0.175, ease: 'power1.inOut' },
          0.30
        );
        /* Z powrotem: 110% → -40% */
        tl2.fromTo(shineEl,
          { left: '110%' },
          { left: '-40%', duration: 0.175, ease: 'power1.inOut' },
          0.475
        );
      }

      /* Pulsujący box-shadow na .win-explorer przez całą fazę 30–65% */
      if (winExplorer) {
        /* Fade-in glow */
        tl2.to(winExplorer, {
          boxShadow: '0 0 0 2px color-mix(in srgb, var(--primary) 50%, transparent), 0 0 18px 4px color-mix(in srgb, var(--primary) 25%, transparent)',
          duration: 0.05,
          ease: 'power2.out',
        }, 0.30);

        /* Puls 1: intensywniejszy */
        tl2.to(winExplorer, {
          boxShadow: '0 0 0 3px color-mix(in srgb, var(--primary) 70%, transparent), 0 0 28px 8px color-mix(in srgb, var(--primary) 35%, transparent)',
          duration: 0.07,
          ease: 'power1.inOut',
        }, 0.37);

        /* Puls 1: powrót */
        tl2.to(winExplorer, {
          boxShadow: '0 0 0 2px color-mix(in srgb, var(--primary) 50%, transparent), 0 0 18px 4px color-mix(in srgb, var(--primary) 25%, transparent)',
          duration: 0.07,
          ease: 'power1.inOut',
        }, 0.44);

        /* Puls 2: intensywniejszy */
        tl2.to(winExplorer, {
          boxShadow: '0 0 0 3px color-mix(in srgb, var(--primary) 70%, transparent), 0 0 28px 8px color-mix(in srgb, var(--primary) 35%, transparent)',
          duration: 0.07,
          ease: 'power1.inOut',
        }, 0.51);

        /* Puls 2: powrót */
        tl2.to(winExplorer, {
          boxShadow: '0 0 0 2px color-mix(in srgb, var(--primary) 50%, transparent), 0 0 18px 4px color-mix(in srgb, var(--primary) 25%, transparent)',
          duration: 0.07,
          ease: 'power1.inOut',
        }, 0.58);

        /* Fade-out glow — przed holdem */
        tl2.to(winExplorer, {
          boxShadow: '0 2px 12px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.12)',
          duration: 0.07,
          ease: 'power2.in',
        }, 0.63);
      }

      /* Ping-ring na nowym pliku — pojawia się na początku fazy skanowania */
      if (ringNew) {
        tl2.fromTo(ringNew,
          { scale: 1, opacity: 1 },
          { scale: 2.6, opacity: 0, duration: 0.10, ease: 'power2.out' },
          0.32
        );
      }

      /* Toast fade-in — "Watchdog: nowy plik wykryty, skanowanie..." */
      if (toastEl) {
        tl2.to(toastEl, {
          opacity: 1,
          duration: 0.05,
          ease: 'power2.out',
        }, 0.31);

        /* W 2. połowie fazy (≈ progress 0.475) zmień tekst na wynik */
        tl2.to({}, {
          duration: 0.02,
          ease: 'none',
          onStart: function () {
            if (toastIcon) toastIcon.className = 'ti ti-check toast__icon toast__icon--ok';
            if (toastText) toastText.textContent = 'Plik bezpieczny \u2713 \u2014 zapisano w historii';
          },
          onReverseComplete: function () {
            if (toastIcon) toastIcon.className = 'ti ti-shield-search toast__icon';
            if (toastText) toastText.textContent = 'Watchdog: nowy plik wykryty, skanowanie...';
          },
        }, 0.475);
      }

      /* ── FAZA 65–85%: hold — toast widoczny, bez zmian ── */
      /* (placeholder — tl2 nie robi nic w tym przedziale) */
      tl2.to({}, { duration: 0.20, ease: 'none' }, 0.65);

      /* ── FAZA 85–100%: fade out toastu + comparison-summary fade-in ── */
      if (toastEl) {
        tl2.to(toastEl, {
          opacity: 0,
          duration: 0.06,
          ease: 'power2.in',
        }, 0.85);
      }

      if (comparison2) {
        tl2.to(comparison2, {
          opacity: 1,
          visibility: 'visible',
          duration: 0.12,
          ease: 'power2.out',
        }, 0.87);
      }

      /* ---- ScrollTrigger: pin + scrub ---- */
      st2 = ScrollTrigger.create({
        trigger: akt2,
        start: 'top top-=80',
        end: '+=150%',
        pin: true,
        scrub: true,
        animation: tl2,
        onToggle: function (self) { if (self.isActive) setActiveDot('02'); },
      });
    }

    /* ---- Inicjalizacja po załadowaniu strony ---- */
    window.addEventListener('load', function () {
      buildTimeline();
    });

    /* ---- Resize: przebuduj timeline (debounced 150 ms) ---- */
    var resizeTimer2 = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer2);
      resizeTimer2 = setTimeout(function () {
        buildTimeline();
        ScrollTrigger.refresh();
      }, 150);
    }, { passive: true });

  })();

  /* ----------------------------------------------------------
     AKT-03 CONTEXT MENU SCENE — PIN + SCRUB TIMELINE (jednoscenowa)
     Fazy (progress 0–1):
       0.00–0.20  stan startowy — kursor widoczny, menu niewidoczne
       0.20–0.40  kursor przesuwa się na umowa_od_klienta.pdf,
                  pulse kliknięcia (prawy klik), ctx-menu fade+scale in
       0.40–0.55  kursor przesuwa się na "Sprawdź z Aizyl" (highlight),
                  pulse kliknięcia
       0.55–0.75  ctx-menu fade out, shine cykl tam-i-z-powrotem nad plikiem,
                  toast "Sprawdzono ✓ — bezpieczny" fade in
       0.75–0.90  hold — toast w pełni widoczny, bez zmian
       0.90–1.00  fade out toastu + comparison-summary fade-in
  ---------------------------------------------------------- */
  (function initContextMenuScene() {
    var akt3 = document.getElementById('akt-3');
    if (!akt3) return;

    /* ---- Elementy DOM ---- */
    var winExplorer3 = akt3.querySelector('#win-explorer-03');

    /* Plik główny */
    var fnMain = akt3.querySelector('#ctx-fn-main');

    /* Kursor */
    var cursor = akt3.querySelector('#ctx-cursor');

    /* Menu kontekstowe */
    var menu = akt3.querySelector('#ctx-menu');

    /* Aizyl item */
    var aizylItem = akt3.querySelector('#ctx-item-aizyl');

    /* Shine nad plikiem głównym */
    var shine = akt3.querySelector('#ctx-shine');

    /* Toast */
    var toast = akt3.querySelector('#ctx-toast');

    /* Porównanie */
    var comparison3 = akt3.querySelector('#comparison-summary-03');

    /* ---- Pomocnik: oblicz pozycję środka elementu względem rodzica ---- */
    function relPos(el, parent) {
      var eRect = el.getBoundingClientRect();
      var pRect = parent.getBoundingClientRect();
      return {
        x: eRect.left - pRect.left + eRect.width  / 2,
        y: eRect.top  - pRect.top  + eRect.height / 2,
      };
    }

    /* ---- Główna timeline (budowana po load) ---- */
    var tl3 = null;
    var st3 = null;

    function buildTimeline3() {
      if (st3) { st3.kill(); }
      if (tl3) { tl3.kill(); }

      /* ---- Stan początkowy ---- */

      /* Kursor — widoczny, w lewym górnym rogu obszaru content */
      if (cursor) gsap.set(cursor, { opacity: 1, x: 0, y: 0, scale: 1 });

      /* Menu — ukryte */
      if (menu) gsap.set(menu, { opacity: 0, scale: 0.92, transformOrigin: 'top left' });

      /* Aizyl item — bez highlight */
      if (aizylItem) aizylItem.classList.remove('is-highlighted');

      /* Shine — poza plikiem (lewo) */
      if (shine) gsap.set(shine, { left: '-40%' });

      /* Toast — ukryty */
      if (toast) gsap.set(toast, { opacity: 0 });

      /* Porównanie — ukryte */
      if (comparison3) gsap.set(comparison3, { opacity: 0, visibility: 'hidden' });

      if (window.innerWidth <= 860) return;

      /* ---- Oblicz pozycje docelowe ---- */

      /* Pozycja pliku głównego względem .win-explorer */
      var posFile = fnMain && winExplorer3
        ? relPos(fnMain, winExplorer3)
        : { x: 220, y: 160 };

      /* Pozycja .ctx-item--aizyl względem .win-explorer —
         menu jest przeskalowane (scale: 0.92), więc tymczasowo scale: 1 */
      var posAizyl;
      if (aizylItem && winExplorer3) {
        gsap.set(menu, { scale: 1 });
        posAizyl = relPos(aizylItem, winExplorer3);
        gsap.set(menu, { scale: 0.92 });
      } else {
        posAizyl = { x: 260, y: 220 };
      }

      /* ---- Buduj timeline ---- */
      tl3 = gsap.timeline({ paused: true });

      /* ── FAZA 0–20%: stan startowy (placeholder) ── */
      tl3.to({}, { duration: 0.20, ease: 'none' }, 0);

      /* ── FAZA 20–40%: kursor → plik główny, prawy klik, menu in ── */

      /* Kursor — ruch na plik główny */
      tl3.to(cursor, {
        x: posFile.x - 10,
        y: posFile.y - 10,
        duration: 0.14,
        ease: 'power2.inOut',
      }, 0.20);

      /* Pulse kliknięcia (prawy klik) */
      tl3.to(cursor, {
        scale: 0.82,
        duration: 0.03,
        ease: 'power2.in',
        yoyo: true,
        repeat: 1,
      }, 0.34);

      /* Menu — fade + scale in */
      tl3.to(menu, {
        opacity: 1,
        scale: 1,
        duration: 0.06,
        ease: 'back.out(1.4)',
      }, 0.36);

      /* ── FAZA 40–55%: kursor → "Sprawdź z Aizyl", highlight, klik ── */

      /* Kursor — ruch na .ctx-item--aizyl */
      tl3.to(cursor, {
        x: posAizyl.x - 10,
        y: posAizyl.y - 10,
        duration: 0.10,
        ease: 'power2.inOut',
      }, 0.42);

      /* Highlight .ctx-item--aizyl */
      tl3.to({}, {
        duration: 0.01,
        ease: 'none',
        onStart: function () {
          if (aizylItem) aizylItem.classList.add('is-highlighted');
        },
        onReverseComplete: function () {
          if (aizylItem) aizylItem.classList.remove('is-highlighted');
        },
      }, 0.52);

      /* Pulse kliknięcia na aizyl item */
      tl3.to(cursor, {
        scale: 0.82,
        duration: 0.025,
        ease: 'power2.in',
        yoyo: true,
        repeat: 1,
      }, 0.53);

      /* ── FAZA 55–75%: menu out, shine cykl, toast in ── */

      /* Menu — fade out */
      tl3.to(menu, {
        opacity: 0,
        scale: 0.92,
        duration: 0.06,
        ease: 'power2.in',
      }, 0.55);

      /* Shine nad plikiem głównym — cykl tam-i-z-powrotem */
      if (shine) {
        /* Tam: -40% → 110% */
        tl3.fromTo(shine,
          { left: '-40%' },
          { left: '110%', duration: 0.10, ease: 'power1.inOut' },
          0.57
        );
        /* Z powrotem: 110% → -40% */
        tl3.fromTo(shine,
          { left: '110%' },
          { left: '-40%', duration: 0.10, ease: 'power1.inOut' },
          0.67
        );
      }

      /* Toast — fade in */
      if (toast) {
        tl3.to(toast, {
          opacity: 1,
          duration: 0.06,
          ease: 'power2.out',
        }, 0.60);
      }

      /* ── FAZA 75–90%: hold — toast widoczny, bez zmian ── */
      tl3.to({}, { duration: 0.15, ease: 'none' }, 0.75);

      /* ── FAZA 90–100%: toast fade out + comparison-summary fade-in ── */
      if (toast) {
        tl3.to(toast, {
          opacity: 0,
          duration: 0.05,
          ease: 'power2.in',
        }, 0.90);
      }

      if (comparison3) {
        tl3.to(comparison3, {
          opacity: 1,
          visibility: 'visible',
          duration: 0.08,
          ease: 'power2.out',
        }, 0.92);
      }

      /* ---- ScrollTrigger: pin + scrub ---- */
      st3 = ScrollTrigger.create({
        trigger: akt3,
        start: 'top top-=80',
        end: '+=150%',
        pin: true,
        scrub: true,
        animation: tl3,
        onToggle: function (self) { if (self.isActive) setActiveDot('03'); },
      });
    }

    /* ---- Inicjalizacja po załadowaniu strony ---- */
    window.addEventListener('load', function () {
      buildTimeline3();
    });

    /* ---- Resize: przebuduj timeline (debounced 150 ms) ---- */
    var resizeTimer3 = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer3);
      resizeTimer3 = setTimeout(function () {
        buildTimeline3();
        ScrollTrigger.refresh();
      }, 150);
    }, { passive: true });

  })();

  /* ----------------------------------------------------------
     AKT-04 SYSTEM BAR SCENE — PIN + SCRUB TIMELINE
     Fazy (progress 0–1):
       0.00–0.08  stan startowy — pulpit, Word na wierzchu, przeglądarka niewidoczna
       0.08–0.25  zaznaczenie PESEL w dokumencie (selection rozszerza się od lewej)
       0.22–0.36  tooltip "Skopiowano" — fade in / hold / fade out
       0.25–0.48  Alt+Tab: Word przygasa/odsuwa się, przeglądarka wysuwa się na pierwszy plan
       0.48–0.58  wklejenie tekstu PESEL w polu czatu (litera po literze + kursor)
       0.58–0.75  pasek Aizyl reaguje: zmiana ikony, tekstu, koloru → stan warning
       0.75–0.92  HOLD — pasek w pełni rozwinięty, nieruchomy (czytelny dla użytkownika)
       0.92–1.00  pasek Aizyl wraca do spokoju (idle)
  ---------------------------------------------------------- */
  (function initSystemBarScene() {
    var akt4 = document.getElementById('akt-4');
    if (!akt4) return;

    /* ---- Elementy DOM ---- */
    var winWord      = akt4.querySelector('#win-word');
    var winBrowser   = akt4.querySelector('#win-browser');
    var wordSel      = akt4.querySelector('#word-selection');
    var copyTooltip  = akt4.querySelector('#copy-tooltip');
    var chatInputText = akt4.querySelector('#chat-input-text');
    var chatCursor   = akt4.querySelector('#chat-cursor');
    var pill         = akt4.querySelector('#aizyl-pill');
    var pillIcon     = akt4.querySelector('#aizyl-pill-icon');
    var pillText     = akt4.querySelector('#aizyl-pill-text');

    var PESEL_TEXT   = '89010112345';
    var WARN_TEXT    = 'Poufne dane | Uważaj!';
    var IDLE_TEXT    = 'Aizyl';

    /* ---- Główna timeline ---- */
    var tl4 = null;
    var st4 = null;

    function buildTimeline4() {
      if (st4) { st4.kill(); }
      if (tl4) { tl4.kill(); }

      /* ---- Oblicz pozycję i szerokość word-selection ---- */
      /* word-selection jest w .word-pesel-line (position: relative),
         więc left = offsetLeft wartości PESEL, width = offsetWidth wartości PESEL */
      var peselValueEl = akt4.querySelector('#word-pesel-value');
      var selLeft  = 0;

      if (window.innerWidth <= 860) return;

      var selWidth = 0;
      if (wordSel && peselValueEl) {
        selLeft  = peselValueEl.offsetLeft;
        selWidth = peselValueEl.offsetWidth;
        gsap.set(wordSel, { left: selLeft + 'px', width: 0 });
      }

      /* Tooltip kopiowania — wyrównaj do lewej krawędzi zaznaczenia */
      if (copyTooltip) {
        gsap.set(copyTooltip, { left: selLeft + 'px', opacity: 0 });
      }

      /* ---- Stan początkowy ---- */
      /* Word — na wierzchu, pełna widoczność */
      gsap.set(winWord, {
        opacity: 1,
        scale: 1,
        x: 0,
        y: 0,
        zIndex: 20,
        clearProps: 'filter',
      });

      /* Przeglądarka — niewidoczna */
      gsap.set(winBrowser, {
        opacity: 0,
        scale: 0.97,
        x: 0,
        y: 0,
        zIndex: 10,
      });

      /* Pole czatu — puste */
      if (chatInputText) chatInputText.textContent = '';
      if (chatCursor)    gsap.set(chatCursor, { opacity: 0 });

      /* Pasek Aizyl — stan idle */
      if (pillIcon) {
        pillIcon.className = 'ti ti-shield-check aizyl-pill__icon';
      }
      if (pillText) pillText.textContent = IDLE_TEXT;
      /* Kolor tekstu/ikony zawsze var(--foreground) — brak gsap.set color */

      /* ---- Buduj timeline ---- */
      tl4 = gsap.timeline({ paused: true });

      /* ── FAZA 0–8%: stan startowy (placeholder) ── */
      tl4.to({}, { duration: 0.08, ease: 'none' }, 0);

      /* ── FAZA 8–25%: zaznaczenie PESEL (selection rozszerza się od lewej) ── */
      if (wordSel && selWidth > 0) {
        tl4.to(wordSel, {
          width: selWidth + 'px',
          duration: 0.17,
          ease: 'power1.inOut',
        }, 0.08);
      }

      /* ── FAZA 22–36%: tooltip "Skopiowano" — widoczny przez ~14% progresu ── */
      if (copyTooltip) {
        /* Fade-in: opacity 0 → 1 przez ~3% progresu (0.22–0.25) */
        tl4.to(copyTooltip, {
          opacity: 1,
          duration: 0.03,
          ease: 'power2.out',
        }, 0.22);

        /* "Wait" — trzymaj opacity:1 przez ~8% progresu (0.25–0.33) */
        tl4.to(copyTooltip, {
          opacity: 1,
          duration: 0.08,
          ease: 'none',
        }, 0.25);

        /* Fade-out: opacity 1 → 0 przez ~3% progresu (0.33–0.36) */
        tl4.to(copyTooltip, {
          opacity: 0,
          duration: 0.03,
          ease: 'power2.in',
        }, 0.33);
      }

      /* ── FAZA 25–48%: Alt+Tab — Word odpływa, przeglądarka wysuwa się ── */

      /* Word: przygasa i lekko się oddala */
      tl4.to(winWord, {
        opacity: 0.35,
        scale: 0.97,
        x: '-3%',
        y: '1%',
        duration: 0.18,
        ease: 'power2.inOut',
        zIndex: 10,
      }, 0.25);

      /* Przeglądarka: pojawia się i wysuwa na pierwszy plan */
      tl4.to(winBrowser, {
        opacity: 1,
        scale: 1,
        duration: 0.18,
        ease: 'power2.inOut',
        zIndex: 20,
      }, 0.25);

      /* ── FAZA 48–58%: wklejenie tekstu PESEL w polu czatu ── */

      /* Kursor pojawia się */
      if (chatCursor) {
        tl4.to(chatCursor, {
          opacity: 1,
          duration: 0.02,
          ease: 'none',
        }, 0.48);
      }

      /* Wklejenie tekstu — onUpdate interpoluje znaki */
      tl4.to({}, {
        duration: 0.10,
        ease: 'none',
        onUpdate: function () {
          var prog = this.progress();
          var chars = Math.round(prog * PESEL_TEXT.length);
          if (chatInputText) {
            chatInputText.textContent = PESEL_TEXT.slice(0, chars);
          }
        },
        onReverseComplete: function () {
          if (chatInputText) chatInputText.textContent = '';
        },
      }, 0.48);

      /* ── FAZA 58–75%: pasek Aizyl reaguje — stan warning ── */

      /* Oblicz szerokości idle i warning (po załadowaniu layoutu) */
      var pillInner      = akt4.querySelector('#aizyl-pill-inner');
      var idleWidth      = pillInner ? pillInner.offsetWidth : 60;
      /* Szerokość warning: tymczasowo wstaw pełny tekst, zmierz, przywróć */
      var warnWidth      = idleWidth;
      if (pillInner && pillText && pillIcon) {
        var _prevText  = pillText.textContent;
        var _prevClass = pillIcon.className;
        pillText.textContent  = WARN_TEXT;
        pillIcon.className    = 'ti ti-alert-triangle aizyl-pill__icon';
        warnWidth             = pillInner.scrollWidth;
        pillText.textContent  = _prevText;
        pillIcon.className    = _prevClass;
      }

      /* Zmień ikonę na starcie fazy warning */
      tl4.to({}, {
        duration: 0.01,
        ease: 'none',
        onStart: function () {
          if (pillIcon) pillIcon.className = 'ti ti-alert-triangle aizyl-pill__icon';
          /* Wyczyść tekst — typing zacznie od pustego stringa */
          if (pillText) pillText.textContent = '';
        },
        onReverseComplete: function () {
          if (pillIcon) pillIcon.className = 'ti ti-shield-check aizyl-pill__icon';
          if (pillText) pillText.textContent = IDLE_TEXT;
        },
      }, 0.58);

      /* Tween width .aizyl-pill-inner: idle → warning (0.58–0.73) */
      if (pillInner) {
        tl4.fromTo(pillInner,
          { width: idleWidth + 'px' },
          { width: warnWidth + 'px', duration: 0.15, ease: 'power2.out' },
          0.58
        );
      }

      /* Typing effect WARN_TEXT zsynchronizowany z rozwijaniem width (0.58–0.73) */
      if (pillText) {
        tl4.to({}, {
          duration: 0.15,
          ease: 'none',
          onUpdate: function () {
            var n = Math.floor(this.progress() * WARN_TEXT.length);
            pillText.textContent = WARN_TEXT.slice(0, n);
          },
          onReverseComplete: function () {
            pillText.textContent = '';
          },
        }, 0.58);
      }

      /* Lekki pulse paska (scale) */
      if (pill) {
        tl4.to(pill, {
          scale: 1.06,
          duration: 0.04,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1,
        }, 0.59);
      }

      /* ── FAZA 73–75%: pasek w pełni rozwinięty — krótkie domknięcie typing ── */
      /* (placeholder — typing kończy się w 0.73, hold zaczyna się w 0.75) */
      tl4.to({}, { duration: 0.02, ease: 'none' }, 0.73);

      /* ── FAZA 75–92%: HOLD — pasek stoi w pełni rozwinięty, nieruchomy ── */
      /* fromTo gwarantuje warnWidth niezależnie od luki 0.73–0.75 */
      if (pillInner) {
        tl4.fromTo(pillInner,
          { width: warnWidth + 'px' },
          { width: warnWidth + 'px', duration: 0.17, ease: 'none' },
          0.75
        );
      }
      /* Upewnij się, że tekst warning jest widoczny przez cały hold */
      if (pillText) {
        tl4.to({}, {
          duration: 0.17,
          ease: 'none',
          onStart: function () {
            pillText.textContent = WARN_TEXT;
          },
          onUpdate: function () {
            /* Zabezpieczenie: utrzymuj pełny tekst przez cały hold */
            pillText.textContent = WARN_TEXT;
          },
          onReverseComplete: function () {
            pillText.textContent = WARN_TEXT;
          },
        }, 0.75);
      }

      /* ── FAZA 92–100%: pasek Aizyl wraca do spokoju (idle) ── */

      /* Zmień ikonę z powrotem na shield-check */
      tl4.to({}, {
        duration: 0.01,
        ease: 'none',
        onStart: function () {
          if (pillIcon) pillIcon.className = 'ti ti-shield-check aizyl-pill__icon';
          if (pillText) pillText.textContent = '';
        },
        onReverseComplete: function () {
          if (pillIcon) pillIcon.className = 'ti ti-alert-triangle aizyl-pill__icon';
          if (pillText) pillText.textContent = WARN_TEXT;
        },
      }, 0.92);

      /* Tween width .aizyl-pill-inner: warning → idle (0.92–1.00) */
      if (pillInner) {
        tl4.fromTo(pillInner,
          { width: warnWidth + 'px' },
          { width: idleWidth + 'px', duration: 0.08, ease: 'power2.inOut' },
          0.92
        );
      }

      /* Typing tekstu "Aizyl" (0.92–1.00) */
      if (pillText) {
        tl4.to({}, {
          duration: 0.08,
          ease: 'none',
          onUpdate: function () {
            var n = Math.floor(this.progress() * IDLE_TEXT.length);
            pillText.textContent = IDLE_TEXT.slice(0, n);
          },
          onComplete: function () {
            pillText.textContent = IDLE_TEXT;
          },
          onReverseComplete: function () {
            pillText.textContent = '';
          },
        }, 0.92);
      }

      /* ---- ScrollTrigger: pin + scrub ---- */
      st4 = ScrollTrigger.create({
        trigger: akt4,
        start: 'top top-=50',
        end: '+=180%',
        pin: true,
        scrub: true,
        animation: tl4,
        onToggle: function (self) { if (self.isActive) setActiveDot('04'); },
      });
    }

    /* ---- Inicjalizacja po załadowaniu strony ---- */
    window.addEventListener('load', function () {
      buildTimeline4();
    });

    /* ---- Resize: przebuduj timeline (debounced 150 ms) ---- */
    var resizeTimer4 = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer4);
      resizeTimer4 = setTimeout(function () {
        buildTimeline4();
        ScrollTrigger.refresh();
      }, 150);
    }, { passive: true });

    /* ----------------------------------------------------------
       AKT-05 SHADOW AI SCENE — PIN + SCRUB TIMELINE
       Fazy (progress 0–1):
         0.00–0.10  stan startowy — counter 42, services 2, lista pusta
         0.10–0.50  counter 42→229, services 2→7 (onUpdate interpolacja),
                    w 4 momentach (18%, 30%, 42%, 48%) fade-in wierszy serwisów
         0.50–0.60  hold — wartości finalne, pełna lista serwisów
  
         NOWA FAZA — RAPORT:
         0.60–0.70  kursor (.cursor-icon--akt5) przesuwa się na przycisk
                    "Generuj raport PDF", pulse kliknięcia
         0.70–0.80  toast "Raport wygenerowany ✓" fade-in,
                    .pdf-preview-mini slide-down + fade-in
         0.80–0.95  hold — toast i miniaturka w pełni widoczne
         0.95–1.00  koniec, comparison-summary fade-in
    ---------------------------------------------------------- */
    (function initShadowAIScene() {
      var akt5 = document.getElementById('akt-5');
      if (!akt5) return;
  
      /* ---- Elementy DOM ---- */
      var counterValue    = akt5.querySelector('#counter-value-05');
      var counterServices = akt5.querySelector('#counter-services-05');
      var servicesList    = akt5.querySelector('#detected-services-05');
      var comparison5     = akt5.querySelector('#comparison-summary-05');
      var winApp5         = akt5.querySelector('#win-aizyl-app-05');
      var cursor5         = akt5.querySelector('#akt5-cursor');
      var reportBtn5      = akt5.querySelector('.app-content__report-btn');
      var reportToast5    = akt5.querySelector('#akt5-report-toast');
      var pdfPreview5     = akt5.querySelector('#akt5-pdf-preview');
  
      /* ---- Dane serwisów (ikona Tabler + nazwa) ---- */
      var SERVICES = [
        { icon: 'ti-robot',        name: 'ChatGPT'  },
        { icon: 'ti-brain',        name: 'Claude'   },
        { icon: 'ti-sparkles',     name: 'Gemini'   },
        { icon: 'ti-brand-github', name: 'Copilot'  },
      ];
  
      /* Progi progresu, przy których pojawia się kolejny wiersz serwisu
         (przesunięte proporcjonalnie do nowego zakresu liczników 10–50%) */
      var SERVICE_THRESHOLDS = [0.18, 0.30, 0.42, 0.48];
  
      /* ---- Wartości startowe i końcowe ---- */
      var COUNT_START    = 42;
      var COUNT_END      = 229;
      var SERVICES_START = 2;
      var SERVICES_END   = 7;
  
      /* ---- Stan wewnętrzny ---- */
      var rowEls         = [];
      var rowVisible     = [false, false, false, false];
  
      /* ---- Pomocnik: pozycja środka elementu względem rodzica ---- */
      function relPos(el, parent) {
        var eRect = el.getBoundingClientRect();
        var pRect = parent.getBoundingClientRect();
        return {
          x: eRect.left - pRect.left + eRect.width  / 2,
          y: eRect.top  - pRect.top  + eRect.height / 2,
        };
      }
  
      /* ---- Pomocnik: utwórz wiersz serwisu ---- */
      function createServiceRow(service) {
        var row = document.createElement('div');
        row.className = 'detected-service-row';
        row.innerHTML =
          '<i class="ti ' + service.icon + '"></i>' +
          '<span class="detected-service-row__name">' + service.name + '</span>';
        return row;
      }
  
      /* ---- Pomocnik: pokaż wiersz (fade + slide) ---- */
      function showRow(row) {
        gsap.to(row, {
          opacity: 1,
          y: 0,
          duration: 0.25,
          ease: 'power2.out',
        });
      }
  
      /* ---- Pomocnik: ukryj wiersz (natychmiastowo przy cofaniu) ---- */
      function hideRow(row) {
        gsap.set(row, { opacity: 0, y: 6 });
      }
  
      /* ---- Główna timeline ---- */
      var tl5 = null;
      var st5 = null;
  
      function buildTimeline5() {
        if (st5) { st5.kill(); }
        if (tl5) { tl5.kill(); }
  
        /* Wyczyść listę serwisów */
        if (servicesList) servicesList.innerHTML = '';
        rowEls = [];
        rowVisible = [false, false, false, false];

        if (window.innerWidth <= 860) return;

        /* Wstrzyknij wiersze (startowo ukryte) */
        SERVICES.forEach(function (svc) {
          var row = createServiceRow(svc);
          if (servicesList) servicesList.appendChild(row);
          rowEls.push(row);
        });
  
        /* ---- Stan początkowy ---- */
        if (counterValue)    counterValue.textContent    = String(COUNT_START);
        if (counterServices) counterServices.textContent = String(SERVICES_START);
        if (comparison5)     gsap.set(comparison5, { opacity: 0, visibility: 'hidden' });
  
        /* Kursor — ukryty, pozycja startowa */
        if (cursor5) gsap.set(cursor5, { opacity: 0, x: 0, y: 0, scale: 1 });
  
        /* Toast raportu — ukryty */
        if (reportToast5) gsap.set(reportToast5, { opacity: 0 });
  
        /* PDF preview — ukryty, przesunięty w górę */
        if (pdfPreview5) gsap.set(pdfPreview5, { opacity: 0, y: -10 });
  
        /* ---- Oblicz pozycję przycisku "Generuj raport PDF" ---- */
        var posBtn5 = { x: 700, y: 30 };
        if (reportBtn5 && winApp5) {
          posBtn5 = relPos(reportBtn5, winApp5);
        }
  
        /* ---- Buduj timeline (totalDuration = 1) ---- */
        tl5 = gsap.timeline({ paused: true });
  
        /* ── 0–10%: stan startowy (placeholder) ── */
        tl5.to({}, { duration: 0.10, ease: 'none' }, 0);
  
        /* ── 10–50%: liczniki rosną (obsługiwane w onUpdate) ── */
        tl5.to({}, { duration: 0.40, ease: 'none' }, 0.10);
  
        /* ── 50–60%: hold — wartości finalne, pełna lista ── */
        tl5.to({}, { duration: 0.10, ease: 'none' }, 0.50);
  
        /* ── 60–70%: kursor pojawia się i przesuwa na przycisk raportu ── */
  
        /* Kursor fade-in */
        tl5.to(cursor5, {
          opacity: 1,
          duration: 0.03,
          ease: 'power2.out',
        }, 0.60);
  
        /* Kursor → przycisk "Generuj raport PDF" */
        tl5.to(cursor5, {
          x: posBtn5.x - 10,
          y: posBtn5.y - 10,
          duration: 0.07,
          ease: 'power2.inOut',
        }, 0.62);
  
        /* Pulse kliknięcia */
        tl5.to(cursor5, {
          scale: 0.82,
          duration: 0.025,
          ease: 'power2.in',
          yoyo: true,
          repeat: 1,
        }, 0.69);
  
        /* ── 70–80%: toast + pdf-preview fade-in ── */
  
        /* Toast "Raport wygenerowany ✓" */
        tl5.to(reportToast5, {
          opacity: 1,
          duration: 0.06,
          ease: 'power2.out',
        }, 0.70);
  
        /* PDF preview — slide-down + fade-in */
        tl5.to(pdfPreview5, {
          opacity: 1,
          y: 0,
          duration: 0.08,
          ease: 'back.out(1.4)',
        }, 0.71);
  
        /* ── 80–95%: hold — toast i miniaturka w pełni widoczne ── */
        tl5.to({}, { duration: 0.15, ease: 'none' }, 0.80);
  
        /* ── 95–100%: comparison fade-in ── */
        if (comparison5) {
          tl5.to(comparison5, {
            opacity: 1,
            visibility: 'visible',
            duration: 0.04,
            ease: 'power2.out',
          }, 0.95);
        }
  
        /* ---- ScrollTrigger: pin + scrub — wydłużony do +=240% ---- */
        st5 = ScrollTrigger.create({
          trigger: akt5,
          start: 'top top-=80',
          end: '+=240%',
          pin: true,
          scrub: true,
          animation: tl5,
          onToggle: function (self) { if (self.isActive) setActiveDot('05'); },
          onUpdate: function (self) {
            var p = self.progress;
  
            /* ── Liczniki (zakres 10–50%) ── */
            if (p <= 0.10) {
              if (counterValue)    counterValue.textContent    = String(COUNT_START);
              if (counterServices) counterServices.textContent = String(SERVICES_START);
            } else if (p >= 0.50) {
              if (counterValue)    counterValue.textContent    = String(COUNT_END);
              if (counterServices) counterServices.textContent = String(SERVICES_END);
            } else {
              var t = (p - 0.10) / (0.50 - 0.10);
              var cv = Math.floor(COUNT_START + t * (COUNT_END - COUNT_START));
              var cs = Math.floor(SERVICES_START + t * (SERVICES_END - SERVICES_START));
              if (counterValue)    counterValue.textContent    = String(cv);
              if (counterServices) counterServices.textContent = String(cs);
            }
  
            /* ── Wiersze serwisów ── */
            SERVICE_THRESHOLDS.forEach(function (threshold, i) {
              var shouldShow = p >= threshold;
              if (shouldShow && !rowVisible[i]) {
                rowVisible[i] = true;
                if (rowEls[i]) showRow(rowEls[i]);
              } else if (!shouldShow && rowVisible[i]) {
                rowVisible[i] = false;
                if (rowEls[i]) hideRow(rowEls[i]);
              }
            });
          },
        });
      }
  
      /* ---- Inicjalizacja po załadowaniu strony ---- */
      window.addEventListener('load', function () {
        buildTimeline5();
      });
  
      /* ---- Resize: przebuduj timeline (debounced 150 ms) ---- */
      var resizeTimer5 = null;
      window.addEventListener('resize', function () {
        clearTimeout(resizeTimer5);
        resizeTimer5 = setTimeout(function () {
          buildTimeline5();
          ScrollTrigger.refresh();
        }, 150);
      }, { passive: true });
  
    })();
  
  })();

  /* ----------------------------------------------------------
     AKT-06 HISTORIA ALERTÓW — PIN + SCRUB TIMELINE
     end: "+=180%"

     Fazy (progress 0–1):
       0.00–0.15  stan startowy — lista 5 wierszy widoczna, statyczna
       0.15–0.35  kursor przesuwa się na przycisk "Generuj raport PDF",
                  pulse kliknięcia
       0.35–0.50  toast "Raport wygenerowany ✓" fade-in przy przycisku,
                  .pdf-preview-mini wysuwa się/fade-in pod przyciskiem
       0.50–0.80  hold — toast i miniaturka w pełni widoczne, bez zmian
       0.80–1.00  koniec sekcji (comparison-summary fade-in)
  ---------------------------------------------------------- */
  (function initHistoryScene() {
    var akt6 = document.getElementById('akt-6');
    if (!akt6) return;

    /* ---- Elementy DOM ---- */
    var winApp      = akt6.querySelector('#win-aizyl-app-06');
    var cursor      = akt6.querySelector('#akt6-cursor');
    var btnPdf      = akt6.querySelector('#akt6-btn-pdf');
    var reportToast = akt6.querySelector('#akt6-report-toast');
    var pdfPreview  = akt6.querySelector('#akt6-pdf-preview');
    var comparison6 = akt6.querySelector('#comparison-summary-06');

    /* ---- Pomocnik: pozycja środka elementu względem rodzica ---- */
    function relPos(el, parent) {
      var eRect = el.getBoundingClientRect();
      var pRect = parent.getBoundingClientRect();
      return {
        x: eRect.left - pRect.left + eRect.width  / 2,
        y: eRect.top  - pRect.top  + eRect.height / 2,
      };
    }

    /* ---- Główna timeline ---- */
    var tl6 = null;
    var st6 = null;

    function buildTimeline6() {
      if (st6) { st6.kill(); }
      if (tl6) { tl6.kill(); }

      /* ---- Stan początkowy ---- */

      /* Kursor — ukryty, pozycja startowa */
      if (cursor) gsap.set(cursor, { opacity: 0, x: 0, y: 0, scale: 1 });

      /* Toast raportu — ukryty */
      if (reportToast) gsap.set(reportToast, { opacity: 0 });

      /* PDF preview — ukryty, przesunięty w górę */
      if (pdfPreview) gsap.set(pdfPreview, { opacity: 0, y: -10 });

      /* Comparison — ukryte */
      if (comparison6) gsap.set(comparison6, { opacity: 0, visibility: 'hidden' });

      if (window.innerWidth <= 860) return;

      /* ---- Oblicz pozycję przycisku "Generuj raport PDF" ---- */
      var posBtn = { x: 700, y: 30 };
      if (btnPdf && winApp) {
        posBtn = relPos(btnPdf, winApp);
      }

      /* ---- Buduj timeline (totalDuration = 1) ---- */
      tl6 = gsap.timeline({ paused: true });

      /* ── FAZA 0–15%: stan startowy — lista alertów widoczna, statyczna ── */
      tl6.to({}, { duration: 0.15, ease: 'none' }, 0);

      /* ── FAZA 15–35%: kursor pojawia się i przesuwa na przycisk raportu ── */

      /* Kursor fade-in */
      tl6.to(cursor, {
        opacity: 1,
        duration: 0.03,
        ease: 'power2.out',
      }, 0.15);

      /* Kursor → przycisk "Generuj raport PDF" */
      tl6.to(cursor, {
        x: posBtn.x - 10,
        y: posBtn.y - 10,
        duration: 0.14,
        ease: 'power2.inOut',
      }, 0.17);

      /* Pulse kliknięcia */
      tl6.to(cursor, {
        scale: 0.82,
        duration: 0.025,
        ease: 'power2.in',
        yoyo: true,
        repeat: 1,
      }, 0.33);

      /* ── FAZA 35–50%: toast + pdf-preview fade-in ── */

      /* Toast "Raport wygenerowany ✓" */
      tl6.to(reportToast, {
        opacity: 1,
        duration: 0.06,
        ease: 'power2.out',
      }, 0.35);

      /* PDF preview — slide-down + fade-in */
      tl6.to(pdfPreview, {
        opacity: 1,
        y: 0,
        duration: 0.08,
        ease: 'back.out(1.4)',
      }, 0.37);

      /* ── FAZA 50–80%: hold — toast i miniaturka w pełni widoczne ── */
      tl6.to({}, { duration: 0.30, ease: 'none' }, 0.50);

      /* ── FAZA 80–100%: comparison-summary fade-in ── */
      if (comparison6) {
        tl6.to(comparison6, {
          opacity: 1,
          visibility: 'visible',
          duration: 0.10,
          ease: 'power2.out',
        }, 0.82);
      }

      /* ---- ScrollTrigger: pin + scrub ---- */
      st6 = ScrollTrigger.create({
        trigger: akt6,
        start: 'top top+=40',
        end: '+=180%',
        pin: true,
        scrub: true,
        animation: tl6,
        onToggle: function (self) { if (self.isActive) setActiveDot('06'); },
      });
    }

    /* ---- Inicjalizacja po załadowaniu strony ---- */
    window.addEventListener('load', function () {
      buildTimeline6();
    });

    /* ---- Resize: przebuduj timeline (debounced 150 ms) ---- */
    var resizeTimer6 = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer6);
      resizeTimer6 = setTimeout(function () {
        buildTimeline6();
        ScrollTrigger.refresh();
      }, 150);
    }, { passive: true });

  })();

  /* ----------------------------------------------------------
     AKT-07 OCHRONA DOSTĘPU — PIN + SCRUB TIMELINE
     end: "+=200%"

     Fazy (progress 0–1):
       0.00–0.10  stan startowy — oba toggle włączone, gate niewidoczny
       0.10–0.25  kursor przesuwa się na toggle "Shadow AI Audit",
                  pulse kliknięcia (próba wyłączenia)
       0.25–0.40  .password-gate fade+scale in,
                  podtytuł "Aby wyłączyć Shadow AI Audit",
                  pole input wypełnia się maskowanymi znakami (typing)
       0.40–0.55  hold — overlay w pełni widoczny
       0.55–0.65  .password-gate fade out, toggle pozostaje włączony
       0.65–0.75  kursor przesuwa się na przycisk X (zamknij),
                  pulse kliknięcia (próba zamknięcia)
       0.75–0.90  .password-gate fade+scale in ponownie,
                  podtytuł "Aby zamknąć Aizyl",
                  pole input ponownie wypełnia się typing effectem
       0.90–1.00  hold — overlay widoczny do końca (bez fade out)
  ---------------------------------------------------------- */
  (function initAccessProtectionScene() {
    var akt7 = document.getElementById('akt-7');
    if (!akt7) return;

    /* ---- Elementy DOM ---- */
    var winApp7      = akt7.querySelector('#win-aizyl-app-07');
    var cursor7      = akt7.querySelector('#akt7-cursor');
    var toggleShadow = akt7.querySelector('#akt7-toggle-shadow');
    var btnClose7    = akt7.querySelector('#akt7-btn-close');
    var gate         = akt7.querySelector('#akt7-password-gate');
    var gateSub      = akt7.querySelector('#akt7-gate-sub');
    var gateDots     = akt7.querySelector('#akt7-gate-dots');
    var comparison7  = akt7.querySelector('#comparison-summary-07');

    /* Tekst maskowanych znaków */
    var DOTS_FULL    = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'; /* •••••••• */
    var SUB_SHADOW   = 'Aby wy\u0142\u0105czy\u0107 Shadow AI Audit';
    var SUB_CLOSE    = 'Aby zamkn\u0105\u0107 Aizyl';

    /* ---- Pomocnik: pozycja środka elementu względem rodzica ---- */
    function relPos(el, parent) {
      var eRect = el.getBoundingClientRect();
      var pRect = parent.getBoundingClientRect();
      return {
        x: eRect.left - pRect.left + eRect.width  / 2,
        y: eRect.top  - pRect.top  + eRect.height / 2,
      };
    }

    /* ---- Główna timeline ---- */
    var tl7 = null;
    var st7 = null;

    function buildTimeline7() {
      if (st7) { st7.kill(); }
      if (tl7) { tl7.kill(); }

      /* ---- Stan początkowy ---- */

      /* Toggle Shadow AI Audit — reset do stanu ON (czyści inline style z poprzedniej animacji) */
      if (toggleShadow) {
        var _track = toggleShadow.querySelector('.app-toggle__track');
        var _thumb = toggleShadow.querySelector('.app-toggle__thumb');
        if (_track) gsap.set(_track, { backgroundColor: '#0b6951' });
        if (_thumb) gsap.set(_thumb, { left: 'calc(100% - 19px)' });
      }

      if (window.innerWidth <= 860) return;

      /* Kursor — ukryty, pozycja startowa */
      if (cursor7) gsap.set(cursor7, { opacity: 0, x: 0, y: 0, scale: 1 });

      /* Gate — niewidoczny */
      if (gate) gsap.set(gate, { opacity: 0, pointerEvents: 'none' });

      /* Gate card — skala startowa */
      var gateCard = gate ? gate.querySelector('.password-gate-card') : null;
      if (gateCard) gsap.set(gateCard, { scale: 0.88, transformOrigin: 'center center' });

      /* Podtytuł — domyślny */
      if (gateSub) gateSub.textContent = SUB_SHADOW;

      /* Pole input — puste */
      if (gateDots) gateDots.textContent = '';

      /* Comparison — ukryte */
      if (comparison7) gsap.set(comparison7, { opacity: 0, visibility: 'hidden' });

      /* ---- Oblicz pozycje docelowe ---- */
      var posToggle = { x: 200, y: 120 };
      var posClose  = { x: 820, y: 18  };

      if (toggleShadow && winApp7) {
        posToggle = relPos(toggleShadow, winApp7);
      }
      if (btnClose7 && winApp7) {
        posClose = relPos(btnClose7, winApp7);
      }

      /* ---- Buduj timeline (totalDuration = 1) ---- */
      tl7 = gsap.timeline({ paused: true });

      /* ── 0–10%: stan startowy (placeholder) ── */
      tl7.to({}, { duration: 0.10, ease: 'none' }, 0);

      /* ── 10–25%: kursor → toggle Shadow AI Audit, pulse kliknięcia ── */

      /* Kursor fade-in */
      tl7.to(cursor7, {
        opacity: 1,
        duration: 0.03,
        ease: 'power2.out',
      }, 0.10);

      /* Kursor → toggle */
      tl7.to(cursor7, {
        x: posToggle.x - 10,
        y: posToggle.y - 10,
        duration: 0.10,
        ease: 'power2.inOut',
      }, 0.12);

      /* Pulse kliknięcia na toggle */
      tl7.to(cursor7, {
        scale: 0.82,
        duration: 0.025,
        ease: 'power2.in',
        yoyo: true,
        repeat: 1,
      }, 0.23);

      /* ── 25–40%: gate fade+scale in, podtytuł Shadow, typing dots ── */

      /* Podtytuł — ustaw przed pojawieniem się gate */
      tl7.to({}, {
        duration: 0.01,
        ease: 'none',
        onStart: function () {
          if (gateSub)  gateSub.textContent  = SUB_SHADOW;
          if (gateDots) gateDots.textContent = '';
        },
        onReverseComplete: function () {
          if (gateSub)  gateSub.textContent  = SUB_SHADOW;
          if (gateDots) gateDots.textContent = '';
        },
      }, 0.25);

      /* Gate fade-in */
      if (gate) {
        tl7.to(gate, {
          opacity: 1,
          duration: 0.08,
          ease: 'power2.out',
        }, 0.25);
      }

      /* Gate card scale-in */
      if (gateCard) {
        tl7.to(gateCard, {
          scale: 1,
          duration: 0.08,
          ease: 'back.out(1.5)',
        }, 0.25);
      }

      /* Typing dots — •••••••• (0.30–0.40) */
      tl7.to({}, {
        duration: 0.10,
        ease: 'none',
        onUpdate: function () {
          var n = Math.round(this.progress() * DOTS_FULL.length);
          if (gateDots) gateDots.textContent = DOTS_FULL.slice(0, n);
        },
        onReverseComplete: function () {
          if (gateDots) gateDots.textContent = '';
        },
      }, 0.30);

      /* ── 40–55%: hold — overlay w pełni widoczny ── */
      tl7.to({}, { duration: 0.15, ease: 'none' }, 0.40);

      /* ── 55–65%: gate fade out + toggle Shadow AI Audit → OFF ── */

      /* Gate fade-out */
      if (gate) {
        tl7.to(gate, {
          opacity: 0,
          duration: 0.06,
          ease: 'power2.in',
        }, 0.55);
      }

      /* Gate card scale-out */
      if (gateCard) {
        tl7.to(gateCard, {
          scale: 0.88,
          duration: 0.06,
          ease: 'power2.in',
        }, 0.55);
      }

      /* Toggle Shadow AI Audit: ON → OFF (kółko w lewo, tło szare) */
      var toggleTrack = toggleShadow ? toggleShadow.querySelector('.app-toggle__track') : null;
      var toggleThumb = toggleShadow ? toggleShadow.querySelector('.app-toggle__thumb') : null;

      if (toggleTrack && toggleThumb) {
        /* Tło track: zielone → szare */
        tl7.to(toggleTrack, {
          backgroundColor: '#d0d0d0',
          duration: 0.12,
          ease: 'power2.inOut',
          onReverseComplete: function () {
            gsap.set(toggleTrack, { backgroundColor: '#0b6951' });
          },
        }, 0.55);

        /* Kółko thumb: prawa krawędź → lewa krawędź */
        tl7.to(toggleThumb, {
          left: '3px',
          duration: 0.12,
          ease: 'power2.inOut',
          onReverseComplete: function () {
            gsap.set(toggleThumb, { left: 'calc(100% - 19px)' });
          },
        }, 0.55);
      }

      /* ── 65–75%: kursor → przycisk X (zamknij), pulse kliknięcia ── */

      /* Kursor → przycisk zamknij */
      tl7.to(cursor7, {
        x: posClose.x - 10,
        y: posClose.y - 10,
        duration: 0.07,
        ease: 'power2.inOut',
      }, 0.65);

      /* Pulse kliknięcia na X */
      tl7.to(cursor7, {
        scale: 0.82,
        duration: 0.025,
        ease: 'power2.in',
        yoyo: true,
        repeat: 1,
      }, 0.73);

      /* ── 75–90%: gate fade+scale in ponownie, podtytuł "Aby zamknąć Aizyl", typing ── */

      /* Podtytuł — zmień na "Aby zamknąć Aizyl" i wyczyść dots */
      tl7.to({}, {
        duration: 0.01,
        ease: 'none',
        onStart: function () {
          if (gateSub)  gateSub.textContent  = SUB_CLOSE;
          if (gateDots) gateDots.textContent = '';
        },
        onReverseComplete: function () {
          if (gateSub)  gateSub.textContent  = SUB_SHADOW;
          if (gateDots) gateDots.textContent = DOTS_FULL;
        },
      }, 0.75);

      /* Gate fade-in ponownie */
      if (gate) {
        tl7.to(gate, {
          opacity: 1,
          duration: 0.08,
          ease: 'power2.out',
        }, 0.75);
      }

      /* Gate card scale-in ponownie */
      if (gateCard) {
        tl7.to(gateCard, {
          scale: 1,
          duration: 0.08,
          ease: 'back.out(1.5)',
        }, 0.75);
      }

      /* Typing dots ponownie — •••••••• (0.80–0.90) */
      tl7.to({}, {
        duration: 0.10,
        ease: 'none',
        onUpdate: function () {
          var n = Math.round(this.progress() * DOTS_FULL.length);
          if (gateDots) gateDots.textContent = DOTS_FULL.slice(0, n);
        },
        onReverseComplete: function () {
          if (gateDots) gateDots.textContent = '';
        },
      }, 0.80);

      /* ── 90–100%: hold — overlay widoczny do końca sekcji ── */
      /* Upewnij się, że gate pozostaje widoczny przez cały hold */
      if (gate) {
        tl7.to(gate, {
          opacity: 1,
          duration: 0.10,
          ease: 'none',
        }, 0.90);
      }

      /* Comparison fade-in przy samym końcu */
      if (comparison7) {
        tl7.to(comparison7, {
          opacity: 1,
          visibility: 'visible',
          duration: 0.05,
          ease: 'power2.out',
        }, 0.94);
      }

      /* ---- ScrollTrigger: pin + scrub ---- */
      st7 = ScrollTrigger.create({
        trigger: akt7,
        start: 'top top+=40',
        end: '+=200%',
        pin: true,
        scrub: true,
        animation: tl7,
        onToggle: function (self) { if (self.isActive) setActiveDot('07'); },
      });
    }

    /* ---- Inicjalizacja po załadowaniu strony ---- */
    window.addEventListener('load', function () {
      buildTimeline7();
    });

    /* ---- Resize: przebuduj timeline (debounced 150 ms) ---- */
    var resizeTimer7 = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer7);
      resizeTimer7 = setTimeout(function () {
        buildTimeline7();
        ScrollTrigger.refresh();
      }, 150);
    }, { passive: true });

    /* ----------------------------------------------------------
       AKT-08 FLOTA — PIN + SCRUB TIMELINE
       end: "+=220%"
  
       Fazy (progress 0–1):
         0.00–0.15  stan startowy — graf widoczny, linie fleet-link pulsują (CSS anim)
         0.15–0.30  kursor → węzeł "PC-Marketing", pulse kliknięcia,
                    fleet-side-panel fade+slide in
         0.30–0.45  kursor → opcja "Generuj raport" w panelu, pulse kliknięcia,
                    panel fade out, toast "Raport wygenerowany ✓" fade in przy węźle
         0.45–0.55  hold krótki, toast fade out
         0.55–0.70  kursor → przycisk "Generuj raport zbiorczy" w nagłówku,
                    pulse kliknięcia
         0.70–0.85  toast "Raport zbiorczy floty wygenerowany ✓" fade in,
                    pdf-preview-mini slide-down + fade-in
         0.85–1.00  hold — wynik w pełni widoczny, comparison-summary fade-in
    ---------------------------------------------------------- */
    (function initFleetScene() {
      var akt8 = document.getElementById('akt-8');
      if (!akt8) return;
  
      /* ---- Elementy DOM ---- */
      var winApp8      = akt8.querySelector('#win-aizyl-app-08');
      var fleetGraph   = akt8.querySelector('#fleet-graph-08');
      var linksSvg     = akt8.querySelector('#fleet-links-svg-08');
      var masterNode   = akt8.querySelector('#fleet-master');
      var agentNodes   = akt8.querySelectorAll('.fleet-node--agent');
      var sidePanel    = akt8.querySelector('#fleet-side-panel-08');
      var panelName    = akt8.querySelector('#fleet-panel-name');
      var panelReport  = akt8.querySelector('#fleet-panel-item-report');
      var cursor8      = akt8.querySelector('#akt8-cursor');
      var nodeToast    = akt8.querySelector('#akt8-node-toast');
      var reportToast8 = akt8.querySelector('#akt8-report-toast');
      var pdfPreview8  = akt8.querySelector('#akt8-pdf-preview');
      var reportBtn8   = akt8.querySelector('#akt8-btn-report');
      var comparison8  = akt8.querySelector('#comparison-summary-08');
  
      /* ---- Pomocnik: pozycja środka elementu względem rodzica ---- */
      function relPos(el, parent) {
        var eRect = el.getBoundingClientRect();
        var pRect = parent.getBoundingClientRect();
        return {
          x: eRect.left - pRect.left + eRect.width  / 2,
          y: eRect.top  - pRect.top  + eRect.height / 2,
        };
      }
  
      /* ---- Rozmieść węzły na orbicie + narysuj linie SVG ---- */
      function layoutFleet() {
        if (!fleetGraph || !masterNode) return;
  
        var gW = fleetGraph.offsetWidth  || 600;
        var gH = fleetGraph.offsetHeight || 360;
  
        /* Centrum grafu */
        var cx = gW / 2;
        var cy = gH / 2;
  
        /* Rozmiar węzłów (master 56px, agent 40px) + etykieta ~20px */
        var masterR = 28;  /* połowa 56px */
        var agentR  = 20;  /* połowa 40px */
        var labelH  = 22;  /* wysokość etykiety + gap */
  
        /* Bezpieczny margines od krawędzi kontenera */
        var margin = agentR + labelH + 8;
  
        /* Maksymalny dopuszczalny promień orbity:
           - od lewej/prawej: cx - margin
           - od góry: cy - margin (węzeł na górze: cy - radius - agentR - labelH >= margin)
           - od dołu: cy - margin (węzeł na dole: cy + radius + agentR + labelH <= gH - margin)
           Upraszczamy: radius <= min(cx, cy) - margin */
        var maxRadius = Math.min(cx, cy) - margin;
  
        /* Promień orbity — 26% szerokości, min 80px, max obliczony powyżej */
        var radius = Math.min(maxRadius, Math.max(80, gW * 0.26));
  
        /* Pozycja master — wyśrodkowany */
        gsap.set(masterNode, {
          left: cx + 'px',
          top:  cy + 'px',
          xPercent: -50,
          yPercent: -50,
        });
  
        /* 5 agentów równomiernie na pełnym okręgu (360°), startując od góry (-90°) */
        var count = agentNodes.length;
        agentNodes.forEach(function (node, i) {
          var angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
          var nx = cx + radius * Math.cos(angle);
          var ny = cy + radius * Math.sin(angle);
          gsap.set(node, {
            left: nx + 'px',
            top:  ny + 'px',
            xPercent: -50,
            yPercent: -50,
          });
        });
  
        /* Narysuj linie SVG master ↔ każdy agent */
        if (linksSvg) {
          var svgRect = linksSvg.getBoundingClientRect();
          var mRect   = masterNode.getBoundingClientRect();
          var mx = mRect.left - svgRect.left + mRect.width  / 2;
          var my = mRect.top  - svgRect.top  + mRect.height / 2;
  
          agentNodes.forEach(function (node, i) {
            var line = linksSvg.querySelector('#fl-link-' + i);
            if (!line) return;
            var nRect = node.getBoundingClientRect();
            var nx2 = nRect.left - svgRect.left + nRect.width  / 2;
            var ny2 = nRect.top  - svgRect.top  + nRect.height / 2;
            line.setAttribute('x1', mx);
            line.setAttribute('y1', my);
            line.setAttribute('x2', nx2);
            line.setAttribute('y2', ny2);
          });
        }
      }
  
      /* ---- Główna timeline ---- */
      var tl8 = null;
      var st8 = null;
  
      function buildTimeline8() {
        if (st8) { st8.kill(); }
        if (tl8) { tl8.kill(); }
  
        /* Rozmieść węzły */
        layoutFleet();

        /* ---- Stan początkowy ---- */

        /* Kursor — ukryty */
        if (cursor8) gsap.set(cursor8, { opacity: 0, x: 0, y: 0, scale: 1 });

        /* Panel boczny — ukryty, przesunięty w prawo */
        if (sidePanel) gsap.set(sidePanel, { opacity: 0, x: 20, pointerEvents: 'none' });

        /* Highlight opcji raportu — brak */
        if (panelReport) panelReport.classList.remove('is-highlighted');

        /* Toasty — ukryte */
        if (nodeToast)    gsap.set(nodeToast,    { opacity: 0 });
        if (reportToast8) gsap.set(reportToast8, { opacity: 0 });

        /* PDF preview — ukryty, przesunięty w górę */
        if (pdfPreview8) gsap.set(pdfPreview8, { opacity: 0, y: -10 });

        /* Comparison — ukryte */
        if (comparison8) gsap.set(comparison8, { opacity: 0, visibility: 'hidden' });

        /* Aktywny węzeł — brak */
        agentNodes.forEach(function (n) { n.classList.remove('is-active'); });

        if (window.innerWidth <= 860) return;

        /* ---- Oblicz pozycje docelowe ---- */
  
        /* Węzeł PC-Marketing (agent 0) */
        var agent0 = akt8.querySelector('#fleet-agent-0');
        var posAgent0 = agent0 && winApp8
          ? relPos(agent0, winApp8)
          : { x: 200, y: 200 };
  
        /* Ustaw pozycję panelu bocznego względem węzła agent0:
           left = środek węzła + promień węzła (20px = połowa 40px) + 3px odstępu
                  → lewy-górny róg panelu tuż przy prawej krawędzi okręgu
           top  = środek węzła − promień węzła (20px)
                  → górna krawędź panelu na poziomie górnej krawędzi okręgu */
        if (sidePanel) {
          var agentNodeR = 20; /* promień węzła agenta: width/height = 40px → r = 20px */
          gsap.set(sidePanel, {
            left: (posAgent0.x + agentNodeR + 3) + 'px',
            top:  (posAgent0.y - agentNodeR) + 'px',
          });
        }
  
        /* Opcja "Generuj raport" w panelu */
        var posPanelReport = { x: 200, y: 240 };
        if (panelReport && winApp8) {
          /* Panel jest ukryty — tymczasowo pokaż, zmierz, ukryj */
          gsap.set(sidePanel, { opacity: 1, x: 0 });
          posPanelReport = relPos(panelReport, winApp8);
          gsap.set(sidePanel, { opacity: 0, x: 20 });
        }
  
        /* Przycisk "Generuj raport zbiorczy" */
        var posReportBtn8 = { x: 700, y: 30 };
        if (reportBtn8 && winApp8) {
          posReportBtn8 = relPos(reportBtn8, winApp8);
        }
  
        /* Pozycja toastu przy węźle agenta 0 (względem .win-aizyl-app):
           X = środek węzła (wyśrodkowanie przez xPercent: -50)
           Y = środek węzła − 80px → toast pojawia się wyraźnie nad węzłem,
               powyżej górnej krawędzi okręgu (promień 20px), bez kolizji z panelem */
        var nodeToastX = posAgent0.x;
        var nodeToastY = posAgent0.y - 80;
  
        /* ---- Buduj timeline (totalDuration = 1) ---- */
        tl8 = gsap.timeline({ paused: true });
  
        /* ── FAZA 0–15%: stan startowy — graf widoczny, linie pulsują (CSS) ── */
        tl8.to({}, { duration: 0.15, ease: 'none' }, 0);
  
        /* ── FAZA 15–30%: kursor → węzeł PC-Marketing, pulse, panel in ── */
  
        /* Kursor fade-in */
        tl8.to(cursor8, {
          opacity: 1,
          duration: 0.03,
          ease: 'power2.out',
        }, 0.15);
  
        /* Kursor → węzeł PC-Marketing */
        tl8.to(cursor8, {
          x: posAgent0.x - 10,
          y: posAgent0.y - 10,
          duration: 0.10,
          ease: 'power2.inOut',
        }, 0.17);
  
        /* Pulse kliknięcia */
        tl8.to(cursor8, {
          scale: 0.82,
          duration: 0.025,
          ease: 'power2.in',
          yoyo: true,
          repeat: 1,
        }, 0.27);
  
        /* Aktywuj węzeł Ania HR */
        tl8.to({}, {
          duration: 0.01,
          ease: 'none',
          onStart: function () {
            if (agent0) agent0.classList.add('is-active');
            if (panelName) panelName.textContent = 'Ania HR';
          },
          onReverseComplete: function () {
            if (agent0) agent0.classList.remove('is-active');
          },
        }, 0.27);
  
        /* Panel boczny — fade + slide in */
        tl8.to(sidePanel, {
          opacity: 1,
          x: 0,
          duration: 0.08,
          ease: 'power2.out',
        }, 0.28);
  
        /* ── FAZA 30–45%: kursor → "Generuj raport" w panelu, pulse, panel out, toast in ── */
  
        /* Kursor → opcja "Generuj raport" */
        tl8.to(cursor8, {
          x: posPanelReport.x - 10,
          y: posPanelReport.y - 10,
          duration: 0.10,
          ease: 'power2.inOut',
        }, 0.32);
  
        /* Highlight opcji */
        tl8.to({}, {
          duration: 0.01,
          ease: 'none',
          onStart: function () {
            if (panelReport) panelReport.classList.add('is-highlighted');
          },
          onReverseComplete: function () {
            if (panelReport) panelReport.classList.remove('is-highlighted');
          },
        }, 0.42);
  
        /* Pulse kliknięcia na opcję */
        tl8.to(cursor8, {
          scale: 0.82,
          duration: 0.025,
          ease: 'power2.in',
          yoyo: true,
          repeat: 1,
        }, 0.43);
  
        /* Panel fade out */
        tl8.to(sidePanel, {
          opacity: 0,
          x: 20,
          duration: 0.06,
          ease: 'power2.in',
        }, 0.44);
  
        /* Toast przy węźle — pozycja dynamiczna */
        if (nodeToast) {
          gsap.set(nodeToast, {
            left: nodeToastX + 'px',
            top:  nodeToastY + 'px',
            xPercent: -50,
            yPercent: -50,
          });
          tl8.to(nodeToast, {
            opacity: 1,
            duration: 0.06,
            ease: 'power2.out',
          }, 0.45);
        }
  
        /* ── FAZA 45–55%: hold krótki, toast fade out ── */
        tl8.to({}, { duration: 0.05, ease: 'none' }, 0.45);
  
        if (nodeToast) {
          tl8.to(nodeToast, {
            opacity: 0,
            duration: 0.05,
            ease: 'power2.in',
          }, 0.52);
        }
  
        /* ── FAZA 55–70%: kursor → przycisk "Generuj raport zbiorczy", pulse ── */
  
        /* Kursor → przycisk raportu zbiorczego */
        tl8.to(cursor8, {
          x: posReportBtn8.x - 10,
          y: posReportBtn8.y - 10,
          duration: 0.10,
          ease: 'power2.inOut',
        }, 0.57);
  
        /* Pulse kliknięcia */
        tl8.to(cursor8, {
          scale: 0.82,
          duration: 0.025,
          ease: 'power2.in',
          yoyo: true,
          repeat: 1,
        }, 0.68);
  
        /* ── FAZA 70–85%: toast zbiorczy + pdf-preview fade-in ── */
  
        /* Toast "Raport zbiorczy floty wygenerowany ✓" */
        tl8.to(reportToast8, {
          opacity: 1,
          duration: 0.06,
          ease: 'power2.out',
        }, 0.70);
  
        /* PDF preview — slide-down + fade-in */
        tl8.to(pdfPreview8, {
          opacity: 1,
          y: 0,
          duration: 0.08,
          ease: 'back.out(1.4)',
        }, 0.72);
  
        /* ── FAZA 85–100%: hold — wynik widoczny, comparison fade-in ── */
        tl8.to({}, { duration: 0.10, ease: 'none' }, 0.85);
  
        if (comparison8) {
          tl8.to(comparison8, {
            opacity: 1,
            visibility: 'visible',
            duration: 0.08,
            ease: 'power2.out',
          }, 0.90);
        }
  
        /* ---- ScrollTrigger: pin + scrub ---- */
        st8 = ScrollTrigger.create({
          trigger: akt8,
          start: 'top top+=40',
          end: '+=220%',
          pin: true,
          scrub: true,
          animation: tl8,
          onToggle: function (self) { if (self.isActive) setActiveDot('08'); },
        });
      }
  
      /* ---- Inicjalizacja po załadowaniu strony ---- */
      window.addEventListener('load', function () {
        buildTimeline8();
      });
  
      /* ---- Resize: przebuduj timeline (debounced 150 ms) ---- */
      var resizeTimer8 = null;
      window.addEventListener('resize', function () {
        clearTimeout(resizeTimer8);
        resizeTimer8 = setTimeout(function () {
          buildTimeline8();
          ScrollTrigger.refresh();
        }, 150);
      }, { passive: true });
  
    })();

    /* ============================================================
       AKT-09 GUARDIAN SCENE — PIN + SCRUB TIMELINE
       Fazy (progress 0–1):
         0.00–0.15  hold startowy — orb pulsuje, dokument czeka
         0.15–0.20  impuls podróżuje od orba do dokumentu
         0.20–0.45  typing effect — tekst umowy pojawia się znak po znaku
         0.46–0.62  warstwa "struktura" fade-in + hold
         0.62–0.78  warstwa "znaczenie" fade-in + hold
         0.78–0.90  warstwa "kontekst" fade-in + hold
         0.90–0.93  błysk zrozumienia — glow na wrapie orba
         0.93–1.00  comparison-summary-09 fade-in + hold
    ============================================================ */
    (function initGuardianScene() {
      var akt9 = document.getElementById('akt-9');
      if (!akt9) return;

      /* ---- Pobierz elementy sceny ---- */
      var guardianScene  = akt9.querySelector('#guardian-scene-09');
      var orbWrap        = akt9.querySelector('#guardian-sigil-09');
      var docWrap        = akt9.querySelector('#guardian-doc-09');
      var typingSpan     = akt9.querySelector('#guardian-typing-09');
      var layerStructure = akt9.querySelector('#guardian-layer-structure-09');
      var layerMeaning   = akt9.querySelector('#guardian-layer-meaning-09');
      var layerContext   = akt9.querySelector('#guardian-layer-context-09');
      var comparison9    = akt9.querySelector('#comparison-summary-09');
      var detectionPanel = akt9.querySelector('#guardian-detection-09');

      if (!guardianScene || !orbWrap || !docWrap || !typingSpan) return;

      /* ---- Segmenty tekstu do typing effect ---- */
      /* Każdy segment: { text: string, type: 'plain'|'risk'|'safe' } */
      var CONTRACT_SEGMENTS = [
        { text: 'zachowania w tajemnicy danych osobowych ', type: 'plain' },
        { text: 'Anny Kowalskiej, w tym jej wynagrodzenia w wysokości 18\u00a0400\u00a0zł netto miesięcznie', type: 'risk' },
        { text: ', a także numeru referencyjnego zamówienia ', type: 'plain' },
        { text: '02-1985-7711', type: 'safe' },
        { text: ', przez okres nie krótszy niż 5 lat od daty podpisania niniejszej umowy.', type: 'plain' },
      ];

      /* Łączna długość tekstu (do obliczania postępu typing) */
      var CONTRACT_TOTAL = CONTRACT_SEGMENTS.reduce(function (acc, s) { return acc + s.text.length; }, 0);

      /* ---- Pobierz wiersze panelu detekcji ---- */
      var detectionRows = detectionPanel ? detectionPanel.querySelectorAll('.guardian-detection-row') : [];

      /* ---- Stan startowy ---- */
      gsap.set([layerStructure, layerMeaning, layerContext], { opacity: 0 });
      gsap.set(comparison9, { opacity: 0, visibility: 'hidden' });
      typingSpan.innerHTML = '';
      if (detectionRows.length) {
        gsap.set(detectionRows, { opacity: 0 });
      }

      /* ---- Zmienne timeline i ScrollTrigger ---- */
      var tl9 = null;
      var st9 = null;

      /* ---- Pomocnik: buduj innerHTML z segmentów do pozycji n ---- */
      function buildTypingHTML(n) {
        var html = '';
        var pos = 0;
        for (var i = 0; i < CONTRACT_SEGMENTS.length; i++) {
          var seg = CONTRACT_SEGMENTS[i];
          var segStart = pos;
          var segEnd   = pos + seg.text.length;

          if (n <= segStart) break; /* ten i kolejne segmenty jeszcze niewidoczne */

          /* Ile znaków z tego segmentu jest już widocznych */
          var charsVisible = Math.min(n - segStart, seg.text.length);
          var visible = seg.text.slice(0, charsVisible);

          if (seg.type === 'risk') {
            html += '<span class="guardian-highlight guardian-highlight-risk">' + visible + '</span>';
          } else if (seg.type === 'safe') {
            html += '<span class="guardian-highlight guardian-highlight-safe">' + visible + '</span>';
          } else {
            html += visible;
          }

          pos = segEnd;
        }
        return html;
      }

      function buildTimeline9() {
        /* Zniszcz poprzednie instancje przy rebuild (resize) */
        if (st9) { st9.kill(); st9 = null; }
        if (tl9) { tl9.kill(); tl9 = null; }

        /* Przywróć stan startowy przed przebudową */
        gsap.set([layerStructure, layerMeaning, layerContext], { opacity: 0 });
        gsap.set(comparison9, { opacity: 0, visibility: 'hidden' });
        typingSpan.innerHTML = '';

        if (window.innerWidth <= 860) return;

        orbWrap.classList.remove('is-analyzing');
        if (detectionRows.length) {
          gsap.set(detectionRows, { opacity: 0 });
        }

        /* ---- Buduj timeline (totalDuration = 1) ---- */
        tl9 = gsap.timeline({ paused: true });

        /* ── FAZA 0–15%: hold startowy ── */
        tl9.to({}, { duration: 0.15, ease: 'none' }, 0);

        /* ── FAZA 15–39%: typing effect — tekst umowy (innerHTML z segmentami) ── */
        tl9.to({}, {
          duration: 0.24,
          ease: 'none',
          onUpdate: function () {
            var n = Math.round(this.progress() * CONTRACT_TOTAL);
            typingSpan.innerHTML = buildTypingHTML(n);
          },
          onReverseComplete: function () {
            typingSpan.innerHTML = '';
          },
        }, 0.15);

        /* ── FAZA 39–41%: krótki hold po wpisaniu tekstu ── */
        tl9.to({}, { duration: 0.02, ease: 'none' }, 0.39);

        /* ── FAZA 41%: podświetlenie frazy "risk" + fade-in pierwszego wiersza detekcji ── */
        tl9.to({}, {
          duration: 0.001,
          ease: 'none',
          onStart: function () {
            /* Dodaj modyfikator koloru do spana risk */
            var riskSpan = typingSpan.querySelector('.guardian-highlight-risk');
            if (riskSpan) riskSpan.classList.add('guardian-highlight--risk');
          },
          onReverseComplete: function () {
            var riskSpan = typingSpan.querySelector('.guardian-highlight-risk');
            if (riskSpan) riskSpan.classList.remove('guardian-highlight--risk');
          },
        }, 0.41);

        if (detectionRows[0]) {
          tl9.to(detectionRows[0], {
            opacity: 1,
            duration: 0.03,
            ease: 'power2.out',
          }, 0.41);
        }

        /* ── FAZA 41–47%: hold po pierwszej detekcji ── */
        tl9.to({}, { duration: 0.06, ease: 'none' }, 0.41);

        /* ── FAZA 47%: podświetlenie frazy "safe" + fade-in drugiego wiersza detekcji ── */
        tl9.to({}, {
          duration: 0.001,
          ease: 'none',
          onStart: function () {
            var safeSpan = typingSpan.querySelector('.guardian-highlight-safe');
            if (safeSpan) safeSpan.classList.add('guardian-highlight--safe');
          },
          onReverseComplete: function () {
            var safeSpan = typingSpan.querySelector('.guardian-highlight-safe');
            if (safeSpan) safeSpan.classList.remove('guardian-highlight--safe');
          },
        }, 0.47);

        if (detectionRows[1]) {
          tl9.to(detectionRows[1], {
            opacity: 1,
            duration: 0.03,
            ease: 'power2.out',
          }, 0.47);
        }

        /* ── FAZA 47–55%: hold po drugiej detekcji ── */
        tl9.to({}, { duration: 0.08, ease: 'none' }, 0.47);

        /* ── FAZA 55–71%: warstwa "struktura" fade-in + hold + fade-out ── */
        tl9.to(layerStructure, {
          opacity: 1,
          duration: 0.05,
          ease: 'power2.out',
        }, 0.55);

        tl9.to({}, { duration: 0.09, ease: 'none' }, 0.60);

        tl9.to(layerStructure, {
          opacity: 0,
          duration: 0.03,
          ease: 'power2.in',
        }, 0.68);

        /* ── FAZA 71–83%: warstwa "znaczenie" fade-in + hold + fade-out ── */
        tl9.to(layerMeaning, {
          opacity: 1,
          duration: 0.05,
          ease: 'power2.out',
        }, 0.71);

        tl9.to({}, { duration: 0.07, ease: 'none' }, 0.76);

        tl9.to(layerMeaning, {
          opacity: 0,
          duration: 0.03,
          ease: 'power2.in',
        }, 0.80);

        /* ── FAZA 83–92%: warstwa "kontekst" fade-in + hold (pozostaje widoczna) ── */
        tl9.to(layerContext, {
          opacity: 1,
          duration: 0.05,
          ease: 'power2.out',
        }, 0.83);

        tl9.to({}, { duration: 0.05, ease: 'none' }, 0.88);

        /* ── FAZA 92–100%: comparison-summary fade-in + hold ── */
        tl9.to(comparison9, {
          opacity: 1,
          visibility: 'visible',
          duration: 0.04,
          ease: 'power2.out',
        }, 0.92);

        tl9.to({}, { duration: 0.04, ease: 'none' }, 0.96);

        /* ---- ScrollTrigger: pin + scrub ---- */
        st9 = ScrollTrigger.create({
          trigger: akt9,
          start: 'top top-=80',
          end: '+=200%',
          pin: true,
          scrub: true,
          animation: tl9,
          onToggle: function (self) { if (self.isActive) setActiveDot('09'); },
          onUpdate: function (self) {
            /* Pulsowanie orba: aktywne podczas typing + obu detekcji (15%–55%) */
            if (self.progress >= 0.15 && self.progress <= 0.55) {
              orbWrap.classList.add('is-analyzing');
            } else {
              orbWrap.classList.remove('is-analyzing');
            }
          },
        });
      }

      /* ---- Inicjalizacja po załadowaniu strony ---- */
      window.addEventListener('load', function () {
        buildTimeline9();
        ScrollTrigger.refresh();
      });

      /* ---- Resize: przebuduj timeline (debounced 150 ms) ---- */
      var resizeTimer9 = null;
      window.addEventListener('resize', function () {
        clearTimeout(resizeTimer9);
        resizeTimer9 = setTimeout(function () {
          buildTimeline9();
          ScrollTrigger.refresh();
        }, 150);
      }, { passive: true });

    })();

  })();

})();

/* ============================================================
   HAMBURGER TOGGLE — niezależne od scen
   ============================================================ */
document.getElementById('nav-toggle')?.addEventListener('click', function() {
  document.querySelector('.nav-links').classList.toggle('is-open');
  this.setAttribute('aria-expanded', this.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
  this.classList.toggle('is-active');
});
