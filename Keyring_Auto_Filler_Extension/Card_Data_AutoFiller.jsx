/**
 * Illustrator Name & Bio Card Auto-Filler Pro Engine
 * Author: Yahia Bin Zaman
 * Version: 2.2.1 Pro - Enhanced with Unicode-Safe JSON & Keyring Support
 */

#target illustrator

// Safe JSON parser for ExtendScript supporting Unicode Bengali text
if (typeof JSON !== "object") {
    JSON = {};
}
JSON.stringify = function(obj) {
    if (obj === null) return "null";
    if (typeof obj === "undefined") return "undefined";
    if (typeof obj === "number" || typeof obj === "boolean") return String(obj);
    if (typeof obj === "string") {
        return '"' + obj.replace(/\\/g, '\\\\')
                        .replace(/"/g, '\\"')
                        .replace(/\r/g, '\\r')
                        .replace(/\n/g, '\\n')
                        .replace(/\t/g, '\\t') + '"';
    }
    if (obj instanceof Array) {
        var a = [];
        for (var i = 0; i < obj.length; i++) {
            a.push(JSON.stringify(obj[i]));
        }
        return "[" + a.join(",") + "]";
    }
    if (typeof obj === "object") {
        var o = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                o.push(JSON.stringify(k) + ":" + JSON.stringify(obj[k]));
            }
        }
        return "{" + o.join(",") + "}";
    }
    return String(obj);
};

JSON.parse = function(str) {
    if (!str) return null;
    return eval('(' + str + ')');
};

var CardAutoFiller = {
    getActiveDoc: function() {
        if (!app.documents || app.documents.length === 0) return null;
        try {
            return app.activeDocument;
        } catch(e) {
            try {
                return app.documents[0];
            } catch(e2) {
                return null;
            }
        }
    },
    bnDigits: ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'],
    baniRegex: /[\u09AC][\u09BE][\u09A3\u09A8][\u09C0]/,
    badgeRegex: /(?:[\u09B9][\u09BF][\u09AB][\u099C]|[\u0995][\u09C1][\u09B0][\u0986][\u09A8]|[\u09B8][\u09AE][\u09BE][\u09AA][\u09A8][\u09C0]|[\u09B8][\u09CD][\u09AE][\u09C3][\u09A4][\u09BF])/,

    intToBengali: function(num, pad2) {
        var str = String(num);
        if (pad2 && num < 10) str = "0" + str;
        var res = "";
        for (var i = 0; i < str.length; i++) {
            var c = str.charAt(i);
            if (c >= '0' && c <= '9') {
                res += this.bnDigits[parseInt(c, 10)];
            } else {
                res += c;
            }
        }
        return res;
    },

    bengaliToInt: function(str) {
        if (!str) return -1;
        var bnNums = { '০': 0, '১': 1, '২': 2, '৩': 3, '৪': 4, '৫': 5, '৬': 6, '৭': 7, '৮': 8, '৯': 9 };
        var clean = str.replace(/[^০-৯0-9]/g, '');
        if (!clean) return -1;
        var res = 0;
        for (var i = 0; i < clean.length; i++) {
            var ch = clean.charAt(i);
            if (bnNums[ch] !== undefined) {
                res = res * 10 + bnNums[ch];
            } else if (ch >= '0' && ch <= '9') {
                res = res * 10 + parseInt(ch, 10);
            }
        }
        return res > 0 ? res : -1;
    },

    getSelectedCanvasColor: function() {
        if (!app.documents.length) {
            return JSON.stringify({ status: "error", message: "No document open." });
        }
        var doc = app.activeDocument;
        var sel = doc.selection;
        if (!sel) {
            return JSON.stringify({ status: "error", message: "Please select text or an object on the canvas." });
        }

        var col = null;
        if (sel.typename === "TextRange") {
            col = sel.characterAttributes.fillColor;
        } else if (sel.typename === "TextFrame") {
            if (sel.characters.length > 0) col = sel.characters[0].fillColor;
        } else if (sel instanceof Array && sel.length > 0) {
            var item = sel[0];
            if (item.typename === "TextRange") col = item.characterAttributes.fillColor;
            else if (item.typename === "TextFrame" && item.characters.length > 0) col = item.characters[0].fillColor;
            else if (item.textFrames && item.textFrames.length > 0 && item.textFrames[0].characters.length > 0) col = item.textFrames[0].characters[0].fillColor;
            else if (item.fillColor) col = item.fillColor;
        }

        if (!col || col.typename === "NoColor") {
            return JSON.stringify({ status: "error", message: "No visible fill color found in selection." });
        }

        var res = { status: "success", typename: col.typename };
        if (col.typename === "SpotColor") {
            res.spotName = col.spot.name;
            var sc = col.spot.color;
            if (sc.typename === "CMYKColor") {
                res.cmyk = [sc.cyan, sc.magenta, sc.yellow, sc.black];
                res.hex = this.cmykToHex(sc.cyan, sc.magenta, sc.yellow, sc.black);
            }
        } else if (col.typename === "CMYKColor") {
            res.cmyk = [Math.round(col.cyan), Math.round(col.magenta), Math.round(col.yellow), Math.round(col.black)];
            if (Math.round(col.cyan) === 100 && Math.round(col.magenta) === 0 && Math.round(col.yellow) === 0 && Math.round(col.black) === 45) {
                res.hex = "#006F9A";
            } else {
                res.hex = this.cmykToHex(col.cyan, col.magenta, col.yellow, col.black);
            }
        } else if (col.typename === "RGBColor") {
            res.rgb = [col.red, col.green, col.blue];
            res.hex = this.rgbToHex(col.red, col.green, col.blue);
        }

        return JSON.stringify(res);
    },

    cmykToHex: function(c, m, y, k) {
        c = c / 100; m = m / 100; y = y / 100; k = k / 100;
        var r = Math.round(255 * (1 - c) * (1 - k));
        var g = Math.round(255 * (1 - m) * (1 - k));
        var b = Math.round(255 * (1 - y) * (1 - k));
        var toHex = function(n) {
            var h = Math.max(0, Math.min(255, n)).toString(16);
            return h.length === 1 ? "0" + h : h;
        };
        return ("#" + toHex(r) + toHex(g) + toHex(b)).toUpperCase();
    },

    rgbToHex: function(r, g, b) {
        var toHex = function(n) {
            var h = Math.max(0, Math.min(255, Math.round(n))).toString(16);
            return h.length === 1 ? "0" + h : h;
        };
        return ("#" + toHex(r) + toHex(g) + toHex(b)).toUpperCase();
    },

    hexToColor: function(hex, isCMYK) {
        if (!hex) return null;
        hex = hex.replace(/[^0-9A-Fa-f]/g, "");
        if (hex.length === 3) hex = hex.charAt(0)+hex.charAt(0) + hex.charAt(1)+hex.charAt(1) + hex.charAt(2)+hex.charAt(2);
        if (hex.length !== 6) return null;

        var upper = hex.toUpperCase();
        if (isCMYK) {
            // Strict 2-Color C+K mappings for offset printing:
            if (upper === "006F9A" || upper === "008C8C" || upper === "1E5AA8") {
                var cCol = new CMYKColor();
                cCol.cyan = 100; cCol.magenta = 0; cCol.yellow = 0; cCol.black = 45;
                return cCol;
            }
            if (upper === "000000") {
                var kCol = new CMYKColor();
                kCol.cyan = 0; kCol.magenta = 0; kCol.yellow = 0; kCol.black = 100;
                return kCol;
            }
        }

        var r = parseInt(hex.substring(0, 2), 16);
        var g = parseInt(hex.substring(2, 4), 16);
        var b = parseInt(hex.substring(4, 6), 16);

        if (isCMYK) {
            var rN = r / 255, gN = g / 255, bN = b / 255;
            var k = 1 - Math.max(rN, Math.max(gN, bN));
            var c = 0, m = 0, y = 0;
            if (k < 1) {
                c = (1 - rN - k) / (1 - k);
                m = (1 - gN - k) / (1 - k);
                y = (1 - bN - k) / (1 - k);
            }
            var cmyk = new CMYKColor();
            cmyk.cyan = Math.round(c * 100);
            cmyk.magenta = Math.round(m * 100);
            cmyk.yellow = Math.round(y * 100);
            cmyk.black = Math.round(k * 100);
            return cmyk;
        } else {
            var rgb = new RGBColor();
            rgb.red = r; rgb.green = g; rgb.blue = b;
            return rgb;
        }
    },
    getSelectedCanvasText: function() {
        if (!app.documents.length) {
            return JSON.stringify({ status: "error", message: "No active Illustrator document found." });
        }
        var doc = app.activeDocument;
        var sel = doc.selection;
        if (!sel || !sel.length) {
            return JSON.stringify({ status: "error", message: "Please select one or more text frames on the canvas." });
        }

        var textFrames = [];
        this.collectTextFrames(sel, textFrames);

        if (!textFrames.length) {
            return JSON.stringify({ status: "error", message: "No text frames found in your selection." });
        }

        textFrames.sort(function(a, b) {
            var bTop = b.geometricBounds[1];
            var aTop = a.geometricBounds[1];
            if (Math.abs(bTop - aTop) > 20) {
                return bTop - aTop;
            }
            return a.geometricBounds[0] - b.geometricBounds[0];
        });

        var combinedText = [];
        for (var i = 0; i < textFrames.length; i++) {
            var content = textFrames[i].contents;
            if (content && content.replace(/\s+/g, '').length > 0) {
                combinedText.push(content);
            }
        }

        return JSON.stringify({
            status: "success",
            text: combinedText.join("\n\n"),
            count: textFrames.length
        });
    },
    isTextFrameNoColor: function(tf) {
        if (!tf) return false;
        try {
            if (tf.paragraphs && tf.paragraphs.length > 0) {
                try {
                    var pfc = tf.paragraphs[0].fillColor;
                    if (pfc && pfc.typename === "NoColor") return true;
                } catch(pe) {}
            }
            if (tf.characters && tf.characters.length > 0) {
                for (var c = 0; c < Math.min(tf.characters.length, 5); c++) {
                    try {
                        var ca = tf.characters[c].characterAttributes;
                        if (ca && ca.fillColor && ca.fillColor.typename === "NoColor") return true;
                    } catch(ce) {}
                }
            }
        } catch(e) {}
        return false;
    },

    isItemHidden: function(item) {
        if (!item) return true;
        try {
            if (item.hidden || item.locked) return true;
        } catch(e) {}
        try {
            var cur = item;
            var depth = 0;
            while (cur && depth < 20) {
                depth++;
                if (cur.typename === 'Document' || cur.typename === 'Application' || cur === app) break;
                if (cur.typename === 'Layer') {
                    if (!cur.visible || cur.locked) return true;
                } else {
                    try {
                        if (cur.hidden || cur.locked) return true;
                    } catch(err) {}
                }
                cur = cur.parent;
            }
        } catch(e) {}
        return false;
    },

    isBackSideText: function(text) {
        if (!text) return false;
        var norm = text.replace(/[\s\(\)\-\_–—\.\,\:\;\[\]\{\}\/\\।০-৯0-9\'\"]/g, '');
        if (norm.indexOf("দাওরায়েহাদীস") !== -1 ||
            norm.indexOf("দাওরায়েহাদিস") !== -1 ||
            norm.indexOf("দাওরায়েহাদীছ") !== -1 ||
            norm.indexOf("দাওরায়েহাদিসসমাপনীস্মৃতি") !== -1 ||
            norm.indexOf("দাওরায়েহাদীসমাস্টার্সসমাপনীস্মৃতি") !== -1 ||
            norm.indexOf("মাস্টার্সসমাপনীস্মৃতি") !== -1 ||
            norm.indexOf("সমাপনীস্মৃতি") !== -1 ||
            norm.indexOf("হিফজসমাপনী") !== -1 ||
            norm.indexOf("হিফযসমাপনী") !== -1 ||
            norm.indexOf("হিফজুলকুরআন") !== -1 ||
            norm.indexOf("হিফযুলকুরআন") !== -1 ||
            norm.indexOf("হিফযুলকোরআন") !== -1 ||
            norm.indexOf("হিফজুলকোরআন") !== -1) {
            return true;
        }

        var backKeywords = [
            "দাওরায়ে", "সমাপনী", "স্মৃতি", "হিফজ", "হিফয",
            "শিক্ষাবর্ষ", "সনদপত্র", "স্মারক", "দস্তারবন্দী", "গ্রুপছবি",
            "আমন্ত্রনপত্র", "দাওয়াতনামা", "স্মৃতিচারণ"
        ];
        for (var b = 0; b < backKeywords.length; b++) {
            if (text.indexOf(backKeywords[b]) !== -1 && (text.indexOf("স্মৃতি") !== -1 || text.indexOf("সমাপনী") !== -1 || text.indexOf("হাদ") !== -1)) {
                return true;
            }
        }
        return false;
    },

    isBaniText: function(text) {
        if (!text) return false;
        if (/^[\s\r\n]*[-–—]/.test(text)) return true;
        if (/[-–—]\s*(?:মাওলানা|হযরত|মুফতী|শায়খ|ড\.|আল্লামা|মুহাদ্দিস|ইমাম|রাসূল)/i.test(text)) return true;
        if (/(?:বাণী|উক্তি|হাদীস|বানী)/i.test(text) && !/(?:পিতা|গ্রাম|পোস্ট|থানা|জেলা|মোবাইল)/i.test(text)) return true;
        return false;
    },

    hasStudentBiodata: function(text) {
        if (!text) return false;
        if (this.isBaniText(text)) return false;
        if (text.indexOf("পিতা:") !== -1 || text.indexOf("পিতা :") !== -1 || text.indexOf("পিতা") !== -1 ||
            text.indexOf("الوالদ:") !== -1 || text.indexOf("الوالد :") !== -1 || text.indexOf("বাবার নাম") !== -1) {
            return true;
        }
        if (/01[3-9]\d{8}/.test(text) || /০১[৩-৯][০-৯]{8}/.test(text) || /٠١[٠-৯]{9}/.test(text)) {
            return true;
        }
        var clean = text.replace(/^\s+|\s+$/g, "");
        var lines = clean.split(/[\r\n]+/);
        if (lines.length >= 2) {
            var studentTitles = ["মুহাম্মাদ", "মোহাম্মদ", "মোঃ", "শিক্ষার্থী", "ছাত্র", "الحافظ"];
            for (var s = 0; s < studentTitles.length; s++) {
                if (clean.indexOf(studentTitles[s]) !== -1) {
                    return true;
                }
            }
            if (/^(?:হাফেজ|মাওলানা|মুফতী|ক্বারী|মুহাদ্দিস)\b/m.test(clean)) {
                return true;
            }
        }
        return false;
    },

    clusterProximityCards: function(textFrames) {
        if (!textFrames || textFrames.length === 0) return [];
        var cards = [];
        var nameCandidates = [];
        var otherFrames = [];

        for (var i = 0; i < textFrames.length; i++) {
            var tf = textFrames[i];
            if (this.isItemHidden(tf)) continue;
            var cTxt = tf.contents || "";
            if (this.isBackSideText(cTxt)) continue;

            var clean = cTxt.replace(/\s+/g, "");
            var num = this.bengaliToInt(clean);
            if (clean.length <= 4 && num > 0) {
                otherFrames.push({ tf: tf, type: "qty_or_serial", num: num });
            } else if (/^(?:ফরম|দাখেলা|রোল|Form|Roll|‡¶´|‡dvi|diBk|‡ivj)/i.test(cTxt)) {
                otherFrames.push({ tf: tf, type: "form" });
            } else {
                nameCandidates.push(tf);
            }
        }

        if (nameCandidates.length === 0) nameCandidates = textFrames;

        for (var n = 0; n < nameCandidates.length; n++) {
            var ntf = nameCandidates[n];
            var ngb = ntf.geometricBounds;
            var card = {
                nameFrame: ntf,
                detailsFrame: null,
                baniFrame: null,
                qtyFrame: null,
                badgeFrame: null,
                serialFrame: null,
                formFrame: null,
                group: null,
                bounds: ngb,
                artboardIndex: 0
            };
            cards.push(card);
        }
        return cards;
    },

    collectVisibleLayers: function(parent, outLayers) {
        if (!parent) return;
        try {
            var lays = parent.layers;
            if (!lays) return;
            for (var i = 0; i < lays.length; i++) {
                var lay = lays[i];
                if (lay.visible && !lay.locked) {
                    outLayers.push(lay);
                    this.collectVisibleLayers(lay, outLayers);
                }
            }
        } catch(e) {}
    },

    collectVisibleGroups: function(parent, outGroups) {
        if (!parent) return;
        try {
            var grps = parent.groupItems;
            if (!grps) return;
            for (var i = 0; i < grps.length; i++) {
                var grp = grps[i];
                if (grp.hidden || this.isItemHidden(grp)) continue;
                outGroups.push(grp);
            }
        } catch(e) {}
    },

    collectTextFrames: function(items, outList) {
        if (!items) return;
        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            var tn = it.typename;
            if (tn === 'TextFrame') {
                try {
                    if (!it.hidden && !it.locked) outList.push(it);
                } catch(e) { outList.push(it); }
            } else if (tn === 'GroupItem') {
                try {
                    if (!it.hidden && !it.locked) this.collectTextFrames(it.pageItems, outList);
                } catch(e) {}
            }
        }
    },

    detectCards: function(arg1, arg2) {
        var doc = app.activeDocument;
        if (!doc) return [];

        var scope = "artboard";
        var order = "zigzag";

        if (arg1 === "selection" || arg1 === "artboard" || arg1 === "document" || arg1 === "all_artboards") {
            scope = arg1;
            if (arg2) order = arg2;
        } else if (arg2 === "selection" || arg2 === "artboard" || arg2 === "document" || arg2 === "all_artboards") {
            scope = arg2;
            if (arg1) order = arg1;
        } else {
            if (arg1) order = arg1;
            if (arg2) scope = arg2;
        }

        var cardUnits = [];
        var candidateItems = [];

        var sel = doc.selection;
        var hasExplicitSelection = (scope === "selection" && sel && sel.length > 0);

        if (hasExplicitSelection) {
            for (var s = 0; s < sel.length; s++) {
                var it = sel[s];
                if (!this.isItemHidden(it)) {
                    candidateItems.push(it);
                }
            }
        } else if (scope === "document" || scope === "all_artboards") {
            for (var l = 0; l < doc.layers.length; l++) {
                var layer = doc.layers[l];
                if (layer.visible && !layer.locked) {
                    for (var p = 0; p < layer.pageItems.length; p++) {
                        var itm = layer.pageItems[p];
                        if (!this.isItemHidden(itm)) {
                            candidateItems.push(itm);
                        }
                    }
                }
            }
        } else {
            var abIndex = doc.artboards.getActiveArtboardIndex();
            var ab = doc.artboards[abIndex];
            var abRect = ab.artboardRect; // [left, top, right, bottom]

            for (var l = 0; l < doc.layers.length; l++) {
                var layer = doc.layers[l];
                if (layer.visible && !layer.locked) {
                    for (var p = 0; p < layer.pageItems.length; p++) {
                        var itm = layer.pageItems[p];
                        if (this.isItemHidden(itm)) continue;
                        var gb = itm.geometricBounds;
                        if (gb[0] < abRect[2] && gb[2] > abRect[0] && gb[1] > abRect[3] && gb[3] < abRect[1]) {
                            candidateItems.push(itm);
                        }
                    }
                }
            }

            if (candidateItems.length === 0) {
                for (var t = 0; t < doc.textFrames.length; t++) {
                    var tf = doc.textFrames[t];
                    if (this.isItemHidden(tf)) continue;
                    var gb = tf.geometricBounds;
                    if (gb[0] < abRect[2] && gb[2] > abRect[0] && gb[1] > abRect[3] && gb[3] < abRect[1]) {
                        candidateItems.push(tf);
                    }
                }
            }
        }

        for (var g = 0; g < candidateItems.length; g++) {
            this.extractCardsFromItem(candidateItems[g], cardUnits);
        }

        if (cardUnits.length === 0) {
            var allTFs = [];
            this.collectTextFrames(candidateItems, allTFs);
            var filteredTFs = [];
            for (var t = 0; t < allTFs.length; t++) {
                var tf = allTFs[t];
                if (this.isItemHidden(tf)) continue;
                if (this.isBackSideText(tf.contents)) continue;
                if (tf.contents.length > 500 || tf.lines.length > 15) continue;
                filteredTFs.push(tf);
            }
            if (filteredTFs.length >= 2) {
                cardUnits = this.clusterProximityCards(filteredTFs);
            }
        }

        // Attach exact Serial & Form frames to each card by spatial proximity if not already attached
        var needsProximity = false;
        for (var cu = 0; cu < cardUnits.length; cu++) {
            if (!cardUnits[cu].serialFrame || !cardUnits[cu].formFrame || !cardUnits[cu].qtyFrame) {
                needsProximity = true;
                break;
            }
        }

        if (needsProximity) {
            var allDocTFs = [];
            for (var dt = 0; dt < doc.textFrames.length; dt++) {
                var dtf = doc.textFrames[dt];
                if (!this.isItemHidden(dtf)) allDocTFs.push(dtf);
            }
            for (var cu = 0; cu < cardUnits.length; cu++) {
                var cCard = cardUnits[cu];
                if (!cCard.nameFrame) continue;
                if (cCard.serialFrame && cCard.formFrame && cCard.qtyFrame) continue; // already attached!
                var cgb = cCard.nameFrame.geometricBounds;
                var cLeft = cgb[0];
                var cTop = cgb[1];

                var bestSerial = null;
                var bestForm = null;
                var minSerialDist = 9999;
                var minFormDist = 9999;

                for (var dt = 0; dt < allDocTFs.length; dt++) {
                    var dtf = allDocTFs[dt];
                    if (dtf === cCard.nameFrame || this.isItemHidden(dtf)) continue;
                    var dtgb = dtf.geometricBounds;
                    var dx = dtgb[0] - cLeft;
                    var dy = cTop - dtgb[1]; // positive downwards

                    if (!cCard.serialFrame) {
                        var dRawS = dtf.contents.replace(/^\s+|\s+$/g, "");
                        if (/^[০-৯0-9]+$/.test(dRawS.replace(/\s+/g, "")) && dRawS.length <= 4) {
                            var nCenterX = (cgb[0] + cgb[2]) / 2;
                            var nCenterY = (cgb[1] + cgb[3]) / 2;
                            var sCenterX = (dtgb[0] + dtgb[2]) / 2;
                            var sCenterY = (dtgb[1] + dtgb[3]) / 2;
                            var sDist = Math.sqrt((sCenterX - nCenterX)*(sCenterX - nCenterX) + (sCenterY - nCenterY)*(sCenterY - nCenterY));
                            if (sDist < minSerialDist && sDist < 130) {
                                minSerialDist = sDist;
                                bestSerial = dtf;
                            }
                        }
                    }

                    if (!cCard.formFrame) {
                        var dRawF = dtf.contents.replace(/^\s+|\s+$/g, "");
                        var isFormLabel = /(?:ফরম|দাখেলা|রোল|Form|Roll|‡¶´|‡dvi|diBk|‡ivj)/i.test(dRawF);
                        var isFormDigits = /^[০-৯0-9\s\-\/]+$/.test(dRawF) && dRawF.length <= 10;
                        var isSmallTF = dtf.lines.length <= 2 && dtf.contents.length <= 25;
                        
                        // Form frame is typically in bottom-right quadrant relative to name frame
                        if (dx > 20 && dy > 10 && (isFormLabel || isFormDigits || isSmallTF)) {
                            var fDist = Math.sqrt((dx - 65)*(dx - 65) + (dy - 45)*(dy - 45));
                            if (fDist < minFormDist && fDist < 160) {
                                minFormDist = fDist;
                                bestForm = dtf;
                            }
                        }
                    }
                }

                if (bestSerial && !cCard.serialFrame) cCard.serialFrame = bestSerial;
                if (bestForm && !cCard.formFrame) cCard.formFrame = bestForm;
                if (!cCard.qtyFrame) {
                    if (bestSerial) cCard.qtyFrame = bestSerial;
                    else if (cCard.serialFrame) cCard.qtyFrame = cCard.serialFrame;
                }
            }
        }

        return this.sortCards(cardUnits, order || "zigzag");
    },

    extractCardsFromItem: function(item, outCards) {
        if (!item || this.isItemHidden(item)) return;

        if (item.typename === "TextFrame") {
            if (this.isBackSideText(item.contents)) return;
            var cTxt = item.contents;
            if (this.hasStudentBiodata(cTxt) || item.lines.length >= 2) {
                var card = {
                    nameFrame: item,
                    detailsFrame: null,
                    baniFrame: null,
                    qtyFrame: null,
                    badgeFrame: null,
                    serialFrame: null,
                    formFrame: null,
                    namePlaceholderPath: null,
                    group: item,
                    bounds: item.geometricBounds,
                    artboardIndex: 0
                };
                outCards.push(card);
            }
            return;
        }

        if (item.typename === "GroupItem") {
            var tfs = [];
            this.collectTextFrames(item.pageItems, tfs);
            if (tfs.length === 0) return;

            var hasBack = false;
            var hasBio = false;
            var hasQty = false;
            var personCount = 0;
            var nonBackTfs = 0;

            for (var t = 0; t < tfs.length; t++) {
                var cTxt = tfs[t].contents;
                var clean = cTxt.replace(/\s+/g, "");
                var num = this.bengaliToInt(clean);
                if (clean.length <= 4 && num > 0) hasQty = true;
                if (this.hasStudentBiodata(cTxt)) {
                    hasBio = true;
                    personCount++;
                }
                if (this.isBackSideText(cTxt)) {
                    hasBack = true;
                } else if (!/gv`vwim|gv`ivmv|mZxNvUv|মাদ্রাসা|মাদরাসা|মারকায|জামিয়া/.test(cTxt)) {
                    nonBackTfs++;
                }
            }

            if (hasBack && !hasBio && !hasQty && nonBackTfs === 0) {
                return;
            }

            if (tfs.length >= 1 && tfs.length <= 8) {
                var card = this.analyzeCardGroup(tfs, item);
                if (card.nameFrame && (card.detailsFrame || card.baniFrame || card.serialFrame || card.qtyFrame || card.namePlaceholderPath)) {
                    card.group = item;
                    card.bounds = item.geometricBounds;
                    outCards.push(card);
                    return;
                }
            }

            if (personCount > 1 || tfs.length > 8) {
                for (var c = 0; c < item.pageItems.length; c++) {
                    this.extractCardsFromItem(item.pageItems[c], outCards);
                }
                return;
            }

            if (tfs.length >= 1) {
                var card = this.analyzeCardGroup(tfs, item);
                if (card.nameFrame || card.namePlaceholderPath) {
                    // Ignore header / banner groups at top of artboard that don't have biodata
                    var isHeaderPos = false;
                    try {
                        var doc = app.activeDocument;
                        var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()];
                        var abH = Math.abs(ab.artboardRect[1] - ab.artboardRect[3]);
                        var gb = item.geometricBounds;
                        if (gb[1] > (ab.artboardRect[1] - abH * 0.25) && !hasBio && tfs.length <= 2) {
                            isHeaderPos = true;
                        }
                    } catch(e) {}

                    if (!isHeaderPos) {
                        card.group = item;
                        card.bounds = item.geometricBounds;
                        outCards.push(card);
                        return;
                    }
                }
            }

            for (var k = 0; k < item.pageItems.length; k++) {
                if (item.pageItems[k].typename === "GroupItem") {
                    this.extractCardsFromItem(item.pageItems[k], outCards);
                }
            }
        }
    },

    analyzeCardGroup: function(tfs, group) {
        var card = {
            nameFrame: null,
            detailsFrame: null,
            baniFrame: null,
            qtyFrame: null,
            badgeFrame: null,
            serialFrame: null,
            formFrame: null,
            badgeNumber: -1
        };
        var candidateFrames = [];

        var groupBounds = group ? group.geometricBounds : null;
        var groupLeft = groupBounds ? groupBounds[0] : 0;
        var groupTop = groupBounds ? groupBounds[1] : 0;
        var groupRight = groupBounds ? groupBounds[2] : 0;
        var groupBottom = groupBounds ? groupBounds[3] : 0;
        var groupWidth = Math.abs(groupRight - groupLeft);
        var groupHeight = Math.abs(groupTop - groupBottom);

        for (var i = 0; i < tfs.length; i++) {
            var tf = tfs[i];
            if (this.isItemHidden(tf)) continue; // STRICT: Ignore locked & hidden items
            var rawTxt = tf.contents;
            var cleanTxt = rawTxt.replace(/\s+/g, "");
            var num = this.bengaliToInt(cleanTxt);
            var gb = tf.geometricBounds;
            var tfLeft = gb[0];
            var tfTop = gb[1];
            var tfRight = gb[2];
            var tfBottom = gb[3];
            var tfW = Math.abs(tfRight - tfLeft);
            var tfH = Math.abs(tfTop - tfBottom);

            var relX = groupWidth > 0 ? (tfLeft - groupLeft) / groupWidth : 0;
            var relY = groupHeight > 0 ? (groupTop - tfTop) / groupHeight : 0;

            // 1. Title / Memorabilia / Back-side header banners
            if (this.isBackSideText(rawTxt) || /(?:দাওরায়ে|দাওরা|মাস্টার্স|স্মৃতি|সমাপনী|হিফ[জয]|তাকমীল|দস্তারবন্দী|বিদায়ী|স্মারক|ফারেগিন|পরিচিতি|বিভাগ|wnRwi|wLªóvã|`vIiv|nvw`m|cwiwP|fv‡iwMb)/i.test(rawTxt)) {
                continue;
            }

            // 2. Year tag (e.g., "2027", "২০২৭", "১৪৪৬")
            if (/^(?:19|20)\d\d$|^(?:১৪|১৫)[০-৯]{2}$|^(?:২০|১৯)[০-৯]{2}$/.test(cleanTxt)) {
                card.badgeFrame = tf;
                continue;
            }

            // 3. Form number frame (contains "ফরম", "দাখেলা", "রোল", "Form" or sits near bottom-right)
            var isFormText = /(?:ফরম|দাখেলা|রোল|Form|Roll|‡¶´|‡dvi|diBk|‡ivj)/i.test(rawTxt) || 
                             (/^[০-৯0-9\s\-\/]+$/.test(cleanTxt) && cleanTxt.length >= 4 && cleanTxt.length <= 8 && relY > 0.45);
            if (isFormText || (relX > 0.40 && relY > 0.40 && tfW < 60 && tfH < 45)) {
                card.formFrame = tf;
                continue;
            }

            // 4. Quantity frame (sitting on right edge or small number frame)
            if (/^[০-৯0-9]+$/.test(cleanTxt) && cleanTxt.length <= 4 && (relX > 0.65 || (groupWidth > 0 && tfLeft > groupRight - 55) || (tfW < 35 && tfH < 30))) {
                if (!card.qtyFrame) {
                    card.qtyFrame = tf;
                    if (!card.serialFrame) card.serialFrame = tf;
                    continue;
                }
            }

            // 5. Explicit Bani quote
            if (this.isBaniText(rawTxt)) {
                card.baniFrame = tf;
                continue;
            }

            // 6. Institution name header
            if (/gv`vwim|gv`ivmv|mZxNvUv|মাদ্রাসা|মাদরাসা|মারকায|জামিয়া|ইনস্টিটিউট|বিদ্যালয়|স্কুল|কলেজ/.test(rawTxt)) {
                continue;
            }

            // 7. Design label
            if (/^ডিজাইন\s*[০-৯0-9]+/i.test(rawTxt) || /^(?:Tapper|Round|Design)/i.test(rawTxt)) {
                continue;
            }

            candidateFrames.push(tf);
        }

        // Sort candidate frames by Y coordinate descending (top-to-bottom):
        candidateFrames.sort(function(a, b) {
            return b.geometricBounds[1] - a.geometricBounds[1];
        });

        if (candidateFrames.length === 1) {
            card.nameFrame = candidateFrames[0];
            card.detailsFrame = null;
        } else if (candidateFrames.length >= 2) {
            card.nameFrame = candidateFrames[0];
            card.detailsFrame = null;
            if (!card.baniFrame) {
                card.baniFrame = candidateFrames[1];
            }
        }

        return card;
    },

                        sortCards: function(cards, order) {
        if (!cards || cards.length <= 1) return cards;
        var doc = app.activeDocument;
        var numABs = doc ? doc.artboards.length : 0;

        // Filter out header banners (width > 280 or height > 90)
        var filtered = [];
        for (var c = 0; c < cards.length; c++) {
            var card = cards[c];
            var gb = card.item ? card.item.geometricBounds : (card.group ? card.group.geometricBounds : card.bounds);
            card.bounds = gb;
            var w = Math.abs(gb[2] - gb[0]);
            var h = Math.abs(gb[1] - gb[3]);
            if (w > 450 || h > 350) continue;
            card.artboardIndex = 0;
            if (numABs > 1 && gb) {
                var midX = (gb[0] + gb[2]) / 2;
                var midY = (gb[1] + gb[3]) / 2;
                for (var a = 0; a < numABs; a++) {
                    var r = doc.artboards[a].artboardRect;
                    if (midX >= r[0] && midX <= r[2] && midY <= r[1] && midY >= r[3]) {
                        card.artboardIndex = a;
                        break;
                    }
                }
            }
            filtered.push(card);
        }

        // Cluster cards by Sheet / Page block (X-span threshold ~500pt)
        for (var i = 0; i < filtered.length - 1; i++) {
            for (var j = i + 1; j < filtered.length; j++) {
                if (filtered[j].artboardIndex < filtered[i].artboardIndex || 
                   (filtered[j].artboardIndex === filtered[i].artboardIndex && filtered[j].bounds[0] < filtered[i].bounds[0])) {
                    var tmp = filtered[i];
                    filtered[i] = filtered[j];
                    filtered[j] = tmp;
                }
            }
        }

        var sheets = [];
        for (var i = 0; i < filtered.length; i++) {
            var c = filtered[i];
            var placed = false;
            for (var s = 0; s < sheets.length; s++) {
                var sFirst = sheets[s][0];
                if (sFirst.artboardIndex === c.artboardIndex && Math.abs(c.bounds[0] - sFirst.bounds[0]) < 500) {
                    sheets[s].push(c);
                    placed = true;
                    break;
                }
            }
            if (!placed) sheets.push([c]);
        }

        var finalResult = [];

        for (var s = 0; s < sheets.length; s++) {
            var sheetCards = sheets[s];

            if (order === "column") {
                // Column-by-Column within sheet: Col 1 (top to bottom), Col 2 (top to bottom)...
                for (var i = 0; i < sheetCards.length - 1; i++) {
                    for (var j = i + 1; j < sheetCards.length; j++) {
                        if (sheetCards[j].bounds[0] < sheetCards[i].bounds[0]) {
                            var tmp = sheetCards[i];
                            sheetCards[i] = sheetCards[j];
                            sheetCards[j] = tmp;
                        }
                    }
                }
                var cols = [];
                for (var i = 0; i < sheetCards.length; i++) {
                    var c = sheetCards[i];
                    var placed = false;
                    for (var k = 0; k < cols.length; k++) {
                        if (Math.abs(cols[k][0].bounds[0] - c.bounds[0]) < 30) {
                            cols[k].push(c);
                            placed = true;
                            break;
                        }
                    }
                    if (!placed) cols.push([c]);
                }
                for (var k = 0; k < cols.length; k++) {
                    var col = cols[k];
                    for (var i = 0; i < col.length - 1; i++) {
                        for (var j = i + 1; j < col.length; j++) {
                            if (col[j].bounds[1] > col[i].bounds[1]) {
                                var tmp = col[i];
                                col[i] = col[j];
                                col[j] = tmp;
                            }
                        }
                    }
                    for (var i = 0; i < col.length; i++) finalResult.push(col[i]);
                }
            } else {
                // Default: Row-by-Row ("zigzag") -> 1 - 2 - 3 - 4 | 5 - 6 - 7 - 8
                for (var i = 0; i < sheetCards.length - 1; i++) {
                    for (var j = i + 1; j < sheetCards.length; j++) {
                        if (sheetCards[j].bounds[1] > sheetCards[i].bounds[1]) {
                            var tmp = sheetCards[i];
                            sheetCards[i] = sheetCards[j];
                            sheetCards[j] = tmp;
                        }
                    }
                }
                var rows = [];
                for (var i = 0; i < sheetCards.length; i++) {
                    var c = sheetCards[i];
                    var placed = false;
                    for (var k = 0; k < rows.length; k++) {
                        if (Math.abs(rows[k][0].bounds[1] - c.bounds[1]) < 20) {
                            rows[k].push(c);
                            placed = true;
                            break;
                        }
                    }
                    if (!placed) rows.push([c]);
                }
                for (var k = 0; k < rows.length; k++) {
                    var row = rows[k];
                    for (var i = 0; i < row.length - 1; i++) {
                        for (var j = i + 1; j < row.length; j++) {
                            if (row[j].bounds[0] < row[i].bounds[0]) {
                                var tmp = row[i];
                                row[i] = row[j];
                                row[j] = tmp;
                            }
                        }
                    }
                    for (var i = 0; i < row.length; i++) finalResult.push(row[i]);
                }
            }
        }

        return finalResult;
    },

    _fontCache: {},

    getBornomalaFonts: function() {
        if (this._fontCache["bornomala_default"]) return this._fontCache["bornomala_default"];
        var res = { bold: null, regular: null };
        var bNames = ["Bornomala01MJ-Bold", "Bornomala-Bold", "Bornomala02MJ-Bold", "SutonnyMJ-Bold", "SutonnyMJ-Bold-Bold"];
        var rNames = ["Bornomala01MJ-Regular", "Bornomala-Regular", "Bornomala", "Bornomala02MJ", "SutonnyMJ", "SutonnyMJ-Regular"];
        
        for (var b = 0; b < bNames.length; b++) {
            try { res.bold = app.textFonts.getByName(bNames[b]); if (res.bold) break; } catch(e) {}
        }
        for (var r = 0; r < rNames.length; r++) {
            try { res.regular = app.textFonts.getByName(rNames[r]); if (res.regular) break; } catch(e) {}
        }

        if (!res.bold || !res.regular) {
            try {
                for (var i = 0; i < Math.min(app.textFonts.length, 300); i++) {
                    var f = app.textFonts[i];
                    var fn = f.name;
                    var fs = f.style || "";
                    if (/bornomala|sutonny/i.test(fn)) {
                        if (!res.bold && /bold/i.test(fn + fs)) res.bold = f;
                        if (!res.regular && /regular|normal/i.test(fn + fs)) res.regular = f;
                    }
                    if (res.bold && res.regular) break;
                }
            } catch(e) {}
        }
        this._fontCache["bornomala_default"] = res;
        return res;
    },

    getFamilyFonts: function(baseFont) {
        if (!baseFont) return this.getBornomalaFonts();
        var fam = "";
        try { fam = baseFont.family; } catch(e) {}
        if (!fam) {
            try { fam = baseFont.name.split("-")[0]; } catch(e) {}
        }
        if (!fam) return this.getBornomalaFonts();

        var cacheKey = fam.toLowerCase();
        if (this._fontCache[cacheKey]) {
            return this._fontCache[cacheKey];
        }

        var res = { bold: null, regular: null };
        try {
            var bName = baseFont.name;
            var bStyle = baseFont.style || "";
            if (/bold/i.test(bName) || /bold/i.test(bStyle)) res.bold = baseFont;
            else if (/regular|normal/i.test(bName) || /regular|normal/i.test(bStyle)) res.regular = baseFont;
        } catch(e) {}

        if (!res.bold) {
            try { res.bold = app.textFonts.getByName(fam + "-Bold"); } catch(e) {}
        }
        if (!res.regular) {
            try { res.regular = app.textFonts.getByName(fam + "-Regular"); } catch(e) {}
            if (!res.regular) {
                try { res.regular = app.textFonts.getByName(fam); } catch(e) {}
            }
        }

        if (!res.bold || !res.regular) {
            var bn = this.getBornomalaFonts();
            if (!res.bold) res.bold = bn.bold;
            if (!res.regular) res.regular = bn.regular;
        }

        this._fontCache[cacheKey] = res;
        return res;
    },

    applyBoldFont: function(textRangeOrFrame) {
        try {
            var tr = textRangeOrFrame.textRange ? textRangeOrFrame.textRange : textRangeOrFrame;
            if (!tr || !tr.characterAttributes) return;
            var currFont = tr.characterAttributes.textFont;
            if (!currFont) return;
            if (/bold|bl/i.test(currFont.name) || /bold|bl/i.test(currFont.style)) return;

            var pair = this.getFamilyFonts(currFont);
            if (pair.bold) {
                tr.characterAttributes.textFont = pair.bold;
                return;
            }
            var bn = this.getBornomalaFonts();
            if (bn.bold) tr.characterAttributes.textFont = bn.bold;
        } catch (e) {}
    },

    applyRegularFont: function(textRangeOrFrame) {
        try {
            var tr = textRangeOrFrame.textRange ? textRangeOrFrame.textRange : textRangeOrFrame;
            if (!tr || !tr.characterAttributes) return;
            var currFont = tr.characterAttributes.textFont;
            if (!currFont) return;
            if (/regular|normal/i.test(currFont.name) || /regular|normal/i.test(currFont.style)) return;

            var pair = this.getFamilyFonts(currFont);
            if (pair.regular) {
                tr.characterAttributes.textFont = pair.regular;
                return;
            }
            var bn = this.getBornomalaFonts();
            if (bn.regular) tr.characterAttributes.textFont = bn.regular;
        } catch (e) {}
    },

    placeTextBlocksIntoCards: function(payloadJson) {
        if (!app.documents.length) {
            return JSON.stringify({ status: "error", message: "No active Illustrator document found." });
        }
        var doc = app.activeDocument;
        var sel = doc.selection;
        if (!sel || sel.length < 2) {
            return JSON.stringify({
                status: "error",
                message: "Please select both your Template Cards and your Text Blocks on the canvas."
            });
        }

        var payload = {};
        try {
            if (typeof payloadJson === "string") payload = eval('(' + payloadJson + ')');
            else payload = payloadJson;
        } catch(e) {}

        var cardOrder = payload.cardOrder || "column";
        var textOrder = payload.textOrder || "column";
        var offsetX = typeof payload.offsetX === "number" ? payload.offsetX : 45;
        var offsetY = typeof payload.offsetY === "number" ? payload.offsetY : -15;
        var groupPlaced = payload.groupPlaced !== false;
        var bringToFront = payload.bringToFront !== false;

        var allBounds = [];
        for (var k = 0; k < sel.length; k++) {
            allBounds.push({ item: sel[k], x: sel[k].geometricBounds[0] });
        }
        allBounds.sort(function(a, b) { return a.x - b.x; });
        var half = Math.floor(allBounds.length / 2);
        var cards = [];
        var textBlocks = [];
        for (var m = 0; m < half; m++) cards.push(allBounds[m].item);
        for (var n = half; n < allBounds.length; n++) textBlocks.push(allBounds[n].item);

        var sortFn = function(items, ord) {
            if (ord === "column") {
                items.sort(function(a, b) {
                    var aGB = a.geometricBounds;
                    var bGB = b.geometricBounds;
                    if (Math.abs(aGB[0] - bGB[0]) > 60) return aGB[0] - bGB[0];
                    return bGB[1] - aGB[1];
                });
            } else {
                items.sort(function(a, b) {
                    var aGB = a.geometricBounds;
                    var bGB = b.geometricBounds;
                    if (Math.abs(bGB[1] - aGB[1]) > 35) return bGB[1] - aGB[1];
                    return aGB[0] - bGB[0];
                });
            }
        };

        sortFn(cards, cardOrder);
        sortFn(textBlocks, textOrder);

        var count = Math.min(cards.length, textBlocks.length);
        for (var p = 0; p < count; p++) {
            var targetCard = cards[p];
            var srcText = textBlocks[p];
            var cGB = targetCard.geometricBounds;
            var tGB = srcText.geometricBounds;

            var targetX = cGB[0] + offsetX;
            var targetY = cGB[1] + offsetY;

            var currPos = srcText.position;
            var dx = targetX - tGB[0];
            var dy = targetY - tGB[1];

            srcText.position = [currPos[0] + dx, currPos[1] + dy];

            if (bringToFront) {
                srcText.zOrder(ZOrderMethod.BRINGTOFRONT);
            }

            if (groupPlaced && targetCard.typename === "GroupItem" && srcText.parent !== targetCard) {
                try {
                    srcText.moveToBeginning(targetCard);
                } catch (e) {}
            }
        }

        app.redraw();

        return JSON.stringify({
            status: "success",
            count: count,
            message: "Successfully moved " + count + " text blocks into cards!"
        });
    },

    renumberBadges: function(payloadJson) {
        if (!app.documents.length) {
            return JSON.stringify({ status: "error", message: "No active Illustrator document found." });
        }
        var doc = app.activeDocument;
        var sel = doc.selection;
        if (!sel || !sel.length) {
            return JSON.stringify({ status: "error", message: "Please select badge text frames on canvas." });
        }

        var payload = {};
        try {
            if (typeof payloadJson === "string") payload = eval('(' + payloadJson + ')');
            else payload = payloadJson;
        } catch(e) {}

        var style = payload.style || "bangla_2digit";
        var startNum = parseInt(payload.startNum, 10) || 1;
        var prefix = payload.prefix || "";
        var suffix = payload.suffix || "";

        var textFrames = [];
        this.collectTextFrames(sel, textFrames);

        var badges = [];
        for (var i = 0; i < textFrames.length; i++) {
            var tf = textFrames[i];
            var txt = tf.contents.replace(/\s+/g, '');
            if (txt.length <= 4 || this.bengaliToInt(txt) > 0) {
                badges.push(tf);
            }
        }

        if (!badges.length) {
            return JSON.stringify({
                status: "error",
                message: "No number badges found in selection. Ensure badge frames contain short numbers."
            });
        }

        badges.sort(function(a, b) {
            var bTop = b.geometricBounds[1];
            var aTop = a.geometricBounds[1];
            if (Math.abs(bTop - aTop) > 35) return bTop - aTop;
            return a.geometricBounds[0] - b.geometricBounds[0];
        });

        for (var j = 0; j < badges.length; j++) {
            var cur = startNum + j;
            var formatted = "";

            if (style === "bangla_2digit") formatted = this.intToBengali(cur, true);
            else if (style === "bangla") formatted = this.intToBengali(cur, false);
            else if (style === "english_2digit") formatted = (cur < 10 ? "0" : "") + cur;
            else formatted = String(cur);

            badges[j].contents = prefix + formatted + suffix;
        }

        app.redraw();

        return JSON.stringify({
            status: "success",
            count: badges.length,
            message: "Successfully renumbered " + badges.length + " card badges!"
        });
    },

    getAccurateCardBounds: function(item, customW, customH) {
        if (!item) return { width: 192, height: 98, bounds: [0, 0, 192, -98] };

        var gb = item.geometricBounds;
        var w = gb[2] - gb[0];
        var h = gb[1] - gb[3];
        var b = [gb[0], gb[1], gb[2], gb[3]];

        if (customW > 0 && customH > 0) {
            return {
                width: customW,
                height: customH,
                bounds: [b[0], b[1], b[0] + customW, b[1] - customH]
            };
        }

        // Check if group has clipping mask
        if (item.typename === "GroupItem") {
            try {
                if (item.clipped) {
                    for (var c = 0; c < item.pageItems.length; c++) {
                        var cp = item.pageItems[c];
                        if (cp.clipping) {
                            var cgb = cp.geometricBounds;
                            return {
                                width: Math.round(cgb[2] - cgb[0]),
                                height: Math.round(cgb[1] - cgb[3]),
                                bounds: cgb
                            };
                        }
                    }
                }
            } catch (e) {}

            // Search for primary card background path inside group
            try {
                for (var i = 0; i < item.pageItems.length; i++) {
                    var sub = item.pageItems[i];
                    if (sub.clipping) {
                        var sgb = sub.geometricBounds;
                        return {
                            width: Math.round(sgb[2] - sgb[0]),
                            height: Math.round(sgb[1] - sgb[3]),
                            bounds: sgb
                        };
                    }
                    if (sub.typename === "PathItem" && sub.closed) {
                        var pb = sub.geometricBounds;
                        var pw = Math.round(pb[2] - pb[0]);
                        var ph = Math.round(pb[1] - pb[3]);
                        if (pw >= 150 && pw <= 240 && ph >= 70 && ph <= 130) {
                            return {
                                width: pw,
                                height: ph,
                                bounds: pb
                            };
                        }
                    }
                }
            } catch (e2) {}
        }

        return {
            width: Math.round(w),
            height: Math.round(h),
            bounds: b
        };
    },

    duplicateCardTemplates: function(payloadJson) {
        if (!app.documents.length) {
            return JSON.stringify({ status: "error", message: "No active Illustrator document found." });
        }
        var doc = app.activeDocument;
        var sel = doc.selection;
        if (!sel || sel.length === 0) {
            return JSON.stringify({ status: "error", message: "Please select your template card on canvas first." });
        }

        var payload;
        try {
            if (typeof payloadJson === "string") {
                payload = eval('(' + payloadJson + ')');
                if (typeof payload === "string") payload = eval('(' + payload + ')');
            } else {
                payload = payloadJson;
            }
        } catch (e) {
            return JSON.stringify({ status: "error", message: "Invalid payload JSON: " + e.message });
        }

        var totalCopies = parseInt(payload.totalCopies, 10) || 20;
        var cardsPerAB = parseInt(payload.cardsPerArtboard, 10) || 20;
        var customCols = parseInt(payload.cols, 10) || 0;
        var gapX = parseFloat(payload.gapX) || 0;
        var gapY = parseFloat(payload.gapY) || 0;
        var fitArtboard = payload.fitArtboard !== false;

        var customW = parseFloat(payload.cardW) || 0;
        var customH = parseFloat(payload.cardH) || 0;

        if (totalCopies <= 0) totalCopies = 1;
        if (cardsPerAB <= 0) cardsPerAB = 20;

        // Form single master item if selection has multiple loose items
        var masterItem = null;
        if (sel.length === 1) {
            masterItem = sel[0];
        } else {
            var grp = doc.groupItems.add();
            for (var s = sel.length - 1; s >= 0; s--) {
                sel[s].moveToBeginning(grp);
            }
            masterItem = grp;
        }

        try { if (masterItem.locked) masterItem.locked = false; } catch (e) {}

        var accurate = this.getAccurateCardBounds(masterItem, customW, customH);
        var cardW = accurate.width;
        var cardH = accurate.height;
        var refBounds = accurate.bounds;
        var curRefLeft = refBounds[0];
        var curRefTop = refBounds[1];

        var curABIndex = doc.artboards.getActiveArtboardIndex();
        var baseAB = doc.artboards[curABIndex];
        var baseRect = baseAB.artboardRect;
        var baseW = baseRect[2] - baseRect[0];
        var baseH = baseRect[1] - baseRect[3];

        // Determine columns
        var cols = customCols;
        if (cols <= 0) {
            cols = Math.max(1, Math.floor((baseW + gapX) / (cardW + gapX)));
        }

        var rowsPerAB = Math.ceil(cardsPerAB / cols);
        var totalGridW = cols * cardW + (cols - 1) * gapX;
        var totalGridH = rowsPerAB * cardH + (rowsPerAB - 1) * gapY;

        var marginX = 15;
        var marginY = 15;

        // Calculate uniform artboard dimensions
        var finalABW = fitArtboard ? Math.max(baseW, Math.round(totalGridW + 2 * marginX)) : baseW;
        var finalABH = fitArtboard ? Math.round(totalGridH + 2 * marginY) : baseH;

        // Resize the base artboard
        baseAB.artboardRect = [baseRect[0], baseRect[1], baseRect[0] + finalABW, baseRect[1] - finalABH];

        var marginL = Math.max(marginX, (finalABW - totalGridW) / 2);
        var marginT = marginY;

        var totalABsNeeded = Math.ceil(totalCopies / cardsPerAB);
        var abList = [baseAB];

        // Find rightmost artboard edge to prevent overlap
        var maxRight = -999999;
        var topRef = baseRect[1];
        for (var abIdx = 0; abIdx < doc.artboards.length; abIdx++) {
            var r = doc.artboards[abIdx].artboardRect;
            if (r[2] > maxRight) maxRight = r[2];
        }

        // Create new artboards with identical dimensions
        for (var a = 1; a < totalABsNeeded; a++) {
            var nLeft = maxRight + 50;
            var nTop = topRef;
            var nRight = nLeft + finalABW;
            var nBottom = nTop - finalABH;
            var newAB = doc.artboards.add([nLeft, nTop, nRight, nBottom]);
            newAB.name = "Sheet " + (doc.artboards.length);
            abList.push(newAB);
            maxRight = nRight;
        }

        var placedItems = [];
        var targetX_0 = baseRect[0] + marginL;
        var targetY_0 = baseRect[1] - marginT;

        for (var i = 0; i < totalCopies; i++) {
            var abPage = Math.floor(i / cardsPerAB);
            var idxOnPage = i % cardsPerAB;
            var c = idxOnPage % cols;
            var r = Math.floor(idxOnPage / cols);

            var targetAB = abList[abPage];
            var tRect = targetAB.artboardRect;

            var targetX = tRect[0] + marginL + c * (cardW + gapX);
            var targetY = tRect[1] - marginT - r * (cardH + gapY);

            var itemToPlace;
            if (i === 0) {
                var dX = targetX - curRefLeft;
                var dY = targetY - curRefTop;
                masterItem.translate(dX, dY);
                itemToPlace = masterItem;
            } else {
                var dup = masterItem.duplicate();
                var dX = targetX - targetX_0;
                var dY = targetY - targetY_0;
                dup.translate(dX, dY);
                itemToPlace = dup;
            }
            try { itemToPlace.note = ""; } catch(e) {}
            placedItems.push(itemToPlace);
        }

        app.redraw();

        return JSON.stringify({
            status: "success",
            totalCopies: totalCopies,
            artboardsUsed: totalABsNeeded,
            cardSize: Math.round(cardW) + " x " + Math.round(cardH) + " pt",
            artboardSize: Math.round(finalABW) + " x " + Math.round(finalABH) + " pt",
            message: "Successfully generated " + totalCopies + " templates! Card: " + Math.round(cardW) + "x" + Math.round(cardH) + " pt | Gap: " + gapX + "x" + gapY + " pt | Artboard: " + Math.round(finalABW) + "x" + Math.round(finalABH) + " pt"
        });
    },

    formatDetailsText: function(details) {
        if (!details) return "";
        var lines = details.replace(/\r\n|\n/g, "\r").split("\r");
        var out = [];
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].replace(/^\s+|\s+$/g, "");
            if (!line) continue;

            var phoneMatch = line.match(/(\+?(?:88)?01[0-9\-]{8,15}|[০-৯\-]{10,15})/);
            var phone = "";
            var rest = line;
            if (phoneMatch) {
                phone = phoneMatch[1].replace(/^\s+|\s+$/g, "");
                rest = (line.substring(0, phoneMatch.index) + line.substring(phoneMatch.index + phoneMatch[0].length)).replace(/^[\s,]+|[\s,]+$/g, "");
            }

            var pitaIdx = rest.indexOf("পিতা:");
            if (pitaIdx !== -1) {
                var afterPita = rest.substring(pitaIdx + 5).replace(/^\s+|\s+$/g, "");
                var parts = afterPita.split(",");
                if (parts.length >= 2) {
                    var pName = ("পিতা: " + parts[0]).replace(/^\s+|\s+$/g, "");
                    var addrParts = [];
                    for (var p = 1; p < parts.length; p++) {
                        var pt = parts[p].replace(/^\s+|\s+$/g, "");
                        if (pt) addrParts.push(pt);
                    }
                    out.push(pName);
                    if (addrParts.length > 0) out.push(addrParts.join(", "));
                } else {
                    out.push(rest);
                }
            } else {
                out.push(rest);
            }

            if (phone) out.push(phone);
        }
        return out.join("\r");
    },

    toBengaliDigits: function(str) {
        if (!str) return "";
        var bn = {'0':'০','1':'১','2':'২','3':'৩','4':'৪','5':'৫','6':'৬','7':'৭','8':'৮','9':'৯'};
        return String(str).replace(/[0-9]/g, function(d) { return bn[d] || d; });
    },

    getAdaptiveHScale: function(lineText, baseHScale, maxStandardChars) {
        if (!lineText) return baseHScale;
        var clean = lineText.replace(/^\s+|\s+$/g, '').replace(/\r|\n/g, '');
        var len = clean.length;
        var standardCapacity = maxStandardChars || 22;
        if (len <= standardCapacity) {
            return baseHScale;
        }
        var ratio = standardCapacity / len;
        var calculated = baseHScale * ratio;
        return Math.max(56, Math.min(baseHScale, Math.round(calculated * 10) / 10));
    },

    populateCards: function(jsonPayload) {
        var doc = this.getActiveDoc();
        if (!doc) {
            return JSON.stringify({
                status: "error",
                message: "No active Illustrator document found. Please open or create a document."
            });
        }

        var payload = {};
        try {
            if (typeof jsonPayload === "string") {
                payload = eval('(' + jsonPayload + ')');
            } else {
                payload = jsonPayload;
            }
        } catch (e) {
            return JSON.stringify({
                status: "error",
                message: "Failed to parse data: " + e.message
            });
        }

        var entries = payload.entries || [];
        if (!entries.length) {
            return JSON.stringify({
                status: "error",
                message: "No entries to populate."
            });
        }

        var scope = payload.scope || "artboard";
        var order = payload.order || "column";
        var makeBold = payload.makeBold !== false;
        var fillBani = payload.fillBani === true;
        var isSingleColor = payload.singleColor === true;
        var skipFilledCards = payload.skipFilledCards !== false;
        var startIndex = parseInt(payload.startIndex, 10) || 0;

        var detailsHScale = parseFloat(payload.detailsHScale);
        if (isNaN(detailsHScale) || detailsHScale <= 0) detailsHScale = 85;

        var nameHScale = parseFloat(payload.nameHScale);
        if (isNaN(nameHScale) || nameHScale <= 0) nameHScale = 100;

        var userDetailsLeading = parseFloat(payload.detailsLeading);
        var hasCustomDetailsLeading = (!isNaN(userDetailsLeading) && userDetailsLeading > 0);

        var userNameLeading = parseFloat(payload.nameLeading);
        var hasCustomNameLeading = (!isNaN(userNameLeading) && userNameLeading > 0);

        var cards = this.detectCards(scope);
        if (!cards.length) {
            return JSON.stringify({
                status: "error",
                message: "No card templates detected. Make sure your cards are visible and unlocked."
            });
        }

        cards = this.sortCards(cards, order);

        var targetCards = [];
        // If starting from index 0 or in selection scope, populate all detected cards sequentially
        if (!skipFilledCards || scope === "selection" || startIndex === 0) {
            targetCards = cards;
        } else {
            for (var c = 0; c < cards.length; c++) {
                var card = cards[c];
                var cardNm = card.nameFrame ? card.nameFrame.contents.split(/\r|\n/)[0].replace(/\s+/g, '') : "";

                var isPriorEntry = false;
                for (var p = 0; p < startIndex && p < entries.length; p++) {
                    if (entries[p].name && entries[p].name.replace(/\s+/g, '') === cardNm) {
                        isPriorEntry = true;
                        break;
                    }
                }
                if (isPriorEntry) continue;

                targetCards.push(card);
            }
        }

        if (targetCards.length === 0) {
            targetCards = cards;
        }

        var activeEntries = entries.slice(startIndex);
        if (activeEntries.length === 0) {
            startIndex = 0;
            activeEntries = entries;
        }

        var docNameColor = null;
        var docBoldFont = null;
        var docRegularFont = null;
        var docDetailsLeading = null;
        var docNameLeading = null;
        var docBaniLeading = null;

        for (var tc = 0; tc < targetCards.length; tc++) {
            var cCard = targetCards[tc];
            var cTF = cCard.nameFrame;
            if (cTF && cTF.paragraphs.length > 0) {
                try {
                    var p0 = cTF.paragraphs[0];
                    if (p0 && p0.characterAttributes) {
                        var f0 = p0.characterAttributes.textFont;
                        if (f0 && (!docBoldFont || f0.name.indexOf("Bold") !== -1)) docBoldFont = f0;
                        var fc = p0.characterAttributes.fillColor;
                        if (!docNameColor && fc && fc.typename !== "NoColor") {
                            if (fc.typename === "SpotColor" || (fc.typename === "CMYKColor" && fc.magenta > 50)) {
                                docNameColor = fc;
                            }
                        }
                        if (!docNameLeading && p0.characterAttributes.leading > 0) {
                            docNameLeading = p0.characterAttributes.leading;
                        }
                    }

                    if (cTF.paragraphs.length > 1) {
                        var p1 = cTF.paragraphs[1];
                        if (p1 && p1.characterAttributes) {
                            var f1 = p1.characterAttributes.textFont;
                            if (f1 && (!docRegularFont || f1.name.indexOf("Bold") === -1)) docRegularFont = f1;
                            if (!docDetailsLeading && p1.characterAttributes.leading > 0) {
                                docDetailsLeading = p1.characterAttributes.leading;
                            }
                        }
                    }
                } catch(e) {}
            }

            if (docBoldFont && docRegularFont && docNameColor && docDetailsLeading && docNameLeading) break;
        }

        var bornomalaPair = this.getBornomalaFonts();
        if (!docBoldFont) docBoldFont = bornomalaPair.bold;
        if (!docRegularFont) docRegularFont = bornomalaPair.regular;

        var solidBlackCMYK = new CMYKColor();
        solidBlackCMYK.cyan = 0; solidBlackCMYK.magenta = 0; solidBlackCMYK.yellow = 0; solidBlackCMYK.black = 100;

        var solidWhiteCMYK = new CMYKColor();
        solidWhiteCMYK.cyan = 0; solidWhiteCMYK.magenta = 0; solidWhiteCMYK.yellow = 0; solidWhiteCMYK.black = 0;

        var globalBoldFont = docBoldFont;
        var globalRegularFont = docRegularFont || docBoldFont;

        // Master template styles matching original cards perfectly
        var masterTplName = { size: 13.0, leading: 6.46, tracking: -5, hScale: 80.0, font: globalBoldFont, color: null, just: null };
        var masterTplDetails = { size: 10.0, leading: 13.0, tracking: 0, hScale: 95.0, font: globalRegularFont, color: null, just: null };
        var masterTplSerial = { size: 8.1956, leading: 8.4, tracking: 0, hScale: 90.3, font: globalBoldFont, color: null, just: null };
        var masterTplForm = { size: 5.3181, leading: 5.5884, tracking: -50, hScale: 98.6, font: globalRegularFont, color: null, just: null };

        for (var tci = 0; tci < targetCards.length; tci++) {
            var sampleCard = targetCards[tci];
            try {
                if (sampleCard.nameFrame && sampleCard.nameFrame.textRange) {
                    var sTr = sampleCard.nameFrame.textRange;
                    var sz = sTr.characterAttributes.size;
                    if (sz > 0) masterTplName.size = sz;
                    if (sTr.characterAttributes.leading > 0) masterTplName.leading = sTr.characterAttributes.leading;
                    if (sTr.characterAttributes.horizontalScale > 0 && sTr.characterAttributes.horizontalScale <= 100) masterTplName.hScale = sTr.characterAttributes.horizontalScale;
                    if (sTr.characterAttributes.textFont) masterTplName.font = sTr.characterAttributes.textFont;
                    if (sTr.characterAttributes.fillColor && sTr.characterAttributes.fillColor.typename !== "NoColor") masterTplName.color = sTr.characterAttributes.fillColor;
                    try { masterTplName.just = sTr.paragraphAttributes.justification; } catch(j0e) {}
                }
                if (sampleCard.detailsFrame && sampleCard.detailsFrame.textRange) {
                    var sdTr = sampleCard.detailsFrame.textRange;
                    if (sdTr.characterAttributes.size > 0) masterTplDetails.size = sdTr.characterAttributes.size;
                    if (sdTr.characterAttributes.leading > 0) masterTplDetails.leading = sdTr.characterAttributes.leading;
                    if (sdTr.characterAttributes.horizontalScale > 0) masterTplDetails.hScale = sdTr.characterAttributes.horizontalScale;
                    if (sdTr.characterAttributes.textFont) masterTplDetails.font = sdTr.characterAttributes.textFont;
                    if (sdTr.characterAttributes.fillColor && sdTr.characterAttributes.fillColor.typename !== "NoColor") masterTplDetails.color = sdTr.characterAttributes.fillColor;
                }
                if (sampleCard.serialFrame && sampleCard.serialFrame.textRange) {
                    var ssTr = sampleCard.serialFrame.textRange;
                    if (ssTr.characterAttributes.size > 0) masterTplSerial.size = ssTr.characterAttributes.size;
                    if (ssTr.characterAttributes.leading > 0) masterTplSerial.leading = ssTr.characterAttributes.leading;
                    if (ssTr.characterAttributes.horizontalScale > 0) masterTplSerial.hScale = ssTr.characterAttributes.horizontalScale;
                    if (ssTr.characterAttributes.textFont) masterTplSerial.font = ssTr.characterAttributes.textFont;
                    if (ssTr.characterAttributes.fillColor && ssTr.characterAttributes.fillColor.typename !== "NoColor") masterTplSerial.color = ssTr.characterAttributes.fillColor;
                }
                if (sampleCard.formFrame && sampleCard.formFrame.textRange) {
                    var sfTr = sampleCard.formFrame.textRange;
                    if (sfTr.characterAttributes.size > 0) masterTplForm.size = sfTr.characterAttributes.size;
                    if (sfTr.characterAttributes.leading > 0) masterTplForm.leading = sfTr.characterAttributes.leading;
                    if (sfTr.characterAttributes.horizontalScale > 0) masterTplForm.hScale = sfTr.characterAttributes.horizontalScale;
                    if (sfTr.characterAttributes.textFont) masterTplForm.font = sfTr.characterAttributes.textFont;
                }
                break;
            } catch(e) {}
        }

        var isCMYK = (doc.documentColorSpace === DocumentColorSpace.CMYK);
        var userChosenColor = null;
        if (!isSingleColor) {
            // 1. Direct CMYK Array from payload (e.g. [100, 0, 0, 45])
            if (isCMYK && payload.nameCmyk && payload.nameCmyk.length >= 4) {
                var cVal = Math.max(0, Math.min(100, Math.round(Number(payload.nameCmyk[0]))));
                var mVal = Math.max(0, Math.min(100, Math.round(Number(payload.nameCmyk[1]))));
                var yVal = Math.max(0, Math.min(100, Math.round(Number(payload.nameCmyk[2]))));
                var kVal = Math.max(0, Math.min(100, Math.round(Number(payload.nameCmyk[3]))));
                var userCmyk = new CMYKColor();
                userCmyk.cyan = cVal;
                userCmyk.magenta = mVal;
                userCmyk.yellow = yVal;
                userCmyk.black = kVal;
                userChosenColor = userCmyk;
            }

            // 2. NameColor string / hex
            if (!userChosenColor && payload.nameColor) {
                var rawHex = String(payload.nameColor).replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
                if (isCMYK && (rawHex === "006F9A" || rawHex === "008C8C" || rawHex === "1E5AA8")) {
                    var tealCmyk = new CMYKColor();
                    tealCmyk.cyan = 100;
                    tealCmyk.magenta = 0;
                    tealCmyk.yellow = 0;
                    tealCmyk.black = 45;
                    userChosenColor = tealCmyk;
                } else if (rawHex === "000000" || rawHex === "000") {
                    userChosenColor = solidBlackCMYK;
                } else {
                    try {
                        var sw = doc.swatches.getByName(payload.nameColor);
                        if (sw) userChosenColor = sw.color;
                    } catch(e) {}

                    if (!userChosenColor && (rawHex.length === 3 || rawHex.length === 6)) {
                        userChosenColor = this.hexToColor(rawHex, isCMYK);
                    }
                }
            }
        }

        var finalNameColor = isSingleColor ? solidBlackCMYK : (userChosenColor || masterTplName.color || docNameColor || solidBlackCMYK);
        var finalDetailsColor = masterTplDetails.color || solidBlackCMYK;

        var filledCount = 0;
        var fillLimit = Math.min(targetCards.length, activeEntries.length);

                for (var i = 0; i < fillLimit; i++) {
            var card = targetCards[i];
            var entry = activeEntries[i];

            // 1. Scan the card's CURRENT styling directly from its existing text frames before writing
            var cardNameStyle = {
                font: masterTplName.font || globalBoldFont,
                size: masterTplName.size || 13.0,
                leading: masterTplName.leading || 12.0,
                hScale: masterTplName.hScale || 100.0,
                tracking: masterTplName.tracking || 0,
                color: masterTplName.color || solidBlackCMYK,
                just: masterTplName.just
            };

            var cardDetStyle = {
                font: masterTplDetails.font || globalRegularFont,
                size: masterTplDetails.size || 10.0,
                leading: masterTplDetails.leading || 11.5,
                hScale: masterTplDetails.hScale || 100.0,
                tracking: masterTplDetails.tracking || 0,
                color: masterTplDetails.color || solidBlackCMYK,
                just: masterTplDetails.just
            };

            var cardSerialStyle = {
                font: masterTplSerial.font || globalBoldFont,
                size: masterTplSerial.size || 8.5,
                leading: masterTplSerial.leading || 8.5,
                hScale: masterTplSerial.hScale || 100.0,
                tracking: masterTplSerial.tracking || 0,
                color: masterTplSerial.color || solidBlackCMYK,
                just: masterTplSerial.just
            };

            // Inspect card.nameFrame
            if (card.nameFrame && card.nameFrame.paragraphs && card.nameFrame.paragraphs.length > 0) {
                try {
                    var p0 = card.nameFrame.paragraphs[0];
                    if (p0 && p0.characters.length > 0) {
                        var ca0 = p0.characters[0].characterAttributes;
                        if (ca0.textFont) cardNameStyle.font = ca0.textFont;
                        if (ca0.size > 0) cardNameStyle.size = ca0.size;
                        if (ca0.leading > 0) cardNameStyle.leading = ca0.leading;
                        if (ca0.horizontalScale > 0) cardNameStyle.hScale = ca0.horizontalScale;
                        cardNameStyle.tracking = ca0.tracking;
                        if (ca0.fillColor && ca0.fillColor.typename !== "NoColor") cardNameStyle.color = ca0.fillColor;
                        try { cardNameStyle.just = p0.paragraphAttributes.justification; } catch(j0) {}
                    }

                    if (card.nameFrame.paragraphs.length > 1) {
                        var p1 = card.nameFrame.paragraphs[1];
                        if (p1 && p1.characters.length > 0) {
                            var ca1 = p1.characters[0].characterAttributes;
                            if (ca1.textFont) cardDetStyle.font = ca1.textFont;
                            if (ca1.size > 0) cardDetStyle.size = ca1.size;
                            if (ca1.leading > 0) cardDetStyle.leading = ca1.leading;
                            if (ca1.horizontalScale > 0) cardDetStyle.hScale = ca1.horizontalScale;
                            cardDetStyle.tracking = ca1.tracking;
                            if (ca1.fillColor && ca1.fillColor.typename !== "NoColor") {
                                if (isCMYK && ca1.fillColor.typename === "CMYKColor") {
                                    if (ca1.fillColor.magenta === 0 && ca1.fillColor.yellow === 0) {
                                        cardDetStyle.color = ca1.fillColor;
                                    } else {
                                        cardDetStyle.color = solidBlackCMYK;
                                    }
                                } else if (isCMYK) {
                                    cardDetStyle.color = solidBlackCMYK;
                                } else {
                                    cardDetStyle.color = ca1.fillColor;
                                }
                            }
                            try { cardDetStyle.just = p1.paragraphAttributes.justification; } catch(j1) {}
                        }
                    }
                } catch(sc0e) {}
            }

            // Inspect card.detailsFrame (if separate)
            if (card.detailsFrame && card.detailsFrame.paragraphs && card.detailsFrame.paragraphs.length > 0) {
                try {
                    var dp0 = card.detailsFrame.paragraphs[0];
                    if (dp0 && dp0.characters.length > 0) {
                        var dca0 = dp0.characters[0].characterAttributes;
                        if (dca0.textFont) cardDetStyle.font = dca0.textFont;
                        if (dca0.size > 0) cardDetStyle.size = dca0.size;
                        if (dca0.leading > 0) cardDetStyle.leading = dca0.leading;
                        if (dca0.horizontalScale > 0) cardDetStyle.hScale = dca0.horizontalScale;
                        cardDetStyle.tracking = dca0.tracking;
                        if (dca0.fillColor && dca0.fillColor.typename !== "NoColor") cardDetStyle.color = dca0.fillColor;
                        try { cardDetStyle.just = dp0.paragraphAttributes.justification; } catch(dj0) {}
                    }
                } catch(sc1e) {}
            }

            // Inspect card.serialFrame
            if (card.serialFrame && card.serialFrame.characters.length > 0) {
                try {
                    var sca = card.serialFrame.characters[0].characterAttributes;
                    if (sca.textFont) cardSerialStyle.font = sca.textFont;
                    if (sca.size > 0) cardSerialStyle.size = sca.size;
                    if (sca.leading > 0) cardSerialStyle.leading = sca.leading;
                    if (sca.horizontalScale > 0) cardSerialStyle.hScale = sca.horizontalScale;
                    cardSerialStyle.tracking = sca.tracking;
                    if (sca.fillColor && sca.fillColor.typename !== "NoColor") {
                        if (isCMYK && sca.fillColor.typename === "CMYKColor") {
                            if (sca.fillColor.magenta === 0 && sca.fillColor.yellow === 0) {
                                cardSerialStyle.color = sca.fillColor;
                            } else {
                                cardSerialStyle.color = solidBlackCMYK;
                            }
                        } else if (isCMYK) {
                            cardSerialStyle.color = solidBlackCMYK;
                        } else {
                            cardSerialStyle.color = sca.fillColor;
                        }
                    }
                    try { cardSerialStyle.just = card.serialFrame.paragraphs[0].paragraphAttributes.justification; } catch(sj0) {}
                } catch(sc2e) {}
            }

            // User overrides
            if (userChosenColor) cardNameStyle.color = userChosenColor;
            else if (isSingleColor) cardNameStyle.color = solidBlackCMYK;
            if (hasCustomNameLeading) cardNameStyle.leading = userNameLeading;
            if (hasCustomDetailsLeading) cardDetStyle.leading = userDetailsLeading;
            if (payload.nameHScale !== undefined && payload.nameHScale !== 100) cardNameStyle.hScale = nameHScale;
            if (payload.detailsHScale !== undefined && payload.detailsHScale !== 85 && payload.detailsHScale !== 95) cardDetStyle.hScale = detailsHScale;

            // --- STEP 2: POPULATE SERIAL / KROMIK ---
            if (card.serialFrame && entry.serial) {
                try {
                    var sVal = entry.serial;
                    var sFont = cardSerialStyle.font || cardNameStyle.font;
                    var isAnsiFont = (sFont && /sutonny|bornomala/i.test(sFont.name));
                    if (isAnsiFont && /sutonny/i.test(sFont.name)) {
                        var bnToAscii = {"০":"0","১":"1","২":"2","৩":"3","৪":"4","৫":"5","৬":"6","৭":"7","৮":"8","৯":"9"};
                        sVal = String(sVal).replace(/[০-৯]/g, function(d) { return bnToAscii[d] || d; });
                    }
                    card.serialFrame.contents = sVal;
                    try {
                        var sAttr = card.serialFrame.textRange.characterAttributes;
                        if (sFont) sAttr.textFont = sFont;
                        sAttr.size = cardSerialStyle.size;
                        sAttr.leading = cardSerialStyle.leading;
                        sAttr.tracking = cardSerialStyle.tracking;
                        sAttr.horizontalScale = cardSerialStyle.hScale;
                        sAttr.fillColor = cardSerialStyle.color;
                        if (cardSerialStyle.just !== null) card.serialFrame.textRange.paragraphAttributes.justification = cardSerialStyle.just;
                        card.serialFrame.textRange.paragraphAttributes.spaceBefore = 0;
                        card.serialFrame.textRange.paragraphAttributes.spaceAfter = 0;
                    } catch(sStyErr) {}
                } catch(serErr) {}
            }

            // --- STEP 3: POPULATE FORM NUMBER (Bottom-Right Box - Strictly 2 Lines) ---
            var formHandled = false;
            var shouldFillForm = (payload.fillForm !== false);
            if (card.formFrame && shouldFillForm && (entry.formNumber || entry.form)) {
                try {
                    var rawForm = (entry.formNumber || entry.form || "").replace(/^\s+|\s+$/g, "");
                    var mDigits = rawForm.match(/([০-৯0-9]+)/);
                    var formDigits = "";
                    if (mDigits) {
                        formDigits = this.toBengaliDigits(mDigits[1]);
                    } else {
                        var cleanDigits = rawForm.replace(/^[^:\d]+[:\-\s]*/, "").replace(/^\s+|\s+$/g, "");
                        formDigits = this.toBengaliDigits(cleanDigits);
                    }

                    // Detect original label from existing formFrame text if available
                    var formLabel = "ফরম";
                    var existingFormTxt = card.formFrame.contents.replace(/^\s+|\s+$/g, "");
                    if (/(?:দাখেলা|ডাকো|‡`v‡Ljv)/i.test(existingFormTxt) || /^(দাখেলা|রোল|Roll|Form)/i.test(rawForm)) {
                        formLabel = "দাখেলা";
                    } else if (/^(দাখেলা|রোল|Roll|Form)/i.test(rawForm)) {
                        var mLabel = rawForm.match(/^([^:\d]+)/);
                        if (mLabel) formLabel = mLabel[1].replace(/[:\s]+$/, "");
                    }

                    // Read existing form frame styling
                    var formFont = globalRegularFont;
                    var formSize = tplForm.size || 5.3181;
                    var formLeading = tplForm.leading || 5.5884;
                    var formHScale = tplForm.hScale || 98.6;
                    var formTracking = tplForm.tracking || -50;
                    var formJust = tplForm.just || null;

                    try {
                        if (card.formFrame.characters.length > 0) {
                            var fca = card.formFrame.characters[0].characterAttributes;
                            if (fca.textFont) formFont = fca.textFont;
                            if (fca.size > 0) formSize = fca.size;
                            if (fca.leading > 0) formLeading = fca.leading;
                            if (fca.horizontalScale > 0) formHScale = fca.horizontalScale;
                            formTracking = fca.tracking;
                            try { formJust = card.formFrame.paragraphs[0].paragraphAttributes.justification; } catch(fj) {}
                        }
                    } catch(f0e) {}

                    // Write 2 lines strictly: Label on Line 1, Number on Line 2
                    card.formFrame.contents = formLabel + "\r" + formDigits;
                    try {
                        var fAttr = card.formFrame.textRange.characterAttributes;
                        if (formFont) fAttr.textFont = formFont;
                        fAttr.size = formSize;
                        fAttr.leading = formLeading;
                        fAttr.tracking = formTracking;
                        fAttr.horizontalScale = formHScale;
                        fAttr.fillColor = solidBlackCMYK;
                        if (formJust !== null) card.formFrame.textRange.paragraphAttributes.justification = formJust;
                        card.formFrame.textRange.paragraphAttributes.spaceBefore = 0;
                        card.formFrame.textRange.paragraphAttributes.spaceAfter = 0;

                        for (var fPi = 0; fPi < card.formFrame.paragraphs.length; fPi++) {
                            try {
                                var fp = card.formFrame.paragraphs[fPi];
                                fp.characterAttributes.size = formSize;
                                fp.characterAttributes.leading = formLeading;
                                fp.characterAttributes.tracking = formTracking;
                                fp.characterAttributes.horizontalScale = formHScale;
                                fp.characterAttributes.fillColor = solidBlackCMYK;
                                fp.paragraphAttributes.spaceBefore = 0;
                                fp.paragraphAttributes.spaceAfter = 0;
                            } catch(fpe) {}
                        }
                    } catch(fStyErr) {}
                    formHandled = true;
                } catch(ffErr) {}
            }

            // --- STEP 4: POPULATE NAME & DETAILS ---
            try {
                if (card.nameFrame && entry.name) {
                    var cleanName = (entry.name || "").replace(/^\s+|\s+$/g, "");
                    var cleanDetails = (entry.details || "").replace(/^\s+|\s+$/g, "");
                    cleanDetails = cleanDetails.split("\r\n").join("\r").split("\n").join("\r");

                    var rawLines = cleanDetails.split("\r");
                    var nonFormLines = [];
                    for (var rli = 0; rli < rawLines.length; rli++) {
                        var rlText = rawLines[rli].replace(/^\s+|\s+$/g, "");
                        if (!rlText) continue;
                        if (/(?:ফরম|দাখেলা|রোল|Form|Roll|‡¶´|‡dvi|diBk|‡ivj)/i.test(rlText)) {
                            continue;
                        }
                        nonFormLines.push(rlText);
                    }
                    cleanDetails = nonFormLines.join("\r");

                    if (card.detailsFrame) {
                        // Separate Name and Details frames
                        card.nameFrame.contents = cleanName;
                        try {
                            var nTr = card.nameFrame.textRange;
                            if (cardNameStyle.font) nTr.characterAttributes.textFont = cardNameStyle.font;
                            nTr.characterAttributes.size = cardNameStyle.size;
                            nTr.characterAttributes.leading = cardNameStyle.leading;
                            nTr.characterAttributes.tracking = cardNameStyle.tracking;
                            nTr.characterAttributes.horizontalScale = cardNameStyle.hScale;
                            nTr.characterAttributes.fillColor = cardNameStyle.color;
                            if (cardNameStyle.just !== null) nTr.paragraphAttributes.justification = cardNameStyle.just;
                            nTr.paragraphAttributes.spaceBefore = 0;
                            nTr.paragraphAttributes.spaceAfter = 0;
                        } catch(nErr) {}

                        if (cleanDetails) {
                            card.detailsFrame.contents = cleanDetails;
                            try {
                                var dLen = card.detailsFrame.paragraphs.length;
                                for (var dp = 0; dp < dLen; dp++) {
                                    try {
                                        var dParaItem = card.detailsFrame.paragraphs[dp];
                                        if (!dParaItem || dParaItem.characters.length === 0) continue;
                                        if (cardDetStyle.font) dParaItem.characterAttributes.textFont = cardDetStyle.font;
                                        dParaItem.characterAttributes.size = cardDetStyle.size;
                                        dParaItem.characterAttributes.leading = cardDetStyle.leading;
                                        dParaItem.characterAttributes.tracking = cardDetStyle.tracking;
                                        dParaItem.characterAttributes.horizontalScale = cardDetStyle.hScale;
                                        dParaItem.characterAttributes.fillColor = cardDetStyle.color;
                                        if (cardDetStyle.just !== null) dParaItem.paragraphAttributes.justification = cardDetStyle.just;
                                        dParaItem.paragraphAttributes.spaceBefore = 0;
                                        dParaItem.paragraphAttributes.spaceAfter = 0;
                                    } catch(dpe) {}
                                }
                            } catch(e) {}
                        }
                    } else {
                        // Single combined text frame (Name on line 1, details on lines 2..N)
                        var fullInfo = cleanDetails ? (cleanName + "\r" + cleanDetails) : cleanName;
                        card.nameFrame.contents = fullInfo;

                        // 1. Apply base details styling to entire frame
                        try {
                            var nTr = card.nameFrame.textRange;
                            if (cardDetStyle.font) nTr.characterAttributes.textFont = cardDetStyle.font;
                            nTr.characterAttributes.size = cardDetStyle.size;
                            nTr.characterAttributes.leading = cardDetStyle.leading;
                            nTr.characterAttributes.tracking = cardDetStyle.tracking;
                            nTr.characterAttributes.horizontalScale = cardDetStyle.hScale;
                            nTr.characterAttributes.fillColor = cardDetStyle.color;
                            if (cardDetStyle.just !== null) nTr.paragraphAttributes.justification = cardDetStyle.just;
                            nTr.paragraphAttributes.spaceBefore = 0;
                            nTr.paragraphAttributes.spaceAfter = 0;
                        } catch(bStyErr) {}

                        // 2. Apply Name styling specifically to Paragraph 0 (Student Name)
                        try {
                            if (card.nameFrame.paragraphs.length > 0) {
                                var p0 = card.nameFrame.paragraphs[0];
                                if (cardNameStyle.font) p0.characterAttributes.textFont = cardNameStyle.font;
                                p0.characterAttributes.size = cardNameStyle.size;
                                p0.characterAttributes.leading = cardNameStyle.leading;
                                p0.characterAttributes.horizontalScale = cardNameStyle.hScale;
                                p0.characterAttributes.tracking = cardNameStyle.tracking;
                                p0.characterAttributes.fillColor = cardNameStyle.color;
                                if (cardNameStyle.just !== null) p0.paragraphAttributes.justification = cardNameStyle.just;
                            }
                        } catch(p0Err) {}

                        // 3. Ensure subsequent paragraphs keep cardDetStyle
                        try {
                            var numP = card.nameFrame.paragraphs.length;
                            for (var p = 1; p < numP; p++) {
                                var pIt = card.nameFrame.paragraphs[p];
                                if (cardDetStyle.font) pIt.characterAttributes.textFont = cardDetStyle.font;
                                pIt.characterAttributes.size = cardDetStyle.size;
                                pIt.characterAttributes.leading = cardDetStyle.leading;
                                pIt.characterAttributes.horizontalScale = cardDetStyle.hScale;
                                pIt.characterAttributes.tracking = cardDetStyle.tracking;
                                pIt.characterAttributes.fillColor = cardDetStyle.color;
                                if (cardDetStyle.just !== null) pIt.paragraphAttributes.justification = cardDetStyle.just;
                            }
                        } catch(pAddErr) {}
                    }
                }
            } catch (err) {}

            // --- STEP 5: POPULATE BANI (if in keyring mode and fillBani is enabled) ---
            try {
                if (payload.fillBani !== false && card.baniFrame && entry.bani && entry.bani.replace(/\s+/g, '').length > 0) {
                    var origBaniSize = null;
                    var origBaniLeading = null;
                    var origBaniFont = null;
                    var origBaniColor = null;
                    try {
                        origBaniSize = card.baniFrame.textRange.characterAttributes.size;
                        origBaniLeading = card.baniFrame.textRange.characterAttributes.leading;
                        origBaniFont = card.baniFrame.textRange.characterAttributes.textFont;
                        origBaniColor = card.baniFrame.textRange.characterAttributes.fillColor;
                    } catch(be) {}

                    var cleanBani = entry.bani.split('\r\n').join('\r').split('\n').join('\r');
                    card.baniFrame.contents = cleanBani;
                    try {
                        var bTr = card.baniFrame.textRange;
                        if (origBaniFont) bTr.characterAttributes.textFont = origBaniFont;
                        if (origBaniSize) bTr.characterAttributes.size = origBaniSize;
                        if (origBaniLeading) bTr.characterAttributes.leading = origBaniLeading;
                        if (origBaniColor) bTr.characterAttributes.fillColor = origBaniColor;
                    } catch(bStyErr) {}
                }
            } catch(e) {}

            // --- STEP 6: POPULATE QTY ---
            try {
                if (payload.fillQty !== false && card.qtyFrame && entry.qty) {
                    var origQtySize = null;
                    var origQtyLeading = null;
                    var origQtyFont = null;
                    var origQtyColor = null;
                    try {
                        origQtySize = card.qtyFrame.textRange.characterAttributes.size;
                        origQtyLeading = card.qtyFrame.textRange.characterAttributes.leading;
                        origQtyFont = card.qtyFrame.textRange.characterAttributes.textFont;
                        origQtyColor = card.qtyFrame.textRange.characterAttributes.fillColor;
                    } catch(qe) {}

                    var qVal = String(entry.qty).replace(/^\s+|\s+$/g, '');
                    var isAnsiFont = (cardNameStyle.font && /bornomala|sutonny/i.test(cardNameStyle.font.name));
                    var qDigits = qVal.replace(/[^\d০-৯]/g, '');
                    if (qDigits) {
                        if (isAnsiFont) {
                            var bnToAscii = {'০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9'};
                            qVal = qDigits.replace(/[০-৯]/g, function(d) { return bnToAscii[d] || d; });
                        } else {
                            qVal = this.toBengaliDigits(qDigits);
                        }
                    }
                    card.qtyFrame.contents = qVal;
                    try {
                        var qTr = card.qtyFrame.textRange;
                        if (origQtyFont) qTr.characterAttributes.textFont = origQtyFont;
                        if (origQtySize) qTr.characterAttributes.size = origQtySize;
                        if (origQtyLeading) qTr.characterAttributes.leading = origQtyLeading;
                        if (origQtyColor) qTr.characterAttributes.fillColor = origQtyColor;
                    } catch(qStyErr) {}
                }
            } catch(e) {}

            filledCount++;
        }

        try { app.redraw(); } catch(e) {}

        return JSON.stringify({
            status: "success",
            filledCount: filledCount,
            totalCards: targetCards.length,
            totalEntries: entries.length,
            nextStartIndex: startIndex + filledCount
        });
    }
};

function openWebUrl(url) {
    try {
        var isMac = (File.fs === "Macintosh" || (typeof $.os !== "undefined" && $.os.indexOf("Mac") !== -1));
        if (isMac) {
            try {
                var webloc = new File(Folder.temp.fsName + "/open_link.webloc");
                webloc.open("w");
                webloc.write('<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n\t<key>URL</key>\n\t<string>' + url + '</string>\n</dict>\n</plist>');
                webloc.close();
                webloc.execute();
            } catch (err1) {}

            try {
                if (typeof app.system === "function") {
                    app.system('/usr/bin/open "' + url + '"');
                }
            } catch (err2) {}
        } else {
            try {
                var urlFile = new File(Folder.temp.fsName + "/open_link.url");
                urlFile.open("w");
                urlFile.write('[InternetShortcut]\r\nURL=' + url + '\r\n');
                urlFile.close();
                urlFile.execute();
            } catch (err3) {}

            try {
                if (typeof app.system === "function") {
                    app.system('cmd.exe /c start "" "' + url + '"');
                }
            } catch (err4) {}
        }
    } catch (e) {}
}

function getSelectedCanvasText() {
    return CardAutoFiller.getSelectedCanvasText();
}

function populateCards(payloadJson) {
    return CardAutoFiller.populateCards(payloadJson);
}

function placeTextBlocksIntoCards(payloadJson) {
    return CardAutoFiller.placeTextBlocksIntoCards(payloadJson);
}

function renumberBadges(payloadJson) {
    return CardAutoFiller.renumberBadges(payloadJson);
}

function duplicateCardTemplates(payloadJson) {
    return CardAutoFiller.duplicateCardTemplates(payloadJson);
}


function getSelectionCardSize() {
    if (!app.documents.length) return JSON.stringify({ status: "error", message: "No document open." });
    var doc = app.activeDocument;
    var sel = doc.selection;
    if (!sel || !sel.length) return JSON.stringify({ status: "error", message: "Select a card first." });
    var item = sel[0];
    var acc = CardAutoFiller.getAccurateCardBounds(item);
    return JSON.stringify({
        status: "success",
        width: Math.round(acc.width * 10) / 10,
        height: Math.round(acc.height * 10) / 10
    });
}


function detectCards(scope) {
    var cards = CardAutoFiller.detectCards(scope);
    return JSON.stringify({
        status: "success",
        count: cards.length
    });
}
