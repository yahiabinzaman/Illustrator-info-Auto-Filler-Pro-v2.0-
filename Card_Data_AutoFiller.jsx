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
            res.cmyk = [col.cyan, col.magenta, col.yellow, col.black];
            res.hex = this.cmykToHex(col.cyan, col.magenta, col.yellow, col.black);
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
            while (cur) {
                if (cur.typename === "Layer") {
                    if (!cur.visible || cur.locked) return true;
                    var pLayer = cur.parent;
                    while (pLayer && pLayer.typename === "Layer") {
                        if (!pLayer.visible || pLayer.locked) return true;
                        pLayer = pLayer.parent;
                    }
                    break;
                }
                if (cur.hidden || cur.locked) return true;
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

    hasStudentBiodata: function(text) {
        if (!text) return false;
        if (text.indexOf("পিতা:") !== -1 || text.indexOf("পিতা :") !== -1 || text.indexOf("পিতা") !== -1 ||
            text.indexOf("الوالد:") !== -1 || text.indexOf("الوالদ :") !== -1 || text.indexOf("বাবার নাম") !== -1) {
            return true;
        }
        if (/01[3-9]\d{8}/.test(text) || /০১[৩-৯][০-৯]{8}/.test(text) || /٠١[٠-৯]{9}/.test(text)) {
            return true;
        }
        var clean = text.replace(/^\s+|\s+$/g, "");
        var lines = clean.split(/[\r\n]+/);
        if (lines.length >= 2) {
            var studentTitles = ["মাওলানা", "মুহাম্মাদ", "মোহাম্মদ", "মোঃ", "হাফেজ", "মুফতী", "ক্বারী", "শিক্ষার্থী", "ছাত্র", "الحافظ", "مولانا"];
            for (var s = 0; s < studentTitles.length; s++) {
                if (clean.indexOf(studentTitles[s]) !== -1) {
                    return true;
                }
            }
        }
        return false;
    },

    collectVisibleLayers: function(parent, outLayers) {
        if (!parent) return;
        try {
            var lays = parent.layers;
            if (!lays) return;
            for (var l = 0; l < lays.length; l++) {
                var lay = lays[l];
                if (!lay.visible) continue; // STRICT: Ignore hidden layers completely!
                outLayers.push(lay);
                if (lay.layers && lay.layers.length > 0) {
                    this.collectVisibleLayers(lay, outLayers);
                }
            }
        } catch(e) {}
    },

    collectTextFrames: function(items, outList) {
        if (!items) return;
        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            if (this.isItemHidden(it)) continue; // STRICT: Ignore hidden items
            if (it.typename === "TextFrame") {
                outList.push(it);
            } else if (it.typename === "GroupItem") {
                this.collectTextFrames(it.pageItems, outList);
            }
        }
    },

    detectCards: function(scope, order) {
        var doc = this.getActiveDoc();
        if (!doc) return [];
        var cardUnits = [];
        var candidateItems = [];

        if (scope === "selection" && (!doc.selection || doc.selection.length === 0)) {
            scope = "artboard";
        }

        if (scope === "selection" && doc.selection && doc.selection.length > 0) {
            for (var s = 0; s < doc.selection.length; s++) {
                var sItem = doc.selection[s];
                if (this.isItemHidden(sItem)) continue;
                candidateItems.push(sItem);
            }
        } else if (scope === "all_artboards") {
            var visibleLayers = [];
            this.collectVisibleLayers(doc, visibleLayers);
            for (var l = 0; l < visibleLayers.length; l++) {
                var layer = visibleLayers[l];
                for (var g = 0; g < layer.groupItems.length; g++) {
                    var grp = layer.groupItems[g];
                    if (this.isItemHidden(grp)) continue;
                    candidateItems.push(grp);
                }
                for (var t = 0; t < layer.textFrames.length; t++) {
                    var tf = layer.textFrames[t];
                    if (this.isItemHidden(tf)) continue;
                    candidateItems.push(tf);
                }
            }
        } else {
            var abIndex = doc.artboards.getActiveArtboardIndex();
            var abRect = doc.artboards[abIndex].artboardRect;
            var visibleLayers = [];
            this.collectVisibleLayers(doc, visibleLayers);
            for (var l = 0; l < visibleLayers.length; l++) {
                var layer = visibleLayers[l];
                for (var g = 0; g < layer.groupItems.length; g++) {
                    var grp = layer.groupItems[g];
                    if (this.isItemHidden(grp)) continue;
                    var gb = grp.geometricBounds;
                    if (gb[0] < abRect[2] && gb[2] > abRect[0] && gb[1] > abRect[3] && gb[3] < abRect[1]) {
                        candidateItems.push(grp);
                    }
                }
                for (var t = 0; t < layer.textFrames.length; t++) {
                    var tf = layer.textFrames[t];
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
            if (!cardUnits[cu].serialFrame || !cardUnits[cu].formFrame) {
                needsProximity = true;
                break;
            }
        }

        if (needsProximity) {
            var allDocTFs = [];
            this.collectTextFrames(candidateItems, allDocTFs);
            for (var cu = 0; cu < cardUnits.length; cu++) {
                var cCard = cardUnits[cu];
                if (!cCard.nameFrame) continue;
                if (cCard.serialFrame && cCard.formFrame) continue; // already attached!
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

                    if (!cCard.formFrame && dx >= 45 && dx <= 78 && dy >= 32 && dy <= 58) {
                        var dRawF = dtf.contents.replace(/^\s+|\s+$/g, '');
                        if (/(?:ফরম|দাখেলা|রোল|Form|Roll)/i.test(dRawF) || dtf.lines.length <= 2) {
                            var fDist = Math.abs(dx - 60) + Math.abs(dy - 45);
                            if (fDist < minFormDist) {
                                minFormDist = fDist;
                                bestForm = dtf;
                            }
                        }
                    }
                }

                if (bestSerial && !cCard.serialFrame) cCard.serialFrame = bestSerial;
                if (bestForm && !cCard.formFrame) cCard.formFrame = bestForm;
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

            if (tfs.length >= 1 && tfs.length <= 5) {
                var card = this.analyzeCardGroup(tfs, item);
                if (card.nameFrame && (card.detailsFrame || card.serialFrame || card.namePlaceholderPath)) {
                    card.group = item;
                    card.bounds = item.geometricBounds;
                    outCards.push(card);
                    return;
                }
            }

            if (personCount > 1 || tfs.length > 5) {
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

            var relX = groupWidth > 0 ? (tfLeft - groupLeft) : 0;
            var relY = groupHeight > 0 ? (groupTop - tfTop) : 0;

            // 1. Form number frame (contains "ফরম", "দাখেলা", "রোল", "Form" or sits near bottom-right)
            if (/(?:ফরম|দাখেলা|রোল|Form|Roll)/i.test(rawTxt) || (relX > groupWidth * 0.60 && relY > groupHeight * 0.50 && tfW < 45 && tfH < 30)) {
                card.formFrame = tf;
                continue;
            }

            // 2. Top-Right serial/badge frame (strictly top-right pill: relX > 60%, relY < 35%, small width & height)
            var isTopRightBadge = (groupWidth > 0 && groupHeight > 0 && relX > groupWidth * 0.60 && relY < groupHeight * 0.35 && tfW < 40 && tfH < 25);
            if (isTopRightBadge || (cleanTxt.length <= 4 && num > 0 && tfW < 35 && tfH < 25)) {
                if (!card.serialFrame) {
                    card.serialFrame = tf;
                    card.badgeFrame = tf;
                    card.badgeNumber = num > 0 ? num : -1;
                    continue;
                }
            }

            // 3. Title / Memorabilia / Back-side header banners
            if (this.isBackSideText(rawTxt) || /(?:দাওরায়ে|দাওরা|মাস্টার্স|স্মৃতি|সমাপনী|হিফ[জয]|তাকমীল|দস্তারবন্দী|বিদায়ী|স্মারক|ফারেগিন|পরিচিতি|বিভাগ|wnRwi|wLªóvã|`vIiv|nvw`m|cwiwP|fv‡iwMb)/i.test(rawTxt)) {
                continue;
            }

            // 4. Institution name header
            if (/gv`vwim|gv`ivmv|mZxNvUv|মাদ্রাসা|মাদরাসা|মারকায|জামিয়া|ইনস্টিটিউট|বিদ্যালয়|স্কুল|কলেজ/.test(rawTxt)) {
                continue;
            }

            // 5. Design label
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
        } else if (candidateFrames.length >= 2) {
            card.nameFrame = candidateFrames[0];
            card.detailsFrame = candidateFrames[1];
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
        if (payload.nameColor && payload.nameColor !== "#000000" && payload.nameColor !== "#000" && !isSingleColor) {
            try {
                var sw = doc.swatches.getByName(payload.nameColor);
                if (sw) userChosenColor = sw.color;
            } catch(e) {}

            if (!userChosenColor && /^#?[0-9A-Fa-f]{3,6}$/.test(payload.nameColor)) {
                userChosenColor = this.hexToColor(payload.nameColor, isCMYK);
            }
        }

        var finalNameColor = isSingleColor ? solidBlackCMYK : (userChosenColor || masterTplName.color || docNameColor || solidBlackCMYK);
        var finalDetailsColor = masterTplDetails.color || solidBlackCMYK;

        var filledCount = 0;
        var fillLimit = Math.min(targetCards.length, activeEntries.length);

        for (var i = 0; i < fillLimit; i++) {
            var card = targetCards[i];
            var entry = activeEntries[i];

            var cardBoldFont = globalBoldFont;
            var cardRegularFont = globalRegularFont;

            var tplName = masterTplName;
            var tplDetails = masterTplDetails;
            var tplSerial = masterTplSerial;
            var tplForm = masterTplForm;

// Determine final values with user override precedence
            var finalNameFont = (makeBold && cardBoldFont) ? cardBoldFont : (tplName.font || cardBoldFont);
            var finalDetailsFont = cardRegularFont || tplDetails.font;
            var finalNameLeading = hasCustomNameLeading ? userNameLeading : tplName.leading;
            var finalDetailsLeading = hasCustomDetailsLeading ? userDetailsLeading : tplDetails.leading;
            var baseNameHScale = (payload.nameHScale !== undefined && payload.nameHScale !== 100) ? nameHScale : tplName.hScale;
            var baseDetailsHScale = (payload.detailsHScale !== undefined && payload.detailsHScale !== 85) ? detailsHScale : tplDetails.hScale;

            // --- STEP 2: POPULATE SERIAL / KROMIK (Top-Right Pill) ---
            if (card.serialFrame && entry.serial) {
                try {
                    var sVal = entry.serial;
                    var isAnsiFont = (finalNameFont && /bornomala|sutonny/i.test(finalNameFont.name));
                    if (isAnsiFont) {
                        var bnToAscii = {'০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9'};
                        sVal = String(sVal).replace(/[০-৯]/g, function(d) { return bnToAscii[d] || d; });
                    }
                    var finalSerialFont = tplSerial.font || finalNameFont;
                    var finalSerialColor = tplSerial.color || solidBlackCMYK;
                    card.serialFrame.contents = sVal;
                    try {
                        var sAttr = card.serialFrame.textRange.characterAttributes;
                        if (finalSerialFont) sAttr.textFont = finalSerialFont;
                        sAttr.size = tplSerial.size;
                        sAttr.leading = tplSerial.leading;
                        sAttr.tracking = tplSerial.tracking;
                        sAttr.horizontalScale = tplSerial.hScale;
                        sAttr.fillColor = finalSerialColor;
                        if (tplSerial.just !== null) card.serialFrame.textRange.paragraphAttributes.justification = tplSerial.just;
                        card.serialFrame.textRange.paragraphAttributes.spaceBefore = 0;
                        card.serialFrame.textRange.paragraphAttributes.spaceAfter = 0;
                    } catch(sStyErr) {}
                } catch(serErr) {}
            }

            // --- STEP 3: POPULATE FORM NUMBER (Bottom-Right Box - Strictly 2 Lines) ---
            var formHandled = false;
            if (card.formFrame && entry.formNumber) {
                try {
                    var rawForm = (entry.formNumber || "").replace(/^\s+|\s+$/g, '');
                    var mDigits = rawForm.match(/([০-৯0-9]+)/);
                    var formDigits = "";
                    if (mDigits) {
                        formDigits = this.toBengaliDigits(mDigits[1]);
                    } else {
                        var cleanDigits = rawForm.replace(/^[^:\d]+[:\-\s]*/, '').replace(/^\s+|\s+$/g, '');
                        formDigits = this.toBengaliDigits(cleanDigits);
                    }

                    var formLabel = "ফরম";
                    if (/^(দাখেলা|রোল|Roll|Form)/i.test(rawForm)) {
                        var mLabel = rawForm.match(/^([^:\d]+)/);
                        if (mLabel) formLabel = mLabel[1].replace(/[:\s]+$/, "");
                    }
                    var fDigitsOut = formDigits;

                    // Set font before writing contents to ensure exact ANSI mapping
                    try {
                        if (globalRegularFont) card.formFrame.textRange.characterAttributes.textFont = globalRegularFont;
                    } catch(f0e) {}

                    // Write 2 lines strictly: Label on Line 1, Number on Line 2
                    card.formFrame.contents = formLabel + "\r" + fDigitsOut;
                    try {
                        var fAttr = card.formFrame.textRange.characterAttributes;
                        if (globalRegularFont) fAttr.textFont = globalRegularFont;
                        fAttr.size = tplForm.size || 5.3181;
                        fAttr.leading = tplForm.leading || 5.5884;
                        fAttr.tracking = tplForm.tracking || -50;
                        fAttr.horizontalScale = tplForm.hScale || 98.6;
                        fAttr.fillColor = solidBlackCMYK;
                        if (tplForm.just !== null) card.formFrame.textRange.paragraphAttributes.justification = tplForm.just;
                        card.formFrame.textRange.paragraphAttributes.spaceBefore = 0;
                        card.formFrame.textRange.paragraphAttributes.spaceAfter = 0;

                        // Ensure both lines have identical leading and font size
                        for (var fPi = 0; fPi < card.formFrame.paragraphs.length; fPi++) {
                            try {
                                var fp = card.formFrame.paragraphs[fPi];
                                fp.characterAttributes.size = tplForm.size || 5.3181;
                                fp.characterAttributes.leading = tplForm.leading || 5.5884;
                                fp.characterAttributes.tracking = tplForm.tracking || -50;
                                fp.characterAttributes.horizontalScale = tplForm.hScale || 98.6;
                                fp.characterAttributes.fillColor = solidBlackCMYK;
                                fp.paragraphAttributes.spaceBefore = 0;
                                fp.paragraphAttributes.spaceAfter = 0;
                            } catch(fpe) {}
                        }
                    } catch(fStyErr) {}
                    formHandled = true;
                } catch(ffErr) {}
            }

            // --- STEP 4: POPULATE NAME & DETAILS (Bulletproof Per-Paragraph Formatting) ---
            try {
                if (card.nameFrame && entry.name) {
                    var cleanName = (entry.name || '').replace(/^\s+|\s+$/g, '');
                    var cleanDetails = (entry.details || '').replace(/^\s+|\s+$/g, '');
                    cleanDetails = cleanDetails.split('\r\n').join('\r').split('\n').join('\r');

                    // Filter out any form lines from cleanDetails so it never appears under phone number
                    var rawLines = cleanDetails.split('\r');
                    var nonFormLines = [];
                    for (var rli = 0; rli < rawLines.length; rli++) {
                        var rlText = rawLines[rli].replace(/^\s+|\s+$/g, '');
                        if (!rlText) continue;
                        if (/(?:ফরম|দাখেলা|রোল|Form|Roll|‡¶´|‡dvi|diBk|‡ivj)/i.test(rlText)) {
                            continue; // Exclude form line completely from main card text frame
                        }
                        nonFormLines.push(rlText);
                    }
                    cleanDetails = nonFormLines.join('\r');

                    var userNmScale = parseFloat(payload.nameHScale) || 80.0;
                    var userAddrScale = parseFloat(payload.addressHScale) || 80.0;
                    var userDetScale = parseFloat(payload.detailsHScale) || 96.0;

                    if (card.detailsFrame) {
                        // Separate Name and Details frames
                        card.nameFrame.contents = cleanName;
                        try {
                            var nTr = card.nameFrame.textRange;
                            if (finalNameFont) nTr.characterAttributes.textFont = finalNameFont;
                            nTr.characterAttributes.size = tplName.size || 13.0;
                            nTr.characterAttributes.leading = finalNameLeading || tplName.leading || 6.46;
                            nTr.characterAttributes.tracking = tplName.tracking || -5;
                            nTr.characterAttributes.horizontalScale = (payload.nameHScale !== undefined && payload.nameHScale !== 100) ? userNmScale : (tplName.hScale || 80.0);
                            nTr.characterAttributes.fillColor = finalNameColor;
                            if (tplName.just !== null) nTr.paragraphAttributes.justification = tplName.just;
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
                                        var dParaTxt = dParaItem.contents.replace(/^\s+|\s+$/g, '');
                                        var isDAddr = /^(গ্রাম|পোস্ট|থানা|জেলা)/.test(dParaTxt) || dp === 1 || dp === 2;
                                        
                                        if (finalDetailsFont) dParaItem.characterAttributes.textFont = finalDetailsFont;
                                        dParaItem.characterAttributes.size = tplDetails.size || 7.0;
                                        dParaItem.characterAttributes.leading = finalDetailsLeading || tplDetails.leading || 8.13;
                                        dParaItem.characterAttributes.tracking = tplDetails.tracking || -5;
                                        dParaItem.characterAttributes.horizontalScale = isDAddr ? userAddrScale : userDetScale;
                                        dParaItem.characterAttributes.fillColor = finalDetailsColor;
                                        if (tplDetails.just !== null) dParaItem.paragraphAttributes.justification = tplDetails.just;
                                        dParaItem.paragraphAttributes.spaceBefore = 0;
                                        dParaItem.paragraphAttributes.spaceAfter = 0;
                                    } catch(dpe) {}
                                }
                            } catch(e) {}
                        }
                    } else {
                        // Single combined text frame (Name on line 1, details on lines 2..N)
                        var fullInfo = cleanDetails ? (cleanName + '\r' + cleanDetails) : cleanName;
                        card.nameFrame.contents = fullInfo;

                        // 1. Apply base details styling to entire frame (Regular font, 6.64pt, Details Scale 96%)
                        try {
                            var nTr = card.nameFrame.textRange;
                            if (globalRegularFont) nTr.characterAttributes.textFont = globalRegularFont;
                            nTr.characterAttributes.size = 6.639;
                            nTr.characterAttributes.leading = finalDetailsLeading || 8.3936;
                            nTr.characterAttributes.tracking = tplDetails.tracking || -5;
                            nTr.characterAttributes.horizontalScale = userDetScale;
                            nTr.characterAttributes.fillColor = finalDetailsColor;
                            if (tplDetails.just !== null) nTr.paragraphAttributes.justification = tplDetails.just;
                            nTr.paragraphAttributes.spaceBefore = 0;
                            nTr.paragraphAttributes.spaceAfter = 0;
                        } catch(bStyErr) {}

                        // 2. Customize Paragraph 0 for Student Name ONLY (Bold font, 8.54pt, Name Scale 80%)
                        try {
                            if (card.nameFrame.paragraphs.length > 0) {
                                var p0 = card.nameFrame.paragraphs[0];
                                if (globalBoldFont) p0.characterAttributes.textFont = globalBoldFont;
                                p0.characterAttributes.size = tplName.size || 8.5358;
                                p0.characterAttributes.leading = finalNameLeading || 8.3936;
                                p0.characterAttributes.horizontalScale = userNmScale;
                                p0.characterAttributes.fillColor = finalNameColor;
                                if (tplName.just !== null) p0.paragraphAttributes.justification = tplName.just;
                            }
                        } catch(p0Err) {}

                        // 3. Customize Address Paragraphs for Address Scale
                        try {
                            var numP = card.nameFrame.paragraphs.length;
                            for (var p = 1; p < numP; p++) {
                                var pIt = card.nameFrame.paragraphs[p];
                                var pTxt = pIt.contents;
                                if (/^(?:গ্রাম|পোস্ট|থানা|জেলা|‡MÖvg|‡cv÷|_vbv|‡Rjv)/.test(pTxt) || p === 2 || p === 3) {
                                    pIt.characterAttributes.horizontalScale = userAddrScale;
                                }
                            }
                        } catch(pAddErr) {}
                    }
                }
            } catch (err) {}

            // --- STEP 5: POPULATE BANI (if in keyring mode) ---
            try {
                if (fillBani && card.baniFrame && entry.bani) {
                    card.baniFrame.contents = entry.bani.split('\r\n').join(' ').split('\n').join(' ');
                    if (finalNameFont) card.baniFrame.textRange.characterAttributes.textFont = finalNameFont;
                    card.baniFrame.textRange.characterAttributes.size = 5;
                    card.baniFrame.textRange.characterAttributes.fillColor = finalNameColor;
                }
            } catch(e) {}

            // --- STEP 6: POPULATE QTY ---
            try {
                if (card.qtyFrame && entry.qty) {
                    card.qtyFrame.contents = entry.qty;
                    if (finalDetailsFont) card.qtyFrame.textRange.characterAttributes.textFont = finalDetailsFont;
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
