/* =========================================
   dot — Theme engine
   Applies data-theme to <html>, persists choice,
   renders the floating theme switcher widget.
   ========================================= */

(function () {
  var THEMES = [
    { id: 'mono', label: 'Mono', bg: '#fafaf7', fg: '#0a0a0a' },
    { id: 'paper', label: 'Paper', bg: '#f2ebdb', fg: '#201a12' },
    { id: 'ink', label: 'Ink', bg: '#101012', fg: '#edede8' },
    { id: 'signal', label: 'Signal', bg: '#0b0b09', fg: '#e1e900' },
    { id: 'terminal', label: 'Terminal', bg: '#0b110d', fg: '#35f07e' },
    { id: 'cobalt', label: 'Cobalt', bg: '#0c1526', fg: '#4d8dff' }
  ];

  var STORAGE_KEY = 'dot_theme';

  function currentTheme() {
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    var valid = THEMES.some(function (t) { return t.id === saved; });
    return valid ? saved : 'mono';
  }

  function applyTheme(id, persist) {
    document.documentElement.setAttribute('data-theme', id);
    if (persist !== false) {
      try { localStorage.setItem(STORAGE_KEY, id); } catch (e) {}
    }
    markActiveOption(id);
    return id;
  }

  function markActiveOption(id) {
    document.querySelectorAll('.theme-option').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.theme === id);
    });
  }

  function buildWidget() {
    if (document.getElementById('themeSwitch')) return;

    var wrap = document.createElement('div');
    wrap.id = 'themeSwitch';
    wrap.className = 'theme-switch';

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'theme-switch-trigger';
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.textContent = 'Theme';

    var panel = document.createElement('div');
    panel.className = 'theme-switch-panel';

    var label = document.createElement('div');
    label.className = 'panel-label';
    label.textContent = 'Pick a theme';

    panel.appendChild(label);

    THEMES.forEach(function (t) {
      var option = document.createElement('button');
      option.type = 'button';
      option.className = 'theme-option';
      option.dataset.theme = t.id;
      option.setAttribute('role', 'menuitemradio');
      option.setAttribute('aria-checked', 'false');

      var swatch = document.createElement('span');
      swatch.className = 'swatch';
      swatch.style.background = 'linear-gradient(135deg, ' + t.bg + ' 0 55%, ' + t.fg + ' 55% 100%)';

      var name = document.createElement('span');
      name.textContent = t.label;

      var tick = document.createElement('span');
      tick.className = 'tick';
      tick.textContent = '\u2713';

      option.appendChild(swatch);
      option.appendChild(name);
      option.appendChild(tick);

      option.addEventListener('click', function () {
        applyTheme(t.id, true);
        trigger.textContent = 'Theme: ' + t.id;
        closePanel();
      });

      panel.appendChild(option);
    });

    wrap.appendChild(trigger);
    wrap.appendChild(panel);
    document.body.appendChild(wrap);

    trigger.addEventListener('click', function () {
      var isOpen = wrap.classList.toggle('open');
      trigger.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) closePanel();
    });

    function closePanel() {
      wrap.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    }
  }

  // Apply saved theme before anything renders meaningfully.
  var theme = currentTheme();
  applyTheme(theme, false);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildWidget);
  } else {
    buildWidget();
  }

  // Update floating label if it exists.
  var trigger = document.getElementById('themeSwitch');
})();