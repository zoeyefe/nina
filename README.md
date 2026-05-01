<div align="center">

```
███╗   ██╗██╗███╗   ██╗ █████╗
████╗  ██║██║████╗  ██║██╔══██╗
██╔██╗ ██║██║██╔██╗ ██║███████║
██║╚██╗██║██║██║╚██╗██║██╔══██║
██║ ╚████║██║██║ ╚████║██║  ██║
╚═╝  ╚═══╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝
```

**Terminal AI Coding Agent — 7/24 Otomatik Vibe Coder**

[![npm](https://img.shields.io/npm/v/@zoeyefe/nina?color=ff4a6e&label=npm&logo=npm&logoColor=white)](https://www.npmjs.com/package/@zoeyefe/nina)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-111827)](https://github.com/zoeyefe/nina)
[![License](https://img.shields.io/badge/License-MIT-2563eb)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Aktif%20Geliştirme-16a34a)](https://github.com/zoeyefe/nina)
[![Website](https://img.shields.io/badge/Website-nina.efeservili.dev-ff4a6e)](https://nina.efeservili.dev)

</div>

---

## Ne Yapar?

NINA, **terminalden çalışan** bir yapay zeka coding agent'ıdır. Sana bir hedef söylersin — NINA planlar, dosyaları yazar, komutları çalıştırır, hataları onarır. Sen sadece izlersin.

```bash
$ nina
> /team basit bir kullanıcı yönetim paneli yap

  ◆ Planner   → Hedef analiz edildi, 4 adım oluşturuldu
  ◆ Architect → Dosya yapısı tasarlandı
  ◆ Coder     → src/App.jsx yazıldı
  ◆ Tester    → npm run test çalıştırıldı ✓
```

---

## Özellikler

| | |
|---|---|
| 🤖 **8 Provider Desteği** | Ollama, OpenAI, Anthropic, Gemini, Groq, Mistral, Cohere, OpenRouter |
| ⚡ **Aksiyon Motoru** | `WRITE_FILE` / `RUN_CMD` / `DELETE_FILE` — doğrudan dosya sistemi üzerinde çalışır |
| 🧠 **Team Mode** | Çoklu ajan rol dağılımı — planner, coder, reviewer aynı anda |
| 📋 **Task Planner** | `/tasks` ile hedefe adım adım yol haritası |
| 🔄 **Otomatik Hata Onarımı** | Komut/aksiyon hatalarında kendi kendini toparlama döngüsü |
| 📺 **Canlı Monitor** | Team mode'da ajanların durumu tek ekranda canlı izlenir |
| 🔐 **Güvenli Auth** | API key'ler `~/.nina/credentials.json` içinde, repoya girmez |
| 🖥️ **Cross-Platform** | Windows + Unix komut uyumluluk katmanı |

---

## Kurulum

```bash
npm install -g @zoeyefe/nina
nina
```

> **Gereksinim:** Node.js 18 veya üzeri

---

## Hızlı Başlangıç

```bash
# 1. Bir provider ekle
/auth web

# 2. Model seç
/use ollama qwen3:8b
# veya
/use openai gpt-4o
# veya
/use anthropic claude-sonnet-4-5

# 3. Tek ajanlı mod
/tasks bir REST API yaz, Express + JWT auth olsun

# 4. Team mode — NINA rolleri kendisi atar
/team e-ticaret ürün sayfası yap, React + Tailwind
```

---

## Komut Referansı

```
/auth add|web|oauth|remove|list   → Provider kimlik yönetimi
/use <provider> [model]           → Aktif modeli değiştir
/team <hedef>                     → Çoklu ajan modu başlat
/tasks <hedef>                    → Planlı tek ajan modu
/run <komut>                      → Shell komutu çalıştır
/debug                            → Debug bilgilerini göster
/daemon                           → Arka plan modu
/system                           → Sistem ayarları
/help                             → Tüm komutları listele
```

---

## Team Mode Nasıl Çalışır?

`/team` yazdığında NINA şunları yapar:

```
Kullanıcı hedefi girer
        ↓
  Hedef analiz edilir
        ↓
  Roller otomatik atanır
  (Planner / Coder / Reviewer / ...)
        ↓
  Ajanlar paralel çalışır
  (Terminal monitöründe canlı görünür)
        ↓
  Aksiyonlar uygulanır
  (Dosyalar yazılır, komutlar çalışır)
        ↓
  Birleşik sonuç üretilir
```

Kullanıcı sadece hedefi yazar. Geri kalanını NINA halleder.

---

## Proje Yapısı

```
nina/
├── nina.js          # Ana CLI döngüsü & giriş noktası
├── core/            # Executor, planner, agents, shell adapter, system prompt
├── providers/       # LLM provider entegrasyonları (8 adet)
├── auth/            # Credential & auth akışları
├── ui/              # Terminal banner, input, renk sistemi
├── plugins/         # Browser, system, debug, daemon yetenekleri
├── memory/          # Session & memory yönetimi
└── website/         # nina.efeservili.dev kaynak kodu
```

---

## Desteklenen Providerlar

```
ollama      → Yerel modeller, sıfır maliyet
openai      → GPT-4o, o1, o3
anthropic   → Claude Sonnet, Opus
gemini      → Gemini 1.5 Pro/Flash
groq        → Llama 3, Mixtral (çok hızlı)
mistral     → Mistral Large/Small
cohere      → Command R+
openrouter  → 200+ model tek API
```

---

## Güvenlik

- API key'ler sadece `~/.nina/credentials.json` içinde tutulur — repoya girmez
- `.env.example` şablonunu kullan, gerçek değerleri asla commit etme
- `main` branch'i korumalıdır — direct push kapalı
- PR review zorunlu, kritik dosyalar CODEOWNERS ile denetleniyor

Detaylar için → [SECURITY.md](SECURITY.md)

---

## Katkıda Bulunma

```bash
git clone https://github.com/zoeyefe/nina.git
cd nina
npm install
node nina.js
```

PR açmadan önce ilgili dosyayı CODEOWNERS'da kontrol et.

---

<div align="center">

**[🌐 Website](https://nina.efeservili.dev)** · **[🐛 Issues](https://github.com/zoeyefe/nina/issues)** · **[📋 Changelog](https://github.com/zoeyefe/nina/commits/main)**

MIT Lisansı © 2025 [zoeyefe](https://github.com/zoeyefe)

*NINA hâlâ gelişiyor — her commit'te biraz daha zekileşiyor.*

</div>
