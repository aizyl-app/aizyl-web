/**
 * script.js — Aizyl Web
 * Punkt wejścia aplikacji.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  console.log('[Aizyl] DOM gotowy.');

  // Pricing scroll — przewiń do karty Pro (.plan-featured) na mobile
  const pricingContainer = document.querySelector('#pricing [style*="grid-template-columns: repeat(3, 1fr)"]');
  const planFeatured = document.querySelector('#pricing .plan-featured');
  if (pricingContainer && planFeatured && window.innerWidth <= 768) {
    planFeatured.scrollIntoView({ inline: 'center', behavior: 'instant', block: 'nearest' });
  }

  // Pricing toggle — przełącznik Miesięcznie / Rocznie
  const btnMonthly = document.getElementById('pricing-btn-monthly');
  const btnYearly  = document.getElementById('pricing-btn-yearly');
  if (btnMonthly && btnYearly) {
    const blocksMonthly = document.querySelectorAll('[data-pricing="monthly"]');
    const blocksYearly  = document.querySelectorAll('[data-pricing="yearly"]');

    btnMonthly.addEventListener('click', () => {
      blocksMonthly.forEach((el) => el.classList.remove('pricing-price-block--hidden'));
      blocksYearly.forEach((el)  => el.classList.add('pricing-price-block--hidden'));
      btnMonthly.classList.add('pricing-toggle-btn--active');
      btnYearly.classList.remove('pricing-toggle-btn--active');
    });

    btnYearly.addEventListener('click', () => {
      blocksYearly.forEach((el)  => el.classList.remove('pricing-price-block--hidden'));
      blocksMonthly.forEach((el) => el.classList.add('pricing-price-block--hidden'));
      btnYearly.classList.add('pricing-toggle-btn--active');
      btnMonthly.classList.remove('pricing-toggle-btn--active');
    });
  }

  // Nav toggle — hamburger menu na mobile
  document.getElementById('nav-toggle')?.addEventListener('click', function() {
    document.querySelector('.nav-links').classList.toggle('is-open');
    this.setAttribute('aria-expanded', this.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
    this.classList.toggle('is-active');
  });

  // Nav scroll — dodaje klasę .scrolled po przewinięciu 20px
  const nav = document.getElementById('site-nav');
  if (nav) {
    const onScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // inicjalne sprawdzenie przy załadowaniu
  }

  // AI Act timeline — dynamiczna aktualizacja dat i liczby miesięcy
  (function updateAiActTimeline() {
    var badgeNow      = document.getElementById('aiact-badge-now');
    var descNow       = document.getElementById('aiact-desc-now');
    var badgeDeadline = document.getElementById('aiact-badge-deadline');
    var sourceEl      = document.getElementById('aiact-source');

    // Jeśli żaden z elementów nie istnieje (podstrony bez infografiki) — wyjdź
    if (!badgeNow && !descNow && !badgeDeadline && !sourceEl) return;

    var today    = new Date();
    var deadline = new Date(2026, 7, 2); // 2 sierpnia 2026 (miesiące 0-indexed)

    // Liczba pełnych miesięcy między dziś a terminem
    var diffYears  = deadline.getFullYear() - today.getFullYear();
    var diffMonths = deadline.getMonth()    - today.getMonth();
    var totalMonths = diffYears * 12 + diffMonths;

    // Jeśli dzień bieżący > dzień terminu w tym samym miesiącu — odejmij 1
    if (today.getDate() > deadline.getDate()) {
      totalMonths -= 1;
    }

    // Odmiana liczebnika
    function odmienMiesiac(n) {
      if (n < 0)  return 'po terminie';
      if (n === 0) return 'mniej niż miesiąc';
      if (n === 1) return '1 miesiąc';
      var mod10  = n % 10;
      var mod100 = n % 100;
      if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
        return n + ' miesiące';
      }
      return n + ' miesięcy';
    }

    // Nazwa bieżącego miesiąca w mianowniku + rok
    var MIESIACE_MIANOWNIK = [
      'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
      'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'
    ];
    var nazwaM = MIESIACE_MIANOWNIK[today.getMonth()];
    var rokM   = today.getFullYear();
    var miesiacRok = nazwaM + ' ' + rokM; // np. "czerwiec 2026"

    // Badge bieżącego miesiąca przy "Teraz"
    if (badgeNow) {
      badgeNow.textContent = miesiacRok;
    }

    // Zdanie opisowe w wierszu "Teraz" — aktualizuj tylko początek
    if (descNow) {
      var odmiana = odmienMiesiac(totalMonths);
      // Zachowaj resztę zdania po pierwszym ". "
      var fullText = descNow.textContent;
      var dotIdx   = fullText.indexOf('. ');
      var reszta   = dotIdx !== -1 ? fullText.slice(dotIdx) : '. Polska ustawa wykonawcza przyjęta przez Radę Ministrów.';
      var poczatek;
      if (totalMonths < 0) {
        poczatek = 'Termin minął';
      } else if (totalMonths === 0) {
        poczatek = 'Mniej niż miesiąc do kluczowego terminu';
      } else {
        poczatek = odmiana.charAt(0).toUpperCase() + odmiana.slice(1) + ' do kluczowego terminu';
      }
      descNow.textContent = poczatek + reszta;
    }

    // Badge "za X miesięcy" przy terminie 2 sie 2026
    if (badgeDeadline) {
      if (totalMonths < 0) {
        badgeDeadline.textContent = 'minął';
      } else if (totalMonths === 0) {
        badgeDeadline.textContent = 'mniej niż miesiąc';
      } else {
        badgeDeadline.textContent = 'za ' + odmienMiesiac(totalMonths);
      }
    }

    // Stopka — "Stan na [miesiąc rok]"
    if (sourceEl) {
      sourceEl.textContent = sourceEl.textContent.replace(
        /Stan na .+$/,
        'Stan na ' + miesiacRok
      );
    }
  })();

  // Accordion FAQ
  const accordionItems = document.querySelectorAll('.accordion-item');
  accordionItems.forEach((item) => {
    const question = item.querySelector('.accordion-question');
    const icon = item.querySelector('.accordion-icon');

    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      // Zamknij wszystkie otwarte elementy
      accordionItems.forEach((el) => {
        el.classList.remove('open');
        el.querySelector('.accordion-icon').textContent = '+';
      });

      // Jeśli kliknięty był zamknięty — otwórz go
      if (!isOpen) {
        item.classList.add('open');
        icon.textContent = '−';
      }
    });
  });
});
