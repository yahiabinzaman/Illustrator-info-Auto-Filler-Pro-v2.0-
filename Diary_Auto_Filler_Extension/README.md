# Illustrator Info & Card Auto-Filler Pro (v2.0) 🚀

> **অটোমেটিক কার্ড ও নেম ডেটা ফিলিং এক্সটেনশন — Adobe Illustrator-এর জন্য আধুনিক, দ্রুত এবং নির্ভুল সমাধান।**  
> Complete Bengali & Multi-field Data Automation for ID Cards, Keyrings, Diaries, Badges & Labels in Adobe Illustrator.

---

## 🌟 প্রধান বৈশিষ্ট্যসমূহ (Key Features)

- ⚡ **৪-কলাম (২৮টি কার্ড) এবং ২-কলাম (১০টি কার্ড) প্রিসেট**: ১ ক্লিকে ২৮টি বা ১০টি কার্ডের পূর্ণাঙ্গ শিট তৈরি ও অটো-ফিল।
- 📝 **ফরম / দাখেলা নম্বর অটো পূরণ**: প্রতিটি কার্ডের নিচের ডানপাশের ফরম/দাখেলা ফ্রেম ডিটেক্ট করে স্বয়ংক্রিয়ভাবে সিরিয়াল অনুযায়ী নম্বর বসানো।
- 🎨 **অরিজিনাল ফরম্যাট অক্ষুণ্ণ রাখা**: ফন্ট সাইজ, ফন্ট ফ্যামিলি, ট্র্যাকিং, লিডিং এবং সলিড ব্ল্যাক (`CMYK: 0, 0, 0, 100`) কালার স্বয়ংক্রিয়ভাবে সংরক্ষিত থাকে।
- 🔄 **ধারাবাহিক অটো-ফিল (Continuous Fill)**: ধরা যাক প্রথম পেইজে ২৮টি কার্ডের পর ২য় পেইজে ২টি কার্ড ফিল হয়েছে—পরবর্তীতে নতুন ডেটা দিলে বাকি ২৬টি খালি কার্ড থেকেই নিজে নিজে পূরণ শুরু করবে।
- 🗂️ **মাল্টি-আর্টবোর্ড সাপোর্ট**: একটি ক্লিকে ডকুমেন্টের সব আর্টবোর্ডের কার্ড একের পর এক ফিল হতে থাকবে।
- 📐 **স্মার্ট গ্রিড ডুপ্লিকেটর**: যেকোনো সাইজের সিঙ্গেল মাস্টার কার্ড সিলেক্ট করে পুরো আর্টবোর্ডে নিখুঁত গ্যাপসহ মাল্টিপল কার্ড জেনারেট করার সুবিধা।
- 🔤 **বাংলা ইউনিকোড ও বিজয় অটো কনভার্সন**: সুতন্বীএমজে (SutonnyMJ) ও ইউনিকোড ফন্ট উভয়ের জন্যই রিয়েল-টাইম স্মার্ট কনভার্টার।

---

## 📥 ডাউনলোড করার নিয়ম (How to Download from GitHub)

### পদ্ধতি ১: জিপ (ZIP) ডাউনলোড (সবচেয়ে সহজ)
1. এই GitHub রিপোজিটরির উপরে থাকা সবুজ রঙের **`<> Code`** বাটনে ক্লিক করুন।
2. ড্রপডাউন থেকে **`Download ZIP`**-এ ক্লিক করুন।
3. ডাউনলোড হওয়া জিপ ফাইলটি আনজিপ (Extract) করুন।

### পদ্ধতি ২: Git Clone (ডেভেলপারদের জন্য)
টার্মিনালে নিচের কমান্ডটি রান করুন:
```bash
git clone https://github.com/yahiabinzaman/Illustrator-info-Auto-Filler-Pro-v2.0-.git
```

---

## 💻 ইন্সটলেশন গাইড (Installation Guide)

### 🍏 ১. macOS ব্যবহারকারীদের জন্য:

#### ⚡ সহজ উপায় (১-ক্লিক ইন্সটলার):
1. আনজিপ করা ফোল্ডারে ঢুকুন।
2. **`Install_Mac.command`** ফাইলে ডাবল ক্লিক করুন।
3. টার্মিনাল ওপেন হয়ে স্বয়ংক্রিয়ভাবে ইন্সটল হয়ে যাবে এবং "Installation Successful" মেসেজ দেখাবে।
4. **Adobe Illustrator রিস্টার্ট দিন**।

#### 🛠️ ম্যানুয়াল পদ্ধতি (যদি ১-ক্লিক কাজ না করে):
1. **Finder** ওপেন করে কিবোর্ডে `Cmd + Shift + G` চাপুন।
2. নিচের পাথটি পেস্ট করে এন্টার দিন:
   ```text
   ~/Library/Application Support/Adobe/CEP/extensions/
   ```
   *(যদি `CEP` বা `extensions` ফোল্ডার না থাকে, তবে নতুন ফোল্ডার তৈরি করুন)*
3. ডাউনলোড করা ফোল্ডারটির নাম **`Name_Card_AutoFiller`** দিয়ে এই `extensions` ফোল্ডারের ভেতর কপি করুন।
4. **Terminal** ওপেন করে নিচের কমান্ডটি পেস্ট করে এন্টার দিন (Debug Mode চালু করার জন্য):
   ```bash
   defaults write com.adobe.CSXS.11 PlayerDebugMode 1
   defaults write com.adobe.CSXS.12 PlayerDebugMode 1
   defaults write com.adobe.CSXS.13 PlayerDebugMode 1
   defaults write com.adobe.CSXS.14 PlayerDebugMode 1
   defaults write com.adobe.CSXS.15 PlayerDebugMode 1
   ```
5. **Adobe Illustrator রিস্টার্ট দিন**।

---

### 🪟 ২. Windows ব্যবহারকারীদের জন্য:

#### ⚡ সহজ উপায় (১-ক্লিক ইন্সটলার):
1. ডাউনলোড করা ফোল্ডারে ঢুকুন।
2. **`Install_Windows.bat`** ফাইলে রাইট-ক্লিক করে **`Run as administrator`** দিন।
3. কালো স্ক্রিনে ইন্সটলেশন সফল হওয়ার পর যেকোনো কি চাপুন।
4. **Adobe Illustrator রিস্টার্ট দিন**।

#### 🛠️ ম্যানুয়াল পদ্ধতি (ম্যানুয়ালি কপি করতে চাইলে):
1. কিবোর্ডে `Win + R` চাপুন, লিখুন `%APPDATA%\Adobe\CEP\extensions` এবং `OK` দিন।
   *(পাথটি হবে: `C:\Users\<আপনার_ইউজারনেম>\AppData\Roaming\Adobe\CEP\extensions\`)*
2. এই ফোল্ডারের ভেতর ডাউনলোড করা ফাইলগুলো **`Name_Card_AutoFiller`** নামে ফোল্ডার বানিয়ে পেস্ট করুন।
3. **Registry Editor** (`Win + R` চেপে `regedit`) ওপেন করে নিচের পাথে যান:
   ```text
   HKEY_CURRENT_USER\Software\Adobe\CSXS.11
   HKEY_CURRENT_USER\Software\Adobe\CSXS.12
   HKEY_CURRENT_USER\Software\Adobe\CSXS.13
   HKEY_CURRENT_USER\Software\Adobe\CSXS.14
   HKEY_CURRENT_USER\Software\Adobe\CSXS.15
   ```
   এখানে নতুন String Value তৈরি করুন যার নাম দিন `PlayerDebugMode` এবং ভ্যালু দিন `1`।
4. **Adobe Illustrator রিস্টার্ট দিন**।

---

## 🚀 Illustrator-এ এক্সটেনশন ওপেন ও ব্যবহারের নিয়ম

1. Adobe Illustrator ওপেন করুন।
2. মেন্যু বার থেকে যান:  
   👉 **`Window` > `Extensions` > `Name & Card Auto-Filler Pro`**
3. প্যানেলটি ওপেন হলে:
   - **Keyring / Card Auto-Fill** ট্যাবে যান।
   - আপনার নামের লিস্ট (নাম, পিতা, গ্রাম, মোবাইল, ফরম নম্বর ইত্যাদি) টেক্সটবক্সে পেস্ট করুন।
   - **`[x] ফরম / দাখেলা নম্বর অটো পূরণ করো (Fill Form / Dakhela No.)`** চেকবক্সটি অন রাখুন।
   - প্রিসেট অনুযায়ী **`4 Columns (1 - 2 - 3 - 4)`** অথবা **`2 Columns (1 - 2)`** সিলেক্ট করুন।
   - **`Auto Fill Keyring Cards`** বাটনে ক্লিক করুন।
4. চোখের পলকে আপনার সম্পূর্ণ আর্টবোর্ডের সব কার্ড নির্ভুলভাবে ফিল হয়ে যাবে! 🎯

---

## ❓ সাধারণ সমস্যা ও সমাধান (Troubleshooting)

| সমস্যা | সমাধান |
|---|---|
| **Window > Extensions মেন্যুতে নাম দেখা যাচ্ছে না** | ইলাস্ট্রেটর সম্পূর্ণ বন্ধ করে আবার চালু করুন (Restart)। PlayerDebugMode কমান্ডটি ঠিকমত রান হয়েছে কিনা নিশ্চিত করুন। |
| **ফন্ট ভেঙে যাচ্ছে বা যুক্তাক্ষর আসছে না** | বাংলা ফন্ট হিসেবে সুতন্বীএমজে (SutonnyMJ) সিলেক্ট করুন অথবা ইউনিকোড ফন্ট ব্যবহার করলে এক্সটেনশনের ইনপুট অটো কনভার্ট করে নিবে। |
| **নতুন ডেটা দিলে আগের কার্ড ওভাররাইট হচ্ছে** | `Skip Already Filled Cards` অপশনটি টিক দেওয়া রাখুন, তাহলে পূর্বের ফিল হওয়া কার্ড বাদ দিয়ে পরের খালি কার্ড থেকে ফিল হবে। |

---

## 👨‍💻 Developed By
**ColorLab & Yahia Bin Zaman**  
GitHub Repository: [Illustrator-info-Auto-Filler-Pro-v2.0-](https://github.com/yahiabinzaman/Illustrator-info-Auto-Filler-Pro-v2.0-)  
Version: **2.0.0 (Pro Edition)**
