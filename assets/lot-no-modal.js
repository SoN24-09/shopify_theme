// when ending URL has '/collections/all/#rottoNoSearch' then smooth scroll to #rottoNoSearch and focus on input,
document.addEventListener("DOMContentLoaded", function () {
  if (window.location.href.indexOf("/collections/all/#rottoNoSearch") > -1) {
    var el = document.getElementById("rottoNoSearch");
    var highlightElement = document.querySelector(".search-box");
    scrollSmoothHighlight(el, highlightElement);
  }
});

function scrollSmoothHighlight(element, highlightElement) {
  if (element) {
    element.scrollIntoView({ behavior: "smooth" });
  }

  if (highlightElement) {
    highlightElement.style.boxShadow = "0 0 10px 5px rgba(255, 0, 0, 0.2)";
    setTimeout(function () {
      highlightElement.style.boxShadow = "";
    }, 1500);
  }
}

function openModalLotNoGuide() {
  var modal = document.getElementById("modalLotNoGuide");
  if (modal) {
    document.body.style.overflow = "hidden";

    modal.style.display = "flex";
    modal.style.opacity = 0;
    modal.style.transition = "opacity 0.3s ease-in-out";
    setTimeout(() => {
      modal.style.opacity = 1;
    }, 10);
  }
}

function closeModalLotNoGuide() {
  var modal = document.getElementById("modalLotNoGuide");
  if (modal) {
    document.body.style.overflow = "auto";

    modal.style.opacity = 0;
    modal.style.transition = "opacity 0.3s ease-in-out";
    setTimeout(() => {
      modal.style.display = "none";
    }, 300); // Matches the transition duration
  }
}

window.onclick = function (event) {
  var modal = document.getElementById("modalLotNoGuide");
  if (event.target == modal) {
    closeModalLotNoGuide();
  }
};
