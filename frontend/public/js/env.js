(function () {
  if (window.PONNALOY_API_URL) return;
  var host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    window.PONNALOY_API_URL = "http://localhost:3000/api";
  }
})();
