# Cursor Tasks ve Workflows Kullanım Kılavuzu

## Tasks Dosyalarını Kullanma

### Yöntem 1: Doğrudan Referans
Prompt'unuzda tasks dosyasını doğrudan referans edin:

```
.cursor/tasks/planner.md dosyasındaki kurallara göre bir plan oluştur
```

### Yöntem 2: İçeriği Oku ve Uygula
```
.cursor/tasks/reviewer.md'yi oku ve bu kodu incele
```

### Yöntem 3: Workflow ile Birlikte
```
.cursor/workflows/planner-agent.md workflow'unu kullanarak yeni bir feature için plan oluştur
```

## Pratik Örnekler

### 1. Kod İncelemesi İçin
```
.cursor/tasks/reviewer.md kurallarına göre RentalDetailView.vue dosyasını incele
```

### 2. Planlama İçin
```
.cursor/tasks/planner.md'ye göre yeni bir ödeme modülü için teknik plan oluştur
```

### 3. Test Yazma İçin
```
.cursor/tasks/write-test.md kurallarına göre usePagination composable için test yaz
```

### 4. Debug İçin
```
.cursor/tasks/debugger.md'yi kullanarak şu hatayı analiz et: [hata mesajı]
```

### 5. Refactoring İçin
```
.cursor/workflows/refactor-pipeline.md workflow'unu kullanarak RentalCreateView.vue'yu refactor et
```

### 6. Tam Pipeline Kullanımı
```
.cursor/workflows/master-pipeline.md workflow'unu kullanarak "kullanıcı profil sayfası" feature'ını geliştir
```

## Workflow Kullanım Örnekleri

### Master Pipeline (Tam Süreç)
```
.cursor/workflows/master-pipeline.md'yi kullanarak "raporlama modülü" için tüm süreci yönet:
- Gereksinim analizi
- Planlama
- Task oluşturma
- Doğrulama
```

### Review Agent
```
.cursor/workflows/review-agent.md'yi kullanarak tüm components/ klasörünü incele
--reviewers vue,typescript,security
--severity warning
```

### Context Agent
```
.cursor/workflows/context-agent.md'yi kullanarak proje context'ini topla ve analiz et
```

## Kombine Kullanım

### Senaryo 1: Yeni Feature Geliştirme
```
1. .cursor/workflows/requirement-agent.md ile gereksinimleri analiz et
2. .cursor/workflows/planner-agent.md ile plan oluştur
3. .cursor/workflows/task-generator-agent.md ile task'ları oluştur
4. .cursor/workflows/validation-agent.md ile doğrula
```

### Senaryo 2: Kod İyileştirme
```
1. .cursor/tasks/reviewer.md ile mevcut kodu incele
2. .cursor/workflows/refactor-pipeline.md ile refactor planı oluştur
3. .cursor/tasks/write-test.md ile testleri yaz
```

## Hızlı Referans

| Görev | Kullanılacak Dosya |
|-------|-------------------|
| Planlama | `.cursor/tasks/planner.md` |
| Kod İnceleme | `.cursor/tasks/reviewer.md` |
| Debug | `.cursor/tasks/debugger.md` |
| Test Yazma | `.cursor/tasks/write-test.md` |
| Gereksinim Analizi | `.cursor/workflows/requirement-agent.md` |
| Tam Süreç | `.cursor/workflows/master-pipeline.md` |
| Refactoring | `.cursor/workflows/refactor-pipeline.md` |

## İpuçları

1. **Dosya Yolu**: `.cursor/` ile başlayan yolları kullanın
2. **Kombinasyon**: Birden fazla task/workflow'u birlikte kullanabilirsiniz
3. **Özelleştirme**: Task dosyalarını projenize göre düzenleyebilirsiniz
4. **Kısayollar**: Sık kullandığınız workflow'ları kısa isimlerle çağırabilirsiniz

## Örnek Prompt Şablonları

### Basit Task Kullanımı
```
.cursor/tasks/[task-name].md'ye göre [görev]
```

### Workflow Kullanımı
```
.cursor/workflows/[workflow-name].md workflow'unu kullanarak [görev]
```

### Kombine Kullanım
```
.cursor/tasks/[task1].md ve .cursor/workflows/[workflow].md'yi kullanarak [görev]
```
