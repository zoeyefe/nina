const tabs = [...document.querySelectorAll(".tab")];
const panels = [...document.querySelectorAll(".tab-panel")];

for (const tab of tabs) {
  tab.addEventListener("click", () => {
    const id = tab.dataset.tab;

    for (const currentTab of tabs) {
      const active = currentTab === tab;
      currentTab.classList.toggle("is-active", active);
      currentTab.setAttribute("aria-selected", String(active));
    }

    for (const panel of panels) {
      panel.classList.toggle("is-active", panel.dataset.panel === id);
    }
  });
}

for (const button of document.querySelectorAll("[data-copy-target]")) {
  button.addEventListener("click", async () => {
    const targetId = button.getAttribute("data-copy-target");
    const text = document.getElementById(targetId)?.innerText?.trim();
    if (!text) return;

    const originalLabel = button.textContent;

    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Kopyalandı";
    } catch {
      button.textContent = "Kopyalanamadı";
    }

    window.setTimeout(() => {
      button.textContent = originalLabel;
    }, 1400);
  });
}

const revealItems = document.querySelectorAll("[data-reveal]");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    },
    { threshold: 0.16 }
  );

  for (const item of revealItems) {
    revealObserver.observe(item);
  }
} else {
  for (const item of revealItems) {
    item.classList.add("is-visible");
  }
}
