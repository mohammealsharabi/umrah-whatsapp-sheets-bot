# بوت واتساب لتأشيرات العمرة + Google Sheets

## ماذا يفعل البوت؟

- يستقبل ملفات PDF من واتساب.
- يأخذ اسم الملف فقط.
- يحذف `.pdf` وينظف الاسم.
- يأخذ أول 3 أسماء فقط.
- يبحث في العمود A من أسفل Google Sheet إلى أعلى.
- إذا وجد تطابقًا، يلوّن خلية الاسم بالأصفر فقط.
- لا يكتب أي بيانات داخل الشيت.
- بعد 5 دقائق من آخر ملف، يرسل تقريرًا في واتساب بالأسماء التي تحقق منها والتي لم يتحقق منها.

---

## 1) التثبيت

```bash
npm install
```

انسخ ملف الإعدادات:

```bash
cp .env.example .env
```

في ويندوز PowerShell:

```powershell
copy .env.example .env
```

---

## 2) إعداد Google Sheets

1. أنشئ Google Cloud Project.
2. فعّل Google Sheets API.
3. أنشئ Service Account.
4. نزّل ملف JSON وضعه داخل المشروع باسم:

```text
service-account.json
```

5. افتح Google Sheet.
6. شارك الشيت مع إيميل الـ Service Account بصلاحية Editor.
7. ضع ID الشيت في ملف `.env`:

```env
SPREADSHEET_ID=...
SHEET_NAME=Sheet1
```

ملاحظة: أسماء المعتمرين تكون في العمود A بدون `.pdf`.

---

## 3) إعداد WhatsApp Cloud API

في ملف `.env` ضع:

```env
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_API_VERSION=v23.0
VERIFY_TOKEN=any_secret_text
```

ثم شغل السيرفر:

```bash
npm run dev
```

---

## 4) اختبار محلي باستخدام ngrok

```bash
ngrok http 3000
```

ضع رابط الويب هوك في Meta هكذا:

```text
https://YOUR-NGROK-URL/webhook
```

واستخدم نفس `VERIFY_TOKEN` الموجود في `.env`.

---

## 5) طريقة المطابقة

مثال ملف واتساب:

```text
زياد احمد محمد سيف.pdf
```

البوت يحوله إلى:

```text
زياد احمد محمد سيف
```

ثم يأخذ أول 3 أسماء:

```text
زياد احمد محمد
```

ويبحث في العمود A من الأسفل إلى الأعلى، ويطابقه مع أول 3 أسماء من كل خلية.

---

## 6) التقرير بعد 5 دقائق

مثال:

```text
تقرير التحقق من تأشيرات العمرة:

✅ تم التحقق والتلوين: 8
1. رشيد حمود محمد شمسان
2. كوثر خالد حسن علي سيف

❌ لم أستطع التحقق: 2
1. محمد علي احمد صالح
2. فاطمة عبدالله سالم

الإجمالي: 10
```

---

## 7) السماح لأرقام محددة فقط

في `.env`:

```env
ALLOWED_NUMBERS=9677XXXXXXXX,9677YYYYYYYY
```

إذا تركته فارغًا، سيقبل أي مرسل أثناء التجربة.
