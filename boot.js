(function () {
  "use strict";

  var THEME_KEY = "luisa_hub_theme_v1";
  var TEXT_KEY = "luisa_hub_text_level_v1";
  var THEMES = { system: true, light: true, dark: true };
  var TEXT_LEVELS = { small: true, normal: true, large: true, xlarge: true };
  var LIGHT_COLOR = "#F9F6F0";
  var DARK_COLOR = "#171717";

  function safeRead(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function applyThemeColor(theme) {
    if (theme !== "light" && theme !== "dark") return;
    var color = theme === "dark" ? DARK_COLOR : LIGHT_COLOR;
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i += 1) {
      metas[i].setAttribute("content", color);
    }
  }

  var storedTheme = safeRead(THEME_KEY);
  var storedText = safeRead(TEXT_KEY);
  var theme = Object.prototype.hasOwnProperty.call(THEMES, storedTheme) ? storedTheme : "system";
  var text = Object.prototype.hasOwnProperty.call(TEXT_LEVELS, storedText) ? storedText : "normal";

  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.text = text;
  applyThemeColor(theme);
}());
