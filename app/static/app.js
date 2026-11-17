/* Navigation transitions.
   The app is server rendered, so a page change is a full document load. This
   fades the outgoing view out (matching the vq-page-in entrance) so links feel
   like one continuous motion instead of a flash. */
(function () {
  "use strict";

  var reduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

  function isReduced() {
    return !!(reduce && reduce.matches);
  }

  window.addEventListener("pageshow", function () {
    document.body.classList.remove("is-leaving");
  });

  document.addEventListener("click", function (event) {
    if (event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!(event.target instanceof Element)) return;

    var link = event.target.closest("a");
    if (!link) return;

    var href = link.getAttribute("href");
    if (!href || href.charAt(0) === "#") return;
    if (link.target && link.target !== "_self") return;
    if (link.hasAttribute("download")) return;

    var url;
    try {
      url = new URL(link.href, window.location.href);
    } catch (err) {
      return;
    }
    if (url.origin !== window.location.origin) return;
    if (url.protocol !== "http:" && url.protocol !== "https:") return;

    // Same page, only a hash: let the browser scroll.
    if (url.pathname === window.location.pathname && url.search === window.location.search) return;

    event.preventDefault();
    if (isReduced()) {
      window.location.assign(url.href);
      return;
    }

    document.body.classList.add("is-leaving");
    window.setTimeout(function () {
      window.location.assign(url.href);
    }, 170);
  });
})();

/* First-run walkthrough.
   A small card walks a new account through the six ideas behind the app. The step
   is kept in sessionStorage so a page change does not send them back to step one,
   and finishing or skipping tells the server so it never greets them twice. */
(function () {
  "use strict";

  var card = document.getElementById("tour");
  if (!card) return;

  var source = document.getElementById("tour-steps");
  var steps = [];
  try {
    steps = JSON.parse(source.textContent || "[]");
  } catch (err) {
    steps = [];
  }
  if (!steps.length) return;

  var KEY = "vq-tour-step";
  var index = 0;
  try {
    var saved = parseInt(window.sessionStorage.getItem(KEY) || "0", 10);
    if (saved > 0 && saved < steps.length) index = saved;
  } catch (err) {}

  var titleEl = card.querySelector("[data-tour-title]");
  var bodyEl = card.querySelector("[data-tour-body]");
  var countEl = card.querySelector("[data-tour-index]");
  var totalEl = card.querySelector("[data-tour-total]");
  var dotsEl = card.querySelector("[data-tour-dots]");
  var backBtn = card.querySelector("[data-tour-back]");
  var nextBtn = card.querySelector("[data-tour-next]");
  var skipBtn = card.querySelector("[data-tour-skip]");
  var openEl = card.querySelector("[data-tour-open]");

  if (totalEl) totalEl.textContent = String(steps.length);
  if (dotsEl) {
    steps.forEach(function () {
      var dot = document.createElement("span");
      dotsEl.appendChild(dot);
    });
  }

  function highlight(href) {
    var current = document.querySelectorAll(".nav a.tour-hl");
    Array.prototype.forEach.call(current, function (link) {
      link.classList.remove("tour-hl");
    });
    if (!href) return;
    var match = document.querySelector('.nav a[href="' + href + '"]');
    if (match) match.classList.add("tour-hl");
  }

  function render() {
    var step = steps[index] || {};
    if (titleEl) titleEl.textContent = step.title || "";
    if (bodyEl) bodyEl.textContent = step.body || "";
    if (countEl) countEl.textContent = String(index + 1);
    if (backBtn) backBtn.disabled = index === 0;
    if (nextBtn) nextBtn.textContent = index === steps.length - 1 ? "Finish" : "Next";
    if (openEl && step.href && step.href !== "/") {
      openEl.href = step.href;
      openEl.hidden = false;
    } else if (openEl) {
      openEl.hidden = true;
    }
    if (dotsEl) {
      Array.prototype.forEach.call(dotsEl.children, function (dot, i) {
        dot.className = i === index ? "is-on" : i < index ? "is-done" : "";
      });
    }
    highlight(step.href);
    try {
      window.sessionStorage.setItem(KEY, String(index));
    } catch (err) {}
  }

  function finish() {
    try {
      window.sessionStorage.removeItem(KEY);
    } catch (err) {}
    highlight(null);
    card.classList.add("is-out");
    try {
      window.fetch("/onboarding/done", { method: "POST", keepalive: true });
    } catch (err) {}
    window.setTimeout(function () {
      if (card.parentNode) card.parentNode.removeChild(card);
    }, 260);
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      if (index >= steps.length - 1) {
        finish();
        return;
      }
      index += 1;
      render();
    });
  }
  if (backBtn) {
    backBtn.addEventListener("click", function () {
      if (index === 0) return;
      index -= 1;
      render();
    });
  }
  if (skipBtn) skipBtn.addEventListener("click", finish);

  document.addEventListener("keydown", function (event) {
    if (!card.isConnected) return;
    if (event.key === "Escape") {
      finish();
    } else if (event.key === "ArrowRight") {
      if (index >= steps.length - 1) finish();
      else {
        index += 1;
        render();
      }
    } else if (event.key === "ArrowLeft" && index > 0) {
      index -= 1;
      render();
    }
  });

  card.hidden = false;
  card.classList.add("is-in");
  render();
})();

/* Phone layout: the menu button opens the sidebar as a drawer. */
(function () {
  "use strict";

  var drawer = document.querySelector("[data-drawer]");
  var toggle = document.querySelector("[data-drawer-toggle]");
  var scrim = document.querySelector("[data-drawer-scrim]");
  var closeBtn = document.querySelector("[data-drawer-close]");
  if (!drawer || !toggle) return;

  function open() {
    drawer.classList.add("is-open");
    document.body.classList.add("drawer-open");
    toggle.setAttribute("aria-expanded", "true");
    if (scrim) {
      scrim.hidden = false;
      // let the browser paint the scrim before fading it in
      window.requestAnimationFrame(function () {
        scrim.classList.add("is-open");
      });
    }
  }

  function close() {
    drawer.classList.remove("is-open");
    document.body.classList.remove("drawer-open");
    toggle.setAttribute("aria-expanded", "false");
    if (scrim) {
      scrim.classList.remove("is-open");
      window.setTimeout(function () {
        scrim.hidden = true;
      }, 240);
    }
  }

  toggle.addEventListener("click", function () {
    if (drawer.classList.contains("is-open")) close();
    else open();
  });
  if (closeBtn) closeBtn.addEventListener("click", close);
  if (scrim) scrim.addEventListener("click", close);

  // following a link should not leave the drawer hanging open
  drawer.addEventListener("click", function (event) {
    var link = event.target.closest ? event.target.closest("a") : null;
    if (link && link.getAttribute("href")) close();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && drawer.classList.contains("is-open")) close();
  });

  var wide = window.matchMedia ? window.matchMedia("(min-width: 901px)") : null;
  if (wide && wide.addEventListener) {
    wide.addEventListener("change", function (event) {
      if (event.matches) close();
    });
  }
})();

/* Phone layout: give each cell of a simple data table the name of its column, so
   the stylesheet can stack the rows into labelled pairs. Tables with form fields
   in them are left alone. */
(function () {
  "use strict";

  function labelTables() {
    var tables = document.querySelectorAll("table.data");
    Array.prototype.forEach.call(tables, function (table) {
      if (table.querySelector("input, select, textarea")) return;
      var heads = table.querySelectorAll("thead th");
      if (!heads.length) return;
      var labels = Array.prototype.map.call(heads, function (th) {
        return (th.textContent || "").trim();
      });
      var rows = table.querySelectorAll("tbody tr");
      Array.prototype.forEach.call(rows, function (row) {
        Array.prototype.forEach.call(row.children, function (cell, i) {
          if (!cell.hasAttribute("data-label")) {
            cell.setAttribute("data-label", labels[i] || "");
          }
        });
      });
      table.classList.add("stacked");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", labelTables);
  } else {
    labelTables();
  }
})();

/* Desktop: the add panels are plain forms, so never leave one collapsed. */
(function () {
  "use strict";

  function keepOpen() {
    if (!window.matchMedia || !window.matchMedia("(max-width: 720px)").matches) {
      Array.prototype.forEach.call(document.querySelectorAll(".add-panel"), function (panel) {
        panel.open = true;
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", keepOpen);
  else keepOpen();
})();
