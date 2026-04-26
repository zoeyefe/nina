const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.tab-panel');

for (const tab of tabs) {
  tab.addEventListener('click', () => {
    const id = tab.dataset.tab;
    tabs.forEach(t => t.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.querySelector(`[data-panel="${id}"]`)?.classList.add('active');
  });
}

for (const btn of document.querySelectorAll('[data-copy-target]')) {
  btn.addEventListener('click', async () => {
    const targetId = btn.getAttribute('data-copy-target');
    const text = document.getElementById(targetId)?.innerText?.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const original = btn.textContent;
      btn.textContent = 'Kopyalandı ✓';
      setTimeout(() => (btn.textContent = original), 1400);
    } catch {
      btn.textContent = 'Kopyalanamadı';
      setTimeout(() => (btn.textContent = 'Kopyala'), 1400);
    }
  });
}
