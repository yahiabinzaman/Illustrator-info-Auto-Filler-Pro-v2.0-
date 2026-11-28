/**
 * Auto Filler Pro — ColorLab Edition
 * Author: Yahia Bin Zaman (https://github.com/yahiabinzaman)
 * Version: 3.4.0 Pro — Cross-Platform Windows/macOS & Illustrator 20–2026+ Engine
 */

(function() {
    'use strict';

    // Polyfill NodeList.prototype.forEach for Chrome 41 (Illustrator CC 2015.3 / v20)
    if (typeof NodeList !== 'undefined' && NodeList.prototype && !NodeList.prototype.forEach) {
        NodeList.prototype.forEach = Array.prototype.forEach;
    }

    function copyEnv(extra) {
        var out = {};
        if (typeof process !== 'undefined' && process.env) {
            for (var k in process.env) {
                if (Object.prototype.hasOwnProperty.call(process.env, k)) {
                    out[k] = process.env[k];
                }
            }
        }
        if (extra) {
            for (var ek in extra) {
                if (Object.prototype.hasOwnProperty.call(extra, ek)) {
                    out[ek] = extra[ek];
                }
            }
        }
        return out;
    }

    var csInterface = new CSInterface();
    var bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

    // ==========================================
    // CEP Keyboard & Clipboard Engine
    // ==========================================
    try {
        var keyEventsInterest = [];
        // Targeted edit shortcuts (A, C, V, X, Y, Z) so Illustrator shortcuts remain intact
        var editKeyCodes = [65, 67, 86, 88, 89, 90];
        for (var ki = 0; ki < editKeyCodes.length; ki++) {
            var kc = editKeyCodes[ki];
            keyEventsInterest.push({ keyCode: kc, ctrlKey: false, altKey: false, shiftKey: false, metaKey: true });  // Mac Cmd
            keyEventsInterest.push({ keyCode: kc, ctrlKey: true, altKey: false, shiftKey: false, metaKey: false });  // Win Ctrl
            keyEventsInterest.push({ keyCode: kc, ctrlKey: true, altKey: false, shiftKey: true, metaKey: false });   // Win Ctrl+Shift
            keyEventsInterest.push({ keyCode: kc, ctrlKey: false, altKey: false, shiftKey: true, metaKey: true });   // Mac Cmd+Shift
        }
        keyEventsInterest.push({ keyCode: 45, ctrlKey: false, altKey: false, shiftKey: true, metaKey: false });      // Win Shift+Insert
        keyEventsInterest.push({ keyCode: 45, ctrlKey: true, altKey: false, shiftKey: false, metaKey: false });      // Win Ctrl+Insert
        if (window.__adobe_cep__ && window.__adobe_cep__.registerKeyEventsInterest) {
            window.__adobe_cep__.registerKeyEventsInterest(JSON.stringify(keyEventsInterest));
        }
    } catch (e) {}

    function stripBom(str) {
        if (!str) return '';
        return str.charAt(0) === '\uFEFF' ? str.slice(1) : str;
    }

    function getSystemClipboardTextSync() {
        try {
            if (typeof require !== 'undefined' && typeof process !== 'undefined') {
                var cp = require('child_process');
                var utf8Env = copyEnv({
                    LANG: 'en_US.UTF-8',
                    LC_ALL: 'en_US.UTF-8'
                });

                if (process.platform === 'darwin') {
                    var pbpasteCmds = [
                        '/usr/bin/pbpaste -Prefer utf8',
                        '/usr/bin/pbpaste -Prefer txt',
                        '/usr/bin/pbpaste'
                    ];
                    for (var pi = 0; pi < pbpasteCmds.length; pi++) {
                        try {
                            var out = cp.execSync(pbpasteCmds[pi], {
                                env: utf8Env,
                                encoding: 'utf8',
                                maxBuffer: 20 * 1024 * 1024
                            });
                            if (out && out.length > 0) return stripBom(out);
                        } catch (pbe) {}
                    }
                } else if (process.platform === 'win32') {
                    var psCmd = '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ' +
                        'try { Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue; ' +
                        'if ([System.Windows.Forms.Clipboard]::ContainsText()) { ' +
                        '[System.Windows.Forms.Clipboard]::GetText([System.Windows.Forms.TextDataFormat]::UnicodeText); exit 0 } } catch {}; ' +
                        'if (Get-Command Get-Clipboard -ErrorAction SilentlyContinue) { Get-Clipboard -Raw }';
                    var outWin = cp.execSync(
                        'powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -STA -Command "' + psCmd.replace(/"/g, '\\"') + '"',
                        {
                            env: utf8Env,
                            encoding: 'utf8',
                            windowsHide: true,
                            maxBuffer: 20 * 1024 * 1024
                        }
                    );
                    if (outWin !== undefined && outWin !== null) {
                        var cleaned = stripBom(String(outWin).replace(/\r\n/g, '\n'));
                        return cleaned;
                    }
                }
            }
        } catch (ne) {}
        return '';
    }

    function getSystemClipboardText(callback) {
        if (typeof callback !== 'function') return;
        var syncText = getSystemClipboardTextSync();
        if (syncText && syncText.length > 0) {
            callback(syncText);
            return;
        }

        if (navigator.clipboard && navigator.clipboard.readText) {
            navigator.clipboard.readText().then(function(text) {
                callback(text || '');
            }).catch(function() {
                callback('');
            });
            return;
        }

        callback('');
    }

    function setSystemClipboardText(text) {
        if (!text) return;
        try {
            if (typeof require !== 'undefined' && typeof process !== 'undefined') {
                var cp = require('child_process');
                var utf8Env = copyEnv({
                    LANG: 'en_US.UTF-8',
                    LC_ALL: 'en_US.UTF-8'
                });
                if (process.platform === 'darwin') {
                    var procMac = cp.spawn('/usr/bin/pbcopy', [], { env: utf8Env });
                    procMac.stdin.write(text, 'utf8');
                    procMac.stdin.end();
                    return;
                } else if (process.platform === 'win32') {
                    // Windows clip.exe expects UTF-16LE with BOM for Bangla/Arabic Unicode text
                    var utf16Payload = '\uFEFF' + String(text).replace(/\r?\n/g, '\r\n');
                    var utf16Buf = (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function')
                        ? Buffer.from(utf16Payload, 'utf16le')
                        : new Buffer(utf16Payload, 'utf16le');
                    var procWin = cp.spawn('clip', [], { env: utf8Env, windowsHide: true });
                    procWin.stdin.write(utf16Buf);
                    procWin.stdin.end();
                    return;
                }
            }
        } catch (e) {}

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text);
                return;
            }
        } catch (e) {}

        try {
            var temp = document.createElement('textarea');
            temp.value = text;
            document.body.appendChild(temp);
            temp.select();
            document.execCommand('copy');
            document.body.removeChild(temp);
        } catch (e) {}
    }

    function isTextSelectable(el) {
        if (!el) return false;
        if (el.tagName === 'TEXTAREA') return true;
        if (el.tagName === 'INPUT') {
            var t = (el.type || 'text').toLowerCase();
            return (t === 'text' || t === 'search' || t === 'url' || t === 'tel' || t === 'password');
        }
        return false;
    }

    function insertTextIntoElement(target, text, replaceAll) {
        if (!target) return;
        target.focus();
        if (replaceAll || !target.value || !isTextSelectable(target)) {
            target.value = text;
        } else {
            var start = target.selectionStart !== undefined ? target.selectionStart : target.value.length;
            var end = target.selectionEnd !== undefined ? target.selectionEnd : target.value.length;
            var val = target.value;
            target.value = val.substring(0, start) + text + val.substring(end);
            target.selectionStart = target.selectionEnd = start + text.length;
        }
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function setupContextMenu() {
        var menu = document.getElementById('customContextMenu');
        var activeTarget = null;

        document.addEventListener('contextmenu', function(e) {
            var target = e.target;
            if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) {
                e.preventDefault();
                activeTarget = target;
                if (!menu) return;
                menu.style.display = 'block';
                var x = e.clientX;
                var y = e.clientY;
                var maxW = window.innerWidth - 160;
                var maxH = window.innerHeight - 150;
                menu.style.left = Math.min(x, maxW) + 'px';
                menu.style.top = Math.min(y, maxH) + 'px';
            } else {
                if (menu) menu.style.display = 'none';
            }
        });

        document.addEventListener('click', function(e) {
            if (menu && !menu.contains(e.target)) {
                menu.style.display = 'none';
            }
        });

        var btnPaste = document.getElementById('ctxMenuPaste');
        if (btnPaste) {
            btnPaste.addEventListener('click', function() {
                if (menu) menu.style.display = 'none';
                if (activeTarget) {
                    getSystemClipboardText(function(clipText) {
                        if (clipText) {
                            insertTextIntoElement(activeTarget, clipText, false);
                            showToast('Pasted from clipboard', 'info');
                        } else {
                            showToast('Clipboard is empty', 'error');
                        }
                    });
                }
            });
        }

        var btnCopy = document.getElementById('ctxMenuCopy');
        if (btnCopy) {
            btnCopy.addEventListener('click', function() {
                if (menu) menu.style.display = 'none';
                if (activeTarget) {
                    var selected = activeTarget.value;
                    if (isTextSelectable(activeTarget)) {
                        var start = activeTarget.selectionStart;
                        var end = activeTarget.selectionEnd;
                        if (start !== undefined && end !== undefined && start !== end) {
                            selected = activeTarget.value.substring(start, end);
                        }
                    }
                    if (selected) {
                        setSystemClipboardText(selected);
                        showToast('Copied to clipboard', 'info');
                    }
                }
            });
        }

        var btnCut = document.getElementById('ctxMenuCut');
        if (btnCut) {
            btnCut.addEventListener('click', function() {
                if (menu) menu.style.display = 'none';
                if (activeTarget) {
                    var selected = activeTarget.value;
                    if (isTextSelectable(activeTarget)) {
                        var start = activeTarget.selectionStart;
                        var end = activeTarget.selectionEnd;
                        if (start !== undefined && end !== undefined && start !== end) {
                            selected = activeTarget.value.substring(start, end);
                        }
                    }
                    if (selected) {
                        setSystemClipboardText(selected);
                        insertTextIntoElement(activeTarget, '', !isTextSelectable(activeTarget));
                        showToast('Cut to clipboard', 'info');
                    }
                }
            });
        }

        var btnSelectAll = document.getElementById('ctxMenuSelectAll');
        if (btnSelectAll) {
            btnSelectAll.addEventListener('click', function() {
                if (menu) menu.style.display = 'none';
                if (activeTarget) {
                    activeTarget.focus();
                    activeTarget.select();
                }
            });
        }

        var btnClear = document.getElementById('ctxMenuClear');
        if (btnClear) {
            btnClear.addEventListener('click', function() {
                if (menu) menu.style.display = 'none';
                if (activeTarget) {
                    activeTarget.value = '';
                    activeTarget.dispatchEvent(new Event('input', { bubbles: true }));
                    activeTarget.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        }
    }

    // Global keyboard listener to guarantee Cmd+V / Ctrl+V, Cmd+C, Cmd+X, Cmd+A work in all text inputs
    window.addEventListener('keydown', function(e) {
        var isCmdOrCtrl = e.metaKey || e.ctrlKey;
        if (!isCmdOrCtrl) return;

        var key = e.key ? e.key.toLowerCase() : '';
        var keyCode = e.keyCode || e.which;
        var active = document.activeElement;
        var isInput = active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT');

        if (key === 'v' || keyCode === 86) {
            if (isInput) {
                var clipText = getSystemClipboardTextSync();
                if (clipText) {
                    e.preventDefault();
                    insertTextIntoElement(active, clipText, false);
                    if (active.id === 'rawTextInputDiary') {
                        var rawK = document.getElementById('rawTextInputKeyring');
                        if (rawK) rawK.value = active.value;
                        parseDiaryInput();
                    } else if (active.id === 'rawTextInputKeyring') {
                        var rawD = document.getElementById('rawTextInputDiary');
                        if (rawD) rawD.value = active.value;
                        parseKeyringInput();
                    } else if (active.id === 'rawTextInputNoteBani') {
                        parseNoteBaniInput();
                    } else if (active.id === 'rawTextInputPen') {
                        parsePenInput();
                    }
                }
            }
        } else if (key === 'a' || keyCode === 65) {
            if (isInput) {
                active.select();
            }
        } else if (key === 'c' || keyCode === 67) {
            if (isInput && isTextSelectable(active)) {
                var start = active.selectionStart;
                var end = active.selectionEnd;
                if (start !== undefined && end !== undefined && start !== end) {
                    var selected = active.value.substring(start, end);
                    if (selected) setSystemClipboardText(selected);
                }
            } else if (isInput && active.value) {
                setSystemClipboardText(active.value);
            }
        } else if (key === 'x' || keyCode === 88) {
            if (isInput && isTextSelectable(active)) {
                var start = active.selectionStart;
                var end = active.selectionEnd;
                if (start !== undefined && end !== undefined && start !== end) {
                    var selected = active.value.substring(start, end);
                    if (selected) {
                        setSystemClipboardText(selected);
                        insertTextIntoElement(active, '', false);
                    }
                }
            }
        }
    });

    // Native paste event listener for textareas
    window.addEventListener('paste', function(e) {
        var active = document.activeElement;
        if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')) {
            var text = '';
            if (e.clipboardData && e.clipboardData.getData) {
                text = e.clipboardData.getData('text/plain');
            }
            if (text) {
                e.preventDefault();
                insertTextIntoElement(active, text, false);
                if (active.id === 'rawTextInputDiary') {
                    var rawK = document.getElementById('rawTextInputKeyring');
                    if (rawK) rawK.value = active.value;
                    parseDiaryInput();
                } else if (active.id === 'rawTextInputKeyring') {
                    var rawD = document.getElementById('rawTextInputDiary');
                    if (rawD) rawD.value = active.value;
                    parseKeyringInput();
                } else if (active.id === 'rawTextInputNoteBani') {
                    parseNoteBaniInput();
                } else if (active.id === 'rawTextInputPen') {
                    parsePenInput();
                }
            }
        }
    });


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
            var jsxLiteral = JSON.stringify(extPath + '/jsx/hostscript.jsx');
            fullCode = 'if (typeof CardAutoFiller === "undefined" || typeof __AUTOFILLER_VER__ === "undefined" || __AUTOFILLER_VER__ !== "3.4.0") { try { $.evalFile(new File(' + jsxLiteral + ')); } catch(_e) { try { var _f = new File(' + jsxLiteral + '); if (_f.exists) { _f.encoding = "UTF-8"; _f.open("r"); var _c = _f.read().replace(/^\\s*#[^\\r\\n]*/gm, ""); _f.close(); eval(_c); } } catch(_e2) {} } } ' + code;
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

    function setBtnLabel(btn, text) {
        if (!btn) return;
        var lbl = btn.querySelector('.btn-label');
        if (lbl) lbl.textContent = text;
        else btn.textContent = text;
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

    function pad2Hex(n) {
        var h = Math.max(0, Math.min(255, Math.round(n))).toString(16);
        return h.length < 2 ? ('0' + h) : h;
    }

    function rgbToHex(r, g, b) {
        var hexR = pad2Hex(r);
        var hexG = pad2Hex(g);
        var hexB = pad2Hex(b);
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

    var parsedNoteBanis = [];
    var currentNoteBaniStartIndex = 0;
    var noteBaniSampleProfile = null;
    var sampleNoteBaniData = "১. অলসতাকে কখনো প্রশ্রয় দেবে না; কেননা, তা সাফল্যের পথে প্রধান অন্তরায়।\n— শায়খুল হাদীস আল্লামা আজিজুল হক রহ.\n\n২. ইসলামকে যুগোপযোগী করা যাবে না; বরং যুগকে ইসলাম-উপযোগী করতে হবে।\n— আল্লামা জুনায়েদ বাবুনগরী রহ.\n\n৩. কোন সুন্নতকে ছোট মনে করে ছাড়বে না, আর কোন গুনাহকে ছোট মনে করে করবে না।\n— আল্লামা আশরাফ আলী থানভী রহ.";

    var parsedPenEntries = [];
    var currentPenStartIndex = 0;
    var penSampleProfile = null;
    var penBoxProfile = null;
    var currentPenColor = "#A22F10";
    var currentPenCmyk = [20, 90, 100, 15];
    var samplePenData = "১. হা: মাও: মুহা: শাহ আলম (শুয়াইব)\nপিতা: মুহা: কিতাব আলী\nভাটিয়া মড়লপাড়া, করিমগঞ্জ, কিশোরগঞ্জ\n০১৮৪২২৫২৫৯১৯\nসংখ্যা: ২০\n\n২. হা: মাও: আব্দুল্লাহ সাকিব রাজাপুরী\nপিতা: মুহা: সিরাজ মিয়া\nকাকুরিয়া, নান্দাইল, ময়মনসিংহ | ০১৬১৩৮৬৩৯৭০\n১০\n\n৩. মাওলানা মুহা: মারুফ আহমেদ\nপিতা: মুহা: আলাউদ্দিন প্রামানিক\nকামারপাড়া, বাগাতিপাড়া, নাটোর\n০১৩১৯১৫২৪৮২\n৩০";

    // ==========================================
    // Regex Patterns for Parsing
    // ==========================================
    var serialLineRegex = /^(?:[০-৯0-9]{1,4}|[০-৯0-9]{1,4}[\.\-\)\:]|[০-৯0-9]{1,4}\s*[\.\-\)\:])$/;
    var serialPrefixRegex = /^(?:[০-৯0-9]{1,4}[\.\-\)\:]\s*|[০-৯0-9]{1,4}\s+)/;
    var qtyRegex = /(?:পরিমাণ|পরিমান|সংখ্যা|পিস|রিংস|রিং|কিরিং|কি-রিং|Pcs|Qty|Quantity|Order)\s*[:\-\s]?\s*([০-৯0-9]+)/i;
    var inlineQtyRegex = /[-–—•,\(]?\s*(?:রিংস|রিং|কিরিং|কি-রিং|পরিমাণ|পরিমান|সংখ্যা|পিস|Pcs|Qty|Quantity|Order)\s*[:\-\s]?\s*([০-৯0-9]+)(?:\s*(?:পিস|টি|Pcs))?\s*[\)]?$/i;
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
                    var curHasSerial = serialLineRegex.test(curLines[0]);
                    var nextLine = (i + 1 < lines.length) ? lines[i + 1].trim() : "";
                    var nextLooksLikeName = nextLine && !serialLineRegex.test(nextLine);

                    if (curHasSerial && !nextLooksLikeName) {
                        curLines.push(line);
                    } else {
                        blocks.push(curLines);
                        curLines = [line];
                    }
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

                // Check inline quantity (e.g. "মোবাইল: ০১৩০৪০৩৩৬৪৩ - রিংস ১২" or "রিংস ১২")
                var iqm = lText.match(inlineQtyRegex);
                if (iqm) {
                    item.qty = iqm[1];
                    lText = lText.replace(inlineQtyRegex, '').replace(/[-–—•,:\s]+$/, '').trim();
                    if (!lText) continue;
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

            // If still no qty found, check if last non-meta line is just a standalone count (e.g. "৫০" or "১২")
            if (!item.qty && nonMeta.length > 1) {
                var lastL = nonMeta[nonMeta.length - 1];
                if (/^[০-৯0-9]{1,4}$/.test(lastL)) {
                    item.qty = lastL;
                    nonMeta.pop();
                }
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
            if (!parsedKeyringEntries.length && rawTextInput && rawTextInput.value.trim()) {
                parseKeyringInput();
            }

            if (!parsedKeyringEntries.length) {
                showToast('Please enter data list first (ডেটা লিস্ট দিন)', 'error');
                return;
            }

            var skipFilled = chkSkipFilled ? chkSkipFilled.checked : false;
            var autoRemove = chkAutoRemove ? chkAutoRemove.checked : true;
            var chkKeepTemplateStyle = document.getElementById('chkKeepTemplateStyleKeyring');
            var keepTemplateStyle = chkKeepTemplateStyle ? chkKeepTemplateStyle.checked : true;

            var inputDetHScale = document.getElementById('inputDetailsHScaleKeyring');
            var inputNmHScale = document.getElementById('inputNameHScaleKeyring');
            var detHScale = inputDetHScale ? (parseFloat(inputDetHScale.value) || 100) : 100;
            var nmHScale = inputNmHScale ? (parseFloat(inputNmHScale.value) || 100) : 100;

            var inputDetLead = document.getElementById('inputDetailsLeadingKeyring');
            var inputNmLead = document.getElementById('inputNameLeadingKeyring');
            var detLead = inputDetLead ? inputDetLead.value.trim() : "Auto";
            var nmLead = inputNmLead ? inputNmLead.value.trim() : "Auto";

            var chkAutoFitK = document.getElementById('chkAutoFitKeyring');
            var inputCardWidthK = document.getElementById('inputCardWidthKeyring');
            var inputSafeRightMarginK = document.getElementById('inputSafeRightMarginKeyring');
            var inputSafeWidthK = document.getElementById('inputSafeWidthKeyring');
            var inputMinHScaleK = document.getElementById('inputMinHScaleKeyring');
            var autoFitK = chkAutoFitK ? chkAutoFitK.checked : true;
            var rawCardWidthK = inputCardWidthK ? parseFloat(inputCardWidthK.value) : NaN;
            var cardWidthK = (!isNaN(rawCardWidthK) && rawCardWidthK > 0) ? rawCardWidthK : 0;
            var rawMarginK = inputSafeRightMarginK ? parseFloat(inputSafeRightMarginK.value) : 8.5;
            var safeRightMarginK = (!isNaN(rawMarginK) && rawMarginK >= 0) ? rawMarginK : 8.5;
            var rawSafeWidthK = inputSafeWidthK ? parseFloat(inputSafeWidthK.value) : NaN;
            var safeWidthK = (!isNaN(rawSafeWidthK) && rawSafeWidthK > 0) ? rawSafeWidthK : 0;
            var minHScaleK = inputMinHScaleK ? (parseFloat(inputMinHScaleK.value) || 35) : 35;

            var selectLayoutGridK = document.getElementById('selectLayoutGridKeyring');
            var selectFrameModeK = document.getElementById('selectFrameModeKeyring');
            var layoutGridK = selectLayoutGridK ? selectLayoutGridK.value : "auto";
            var frameModeK = selectFrameModeK ? selectFrameModeK.value : "auto";

            var payload = {
                keepTemplateStyle: keepTemplateStyle,
                autoFit: autoFitK,
                cardWidthMm: cardWidthK,
                safeRightMarginMm: safeRightMarginK,
                safeWidthMm: safeWidthK,
                minHScale: minHScaleK,
                layoutGrid: layoutGridK,
                frameMode: frameModeK,
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
                setBtnLabel(btnAutoFill, 'Populating Keyring Cards...');
            }

            var payloadStr = encodeURIComponent(JSON.stringify(payload));
            var scriptCall = 'populateCards(decodeURIComponent("' + payloadStr + '"))';

            evalHostScript(scriptCall, function(resStr) {
                if (btnAutoFill) {
                    btnAutoFill.disabled = false;
                    setBtnLabel(btnAutoFill, 'Auto Fill Keyring Cards');
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
                setBtnLabel(btnAutoFill, 'Auto Fill Keyring Cards');
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

            var selectLayoutGridD = document.getElementById('selectLayoutGridDiary');
            var selectFrameModeD = document.getElementById('selectFrameModeDiary');
            var layoutGridD = selectLayoutGridD ? selectLayoutGridD.value : "auto";
            var frameModeD = selectFrameModeD ? selectFrameModeD.value : "auto";

            var inputDetHScaleD = document.getElementById('inputDetailsHScaleDiary');
            var inputNmHScaleD = document.getElementById('inputNameHScaleDiary');
            var detHScaleD = inputDetHScaleD ? (parseFloat(inputDetHScaleD.value) || 85) : 85;
            var nmHScaleD = inputNmHScaleD ? (parseFloat(inputNmHScaleD.value) || 80) : 80;

            var inputNmSizeD = document.getElementById('inputNameSizeDiary');
            var inputDetSizeD = document.getElementById('inputDetailsSizeDiary');
            var inputDetLeadD = document.getElementById('inputDetailsLeadingDiary');
            var nmSizeD = inputNmSizeD ? inputNmSizeD.value.trim() : "Auto";
            var detSizeD = inputDetSizeD ? inputDetSizeD.value.trim() : "Auto";
            var detLeadD = inputDetLeadD ? inputDetLeadD.value.trim() : "Auto";

            var chkAutoFitD = document.getElementById('chkAutoFitDiary');
            var inputSafeWidthD = document.getElementById('inputSafeWidthDiary');
            var inputMinHScaleD = document.getElementById('inputMinHScaleDiary');
            var autoFitD = chkAutoFitD ? chkAutoFitD.checked : true;
            var safeWidthD = inputSafeWidthD ? (parseFloat(inputSafeWidthD.value) || 50) : 50;
            var minHScaleD = inputMinHScaleD ? (parseFloat(inputMinHScaleD.value) || 60) : 60;

            var payload = {
                autoFit: autoFitD,
                safeWidthMm: safeWidthD,
                minHScale: minHScaleD,
                layoutGrid: layoutGridD,
                frameMode: frameModeD,
                isKeyring: false,
                fillSerial: (!selectSerialFormat || selectSerialFormat.value === 'standalone'),
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
                skipFilledCards: skipFilled,
                detailsHScale: detHScaleD,
                nameHScale: nmHScaleD,
                nameSize: nmSizeD,
                detailsSize: detSizeD,
                detailsLeading: detLeadD
            };

            if (btnAutoFill) {
                btnAutoFill.disabled = true;
                setBtnLabel(btnAutoFill, 'Populating Diary Names...');
            }

            var payloadStr = encodeURIComponent(JSON.stringify(payload));
            var scriptCall = 'populateCards(decodeURIComponent("' + payloadStr + '"))';

            evalHostScript(scriptCall, function(resStr) {
                if (btnAutoFill) {
                    btnAutoFill.disabled = false;
                    setBtnLabel(btnAutoFill, 'Auto Fill Diary Names');
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
                setBtnLabel(btnAutoFill, 'Auto Fill Diary Names');
            }
            showToast('Error: ' + err.message, 'error');
        }
    }

    // ==========================================
    // Note Bani Batch Parser & Controller
    // ==========================================
    var noteBaniSerialPrefixRegex = /^(?:[০-৯0-9]{1,3}\s*[\.\)\:\-।]\s*|(?:বাণী|বানী|Bani|Quote)\s*[০-৯0-9]*\s*[:\-–—]\s*)/i;
    var noteBaniSerialOnlyRegex = /^(?:[০-৯0-9]{1,3}[\.\)\:\-।]?|(?:বাণী|বানী|Bani)\s*[০-৯0-9]*\s*[:\-–—]?)$/i;
    var noteBaniAuthorLineRegex = /^[\-–—~]/;

    function formatNoteBaniEntry(text, stripSerial, newlineAuthor) {
        if (!text) return "";
        var lines = text.split(/\r\n|\r|\n/);
        var cleanedLines = [];
        for (var i = 0; i < lines.length; i++) {
            var ln = lines[i].trim();
            if (!ln) continue;
            if (i === 0 && stripSerial) {
                if (noteBaniSerialOnlyRegex.test(ln) && lines.length > 1) continue;
                ln = ln.replace(noteBaniSerialPrefixRegex, '').trim();
            }
            if (ln) cleanedLines.push(ln);
        }

        var out = cleanedLines.join('\n').trim();
        if (!out) return "";

        // Optional: put inline " — Author" or " – Author" onto its own second line
        // Note: requires whitespace before dash OR em-dash/en-dash so hyphenated words like "ইসলাম-উপযোগী" are untouched
        if (newlineAuthor && out.indexOf('\n') === -1) {
            var emMatch = out.match(/^(.*?[।!\?\.…]?)\s+([—–]\s*\S.*)$/);
            if (emMatch && emMatch[1].trim().length >= 10) {
                out = emMatch[1].trim() + '\n' + emMatch[2].trim();
            } else {
                var dashMatch = out.match(/^(.*?[।!\?\.…])\s+(-\s*\S.*)$/);
                if (dashMatch && dashMatch[1].trim().length >= 10) {
                    out = dashMatch[1].trim() + '\n' + dashMatch[2].trim();
                }
            }
        }
        return out;
    }

    function parseNoteBaniBlocks(rawText, splitMode) {
        if (!rawText) return [];
        var raw = rawText.replace(/\r\n|\r/g, '\n').trim();
        if (!raw) return [];

        var blocks = [];
        var mode = splitMode || 'auto';

        if (mode === 'line') {
            var allLines = raw.split('\n');
            for (var i = 0; i < allLines.length; i++) {
                var ln = allLines[i].trim();
                if (ln) blocks.push(ln);
            }
            return blocks;
        }

        if (mode === 'blank') {
            var rawParas = raw.split(/\n\s*\n+/);
            for (var p = 0; p < rawParas.length; p++) {
                var blk = rawParas[p].trim();
                if (blk) blocks.push(blk);
            }
            return blocks;
        }

        // Auto mode
        var hasBlankLines = /\n\s*\n/.test(raw);
        if (hasBlankLines) {
            var paras = raw.split(/\n\s*\n+/);
            for (var pi = 0; pi < paras.length; pi++) {
                var pText = paras[pi].trim();
                if (!pText) continue;
                var pLines = pText.split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
                var serialStartCount = 0;
                for (var k = 0; k < pLines.length; k++) {
                    if (noteBaniSerialPrefixRegex.test(pLines[k]) || noteBaniSerialOnlyRegex.test(pLines[k])) {
                        serialStartCount++;
                    }
                }
                if (serialStartCount >= 2) {
                    var subCur = [];
                    for (var sIdx = 0; sIdx < pLines.length; sIdx++) {
                        var isSer = noteBaniSerialPrefixRegex.test(pLines[sIdx]) || noteBaniSerialOnlyRegex.test(pLines[sIdx]);
                        if (isSer && subCur.length > 0 && !noteBaniSerialOnlyRegex.test(subCur[subCur.length - 1])) {
                            blocks.push(subCur.join('\n'));
                            subCur = [pLines[sIdx]];
                        } else {
                            subCur.push(pLines[sIdx]);
                        }
                    }
                    if (subCur.length > 0) blocks.push(subCur.join('\n'));
                } else {
                    blocks.push(pLines.join('\n'));
                }
            }
            return blocks;
        }

        // No blank lines: check for numbered prefixes or author lines starting with dash
        var lines = raw.split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
        var serialCount = 0;
        var authorDashCount = 0;
        for (var li = 0; li < lines.length; li++) {
            if (noteBaniSerialPrefixRegex.test(lines[li]) || noteBaniSerialOnlyRegex.test(lines[li])) serialCount++;
            if (li > 0 && noteBaniAuthorLineRegex.test(lines[li])) authorDashCount++;
        }

        if (serialCount >= 2) {
            var cur = [];
            for (var j = 0; j < lines.length; j++) {
                var isStart = noteBaniSerialPrefixRegex.test(lines[j]) || noteBaniSerialOnlyRegex.test(lines[j]);
                if (isStart && cur.length > 0 && !noteBaniSerialOnlyRegex.test(cur[cur.length - 1])) {
                    blocks.push(cur.join('\n'));
                    cur = [lines[j]];
                } else {
                    cur.push(lines[j]);
                }
            }
            if (cur.length > 0) blocks.push(cur.join('\n'));
            return blocks;
        }

        if (authorDashCount >= 1) {
            var curA = [];
            for (var a = 0; a < lines.length; a++) {
                if (noteBaniAuthorLineRegex.test(lines[a]) && curA.length > 0) {
                    curA.push(lines[a]);
                    blocks.push(curA.join('\n'));
                    curA = [];
                } else {
                    if (curA.length > 0) {
                        blocks.push(curA.join('\n'));
                        curA = [];
                    }
                    curA.push(lines[a]);
                }
            }
            if (curA.length > 0) blocks.push(curA.join('\n'));
            return blocks;
        }

        return lines;
    }

    function parseNoteBaniInput() {
        var rawInput = document.getElementById('rawTextInputNoteBani');
        var selectSplit = document.getElementById('selectSplitModeNoteBani');
        var chkStrip = document.getElementById('chkStripSerialNoteBani');
        var chkNewlineAuthor = document.getElementById('chkNewlineAuthorNoteBani');

        var raw = rawInput ? rawInput.value.trim() : '';
        var splitMode = selectSplit ? selectSplit.value : 'auto';
        var stripSerial = chkStrip ? chkStrip.checked : true;
        var newlineAuthor = chkNewlineAuthor ? chkNewlineAuthor.checked : true;

        parsedNoteBanis = [];
        if (!raw) {
            renderNoteBaniPreview();
            return;
        }

        var blocks = parseNoteBaniBlocks(raw, splitMode);
        for (var i = 0; i < blocks.length; i++) {
            var formatted = formatNoteBaniEntry(blocks[i], stripSerial, newlineAuthor);
            if (!formatted) continue;
            parsedNoteBanis.push({
                rawText: blocks[i],
                text: formatted
            });
        }

        renderNoteBaniPreview();
    }

    function renderNoteBaniPreview() {
        var previewList = document.getElementById('previewListNoteBani');
        var countBadge = document.getElementById('entriesCountBadgeNoteBani');
        if (!previewList) return;
        previewList.innerHTML = '';

        if (countBadge) {
            var rem = Math.max(0, parsedNoteBanis.length - currentNoteBaniStartIndex);
            if (currentNoteBaniStartIndex > 0) {
                countBadge.textContent = 'Remaining: ' + rem + ' / ' + parsedNoteBanis.length + ' Banis';
            } else {
                countBadge.textContent = parsedNoteBanis.length + ' Banis';
            }
        }

        if (!parsedNoteBanis.length) {
            previewList.innerHTML = '<div class="empty-text">No quotes parsed. Paste 16–32 Banis above or click "Sample".</div>';
            return;
        }

        var fragment = document.createDocumentFragment();
        parsedNoteBanis.forEach(function(item, idx) {
            var itemEl = document.createElement('div');
            itemEl.className = 'preview-item';
            if (idx < currentNoteBaniStartIndex) {
                itemEl.classList.add('filled');
            }

            var lines = item.text.split('\n');
            var topRow = document.createElement('div');
            topRow.className = 'preview-header-row';

            var nameEl = document.createElement('div');
            nameEl.className = 'preview-name';
            nameEl.textContent = lines[0];

            var badgeEl = document.createElement('div');
            badgeEl.className = 'preview-badge';
            if (idx < currentNoteBaniStartIndex) {
                badgeEl.textContent = 'Placed #' + (idx + 1);
                badgeEl.classList.add('badge-filled');
            } else {
                badgeEl.textContent = 'Page #' + (idx + 1);
                badgeEl.classList.add('badge-next');
            }

            topRow.appendChild(nameEl);
            topRow.appendChild(badgeEl);
            itemEl.appendChild(topRow);

            if (lines.length > 1) {
                var detEl = document.createElement('div');
                detEl.className = 'preview-details';
                detEl.textContent = lines.slice(1).join(' • ');
                itemEl.appendChild(detEl);
            }

            fragment.appendChild(itemEl);
        });

        previewList.appendChild(fragment);
    }

    function updateNoteBaniSlotUI(count, fontName, fontSize, isLocked) {
        var statusText = document.getElementById('noteSlotStatusText');
        var countBadge = document.getElementById('noteSlotCountBadge');
        var btnResetSample = document.getElementById('btnResetSampleNoteBani');

        if (countBadge) {
            countBadge.textContent = (count || 0) + ' Slots';
            if (isLocked) countBadge.classList.add('locked');
            else countBadge.classList.remove('locked');
        }
        if (btnResetSample) {
            btnResetSample.style.display = noteBaniSampleProfile ? 'inline-flex' : 'none';
        }
        if (statusText) {
            if (noteBaniSampleProfile) {
                statusText.textContent = 'Sample Locked: ' + (noteBaniSampleProfile.fontName || 'Font') + ' (' + noteBaniSampleProfile.size + 'pt)';
            } else if (count > 0 && fontName) {
                statusText.textContent = 'Detected: ' + fontName + ' (' + fontSize + 'pt)';
            } else {
                statusText.textContent = 'Auto-detect ready (সব পেজের নিচের বাণী ধরবে)';
            }
        }
    }

    function executeScanNoteBanis(silent) {
        var selectScope = document.getElementById('selectScopeNoteBani');
        var selectOrder = document.getElementById('selectOrderNoteBani');
        var payload = {
            scope: selectScope ? selectScope.value : 'all_artboards',
            order: selectOrder ? selectOrder.value : 'artboard_order',
            sampleProfile: noteBaniSampleProfile
        };
        var payloadStr = encodeURIComponent(JSON.stringify(payload));
        evalHostScript('scanNoteBanis(decodeURIComponent("' + payloadStr + '"))', function(resStr) {
            try {
                var res = JSON.parse(resStr);
                if (res.status === 'success') {
                    updateNoteBaniSlotUI(res.count || 0, res.fontName || '', res.fontSize || 0, !!noteBaniSampleProfile);
                    if (!silent) {
                        showToast(res.message, res.count > 0 ? 'success' : 'info');
                    }
                } else if (!silent) {
                    showToast(res.message || 'Could not scan document', 'error');
                }
            } catch(e) {
                if (!silent) showToast('Failed to scan Note Bani slots', 'error');
            }
        });
    }

    function executePickNoteBaniSample() {
        evalHostScript('pickNoteBaniSample()', function(resStr) {
            try {
                var res = JSON.parse(resStr);
                if (res.status === 'success' && res.sample) {
                    noteBaniSampleProfile = res.sample;
                    updateNoteBaniSlotUI(0, res.sample.fontName, res.sample.size, true);
                    showToast(res.message, 'success');
                    executeScanNoteBanis(true);
                } else {
                    showToast(res.message || 'Select 1 Bani TextFrame on canvas first', 'error');
                }
            } catch(e) {
                showToast('Failed to pick sample Bani frame', 'error');
            }
        });
    }

    function executeAutoFillNoteBanis() {
        var btnRun = document.getElementById('btnAutoFillNoteBani');
        var rawInput = document.getElementById('rawTextInputNoteBani');
        var selectScope = document.getElementById('selectScopeNoteBani');
        var selectOrder = document.getElementById('selectOrderNoteBani');
        var chkPreserve = document.getElementById('chkPreserveNoteStyle');
        var chkAutoWrap = document.getElementById('chkAutoWrapNoteBani');
        var selectMaxLines = document.getElementById('selectMaxLinesNoteBani');
        var inputMaxWidth = document.getElementById('inputMaxWidthNoteBani');
        var inputMinSize = document.getElementById('inputMinFontSizeNoteBani');
        var inputSideMargin = document.getElementById('inputSideMarginNoteBani');
        var inputBottomMargin = document.getElementById('inputBottomMarginNoteBani');
        var chkAutoRemove = document.getElementById('chkAutoRemoveNoteBani');
        var inputStartIdx = document.getElementById('inputStartIndexNoteBani');

        try {
            if (!parsedNoteBanis.length && rawInput && rawInput.value.trim()) {
                parseNoteBaniInput();
            }
            if (!parsedNoteBanis.length) {
                showToast('আগে বাণীর লিস্ট পেস্ট করুন', 'error');
                return;
            }

            var rawMaxW = inputMaxWidth ? inputMaxWidth.value.trim() : 'Auto';
            var parsedMaxW = /^auto$/i.test(rawMaxW) ? 0 : (parseFloat(rawMaxW) || 0);
            var maxLinesVal = selectMaxLines ? selectMaxLines.value : 'auto';
            var minSizeVal = inputMinSize ? (parseFloat(inputMinSize.value) || 6.5) : 6.5;
            var sideMarginVal = inputSideMargin ? parseFloat(inputSideMargin.value) : 20;
            if (isNaN(sideMarginVal) || sideMarginVal < 0) sideMarginVal = 20;
            var bottomMarginVal = inputBottomMargin ? parseFloat(inputBottomMargin.value) : 7;
            if (isNaN(bottomMarginVal) || bottomMarginVal < 0) bottomMarginVal = 7;

            var entryTexts = parsedNoteBanis.map(function(e) { return e.text; });
            var payload = {
                entries: entryTexts,
                startIndex: currentNoteBaniStartIndex,
                scope: selectScope ? selectScope.value : 'all_artboards',
                order: selectOrder ? selectOrder.value : 'artboard_order',
                preserveStyle: chkPreserve ? chkPreserve.checked : true,
                autoWrapFit: chkAutoWrap ? chkAutoWrap.checked : true,
                maxWidthMm: parsedMaxW,
                maxLines: maxLinesVal,
                minFontSize: minSizeVal,
                sideMarginMm: sideMarginVal,
                bottomMarginMm: bottomMarginVal,
                sampleProfile: noteBaniSampleProfile
            };

            if (btnRun) {
                btnRun.disabled = true;
                setBtnLabel(btnRun, 'Placing Note Banis...');
            }

            var payloadStr = encodeURIComponent(JSON.stringify(payload));
            evalHostScript('populateNoteBanis(decodeURIComponent("' + payloadStr + '"))', function(resStr) {
                if (btnRun) {
                    btnRun.disabled = false;
                    setBtnLabel(btnRun, 'Auto Fill Note Banis');
                }
                try {
                    var res = JSON.parse(resStr);
                    if (res.status === 'success') {
                        updateNoteBaniSlotUI(res.totalSlots || 0, res.fontName || '', res.fontSize || 0, !!noteBaniSampleProfile);
                        var placed = res.filledCount || 0;
                        var autoRemove = chkAutoRemove ? chkAutoRemove.checked : false;
                        if (autoRemove) {
                            var remaining = parsedNoteBanis.slice(currentNoteBaniStartIndex + placed);
                            if (rawInput) {
                                rawInput.value = remaining.map(function(e) { return e.rawText || e.text; }).join('\n\n');
                            }
                            currentNoteBaniStartIndex = 0;
                            if (inputStartIdx) inputStartIdx.value = 1;
                            parseNoteBaniInput();
                        } else {
                            if (res.nextStartIndex < parsedNoteBanis.length) {
                                currentNoteBaniStartIndex = res.nextStartIndex;
                                if (inputStartIdx) inputStartIdx.value = currentNoteBaniStartIndex + 1;
                            } else {
                                currentNoteBaniStartIndex = 0;
                                if (inputStartIdx) inputStartIdx.value = 1;
                            }
                            renderNoteBaniPreview();
                        }
                        showToast(res.message || ('Placed ' + placed + ' Note Bani(s)!'), 'success');
                    } else {
                        showToast(res.message || 'Failed to populate Note Banis', 'error');
                    }
                } catch(e) {
                    showToast('Note Banis placed!', 'info');
                }
            });
        } catch(err) {
            if (btnRun) {
                btnRun.disabled = false;
                setBtnLabel(btnRun, 'Auto Fill Note Banis');
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
            setBtnLabel(btnRun, 'Generating Templates...');
        }

        var payloadStr = encodeURIComponent(JSON.stringify(payload));
        var scriptCall = 'duplicateCardTemplates(decodeURIComponent("' + payloadStr + '"))';
        evalHostScript(scriptCall, function(resStr) {
            if (btnRun) {
                btnRun.disabled = false;
                setBtnLabel(btnRun, 'Duplicate Templates & Create Artboards');
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
    // Pen Strip Parser & Controller
    // ==========================================
    var penQtyLineRegex = /^(?:পরিমাণ|পরিমান|সংখ্যা|কলম|পেন|পিস|রিংস|রিং|কিরিং|কি-রিং|Pcs|Pen|Pens|Qty|Quantity|Order)\s*[:\-\s]?\s*([০-৯0-9]{1,4})\s*(?:পিস|টি|কলম|পেন|Pcs|Pc|Pens?)?$/i;
    var penInlineQtyRegex = /(?:[-–—•,\(\[]|\s)(?:কলম|পেন|পরিমাণ|পরিমান|সংখ্যা|পিস|টি|Pen|Pens|Pcs|Qty|Quantity|Order)\s*[:\-\s]?\s*([০-৯0-9]{1,4})(?:\s*(?:পিস|টি|কলম|পেন|Pcs|Pc|Pens?))?\s*[\)\]]?$/i;
    var penNumUnitSuffixRegex = /(?:\s*[-–—•,:\|]\s*|\s+)([০-৯0-9]{1,4})\s*(?:পিস|টি|কলম|পেন|Pcs|Pc|Pens?)\s*$/i;
    var penParenQtyRegex = /[\(\[]\s*([০-৯0-9]{1,4})\s*(?:পিস|টি|কলম|পেন|Pcs|Pc|Pens?)?\s*[\)\]]$/i;
    var penAfterPhoneQtyRegex = /^(.+?(?:\+?88)?[০-৯0-9]{8,}[০-৯0-9\-\s,]*)\s+[-–—]\s*([০-৯0-9]{1,4})(?:\s*(?:পিস|টি|কলম|পেন|Pcs|Pc|Pens?))?\s*$/i;
    var penSerialWithNameRegex = /^[০-৯0-9]{1,4}[\.\-\)]\s+\S/;
    var penFatherRegex = /^(?:পিতা|মাতা|পিতার\s*নাম|বাবার\s*নাম|অভিভাবক|Father|S\/O|C\/O|wcZv)/i;
    var penPhonePrefixRegex = /^(?:মোবাইল|ফোন|যোগাযোগ|নাম্বার|মোবাঃ|মোঃ|Mobile|Phone|Mob|Cell|Contact)\s*[:\-]?\s*/i;

    function isPenPhoneOnlyLine(line) {
        if (!line) return false;
        var stripped = line.replace(penPhonePrefixRegex, '').trim();
        if (!stripped) return false;
        if (/[a-zA-Z\u0980-\u09E5\u09F0-\u09FF]/.test(stripped.replace(/(?:মোবাইল|ফোন|Mobile|Phone|Cell)/gi, ''))) {
            return false;
        }
        var digits = stripped.replace(/[^০-৯0-9]/g, '');
        return digits.length >= 8;
    }

    function stripPenPhoneLabel(line) {
        if (!line) return '';
        return line.replace(penPhonePrefixRegex, '').trim();
    }

    function buildPenEntryFromLines(blk, stripNum, combineAddrPhone, rawBlockText) {
        var item = {
            serial: '',
            name: '',
            lines: [],
            details: '',
            qty: '',
            rawText: rawBlockText || blk.join('\n')
        };

        var nonMeta = [];
        for (var l = 0; l < blk.length; l++) {
            var lText = blk[l].trim();
            if (!lText) continue;

            var qLineM = lText.match(penQtyLineRegex);
            if (qLineM) {
                item.qty = qLineM[1];
                continue;
            }

            var iqM = lText.match(penInlineQtyRegex);
            if (iqM) {
                item.qty = iqM[1];
                lText = lText.replace(penInlineQtyRegex, '').replace(/[-–—•,:\s]+$/, '').trim();
                if (!lText) continue;
            } else {
                var nuM = lText.match(penNumUnitSuffixRegex);
                if (nuM) {
                    item.qty = nuM[1];
                    lText = lText.replace(penNumUnitSuffixRegex, '').replace(/[-–—•,:\s]+$/, '').trim();
                    if (!lText) continue;
                } else {
                    var pqM = lText.match(penParenQtyRegex);
                    if (pqM && lText.length > pqM[0].length + 3) {
                        item.qty = pqM[1];
                        lText = lText.substring(0, lText.length - pqM[0].length).replace(/[-–—•,:\s]+$/, '').trim();
                        if (!lText) continue;
                    } else {
                        var apM = lText.match(penAfterPhoneQtyRegex);
                        if (apM) {
                            item.qty = apM[2];
                            lText = apM[1].trim();
                        }
                    }
                }
            }

            if (l === 0 && !item.serial && serialLineRegex.test(lText)) {
                item.serial = lText.replace(/[\.\-\)\:\s]/g, '');
                continue;
            }

            nonMeta.push(lText);
        }

        if (!item.qty && nonMeta.length > 1) {
            var lastL = nonMeta[nonMeta.length - 1];
            if (/^[০-৯0-9]{1,4}$/.test(lastL)) {
                item.qty = lastL;
                nonMeta.pop();
            }
        }

        if (!nonMeta.length) return null;

        var rawName = nonMeta[0];
        var cleanName = rawName.replace(serialPrefixRegex, '').trim();
        if (!item.serial) {
            var mPref = rawName.match(serialPrefixRegex);
            if (mPref) item.serial = mPref[0].replace(/[\.\-\)\:\s]/g, '');
        }

        item.name = stripNum ? cleanName : rawName;
        if (!item.name) return null;

        var rest = nonMeta.slice(1);
        var finalLines = [item.name];

        if (combineAddrPhone && rest.length >= 2) {
            if (rest.length >= 3) {
                finalLines.push(rest[0]);
                var tail = rest.slice(1);
                var addrParts = [];
                var phoneParts = [];
                for (var t = 0; t < tail.length; t++) {
                    if (isPenPhoneOnlyLine(tail[t])) {
                        phoneParts.push(stripPenPhoneLabel(tail[t]));
                    } else {
                        addrParts.push(tail[t]);
                    }
                }
                if (addrParts.length > 0 && phoneParts.length > 0) {
                    finalLines.push(addrParts.join(', ') + ' | ' + phoneParts.join(', '));
                } else if (addrParts.length > 0) {
                    finalLines.push(addrParts.join(', '));
                } else if (phoneParts.length > 0) {
                    finalLines.push(phoneParts.join(', '));
                }
            } else {
                // Exactly 2 detail lines
                if (!penFatherRegex.test(rest[0]) && isPenPhoneOnlyLine(rest[1])) {
                    finalLines.push(rest[0] + ' | ' + stripPenPhoneLabel(rest[1]));
                } else {
                    finalLines.push(rest[0]);
                    finalLines.push(rest[1]);
                }
            }
        } else {
            for (var r = 0; r < rest.length; r++) {
                finalLines.push(rest[r]);
            }
        }

        item.lines = finalLines;
        item.details = finalLines.slice(1).join('\n');
        return item;
    }

    function parsePenBlocks(rawText, stripNum, combineAddrPhone) {
        if (!rawText) return [];
        var normalized = rawText.replace(/\r\n|\r/g, '\n').trim();
        if (!normalized) return [];

        var rawLines = normalized.split('\n');
        var tabLineCount = 0;
        var nonEmptyCount = 0;
        for (var tl = 0; tl < rawLines.length; tl++) {
            var trimmed = rawLines[tl].trim();
            if (!trimmed) continue;
            nonEmptyCount++;
            if (trimmed.indexOf('\t') !== -1) tabLineCount++;
        }

        var result = [];
        // Support spreadsheet/Excel tab-separated rows
        if (nonEmptyCount >= 1 && tabLineCount === nonEmptyCount && tabLineCount >= 1) {
            for (var ti = 0; ti < rawLines.length; ti++) {
                var row = rawLines[ti].trim();
                if (!row) continue;
                var cols = row.split('\t').map(function(c) { return c.trim(); }).filter(Boolean);
                var entryT = buildPenEntryFromLines(cols, stripNum, combineAddrPhone, row);
                if (entryT) result.push(entryT);
            }
            return result;
        }

        var blocks = [];
        var curLines = [];

        for (var i = 0; i < rawLines.length; i++) {
            var line = rawLines[i].trim();
            if (!line) {
                if (curLines.length > 0) {
                    blocks.push(curLines);
                    curLines = [];
                }
            } else {
                var isSerial = serialLineRegex.test(line) && line.replace(/\D/g, '').length < 6;
                var isSerialWithName = penSerialWithNameRegex.test(line);
                if (curLines.length >= 2 && isSerialWithName) {
                    blocks.push(curLines);
                    curLines = [line];
                } else if (curLines.length >= 2 && isSerial) {
                    var hasPunct = /[\.\-\)\:]/.test(line);
                    var curHasSerial = serialLineRegex.test(curLines[0]);
                    var nextLine = (i + 1 < rawLines.length) ? rawLines[i + 1].trim() : '';
                    var nextIsSerial = nextLine && serialLineRegex.test(nextLine);
                    var nextLooksLikeName = nextLine && !nextIsSerial && !penQtyLineRegex.test(nextLine);

                    if (!hasPunct && nextIsSerial) {
                        // Trailing bare qty (e.g. "20") right before next serial ("২")
                        curLines.push(line);
                    } else if (curHasSerial && nextLooksLikeName) {
                        blocks.push(curLines);
                        curLines = [line];
                    } else if (hasPunct && nextLooksLikeName) {
                        blocks.push(curLines);
                        curLines = [line];
                    } else {
                        curLines.push(line);
                    }
                } else {
                    curLines.push(line);
                }
            }
        }
        if (curLines.length > 0) blocks.push(curLines);

        for (var b = 0; b < blocks.length; b++) {
            var entry = buildPenEntryFromLines(blocks[b], stripNum, combineAddrPhone, blocks[b].join('\n'));
            if (entry) result.push(entry);
        }

        return result;
    }

    function parsePenInput() {
        var rawInput = document.getElementById('rawTextInputPen');
        var chkStrip = document.getElementById('chkStripNumberPen');
        var chkCombine = document.getElementById('chkCombineAddressPhonePen');
        var raw = rawInput ? rawInput.value.trim() : '';
        var stripNum = chkStrip ? chkStrip.checked : true;
        var combineAddrPhone = chkCombine ? chkCombine.checked : true;

        parsedPenEntries = parsePenBlocks(raw, stripNum, combineAddrPhone);
        renderPenPreview();
    }

    function renderPenPreview() {
        var previewList = document.getElementById('previewListPen');
        var countBadge = document.getElementById('entriesCountBadgePen');
        if (!previewList) return;
        previewList.innerHTML = '';

        if (countBadge) {
            var rem = Math.max(0, parsedPenEntries.length - currentPenStartIndex);
            if (currentPenStartIndex > 0) {
                countBadge.textContent = 'Remaining: ' + rem + ' / ' + parsedPenEntries.length + ' Entries';
            } else {
                countBadge.textContent = parsedPenEntries.length + ' Entries';
            }
        }

        if (!parsedPenEntries.length) {
            previewList.innerHTML = '<div class="empty-text">No entries parsed. Paste pen list above or click "Sample".</div>';
            return;
        }

        var fragment = document.createDocumentFragment();
        parsedPenEntries.forEach(function(entry, idx) {
            var itemEl = document.createElement('div');
            itemEl.className = 'preview-item';
            if (idx < currentPenStartIndex) {
                itemEl.classList.add('filled');
            }

            var topRow = document.createElement('div');
            topRow.className = 'preview-header-row';

            var nameEl = document.createElement('div');
            nameEl.className = 'preview-name';
            nameEl.textContent = entry.name || '(Empty Name)';

            var badgeEl = document.createElement('div');
            badgeEl.className = 'preview-badge';
            if (idx < currentPenStartIndex) {
                badgeEl.textContent = 'Filled #' + (idx + 1);
                badgeEl.classList.add('badge-filled');
            } else {
                badgeEl.textContent = (entry.qty ? (entry.qty + ' পিস ') : '') + '#' + (idx + 1);
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

    function updatePenStatusUI(cardCount, summaryText, isLocked) {
        var statusText = document.getElementById('penSlotStatusText');
        var countBadge = document.getElementById('penSlotCountBadge');
        var btnReset = document.getElementById('btnResetSamplePen');

        var hasLock = !!(penSampleProfile || penBoxProfile || isLocked);
        if (btnReset) {
            btnReset.style.display = hasLock ? 'inline-flex' : 'none';
        }
        if (countBadge) {
            if (typeof cardCount === 'number' && cardCount > 0) {
                countBadge.textContent = cardCount + ' Cards';
            } else if (penBoxProfile) {
                countBadge.textContent = penBoxProfile.widthMm + '×' + penBoxProfile.heightMm + 'mm';
            } else if (penSampleProfile) {
                countBadge.textContent = 'Card 1 Locked';
            } else {
                countBadge.textContent = 'Auto';
            }
            if (hasLock) countBadge.classList.add('locked');
            else countBadge.classList.remove('locked');
        }
        if (statusText) {
            if (summaryText) {
                statusText.textContent = summaryText;
            } else if (penSampleProfile && penBoxProfile) {
                statusText.textContent = 'Locked: ' + (penSampleProfile.fontName || 'Card 1') + ' • Box ' + penBoxProfile.widthMm + '×' + penBoxProfile.heightMm + 'mm';
            } else if (penSampleProfile) {
                statusText.textContent = 'Locked Card 1: ' + (penSampleProfile.fontName || 'Font') + (penSampleProfile.nameColorHex ? (' • ' + penSampleProfile.nameColorHex) : '');
            } else if (penBoxProfile) {
                statusText.textContent = 'Locked Box: ' + penBoxProfile.widthMm + ' × ' + penBoxProfile.heightMm + ' mm';
            } else {
                statusText.textContent = 'Auto: ১ম কার্ডের কালার ও মাপ অনুযায়ী বসবে';
            }
        }
    }

    function buildPenPayload() {
        var selectScope = document.getElementById('selectScopePen');
        var selectOrder = document.getElementById('selectFillOrderPen');
        var chkAutoFit = document.getElementById('chkAutoFitPen');
        var inputW = document.getElementById('inputTargetWidthPen');
        var inputH = document.getElementById('inputTargetHeightPen');
        var chkExpand = document.getElementById('chkExpandShortPen');
        var inputMinName = document.getElementById('inputMinNameHScalePen');
        var inputMaxName = document.getElementById('inputMaxNameHScalePen');
        var inputMinFather = document.getElementById('inputMinFatherHScalePen');
        var inputMaxFather = document.getElementById('inputMaxFatherHScalePen');
        var inputMinLast = document.getElementById('inputMinLastHScalePen');
        var inputMinSize = document.getElementById('inputMinFontSizePen');
        var chkKeepCard1 = document.getElementById('chkKeepCard1StylePen');
        var chkBold = document.getElementById('chkMakeBoldPen');
        var chkCombine = document.getElementById('chkCombineAddressPhonePen');
        var chkStrip = document.getElementById('chkStripNumberPen');
        var chkFillQty = document.getElementById('chkFillQtyPen');
        var selectQtyFmt = document.getElementById('selectQtyFormatPen');
        var chkSkipFirst = document.getElementById('chkSkipFirstCardPen');
        var chkSkipFilled = document.getElementById('chkSkipFilledPen');
        var chkOverrideColor = document.getElementById('chkOverrideColorPen');

        var rawW = inputW ? inputW.value.trim() : 'Auto';
        var parsedW = /^auto$/i.test(rawW) ? 0 : (parseFloat(rawW) || 0);
        var rawH = inputH ? inputH.value.trim() : 'Auto';
        var parsedH = /^auto$/i.test(rawH) ? 0 : (parseFloat(rawH) || 0);

        return {
            entries: parsedPenEntries,
            startIndex: currentPenStartIndex,
            scope: selectScope ? selectScope.value : 'artboard',
            order: selectOrder ? selectOrder.value : 'column',
            autoFit: chkAutoFit ? chkAutoFit.checked : true,
            targetWidthMm: parsedW,
            targetHeightMm: parsedH,
            expandShort: chkExpand ? chkExpand.checked : true,
            minNameHScale: inputMinName ? (parseFloat(inputMinName.value) || 45) : 45,
            maxNameHScale: inputMaxName ? (parseFloat(inputMaxName.value) || 130) : 130,
            minFatherHScale: inputMinFather ? (parseFloat(inputMinFather.value) || 45) : 45,
            maxFatherHScale: inputMaxFather ? (parseFloat(inputMaxFather.value) || 115) : 115,
            minLastHScale: inputMinLast ? (parseFloat(inputMinLast.value) || 35) : 35,
            minFontSize: inputMinSize ? (parseFloat(inputMinSize.value) || 4.0) : 4.0,
            keepCard1Style: chkKeepCard1 ? chkKeepCard1.checked : true,
            makeBold: chkBold ? chkBold.checked : true,
            combineAddressPhone: chkCombine ? chkCombine.checked : true,
            stripNumber: chkStrip ? chkStrip.checked : true,
            fillQty: chkFillQty ? chkFillQty.checked : true,
            qtyFormat: selectQtyFmt ? selectQtyFmt.value : 'auto',
            skipFirstCard: chkSkipFirst ? chkSkipFirst.checked : false,
            skipFilledCards: chkSkipFilled ? chkSkipFilled.checked : true,
            overrideColor: chkOverrideColor ? chkOverrideColor.checked : false,
            nameColor: currentPenColor,
            nameCmyk: currentPenCmyk,
            sampleProfile: penSampleProfile,
            boxProfile: penBoxProfile
        };
    }

    function executeScanPenCards(silent) {
        var payload = buildPenPayload();
        var payloadStr = encodeURIComponent(JSON.stringify({
            scope: payload.scope,
            order: payload.order,
            targetWidthMm: payload.targetWidthMm,
            targetHeightMm: payload.targetHeightMm,
            sampleProfile: penSampleProfile,
            boxProfile: penBoxProfile
        }));
        evalHostScript('scanPenCards(decodeURIComponent("' + payloadStr + '"))', function(resStr) {
            try {
                var res = JSON.parse(resStr);
                if (res.status === 'success') {
                    updatePenStatusUI(res.count || 0, res.summary || '', !!(penSampleProfile || penBoxProfile));
                    if (!silent) {
                        showToast(res.message || ('Detected ' + res.count + ' Pen cards'), res.count > 0 ? 'success' : 'info');
                    }
                } else if (!silent) {
                    showToast(res.message || 'Could not scan Pen cards', 'error');
                }
            } catch(e) {
                if (!silent) showToast('Failed to scan Pen cards', 'error');
            }
        });
    }

    function executePickPenSample() {
        evalHostScript('pickPenSample()', function(resStr) {
            try {
                var res = JSON.parse(resStr);
                if (res.status === 'success' && res.sample) {
                    penSampleProfile = res.sample;
                    var inW = document.getElementById('inputTargetWidthPen');
                    var inH = document.getElementById('inputTargetHeightPen');
                    if (res.sample.boxWidthMm > 0 && inW && (!inW.value || /^auto$/i.test(inW.value.trim()))) {
                        inW.value = res.sample.boxWidthMm;
                    }
                    if (res.sample.boxHeightMm > 0 && inH && (!inH.value || /^auto$/i.test(inH.value.trim()))) {
                        inH.value = res.sample.boxHeightMm;
                    }
                    updatePenStatusUI(null, res.summary || '', true);
                    showToast(res.message || 'Locked Card 1 style!', 'success');
                    executeScanPenCards(true);
                } else {
                    showToast(res.message || 'Select 1st Pen card or text frame on canvas first', 'error');
                }
            } catch(e) {
                showToast('Failed to pick 1st Pen card', 'error');
            }
        });
    }

    function executePickPenBox() {
        evalHostScript('pickPenBox()', function(resStr) {
            try {
                var res = JSON.parse(resStr);
                if (res.status === 'success' && res.box) {
                    penBoxProfile = res.box;
                    var inW = document.getElementById('inputTargetWidthPen');
                    var inH = document.getElementById('inputTargetHeightPen');
                    if (inW && res.box.widthMm > 0) inW.value = res.box.widthMm;
                    if (inH && res.box.heightMm > 0) inH.value = res.box.heightMm;
                    updatePenStatusUI(null, 'Box Locked: ' + res.box.widthMm + ' × ' + res.box.heightMm + ' mm', true);
                    showToast(res.message || ('Locked Box: ' + res.box.widthMm + ' × ' + res.box.heightMm + ' mm'), 'success');
                    executeScanPenCards(true);
                } else {
                    showToast(res.message || 'Select target rectangle (e.g. 25x5mm) on canvas first', 'error');
                }
            } catch(e) {
                showToast('Failed to pick box size', 'error');
            }
        });
    }

    function executeAutoFillPen() {
        var btnRun = document.getElementById('btnAutoFillPen');
        var rawInput = document.getElementById('rawTextInputPen');
        var chkAutoRemove = document.getElementById('chkAutoRemoveFilledPen');
        var inputStartIdx = document.getElementById('inputStartIndexPen');

        try {
            if (!parsedPenEntries.length && rawInput && rawInput.value.trim()) {
                parsePenInput();
            }
            if (!parsedPenEntries.length) {
                showToast('কলমের নামের লিস্ট আগে পেস্ট করুন', 'error');
                return;
            }

            var autoRemove = chkAutoRemove ? chkAutoRemove.checked : true;
            var payload = buildPenPayload();

            if (btnRun) {
                btnRun.disabled = true;
                setBtnLabel(btnRun, 'Populating Pen Cards...');
            }

            var payloadStr = encodeURIComponent(JSON.stringify(payload));
            evalHostScript('populatePenCards(decodeURIComponent("' + payloadStr + '"))', function(resStr) {
                if (btnRun) {
                    btnRun.disabled = false;
                    setBtnLabel(btnRun, 'Auto Fill Pen Cards');
                }
                try {
                    var res = JSON.parse(resStr);
                    if (res.status === 'success') {
                        updatePenStatusUI(res.totalCards || 0, res.summary || '', !!(penSampleProfile || penBoxProfile));
                        var placed = res.filledCount || 0;
                        var consumedEnd = (res.consumedEndIndex !== undefined) ? res.consumedEndIndex : (currentPenStartIndex + placed);
                        if (autoRemove) {
                            var remaining = parsedPenEntries.slice(consumedEnd);
                            if (rawInput) {
                                rawInput.value = remaining.map(function(e) { return e.rawText || e.name; }).join('\n\n');
                            }
                            currentPenStartIndex = 0;
                            if (inputStartIdx) inputStartIdx.value = 1;
                            parsePenInput();
                            showToast((res.message || ('Populated ' + placed + ' pen card(s)!')) + ' Remaining: ' + remaining.length, 'success');
                        } else {
                            currentPenStartIndex = res.nextStartIndex || 0;
                            if (inputStartIdx) inputStartIdx.value = currentPenStartIndex + 1;
                            renderPenPreview();
                            showToast(res.message || ('Populated ' + placed + ' pen card(s)!'), 'success');
                        }
                    } else {
                        showToast(res.message || 'Failed to populate Pen cards', 'error');
                    }
                } catch(e) {
                    showToast('Pen cards populated!', 'info');
                }
            });
        } catch(err) {
            if (btnRun) {
                btnRun.disabled = false;
                setBtnLabel(btnRun, 'Auto Fill Pen Cards');
            }
            showToast('Error: ' + err.message, 'error');
        }
    }

    function executeFormatExistingPen() {
        var btnFmt = document.getElementById('btnFormatExistingPen');
        try {
            var payload = buildPenPayload();
            payload.entries = [];
            if (btnFmt) {
                btnFmt.disabled = true;
                setBtnLabel(btnFmt, 'Formatting Canvas Cards...');
            }
            var payloadStr = encodeURIComponent(JSON.stringify(payload));
            evalHostScript('formatExistingPenCards(decodeURIComponent("' + payloadStr + '"))', function(resStr) {
                if (btnFmt) {
                    btnFmt.disabled = false;
                    setBtnLabel(btnFmt, '✨ Style & Fit Existing Canvas Cards');
                }
                try {
                    var res = JSON.parse(resStr);
                    if (res.status === 'success') {
                        updatePenStatusUI(res.totalCards || 0, res.summary || '', !!(penSampleProfile || penBoxProfile));
                        showToast(res.message || ('Styled & fitted ' + (res.filledCount || 0) + ' Pen card(s)!'), 'success');
                    } else {
                        showToast(res.message || 'Failed to format canvas Pen cards', 'error');
                    }
                } catch(e) {
                    showToast('Canvas Pen cards formatted!', 'info');
                }
            });
        } catch(err) {
            if (btnFmt) {
                btnFmt.disabled = false;
                setBtnLabel(btnFmt, '✨ Style & Fit Existing Canvas Cards');
            }
            showToast('Error: ' + err.message, 'error');
        }
    }

    // ==========================================
    // Helper Actions
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

        // Pen Custom Name Color Controls
        var colorPickerP = document.getElementById('colorPickerPen');
        var colorHexP = document.getElementById('colorHexPen');
        var btnPickP = document.getElementById('btnPickColorPen');
        var labelP = document.getElementById('labelColorNamePen');

        function updateP(hex, cmyk) {
            currentPenColor = normalizeHex(hex);
            if (cmyk && cmyk.length >= 4) {
                currentPenCmyk = [
                    Math.max(0, Math.min(100, Math.round(cmyk[0]))),
                    Math.max(0, Math.min(100, Math.round(cmyk[1]))),
                    Math.max(0, Math.min(100, Math.round(cmyk[2]))),
                    Math.max(0, Math.min(100, Math.round(cmyk[3])))
                ];
            } else {
                var rgb = hexToRgb(currentPenColor);
                currentPenCmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
            }

            if (colorPickerP) colorPickerP.value = currentPenColor;
            if (colorHexP) colorHexP.value = currentPenColor;
            if (labelP) labelP.textContent = currentPenColor;

            var inC = document.getElementById('inputColorC_Pen');
            var inM = document.getElementById('inputColorM_Pen');
            var inY = document.getElementById('inputColorY_Pen');
            var inK = document.getElementById('inputColorK_Pen');
            if (inC) inC.value = currentPenCmyk[0];
            if (inM) inM.value = currentPenCmyk[1];
            if (inY) inY.value = currentPenCmyk[2];
            if (inK) inK.value = currentPenCmyk[3];

            var penSwatches = document.querySelectorAll('.pen-color-swatch');
            penSwatches.forEach(function(sw) {
                var sHex = normalizeHex(sw.getAttribute('data-color') || '');
                if (sHex === currentPenColor) sw.classList.add('active');
                else sw.classList.remove('active');
            });
        }

        if (colorPickerP) {
            colorPickerP.addEventListener('input', function() { updateP(this.value.toUpperCase()); });
            colorPickerP.addEventListener('change', function() { updateP(this.value.toUpperCase()); });
        }
        if (colorHexP) {
            colorHexP.addEventListener('input', function() {
                var val = this.value.trim();
                if (val.length === 4 || val.length === 7) updateP(normalizeHex(val));
            });
            colorHexP.addEventListener('change', function() { updateP(normalizeHex(this.value)); });
        }
        if (btnPickP) {
            btnPickP.addEventListener('click', function() {
                evalHostScript('getSelectedCanvasColor()', function(resStr) {
                    try {
                        var res = JSON.parse(resStr);
                        if (res.status === 'success') {
                            if (res.cmyk && res.cmyk.length >= 4) {
                                var rgb = cmykToRgb(res.cmyk[0], res.cmyk[1], res.cmyk[2], res.cmyk[3]);
                                var hex = rgbToHex(rgb.r, rgb.g, rgb.b);
                                updateP(res.hex || hex, res.cmyk);
                            } else if (res.hex) {
                                updateP(normalizeHex(res.hex));
                            }
                            var chkOv = document.getElementById('chkOverrideColorPen');
                            if (chkOv) chkOv.checked = true;
                            showToast('Sampled Pen name color: ' + currentPenColor, 'success');
                        } else {
                            showToast(res.message || 'Please select an object on canvas', 'error');
                        }
                    } catch(e) {
                        showToast('Failed to get canvas color', 'error');
                    }
                });
            });
        }

        ['inputColorC_Pen', 'inputColorM_Pen', 'inputColorY_Pen', 'inputColorK_Pen'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', function() {
                    var inC = document.getElementById('inputColorC_Pen');
                    var inM = document.getElementById('inputColorM_Pen');
                    var inY = document.getElementById('inputColorY_Pen');
                    var inK = document.getElementById('inputColorK_Pen');
                    var c = parseInt(inC ? inC.value : 0, 10) || 0;
                    var m = parseInt(inM ? inM.value : 0, 10) || 0;
                    var y = parseInt(inY ? inY.value : 0, 10) || 0;
                    var k = parseInt(inK ? inK.value : 0, 10) || 0;
                    currentPenCmyk = [c, m, y, k];
                    var rgb = cmykToRgb(c, m, y, k);
                    var hex = rgbToHex(rgb.r, rgb.g, rgb.b);
                    currentPenColor = hex;
                    if (colorPickerP) colorPickerP.value = hex;
                    if (colorHexP) colorHexP.value = hex;
                    if (labelP) labelP.textContent = hex;
                });
            }
        });

        var penSwatches = document.querySelectorAll('.pen-color-swatch');
        penSwatches.forEach(function(sw) {
            sw.addEventListener('click', function() {
                var hex = this.getAttribute('data-color') || '#A22F10';
                var cleanHex = normalizeHex(hex);
                var cmyk = PRESET_PALETTE[cleanHex.toUpperCase()] || null;
                updateP(cleanHex, cmyk);
                var chkOv = document.getElementById('chkOverrideColorPen');
                if (chkOv) chkOv.checked = true;
                showToast('Pen override color set to ' + cleanHex, 'info');
            });
        });

        updateP(currentPenColor, currentPenCmyk);
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
                parseDiaryInput();
            }, 200));
        }

        var chkStripNumK = document.getElementById('chkStripNumberKeyring');
        if (chkStripNumK) chkStripNumK.addEventListener('change', parseKeyringInput);

        var btnPasteK = document.getElementById('btnPasteKeyring');
        if (btnPasteK) {
            btnPasteK.addEventListener('click', function() {
                getSystemClipboardText(function(clipText) {
                    if (clipText && clipText.trim()) {
                        if (rawTextInputK) rawTextInputK.value = clipText;
                        var rawDiary = document.getElementById('rawTextInputDiary');
                        if (rawDiary) rawDiary.value = clipText;
                        parseKeyringInput();
                        parseDiaryInput();
                        showToast('Pasted from clipboard!', 'success');
                    } else {
                        showToast('Clipboard is empty (ক্লিপবোর্ড খালি)', 'error');
                    }
                });
            });
        }

        var btnSampleK = document.getElementById('btnLoadSampleKeyring');
        if (btnSampleK) {
            btnSampleK.addEventListener('click', function() {
                if (rawTextInputK) rawTextInputK.value = sampleBanglaData;
                var rawDiary = document.getElementById('rawTextInputDiary');
                if (rawDiary) rawDiary.value = sampleBanglaData;
                parseKeyringInput();
                parseDiaryInput();
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
                currentKeyringStartIndex = 0;
                renderKeyringPreview();
                parseDiaryInput();
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

        var inputStartIdxK = document.getElementById('inputStartIndexKeyring');
        if (inputStartIdxK) {
            inputStartIdxK.addEventListener('input', function() {
                currentKeyringStartIndex = Math.max(0, (parseInt(this.value, 10) || 1) - 1);
                renderKeyringPreview();
            });
        }

        var btnResetIdxK = document.getElementById('btnResetIndexKeyring');
        if (btnResetIdxK) {
            btnResetIdxK.addEventListener('click', function() {
                currentKeyringStartIndex = 0;
                if (inputStartIdxK) inputStartIdxK.value = 1;
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
                parseKeyringInput();
            }, 200));
        }

        var chkIncludeDetailsD = document.getElementById('chkIncludeDetailsDiary');
        if (chkIncludeDetailsD) chkIncludeDetailsD.addEventListener('change', parseDiaryInput);

        var btnPasteD = document.getElementById('btnPasteDiary');
        if (btnPasteD) {
            btnPasteD.addEventListener('click', function() {
                getSystemClipboardText(function(clipText) {
                    if (clipText && clipText.trim()) {
                        if (rawTextInputD) rawTextInputD.value = clipText;
                        var rawK = document.getElementById('rawTextInputKeyring');
                        if (rawK) rawK.value = clipText;
                        parseDiaryInput();
                        parseKeyringInput();
                        showToast('Pasted from clipboard!', 'success');
                    } else {
                        showToast('Clipboard is empty (ক্লিপবোর্ড খালি)', 'error');
                    }
                });
            });
        }

        var btnSampleD = document.getElementById('btnLoadSampleDiary');
        if (btnSampleD) {
            btnSampleD.addEventListener('click', function() {
                if (rawTextInputD) rawTextInputD.value = sampleBanglaData;
                var rawK = document.getElementById('rawTextInputKeyring');
                if (rawK) rawK.value = sampleBanglaData;
                parseDiaryInput();
                parseKeyringInput();
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
                currentDiaryStartIndex = 0;
                renderDiaryPreview();
                parseKeyringInput();
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

        var inputStartIdxD = document.getElementById('inputStartIndexDiary');
        if (inputStartIdxD) {
            inputStartIdxD.addEventListener('input', function() {
                currentDiaryStartIndex = Math.max(0, (parseInt(this.value, 10) || 1) - 1);
                renderDiaryPreview();
            });
        }

        var btnResetIdxD = document.getElementById('btnResetIndexDiary');
        if (btnResetIdxD) {
            btnResetIdxD.addEventListener('click', function() {
                currentDiaryStartIndex = 0;
                if (inputStartIdxD) inputStartIdxD.value = 1;
                renderDiaryPreview();
                showToast('Reset to #1', 'info');
            });
        }

        var btnAutoFillD = document.getElementById('btnAutoFillDiary');
        if (btnAutoFillD) {
            btnAutoFillD.addEventListener('click', executeAutoFillDiary);
        }

        // Note Bani Listeners
        var rawTextInputNB = document.getElementById('rawTextInputNoteBani');
        if (rawTextInputNB) {
            rawTextInputNB.addEventListener('input', debounce(parseNoteBaniInput, 180));
        }

        var selectSplitNB = document.getElementById('selectSplitModeNoteBani');
        if (selectSplitNB) selectSplitNB.addEventListener('change', parseNoteBaniInput);

        var chkStripNB = document.getElementById('chkStripSerialNoteBani');
        if (chkStripNB) chkStripNB.addEventListener('change', parseNoteBaniInput);

        var chkNewlineAuthorNB = document.getElementById('chkNewlineAuthorNoteBani');
        if (chkNewlineAuthorNB) chkNewlineAuthorNB.addEventListener('change', parseNoteBaniInput);

        var btnPasteNB = document.getElementById('btnPasteNoteBani');
        if (btnPasteNB) {
            btnPasteNB.addEventListener('click', function() {
                getSystemClipboardText(function(clipText) {
                    if (clipText && clipText.trim()) {
                        if (rawTextInputNB) rawTextInputNB.value = clipText;
                        parseNoteBaniInput();
                        showToast('Pasted Note Banis from clipboard!', 'success');
                    } else {
                        showToast('Clipboard is empty (ক্লিপবোর্ড খালি)', 'error');
                    }
                });
            });
        }

        var btnSampleNB = document.getElementById('btnLoadSampleNoteBani');
        if (btnSampleNB) {
            btnSampleNB.addEventListener('click', function() {
                if (rawTextInputNB) rawTextInputNB.value = sampleNoteBaniData;
                parseNoteBaniInput();
                showToast('Sample Note Banis loaded!', 'info');
            });
        }

        var btnClearNB = document.getElementById('btnClearNoteBani');
        if (btnClearNB) {
            btnClearNB.addEventListener('click', function() {
                if (rawTextInputNB) rawTextInputNB.value = '';
                parsedNoteBanis = [];
                currentNoteBaniStartIndex = 0;
                var inIdx = document.getElementById('inputStartIndexNoteBani');
                if (inIdx) inIdx.value = 1;
                renderNoteBaniPreview();
                showToast('Cleared Note Bani input', 'info');
            });
        }

        var btnScanNB = document.getElementById('btnScanNoteBanis');
        if (btnScanNB) {
            btnScanNB.addEventListener('click', function() { executeScanNoteBanis(false); });
        }

        var btnPickSampleNB = document.getElementById('btnPickSampleNoteBani');
        if (btnPickSampleNB) {
            btnPickSampleNB.addEventListener('click', executePickNoteBaniSample);
        }

        var btnResetSampleNB = document.getElementById('btnResetSampleNoteBani');
        if (btnResetSampleNB) {
            btnResetSampleNB.addEventListener('click', function() {
                noteBaniSampleProfile = null;
                updateNoteBaniSlotUI(0, '', 0, false);
                showToast('Sample lock cleared — Auto-detect enabled', 'info');
            });
        }

        var inputStartIdxNB = document.getElementById('inputStartIndexNoteBani');
        if (inputStartIdxNB) {
            inputStartIdxNB.addEventListener('input', function() {
                currentNoteBaniStartIndex = Math.max(0, (parseInt(this.value, 10) || 1) - 1);
                renderNoteBaniPreview();
            });
        }

        var btnResetIdxNB = document.getElementById('btnResetIndexNoteBani');
        if (btnResetIdxNB) {
            btnResetIdxNB.addEventListener('click', function() {
                currentNoteBaniStartIndex = 0;
                if (inputStartIdxNB) inputStartIdxNB.value = 1;
                renderNoteBaniPreview();
                showToast('Reset to Bani #1', 'info');
            });
        }

        var btnAutoFillNB = document.getElementById('btnAutoFillNoteBani');
        if (btnAutoFillNB) {
            btnAutoFillNB.addEventListener('click', executeAutoFillNoteBanis);
        }

        var btnPickWNB = document.getElementById('btnPickWidthNoteBani');
        if (btnPickWNB) {
            btnPickWNB.addEventListener('click', function() {
                evalHostScript('getSelectedCanvasWidth()', function(resStr) {
                    try {
                        var res = JSON.parse(resStr);
                        if (res.status === 'success') {
                            var inputW = document.getElementById('inputMaxWidthNoteBani');
                            if (inputW) inputW.value = res.widthMm;
                            showToast('Note Bani Max Width set to ' + res.widthMm + ' mm', 'success');
                        } else {
                            showToast(res.message || 'Select an object on canvas to measure width', 'error');
                        }
                    } catch(e) {
                        showToast('Error picking width', 'error');
                    }
                });
            });
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

        // Pen Listeners
        var rawTextInputP = document.getElementById('rawTextInputPen');
        if (rawTextInputP) {
            rawTextInputP.addEventListener('input', debounce(parsePenInput, 180));
        }

        var chkStripNumP = document.getElementById('chkStripNumberPen');
        if (chkStripNumP) chkStripNumP.addEventListener('change', parsePenInput);

        var chkCombineP = document.getElementById('chkCombineAddressPhonePen');
        if (chkCombineP) chkCombineP.addEventListener('change', parsePenInput);

        var btnPasteP = document.getElementById('btnPastePen');
        if (btnPasteP) {
            btnPasteP.addEventListener('click', function() {
                getSystemClipboardText(function(clipText) {
                    if (clipText && clipText.trim()) {
                        if (rawTextInputP) rawTextInputP.value = clipText;
                        parsePenInput();
                        showToast('Pasted Pen list from clipboard!', 'success');
                    } else {
                        showToast('Clipboard is empty (ক্লিপবোর্ড খালি)', 'error');
                    }
                });
            });
        }

        var btnSampleP = document.getElementById('btnLoadSamplePen');
        if (btnSampleP) {
            btnSampleP.addEventListener('click', function() {
                if (rawTextInputP) rawTextInputP.value = samplePenData;
                parsePenInput();
                showToast('Sample Pen data loaded!', 'info');
            });
        }

        var btnClearP = document.getElementById('btnClearPen');
        if (btnClearP) {
            btnClearP.addEventListener('click', function() {
                if (rawTextInputP) rawTextInputP.value = '';
                parsedPenEntries = [];
                currentPenStartIndex = 0;
                var inIdx = document.getElementById('inputStartIndexPen');
                if (inIdx) inIdx.value = 1;
                renderPenPreview();
                showToast('Cleared Pen input', 'info');
            });
        }

        var btnLoadSelP = document.getElementById('btnLoadSelectionPen');
        if (btnLoadSelP) {
            btnLoadSelP.addEventListener('click', function() {
                loadFromCanvasSelection(rawTextInputP, function() {
                    parsePenInput();
                });
            });
        }

        var btnPickSampleP = document.getElementById('btnPickSamplePen');
        if (btnPickSampleP) {
            btnPickSampleP.addEventListener('click', executePickPenSample);
        }

        var btnPickBoxP = document.getElementById('btnPickBoxPen');
        if (btnPickBoxP) {
            btnPickBoxP.addEventListener('click', executePickPenBox);
        }

        var btnScanP = document.getElementById('btnScanPenCards');
        if (btnScanP) {
            btnScanP.addEventListener('click', function() { executeScanPenCards(false); });
        }

        var btnResetSampleP = document.getElementById('btnResetSamplePen');
        if (btnResetSampleP) {
            btnResetSampleP.addEventListener('click', function() {
                penSampleProfile = null;
                penBoxProfile = null;
                var inW = document.getElementById('inputTargetWidthPen');
                var inH = document.getElementById('inputTargetHeightPen');
                if (inW) inW.value = 'Auto';
                if (inH) inH.value = 'Auto';
                updatePenStatusUI(0, '', false);
                showToast('Locked card / box reference cleared — Auto mode active', 'info');
            });
        }

        var inputStartIdxP = document.getElementById('inputStartIndexPen');
        if (inputStartIdxP) {
            inputStartIdxP.addEventListener('input', function() {
                currentPenStartIndex = Math.max(0, (parseInt(this.value, 10) || 1) - 1);
                renderPenPreview();
            });
        }

        var btnResetIdxP = document.getElementById('btnResetIndexPen');
        if (btnResetIdxP) {
            btnResetIdxP.addEventListener('click', function() {
                currentPenStartIndex = 0;
                if (inputStartIdxP) inputStartIdxP.value = 1;
                renderPenPreview();
                showToast('Reset to #1', 'info');
            });
        }

        var btnAutoFillP = document.getElementById('btnAutoFillPen');
        if (btnAutoFillP) {
            btnAutoFillP.addEventListener('click', executeAutoFillPen);
        }

        var btnFormatExistingP = document.getElementById('btnFormatExistingPen');
        if (btnFormatExistingP) {
            btnFormatExistingP.addEventListener('click', executeFormatExistingPen);
        }

        // Safe Width Pickers
        var btnPickSWD = document.getElementById('btnPickSafeWidthDiary');
        if (btnPickSWD) {
            btnPickSWD.addEventListener('click', function() {
                evalHostScript('getSelectedCanvasWidth()', function(resStr) {
                    try {
                        var res = JSON.parse(resStr);
                        if (res.status === 'success') {
                            var inputSW = document.getElementById('inputSafeWidthDiary');
                            if (inputSW) {
                                inputSW.value = res.widthMm;
                                inputSW.dispatchEvent(new Event('input', { bubbles: true }));
                                inputSW.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                            showToast(res.message || ('Picked safe width: ' + res.widthMm + ' mm'), 'success');
                        } else {
                            showToast(res.message || 'Could not pick width from selection', 'error');
                        }
                    } catch(e) {
                        showToast('Error picking width', 'error');
                    }
                });
            });
        }

        var btnPickSWK = document.getElementById('btnPickSafeWidthKeyring');
        if (btnPickSWK) {
            btnPickSWK.addEventListener('click', function() {
                evalHostScript('getSelectedCanvasWidth()', function(resStr) {
                    try {
                        var res = JSON.parse(resStr);
                        if (res.status === 'success') {
                            var inputSW = document.getElementById('inputSafeWidthKeyring');
                            if (inputSW) {
                                inputSW.value = res.widthMm;
                                inputSW.dispatchEvent(new Event('input', { bubbles: true }));
                                inputSW.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                            showToast(res.message || ('Picked safe width: ' + res.widthMm + ' mm'), 'success');
                        } else {
                            showToast(res.message || 'Could not pick width from selection', 'error');
                        }
                    } catch(e) {
                        showToast('Error picking width', 'error');
                    }
                });
            });
        }

        // Typography, Leading & Safe Width Preset Buttons
        function setupPresetButtons() {
            var presetBtns = document.querySelectorAll('.btn-scale-preset, .btn-leading-preset, .btn-safewidth-preset');
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
            ['inputDetailsHScaleKeyring', 'inputNameHScaleKeyring', 'inputDetailsLeadingKeyring', 'inputSafeWidthKeyring', 'inputDetailsHScaleDiary', 'inputNameHScaleDiary', 'inputNameSizeDiary', 'inputDetailsSizeDiary', 'inputDetailsLeadingDiary', 'inputSafeWidthDiary'].forEach(function(id) {
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
        setupContextMenu();
        updateDuplicatorSummary();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
