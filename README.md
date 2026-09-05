<div align="center">

# ⚡ Illustrator Name & Card Auto-Filler Pro (v2.0)
**Automated Biodata, Name Card & Template Populator for Adobe Illustrator**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Adobe Illustrator](https://img.shields.io/badge/Adobe%20Illustrator-CC%202018%20--%202026+-orange.svg)](https://www.adobe.com/products/illustrator.html)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows-lightgrey.svg)]()

<br/>

[![GitHub](https://img.shields.io/badge/GitHub-yahiabinzaman-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/yahiabinzaman)
[![Facebook](https://img.shields.io/badge/Facebook-YahiaBinZaman-1877F2?style=for-the-badge&logo=facebook&logoColor=white)](https://www.facebook.com/YahiaBinZaman/)
[![Instagram](https://img.shields.io/badge/Instagram-@yahiabinzaman-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://www.instagram.com/yahiabinzaman)
[![Behance](https://img.shields.io/badge/Behance-yahiabinzaman-1769FF?style=for-the-badge&logo=behance&logoColor=white)](https://www.behance.net/yahiabinzaman)

<p align="center">
  <b>Eliminate repetitive manual copy-pasting and text formatting in Illustrator cards, student biodata templates, certificates, and ID badges in 1 click!</b>
</p>

</div>

---

## 🌟 Key Features

### 1. ⚡ Tab 1: Smart Auto Fill & Formatter
* **Intelligent Bengali & English Serial Parser**: Auto-detects serial prefixes (`১.`, `২.`, `৩.` / `1.`, `2.`, `3.` / `(১)`, `[১]`, `১/`) and separates the **Name** from **Detail lines** (Father, Village, Thana, District, Blood Group, Phone, etc.).
* **Automatic Bold Styling**: Dynamically applies / preserves **Bold** font weights to the Name header.
* **Auto-Strip Serial Numbers**: Cleanly removes prefixes (`১. হাফেজ...` → `হাফেজ...`) so cards look pristine.
* **Multi-Scope Processing**: Populate selected cards, the active artboard, or **All Artboards across the entire document** in one execution.
* **Unicode & ANSI (Bijoy 52) Compatible**: Full support for Kalpurush, SolaimanLipi, Nikosh, and SutonnyMJ without glyph distortion.

### 2. 🎯 Tab 2: 1-Click Canvas Move & Align
* **Direct Canvas Distribution**: Select floating text blocks on the right and template cards on the left, then click Move — the script automatically matches and centers each text block into its respective card!
* **Interactive Fine-Tuning Sliders**:
  * **Horizontal Offset X (0 – 120 pt)**: Adjust inner card padding/margin in real time.
  * **Vertical Offset Y (-50 – +50 pt)**: Perfect top-alignment control.
* **Auto-Group & Bring to Front**: Groups placed text blocks with card backgrounds and layers them properly.

### 3. 🏷️ Tab 3: Batch Badge Renumbering
* **Instant Card Badging**: Renumber card number badges in bulk:
  * **Bangla 2-Digit**: `০১, ০২, ০৩, ০৪...`
  * **Bangla 1-Digit**: `১, ২, ৩, ৪...`
  * **English 2-Digit**: `01, 02, 03, 04...`
  * **English 1-Digit**: `1, 2, 3, 4...`
* **Custom Prefix/Suffix Support**: Add labels like `রোল: ০১` or `ID-001`.

---

## 🖥️ User Interface Preview

```
+-------------------------------------------------------------+
| 🎴 Name & Card Auto-Filler Pro                      [v2.0]  |
+-------------------------------------------------------------+
| [⚡ Auto Fill]   [🎯 Canvas Move & Align]   [🏷️ Badge Renumber] |
+-------------------------------------------------------------+
| DATA INPUT (Unicode / ANSI)                [Sample] [Clear] |
| ┌─────────────────────────────────────────────────────────┐ |
| │ ১. হাফেজ ইব্রাহিম আরব                                    │ |
| │ পিতা: মুহা. সিদ্দিকুর রহমান                              │ |
| │ গ্রাম: টিপুরদী, পোস্ট: মোগরাপাড়া                        │ |
| └─────────────────────────────────────────────────────────┘ |
|                                                             |
| FILLING SETTINGS:                                           |
| Fill Direction : [ Row by Row (Zig-Zag: 1, 2 | 3, 4)    ▼ ] |
| Target Scope   : [ Selected Cards / TextFrames          ▼ ] |
| [x] Auto-strip serial numbers from Name                     |
| [x] Apply / Preserve Bold styling on Name                   |
|                                                             |
| [✨ Auto Fill Cards from Data Input                       ] |
+-------------------------------------------------------------+
| Developed by Yahia Bin Zaman • github.com/yahiabinzaman     |
+-------------------------------------------------------------+
```

---

## 📦 Installation Guide

### Option 1: 1-Click Automated Installer (Recommended)

* **macOS**:
  Double-click **`Install_to_Illustrator.command`**.
* **Windows**:
  Double-click **`Install_to_Illustrator_Windows.bat`**.
* **Inside Illustrator**:
  Run **`Install_Name_Automation.jsx`** via `File > Scripts > Other Script...`.

*(Please restart Adobe Illustrator after installation to refresh the extensions menu).*

---

### Option 2: Manual Installation

Copy the entire `Illustrator Name automation` folder to your Adobe CEP directory:

* **macOS**:
  ```bash
  ~/Library/Application Support/Adobe/CEP/extensions/Name_Card_AutoFiller
  ```
* **Windows**:
  ```cmd
  %APPDATA%\Adobe\CEP\extensions\Name_Card_AutoFiller
  ```

And copy `Card_Data_AutoFiller.jsx` to your Illustrator Presets Scripts directory:
* **macOS**: `/Applications/Adobe Illustrator <Version>/Presets.localized/<Locale>/Scripts/`
* **Windows**: `C:\Program Files\Adobe\Adobe Illustrator <Version>\Presets\<Locale>\Scripts\`

---

## 🚀 How to Use

1. **Open the Panel in Adobe Illustrator**:
   * Navigate to top menu: `Window > Extensions > Name & Card Auto-Filler`
   * *(Or run the standalone script: `File > Scripts > Card_Data_AutoFiller`)*
2. **Choose Your Preferred Workflow**:
   * **Method A (Paste & Auto-Fill)**: Paste your names/biodata list in **Tab 1**, select your card templates on the canvas, and click **`✨ Auto Fill Cards from Data Input`**.
   * **Method B (Canvas Move)**: Select both your template cards (left) and floating text blocks (right) on the canvas, switch to **Tab 2**, and click **`🎯 1-Click Move & Place Text into Cards`**.
   * **Method C (Badge Renumbering)**: Select your card badges, switch to **Tab 3**, choose your numbering format (`০১, ০২...`), and click **`🔢 Renumber Selected Card Badges`**.

---

## 📁 Repository Structure

```
├── CSXS/
│   └── manifest.xml             # Adobe CEP Extension Manifest (CC 2018-2026+)
├── css/
│   └── style.css                # Native Adobe dark aesthetic stylesheet
├── js/
│   ├── CSInterface.js           # Adobe CEP JS interface library
│   └── main.js                  # Frontend app logic & smart text parser
├── jsx/
│   └── hostscript.jsx           # ExtendScript engine for spatial card detection & formatting
├── Card_Data_AutoFiller.jsx     # Standalone ScriptUI tool (runs via File > Scripts)
├── Install_Name_Automation.jsx  # ExtendScript one-click installer
├── Install_to_Illustrator.command # macOS shell installer
├── Install_to_Illustrator_Windows.bat # Windows batch installer
├── CHANGELOG.md                 # Release version history
├── LICENSE                      # MIT License
└── README.md                    # Documentation
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — free to use, modify, and distribute.

---

## 👨‍💻 Author & Connect

Developed with ❤️ by **[Yahia Bin Zaman](https://github.com/yahiabinzaman)**.

| Platform | Link |
|---|---|
| 🐙 **GitHub** | [@yahiabinzaman](https://github.com/yahiabinzaman) |
| 📘 **Facebook** | [@YahiaBinZaman](https://www.facebook.com/YahiaBinZaman/) |
| 📸 **Instagram** | [@yahiabinzaman](https://www.instagram.com/yahiabinzaman) |
| 🎨 **Behance** | [@yahiabinzaman](https://www.behance.net/yahiabinzaman) |

*Contributions, feature requests, and bug reports are welcome via GitHub Issues & Pull Requests!*
