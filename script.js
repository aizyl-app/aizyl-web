/**
 * script.js — Myzel Web
 * Punkt wejścia aplikacji.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  console.log('[Myzel] DOM gotowy.');

  // Pricing scroll — przewiń do karty Pro (.plan-featured) na mobile
  const pricingContainer = document.querySelector('#pricing [style*="grid-template-columns: repeat(3, 1fr)"]');
  const planFeatured = document.querySelector('#pricing .plan-featured');
  if (pricingContainer && planFeatured && window.innerWidth <= 768) {
    planFeatured.scrollIntoView({ inline: 'center', behavior: 'instant', block: 'nearest' });
  }

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
