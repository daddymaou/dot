/* =========================================
   dot — Reveal-on-scroll
   Adds .revealed to [data-reveal] elements as
   they enter the viewport. Falls back to
   showing everything when unsupported.
   ========================================= */

(function () {
  var els = document.querySelectorAll('[data-reveal]');
  if (!els.length) return;

  if (!('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.classList.add('revealed'); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  els.forEach(function (el) { io.observe(el); });
})();