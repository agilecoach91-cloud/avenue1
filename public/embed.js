/*
  Floating "Book online" button for a business's own website.

  <script src="https://YOUR-APP/embed.js" data-business="acme-pest"
          data-label="Book online" data-color="#F2A900" async></script>
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
  var position = script.getAttribute("data-position") === "left" ? "left" : "right";

  function ink(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return "#14212b";
    var n = parseInt(m[1], 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? "#14212b" : "#ffffff";
  }

  var style = document.createElement("style");
  style.textContent =
    ".bookd-btn{position:fixed;bottom:20px;" + position + ":20px;z-index:2147483000;border:0;border-radius:999px;" +
    "padding:14px 22px;font:700 16px/1 system-ui,-apple-system,Segoe UI,sans-serif;cursor:pointer;" +
    "box-shadow:0 6px 20px rgba(20,33,43,.25);background:" + color + ";color:" + ink(color) + "}" +
    ".bookd-btn:focus-visible{outline:3px solid #14212b;outline-offset:3px}" +
    ".bookd-overlay{position:fixed;inset:0;z-index:2147483001;background:rgba(20,33,43,.55);display:flex;" +
    "align-items:flex-end;justify-content:center}" +
    ".bookd-frame{width:100%;max-width:560px;height:92vh;border:0;border-radius:16px 16px 0 0;background:#f3f5f6}" +
    "@media(min-width:640px){.bookd-overlay{align-items:center}.bookd-frame{height:86vh;border-radius:16px}}" +
    ".bookd-close{position:absolute;top:12px;right:12px;width:40px;height:40px;border-radius:999px;border:0;" +
    "background:#fff;font:700 20px/1 system-ui;cursor:pointer}";
  document.head.appendChild(style);

  var button = document.createElement("button");
  button.type = "button";
  button.className = "bookd-btn";
  button.textContent = label;

  var lastFocus = null;
  function close(overlay) {
    overlay.remove();
    document.documentElement.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }

  button.addEventListener("click", function () {
    lastFocus = document.activeElement;
    var overlay = document.createElement("div");
    overlay.className = "bookd-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", label);

    var frame = document.createElement("iframe");
    frame.className = "bookd-frame";
    frame.title = label;
    frame.src = origin + "/" + encodeURIComponent(slug) + "?src=widget";

    var x = document.createElement("button");
    x.type = "button";
    x.className = "bookd-close";
    x.setAttribute("aria-label", "Close");
    x.textContent = "×";
    x.addEventListener("click", function () { close(overlay); });

    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(overlay); });
    document.addEventListener("keydown", function onKey(e) {
      if (e.key === "Escape") { close(overlay); document.removeEventListener("keydown", onKey); }
    });

    overlay.appendChild(frame);
    overlay.appendChild(x);
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = "hidden";
    x.focus();
  });

  if (document.body) document.body.appendChild(button);
  else document.addEventListener("DOMContentLoaded", function () { document.body.appendChild(button); });
})();
