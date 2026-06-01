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

  // Waitlist form
  const waitlistForm = document.getElementById('waitlist-form');
  const waitlistMsg = document.getElementById('waitlist-msg');

  if (waitlistForm && waitlistMsg) {
    waitlistForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = /** @type {HTMLInputElement} */ (document.getElementById('waitlist-email')).value;
      const btn = /** @type {HTMLButtonElement} */ (waitlistForm.querySelector('.waitlist-submit'));

      btn.disabled = true;
      btn.textContent = 'Zapisywanie…';

      try {
        const response = await fetch('https://aizyl-subscribe.aizylapp.workers.dev', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            publication_id: 'pub_5c8ea301-6a28-49bd-800a-9500f33687de',
            utm_source: 'website',
          }),
        });

        if (response.ok || response.status === 200 || response.status === 201) {
          waitlistMsg.textContent = '✓ Zapisano! Powiadomimy Cię w dniu launchu.';
          waitlistMsg.style.color = 'var(--primary)';
        } else {
          throw new Error('bad_status');
        }
      } catch (_err) {
        waitlistMsg.textContent = 'Coś poszło nie tak. Spróbuj ponownie.';
        waitlistMsg.style.color = 'red';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Zapisz mnie';
      }
    });
  }
});
