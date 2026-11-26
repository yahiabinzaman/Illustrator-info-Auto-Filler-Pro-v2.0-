<p align="center">
  <img src="icons/icon-128.png" width="80" alt="Auto Filler Pro Logo" />
</p>

# Auto Filler Pro (অটো ফিলার প্রো)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Adobe Illustrator](https://img.shields.io/badge/Adobe%20Illustrator-CC%202018%20--%202026%2B-orange.svg)](https://www.adobe.com/products/illustrator.html)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows-blue.svg)](https://github.com/yahiabinzaman/Illustrator-info-Auto-Filler-Pro-v2.0-)
[![Version](https://img.shields.io/badge/Version-3.0.0%20Pro-007acc.svg)](https://github.com/yahiabinzaman/Illustrator-info-Auto-Filler-Pro-v2.0-)
[![Author](https://img.shields.io/badge/Developed%20by-Yahia%20Bin%20Zaman-007acc.svg)](https://github.com/yahiabinzaman)

**Auto Filler Pro** (ColorLab Edition) হলো Adobe Illustrator-এর জন্য একটি আধুনিক, দ্রুত এবং সম্পূর্ণ স্বয়ংক্রিয় CEP এক্সটেনশন। কিরিং (Keyring), ডায়েরি (Diary), আইডি কার্ড, নেম-ট্যাগ এবং প্রিন্ট টেমপ্লেটে শত শত বাংলা/ইংরেজি নাম, বায়োডাটা, পিস সংখ্যা (Quantity), বাণী ও ফরম নম্বর কয়েক সেকেন্ডের মধ্যে নির্ভুলভাবে বসিয়ে দেয়।

Developed with ❤️ by **[Yahia Bin Zaman](https://github.com/yahiabinzaman)** / **ColorLab**

---

## ⚡ ১-লাইনে অটো ইনস্টল (1-Line Quick Install)

কোনো ফোল্ডার খোঁজা বা ম্যানুয়ালি কপি করার ঝামেলা ছাড়াই নিচের কমান্ডটি রান করলে **Auto Filler Pro v3.0** (এবং Bornomala ফন্ট) স্বয়ংক্রিয়ভাবে ইনস্টল হয়ে যাবে:

### 🍎 macOS (Terminal):
```bash
curl -fsSL https://raw.githubusercontent.com/yahiabinzaman/Illustrator-info-Auto-Filler-Pro-v2.0-/main/install.sh | bash
```

### 🪟 Windows (PowerShell):
```powershell
irm https://raw.githubusercontent.com/yahiabinzaman/Illustrator-info-Auto-Filler-Pro-v2.0-/main/install.ps1 | iex
```

> **ইনস্টল শেষ হলে:** Adobe Illustrator রিস্টার্ট করুন এবং মেনুবার থেকে ওপেন করুন:  
> **`Window > Extensions > Auto Filler Pro`**

---

### 🖱️ অফলাইন ডাবল-ক্লিক ইনস্টলার (Offline Installer)
রিপোজিটরিটি [ZIP ডাউনলোড](https://github.com/yahiabinzaman/Illustrator-info-Auto-Filler-Pro-v2.0-/archive/refs/heads/main.zip) করে আনজিপ করুন:
- **macOS:** `Install_Mac.command` ফাইলে ডাবল-ক্লিক করুন।
- **Windows:** `Install_Windows.bat` ফাইলে রাইট-ক্লিক করে **Run as administrator** (অথবা ডাবল-ক্লিক) দিন।
- **Illustrator Script Menu:** চাইলে Illustrator থেকে `File > Scripts > Other Script...` দিয়ে `Install_Auto_Filler_Pro.jsx` রান করতে পারেন।

---

## 🌟 প্রধান বৈশিষ্ট্যসমূহ (Key Features)

### 🔑 ১. Keyring Auto-Filler
- **ডিজাইন ও কালার প্রোটেকশন:** কার্ডের রেডি করা ডিজাইন, ফন্ট সাইজ ও কালার অক্ষত রেখেই স্বয়ংক্রিয়ভাবে ডেটা বসায়।
- **স্মার্ট বাণী ও বায়োডাটা ডিটেকশন:** শিক্ষার্থীর নাম/পিতা/ঠিকানা/ফোন এবং **বাণী (Bani)** ফ্রেম আলাদাভাবে চিনে নির্ভুল জায়গায় বসায়।
- **পিস সংখ্যা (Quantity / Pcs) পার্সার:** `পরিমাণ: ২৫ পিস`, `রিংস ১২`, বা লাইনের শেষের একক সংখ্যা অটো ডিটেক্ট করে টেমপ্লেটের পিস সংখ্যা আপডেট করে।
- **একটানা ধারাবাহিক ফিল (Skip Filled & Auto-Remove):** যেসব কার্ড ইতিমধ্যেই পূরণ করা হয়েছে সেগুলো বাদ দিয়ে পরের খালি কার্ড থেকে কাজ শুরু করে এবং বসে যাওয়া নাম লিস্ট থেকে মুছে ফেলে।

### 📔 ২. Diary / ID Card Auto-Filler
- **সিরিয়াল ও ফরম/দাখেলা নম্বর:** টপ-কর্নার বক্স বা নামের সাথে বাংলা/ইংরেজি সিরিয়াল (`১.`, `1.`) এবং প্রতিটি কার্ডের ফরম/দাখেলা নম্বর অটো-ফিল।
- **সেফ মার্জিন অটো-ফিট (Auto-Fit):** লম্বা নাম বা ঠিকানা কার্ডের বক্সের বাইরে চলে গেলে `Max Width (mm)` অনুযায়ী স্বয়ংক্রিয়ভাবে Horizontal Scale ও Font Size অ্যাডজাস্ট করে।
- **সম্পূর্ণ CMYK ও Hex কালার কন্ট্রোল:** প্রিন্ট-রেডি সলিড ব্ল্যাক, ডিপ টিল, মেরুন সহ কাস্টম CMYK বা ক্যানভাস আইড্রপার (`Pick from Canvas`)।

### 🗂️ ৩. Template Duplicator & Artboard Generator
- সিঙ্গেল মাস্টার কার্ড সিলেক্ট করে মোট কপি সংখ্যা, কলাম ও গ্যাপ দিয়ে স্বয়ংক্রিয়ভাবে একাধিক আর্টবোর্ড ও গ্রিড তৈরি।
- ক্লিপড আর্টওয়ার্ক বাউন্ডস ডিটেকশনের মাধ্যমে `0 pt` গ্যাপেও নিখুঁত ফ্লাশ অ্যালাইনমেন্ট।

### ↔️ ৪. Canvas Move (Direct Placement)
- ক্যানভাসে থাকা ফ্লোটিং টেক্সট ফ্রেমগুলোকে সিলেক্ট করা খালি কার্ডের ভেতর Column-wise বা Row-by-Row অনুযায়ী সরাসরি বসিয়ে দেয়।

### 🔤 ৫. বাংলা ইউনিকোড, বিজয় ও বোর্নমালা (Bornomala) সাপোর্ট
- ইউনিকোড ও বিজয় (SutonnyMJ / Bornomala) ফন্টের সাথে স্মার্ট কম্প্যাটিবিলিটি।
- নেটিভ macOS/Windows সিঙ্ক্রোনাস ক্লিপবোর্ড পেস্ট (`Cmd+V` / `Ctrl+V` ও রাইট-ক্লিক মেনু) যাতে বাংলা যুক্তাক্ষর ভেঙে না যায়।

---

## 📁 ফোল্ডার স্ট্রাকচার (Repository Structure)

```text
Auto Filler Pro/
├── CSXS/
│   └── manifest.xml                # Adobe CEP 9+ Extension Manifest (com.colorlab.autofillerpro)
├── css/
│   └── style.css                   # Apple-Native macOS Dark UI Stylesheet
├── fonts/
│   ├── Bornomala-Bold.ttf
│   └── Bornomala-Regular.ttf
├── icons/                          # Custom Auto Filler Pro Panel & Brand Icons
├── js/
│   ├── CSInterface.js              # Adobe CEP JS Interface
│   └── main.js                     # Parser, Color Engine & Panel Controller
├── jsx/
│   └── hostscript.jsx              # Illustrator ExtendScript Engine
├── .debug                          # CEP Remote Debugging Config (Port 8088)
├── generate_icons.py               # Brand Icon Generator Script
├── install.sh                      # macOS 1-Line Automated Installer
├── install.ps1                     # Windows 1-Line PowerShell Installer
├── Install_Mac.command             # macOS Double-Click Installer
├── Install_Windows.bat             # Windows Double-Click Installer
├── Install_Auto_Filler_Pro.jsx     # Illustrator Script Installer
├── Set_Bornomala_Default.jsx       # Default Bornomala Font Setup Script
├── CHANGELOG.md                    # Version History
├── LICENSE                         # MIT License
└── README.md                       # Documentation
```

---

## ❓ সাধারণ সমস্যা ও সমাধান (Troubleshooting)

| সমস্যা | সমাধান |
|---|---|
| **`Window > Extensions` মেন্যুতে `Auto Filler Pro` দেখা যাচ্ছে না** | Illustrator সম্পূর্ণ বন্ধ করে আবার চালু করুন। `install.sh` / `install.ps1` রান করলে `PlayerDebugMode` অটো অন হয়ে যায়। |
| **পুরোনো `Keyring Auto-Filler Pro` বা `Name & Card Auto-Filler` দেখাচ্ছে** | নতুন `install.sh` / `install.ps1` পুরোনো ডুপ্লিকেট ফোল্ডার স্বয়ংক্রিয়ভাবে রিমুভ করে দেয়; Illustrator রিস্টার্ট করুন। |
| **বাংলা যুক্তাক্ষর বা ফন্ট ভেঙে যাচ্ছে** | টেমপ্লেটে `Bornomala` বা `SutonnyMJ` ফন্ট ব্যবহার করুন এবং প্রয়োজনে `Set_Bornomala_Default.jsx` চালিয়ে ডিফল্ট সেট করুন। |

---

## 👨‍💻 Author & Credits

- **Developed by:** [Yahia Bin Zaman](https://github.com/yahiabinzaman) / **ColorLab**
- **Repository:** [Illustrator-info-Auto-Filler-Pro-v2.0-](https://github.com/yahiabinzaman/Illustrator-info-Auto-Filler-Pro-v2.0-)
- **Version:** `3.0.0 Pro`
