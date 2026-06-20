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
