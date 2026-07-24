(() => {
  'use strict';

  // This file is entirely OPTIONAL. The WhatsApp button in
  // whatsapp-button.html is a plain <a href="https://wa.me/...">, so
  // clicking/tapping it and navigating to WhatsApp works with zero
  // JavaScript. Only include this script if you want to hook outbound
  // clicks into analytics (GA4, Meta Pixel, etc.) — otherwise skip it.

  const waButton = document.querySelector('.wa-float');
  if (!waButton) return;

  waButton.addEventListener('click', () => {
    // Example hook — uncomment and adapt to whatever analytics tool the
    // site uses. Left as a no-op by default so this script has zero
    // effect on behavior or performance until it's wired up on purpose.
    //
    // if (typeof gtag === 'function') {
    //   gtag('event', 'whatsapp_click', { event_category: 'engagement' });
    // }
  }, { passive: true });
})();
