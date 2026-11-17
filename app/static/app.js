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
