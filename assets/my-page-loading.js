document.addEventListener("DOMContentLoaded", function () {
  var urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("s") && urlParams.get("s") === "r") {
    showLoading();
    setTimeout(() => {
      hideLoading();
      window.location.href = "/account";
    }, 7000);
  }
});


function showLoading() {
  const loadingOverlay = document.createElement("div");
  loadingOverlay.id = "loading-overlay";
  const spinner = document.createElement("div");
  spinner.classList.add("spinner");
  loadingOverlay.appendChild(spinner);
  document.body.appendChild(loadingOverlay);
  document.getElementById("loading-overlay").style.visibility = "visible";
}

// Hide the loading overlay
function hideLoading() {
  document.getElementById("loading-overlay").style.visibility = "hidden";
}
