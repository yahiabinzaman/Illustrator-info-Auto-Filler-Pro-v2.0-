/**
 * Illustrator Name & Bio Card Auto-Filler Engine
 * Author: Yahia Bin Zaman (https://github.com/yahiabinzaman)
 * Version: 2.3.0 Pro - Dual Mode: Keyring Filler & Diary Filler
 */

(function() {
    'use strict';

    var csInterface = new CSInterface();
    var bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

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
        var clean = str.replace(/[^০-৯0-9]/g, '');
        if (!clean) return -1;
        var res = 0;
        for (var i = 0; i < clean.length; i++) {
            var ch = clean.charAt(i);
            if (bnNums[ch] !== undefined) res = res * 10 + bnNums[ch];
            else if (ch >= '0' && ch <= '9') res = res * 10 + parseInt(ch, 10);
        }
        return res > 0 ? res : -1;
    }

    // Tabs
    var tabBtns = document.querySelectorAll('.tab-btn');
    var tabPanes = document.querySelectorAll('.tab-pane');

    // Keyring Elements
    var rawTextInputKeyring = document.getElementById('rawTextInputKeyring');
    var entriesCountBadgeKeyring = document.getElementById('entriesCountBadgeKeyring');
    var previewListKeyring = document.getElementById('previewListKeyring');
    var btnAutoFillKeyring = document.getElementById('btnAutoFillKeyring');
    var btnLoadSelectionKeyring = document.getElementById('btnLoadSelectionKeyring');
    var btnLoadSampleKeyring = document.getElementById('btnLoadSampleKeyring');
    var btnClearKeyring = document.getElementById('btnClearKeyring');
    var selectFillOrderKeyring = document.getElementById('selectFillOrderKeyring');
    var selectScopeKeyring = document.getElementById('selectScopeKeyring');
    var chkStripNumberKeyring = document.getElementById('chkStripNumberKeyring');
    var chkMakeBoldKeyring = document.getElementById('chkMakeBoldKeyring');
    var chkFillBaniKeyring = document.getElementById('chkFillBaniKeyring');
    var chkFillQtyKeyring = document.getElementById('chkFillQtyKeyring');
    var selectQtyFormatKeyring = document.getElementById('selectQtyFormatKeyring');
    var chkSkipNoNameKeyring = document.getElementById('chkSkipNoNameKeyring');

    // Color Controls
    var colorPickerKeyring = document.getElementById('colorPickerKeyring');
    var colorHexKeyring = document.getElementById('colorHexKeyring');
    var btnPickColorKeyring = document.getElementById('btnPickColorKeyring');
    var labelColorNameKeyring = document.getElementById('labelColorNameKeyring');

    var colorPickerDiary = document.getElementById('colorPickerDiary');
    var colorHexDiary = document.getElementById('colorHexDiary');
    var btnPickColorDiary = document.getElementById('btnPickColorDiary');
    var labelColorNameDiary = document.getElementById('labelColorNameDiary');
    var colorSwatches = document.querySelectorAll('.color-swatch');

    var currentKeyringColor = "#A22F10";
    var currentDiaryColor = "#A22F10";

    // Diary Elements
    var rawTextInputDiary = document.getElementById('rawTextInputDiary');
    var entriesCountBadgeDiary = document.getElementById('entriesCountBadgeDiary');
    var previewListDiary = document.getElementById('previewListDiary');
    var btnAutoFillDiary = document.getElementById('btnAutoFillDiary');
    var btnLoadSelectionDiary = document.getElementById('btnLoadSelectionDiary');
    var btnLoadSampleDiary = document.getElementById('btnLoadSampleDiary');
    var btnClearDiary = document.getElementById('btnClearDiary');
    var selectSerialFormatDiary = document.getElementById('selectSerialFormatDiary');
    var selectScopeDiary = document.getElementById('selectScopeDiary');
    var selectFillOrderDiary = document.getElementById('selectFillOrderDiary');
    var selectDiaryRenumber = document.getElementById('selectDiaryRenumber');
    var chkIncludeDetailsDiary = document.getElementById('chkIncludeDetailsDiary');
    var chkMakeBoldDiary = document.getElementById('chkMakeBoldDiary');

    // Canvas Move Elements
    var btnPlaceCanvasText = document.getElementById('btnPlaceCanvasText');
    var selectCardSort = document.getElementById('selectCardSort');
    var selectTextSort = document.getElementById('selectTextSort');
    var sliderOffsetX = document.getElementById('sliderOffsetX');
    var sliderOffsetY = document.getElementById('sliderOffsetY');
    var valOffsetX = document.getElementById('valOffsetX');
    var valOffsetY = document.getElementById('valOffsetY');
    var chkGroupPlaced = document.getElementById('chkGroupPlaced');
    var chkBringToFront = document.getElementById('chkBringToFront');

    // Badge Renumber Elements
    var btnRenumberBadges = document.getElementById('btnRenumberBadges');
    var selectBadgeStyle = document.getElementById('selectBadgeStyle');
    var inputBadgeStart = document.getElementById('inputBadgeStart');
    var inputBadgePrefix = document.getElementById('inputBadgePrefix');
    var inputBadgeSuffix = document.getElementById('inputBadgeSuffix');

    // Footer & Toast
    var btnAuthorLink = document.getElementById('btn-author-link');
    var panelToast = document.getElementById('panelToast');

    // Regex definitions
    var serialPrefixRegex = /^\s*[\(\[\{]?([০-৯0-9]{1,4})[\.\)\-\/\:\|\]\}]\s*/;
    var serialLineRegex = /^\s*[\(\[\{]?([০-৯0-9]{1,4})[\.\)\-\/\:\|\]\}]?\s*$/;
    var qtyRegex = /(?:^|\s*)([০-৯0-9]{1,4})\s*(?:পিস|পিছ|টি|টা|pc|pcs|piece|pieces)(?:\s*|$)/i;
    var baniRegex = /^(?:[\u09AC][\u09BE][\u09A3\u09A8][\u09C0])\s*[:\u0983]/i;

    var sampleBanglaData = `১০
হাফেজ মো: সিফাতুল্লাহ বিশ্বাস
পিতা: আজাহারুল ইসলাম
ব্রাহ্মণডাঙ্গা, মনিরামপুর, যশোর
০১৯২৩৪৩০৯৬০
১০ পিস
বাণী: বিন্দু বিন্দু জলে তৈরী হয় সাগর, একটু একটু চেষ্টায় সফল হয় জীবন। — মাওলানা আবু তাহের মিসবাহ দা:বা:

১১
হাফেজ শুয়াইব হুসাইন
পিতা: সাইফুল ইসলাম
বাঁকড়া, ঝিকরগাছা, যশোর
০১৭৪৫৬৪৩২৯৪
১৫ পিস
বাণী: আল্লাহর উপর ভরসা রেখে যারা দ্বীনের মেহনত মোজাহাদা করে, হতাশা কখনো তাদের হতোদ্যম করতে পারেনা, তারা তো সফলতার জন্য নয়, আল্লাহর সন্তুষ্টির জন্যই কাজ করে। — মাওলানা আবু তাহের মিসবাহ দা:বা:

১২
হাফেজ আবু বকর সিদ্দিক
পিতা: জনাব হাসিবুল ইসলাম
আকুন্দবাড়ীয়া, সদর, চুয়াডাঙ্গা
০১৯৬৫৮২৮৮৫৭
২৫ পিস
বাণী: আমি পিঁপড়া হয়ে পদদলিত হব, কিন্তু ভ্রমর হয়ে কাউকে দংশন করব না। — শায়খুল হাদিস ইবরাহীম খলীল রহ.`;

    var parsedKeyringEntries = [];
    var parsedDiaryEntries = [];
    var currentKeyringStartIndex = 0;
    var currentDiaryStartIndex = 0;

    // Batch & State Elements
    var chkSkipFilledKeyring = document.getElementById('chkSkipFilledKeyring');
    var chkAutoRemoveFilledKeyring = document.getElementById('chkAutoRemoveFilledKeyring');
    var inputStartIndexKeyring = document.getElementById('inputStartIndexKeyring');
    var btnResetIndexKeyring = document.getElementById('btnResetIndexKeyring');

    var chkSkipFilledDiary = document.getElementById('chkSkipFilledDiary');
    var chkAutoRemoveFilledDiary = document.getElementById('chkAutoRemoveFilledDiary');
    var inputStartIndexDiary = document.getElementById('inputStartIndexDiary');
    var btnResetIndexDiary = document.getElementById('btnResetIndexDiary');

    function init() {
        // Clear Cache & Reload Panel
        var btnReloadPanel = document.getElementById('btnReloadPanel');
        if (btnReloadPanel) {
            btnReloadPanel.addEventListener('click', function() {
                try { localStorage.clear(); } catch(e) {}
                try { sessionStorage.clear(); } catch(e) {}
                showToast('Cache cleared! Reloading...', 'info');
                try {
                    var loadScript = "try { $.evalFile(new File(Folder.userData + '/../Application Support/Adobe/CEP/extensions/Name_Card_AutoFiller/jsx/hostscript.jsx')); } catch(e) {}";
                    csInterface.evalScript(loadScript, function() {
                        setTimeout(function() {
                            window.location.reload(true);
                        }, 250);
                    });
                } catch(e) {
                    window.location.reload(true);
                }
            });
        }

        // Force ExtendScript to load the latest hostscript.jsx from disk
        try {
            var loadScript = "try { $.evalFile(new File(Folder.userData + '/../Application Support/Adobe/CEP/extensions/Name_Card_AutoFiller/jsx/hostscript.jsx')); } catch(e) {}";
            csInterface.evalScript(loadScript);
        } catch(e) {}

        // Tab switching
        tabBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var targetTab = this.getAttribute('data-tab');
                tabBtns.forEach(function(b) { b.classList.remove('active'); });
                tabPanes.forEach(function(p) { p.classList.remove('active'); });
                this.classList.add('active');
                var pane = document.getElementById(targetTab);
                if (pane) pane.classList.add('active');

                // Re-sync and re-parse on tab change
                if (targetTab === 'tab-keyring') {
                    if (rawTextInputDiary.value && !rawTextInputKeyring.value) {
                        rawTextInputKeyring.value = rawTextInputDiary.value;
                    }
                    parseKeyringInput();
                } else if (targetTab === 'tab-diary') {
                    if (rawTextInputKeyring.value && !rawTextInputDiary.value) {
                        rawTextInputDiary.value = rawTextInputKeyring.value;
                    }
                    parseDiaryInput();
                }
            });
        });

        // Sliders
        if (sliderOffsetX && valOffsetX) {
            sliderOffsetX.addEventListener('input', function() { valOffsetX.textContent = this.value + ' pt'; });
        }
        if (sliderOffsetY && valOffsetY) {
            sliderOffsetY.addEventListener('input', function() { valOffsetY.textContent = this.value + ' pt'; });
        }

        // Batch Start Index & Reset Listeners
        if (inputStartIndexKeyring) {
            inputStartIndexKeyring.addEventListener('input', function() {
                var val = parseInt(this.value, 10);
                currentKeyringStartIndex = (!isNaN(val) && val >= 1) ? (val - 1) : 0;
                renderKeyringPreview();
            });
        }
        if (btnResetIndexKeyring) {
            btnResetIndexKeyring.addEventListener('click', function() {
                currentKeyringStartIndex = 0;
                if (inputStartIndexKeyring) inputStartIndexKeyring.value = 1;
                renderKeyringPreview();
                showToast('Queue reset to start from Entry #1', 'info');
            });
        }

        // Horizontal Scale preset buttons & localStorage persistence
        var scalePresetBtns = document.querySelectorAll('.btn-scale-preset');
        for (var sp = 0; sp < scalePresetBtns.length; sp++) {
            scalePresetBtns[sp].addEventListener('click', function() {
                var targetId = this.getAttribute('data-target');
                var val = this.getAttribute('data-val');
                var targetInput = document.getElementById(targetId);
                if (targetInput) {
                    targetInput.value = val;
                    try { localStorage.setItem(targetId, val); } catch(e) {}
                    showToast('Set scale to ' + val + '%', 'success');
                }
            });
        }

        // Line Leading preset buttons & localStorage persistence
        var leadingPresetBtns = document.querySelectorAll('.btn-leading-preset');
        for (var lp = 0; lp < leadingPresetBtns.length; lp++) {
            leadingPresetBtns[lp].addEventListener('click', function() {
                var targetId = this.getAttribute('data-target');
                var val = this.getAttribute('data-val');
                var targetInput = document.getElementById(targetId);
                if (targetInput) {
                    targetInput.value = val;
                    try { localStorage.setItem(targetId, val); } catch(e) {}
                    var sibs = this.parentElement.querySelectorAll('.btn-leading-preset');
                    for (var s = 0; s < sibs.length; s++) sibs[s].classList.remove('active');
                    this.classList.add('active');
                    showToast('Set leading to ' + val + (val === 'Auto' ? ' (Template Native)' : ' pt'), 'success');
                }
            });
        }

        function restoreLeadingInput(id) {
            var el = document.getElementById(id);
            if (!el) return;
            try {
                var saved = localStorage.getItem(id);
                if (saved) {
                    el.value = saved;
                    var sibs = el.parentElement.querySelectorAll('.btn-leading-preset');
                    for (var s = 0; s < sibs.length; s++) {
                        if (sibs[s].getAttribute('data-val') === saved) sibs[s].classList.add('active');
                        else sibs[s].classList.remove('active');
                    }
                }
            } catch(e) {}
            el.addEventListener('input', function() {
                try { localStorage.setItem(id, this.value); } catch(e) {}
                var sibs = this.parentElement.querySelectorAll('.btn-leading-preset');
                for (var s = 0; s < sibs.length; s++) {
                    if (sibs[s].getAttribute('data-val') === this.value) sibs[s].classList.add('active');
                    else sibs[s].classList.remove('active');
                }
            });
        }
        restoreLeadingInput('inputDetailsLeadingKeyring');
        restoreLeadingInput('inputNameLeadingKeyring');
        restoreLeadingInput('inputDetailsLeadingDiary');
        restoreLeadingInput('inputNameLeadingDiary');

        // Immediately parse any text already in textareas on startup
        if (rawTextInputKeyring && rawTextInputKeyring.value.trim()) {
            parseKeyringInput();
        }
        if (rawTextInputDiary && rawTextInputDiary.value.trim()) {
            parseDiaryInput();
        }

        var inputDetHScale = document.getElementById('inputDetailsHScaleKeyring');
        if (inputDetHScale) {
            try {
                var savedDet = localStorage.getItem('inputDetailsHScaleKeyring');
                if (savedDet) inputDetHScale.value = savedDet;
            } catch(e) {}
            inputDetHScale.addEventListener('input', function() {
                try { localStorage.setItem('inputDetailsHScaleKeyring', this.value); } catch(e) {}
            });
        }

        var inputNmHScale = document.getElementById('inputNameHScaleKeyring');
        if (inputNmHScale) {
            try {
                var savedNm = localStorage.getItem('inputNameHScaleKeyring');
                if (savedNm) inputNmHScale.value = savedNm;
            } catch(e) {}
            inputNmHScale.addEventListener('input', function() {
                try { localStorage.setItem('inputNameHScaleKeyring', this.value); } catch(e) {}
            });
        }

        if (inputStartIndexDiary) {
            inputStartIndexDiary.addEventListener('input', function() {
                var val = parseInt(this.value, 10);
                currentDiaryStartIndex = (!isNaN(val) && val >= 1) ? (val - 1) : 0;
                renderDiaryPreview();
            });
        }
        if (btnResetIndexDiary) {
            btnResetIndexDiary.addEventListener('click', function() {
                currentDiaryStartIndex = 0;
                if (inputStartIndexDiary) inputStartIndexDiary.value = 1;
                renderDiaryPreview();
                showToast('Queue reset to start from Entry #1', 'info');
            });
        }

        // Duplicator UI Elements
        var inputTotalCopies = document.getElementById('inputTotalCopies');
        var inputCardsPerAB = document.getElementById('inputCardsPerAB');
        var inputCardW = document.getElementById('inputCardW');
        var inputCardH = document.getElementById('inputCardH');
        var inputGridCols = document.getElementById('inputGridCols');
        var inputGapX = document.getElementById('inputGapX');
        var inputGapY = document.getElementById('inputGapY');
        var duplicateCalcSummary = document.getElementById('duplicateCalcSummary');
        var btnMatchListCount = document.getElementById('btnMatchListCount');
        var btnMeasureCard = document.getElementById('btnMeasureCard');
        var btnRunDuplicate = document.getElementById('btnRunDuplicate');
        var btnGoToDuplicatorKeyring = document.getElementById('btnGoToDuplicatorKeyring');

        var chkFitArtboard = document.getElementById('chkFitArtboard');
        function updateDuplicatorSummary() {
            if (!duplicateCalcSummary || !inputTotalCopies || !inputCardsPerAB) return;
            var total = parseInt(inputTotalCopies.value, 10) || 0;
            var perAB = parseInt(inputCardsPerAB.value, 10) || 20;
            if (perAB <= 0) perAB = 20;
            var numAB = Math.ceil(total / perAB);
            var lastABCards = total % perAB === 0 ? perAB : (total % perAB);
            var cols = parseInt(inputGridCols ? inputGridCols.value : 2, 10) || 2;
            var rows = Math.ceil(perAB / cols);
            var cW = parseFloat(inputCardW ? inputCardW.value : 192) || 192;
            var cH = parseFloat(inputCardH ? inputCardH.value : 98) || 98;
            var gX = parseFloat(inputGapX ? inputGapX.value : 0) || 0;
            var gY = parseFloat(inputGapY ? inputGapY.value : 0) || 0;

            var estABW = cols * cW + (cols - 1) * gX + 30;
            var estABH = rows * cH + (rows - 1) * gY + 30;

            var text = 'হিসাব: <strong>' + total + 'টি কার্ড</strong> তৈরি করতে মোট <strong>' + numAB + 'টি আর্টবোর্ড</strong> লাগবে (' + (numAB > 1 ? (perAB + ' × ' + (numAB - 1) + ' + ' + lastABCards) : total) + ')।';
            text += '<br><strong>কার্ড সাইজ:</strong> ' + cW + ' × ' + cH + ' pt (গ্যাপ: X=' + gX + 'pt, Y=' + gY + 'pt) | <strong>আর্টবোর্ড:</strong> ' + Math.round(estABW) + ' × ' + Math.round(estABH) + ' pt (' + cols + ' কলাম × ' + rows + ' সারি)';
            duplicateCalcSummary.innerHTML = text;
        }

        if (inputTotalCopies) inputTotalCopies.addEventListener('input', updateDuplicatorSummary);
        if (inputCardsPerAB) inputCardsPerAB.addEventListener('input', updateDuplicatorSummary);
        if (inputCardW) inputCardW.addEventListener('input', updateDuplicatorSummary);
        if (inputCardH) inputCardH.addEventListener('input', updateDuplicatorSummary);
        if (inputGridCols) inputGridCols.addEventListener('input', updateDuplicatorSummary);
        if (inputGapX) inputGapX.addEventListener('input', updateDuplicatorSummary);
        if (inputGapY) inputGapY.addEventListener('input', updateDuplicatorSummary);

        if (btnMeasureCard) {
            btnMeasureCard.addEventListener('click', function() {
                btnMeasureCard.textContent = 'Measuring...';
                csInterface.evalScript('getSelectionCardSize()', function(resStr) {
                    btnMeasureCard.textContent = 'Auto Measure';
                    try {
                        var res = JSON.parse(resStr);
                        if (res.status === 'success') {
                            if (inputCardW) inputCardW.value = res.width;
                            if (inputCardH) inputCardH.value = res.height;
                            updateDuplicatorSummary();
                            showToast('Measured Card: ' + res.width + ' × ' + res.height + ' pt', 'success');
                        } else {
                            showToast(res.message || 'Please select a card first', 'error');
                        }
                    } catch(e) {
                        showToast('Measure failed', 'error');
                    }
                });
            });
        }

        document.querySelectorAll('.btn-gap-preset').forEach(function(b) {
            b.addEventListener('click', function() {
                var gx = this.getAttribute('data-x');
                var gy = this.getAttribute('data-y');
                if (inputGapX) inputGapX.value = gx;
                if (inputGapY) inputGapY.value = gy;
                updateDuplicatorSummary();
                showToast('Set Gap to X=' + gx + 'pt, Y=' + gy + 'pt', 'info');
            });
        });

        document.querySelectorAll('.btn-preset-ab').forEach(function(b) {
            b.addEventListener('click', function() {
                if (inputCardsPerAB) {
                    inputCardsPerAB.value = this.getAttribute('data-val');
                    updateDuplicatorSummary();
                }
            });
        });

        if (btnMatchListCount) {
            btnMatchListCount.addEventListener('click', function() {
                var count = parsedKeyringEntries.length || parsedDiaryEntries.length || 50;
                if (inputTotalCopies) {
                    inputTotalCopies.value = count;
                    updateDuplicatorSummary();
                    showToast('Matched list count: ' + count + ' copies', 'info');
                }
            });
        }

        if (btnGoToDuplicatorKeyring) {
            btnGoToDuplicatorKeyring.addEventListener('click', function() {
                tabBtns.forEach(function(b) {
                    if (b.getAttribute('data-tab') === 'tab-duplicate') b.click();
                });
                if (inputTotalCopies && parsedKeyringEntries.length > 0) {
                    inputTotalCopies.value = parsedKeyringEntries.length;
                    updateDuplicatorSummary();
                }
            });
        }

        if (btnRunDuplicate) {
            btnRunDuplicate.addEventListener('click', function() {
                var total = parseInt(inputTotalCopies ? inputTotalCopies.value : 50, 10) || 50;
                var perAB = parseInt(inputCardsPerAB ? inputCardsPerAB.value : 20, 10) || 20;
                var cols = parseInt(inputGridCols ? inputGridCols.value : 2, 10) || 2;
                var gX = parseFloat(inputGapX ? inputGapX.value : 0) || 0;
                var gY = parseFloat(inputGapY ? inputGapY.value : 0) || 0;

                var fitAB = chkFitArtboard ? chkFitArtboard.checked : true;
                var cW = parseFloat(inputCardW ? inputCardW.value : 0) || 0;
                var cH = parseFloat(inputCardH ? inputCardH.value : 0) || 0;
                var payload = {
                    totalCopies: total,
                    cardsPerArtboard: perAB,
                    cardW: cW,
                    cardH: cH,
                    cols: cols,
                    gapX: gX,
                    gapY: gY,
                    fitArtboard: fitAB
                };

                btnRunDuplicate.disabled = true;
                btnRunDuplicate.textContent = 'Generating Templates & Artboards...';

                var scriptCall = 'duplicateCardTemplates(' + JSON.stringify(JSON.stringify(payload)) + ')';
                csInterface.evalScript(scriptCall, function(resStr) {
                    btnRunDuplicate.disabled = false;
                    btnRunDuplicate.textContent = 'Auto Duplicate Templates & Create Artboards';

                    try {
                        var res = JSON.parse(resStr);
                        if (res.status === 'success') {
                            showToast(res.message, 'success');
                            // Prompt user to switch to filling
                            setTimeout(function() {
                                tabBtns.forEach(function(b) {
                                    if (b.getAttribute('data-tab') === 'tab-keyring') b.click();
                                });
                            }, 1200);
                        } else {
                            showToast(res.message || 'Duplication failed', 'error');
                        }
                    } catch(e) {
                        showToast('Communication error', 'error');
                    }
                });
            });
        }

        updateDuplicatorSummary();

        // Keyring Event Listeners
        if (rawTextInputKeyring) {
            rawTextInputKeyring.addEventListener('input', debounce(function() {
                if (rawTextInputDiary) rawTextInputDiary.value = rawTextInputKeyring.value;
                parseKeyringInput();
            }, 200));
        }
        if (chkStripNumberKeyring) chkStripNumberKeyring.addEventListener('change', parseKeyringInput);
        if (chkSkipNoNameKeyring) chkSkipNoNameKeyring.addEventListener('change', parseKeyringInput);
        if (btnLoadSampleKeyring) {
            btnLoadSampleKeyring.addEventListener('click', function() {
                rawTextInputKeyring.value = sampleBanglaData;
                if (rawTextInputDiary) rawTextInputDiary.value = sampleBanglaData;
                parseKeyringInput();
                showToast('Keyring sample data loaded', 'info');
            });
        }
        if (btnClearKeyring) {
            btnClearKeyring.addEventListener('click', function() {
                rawTextInputKeyring.value = '';
                if (rawTextInputDiary) rawTextInputDiary.value = '';
                parsedKeyringEntries = [];
                renderKeyringPreview();
                showToast('Cleared input', 'info');
            });
        }
        if (btnLoadSelectionKeyring) {
            btnLoadSelectionKeyring.addEventListener('click', function() {
                loadFromCanvasSelection(rawTextInputKeyring, function() {
                    if (rawTextInputDiary) rawTextInputDiary.value = rawTextInputKeyring.value;
                    parseKeyringInput();
                });
            });
        }
        if (btnAutoFillKeyring) btnAutoFillKeyring.addEventListener('click', executeAutoFillKeyring);

        // Diary Event Listeners
        if (rawTextInputDiary) {
            rawTextInputDiary.addEventListener('input', debounce(function() {
                if (rawTextInputKeyring) rawTextInputKeyring.value = rawTextInputDiary.value;
                parseDiaryInput();
            }, 200));
        }
        if (selectSerialFormatDiary) selectSerialFormatDiary.addEventListener('change', parseDiaryInput);
        if (selectDiaryRenumber) selectDiaryRenumber.addEventListener('change', parseDiaryInput);
        if (chkIncludeDetailsDiary) chkIncludeDetailsDiary.addEventListener('change', parseDiaryInput);
        if (btnLoadSampleDiary) {
            btnLoadSampleDiary.addEventListener('click', function() {
                rawTextInputDiary.value = sampleBanglaData;
                if (rawTextInputKeyring) rawTextInputKeyring.value = sampleBanglaData;
                parseDiaryInput();
                showToast('Diary sample data loaded', 'info');
            });
        }
        if (btnClearDiary) {
            btnClearDiary.addEventListener('click', function() {
                rawTextInputDiary.value = '';
                if (rawTextInputKeyring) rawTextInputKeyring.value = '';
                parsedDiaryEntries = [];
                renderDiaryPreview();
                showToast('Cleared input', 'info');
            });
        }
        if (btnLoadSelectionDiary) {
            btnLoadSelectionDiary.addEventListener('click', function() {
                loadFromCanvasSelection(rawTextInputDiary, function() {
                    if (rawTextInputKeyring) rawTextInputKeyring.value = rawTextInputDiary.value;
                    parseDiaryInput();
                });
            });
        }
        if (btnAutoFillDiary) btnAutoFillDiary.addEventListener('click', executeAutoFillDiary);

        // Canvas Move & Badge Listeners
        if (btnPlaceCanvasText) btnPlaceCanvasText.addEventListener('click', executePlaceCanvasText);
        if (btnRenumberBadges) btnRenumberBadges.addEventListener('click', executeRenumberBadges);

        // External Link
        if (btnAuthorLink) {
            btnAuthorLink.addEventListener('click', function(e) {
                e.preventDefault();
                openBrowserUrl(this.getAttribute('href') || 'https://github.com/yahiabinzaman');
            });
        }

        // Color Control Listeners
        function setupColorControls(picker, hexInput, label, swatchesTab, isKeyring) {
            if (!picker || !hexInput) return;

            picker.addEventListener('input', function() {
                var val = this.value.toUpperCase();
                hexInput.value = val;
                if (label) label.textContent = val;
                if (isKeyring) {
                    currentKeyringColor = val;
                    renderKeyringPreview();
                } else {
                    currentDiaryColor = val;
                    renderDiaryPreview();
                }
            });

            hexInput.addEventListener('input', function() {
                var val = this.value.trim().toUpperCase();
                if (/^#[0-9A-F]{6}$/i.test(val)) {
                    picker.value = val;
                    if (label) label.textContent = val;
                    if (isKeyring) {
                        currentKeyringColor = val;
                        renderKeyringPreview();
                    } else {
                        currentDiaryColor = val;
                        renderDiaryPreview();
                    }
                }
            });
        }

        setupColorControls(colorPickerKeyring, colorHexKeyring, labelColorNameKeyring, 'keyring', true);
        setupColorControls(colorPickerDiary, colorHexDiary, labelColorNameDiary, 'diary', false);

        // Pick from Canvas
        function pickColorFromCanvas(picker, hexInput, label, isKeyring) {
            csInterface.evalScript('getSelectedCanvasColor()', function(resStr) {
                try {
                    var res = JSON.parse(resStr);
                    if (res.status === 'success' && res.hex) {
                        var hexVal = res.hex.toUpperCase();
                        if (picker) picker.value = hexVal;
                        if (hexInput) hexInput.value = hexVal;
                        if (label) label.textContent = (res.spotName ? (res.spotName + " ") : "") + hexVal;
                        if (isKeyring) {
                            currentKeyringColor = hexVal;
                            renderKeyringPreview();
                        } else {
                            currentDiaryColor = hexVal;
                            renderDiaryPreview();
                        }
                        showToast('Picked color ' + hexVal + ' from canvas', 'success');
                    } else {
                        showToast(res.message || 'No color found in selection', 'error');
                    }
                } catch(e) {
                    showToast('Failed to read canvas color', 'error');
                }
            });
        }

        if (btnPickColorKeyring) {
            btnPickColorKeyring.addEventListener('click', function() {
                pickColorFromCanvas(colorPickerKeyring, colorHexKeyring, labelColorNameKeyring, true);
            });
        }
        if (btnPickColorDiary) {
            btnPickColorDiary.addEventListener('click', function() {
                pickColorFromCanvas(colorPickerDiary, colorHexDiary, labelColorNameDiary, false);
            });
        }

        // Swatches
        colorSwatches.forEach(function(sw) {
            sw.addEventListener('click', function() {
                var col = this.getAttribute('data-color');
                var tab = this.getAttribute('data-tab');
                if (tab === 'keyring') {
                    if (colorPickerKeyring) colorPickerKeyring.value = col;
                    if (colorHexKeyring) colorHexKeyring.value = col;
                    if (labelColorNameKeyring) labelColorNameKeyring.textContent = col;
                    currentKeyringColor = col;
                    document.querySelectorAll('.color-swatch[data-tab="keyring"]').forEach(function(s) { s.classList.remove('active'); });
                    this.classList.add('active');
                    renderKeyringPreview();
                } else {
                    if (colorPickerDiary) colorPickerDiary.value = col;
                    if (colorHexDiary) colorHexDiary.value = col;
                    if (labelColorNameDiary) labelColorNameDiary.textContent = col;
                    currentDiaryColor = col;
                    document.querySelectorAll('.color-swatch[data-tab="diary"]').forEach(function(s) { s.classList.remove('active'); });
                    this.classList.add('active');
                    renderDiaryPreview();
                }
            });
        });

        // Initial parse
        parseKeyringInput();
    }

    function debounce(func, wait) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function() { func.apply(context, args); }, wait);
        };
    }

    function openBrowserUrl(url) {
        if (!url) return;
        try { if (window.__adobe_cep__) window.__adobe_cep__.openURLInDefaultBrowser(url); } catch (e) {}
        try { csInterface.evalScript('openWebUrl("' + url + '");'); } catch (e) {}
    }

    // ==========================================
    // Universal Core Parser
    // ==========================================
    function parseRawBlocks(rawText) {
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
                // If a new block starts with a standalone serial number e.g. "169", "১১৯", "১০" and curLines already has items
                if (curLines.length >= 2 && serialLineRegex.test(line)) {
                    blocks.push(curLines);
                    curLines = [line];
                } else {
                    curLines.push(line);
                }
            }
        }
        if (curLines.length > 0) blocks.push(curLines);

        var formRegex = /^(?:ফরম|ফরম\s*নম্বর|ফরম\s*নং|দাখেলা|রোল|Form|Roll|No\.?)\s*[:\-\s]?\s*([০-৯0-9A-Za-z\s]+)/i;

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
                // Check for form number (e.g. "ফরম: ৯৯৮৪৯", "ফরম ৯৯৮৪৯", "রোল: ১২")
                if (formRegex.test(lText) || /^ফরম\s*[০-৯0-9]+/i.test(lText)) {
                    item.formNumber = lText;
                    continue;
                }

                // Check if line 0 is standalone serial number e.g. "169", "১১৯", "১", "১০"
                var slm = lText.match(serialLineRegex);
                if (l === 0 && slm) {
                    item.serial = slm[1];
                    continue;
                }
                nonMeta.push(lText);
            }

            if (baniLines.length > 0) item.bani = baniLines.join(' ');

            if (nonMeta.length > 0) {
                item.rawName = nonMeta[0];
                var spm = item.rawName.match(serialPrefixRegex);
                if (spm && !item.serial) {
                    item.serial = spm[1];
                }
                item.cleanName = item.rawName.replace(serialPrefixRegex, '').trim();
                item.details = nonMeta.slice(1).join('\n');
            }

            result.push(item);
        }

        return result;
    }

    function parseKeyringInput() {
        var raw = (rawTextInputKeyring ? rawTextInputKeyring.value : "").trim();
        parsedKeyringEntries = [];
        if (!raw) {
            renderKeyringPreview();
            return;
        }

        var stripNum = chkStripNumberKeyring ? chkStripNumberKeyring.checked : true;
        var skipNoName = chkSkipNoNameKeyring ? chkSkipNoNameKeyring.checked : true;
        var blocks = parseRawBlocks(raw);

        for (var i = 0; i < blocks.length; i++) {
            var blk = blocks[i];
            var nameToUse = stripNum ? blk.cleanName : blk.rawName;
            if (skipNoName && !nameToUse) continue;

            parsedKeyringEntries.push({
                serial: blk.serial,
                name: nameToUse,
                details: blk.details,
                qty: blk.qty,
                bani: blk.bani,
                rawText: blk.rawText
            });
        }

        renderKeyringPreview();
    }

    function renderKeyringPreview() {
        if (!previewListKeyring) return;
        previewListKeyring.innerHTML = '';
        if (entriesCountBadgeKeyring) {
            var rem = Math.max(0, parsedKeyringEntries.length - currentKeyringStartIndex);
            if (currentKeyringStartIndex > 0) {
                entriesCountBadgeKeyring.textContent = 'Remaining: ' + rem + ' / ' + parsedKeyringEntries.length + ' Entries';
            } else {
                entriesCountBadgeKeyring.textContent = parsedKeyringEntries.length + ' Entries';
            }
        }

        if (!parsedKeyringEntries.length) {
            previewListKeyring.innerHTML = '<div class="empty-text">No entries parsed. Paste list above or click "Sample".</div>';
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
            nameEl.style.color = currentKeyringColor;

            var tagsDiv = document.createElement('div');
            tagsDiv.style.display = 'flex';
            tagsDiv.style.alignItems = 'center';
            tagsDiv.style.gap = '4px';

            if (idx < currentKeyringStartIndex) {
                var filledTag = document.createElement('span');
                filledTag.className = 'preview-tag-filled';
                filledTag.textContent = '✓ Filled';
                tagsDiv.appendChild(filledTag);
            } else if (idx === currentKeyringStartIndex) {
                var nextTag = document.createElement('span');
                nextTag.className = 'preview-tag-next';
                nextTag.textContent = '▶ Next';
                tagsDiv.appendChild(nextTag);
            }

            if (entry.qty) {
                var qtyBadge = document.createElement('span');
                qtyBadge.className = 'preview-tag preview-tag-qty';
                qtyBadge.textContent = entry.qty + ' পিস';
                tagsDiv.appendChild(qtyBadge);
            }

            var indexBadge = document.createElement('span');
            indexBadge.className = 'preview-index';
            indexBadge.textContent = '#' + (idx < 9 ? '0' + (idx + 1) : (idx + 1));
            tagsDiv.appendChild(indexBadge);

            topRow.appendChild(nameEl);
            topRow.appendChild(tagsDiv);
            itemEl.appendChild(topRow);

            if (entry.details) {
                var detailsEl = document.createElement('div');
                detailsEl.className = 'preview-details';
                detailsEl.textContent = entry.details;
                itemEl.appendChild(detailsEl);
            }

            if (entry.bani) {
                var baniEl = document.createElement('div');
                baniEl.className = 'preview-bani';
                baniEl.textContent = entry.bani;
                itemEl.appendChild(baniEl);
            }

            fragment.appendChild(itemEl);
        });

        previewListKeyring.appendChild(fragment);
    }

    function executeAutoFillKeyring() {
        if (currentKeyringStartIndex >= parsedKeyringEntries.length) {
            currentKeyringStartIndex = 0;
            if (inputStartIndexKeyring) inputStartIndexKeyring.value = 1;
        }
        if (!parsedKeyringEntries.length) {
            showToast('Please enter biodata list first', 'error');
            return;
        }

        var autoRemove = chkAutoRemoveFilledKeyring ? chkAutoRemoveFilledKeyring.checked : true;
        var skipFilled = chkSkipFilledKeyring ? chkSkipFilledKeyring.checked : true;

        var inputDetHScale = document.getElementById('inputDetailsHScaleKeyring');
        var inputNmHScale = document.getElementById('inputNameHScaleKeyring');
        var detHScale = inputDetHScale ? (parseFloat(inputDetHScale.value) || 85) : 85;
        var nmHScale = inputNmHScale ? (parseFloat(inputNmHScale.value) || 100) : 100;

        var inputDetLead = document.getElementById('inputDetailsLeadingKeyring');
        var inputNmLead = document.getElementById('inputNameLeadingKeyring');
        var detLead = inputDetLead ? inputDetLead.value.trim() : "Auto";
        var nmLead = inputNmLead ? inputNmLead.value.trim() : "Auto";

        var payload = {
            entries: parsedKeyringEntries,
            order: selectFillOrderKeyring ? selectFillOrderKeyring.value : "column",
            scope: selectScopeKeyring ? selectScopeKeyring.value : "artboard",
            makeBold: chkMakeBoldKeyring ? chkMakeBoldKeyring.checked : true,
            stripNumber: chkStripNumberKeyring ? chkStripNumberKeyring.checked : true,
            fillBani: chkFillBaniKeyring ? chkFillBaniKeyring.checked : true,
            fillQty: chkFillQtyKeyring ? chkFillQtyKeyring.checked : true,
            qtyFormat: selectQtyFormatKeyring ? selectQtyFormatKeyring.value : "auto",
            nameColor: currentKeyringColor,
            startIndex: currentKeyringStartIndex,
            skipFilledCards: skipFilled,
            detailsHScale: detHScale,
            nameHScale: nmHScale,
            detailsLeading: detLead,
            nameLeading: nmLead
        };

        btnAutoFillKeyring.disabled = true;
        btnAutoFillKeyring.textContent = 'Populating Keyring Cards...';

        if (!parsedKeyringEntries.length && rawTextInputKeyring && rawTextInputKeyring.value.trim()) {
            parseKeyringInput();
        }

        var reloadJSX = "try { $.evalFile(new File(Folder.userData + '/../Application Support/Adobe/CEP/extensions/Name_Card_AutoFiller/jsx/hostscript.jsx')); } catch(e) {}";
        var scriptCall = reloadJSX + "; populateCards(" + JSON.stringify(JSON.stringify(payload)) + ")";

        csInterface.evalScript(scriptCall, function(resStr) {
            btnAutoFillKeyring.disabled = false;
            btnAutoFillKeyring.textContent = 'Auto Fill Keyring Cards';

            try {
                var res = JSON.parse(resStr);
                if (res.status === 'success') {
                    if (autoRemove) {
                        var placedCount = res.filledCount || 0;
                        var remaining = parsedKeyringEntries.slice(currentKeyringStartIndex + placedCount);
                        var newText = remaining.map(function(e) { return e.rawText || e.name; }).join('\n\n');
                        if (rawTextInputKeyring) rawTextInputKeyring.value = newText;
                        if (rawTextInputDiary) rawTextInputDiary.value = newText;
                        currentKeyringStartIndex = 0;
                        if (inputStartIndexKeyring) inputStartIndexKeyring.value = 1;
                        parseKeyringInput();
                        showToast('Populated ' + placedCount + ' card(s)! Remaining in queue: ' + remaining.length, 'success');
                    } else {
                        currentKeyringStartIndex = res.nextStartIndex;
                        if (inputStartIndexKeyring) inputStartIndexKeyring.value = currentKeyringStartIndex + 1;
                        renderKeyringPreview();
                        showToast(res.message, 'success');
                    }
                } else {
                    showToast(res.message || 'Failed to populate cards', 'error');
                }
            } catch (e) {
                if (resStr && String(resStr).indexOf("Error") !== -1) {
                    showToast(String(resStr).substring(0, 80), 'error');
                } else {
                    showToast('Communication error', 'error');
                }
            }
        });
    }

    // ==========================================
    // Diary Mode Parser & UI
    // ==========================================
    function parseDiaryInput() {
        var raw = (rawTextInputDiary ? rawTextInputDiary.value : "").trim();
        parsedDiaryEntries = [];
        if (!raw) {
            renderDiaryPreview();
            return;
        }

        var serialFormat = selectSerialFormatDiary ? selectSerialFormatDiary.value : "standalone";
        var renumberMode = selectDiaryRenumber ? selectDiaryRenumber.value : "auto_1";
        var includeDetails = chkIncludeDetailsDiary ? chkIncludeDetailsDiary.checked : true;

        var blocks = parseRawBlocks(raw);

        for (var i = 0; i < blocks.length; i++) {
            var blk = blocks[i];
            if (!blk.cleanName) continue;

            // Determine serial number
            var num = i + 1;
            if (renumberMode === "use_input" && blk.serial) {
                var parsedNum = bengaliToInt(blk.serial);
                if (parsedNum > 0) num = parsedNum;
            }

            var bnNum = intToBengali(num, false);
            var enNum = String(num);

            var formattedName = blk.cleanName;
            var finalSerial = bnNum;

            if (serialFormat === "bn_dot") {
                formattedName = bnNum + ". " + blk.cleanName;
            } else if (serialFormat === "bn_bracket") {
                formattedName = bnNum + ") " + blk.cleanName;
            } else if (serialFormat === "bn_dash") {
                formattedName = bnNum + " - " + blk.cleanName;
            } else if (serialFormat === "en_dot") {
                formattedName = enNum + ". " + blk.cleanName;
            } else if (serialFormat === "keep_orig") {
                finalSerial = blk.serial || bnNum;
                formattedName = blk.cleanName;
            } else if (serialFormat === "standalone") {
                finalSerial = (renumberMode === "use_input" && blk.serial) ? blk.serial : bnNum;
                formattedName = blk.cleanName;
            } else if (serialFormat === "none") {
                finalSerial = "";
                formattedName = blk.cleanName;
            }

            parsedDiaryEntries.push({
                serial: finalSerial,
                name: formattedName,
                details: includeDetails ? blk.details : "",
                formNumber: blk.formNumber || "",
                qty: "",
                bani: ""
            });
        }

        renderDiaryPreview();
    }

    function renderDiaryPreview() {
        if (!previewListDiary) return;
        previewListDiary.innerHTML = '';
        if (entriesCountBadgeDiary) {
            var rem = Math.max(0, parsedDiaryEntries.length - currentDiaryStartIndex);
            if (currentDiaryStartIndex > 0) {
                entriesCountBadgeDiary.textContent = 'Remaining: ' + rem + ' / ' + parsedDiaryEntries.length + ' Entries';
            } else {
                entriesCountBadgeDiary.textContent = parsedDiaryEntries.length + ' Entries';
            }
        }

        if (!parsedDiaryEntries.length) {
            previewListDiary.innerHTML = '<div class="empty-text">No entries parsed. Paste list above or click "Sample".</div>';
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
            nameEl.style.color = currentDiaryColor;
            nameEl.textContent = entry.name;

            var tagsDiv = document.createElement('div');
            tagsDiv.style.display = 'flex';
            tagsDiv.style.alignItems = 'center';
            tagsDiv.style.gap = '4px';

            if (idx < currentDiaryStartIndex) {
                var filledTag = document.createElement('span');
                filledTag.className = 'preview-tag-filled';
                filledTag.textContent = '✓ Filled';
                tagsDiv.appendChild(filledTag);
            } else if (idx === currentDiaryStartIndex) {
                var nextTag = document.createElement('span');
                nextTag.className = 'preview-tag-next';
                nextTag.textContent = '▶ Next';
                tagsDiv.appendChild(nextTag);
            }

            var indexBadge = document.createElement('span');
            indexBadge.className = 'preview-index';
            indexBadge.textContent = '#' + (idx < 9 ? '0' + (idx + 1) : (idx + 1));
            tagsDiv.appendChild(indexBadge);

            topRow.appendChild(nameEl);
            topRow.appendChild(tagsDiv);
            itemEl.appendChild(topRow);

            if (entry.details) {
                var detailsEl = document.createElement('div');
                detailsEl.className = 'preview-details';
                detailsEl.textContent = entry.details;
                itemEl.appendChild(detailsEl);
            }

            fragment.appendChild(itemEl);
        });

        previewListDiary.appendChild(fragment);
    }

    function executeAutoFillDiary() {
        if (!parsedDiaryEntries.length) {
            showToast('Please enter biodata list first', 'error');
            return;
        }

        var inputDetHScaleD = document.getElementById('inputDetailsHScaleDiary');
        var inputNmHScaleD = document.getElementById('inputNameHScaleDiary');
        var detHScaleD = inputDetHScaleD ? (parseFloat(inputDetHScaleD.value) || 85) : 85;
        var nmHScaleD = inputNmHScaleD ? (parseFloat(inputNmHScaleD.value) || 100) : 100;

        var inputDetLeadD = document.getElementById('inputDetailsLeadingDiary');
        var inputNmLeadD = document.getElementById('inputNameLeadingDiary');
        var detLeadD = inputDetLeadD ? inputDetLeadD.value.trim() : "Auto";
        var nmLeadD = inputNmLeadD ? inputNmLeadD.value.trim() : "Auto";

        var payload = {
            entries: parsedDiaryEntries,
            order: selectFillOrderDiary ? selectFillOrderDiary.value : "column",
            scope: selectScopeDiary ? selectScopeDiary.value : "artboard",
            makeBold: chkMakeBoldDiary ? chkMakeBoldDiary.checked : true,
            stripNumber: false, // In Diary mode, keep formatted serial on Name
            fillBani: false,
            fillQty: false,
            qtyFormat: "auto",
            nameColor: currentDiaryColor,
            detailsHScale: detHScaleD,
            nameHScale: nmHScaleD,
            detailsLeading: detLeadD,
            nameLeading: nmLeadD
        };

        btnAutoFillDiary.disabled = true;
        btnAutoFillDiary.textContent = 'Populating Diary Names...';

        if (!parsedDiaryEntries.length && rawTextInputDiary && rawTextInputDiary.value.trim()) {
            parseDiaryInput();
        }

        var reloadJSX = "try { $.evalFile(new File(Folder.userData + '/../Application Support/Adobe/CEP/extensions/Name_Card_AutoFiller/jsx/hostscript.jsx')); } catch(e) {}";
        var scriptCall = reloadJSX + "; populateCards(" + JSON.stringify(JSON.stringify(payload)) + ")";

        csInterface.evalScript(scriptCall, function(resStr) {
            btnAutoFillDiary.disabled = false;
            btnAutoFillDiary.textContent = 'Auto Fill Diary Names';

            try {
                var res = JSON.parse(resStr);
                if (res.status === 'success') {
                    showToast(res.message, 'success');
                } else {
                    showToast(res.message || 'Failed to populate diary names', 'error');
                }
            } catch (e) {
                showToast('Communication error', 'error');
            }
        });
    }

    // ==========================================
    // Canvas Selection Loader
    // ==========================================
    function loadFromCanvasSelection(targetTextarea, callback) {
        csInterface.evalScript('getSelectedCanvasText()', function(resStr) {
            try {
                var res = JSON.parse(resStr);
                if (res.status === 'success' && res.text) {
                    targetTextarea.value = res.text;
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

    // ==========================================
    // Canvas Move & Badge Actions
    // ==========================================
    function executePlaceCanvasText() {
        btnPlaceCanvasText.disabled = true;
        btnPlaceCanvasText.textContent = 'Moving Text into Cards...';

        var payload = {
            cardOrder: selectCardSort ? selectCardSort.value : "column",
            textOrder: selectTextSort ? selectTextSort.value : "column",
            offsetX: parseFloat(sliderOffsetX ? sliderOffsetX.value : 45),
            offsetY: parseFloat(sliderOffsetY ? sliderOffsetY.value : -15),
            groupWithCard: chkGroupPlaced ? chkGroupPlaced.checked : true,
            bringToFront: chkBringToFront ? chkBringToFront.checked : true
        };

        var scriptCall = 'placeTextBlocksIntoCards(' + JSON.stringify(JSON.stringify(payload)) + ')';
        csInterface.evalScript(scriptCall, function(resStr) {
            btnPlaceCanvasText.disabled = false;
            btnPlaceCanvasText.textContent = 'Move & Place Text into Cards';
            try {
                var res = JSON.parse(resStr);
                if (res.status === 'success') showToast(res.message, 'success');
                else showToast(res.message || 'Failed to place text', 'error');
            } catch (e) {
                showToast('Communication error', 'error');
            }
        });
    }

    function executeRenumberBadges() {
        btnRenumberBadges.disabled = true;
        btnRenumberBadges.textContent = 'Renumbering...';

        var payload = {
            style: selectBadgeStyle ? selectBadgeStyle.value : "bn_2digit",
            start: parseInt(inputBadgeStart ? inputBadgeStart.value : 1, 10) || 1,
            prefix: inputBadgePrefix ? inputBadgePrefix.value : "",
            suffix: inputBadgeSuffix ? inputBadgeSuffix.value : ""
        };

        var scriptCall = 'renumberBadges(' + JSON.stringify(JSON.stringify(payload)) + ')';
        csInterface.evalScript(scriptCall, function(resStr) {
            btnRenumberBadges.disabled = false;
            btnRenumberBadges.textContent = 'Renumber Selected Badges';
            try {
                var res = JSON.parse(resStr);
                if (res.status === 'success') showToast(res.message, 'success');
                else showToast(res.message || 'Failed to renumber badges', 'error');
            } catch (e) {
                showToast('Communication error', 'error');
            }
        });
    }

    function showToast(message, type) {
        if (!panelToast) return;
        panelToast.textContent = message;
        panelToast.className = 'panel-toast ' + (type || 'info') + ' show';
        setTimeout(function() {
            panelToast.className = 'panel-toast';
        }, 3200);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
