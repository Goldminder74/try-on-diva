/* Wigsmi try-on widget loader. Usage:
 * <script async src="https://wigsmi.com/embed/widget.js" data-wigsmi-token="TOKEN"></script>
 * <div data-wigsmi-widget></div>
 */
(function () {
  var script = document.currentScript || document.querySelector("script[data-wigsmi-token]");
  if (!script) return;
  var token = script.getAttribute("data-wigsmi-token");
  if (!token) return;
  var origin = new URL(script.src).origin;
  function mount() {
    var targets = document.querySelectorAll("[data-wigsmi-widget]");
    if (!targets.length) {
      var d = document.createElement("div");
      d.setAttribute("data-wigsmi-widget", "");
      script.parentNode.insertBefore(d, script.nextSibling);
      targets = [d];
    }
    targets.forEach(function (el) {
      if (el.getAttribute("data-wigsmi-mounted")) return;
      el.setAttribute("data-wigsmi-mounted", "1");
      var f = document.createElement("iframe");
      f.src = origin + "/embed/widget/" + encodeURIComponent(token);
      f.title = "Wigsmi virtual try-on";
      f.loading = "lazy";
      f.allow = "camera";
      f.style.cssText = "width:100%;min-height:640px;border:0;border-radius:12px;display:block";
      el.appendChild(f);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
