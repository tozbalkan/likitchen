# WhatsApp Bot Kurulumu: Meta ve OpenAI Hesapları

Bu rehber, WhatsApp üzerinden gelen müşteri taleplerini karşılayan botun çalışması için **sizin adınıza ve işletmenizin hesabıyla** açılması gereken hesapları adım adım anlatır.

Hesapların işletmenize ait olması önemlidir: WhatsApp numarası, mesajlar ve faturalar sizin kontrolünüzde kalır. Teknik tarafı (sunucu, webhook, yazılım) Tarık yürütüyor; sizden yalnızca bu hesapların açılması ve birkaç bilginin **güvenli şekilde** iletilmesi gerekiyor.

**Toplam süre:** Aşama 1 ve 2 yaklaşık 45–60 dakika. Aşama 3'teki işletme doğrulaması Meta tarafında birkaç gün ile birkaç hafta sürebildiği için **bugün başlatmanızı** öneririz.

> Meta ve OpenAI ekranları zaman zaman değişir. Buton isimleri birebir aynı olmayabilir; aşağıda ekranlarda göreceğiniz İngilizce isimleri tırnak içinde verdik.

---

## Başlamadan önce hazır olsun

- Kişisel bir **Facebook hesabı** (Meta, geliştirici hesabını buna bağlar; işletme sayfası olması gerekmez)
- İşletmenin **resmi adı, adresi, web sitesi** ve mümkünse **EIN** numarası
- Bir **kredi kartı** (OpenAI için ve ileride WhatsApp ücretli mesajları için)
- Testte kullanılacak **cep telefonu numaraları** (sizin ve Tarık'ın numarası)

---

## Aşama 1: Meta (WhatsApp) Test Kurulumu (~30 dk)

Bu aşamada Meta'nın verdiği ücretsiz **test numarası** ile botu deneyebileceğiz. Gerçek işletme numaranız Aşama 3'te bağlanacak.

### 1.1 İşletme hesabı (Business Portfolio)

1. **business.facebook.com** adresine Facebook hesabınızla girin.
2. İşletme hesabınız yoksa **"Create an account"** ile oluşturun:
   - Business name: işletmenizin resmi adı
   - Your name, business email: kendi bilgileriniz
3. E-postanıza gelen onay bağlantısına tıklayın.

### 1.2 Geliştirici hesabı ve uygulama

1. **developers.facebook.com** adresine gidin ve sağ üstten **"Get Started"** ile geliştirici olarak kaydolun (telefon ve e-posta doğrulaması ister).
2. **"My Apps" → "Create App"** tıklayın.
3. Kullanım amacı (use case) olarak **"Connect with customers through WhatsApp"** seçin.
4. App name: örneğin `İşletmeAdı WhatsApp Bot`. Contact email: işletme e-postanız.
5. **Business portfolio** olarak 1.1'de oluşturduğunuz işletmeyi seçin ve **"Create app"** ile bitirin.

### 1.3 WhatsApp test numarası

1. Uygulamanın sol menüsünden **"WhatsApp" → "API Setup"** sayfasına gidin.
2. Bu sayfada Meta size bir **test numarası** verir. Şu bilgileri bir kenara not edin (bunlar gizli değildir):
   - **Phone number ID**
   - **WhatsApp Business Account ID**
3. Aynı sayfada **"To"** alanında **"Manage phone number list"** tıklayın ve test sırasında mesaj atacak numaraları ekleyin (en fazla 5 numara):
   - Kendi cep numaranız
   - Tarık'ın numarası (ülke koduyla birlikte, Tarık size iletecek)
   - Her numaraya WhatsApp'tan bir doğrulama kodu gelir; o kodu girerek onaylayın.

> Test numarası yalnızca bu listedeki numaralarla yazışabilir. Gerçek müşterilerle yazışma Aşama 3'ten sonra başlar.

### 1.4 App Secret

1. Sol menüden **"App settings" → "Basic"** sayfasına gidin.
2. **App ID**'yi not edin (gizli değil).
3. **App secret** alanında **"Show"** tıklayın (Facebook şifrenizi sorar) ve değeri kopyalayın.

> ⚠️ **App secret gizlidir.** Aşağıdaki "Bilgileri güvenli iletme" bölümüne göre gönderin.

### 1.5 Kalıcı erişim anahtarı (System User Token)

API Setup sayfasındaki "Temporary access token" yalnızca **24 saat** geçerlidir. Botun kesintisiz çalışması için kalıcı bir anahtar gerekir:

1. **business.facebook.com → Settings (Business settings)** sayfasına gidin.
2. **"Users" → "System users" → "Add"** tıklayın.
   - Name: `whatsapp-bot`
   - Role: **Admin**
3. Oluşan kullanıcıyı seçip **"Assign assets"** tıklayın:
   - **Apps** → 1.2'deki uygulamanız → **Full control (Manage app)**
   - **WhatsApp accounts** → işletmenizin WhatsApp hesabı → **Full control**
4. **"Generate new token"** tıklayın:
   - App: 1.2'deki uygulamanız
   - Token expiration: **Never**
   - İzinler (permissions): **`whatsapp_business_messaging`** ve **`whatsapp_business_management`**
5. Çıkan anahtarı **hemen kopyalayın**; bir daha gösterilmez.

> ⚠️ **Bu anahtar gizlidir** ve işletmeniz adına WhatsApp mesajı gönderebilir. Yalnızca güvenli yolla iletin.

### 1.6 (Önerilir) Tarık'a uygulamada geliştirici erişimi verin

Webhook ayarlarını Tarık'ın doğrudan yapabilmesi için:

1. developers.facebook.com'da uygulamanızı açın → **"App roles" → "Roles"** → **"Add People"**.
2. Tarık'ın Facebook hesabını ekleyip rol olarak **"Developer"** seçin.

Bu yetkiyle Tarık hesap sahipliğinize, faturalarınıza veya işletme ayarlarınıza erişemez; yalnızca teknik ayarları yapabilir. İstediğiniz zaman kaldırabilirsiniz.

> Bunu yapmak istemezseniz, Tarık size bir **Callback URL** ve **Verify token** gönderir. Siz de **"WhatsApp" → "Configuration" → "Webhook" → "Edit"** bölümüne bu iki değeri girer, ardından **"Webhook fields"** listesinde **`messages`** alanına abone olursunuz (**"Subscribe"**).

---

## Aşama 2: OpenAI Hesabı (~15 dk)

Bot, müşterinin mesajından proje türü, konum, bütçe ve zamanlama gibi bilgileri çıkarmak için OpenAI kullanır.

### 2.1 Hesap ve organizasyon

1. **platform.openai.com** adresine gidin ve işletme e-postanızla **"Sign up"** yapın.
   (ChatGPT aboneliğinden **ayrı** bir hesaptır; ChatGPT Plus bu iş için kullanılamaz.)
2. Organizasyon adını işletmenizin adı yapın: **Settings → Organization → General**.

### 2.2 Ödeme ve harcama limiti

1. **Settings → Billing** → **"Add payment method"** ile kartınızı ekleyin.
2. **"Add to credit balance"** ile başlangıç için **$10–20** kredi yükleyin. Kullanılan model (`gpt-4o-mini`) çok ucuzdur; mesaj başına maliyet bir sentin çok küçük bir kesridir.
3. **Auto recharge** (otomatik yükleme) kapalı kalabilir. Açarsanız düşük bir eşik ve tutar belirleyin.
4. **Settings → Limits** sayfasında aylık bütçe uyarısı ayarlayın (örneğin **$20**). Böylece beklenmedik bir harcama olursa e-posta alırsınız.

### 2.3 Proje ve API anahtarı

1. Sol üstteki proje seçicisinden **"Create project"** tıklayın. İsim: `WhatsApp Bot`.
2. Bu proje seçiliyken **"API keys"** sayfasında **"Create new secret key"** tıklayın:
   - Name: `whatsapp-bot-production`
   - Project: `WhatsApp Bot`
   - Permissions: **All**
3. Anahtar (`sk-` ile başlar) yalnızca **bir kez** gösterilir; hemen kopyalayın.

> ⚠️ **OpenAI anahtarı gizlidir** ve doğrudan kartınızdan harcama yapar. Yalnızca güvenli yolla iletin.

> **Alternatif:** Anahtarı göndermek yerine Tarık'ı **Settings → Project → Members** bölümünden `WhatsApp Bot` projesine üye olarak davet edebilirsiniz. Böylece anahtar hiç yolculuk etmez ve Tarık'ın erişimi yalnızca bu proje ile sınırlı kalır.

> Bilgi: OpenAI, API üzerinden gönderilen verileri varsayılan olarak model eğitiminde **kullanmaz**.

---

## Aşama 3: Gerçek Numara ve İşletme Doğrulaması (bugün başlatın, süresi Meta'ya bağlı)

Test başarılı olduktan sonra botun gerçek müşterilerle yazışabilmesi için bu adımlar gerekir. En uzun süren kısım burası olduğundan **paralel olarak hemen başlatmanızı** öneririz.

### 3.1 İşletme doğrulaması (Business Verification)

1. **business.facebook.com → Settings → Security Center** (veya "Business info") → **"Start verification"**.
2. İstenen bilgiler: işletmenin resmi adı, adresi, telefonu, web sitesi, ve resmi belge (Articles of Incorporation, EIN yazısı, işletme ruhsatı veya işletme adına kesilmiş bir fatura gibi).
3. **Web sitesindeki işletme adı ve adresi**, girdiğiniz bilgilerle tutarlı olmalı; aksi halde doğrulama reddedilebilir.

### 3.2 Botun kullanacağı telefon numarası

Bota bağlanacak numara için iki seçenek var:

- **Önerilen:** Bot için **yeni bir numara** (ayrı bir hat veya sanal numara). Mevcut iş numaranız olduğu gibi kalır.
- **Mevcut iş numarası:** Kullanılabilir, ancak o numara **WhatsApp / WhatsApp Business uygulamasından silinmelidir**. Telefondaki uygulama o numarada artık çalışmaz ve eski sohbet geçmişi aktarılmaz.

Numara kararı verildiğinde:

1. developers.facebook.com → uygulamanız → **"WhatsApp" → "API Setup"** → **"Add phone number"**.
2. **Display name** olarak müşterilerin göreceği işletme adını girin. Meta bu adı ayrıca onaylar; işletmenizin adıyla uyumlu olmalıdır.
3. Numaraya SMS veya sesli arama ile gelen kodla doğrulayın.
4. Yeni numaranın **Phone number ID** değerini Tarık'a iletin.

### 3.3 Ödeme yöntemi (WhatsApp)

**business.facebook.com → WhatsApp Manager → "Payment settings"** bölümünden kart ekleyin. Müşterinin başlattığı yazışmalara verilen yanıtlar genellikle ücretsizdir. İşletmenin önceden onaylanmış şablonlarla başlattığı mesajlar ücretlidir. Güncel fiyatlar için Meta'nın "WhatsApp Business Platform Pricing" sayfasına bakabilirsiniz.

---

## Tarık'a İletilecek Bilgiler

| Bilgi                                   | Nereden | Gizli mi?   |
| --------------------------------------- | ------- | ----------- |
| App ID                                  | 1.4     | Hayır       |
| Phone number ID (test numarası)         | 1.3     | Hayır       |
| WhatsApp Business Account ID            | 1.3     | Hayır       |
| Test listesine eklenen numaralar        | 1.3     | Hayır       |
| **App secret**                          | 1.4     | **Evet** 🔒 |
| **System user token**                   | 1.5     | **Evet** 🔒 |
| **OpenAI API key** (ya da proje daveti) | 2.3     | **Evet** 🔒 |
| Developer rolü verildi mi?              | 1.6     | —           |
| İşletme doğrulaması başlatıldı mı?      | 3.1     | —           |

Gizli olmayan bilgiler normal e-posta veya mesajla gönderilebilir.

---

## 🔒 Gizli bilgileri güvenli iletme

Gizli üç bilgiyi (**App secret, System user token, OpenAI API key**) lütfen:

- ❌ E-posta, WhatsApp, SMS veya Slack mesajı olarak **düz metin halinde göndermeyin**.
- ❌ Ekran görüntüsü olarak göndermeyin.
- ✅ **Tek kullanımlık ve süreli bir paylaşım bağlantısı** kullanın. Örneğin:
  - **Bitwarden Send** (ücretsiz, bitwarden.com/products/send): "Deletion date" 1 gün, "Maximum access count" 1 seçin.
  - **1Password** kullanıyorsanız "Share item" ile süreli bağlantı.
- ✅ Bağlantıyı bir kanaldan (örneğin e-posta), bağlantının şifresini başka bir kanaldan (örneğin telefon veya SMS) iletin.

Bir anahtarın yanlışlıkla açığa çıktığını düşünürseniz hemen yenisini oluşturup eskisini silin (**Meta:** System user → "Revoke tokens"; **OpenAI:** API keys → çöp kutusu simgesi) ve Tarık'a haber verin.

---

## Sonraki Adımlar

Bilgiler Tarık'a ulaştıktan sonra:

1. Bot sunucuya kurulur ve Meta webhook'u bağlanır.
2. Test listesindeki numaralardan bota mesaj atarak birlikte deneriz.
3. İşletme doğrulaması ve gerçek numara onaylandığında bot gerçek müşterilere açılır.

Herhangi bir adımda takılırsanız ekranın görüntüsünü alıp (gizli değerleri kapatarak) Tarık'a iletmeniz yeterli.
