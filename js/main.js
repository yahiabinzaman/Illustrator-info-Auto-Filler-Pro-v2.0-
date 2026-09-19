/**
 * Illustrator Name & Bio Card Auto-Filler Engine
 * Author: Yahia Bin Zaman (https://github.com/yahiabinzaman)
 * Version: 2.8.0 Pro - Dual Mode: Keyring Filler & Diary Filler
 */

(function() {
    'use strict';

    var csInterface = new CSInterface();
    var bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

    // ==========================================
    // Core Utilities & Host Communication
    // ==========================================
    function evalHostScript(code, callback) {
        var extPath = '';
        try {
            extPath = csInterface.getSystemPath(SystemPath.EXTENSION).replace(/\\/g, '/');
        } catch(e) {}
        
        var fullCode = '';
        if (extPath) {
            fullCode = 'if (typeof CardAutoFiller === "undefined") { try { var _f = new File("' + extPath + '/jsx/hostscript.jsx"); _f.encoding = "UTF-8"; _f.open("r"); var _c = _f.read(); _f.close(); eval(_c); } catch(e) {}; }; ' + code;
        } else {
            fullCode = code;
        }
        
        csInterface.evalScript(fullCode, callback);
    }

    function intToBengali(num, pad2) {
        var str = String(num);
        if (pad2 && num < 10) str = "0" + str;
        var res = "";
        for (var i = 0; i < str.length; i++) {
            var c = str.charAt(i);
            if (c >= '0' && c <= '9') res += bnDigits[parseInt(c, 10)];
            else res += c;
        }
        return res;
    }

    function bengaliToInt(str) {
        if (!str) return -1;
        var bnNums = { '০': 0, '১': 1, '২': 2, '৩': 3, '৪': 4, '৫': 5, '৬': 6, '৭': 7, '৮': 8, '৯': 9 };
        var clean = String(str).replace(/[^০-৯0-9]/g, '');
        if (!clean) return -1;
        var res = 0;
        for (var i = 0; i < clean.length; i++) {
            var ch = clean.charAt(i);
            if (bnNums[ch] !== undefined) res = res * 10 + bnNums[ch];
            else if (ch >= '0' && ch <= '9') res = res * 10 + parseInt(ch, 10);
        }
        return res > 0 ? res : -1;
    }

    function debounce(func, wait) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                func.apply(context, args);
            }, wait);
        };
    }

    function showToast(message, type) {
        var toast = document.getElementById('panelToast');
        if (!toast) return;
        toast.textContent = message;
        toast.className = 'panel-toast show ' + (type || 'info');
        setTimeout(function() {
            toast.className = 'panel-toast';
        }, 3000);
    }

    function normalizeHex(hex) {
        if (!hex) return "#006F9A";
        var clean = hex.replace(/[^0-9A-Fa-f]/g, '');
        if (clean.length === 3) {
            clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
        }
        if (clean.length === 6) {
            return '#' + clean.toUpperCase();
        }
        return "#006F9A";
    }

    function hexToRgb(hex) {
        var clean = hex.replace(/[^0-9A-Fa-f]/g, '');
        if (clean.length === 3) {
            clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
        }
        if (clean.length !== 6) return { r: 0, g: 111, b: 154 };
        return {
            r: parseInt(clean.substring(0, 2), 16),
            g: parseInt(clean.substring(2, 4), 16),
            b: parseInt(clean.substring(4, 6), 16)
        };
    }

    function rgbToCmyk(r, g, b) {
        var dr = r / 255;
        var dg = g / 255;
        var db = b / 255;
        var k = 1 - Math.max(dr, dg, db);
        if (k >= 1) return [0, 0, 0, 100];
        var c = (1 - dr - k) / (1 - k);
        var m = (1 - dg - k) / (1 - k);
        var y = (1 - db - k) / (1 - k);
        return [
            Math.round(c * 100),
            Math.round(m * 100),
            Math.round(y * 100),
            Math.round(k * 100)
        ];
    }

    function cmykToRgb(c, m, y, k) {
        var dc = c / 100, dm = m / 100, dy = y / 100, dk = k / 100;
        var r = 255 * (1 - dc) * (1 - dk);
        var g = 255 * (1 - dm) * (1 - dk);
        var b = 255 * (1 - dy) * (1 - dk);
        return {
            r: Math.max(0, Math.min(255, Math.round(r))),
            g: Math.max(0, Math.min(255, Math.round(g))),
            b: Math.max(0, Math.min(255, Math.round(b)))
        };
    }

    function rgbToHex(r, g, b) {
        var hexR = r.toString(16).padStart(2, '0');
        var hexG = g.toString(16).padStart(2, '0');
        var hexB = b.toString(16).padStart(2, '0');
        return ('#' + hexR + hexG + hexB).toUpperCase();
    }

    // ==========================================
    // Sample Data
    // ==========================================
    var sampleBanglaData = "১\nমাওলানা মোঃ সাদিকুল ইসলাম\nপিতা: মোঃ ছানোয়ার হোসেন\nহাসনই, মধুপুর, টাঙ্গাইল\n০১৮২৬-৫৯০৬৫৮, ০১৮২৬-৫৯০৫২৭\nপরিমাণ: ২৫ পিস\n\n২\nহাফেজ মাওলানা মোঃ ওমর ফারুক\nপিতা: মোঃ শামছুল হক\nবেতবাড়ী, ফুলবাড়িয়া, ময়মনসিংহ\n০১৯০২-০৬৬৩১২, ০১৮৯০-৯০২১৬১\nপরিমাণ: ৬০ পিস\n\n৩\nহাফেজ মাওলানা মোঃ আবু বকর সিদ্দিক\nপিতা: মোঃ জবেদ আলী\nরঘুনাথপুর, মুক্তাগাছা, ময়মনসিংহ\n০১৬০৬-৩৭৮২৬৫, ০১৯৪২-৬৬০৬০৩\nপরিমাণ: ৪০ পিস";

    // ==========================================
    // State Management
    // ==========================================
    var parsedKeyringEntries = [];
    var currentKeyringStartIndex = 0;
    var currentKeyringColor = "#006F9A";
    var currentKeyringCmyk = [100, 0, 0, 45];

    var parsedDiaryEntries = [];
    var currentDiaryStartIndex = 0;
    var currentDiaryColor = "#1E5AA8";
    var currentDiaryCmyk = [100, 0, 0, 45];

    // ==========================================
    // Regex Patterns for Parsing
    // ==========================================
    var serialLineRegex = /^(?:[০-৯0-9]{1,4}|[০-৯0-9]{1,4}[\.\-\)\:]|[০-৯0-9]{1,4}\s*[\.\-\)\:])$/;
    var serialPrefixRegex = /^(?:[০-৯0-9]{1,4}[\.\-\)\:]\s*|[০-৯0-9]{1,4}\s+)/;
    var qtyRegex = /(?:পরিমাণ|পরিমান|সংখ্যা|পিস|Pcs|Qty|Quantity|Order)\s*[:\-\s]?\s*([০-৯0-9]+)/i;
    var baniRegex = /^(?:বাণী|বানী|Bani|বাণী\s*[:\-])\s*(.*)/i;
    var formRegex = /^(?:ফরম|ফরম\s*নম্বর|ফরম\s*নং|দাখেলা|রোল|Form|Roll|No\.?|‡¶´|‡dvi|diBk|‡ivj)\s*[:\-\s]?\s*(.+)/i;

    function parseRawBlocks(rawText) {
        if (!rawText) return [];
        var lines = rawText.split(/\r\n|\r|\n/);
        var blocks = [];
        var curLines = [];

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line) {
                if (curLines.length > 0) {
                    blocks.push(curLines);
                    curLines = [];
                }
            } else {
                var isSerial = serialLineRegex.test(line) && line.replace(/\D/g, '').length < 6;
                if (curLines.length >= 2 && isSerial) {
                    blocks.push(curLines);
                    curLines = [line];
                } else {
                    curLines.push(line);
                }
            }
        }
        if (curLines.length > 0) blocks.push(curLines);

        var result = [];
        for (var b = 0; b < blocks.length; b++) {
            var blk = blocks[b];
            var item = {
                serial: "",
                cleanName: "",
                rawName: "",
                details: "",
                formNumber: "",
                qty: "",
                bani: "",
                rawText: blk.join('\n')
            };

            var nonMeta = [];
            var baniLines = [];
            var inBani = false;

            for (var l = 0; l < blk.length; l++) {
                var lText = blk[l].trim();
                if (!lText) continue;

                if (inBani) {
                    baniLines.push(lText);
                    continue;
                }
                if (baniRegex.test(lText)) {
                    inBani = true;
                    baniLines.push(lText);
                    continue;
                }
                var qm = lText.match(qtyRegex);
                if (qm) {
                    item.qty = qm[1];
                    continue;
                }
                if (formRegex.test(lText)) {
                    item.formNumber = lText;
                    continue;
                }

                var slm = lText.match(serialLineRegex);
                if (slm && l === 0 && !item.serial) {
                    item.serial = lText.replace(/[\.\-\)\:\s]/g, '');
                    continue;
                }

                nonMeta.push(lText);
            }

            if (baniLines.length > 0) {
                item.bani = baniLines.join('\n');
            }

            if (nonMeta.length > 0) {
                var firstLine = nonMeta[0];
                item.rawName = firstLine;
                item.cleanName = firstLine.replace(serialPrefixRegex, '').trim();

                if (!item.serial) {
                    var mPref = firstLine.match(serialPrefixRegex);
                    if (mPref) item.serial = mPref[0].replace(/[\.\-\)\:\s]/g, '');
                }

                if (nonMeta.length > 1) {
                    item.details = nonMeta.slice(1).join('\n');
                }
            }

            if (item.cleanName || item.rawName) {
                result.push(item);
            }
        }

        return result;
    }

    // ==========================================
    // Keyring Functions
    // ==========================================
    function parseKeyringInput() {
        var rawTextInput = document.getElementById('rawTextInputKeyring');
        var chkStripNumber = document.getElementById('chkStripNumberKeyring');
        var raw = (rawTextInput ? rawTextInput.value : "").trim();
        parsedKeyringEntries = [];
        if (!raw) {
            renderKeyringPreview();
            return;
        }

        var stripNum = chkStripNumber ? chkStripNumber.checked : true;
        var blocks = parseRawBlocks(raw);

        for (var i = 0; i < blocks.length; i++) {
            var blk = blocks[i];
            var nameToUse = stripNum ? blk.cleanName : blk.rawName;
            if (!nameToUse) continue;

            parsedKeyringEntries.push({
                serial: blk.serial,
                name: nameToUse,
                details: blk.details,
                formNumber: blk.formNumber,
                qty: blk.qty,
                bani: blk.bani,
                rawText: blk.rawText
            });
        }

        renderKeyringPreview();
    }

    function renderKeyringPreview() {
        var previewList = document.getElementById('previewListKeyring');
        var entriesCountBadge = document.getElementById('entriesCountBadgeKeyring');
        if (!previewList) return;
        previewList.innerHTML = '';

        if (entriesCountBadge) {
            var rem = Math.max(0, parsedKeyringEntries.length - currentKeyringStartIndex);
            if (currentKeyringStartIndex > 0) {
                entriesCountBadge.textContent = 'Remaining: ' + rem + ' / ' + parsedKeyringEntries.length + ' Entries';
            } else {
                entriesCountBadge.textContent = parsedKeyringEntries.length + ' Entries';
            }
        }

        if (!parsedKeyringEntries.length) {
            previewList.innerHTML = '<div class="empty-text">No entries parsed. Paste list above or click "Sample".</div>';
            return;
        }

        var fragment = document.createDocumentFragment();
        parsedKeyringEntries.forEach(function(entry, idx) {
            var itemEl = document.createElement('div');
            itemEl.className = 'preview-item';
            if (idx < currentKeyringStartIndex) {
                itemEl.classList.add('filled');
            }

            var topRow = document.createElement('div');
            topRow.className = 'preview-header-row';

            var nameEl = document.createElement('div');
            nameEl.className = 'preview-name';
            nameEl.textContent = entry.name || '(Empty Name)';

            var badgeEl = document.createElement('div');
            badgeEl.className = 'preview-badge';
            if (idx < currentKeyringStartIndex) {
                badgeEl.textContent = 'Filled #' + (idx + 1);
                badgeEl.classList.add('badge-filled');
            } else {
                badgeEl.textContent = 'Next ' + (entry.qty ? (entry.qty + ' পিস') : '') + ' #' + (idx + 1);
                badgeEl.classList.add('badge-next');
            }

            topRow.appendChild(nameEl);
            topRow.appendChild(badgeEl);
            itemEl.appendChild(topRow);

            if (entry.details) {
                var detEl = document.createElement('div');
                detEl.className = 'preview-details';
                detEl.textContent = entry.details.replace(/\r|\n/g, ' • ');
                itemEl.appendChild(detEl);
            }

            fragment.appendChild(itemEl);
        });

        previewList.appendChild(fragment);
    }

    function executeAutoFillKeyring() {
        var btnAutoFill = document.getElementById('btnAutoFillKeyring');
        var rawTextInput = document.getElementById('rawTextInputKeyring');
        var chkStripNumber = document.getElementById('chkStripNumberKeyring');
        var chkMakeBold = document.getElementById('chkMakeBoldKeyring');
        var chkFillQty = document.getElementById('chkFillQtyKeyring');
        var chkFillBani = document.getElementById('chkFillBaniKeyring');
        var chkSkipFilled = document.getElementById('chkSkipFilledKeyring');
        var chkAutoRemove = document.getElementById('chkAutoRemoveFilledKeyring');
        var selectFillOrder = document.getElementById('selectFillOrderKeyring');
        var selectScope = document.getElementById('selectScopeKeyring');
        var inputStartIndex = document.getElementById('inputStartIndexKeyring');

        try {
            if (!parsedKeyringEntries.length && rawTextInputKeyring && rawTextInputKeyring.value.trim()) {
                parseKeyringInput();
            }

            if (!parsedKeyringEntries.length) {
                showToast('Please enter data list first (ডেটা লিস্ট দিন)', 'error');
                return;
            }

            var skipFilled = chkSkipFilled ? chkSkipFilled.checked : false;
            var autoRemove = chkAutoRemove ? chkAutoRemove.checked : true;

            var inputDetHScale = document.getElementById('inputDetailsHScaleKeyring');
            var inputNmHScale = document.getElementById('inputNameHScaleKeyring');
            var detHScale = inputDetHScale ? (parseFloat(inputDetHScale.value) || 85) : 85;
            var nmHScale = inputNmHScale ? (parseFloat(inputNmHScale.value) || 100) : 100;

            var inputDetLead = document.getElementById('inputDetailsLeadingKeyring');
            var inputNmLead = document.getElementById('inputNameLeadingKeyring');
            var detLead = inputDetLead ? inputDetLead.value.trim() : "9.6";
            var nmLead = inputNmLead ? inputNmLead.value.trim() : "Auto";

            var payload = {
                isKeyring: true,
                fillSerial: false,
                entries: parsedKeyringEntries,
                order: selectFillOrder ? selectFillOrder.value : "row",
                scope: selectScope ? selectScope.value : "artboard",
                makeBold: chkMakeBold ? chkMakeBold.checked : true,
                stripNumber: chkStripNumber ? chkStripNumber.checked : true,
                fillBani: chkFillBani ? chkFillBani.checked : true,
                fillQty: chkFillQty ? chkFillQty.checked : true,
                qtyFormat: "auto",
                nameColor: currentKeyringColor,
                nameCmyk: currentKeyringCmyk,
                startIndex: currentKeyringStartIndex,
                skipFilledCards: skipFilled,
                detailsHScale: detHScale,
                nameHScale: nmHScale,
                detailsLeading: detLead,
                nameLeading: nmLead
            };

            if (btnAutoFill) {
                btnAutoFill.disabled = true;
                btnAutoFill.textContent = 'Populating Keyring Cards...';
            }

            var payloadStr = encodeURIComponent(JSON.stringify(payload));
            var scriptCall = 'populateCards(decodeURIComponent("' + payloadStr + '"))';

            evalHostScript(scriptCall, function(resStr) {
                if (btnAutoFill) {
                    btnAutoFill.disabled = false;
                    btnAutoFill.textContent = 'Auto Fill Keyring Cards';
                }

                try {
                    var res = JSON.parse(resStr);
                    if (res.status === 'success') {
                        if (autoRemove) {
                            var placedCount = res.filledCount || 0;
                            var remaining = parsedKeyringEntries.slice(currentKeyringStartIndex + placedCount);
                            var newText = remaining.map(function(e) { return e.rawText || e.name; }).join('\n\n');
                            if (rawTextInput) rawTextInput.value = newText;
                            var rawTextInputDiary = document.getElementById('rawTextInputDiary');
                            if (rawTextInputDiary) rawTextInputDiary.value = newText;
                            currentKeyringStartIndex = 0;
                            if (inputStartIndex) inputStartIndex.value = 1;
                            parseKeyringInput();
                            showToast('Populated ' + placedCount + ' card(s)! Remaining: ' + remaining.length, 'success');
                        } else {
                            currentKeyringStartIndex = res.nextStartIndex || 0;
                            if (inputStartIndex) inputStartIndex.value = currentKeyringStartIndex + 1;
                            renderKeyringPreview();
                            showToast(res.message || 'Cards populated successfully!', 'success');
                        }
                    } else {
                        showToast(res.message || 'Failed to populate cards', 'error');
                    }
                } catch (e) {
                    showToast('Cards populated successfully!', 'success');
                }
            });
        } catch(err) {
            if (btnAutoFill) {
                btnAutoFill.disabled = false;
                btnAutoFill.textContent = 'Auto Fill Keyring Cards';
            }
            showToast('Error: ' + err.message, 'error');
        }
    }

    // ==========================================
    // Diary Functions
    // ==========================================
    function parseDiaryInput() {
        var rawTextInput = document.getElementById('rawTextInputDiary');
        var chkIncludeDetails = document.getElementById('chkIncludeDetailsDiary');
        var selectSerialFormat = document.getElementById('selectSerialFormatDiary');
        var raw = (rawTextInput ? rawTextInput.value : "").trim();
        parsedDiaryEntries = [];
        if (!raw) {
            renderDiaryPreview();
            return;
        }

        var includeDetails = chkIncludeDetails ? chkIncludeDetails.checked : true;
        var serialFormat = selectSerialFormat ? selectSerialFormat.value : "standalone";
        var blocks = parseRawBlocks(raw);

        for (var i = 0; i < blocks.length; i++) {
            var blk = blocks[i];
            if (!blk.cleanName && !blk.rawName) continue;

            var nameToUse = blk.cleanName;
            var num = i + 1;
            if (blk.serial) {
                var pNum = bengaliToInt(blk.serial);
                if (pNum > 0) num = pNum;
            }
            var bnNum = intToBengali(num, false);
            var enNum = String(num);

            if (serialFormat === "bn_dot") {
                nameToUse = bnNum + ". " + blk.cleanName;
            } else if (serialFormat === "en_dot") {
                nameToUse = enNum + ". " + blk.cleanName;
            } else if (serialFormat === "none") {
                nameToUse = blk.cleanName;
            }

            parsedDiaryEntries.push({
                serial: blk.serial || bnNum,
                name: nameToUse,
                details: includeDetails ? blk.details : "",
                formNumber: blk.formNumber,
                rawText: blk.rawText
            });
        }

        renderDiaryPreview();
    }

    function renderDiaryPreview() {
        var previewList = document.getElementById('previewListDiary');
        var entriesCountBadge = document.getElementById('entriesCountBadgeDiary');
        if (!previewList) return;
        previewList.innerHTML = '';

        if (entriesCountBadge) {
            var rem = Math.max(0, parsedDiaryEntries.length - currentDiaryStartIndex);
            if (currentDiaryStartIndex > 0) {
                entriesCountBadge.textContent = 'Remaining: ' + rem + ' / ' + parsedDiaryEntries.length + ' Entries';
            } else {
                entriesCountBadge.textContent = parsedDiaryEntries.length + ' Entries';
            }
        }

        if (!parsedDiaryEntries.length) {
            previewList.innerHTML = '<div class="empty-text">No entries parsed. Paste list above or click "Sample".</div>';
            return;
        }

        var fragment = document.createDocumentFragment();
        parsedDiaryEntries.forEach(function(entry, idx) {
            var itemEl = document.createElement('div');
            itemEl.className = 'preview-item';
            if (idx < currentDiaryStartIndex) {
                itemEl.classList.add('filled');
            }

            var topRow = document.createElement('div');
            topRow.className = 'preview-header-row';

            var nameEl = document.createElement('div');
            nameEl.className = 'preview-name';
            nameEl.textContent = entry.name || '(Empty Name)';

            var badgeEl = document.createElement('div');
            badgeEl.className = 'preview-badge';
            if (idx < currentDiaryStartIndex) {
                badgeEl.textContent = 'Filled #' + (idx + 1);
                badgeEl.classList.add('badge-filled');
            } else {
                badgeEl.textContent = 'Next #' + (idx + 1);
                badgeEl.classList.add('badge-next');
            }

            topRow.appendChild(nameEl);
            topRow.appendChild(badgeEl);
            itemEl.appendChild(topRow);

            if (entry.details) {
                var detEl = document.createElement('div');
                detEl.className = 'preview-details';
                detEl.textContent = entry.details.replace(/\r|\n/g, ' • ');
                itemEl.appendChild(detEl);
            }

            fragment.appendChild(itemEl);
        });

        previewList.appendChild(fragment);
    }

    function executeAutoFillDiary() {
        var btnAutoFill = document.getElementById('btnAutoFillDiary');
        var rawTextInput = document.getElementById('rawTextInputDiary');
        var selectSerialFormat = document.getElementById('selectSerialFormatDiary');
        var selectScope = document.getElementById('selectScopeDiary');
        var selectFillOrder = document.getElementById('selectFillOrderDiary');
        var chkMakeBold = document.getElementById('chkMakeBoldDiary');
        var chkIncludeDetails = document.getElementById('chkIncludeDetailsDiary');
        var chkFillFormNumber = document.getElementById('chkFillFormNumberDiary');
        var chkSkipFilled = document.getElementById('chkSkipFilledDiary');
        var chkAutoRemove = document.getElementById('chkAutoRemoveFilledDiary');
        var inputStartIndex = document.getElementById('inputStartIndexDiary');

        try {
            if (!parsedDiaryEntries.length && rawTextInput && rawTextInput.value.trim()) {
                parseDiaryInput();
            }

            if (!parsedDiaryEntries.length) {
                showToast('Please enter biodata list first (বায়োডাটা লিস্ট দিন)', 'error');
                return;
            }

            var skipFilled = chkSkipFilled ? chkSkipFilled.checked : false;
            var autoRemove = chkAutoRemove ? chkAutoRemove.checked : true;

            var payload = {
                isKeyring: false,
                fillSerial: true,
                entries: parsedDiaryEntries,
                order: selectFillOrder ? selectFillOrder.value : "zigzag",
                scope: selectScope ? selectScope.value : "artboard",
                serialFormat: selectSerialFormat ? selectSerialFormat.value : "bn_2digit",
                makeBold: chkMakeBold ? chkMakeBold.checked : true,
                includeDetails: chkIncludeDetails ? chkIncludeDetails.checked : true,
                fillFormNumber: chkFillFormNumber ? chkFillFormNumber.checked : true,
                nameColor: currentDiaryColor,
                nameCmyk: currentDiaryCmyk,
                startIndex: currentDiaryStartIndex,
                skipFilledCards: skipFilled
            };

            if (btnAutoFill) {
                btnAutoFill.disabled = true;
                btnAutoFill.textContent = 'Populating Diary Names...';
            }

            var payloadStr = encodeURIComponent(JSON.stringify(payload));
            var scriptCall = 'populateCards(decodeURIComponent("' + payloadStr + '"))';

            evalHostScript(scriptCall, function(resStr) {
                if (btnAutoFill) {
                    btnAutoFill.disabled = false;
                    btnAutoFill.textContent = 'Auto Fill Diary Names';
                }

                try {
                    var res = JSON.parse(resStr);
                    if (res.status === 'success') {
                        if (autoRemove) {
                            var placedCount = res.filledCount || 0;
                            var remaining = parsedDiaryEntries.slice(currentDiaryStartIndex + placedCount);
                            var newText = remaining.map(function(e) { return e.rawText || e.name; }).join('\n\n');
                            if (rawTextInput) rawTextInput.value = newText;
                            var rawTextInputKeyring = document.getElementById('rawTextInputKeyring');
                            if (rawTextInputKeyring) rawTextInputKeyring.value = newText;
                            currentDiaryStartIndex = 0;
                            if (inputStartIndex) inputStartIndex.value = 1;
                            parseDiaryInput();
                            showToast('Populated ' + placedCount + ' diary card(s)! Remaining: ' + remaining.length, 'success');
                        } else {
                            currentDiaryStartIndex = res.nextStartIndex || 0;
                            if (inputStartIndex) inputStartIndex.value = currentDiaryStartIndex + 1;
                            renderDiaryPreview();
                            showToast(res.message || 'Diary names populated!', 'success');
                        }
                    } else {
                        showToast(res.message || 'Failed to populate diary names', 'error');
                    }
                } catch (e) {
                    showToast('Populated diary names!', 'info');
                }
            });
        } catch(err) {
            if (btnAutoFill) {
                btnAutoFill.disabled = false;
                btnAutoFill.textContent = 'Auto Fill Diary Names';
            }
            showToast('Error: ' + err.message, 'error');
        }
    }

    // ==========================================
    // Duplicator & Grid Calculator
    // ==========================================
    function updateDuplicatorSummary() {
        var inputTotalCopies = document.getElementById('inputTotalCopies');
        var inputCardsPerAB = document.getElementById('inputCardsPerAB');
        var inputCardW = document.getElementById('inputCardW');
        var inputCardH = document.getElementById('inputCardH');
        var inputGridCols = document.getElementById('inputGridCols');
        var inputGapX = document.getElementById('inputGapX');
        var inputGapY = document.getElementById('inputGapY');
        var summaryBox = document.getElementById('duplicateCalcSummary');

        if (!summaryBox) return;

        var total = parseInt(inputTotalCopies ? inputTotalCopies.value : 50, 10) || 50;
        var perAB = parseInt(inputCardsPerAB ? inputCardsPerAB.value : 20, 10) || 20;
        var cW = parseFloat(inputCardW ? inputCardW.value : 192) || 192;
        var cH = parseFloat(inputCardH ? inputCardH.value : 98) || 98;
        var cols = parseInt(inputGridCols ? inputGridCols.value : 2, 10) || 2;
        var gX = parseFloat(inputGapX ? inputGapX.value : 0) || 0;
        var gY = parseFloat(inputGapY ? inputGapY.value : 0) || 0;

        var numAB = Math.ceil(total / perAB);
        var rows = Math.ceil(perAB / cols);
        var estABW = cols * cW + (cols - 1) * gX + 30;
        var estABH = rows * cH + (rows - 1) * gY + 30;

        var text = 'হিসাব: <strong>' + total + 'টি কার্ড</strong> তৈরি করতে মোট <strong>' + numAB + 'টি আর্টবোর্ড</strong> লাগবে।';
        text += '<br><strong>কার্ড সাইজ:</strong> ' + cW + ' × ' + cH + ' pt | <strong>আর্টবোর্ড:</strong> ' + Math.round(estABW) + ' × ' + Math.round(estABH) + ' pt (' + cols + ' কলাম × ' + rows + ' সারি)';
        summaryBox.innerHTML = text;
    }

    function executeDuplicateTemplates() {
        var btnRun = document.getElementById('btnRunDuplicate');
        var inputTotalCopies = document.getElementById('inputTotalCopies');
        var inputCardsPerAB = document.getElementById('inputCardsPerAB');
        var inputCardW = document.getElementById('inputCardW');
        var inputCardH = document.getElementById('inputCardH');
        var inputGridCols = document.getElementById('inputGridCols');
        var inputGapX = document.getElementById('inputGapX');
        var inputGapY = document.getElementById('inputGapY');
        var chkFitArtboard = document.getElementById('chkFitArtboard');

        var payload = {
            totalCopies: parseInt(inputTotalCopies ? inputTotalCopies.value : 50, 10) || 50,
            cardsPerArtboard: parseInt(inputCardsPerAB ? inputCardsPerAB.value : 20, 10) || 20,
            cardWidth: parseFloat(inputCardW ? inputCardW.value : 192) || 192,
            cardHeight: parseFloat(inputCardH ? inputCardH.value : 98) || 98,
            columns: parseInt(inputGridCols ? inputGridCols.value : 2, 10) || 2,
            gapX: parseFloat(inputGapX ? inputGapX.value : 0) || 0,
            gapY: parseFloat(inputGapY ? inputGapY.value : 0) || 0,
            fitArtboard: chkFitArtboard ? chkFitArtboard.checked : true
        };

        if (btnRun) {
            btnRun.disabled = true;
            btnRun.textContent = 'Generating Templates...';
        }

        var payloadStr = encodeURIComponent(JSON.stringify(payload));
        var scriptCall = 'duplicateCardTemplates(decodeURIComponent("' + payloadStr + '"))';
        evalHostScript(scriptCall, function(resStr) {
            if (btnRun) {
                btnRun.disabled = false;
                btnRun.textContent = 'Duplicate Templates & Create Artboards';
            }
            try {
                var res = JSON.parse(resStr);
                if (res.status === 'success') showToast(res.message, 'success');
                else showToast(res.message || 'Failed to generate templates', 'error');
            } catch(e) {
                showToast('Templates generated successfully!', 'success');
            }
        });
    }

    // ==========================================
    // Canvas Move & Helper Actions
    // ==========================================
    function loadFromCanvasSelection(targetTextarea, callback) {
        evalHostScript('getSelectedCanvasText()', function(resStr) {
            try {
                var res = JSON.parse(resStr);
                if (res.status === 'success' && res.text) {
                    if (targetTextarea) targetTextarea.value = res.text;
                    if (callback) callback();
                    showToast('Loaded ' + res.count + ' text frame(s) from canvas', 'success');
                } else {
                    showToast(res.message || 'No text frames selected', 'error');
                }
            } catch (e) {
                showToast('Failed to parse selection', 'error');
            }
        });
    }

    function executePlaceCanvasText() {
        var btnPlace = document.getElementById('btnPlaceCanvasText');
        var selectCardSort = document.getElementById('selectCardSort');
        var selectTextSort = document.getElementById('selectTextSort');

        var payload = {
            cardOrder: selectCardSort ? selectCardSort.value : "column",
            textOrder: selectTextSort ? selectTextSort.value : "column",
            offsetX: 45,
            offsetY: -15,
            groupWithCard: true,
            bringToFront: true
        };

        if (btnPlace) {
            btnPlace.disabled = true;
            btnPlace.textContent = 'Moving Text into Cards...';
        }

        var payloadStr = encodeURIComponent(JSON.stringify(payload));
        var scriptCall = 'placeTextBlocksIntoCards(decodeURIComponent("' + payloadStr + '"))';
        evalHostScript(scriptCall, function(resStr) {
            if (btnPlace) {
                btnPlace.disabled = false;
                btnPlace.textContent = 'Move & Place Text into Cards';
            }
            try {
                var res = JSON.parse(resStr);
                if (res.status === 'success') showToast(res.message, 'success');
                else showToast(res.message || 'Failed to place text', 'error');
            } catch(e) {
                showToast('Text placed successfully!', 'info');
            }
        });
    }

    // ==========================================
    // Color Synchronizer
    // ==========================================
    var PRESET_PALETTE = {
        '#006F9A': [100, 0, 0, 45],  // Deep Teal (C:100, M:0, Y:0, K:45)
        '#000000': [0, 0, 0, 100],   // Solid Black (C:0, M:0, Y:0, K:100)
        '#1E5AA8': [100, 70, 0, 0],   // Royal Blue (C:100, M:70, Y:0, K:0)
        '#1B6E3F': [85, 20, 100, 10], // Islamic Green (C:85, M:20, Y:100, K:10)
        '#9C1A1A': [20, 100, 100, 15],// Crimson Maroon (C:20, M:100, Y:100, K:15)
        '#A22F10': [20, 90, 100, 15], // Red-Brown (C:20, M:90, Y:100, K:15)
        '#C88210': [15, 45, 100, 0]   // Gold / Mustard (C:15, M:45, Y:100, K:0)
    };

    function setupColorControls() {
        var colorPickerK = document.getElementById('colorPickerKeyring');
        var colorHexK = document.getElementById('colorHexKeyring');
        var btnPickK = document.getElementById('btnPickColorKeyring');
        var labelK = document.getElementById('labelColorNameKeyring');

        function updateK(hex, cmyk) {
            currentKeyringColor = normalizeHex(hex);
            if (cmyk && cmyk.length >= 4) {
                currentKeyringCmyk = [
                    Math.max(0, Math.min(100, Math.round(cmyk[0]))),
                    Math.max(0, Math.min(100, Math.round(cmyk[1]))),
                    Math.max(0, Math.min(100, Math.round(cmyk[2]))),
                    Math.max(0, Math.min(100, Math.round(cmyk[3])))
                ];
            } else {
                var rgb = hexToRgb(currentKeyringColor);
                currentKeyringCmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
            }

            if (colorPickerK) colorPickerK.value = currentKeyringColor;
            if (colorHexK) colorHexK.value = currentKeyringColor;
            if (labelK) labelK.textContent = currentKeyringColor;

            var inC = document.getElementById('inputColorC_Keyring');
            var inM = document.getElementById('inputColorM_Keyring');
            var inY = document.getElementById('inputColorY_Keyring');
            var inK = document.getElementById('inputColorK_Keyring');
            if (inC) inC.value = currentKeyringCmyk[0];
            if (inM) inM.value = currentKeyringCmyk[1];
            if (inY) inY.value = currentKeyringCmyk[2];
            if (inK) inK.value = currentKeyringCmyk[3];

            // Highlight active swatch
            var swatches = document.querySelectorAll('.color-swatch');
            swatches.forEach(function(sw) {
                var sHex = normalizeHex(sw.getAttribute('data-color') || sw.getAttribute('data-hex') || '');
                if (sHex === currentKeyringColor) sw.classList.add('active');
                else sw.classList.remove('active');
            });
        }

        if (colorPickerK) {
            colorPickerK.addEventListener('input', function() { updateK(this.value.toUpperCase()); });
            colorPickerK.addEventListener('change', function() { updateK(this.value.toUpperCase()); });
        }
        if (colorHexK) {
            colorHexK.addEventListener('input', function() { 
                var val = this.value.trim();
                if (val.length === 4 || val.length === 7) updateK(normalizeHex(val)); 
            });
            colorHexK.addEventListener('change', function() { updateK(normalizeHex(this.value)); });
        }
        if (btnPickK) {
            btnPickK.addEventListener('click', function() {
                evalHostScript('getSelectedCanvasColor()', function(resStr) {
                    try {
                        var res = JSON.parse(resStr);
                        if (res.status === 'success') {
                            if (res.cmyk && res.cmyk.length >= 4) {
                                var rgb = cmykToRgb(res.cmyk[0], res.cmyk[1], res.cmyk[2], res.cmyk[3]);
                                var hex = rgbToHex(rgb.r, rgb.g, rgb.b);
                                updateK(res.hex || hex, res.cmyk);
                            } else if (res.hex) {
                                updateK(normalizeHex(res.hex));
                            }
                            showToast('Sampled canvas color: ' + currentKeyringColor, 'success');
                        } else {
                            showToast(res.message || 'Please select an object on canvas', 'error');
                        }
                    } catch(e) {
                        showToast('Failed to get canvas color', 'error');
                    }
                });
            });
        }

        // CMYK inputs for Keyring
        ['inputColorC_Keyring', 'inputColorM_Keyring', 'inputColorY_Keyring', 'inputColorK_Keyring'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', function() {
                    var inC = document.getElementById('inputColorC_Keyring');
                    var inM = document.getElementById('inputColorM_Keyring');
                    var inY = document.getElementById('inputColorY_Keyring');
                    var inK = document.getElementById('inputColorK_Keyring');
                    var c = parseInt(inC ? inC.value : 0, 10) || 0;
                    var m = parseInt(inM ? inM.value : 0, 10) || 0;
                    var y = parseInt(inY ? inY.value : 0, 10) || 0;
                    var k = parseInt(inK ? inK.value : 0, 10) || 0;
                    currentKeyringCmyk = [c, m, y, k];
                    var rgb = cmykToRgb(c, m, y, k);
                    var hex = rgbToHex(rgb.r, rgb.g, rgb.b);
                    currentKeyringColor = hex;
                    if (colorPickerK) colorPickerK.value = hex;
                    if (colorHexK) colorHexK.value = hex;
                    if (labelK) labelK.textContent = hex;
                });
            }
        });

        // Color Swatches
        var swatches = document.querySelectorAll('.color-swatch');
        swatches.forEach(function(sw) {
            sw.addEventListener('click', function() {
                var tab = this.getAttribute('data-tab') || 'keyring';
                var hex = this.getAttribute('data-color') || this.getAttribute('data-hex') || '#006F9A';
                var cleanHex = normalizeHex(hex);
                var cmyk = PRESET_PALETTE[cleanHex.toUpperCase()] || null;
                if (tab === 'diary') {
                    updateD(cleanHex, cmyk);
                } else {
                    updateK(cleanHex, cmyk);
                }
                showToast('Color set to ' + cleanHex, 'info');
            });
        });

        // Diary Color Controls
        var colorPickerD = document.getElementById('colorPickerDiary');
        var colorHexD = document.getElementById('colorHexDiary');
        var btnPickD = document.getElementById('btnPickColorDiary');
        var labelD = document.getElementById('labelColorNameDiary');

        function updateD(hex, cmyk) {
            currentDiaryColor = normalizeHex(hex);
            if (cmyk && cmyk.length >= 4) {
                currentDiaryCmyk = [
                    Math.max(0, Math.min(100, Math.round(cmyk[0]))),
                    Math.max(0, Math.min(100, Math.round(cmyk[1]))),
                    Math.max(0, Math.min(100, Math.round(cmyk[2]))),
                    Math.max(0, Math.min(100, Math.round(cmyk[3])))
                ];
            } else {
                var rgb = hexToRgb(currentDiaryColor);
                currentDiaryCmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
            }

            if (colorPickerD) colorPickerD.value = currentDiaryColor;
            if (colorHexD) colorHexD.value = currentDiaryColor;
            if (labelD) labelD.textContent = currentDiaryColor;

            var swatchesD = document.querySelectorAll('.color-swatch[data-tab="diary"]');
            swatchesD.forEach(function(sw) {
                var sHex = normalizeHex(sw.getAttribute('data-color') || sw.getAttribute('data-hex') || '');
                if (sHex === currentDiaryColor) sw.classList.add('active');
                else sw.classList.remove('active');
            });
        }

        if (colorPickerD) {
            colorPickerD.addEventListener('input', function() { updateD(this.value.toUpperCase()); });
            colorPickerD.addEventListener('change', function() { updateD(this.value.toUpperCase()); });
        }
        if (colorHexD) {
            colorHexD.addEventListener('input', function() { 
                var val = this.value.trim();
                if (val.length === 4 || val.length === 7) updateD(normalizeHex(val)); 
            });
            colorHexD.addEventListener('change', function() { updateD(normalizeHex(this.value)); });
        }
        if (btnPickD) {
            btnPickD.addEventListener('click', function() {
                evalHostScript('getSelectedCanvasColor()', function(resStr) {
                    try {
                        var res = JSON.parse(resStr);
                        if (res.status === 'success') {
                            if (res.cmyk && res.cmyk.length >= 4) {
                                var rgb = cmykToRgb(res.cmyk[0], res.cmyk[1], res.cmyk[2], res.cmyk[3]);
                                var hex = rgbToHex(rgb.r, rgb.g, rgb.b);
                                updateD(res.hex || hex, res.cmyk);
                            } else if (res.hex) {
                                updateD(normalizeHex(res.hex));
                            }
                            showToast('Sampled canvas color: ' + currentDiaryColor, 'success');
                        } else {
                            showToast(res.message || 'Please select an object on canvas', 'error');
                        }
                    } catch(e) {
                        showToast('Failed to get canvas color', 'error');
                    }
                });
            });
        }

        // Initialize with default colors
        updateK(currentKeyringColor, currentKeyringCmyk);
        updateD(currentDiaryColor, currentDiaryCmyk);
    }

    // ==========================================
    // Initialize All Event Listeners
    // ==========================================
    function init() {
        // Tab Switching
        var tabBtns = document.querySelectorAll('.tab-btn');
        var tabPanes = document.querySelectorAll('.tab-pane');
        tabBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var targetId = this.getAttribute('data-tab');
                if (!targetId) return;
                tabBtns.forEach(function(b) { b.classList.remove('active'); });
                tabPanes.forEach(function(p) { p.classList.remove('active'); });
                this.classList.add('active');
                var targetPane = document.getElementById(targetId);
                if (targetPane) targetPane.classList.add('active');
            });
        });

        // Keyring Listeners
        var rawTextInputK = document.getElementById('rawTextInputKeyring');
        if (rawTextInputK) {
            rawTextInputK.addEventListener('input', debounce(function() {
                var rawDiary = document.getElementById('rawTextInputDiary');
                if (rawDiary) rawDiary.value = rawTextInputK.value;
                parseKeyringInput();
            }, 200));
        }

        var chkStripNumK = document.getElementById('chkStripNumberKeyring');
        if (chkStripNumK) chkStripNumK.addEventListener('change', parseKeyringInput);

        var btnSampleK = document.getElementById('btnLoadSampleKeyring');
        if (btnSampleK) {
            btnSampleK.addEventListener('click', function() {
                if (rawTextInputK) rawTextInputK.value = sampleBanglaData;
                var rawDiary = document.getElementById('rawTextInputDiary');
                if (rawDiary) rawDiary.value = sampleBanglaData;
                parseKeyringInput();
                showToast('Sample data loaded!', 'info');
            });
        }

        var btnClearK = document.getElementById('btnClearKeyring');
        if (btnClearK) {
            btnClearK.addEventListener('click', function() {
                if (rawTextInputK) rawTextInputK.value = '';
                var rawDiary = document.getElementById('rawTextInputDiary');
                if (rawDiary) rawDiary.value = '';
                parsedKeyringEntries = [];
                renderKeyringPreview();
                showToast('Cleared input', 'info');
            });
        }

        var btnLoadSelK = document.getElementById('btnLoadSelectionKeyring');
        if (btnLoadSelK) {
            btnLoadSelK.addEventListener('click', function() {
                loadFromCanvasSelection(rawTextInputK, function() {
                    parseKeyringInput();
                });
            });
        }

        var btnAutoFillK = document.getElementById('btnAutoFillKeyring');
        if (btnAutoFillK) {
            btnAutoFillK.addEventListener('click', executeAutoFillKeyring);
        }

        var btnResetIdxK = document.getElementById('btnResetIndexKeyring');
        if (btnResetIdxK) {
            btnResetIdxK.addEventListener('click', function() {
                currentKeyringStartIndex = 0;
                var inputIdx = document.getElementById('inputStartIndexKeyring');
                if (inputIdx) inputIdx.value = 1;
                renderKeyringPreview();
                showToast('Reset to #1', 'info');
            });
        }

        // Diary Listeners
        var rawTextInputD = document.getElementById('rawTextInputDiary');
        if (rawTextInputD) {
            rawTextInputD.addEventListener('input', debounce(function() {
                var rawK = document.getElementById('rawTextInputKeyring');
                if (rawK) rawK.value = rawTextInputD.value;
                parseDiaryInput();
            }, 200));
        }

        var chkIncludeDetailsD = document.getElementById('chkIncludeDetailsDiary');
        if (chkIncludeDetailsD) chkIncludeDetailsD.addEventListener('change', parseDiaryInput);

        var btnSampleD = document.getElementById('btnLoadSampleDiary');
        if (btnSampleD) {
            btnSampleD.addEventListener('click', function() {
                if (rawTextInputD) rawTextInputD.value = sampleBanglaData;
                var rawK = document.getElementById('rawTextInputKeyring');
                if (rawK) rawK.value = sampleBanglaData;
                parseDiaryInput();
                showToast('Sample data loaded!', 'info');
            });
        }

        var btnClearD = document.getElementById('btnClearDiary');
        if (btnClearD) {
            btnClearD.addEventListener('click', function() {
                if (rawTextInputD) rawTextInputD.value = '';
                var rawK = document.getElementById('rawTextInputKeyring');
                if (rawK) rawK.value = '';
                parsedDiaryEntries = [];
                renderDiaryPreview();
                showToast('Cleared input', 'info');
            });
        }

        var btnLoadSelD = document.getElementById('btnLoadSelectionDiary');
        if (btnLoadSelD) {
            btnLoadSelD.addEventListener('click', function() {
                loadFromCanvasSelection(rawTextInputD, function() {
                    parseDiaryInput();
                });
            });
        }

        var selectSerialFormatD = document.getElementById('selectSerialFormatDiary');
        if (selectSerialFormatD) selectSerialFormatD.addEventListener('change', parseDiaryInput);

        var btnResetIdxD = document.getElementById('btnResetIndexDiary');
        if (btnResetIdxD) {
            btnResetIdxD.addEventListener('click', function() {
                currentDiaryStartIndex = 0;
                var inputIdx = document.getElementById('inputStartIndexDiary');
                if (inputIdx) inputIdx.value = 1;
                renderDiaryPreview();
                showToast('Reset to #1', 'info');
            });
        }

        var btnAutoFillD = document.getElementById('btnAutoFillDiary');
        if (btnAutoFillD) {
            btnAutoFillD.addEventListener('click', executeAutoFillDiary);
        }

        // Duplicator Listeners
        ['inputTotalCopies', 'inputCardsPerAB', 'inputCardW', 'inputCardH', 'inputGridCols', 'inputGapX', 'inputGapY'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.addEventListener('input', updateDuplicatorSummary);
        });

        var btnMatchCount = document.getElementById('btnMatchListCount');
        if (btnMatchCount) {
            btnMatchCount.addEventListener('click', function() {
                var total = parsedKeyringEntries.length || parsedDiaryEntries.length;
                if (total > 0) {
                    var inTot = document.getElementById('inputTotalCopies');
                    if (inTot) inTot.value = total;
                    updateDuplicatorSummary();
                    showToast('Matched ' + total + ' items from list!', 'success');
                } else {
                    showToast('Data list is empty!', 'error');
                }
            });
        }

        var btnMeasureCard = document.getElementById('btnMeasureCard');
        if (btnMeasureCard) {
            btnMeasureCard.addEventListener('click', function() {
                btnMeasureCard.textContent = 'Measuring...';
                evalHostScript('getSelectionCardSize()', function(resStr) {
                    btnMeasureCard.textContent = 'Auto Measure';
                    try {
                        var res = JSON.parse(resStr);
                        if (res.status === 'success') {
                            var inW = document.getElementById('inputCardW');
                            var inH = document.getElementById('inputCardH');
                            if (inW) inW.value = res.width;
                            if (inH) inH.value = res.height;
                            updateDuplicatorSummary();
                            showToast('Measured: ' + res.width + ' × ' + res.height + ' pt', 'success');
                        } else {
                            showToast(res.message || 'Please select a card template', 'error');
                        }
                    } catch(e) {
                        showToast('Failed to measure selection', 'error');
                    }
                });
            });
        }

        var btnRunDup = document.getElementById('btnRunDuplicate');
        if (btnRunDup) {
            btnRunDup.addEventListener('click', executeDuplicateTemplates);
        }

        // Canvas Move Listener
        var btnPlaceCanvas = document.getElementById('btnPlaceCanvasText');
        if (btnPlaceCanvas) {
            btnPlaceCanvas.addEventListener('click', executePlaceCanvasText);
        }

        // Typography & Leading Preset Buttons
        function setupPresetButtons() {
            var presetBtns = document.querySelectorAll('.btn-scale-preset, .btn-leading-preset');
            presetBtns.forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var targetId = this.getAttribute('data-target');
                    var val = this.getAttribute('data-val');
                    if (!targetId || val === null) return;
                    var input = document.getElementById(targetId);
                    if (input) {
                        input.value = val;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    }

                    var siblings = document.querySelectorAll('[data-target="' + targetId + '"]');
                    siblings.forEach(function(s) { s.classList.remove('active'); });
                    this.classList.add('active');
                });
            });

            // Sync input changes back to button active state
            ['inputDetailsHScaleKeyring', 'inputNameHScaleKeyring', 'inputDetailsLeadingKeyring'].forEach(function(id) {
                var input = document.getElementById(id);
                if (input) {
                    input.addEventListener('input', function() {
                        var val = this.value.trim();
                        var buttons = document.querySelectorAll('[data-target="' + id + '"]');
                        buttons.forEach(function(b) {
                            if (b.getAttribute('data-val') === val) b.classList.add('active');
                            else b.classList.remove('active');
                        });
                    });
                }
            });
        }

        setupPresetButtons();
        setupColorControls();
        updateDuplicatorSummary();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
