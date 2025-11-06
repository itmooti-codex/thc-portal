// Toggle between All scripts and Archived scripts tables
(function () {
  const BUTTON_SELECTOR = "[data-scripts-view]";
  const WRAP_SELECTOR = ".thc-datalist-wrap[data-scripts-view]";
  function initScriptsToggle() {
    const panel = document.querySelector(".scripts-toggle");
    if (!panel) return;
    const wrappers = Array.from(document.querySelectorAll(WRAP_SELECTOR));
    if (!wrappers.length) return;

    function setActive(view) {
      panel
        .querySelectorAll(".scripts-toggle-btn")
        .forEach((btn) => btn.classList.toggle("is-active", btn.dataset.scriptsView === view));
      wrappers.forEach((wrap) => {
        const match = wrap.dataset.scriptsView === view;
        wrap.classList.toggle("hidden", !match);
        wrap.setAttribute("aria-hidden", match ? "false" : "true");
      });
      const bulkBar = document.getElementById("tableActions");
      if (bulkBar) {
        if (view === "archived") {
          bulkBar.classList.add("hidden");
        } else if (!window.vsSelectedRowIds || window.vsSelectedRowIds.length === 0) {
          bulkBar.classList.add("hidden");
        }
      }
    }

    panel.addEventListener("click", (event) => {
      const target = event.target.closest(BUTTON_SELECTOR);
      if (!target) return;
      const view = target.dataset.scriptsView || "all";
      setActive(view);
    });

    // Ensure initial state matches default button selection
    const initial =
      panel.querySelector(".scripts-toggle-btn.is-active")?.dataset
        .scriptsView || "all";
    setActive(initial);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initScriptsToggle);
  } else {
    initScriptsToggle();
  }
})();
