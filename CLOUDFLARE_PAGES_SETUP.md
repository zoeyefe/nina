# Cloudflare Pages Kurulumu (nina.efeservili.dev)

Bu repo içinde yayınlanacak site dizini: `website`

## 1) Cloudflare Pages projesi oluştur
1. Cloudflare Dashboard → Workers & Pages
2. Create application → Pages → Connect to Git
3. Bu GitHub reposunu seç
4. Build ayarları:
   - Build command: (boş bırak)
   - Build output directory: `website`

## 2) Subdomain bağla
1. Pages projesi → Custom domains
2. Add custom domain: `nina.efeservili.dev`
3. Cloudflare DNS panelinde kayıt otomatik oluşmuyorsa manuel CNAME ekle

## 3) Kontrol listesi
- [ ] Deploy başarılı
- [ ] HTTPS aktif
- [ ] `nina.efeservili.dev` açılıyor
- [ ] Ana sayfada kurulum komutları kopyalanabiliyor

## Not
README veya website içindeki `YOUR_REPO_URL` alanlarını gerçek repo URL’inle güncelle.
