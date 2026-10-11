/* =========================================
   dot — Cookie consent banner
   Stores acceptance in localStorage; shows the
   banner only until the visitor accepts.
   ========================================= */

(function () {
  var KEY = 'dot_cookie_consent';
  var banner = document.getElementById('consentBanner');
  if (!banner) return;

  var state = null;
  try { state = localStorage.getItem(KEY); } catch (e) {}
  if (state) return;

  requestAnimationFrame(function () {
    banner.classList.add('show');
  });

  banner.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-consent-accept]');
    if (!btn) return;
    try { localStorage.setItem(KEY, 'accepted'); } catch (e) {}
    banner.classList.remove('show');
    setTimeout(function () { banner.remove(); }, 350);
  });
})();