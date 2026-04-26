# Nina

Terminal tabanlı, çoklu sağlayıcı destekli AI coding agent.

## Özellikler
- Çoklu provider desteği: `ollama`, `openai`, `anthropic`, `gemini`, `groq`, `mistral`, `cohere`, `openrouter`
- Dosya aksiyonları: `WRITE_FILE`, `DELETE_FILE`, `RUN_CMD`
- Planlama modları: `/tasks`, `/team` (çoklu ajan rol dağılımı)
- Güvenli credential yönetimi (`~/.nina/credentials.json`)
- Komut yürütme için Windows/Unix uyumluluk katmanı
- Otomatik hata yakalama + sınırlı auto-fix denemesi

## Kurulum
Gereksinim: Node.js `>=18`

```bash
npm install
npm start
```

Global kullanım için:
```bash
npm link
nina
```

## Hızlı Kullanım
Örnek komutlar:
- `/help`
- `/auth web`
- `/use ollama qwen3.5`
- `/tasks <hedef>`
- `/team <hedef>`
- `/run <komut>`

## Team Mode
`/team` ile kullanıcı sadece hedefi yazar; sistem rolleri otomatik seçer, ajanları çalıştırır ve tek bir birleşik çıktı üretir.

## Güvenlik
- API key’ler repoda tutulmaz; varsayılan olarak kullanıcı ev dizininde saklanır: `~/.nina`
- Hassas dosyaları repoya koymayın
- Önerilen gizli değişkenler için [`.env.example`](.env.example) dosyasını kullanın
- Detaylar için [SECURITY.md](SECURITY.md)

## Önemli Komutlar
- `/auth add|web|oauth|remove|list`
- `/use <provider> [model]`
- `/team <goal>`
- `/tasks <goal>`
- `/run <command>`
- `/debug ...`, `/daemon ...`, `/system ...`

## Proje Yapısı
- `nina.js` – ana CLI döngüsü
- `core/` – executor, planner, team agents, system prompt
- `providers/` – sağlayıcı istemcileri
- `auth/` – kimlik doğrulama/credential yönetimi
- `ui/` – terminal arayüzü
- `plugins/` – browser/system/debug/daemon eklentileri

## Açık Kaynak ve Koruma
Bu proje açık kaynaktır. Kritik dosyaları korumak için:
- `CODEOWNERS` ile review zorunluluğu
- GitHub branch protection kuralları (main’e direkt push kapalı)

`.github/CODEOWNERS` dosyası eklenmiştir.

## Lisans
MIT – bkz. [LICENSE](LICENSE)
