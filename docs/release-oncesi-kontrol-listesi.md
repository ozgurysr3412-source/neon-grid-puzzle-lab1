# Release Öncesi Hatırlatma Listesi

Bu liste yayın (store/web release) öncesi **zorunlu** kontrol olarak uygulanacak.

## 1) Görsel Varlık Optimizasyonu
- Blok sprite dosyalarını mobil hedef çözünürlüğe düşür.
- PNG/WebP sıkıştırması uygula.
- Gereksiz alpha/metadata temizliği yap.

## 2) Ses Sistemi Optimizasyonu
- SFX preload + audio pool kullan (runtime `new Audio` spam yok).
- Pickup/place/clear/combo/game-over için tek tip ses pipeline doğrula.
- İlk kullanıcı etkileşiminde AudioContext resume test et (iOS + Android).

## 3) Mobil Performans Bütçesi
- 60 FPS hedefi için efekt yoğunluğunu cihaz seviyesine göre ayarla.
- Düşük/orta cihazlar için otomatik VFX degrade modu aç.
- Uzun oyun oturumunda memory ve GC spike kontrolü yap.

## 4) Gerçek Cihaz Test Matrisi
- iPhone (Safari) üzerinde tam oyun akışı.
- Orta seviye Android (Chrome/WebView) üzerinde tam oyun akışı.
- Farklı ekran oranlarında (küçük/orta/büyük) UI taşma-kırpılma testi.

## 5) Release Build Doğrulama
- Geliştirme modunda değil, release benzeri build üzerinde ölçüm al.
- İlk yükleme süresi, etkileşim gecikmesi, ses gecikmesi ölç.
- Kritik akışlar: drag/drop, line clear, combo, game-over, restart.

## 6) Son Onay Kriterleri
- Oyun içi sesler tutarlı ve rahatsız etmeyen tonlarda.
- Görseller keskin ama hafif.
- Mobilde takılma/stutter kullanıcıya hissedilmeyecek seviyede.
- Çökme/boş ekran/tepki vermeme yok.

---

Not: Release’e geçmeden önce bu listeyi bu başlıkla tekrar açıp madde madde onaylayacağız.
