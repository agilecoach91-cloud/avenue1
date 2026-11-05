/*
  Floating "Book online" button for a business's own website. Opens the booking
  wizard in a pop-up over the page, so customers never leave the site.

  <script src="https://YOUR-APP/embed.js" data-business="acme-pest"
          data-label="Book online" data-color="#F2A900" async></script>

  Optional: data-position="left", data-bubble="Skip the call. Book online."
  (data-bubble="" hides the prompt). Any element with data-bookd-open on the page
  opens the pop-up too, e.g. <a href="#" data-bookd-open>Book now</a>.
*/
(function () {
  var script = document.currentScript;
  if (!script) return;
  var slug = script.getAttribute("data-business");
  if (!slug || window.__bookdEmbed) return;
  window.__bookdEmbed = true;

  var origin = new URL(script.src).origin;
  var label = script.getAttribute("data-label") || "Book online";
  var color = script.getAttribute("data-color") || "#F2A900";
  var side = script.getAttribute("data-position") === "left" ? "left" : "right";
  var bubbleText = script.hasAttribute("data-bubble") ? script.getAttribute("data-bubble") : "Skip the call. Book online.";

  function ink(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return "#14212b";
    var n = parseInt(m[1], 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? "#14212b" : "#ffffff";
  }

  var font = "system-ui,-apple-system,Segoe UI,sans-serif";
  var style = document.createElement("style");
  style.textContent =
    ".bookd-wrap{position:fixed;bottom:20px;" + side + ":20px;z-index:2147483000;display:flex;flex-direction:column;" +
    "align-items:" + (side === "left" ? "flex-start" : "flex-end") + ";gap:10px}" +
    ".bookd-btn{border:0;border-radius:999px;padding:14px 22px;font:700 16px/1 " + font + ";cursor:pointer;" +
    "box-shadow:0 6px 20px rgba(20,33,43,.25);background:" + color + ";color:" + ink(color) + "}" +
    ".bookd-btn:focus-visible,.bookd-bubble:focus-visible{outline:3px solid #14212b;outline-offset:3px}" +
    ".bookd-bubble{max-width:220px;border:0;border-radius:14px;padding:10px 14px;background:#fff;color:#14212b;" +
    "font:600 14px/1.3 " + font + ";box-shadow:0 6px 20px rgba(20,33,43,.18);cursor:pointer;text-align:left}" +
    ".bookd-overlay{position:fixed;inset:0;z-index:2147483001;background:rgba(20,33,43,.55);display:flex;" +
    "align-items:flex-end;justify-content:center}" +
    ".bookd-frame{width:100%;height:94vh;border:0;border-radius:16px 16px 0 0;background:#fff}" +
    "@media(min-width:640px){.bookd-overlay{align-items:center;padding:24px}" +
    ".bookd-frame{max-width:920px;height:min(720px,90vh);border-radius:20px;box-shadow:0 30px 80px rgba(0,0,0,.35)}}";
  document.head.appendChild(style);

  var lastFocus = null;
  var overlay = null;

  function close() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    document.documentElement.style.overflow = "";
    document.removeEventListener("keydown", onKey);
    if (lastFocus) lastFocus.focus();
  }
  function onKey(e) {
    if (e.key === "Escape") close();
  }

  function open() {
    if (overlay) return;
    lastFocus = document.activeElement;
    overlay = document.createElement("div");
    overlay.className = "bookd-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", label);

    var frame = document.createElement("iframe");
    frame.className = "bookd-frame";
    frame.title = label;
    frame.src = origin + "/" + encodeURIComponent(slug) + "/book?src=widget&embed=1";
    frame.allow = "camera";

    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.addEventListener("keydown", onKey);
    overlay.appendChild(frame);
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = "hidden";
    frame.focus();
    if (bubble) bubble.remove();
  }

  // The wizard's close button asks the page to close the pop-up.
  window.addEventListener("message", function (e) {
    if (e.origin === origin && e.data && e.data.type === "bookd:close") close();
  });

  var wrap = document.createElement("div");
  wrap.className = "bookd-wrap";
  var bubble = null;
  if (bubbleText) {
    bubble = document.createElement("button");
    bubble.type = "button";
    bubble.className = "bookd-bubble";
    bubble.textContent = bubbleText;
    bubble.addEventListener("click", open);
    wrap.appendChild(bubble);
  }
  var button = document.createElement("button");
  button.type = "button";
  button.className = "bookd-btn";
  button.textContent = label;
  button.addEventListener("click", open);
  wrap.appendChild(button);

  document.addEventListener("click", function (e) {
    var el = e.target && e.target.closest ? e.target.closest("[data-bookd-open]") : null;
    if (el) {
      e.preventDefault();
      open();
    }
  });

  if (document.body) document.body.appendChild(wrap);
  else document.addEventListener("DOMContentLoaded", function () { document.body.appendChild(wrap); });
})();
