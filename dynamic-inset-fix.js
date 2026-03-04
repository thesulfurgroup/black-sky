/*Dynamic Inset Nav Color Fix*/
document.addEventListener("DOMContentLoaded", function() {
    var firstSection = document.querySelector('#page [data-section-theme]');

    if (firstSection && firstSection.classList.contains("background-width--inset")) {
      var header = document.getElementById("header");

      if (header && header.getAttribute("data-header-style") === "dynamic") {
        var themeValue = firstSection.getAttribute("data-section-theme");
        header.setAttribute("data-section-theme", themeValue);
      }
    }
});
