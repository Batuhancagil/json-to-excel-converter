# 🔄 JSON to Excel Converter

Modern, kullanıcı dostu JSON verilerini Excel formatına dönüştüren web uygulaması. Seçim geçmişi, template sistemi ve akıllı alan eşleştirme özellikleri ile güçlendirilmiş.

## 🚀 Auto-Deploy Test

GitHub entegrasyonu ile otomatik deploy test ediliyor.

## ✨ Özellikler

### 🚀 Temel Özellikler
- **JSON Dosya Yükleme**: Drag & drop ile kolay dosya yükleme
- **Doğrudan JSON Girişi**: JSON verisini doğrudan yapıştırma
- **Akıllı Alan Seçimi**: Nested objeler ve array'ler için gelişmiş seçim
- **Excel Export**: .xlsx formatında indirme
- **Özel Dosya Adı**: Excel dosyasına özel isim verme

### 🧠 Gelişmiş Özellikler
- **📚 Seçim Geçmişi**: Son 10 seçimi hafızada tutma
- **💾 Template Sistemi**: Favori seçimleri kaydetme ve yeniden kullanma
- **⚡ Hızlı Uygulama**: Son seçimi tek tıkla uygulama
- **🔍 Akıllı Eşleştirme**: Benzer alan isimlerini otomatik bulma
- **📊 Kullanım İstatistikleri**: Template kullanım sayıları

### 🎨 Kullanıcı Deneyimi
- **Modern UI**: Responsive ve kullanıcı dostu arayüz
- **Gerçek Zamanlı Önizleme**: İlk kayıt verilerini görüntüleme
- **Detaylı Bilgiler**: Alan türleri ve içerik önizlemesi
- **Hata Yönetimi**: Kapsamlı hata mesajları ve validasyon

## 🚀 Canlı Demo

**[🌐 Online Versiyonu Deneyin](https://json-to-excel-converter.vercel.app)**

## 📦 Kurulum

### Gereksinimler
- Node.js >= 18.0.0
- npm >= 8.0.0

### Adımlar
```bash
# Projeyi klonlayın
git clone https://github.com/batuhancagil/json-to-excel-converter.git
cd json-to-excel-converter

# Bağımlılıkları yükleyin
npm install

# Uygulamayı başlatın
npm start

# Geliştirme modu için
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışacaktır.

## 🎯 Kullanım

### 1. Temel Kullanım
1. **JSON Yükle**: Dosya sürükle-bırak veya JSON verisi yapıştır
2. **Alan Seç**: İstediğin alanları işaretle
3. **Excel İndir**: "Excel'e Dönüştür" butonuna tıkla

### 2. Template Sistemi
1. **Template Kaydet**: Alanları seç → "💾 Template Olarak Kaydet"
2. **Template Kullan**: Yeni JSON yükle → Template seç → "🚀 Uygula"
3. **Template Yönet**: Sil, düzenle, istatistikleri görüntüle

### 3. Akıllı Özellikler
- **⚡ Son Seçimi Uygula**: En son seçimi tek tıkla uygula
- **🧠 Akıllı Seçim**: Benzer alan isimlerini otomatik bul
- **📚 Seçim Geçmişi**: Önceki seçimleri dropdown'dan seç

## 🏗️ Teknik Detaylar

### Backend (Node.js + Express)
- **Express.js**: Web server
- **Multer**: Dosya yükleme
- **XLSX**: Excel dosya oluşturma
- **CORS**: Cross-origin istekler

### Frontend (Vanilla JavaScript)
- **Modern ES6+**: Arrow functions, async/await
- **Responsive Design**: Mobile-first yaklaşım
- **Real-time Updates**: DOM manipülasyonu
- **Modal System**: Kullanıcı etkileşimi

### Veri Yönetimi
- **Template Storage**: JSON dosya tabanlı
- **Selection History**: Memory-based
- **File Management**: Otomatik temizlik

## 🔧 API Endpoints

```
GET  /                    # Ana sayfa
POST /upload              # JSON yükleme
GET  /fields              # Mevcut alanları getir
POST /convert             # Excel'e dönüştür
POST /clear               # Verileri temizle

# Seçim Geçmişi
GET  /history             # Seçim geçmişini getir
POST /apply-selection     # Seçimi uygula
POST /smart-match         # Akıllı eşleştirme

# Template Sistemi
GET    /templates         # Template'leri getir
POST   /save-template     # Template kaydet
POST   /apply-template    # Template uygula
DELETE /delete-template/:id # Template sil
```

## 🚀 Deployment

### Vercel (Önerilen)
```bash
# Vercel CLI ile
npm i -g vercel
vercel

# GitHub ile otomatik
# Repository'yi Vercel'e bağla
```

### Heroku
```bash
# Heroku CLI ile
heroku create json-to-excel-converter
git push heroku main
```

### Railway
```bash
# Railway CLI ile
railway login
railway init
railway up
```

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 👨‍💻 Geliştirici

**Batuhan Çağıl**
- GitHub: [@batuhancagil](https://github.com/batuhancagil)
- LinkedIn: [Batuhan Çağıl](https://linkedin.com/in/batuhancagil)

## 🙏 Teşekkürler

- [SheetJS](https://sheetjs.com/) - Excel dosya işleme
- [Express.js](https://expressjs.com/) - Web framework
- [Multer](https://github.com/expressjs/multer) - Dosya yükleme

---

⭐ **Bu projeyi beğendiyseniz yıldız vermeyi unutmayın!**