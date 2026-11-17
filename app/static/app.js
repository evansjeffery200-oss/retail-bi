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

/* Vee, the guide on the sign-in and create-account pages.
   She cycles her lines and gives the form a soft gold breath so the eye
   lands on the fields she is pointing at. */
(function () {
  "use strict";

  var bubble = document.querySelector(".guide-bubble span[data-guide-lines]");
  if (!bubble) return;

  var reduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  if (reduce && reduce.matches) return;

  var lines = [];
  try {
    lines = JSON.parse(bubble.getAttribute("data-guide-lines") || "[]");
  } catch (err) {
    lines = [];
  }

  var card = document.querySelector(".auth-card");
  if (card) {
    window.setTimeout(function () {
      card.classList.add("is-pointed");
      window.setTimeout(function () {
        card.classList.remove("is-pointed");
      }, 3100);
    }, 750);
  }

  if (!Array.isArray(lines) || lines.length < 2) return;

  var index = 0;
  window.setInterval(function () {
    bubble.classList.add("is-swapping");
    window.setTimeout(function () {
      index = (index + 1) % lines.length;
      bubble.textContent = lines[index];
      bubble.classList.remove("is-swapping");
    }, 270);
  }, 4200);
})();
