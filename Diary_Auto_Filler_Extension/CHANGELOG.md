# Changelog

All notable changes to the **Illustrator Name & Card Auto-Filler Pro** extension will be documented in this file.

## [2.4.4 Pro] - 2026-09-05

### Added & Fixed
- **Dynamic Template Line Leading Preservation (কার্ড টেমপ্লেটের নিজস্ব লিডিং বজায় রাখা)**:
  - Fixed issue where text line leading was hardcoded to `8.7471 pt` from an older keyring template.
  - Automatically extracts and preserves the native line leading from each specific keyring template (e.g. `9.6 pt` in Design 04, `8.75 pt` in Design 01, `10 pt` in other templates).
  - Inspects each card individually before modifying contents, falling back to document-level detected template leading if an individual card was empty.
- **Configurable Line Leading Controls in Panel UI**:
  - Added **লাইন লিডিং (Details Leading)** control with 1-click presets: `Auto` (default), `9.6`, `8.75`, `10` plus custom input.
  - Added **নামের লিডিং (Name Leading)** control with presets: `Auto` (default), `9.6`, `8.75`.
  - Available in both **🔑 Keyring** and **📔 Diary** tabs.
  - Saves preferences across sessions via `localStorage`.
- **Standalone JSX Script Update (`Card_Data_AutoFiller.jsx`)**:
  - Fully synced dynamic template leading logic and safe `ch.characterAttributes.textFont` access to eliminate MRAP error 1200.

---

## [2.4.3 Pro] - 2026-09-05

### Fixed & Enhanced
- **Strict Back-Side Template Rejection (পিছনের অংশ ডিটেক্ট না করা)**:
  - Added robust detection and automatic exclusion of back-side templates (পেছনের অংশ) containing event/memorabilia titles:
    - `দাওরায়ে হাদীস (মাস্টার্স) সমাপনী স্মৃতি`, `দাওরায়ে হাদীস`, `মাস্টার্স সমাপনী`, `সমাপনী স্মৃতি`
    - `হিফজ সমাপনী`, `হিফয সমাপনী`, `হিফজুল কুরআন সমাপনী`, `হিফযুল কুরআন সমাপনী`, `হিফজ সমাপ্তি`
    - `বিদায়ী স্মৃতি`, `স্মৃতি স্মারক`, `দস্তারবন্দী সম্মেলন`
  - Back-side groups without student biodata are 100% excluded and never detected or overwritten as student cards.
  - Institutional headers and madrasa names are never misassigned as student name frames.

- **Strict Hidden Layers & Hidden Items Exclusion (কোন হিডেন লেয়ার বা আইটেম ডিটেক্ট না করা)**:
  - Traverses all layers and sublayers, strictly skipping any layer or sublayer where `visible === false`.
  - Thoroughly inspects all parent hierarchies, strictly skipping any item or group where `hidden === true` or whose parent is hidden.

---

## [2.4.2 Pro] - 2026-09-05

### Fixed
- **Precise Card Bounds & Zero-Gap Grid Alignment**:
  - **Accurate Clipping Path Detection**: Fixed issue where card height was miscalculated by measuring hidden unmasked artwork or overflow paths instead of the actual card boundary, which caused a large artificial gap between rows.
  - **Direct Translation Vectoring**: Cards are placed using precise relative translation vectors based on the visual card boundary, guaranteeing that **0 pt Gap** creates seamless flush alignment with zero extra spacing.
  - **Explicit Card Width & Height Inputs**: Added  and  inputs with a  button in the Duplicator panel for full visibility and control.
  - **Gap Quick Presets**: Added 1-click gap presets: , , , .

---

## [2.4.1 Pro] - 2026-09-05

### Added
- **Configurable Horizontal Scale (%) Controls**:
  - **Details Horizontal Scale (হরাইজন্টাল স্কেল %)**: Fully configurable before running automation with default set to **85%** (matching print template standards for father's name, address, phone).
  - 1-click presets (, , ) plus custom number input.
  - **Name Horizontal Scale (নামের স্কেল %)**: Configurable horizontal scale for the name line (default 100%, with presets 100%, 85%, 75%).
  - Integrated into both **🔑 Keyring** and **📔 Diary** tabs, and standalone JSX script ().

---

## [2.4.0 Pro] - 2026-09-05

### Added
- **📋 Automated Template Duplicator & Artboard Imposition**:
  - **Dynamic Card Duplication**: Select a single card template on canvas, specify the total required copies (e.g., 50 pcs), and the tool duplicates and neatly imposes them in grid formation.
  - **Customizable Artboard Capacity**: Set how many cards fit per artboard (e.g., 20 or 25 cards per artboard), with 1-click presets (10, 20, 25, 30 / AB).
  - **Auto-Artboard Generation**: Automatically calculates and creates new artboards side-by-side without overlap (e.g., 50 copies with 20/artboard -> 3 artboards: 20 + 20 + 10).
  - **Centering & Alignment**: Centers duplicated cards neatly on each artboard with configurable column/row gaps.
  - **Artboard-Aware Auto Fill Pagination**: Keyring and Diary Auto-Filler now process cards sequentially sheet-by-sheet (Artboard 1 -> Artboard 2 -> Artboard 3) for clean, ordered filling.
  - **Integrated in both CEP Extension & Standalone JSX Script** ().

---

## [2.3.1 Pro] - 2026-09-04

### Added
- **Dual Working Modes (Keyring vs Diary)**:
  - **🔑 Keyring Filler**: Strips serial numbers (`১, ২, ১০`) from name headers, auto-populates names, bio details, Bani quotes, and piece counts (Pcs).
  - **📔 Diary Filler**: Formats and preserves custom serial numbers on names (e.g. `১. নাম`, `(১) নাম`, `১ - নাম`), with custom renumbering starting from 1.
- **Custom Name Color Picker**:
  - Full native color picker + Hex text input (`#A22F10` default matching print card standards).
  - **🎨 Pick from Canvas**: 1-click eyedropper to grab fill color directly from selected canvas text frame or shape.
  - 6 Quick Color Presets: `#A22F10` (Red-Brown), `#1E1E1E` (Black), `#007ACC` (Blue), `#28A745` (Green), `#DC3545` (Red), `#FFC107` (Gold).
- **Recursive Multi-Card Group Extraction**:
  - Automatically identifies and extracts individual cards even if all cards in a column or sheet are grouped into a single parent group (`Cmd+G`).
- **No-Fill (NoColor) Template Workflow**:
  - Seamlessly handles blank template cards prepared in `NoColor` (transparent/invisible). Filled cards automatically turn visible in `#A22F10` and solid black, while unfilled cards remain `NoColor` for clear visual distinction.
- **Fail-Safe ExtendScript Architecture**:
  - Dynamic JSX script loader on panel initialization to prevent stale cached code.
  - Robust typography styling fallback ensuring text never becomes invisible.

---

## [2.2.0 Pro] - 2026-09-04

### Added
- **Keyring & Multi-Field Card Auto-Fill**:
  - Auto-replacement of Demo Quantity numbers (e.g. `10` -> `15`, `25`, `10 পিস`) on template cards.
  - Automatic extraction and placement of **বাণী (Bani / Quote)** into dedicated quote frames.
  - Standalone serial number line detection (`১০`, `১১`, `১২...`) in addition to prefixed serials (`১০.`, `10.`, `(১)`).
  - Configurable Digit Format: Auto-match demo number format, English digits (`10, 15, 25`), or Bangla digits (`১০, ১৫, ২৫`).
  - Smart skipping of empty/number-only entries (e.g. serials with only pcs like `৭`, `২৫ পিস`) to prevent blank cards.
  - Default **Column-wise Auto-Fill** ordering matching vertical multi-column print sheets.

---

## [2.0.0 Pro] - 2026-09-02

### Added
- **Canvas Move & Align Tab**: 1-click move and alignment of floating canvas text blocks into card templates.
- **Interactive Offset Sliders**: Real-time fine-tuning for Horizontal Offset X (inner padding) and Vertical Offset Y (top alignment).
- **Badge Renumbering Tab**: Auto-renumber card badge numbers (Bangla 2-digit `০১, ০২...`, Bangla 1-digit `১, ২...`, English 2-digit `01, 02...`, English 1-digit `1, 2...`) with prefix and suffix options.
- **Multi-Artboard Scope**: Support for populating cards across active selection, current artboard, or all artboards in document.
- **Permanent Author Footer**: Direct link to GitHub profile (`https://github.com/yahiabinzaman`).
- **One-Click Automated Installers**: Native shell script (`.command`) for macOS and batch script (`.bat`) for Windows.

### Optimized
- Native Adobe dark theme styling (#1e1e1e / #262626) with glowing cyan/blue accents.
- Fast batch execution inside Illustrator using single atomic undo block.
- Error-tolerant parser supporting both Unicode (Avro/Kalpurush) and ANSI (Bijoy 52/SutonnyMJ).

---

## [1.0.0] - 2026-09-02
- Initial release with CEP Extension and Standalone JSX script.
- Smart Bengali & English serial parser (`১.`, `1.`).
- Auto-bold name headers and details population.
