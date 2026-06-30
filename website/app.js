const translations = {
  tr: {
    title: "NINA | Terminal AI Coding Agent",
    description:
      "NINA; terminalde çalışan, çoklu provider destekli, dosya ve komut aksiyonlarını kontrollü yürüten açık kaynak AI coding agent.",
    brandSubtitle: "terminal coding agent",
    navModel: "Model",
    navFeatures: "Özellikler",
    navSecurity: "Güvenlik",
    navInstall: "Kurulum",
    heroEyebrow: "OPEN SOURCE CLI · NODE 18+",
    heroTitle: "NINA terminalde kod okur, plan yapar, dosya yazar ve komut çalıştırır.",
    heroText:
      "Chat penceresi gibi davranmak yerine projenin içinde çalışır. Provider seçimini, auth akışını, team mode planlamasını ve aksiyon onaylarını tek bir CLI oturumunda toplar.",
    heroPrimary: "Kurulumu aç",
    heroSecondary: "Çalışma modelini gör",
    heroCommand: `<span class="prompt">$</span> npm install -g @zoeyefe/nina
<span class="prompt">$</span> nina

<span class="muted-line"># provider ve model seç</span>
<span class="accent">/auth web</span>
<span class="accent">/use ollama qwen3:8b</span>

<span class="muted-line"># planlı veya takımlı akışa geç</span>
<span class="accent">/tasks Express + JWT auth için REST API yaz</span>
<span class="accent">/team React admin panelini tasarla ve kur</span>`,
    proofProviders:
      "Provider: Ollama, OpenAI, Anthropic, Gemini, Groq, Mistral, Cohere, OpenRouter.",
    proofEntry: 'Tek giriş noktası: <code>nina.js</code> üzerinden CLI oturumu.',
    modelEyebrow: "ÇALIŞMA MODELİ",
    modelTitle: "Bir prompt'tan doğrudan dosya sistemine atlamaz; araya plan, diff ve onay koyar.",
    modelText:
      "NINA'nın ağırlık merkezi <code>core</code> klasöründe: planner hedefi adımlara ayırır, executor aksiyonları yorumlar, shell katmanı platform farklarını toparlar, team mode ise rolleri koordine eder.",
    step1Title: "Hedefi anlar",
    step1Text:
      "<code>/tasks</code> tek ajanlı plan, <code>/team</code> ise planner, worker ve lead akışı başlatır.",
    step2Title: "Aksiyonları ayıklar",
    step2Text: "Model çıktısındaki dosya yazma, komut çalıştırma ve silme istekleri ayrı aksiyonlara dönüşür.",
    step3Title: "Değişimi gösterir",
    step3Text: "Dosya değişiklikleri diff olarak basılır; komutlar ve silmeler kullanıcı onayından geçer.",
    step4Title: "Geri alınabilir tutar",
    step4Text: "Yazma ve silme aksiyonları undo stack'e snapshot ekler, hatalı ilerleme daha kolay toparlanır.",
    featuresEyebrow: "ÖZELLİKLER",
    featuresTitle: "Sitedeki her iddia repodaki somut parçalara bağlı.",
    feature1Title: "Provider katmanı",
    feature1Text:
      "<code>providers/index.js</code> OpenAI uyumlu servisleri, Anthropic, Gemini, Cohere ve Ollama akışını tek API altında toplar.",
    feature2Title: "Auth ve setup",
    feature2Text:
      "<code>/auth web</code> yerel web arayüzü açar; credential ve aktif model bilgileri kullanıcı dizininde tutulur.",
    feature3Title: "Team monitor",
    feature3Text: "Planner, worker ve lead durumları terminalde kart benzeri bir monitörle izlenir.",
    feature4Title: "Pluginler",
    feature4Text: "Browser, debug, daemon, system ve arama yardımcıları CLI komutlarına takılabilir yetenekler ekler.",
    feature5Title: "Terminal ergonomisi",
    feature5Text: "Komut önerileri, provider/model değiştirme, session kaydı ve debug yardımcıları tek oturumda birleşir.",
    securityEyebrow: "GÜVENLİK VE KONTROL",
    securityTitle: "CLI agent güçlü olduğu kadar dikkatli de olmak zorunda.",
    securityText:
      "NINA dosya sistemine ve shell'e dokunabildiği için site tasarımı da bunu saklamıyor. Onaylı aksiyonlar, credential ayrımı ve repo dışı gizli bilgi saklama akışı ürünün merkezinde.",
    securityItem1Title: "Credential konumu",
    securityItem2Title: "Env sızıntısı önlemi",
    securityItem2Text: "<code>.env.example</code> şablon, gerçek anahtarlar repoya girmez.",
    securityItem3Title: "Aksiyon kontrolü",
    securityItem3Text: "Dosya yazma, komut ve silme istekleri ayrı ayrı görünür.",
    securityItem4Title: "Platform katmanı",
    securityItem4Text:
      "Windows PowerShell ve Unix komut farkları <code>core/shell.js</code> içinde normalize edilir.",
    installEyebrow: "KURULUM",
    installTitle: "Global kur, provider ekle, hedefi yaz.",
    tabInstall: "Kurulum",
    tabWork: "Çalışma",
    installWork: "/tasks src klasörünü incele ve eksik testleri yaz\n/team basit bir CRM dashboard'u kur\n/debug test\n/undo",
    footerText: "NINA · MIT lisanslı terminal AI coding agent",
    copy: "Kopyala",
    copied: "Kopyalandı",
    copyFailed: "Kopyalanamadı",
    toggleLabel: "EN",
  },
  en: {
    title: "NINA | Terminal AI Coding Agent",
    description:
      "NINA is an open-source terminal AI coding agent with multi-provider support and controlled file and command execution.",
    brandSubtitle: "terminal coding agent",
    navModel: "Model",
    navFeatures: "Features",
    navSecurity: "Security",
    navInstall: "Install",
    heroEyebrow: "OPEN SOURCE CLI · NODE 18+",
    heroTitle: "NINA reads code, plans work, writes files and runs commands from your terminal.",
    heroText:
      "Instead of acting like a detached chat window, NINA works inside the project. Provider selection, auth, team mode planning and action approvals live in one CLI session.",
    heroPrimary: "Open install",
    heroSecondary: "See the workflow",
    heroCommand: `<span class="prompt">$</span> npm install -g @zoeyefe/nina
<span class="prompt">$</span> nina

<span class="muted-line"># choose provider and model</span>
<span class="accent">/auth web</span>
<span class="accent">/use ollama qwen3:8b</span>

<span class="muted-line"># switch to planned or team workflow</span>
<span class="accent">/tasks write a REST API with Express + JWT auth</span>
<span class="accent">/team design and build a React admin panel</span>`,
    proofProviders:
      "Providers: Ollama, OpenAI, Anthropic, Gemini, Groq, Mistral, Cohere, OpenRouter.",
    proofEntry: 'Single entry point: a CLI session through <code>nina.js</code>.',
    modelEyebrow: "WORKFLOW",
    modelTitle: "It does not jump from prompt to filesystem; planning, diff and approval sit in between.",
    modelText:
      "NINA's center of gravity is the <code>core</code> directory: planner breaks goals into steps, executor parses actions, shell smooths platform differences and team mode coordinates roles.",
    step1Title: "Understands the goal",
    step1Text:
      "<code>/tasks</code> starts a single-agent plan; <code>/team</code> starts a planner, worker and lead flow.",
    step2Title: "Extracts actions",
    step2Text: "File writes, command runs and delete requests from model output are separated into explicit actions.",
    step3Title: "Shows the change",
    step3Text: "File edits are printed as diffs; commands and deletes go through user approval.",
    step4Title: "Keeps an undo path",
    step4Text: "Write and delete actions add snapshots to the undo stack so bad turns are easier to recover from.",
    featuresEyebrow: "FEATURES",
    featuresTitle: "Every claim on the page maps to something concrete in the repo.",
    feature1Title: "Provider layer",
    feature1Text:
      "<code>providers/index.js</code> unifies OpenAI-compatible services, Anthropic, Gemini, Cohere and Ollama behind one API.",
    feature2Title: "Auth and setup",
    feature2Text:
      "<code>/auth web</code> opens a local web UI; credentials and active model settings stay in the user's home directory.",
    feature3Title: "Team monitor",
    feature3Text: "Planner, worker and lead states are shown in a card-like terminal monitor.",
    feature4Title: "Plugins",
    feature4Text: "Browser, debug, daemon, system and search helpers add pluggable abilities to CLI commands.",
    feature5Title: "Terminal ergonomics",
    feature5Text: "Command suggestions, provider/model switching, session saving and debug helpers stay in one session.",
    securityEyebrow: "SECURITY AND CONTROL",
    securityTitle: "A CLI agent must be careful because it is powerful.",
    securityText:
      "NINA can touch the filesystem and shell, so the site does not hide that. Approved actions, credential separation and keeping secrets outside the repo are central to the product.",
    securityItem1Title: "Credential location",
    securityItem2Title: "Env leak prevention",
    securityItem2Text: "<code>.env.example</code> is a template; real keys do not go into the repo.",
    securityItem3Title: "Action control",
    securityItem3Text: "File writes, commands and delete requests are shown separately.",
    securityItem4Title: "Platform layer",
    securityItem4Text:
      "Windows PowerShell and Unix command differences are normalized in <code>core/shell.js</code>.",
    installEyebrow: "INSTALL",
    installTitle: "Install globally, add a provider, write the goal.",
    tabInstall: "Install",
    tabWork: "Work",
    installWork: "/tasks inspect the src folder and write missing tests\n/team build a simple CRM dashboard\n/debug test\n/undo",
    footerText: "NINA · MIT licensed terminal AI coding agent",
    copy: "Copy",
    copied: "Copied",
    copyFailed: "Could not copy",
    toggleLabel: "TR",
  },
};

const getLang = () => (localStorage.getItem("nina-lang") === "en" ? "en" : "tr");
let currentLang = getLang();

function applyLanguage(lang) {
  currentLang = lang;
  const dict = translations[lang];
  document.documentElement.lang = lang;
  document.title = dict.title;
  document.querySelector('meta[name="description"]')?.setAttribute("content", dict.description);

  for (const element of document.querySelectorAll("[data-i18n]")) {
    const key = element.dataset.i18n;
    if (dict[key] !== undefined) element.textContent = dict[key];
  }

  for (const element of document.querySelectorAll("[data-i18n-html]")) {
    const key = element.dataset.i18nHtml;
    if (dict[key] !== undefined) element.innerHTML = dict[key];
  }

  const toggle = document.querySelector("[data-lang-toggle]");
  if (toggle) {
    toggle.textContent = dict.toggleLabel;
    toggle.setAttribute("aria-label", lang === "tr" ? "Switch language to English" : "Dili Türkçe yap");
  }

  localStorage.setItem("nina-lang", lang);
}

document.querySelector("[data-lang-toggle]")?.addEventListener("click", () => {
  applyLanguage(currentLang === "tr" ? "en" : "tr");
});

applyLanguage(currentLang);

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

    const originalLabel = translations[currentLang].copy;

    try {
      await navigator.clipboard.writeText(text);
      button.textContent = translations[currentLang].copied;
    } catch {
      button.textContent = translations[currentLang].copyFailed;
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
