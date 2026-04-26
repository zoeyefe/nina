# Security Policy

## Supported Versions
Şu an aktif geliştirme dalı desteklenir.

## Secret Management
- API anahtarlarını repoya commit etmeyin.
- Uygulama anahtarları varsayılan olarak kullanıcı dizininde saklanır: `~/.nina/credentials.json`
- CI/CD tarafında secret store (GitHub Actions Secrets vb.) kullanın.

## Responsible Disclosure
Bir güvenlik açığı bulursanız issue’ya public yazmayın.
İlk aşamada private iletişimle paylaşın ve repro adımlarını ekleyin.

## Hardening Recommendations
- `main` branch protection aktif edin
- Pull request review zorunlu olsun
- `CODEOWNERS` aktif kalsın
- Secret scanning (GitHub Advanced Security / gitleaks) çalıştırın
