# NINA

<p align="center">
	<b>Terminal AI Coding Agent</b><br/>
	Çoklu model desteği, aksiyon tabanlı dosya/komut yürütme, planlama ve takım modu.
</p>

<p align="center">
	<img alt="Node" src="https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white" />
	<img alt="Platform" src="https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-111827" />
	<img alt="License" src="https://img.shields.io/badge/License-MIT-2563eb" />
	<img alt="Status" src="https://img.shields.io/badge/Status-Active-16a34a" />
</p>

---

## 🚀 NINA Nedir?

NINA, terminalden çalışan bir AI coding agent’tır. Kullanıcıdan gelen hedefi alır, planlar, `WRITE_FILE` / `RUN_CMD` / `DELETE_FILE` aksiyonlarına çevirir ve kontrollü şekilde uygular.

Öne çıkan farkı: **çoklu-provider mimarisi + takım modu + otomatik hata toparlama akışı**.

---

## ✨ Özellikler

- Çoklu provider desteği: `ollama`, `openai`, `anthropic`, `gemini`, `groq`, `mistral`, `cohere`, `openrouter`
- Aksiyon tabanlı yürütme: `WRITE_FILE`, `RUN_CMD`, `DELETE_FILE`
- `/tasks` ile adım adım planlama
- `/team` ile çoklu ajan rol dağılımı (rolleri AI otomatik seçer)
- Tek ekranda canlı team monitor (ajan durum/çıktı izleme)
- Windows/Unix komut uyumluluk katmanı
- Komut/aksiyon hatalarında otomatik onarım denemeleri
- Kimlik bilgilerini kullanıcı dizininde güvenli saklama: `~/.nina/credentials.json`

---

## ⚡ Kurulum

Gereksinim: **Node.js >= 18**

```bash
npm install
npm start
```

Global komut olarak kullanmak için:

```bash
npm link
nina
```

---

## 🧭 Hızlı Başlangıç

```text
/help
/auth web
/use ollama qwen3.5
/team basit bir kullanıcı yönetim paneli yap
```

Sık kullanılan komutlar:

- `/auth add|web|oauth|remove|list`
- `/use <provider> [model]`
- `/team <goal>`
- `/tasks <goal>`
- `/run <command>`
- `/debug ...`, `/daemon ...`, `/system ...`

---

## 🌐 Landing Page (Domain)

Repo içinde modern tanıtım/dokümantasyon sitesi hazır:

- [website/index.html](website/index.html)
- [website/style.css](website/style.css)
- [website/app.js](website/app.js)

Cloudflare Pages + subdomain kurulumu:

- [CLOUDFLARE_PAGES_SETUP.md](CLOUDFLARE_PAGES_SETUP.md)

---

## 🤖 Team Mode

`/team` modunda kullanıcı sadece hedefi yazar.

NINA:
1. hedefi analiz eder,
2. gerekli rolleri otomatik seçer,
3. ajanları çalıştırır,
4. tek bir birleşik sonuç üretir,
5. gerekirse aksiyonları uygular.

Bu akış sırasında ajanların canlı durumu terminal monitöründe izlenebilir.

---

## 🧱 Proje Mimarisi

| Yol | Açıklama |
|---|---|
| `nina.js` | Ana CLI döngüsü |
| `core/` | Executor, planner, agents, shell adapter, system prompt |
| `providers/` | LLM sağlayıcı entegrasyonları |
| `auth/` | Credential ve auth akışları |
| `ui/` | Terminal banner/input/renk sistemi |
| `plugins/` | Browser, system, debug, daemon yetenekleri |
| `memory/` | Session/memory yönetimi |

---

## 🔐 Güvenlik

- API key’leri repoya koymayın.
- Secret’lar varsayılan olarak kullanıcı dizininde tutulur: `~/.nina`
- Ortam değişkeni şablonu için [`.env.example`](.env.example)
- Güvenlik politikası: [SECURITY.md](SECURITY.md)
- Kod sahipliği kuralları: [.github/CODEOWNERS](.github/CODEOWNERS)

---

## 🛡️ Açık Kaynak + Koruma Stratejisi

Bu repo açık kaynak olacak şekilde tasarlanmıştır; kritik yüzeyler için koruma önerileri:

- Branch protection (`main` için direct push kapalı)
- PR review zorunluluğu
- CODEOWNERS ile kritik dosyalarda onay şartı

---

## 📄 Lisans

MIT — bkz. [LICENSE](LICENSE)
