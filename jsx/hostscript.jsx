/**
 * Auto Filler Pro — ExtendScript Host Engine (ColorLab Edition)
 * Author: Yahia Bin Zaman (https://github.com/yahiabinzaman)
 * Version: 3.4.0 Pro — Cross-Platform Windows/macOS & Illustrator 20–2026+ Engine
 */

// Safe for direct eval in ExtendScript and CEP engine
var __AUTOFILLER_VER__ = "3.4.0";

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
                        .replace(/\t/g, '\\t')
                        .replace(/\u2028/g, '\\u2028')
                        .replace(/\u2029/g, '\\u2029') + '"';
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
    bnDigits: ['\u09E6', '\u09E7', '\u09E8', '\u09E9', '\u09EA', '\u09EB', '\u09EC', '\u09ED', '\u09EE', '\u09EF'],
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
        var bnNums = { '\u09E6': 0, '\u09E7': 1, '\u09E8': 2, '\u09E9': 3, '\u09EA': 4, '\u09EB': 5, '\u09EC': 6, '\u09ED': 7, '\u09EE': 8, '\u09EF': 9 };
        var clean = str.replace(/[^\u09E6-\u09EF0-9]/g, '');
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

        getSelectedCanvasWidth: function() {
        if (!app.documents.length) {
            return JSON.stringify({ status: "error", message: "No document open." });
        }
        var doc = app.activeDocument;
        var sel = doc.selection;
        if (!sel || (sel instanceof Array && sel.length === 0)) {
            return JSON.stringify({ status: "error", message: "Please select an object or text frame to measure." });
        }
        var item = (sel instanceof Array) ? sel[0] : sel;
        var wPt = 0;
        try {
            if (item.typename === "TextRange") {
                wPt = item.width || (item.characters.length * item.characterAttributes.size * 0.5);
            } else if (item.width) {
                wPt = item.width;
            } else if (item.visibleBounds) {
                wPt = Math.abs(item.visibleBounds[2] - item.visibleBounds[0]);
            }
        } catch(e) {}
        if (!wPt || wPt <= 0) {
            return JSON.stringify({ status: "error", message: "Could not measure selected item width." });
        }
        var widthPt = Math.round(wPt * 10) / 10;
        var widthMm = Math.round((wPt * 25.4 / 72.0) * 10) / 10;
        return JSON.stringify({
            status: "success",
            widthMm: widthMm,
            widthPt: widthPt,
            message: "Picked safe width: " + widthMm + " mm (" + widthPt + " pt)"
        });
    },

    _getWritableProbeLayer: function(targetItem) {
        try {
            if (targetItem && targetItem.layer && !targetItem.layer.locked && targetItem.layer.visible) {
                return targetItem.layer;
            }
        } catch(e) {}
        try {
            var doc = this.getActiveDoc();
            if (!doc) return null;
            if (doc.activeLayer && !doc.activeLayer.locked && doc.activeLayer.visible) {
                return doc.activeLayer;
            }
            for (var li = 0; li < doc.layers.length; li++) {
                var lyr = doc.layers[li];
                if (lyr && !lyr.locked && lyr.visible) return lyr;
            }
        } catch(e2) {}
        return null;
    },

    _createTextWidthProbe: function(targetItem) {
        try {
            if (targetItem && targetItem.typename === "TextFrame" && typeof targetItem.duplicate === "function") {
                var isArea = false;
                try {
                    isArea = (typeof TextType !== "undefined" && targetItem.kind === TextType.AREATEXT);
                } catch(ke) {}
                if (!isArea && (!targetItem.layer || (!targetItem.layer.locked && targetItem.layer.visible))) {
                    return targetItem.duplicate();
                }
            }
        } catch(de) {}
        try {
            var layer = this._getWritableProbeLayer(targetItem);
            if (!layer || !layer.textFrames || typeof layer.textFrames.pointText !== "function") return null;
            var px = 0, py = 0;
            try {
                if (targetItem && targetItem.geometricBounds && targetItem.geometricBounds.length >= 2) {
                    px = targetItem.geometricBounds[0];
                    py = targetItem.geometricBounds[1];
                }
            } catch(ge) {}
            return layer.textFrames.pointText([px, py]);
        } catch(e) {}
        return null;
    },

    _measureParaWidthPt: function(probe, pText, firstCharAttr, hScale, isHeaderPara, baseFontSize) {
        var curSize = (firstCharAttr && firstCharAttr.size > 0) ? firstCharAttr.size : (baseFontSize || 11.0);
        if (probe) {
            try {
                probe.contents = pText;
                try {
                    var ppa = probe.textRange.paragraphAttributes;
                    ppa.leftIndent = 0;
                    ppa.rightIndent = 0;
                    ppa.firstLineIndent = 0;
                } catch(peIndent) {}
                var pca = probe.textRange.characterAttributes;
                if (firstCharAttr) {
                    if (firstCharAttr.textFont) try { pca.textFont = firstCharAttr.textFont; } catch(fe) {}
                    if (firstCharAttr.size > 0) try { pca.size = firstCharAttr.size; } catch(se) {}
                    if (typeof firstCharAttr.tracking === "number") try { pca.tracking = firstCharAttr.tracking; } catch(te) {}
                    else try { pca.tracking = 0; } catch(te2) {}
                } else {
                    try { pca.size = curSize; } catch(se2) {}
                    try { pca.tracking = 0; } catch(te3) {}
                }
                try { pca.verticalScale = 100; } catch(ve) {}
                try { pca.horizontalScale = hScale; } catch(he) {}
                var pgb = probe.geometricBounds;
                if (pgb && pgb.length >= 4) {
                    var pw = Math.abs(pgb[2] - pgb[0]);
                    if (pw > 0) return pw;
                }
            } catch(pe) {}
        }
        var charFactor = isHeaderPara ? 0.56 : 0.52;
        return pText.length * (curSize * charFactor) * (hScale / 100.0);
    },

    _applyParaScaleAndSize: function(para, targetScale, targetSize) {
        try {
            if (para.characterAttributes) {
                if (targetScale !== null && targetScale !== undefined) {
                    para.characterAttributes.horizontalScale = targetScale;
                }
                if (targetSize !== null && targetSize !== undefined && targetSize > 0) {
                    para.characterAttributes.size = targetSize;
                }
                return;
            }
        } catch(e) {}
        if (!para.characters) return;
        for (var c = 0; c < para.characters.length; c++) {
            try {
                if (targetScale !== null && targetScale !== undefined) {
                    para.characters[c].characterAttributes.horizontalScale = targetScale;
                }
                if (targetSize !== null && targetSize !== undefined && targetSize > 0) {
                    para.characters[c].characterAttributes.size = targetSize;
                }
            } catch(ce) {}
        }
    },

    fitTextFrameToWidth: function(targetItem, maxPt, baseHScale, minScale, baseFontSize) {
        if (!targetItem || !maxPt || maxPt <= 0) return;
        var probe = null;
        try {
            var minSc = minScale || 35;
            var fitMaxPt = Math.max(10.0, maxPt - 0.75);
            var paras = [];
            if (targetItem.typename === "TextFrame") {
                paras = targetItem.paragraphs;
            } else if (targetItem.paragraphs) {
                paras = targetItem.paragraphs;
            } else if (targetItem.characters) {
                paras = [targetItem];
            }
            if (!paras || paras.length === 0) return;

            probe = this._createTextWidthProbe(targetItem);

            for (var p = 0; p < paras.length; p++) {
                try {
                    var para = paras[p];
                    var pText = para.contents ? para.contents.replace(/^[\s\r\n]+|[\s\r\n]+$/g, "") : "";
                    if (!pText || !para.characters || para.characters.length === 0) continue;

                    var firstCharAttr = para.characters[0].characterAttributes;
                    var curHScale = (firstCharAttr && firstCharAttr.horizontalScale > 0) ? firstCharAttr.horizontalScale : (baseHScale || 100);
                    var curSize = (firstCharAttr && firstCharAttr.size > 0) ? firstCharAttr.size : (baseFontSize || 11.0);

                    var curW = this._measureParaWidthPt(probe, pText, firstCharAttr, curHScale, (p === 0), baseFontSize);
                    if (curW <= fitMaxPt) {
                        continue;
                    }

                    var targetScale = Math.floor(curHScale * (fitMaxPt / curW));
                    if (targetScale > curHScale) targetScale = curHScale;
                    if (targetScale < minSc) targetScale = minSc;

                    var scaledW = this._measureParaWidthPt(probe, pText, firstCharAttr, targetScale, (p === 0), baseFontSize);
                    if (scaledW > fitMaxPt && targetScale > minSc) {
                        var refined = Math.floor(targetScale * (fitMaxPt / scaledW));
                        if (refined >= targetScale) refined = targetScale - 1;
                        targetScale = Math.max(minSc, refined);
                        scaledW = this._measureParaWidthPt(probe, pText, firstCharAttr, targetScale, (p === 0), baseFontSize);
                        for (var nudge = 0; nudge < 3 && scaledW > fitMaxPt && targetScale > minSc; nudge++) {
                            targetScale--;
                            scaledW = this._measureParaWidthPt(probe, pText, firstCharAttr, targetScale, (p === 0), baseFontSize);
                        }
                    } else if (scaledW <= fitMaxPt && targetScale < curHScale) {
                        for (var bump = 0; bump < 2 && (targetScale + 1) <= curHScale; bump++) {
                            var testW = this._measureParaWidthPt(probe, pText, firstCharAttr, targetScale + 1, (p === 0), baseFontSize);
                            if (testW <= fitMaxPt) {
                                targetScale++;
                                scaledW = testW;
                            } else {
                                break;
                            }
                        }
                    }

                    var neededSize = null;
                    if (targetScale <= minSc && scaledW > fitMaxPt) {
                        neededSize = Math.max(6.0, Math.floor(curSize * (fitMaxPt / scaledW) * 10) / 10);
                    }
                    this._applyParaScaleAndSize(para, targetScale, neededSize);
                } catch(pe) {}
            }
        } catch(e) {}
        if (probe) {
            try { probe.remove(); } catch(re) {}
        }
    },

    _computeKeyringSafeWidthPt: function(card, nameFrame, origTfGB, nameJust, safeRightMarginPt, safeWidthPt, cardWidthPt) {
        var qtyLeft = null;
        try {
            if (card && card.qtyFrame && card.qtyFrame.geometricBounds) {
                var qgb = card.qtyFrame.geometricBounds;
                var tfStart = origTfGB ? Math.min(origTfGB[0], origTfGB[2]) : -1e9;
                if (qgb[0] > tfStart + 30) {
                    qtyLeft = Math.min(qgb[0], qgb[2]);
                }
            }
        } catch(qe) {}

        var accCard = this.getAccurateCardBounds((card && card.group) ? card.group : nameFrame, 0, 0, qtyLeft);
        var cBounds = (accCard && accCard.bounds) ? accCard.bounds : ((card && card.bounds) ? card.bounds : origTfGB);
        var cardLeft = Math.min(cBounds[0], cBounds[2]);
        var cardRight = Math.max(cBounds[0], cBounds[2]);

        var targetCardWidthPt = (cardWidthPt && cardWidthPt > 40) ? cardWidthPt : 0;
        if ((cardRight - cardLeft) < 50) {
            cardRight = cardLeft + (targetCardWidthPt > 0 ? targetCardWidthPt : (61.9 * 72.0 / 25.4));
        } else if (targetCardWidthPt > 0 && (cardRight - cardLeft) > (targetCardWidthPt + 0.5)) {
            cardRight = cardLeft + targetCardWidthPt;
        }
        if (qtyLeft !== null && cardRight >= qtyLeft - 1.0 && (qtyLeft - cardLeft) > 120.0) {
            cardRight = qtyLeft - 2.0;
        }

        var effectiveMarginPt = (safeRightMarginPt >= 0) ? safeRightMarginPt : (8.5 * 72.0 / 25.4);
        var safeRightX = cardRight - effectiveMarginPt;
        var tfLeft = origTfGB ? Math.min(origTfGB[0], origTfGB[2]) : cardLeft;
        var tfRight = origTfGB ? Math.max(origTfGB[0], origTfGB[2]) : cardRight;

        var marginMaxPt = safeRightX - tfLeft;
        try {
            if (typeof Justification !== "undefined") {
                if (nameJust === Justification.CENTER) {
                    var centerX = (tfLeft + tfRight) / 2.0;
                    var leftPad = Math.min(effectiveMarginPt > 0 ? effectiveMarginPt : 8.5, 12.0);
                    marginMaxPt = Math.min(safeRightX - centerX, centerX - (cardLeft + leftPad)) * 2.0;
                } else if (nameJust === Justification.RIGHT) {
                    marginMaxPt = Math.min(tfRight, safeRightX) - (cardLeft + 8.5);
                }
            }
        } catch(je) {}

        try {
            if (typeof TextType !== "undefined" && nameFrame && nameFrame.kind === TextType.AREATEXT && (tfRight - tfLeft) > 20) {
                marginMaxPt = (tfRight > safeRightX) ? (safeRightX - tfLeft) : (tfRight - tfLeft);
            }
        } catch(ae) {}

        marginMaxPt = Math.max(20.0, marginMaxPt);
        if (safeWidthPt > 0) {
            return (safeRightMarginPt >= 0) ? Math.min(marginMaxPt, safeWidthPt) : safeWidthPt;
        }
        return marginMaxPt;
    },

    getSelectedCanvasColor: function() {
        if (!app.documents.length) {
            return JSON.stringify({ status: "error", message: "No document open." });
        }
        var doc = app.activeDocument;
        var sel = doc.selection;
        if (!sel || (sel instanceof Array && sel.length === 0)) {
            return JSON.stringify({ status: "error", message: "Please select text or an object on the canvas." });
        }

        var col = null;
        function findColor(item) {
            if (!item || col) return;
            if (item.typename === "TextRange") {
                if (item.characterAttributes && item.characterAttributes.fillColor && item.characterAttributes.fillColor.typename !== "NoColor") {
                    col = item.characterAttributes.fillColor;
                }
            } else if (item.typename === "TextFrame") {
                if (item.characters.length > 0 && item.characters[0].characterAttributes && item.characters[0].characterAttributes.fillColor && item.characters[0].characterAttributes.fillColor.typename !== "NoColor") {
                    col = item.characters[0].characterAttributes.fillColor;
                } else if (item.fillColor && item.fillColor.typename !== "NoColor") {
                    col = item.fillColor;
                }
            } else if (item.typename === "PathItem") {
                if (item.filled && item.fillColor && item.fillColor.typename !== "NoColor") {
                    col = item.fillColor;
                }
            } else if (item.typename === "CompoundPathItem") {
                if (item.pathItems.length > 0 && item.pathItems[0].filled && item.pathItems[0].fillColor) {
                    col = item.pathItems[0].fillColor;
                }
            } else if (item.typename === "GroupItem") {
                for (var i = 0; i < item.pageItems.length; i++) {
                    findColor(item.pageItems[i]);
                    if (col) break;
                }
            }
        }

        if (sel.typename === "TextRange") {
            col = sel.characterAttributes.fillColor;
        } else if (sel instanceof Array) {
            for (var s = 0; s < sel.length; s++) {
                findColor(sel[s]);
                if (col) break;
            }
        } else {
            findColor(sel);
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
        var norm = text.replace(/[\s\(\)\-\_\u2013\u2014\.\,\:\;\[\]\{\}\/\\\u0964\u09E6-\u09EF0-9\'\"]/g, '');
        if (norm.indexOf("\u09A6\u09BE\u0993\u09B0\u09BE\u09AF\u09BC\u09C7\u09B9\u09BE\u09A6\u09C0\u09B8") !== -1 ||
            norm.indexOf("\u09A6\u09BE\u0993\u09B0\u09BE\u09AF\u09BC\u09C7\u09B9\u09BE\u09A6\u09BF\u09B8") !== -1 ||
            norm.indexOf("\u09A6\u09BE\u0993\u09B0\u09BE\u09AF\u09BC\u09C7\u09B9\u09BE\u09A6\u09C0\u099B") !== -1 ||
            norm.indexOf("\u09A6\u09BE\u0993\u09B0\u09BE\u09AF\u09BC\u09C7\u09B9\u09BE\u09A6\u09BF\u09B8\u09B8\u09AE\u09BE\u09AA\u09A8\u09C0\u09B8\u09CD\u09AE\u09C3\u09A4\u09BF") !== -1 ||
            norm.indexOf("\u09A6\u09BE\u0993\u09B0\u09BE\u09AF\u09BC\u09C7\u09B9\u09BE\u09A6\u09C0\u09B8\u09AE\u09BE\u09B8\u09CD\u099F\u09BE\u09B0\u09CD\u09B8\u09B8\u09AE\u09BE\u09AA\u09A8\u09C0\u09B8\u09CD\u09AE\u09C3\u09A4\u09BF") !== -1 ||
            norm.indexOf("\u09AE\u09BE\u09B8\u09CD\u099F\u09BE\u09B0\u09CD\u09B8\u09B8\u09AE\u09BE\u09AA\u09A8\u09C0\u09B8\u09CD\u09AE\u09C3\u09A4\u09BF") !== -1 ||
            norm.indexOf("\u09B8\u09AE\u09BE\u09AA\u09A8\u09C0\u09B8\u09CD\u09AE\u09C3\u09A4\u09BF") !== -1 ||
            norm.indexOf("\u09B9\u09BF\u09AB\u099C\u09B8\u09AE\u09BE\u09AA\u09A8\u09C0") !== -1 ||
            norm.indexOf("\u09B9\u09BF\u09AB\u09AF\u09B8\u09AE\u09BE\u09AA\u09A8\u09C0") !== -1 ||
            norm.indexOf("\u09B9\u09BF\u09AB\u099C\u09C1\u09B2\u0995\u09C1\u09B0\u0986\u09A8") !== -1 ||
            norm.indexOf("\u09B9\u09BF\u09AB\u09AF\u09C1\u09B2\u0995\u09C1\u09B0\u0986\u09A8") !== -1 ||
            norm.indexOf("\u09B9\u09BF\u09AB\u09AF\u09C1\u09B2\u0995\u09CB\u09B0\u0986\u09A8") !== -1 ||
            norm.indexOf("\u09B9\u09BF\u09AB\u099C\u09C1\u09B2\u0995\u09CB\u09B0\u0986\u09A8") !== -1) {
            return true;
        }

        var backKeywords = [
            "\u09A6\u09BE\u0993\u09B0\u09BE\u09AF\u09BC\u09C7", "\u09B8\u09AE\u09BE\u09AA\u09A8\u09C0", "\u09B8\u09CD\u09AE\u09C3\u09A4\u09BF", "\u09B9\u09BF\u09AB\u099C", "\u09B9\u09BF\u09AB\u09AF",
            "\u09B6\u09BF\u0995\u09CD\u09B7\u09BE\u09AC\u09B0\u09CD\u09B7", "\u09B8\u09A8\u09A6\u09AA\u09A4\u09CD\u09B0", "\u09B8\u09CD\u09AE\u09BE\u09B0\u0995", "\u09A6\u09B8\u09CD\u09A4\u09BE\u09B0\u09AC\u09A8\u09CD\u09A6\u09C0", "\u0997\u09CD\u09B0\u09C1\u09AA\u099B\u09AC\u09BF",
            "\u0986\u09AE\u09A8\u09CD\u09A4\u09CD\u09B0\u09A8\u09AA\u09A4\u09CD\u09B0", "\u09A6\u09BE\u0993\u09AF\u09BC\u09BE\u09A4\u09A8\u09BE\u09AE\u09BE", "\u09B8\u09CD\u09AE\u09C3\u09A4\u09BF\u099A\u09BE\u09B0\u09A3"
        ];
        for (var b = 0; b < backKeywords.length; b++) {
            if (text.indexOf(backKeywords[b]) !== -1 && (text.indexOf("\u09B8\u09CD\u09AE\u09C3\u09A4\u09BF") !== -1 || text.indexOf("\u09B8\u09AE\u09BE\u09AA\u09A8\u09C0") !== -1 || text.indexOf("\u09B9\u09BE\u09A6") !== -1)) {
                return true;
            }
        }
        return false;
    },

    isInstitutionHeaderText: function(text) {
        if (!text) return false;
        return /(?:gv`vwim|gv`ivmv|mZxNvUv|Rvwgqv|Dj~g|\u099C\u09BE\u09AE\u09BF['\u2019]?\u0986|\u099C\u09BE\u09AE[\u09BF\u09C7][\u09AF\u09BC\u09DF\u0986]?\u09BE|\u09A6\u09BE\u09B0\u09C1\u09B2\s*\u0989\u09B2[\u09C1\u09C2]\u09AE|\u09AE\u09BE\u09A6\u09CD\u09B0\u09BE\u09B8\u09BE|\u09AE\u09BE\u09A6\u09B0\u09BE\u09B8\u09BE|\u09AE\u09BE\u09A6\u09CD\u09B0\u09BE\u099B\u09BE|\u09AE\u09BE\u09B0\u0995\u09BE[\u099C\u09AF]|\u0987\u09A8\u09B8\u09CD\u099F\u09BF\u099F\u09BF\u0989\u099F|\u098F\u0995\u09BE\u09A1\u09C7\u09AE[\u09BF\u09C0]|\u09AC\u09BF\u09B6\u09CD\u09AC\u09AC\u09BF\u09A6\u09CD\u09AF\u09BE\u09B2[\u09AF\u09BC\u09DF]|\u09AC\u09BF\u09A6\u09CD\u09AF\u09BE\u09B2[\u09AF\u09BC\u09DF]|\u09B8\u09CD\u0995\u09C1\u09B2|\u0995\u09B2\u09C7\u099C|\u098F\u09A4\u09BF\u09AE\u0996\u09BE\u09A8\u09BE|\u09B9\u09BF\u09AB\u099C\u0996\u09BE\u09A8\u09BE)/i.test(text);
    },

    hasStrongBiodataSignals: function(text) {
        if (!text) return false;
        if (text.indexOf("\u09AA\u09BF\u09A4\u09BE:") !== -1 || text.indexOf("\u09AA\u09BF\u09A4\u09BE :") !== -1 || text.indexOf("\u09AA\u09BF\u09A4\u09BE") !== -1 ||
            text.indexOf("\u09AE\u09BE\u09A4\u09BE:") !== -1 || text.indexOf("\u09AC\u09BE\u09AC\u09BE\u09B0 \u09A8\u09BE\u09AE") !== -1 || text.indexOf("\u0627\u0644\u0648\u0627\u0644\u062F") !== -1 ||
            text.indexOf("wcZv") !== -1 || text.indexOf("\u2021gvevBj") !== -1) {
            return true;
        }
        if (/(?:\+?88)?01[3-9]\d{8}/.test(text) || /\u09E6\u09E7[\u09E9-\u09EF][\u09E6-\u09EF]{8}/.test(text) || /\u0660\u0661[\u0660-\u09EF]{9}/.test(text)) {
            return true;
        }
        var clean = text.replace(/^\s+|\s+$/g, "");
        var lns = clean.split(/[\r\n]+/);
        if (lns.length >= 2) {
            var studentTitles = ["\u09AE\u09C1\u09B9\u09BE\u09AE\u09CD\u09AE\u09BE\u09A6", "\u09AE\u09CB\u09B9\u09BE\u09AE\u09CD\u09AE\u09A6", "\u09AE\u09CB\u0983", "\u09B6\u09BF\u0995\u09CD\u09B7\u09BE\u09B0\u09CD\u09A5\u09C0", "\u099B\u09BE\u09A4\u09CD\u09B0", "\u0627\u0644\u062D\u0627\u0641\u0638"];
            for (var s = 0; s < studentTitles.length; s++) {
                if (clean.indexOf(studentTitles[s]) !== -1) return true;
            }
            if (/^(?:\u09B9\u09BE\u09AB\u09C7\u099C|\u09AE\u09BE\u0993\u09B2\u09BE\u09A8\u09BE|\u09AE\u09C1\u09AB\u09A4\u09C0|\u0995\u09CD\u09AC\u09BE\u09B0\u09C0|\u0995\u09BE\u09B0[\u09C0\u09BF]|\u09AE\u09C1\u09B9\u09BE\u09A6\u09CD\u09A6\u09BF\u09B8)\b/m.test(clean)) return true;
        }
        return false;
    },

    hasStudentBiodata: function(text) {
        if (!text) return false;
        if (this.hasStrongBiodataSignals(text)) return true;
        // Front-side institution headers (even wrapped to 3+ lines) are NEVER student biodata
        if (this.isInstitutionHeaderText(text) || this.isBackSideText(text)) return false;
        var clean = text.replace(/^\s+|\s+$/g, "");
        var lns = clean.split(/[\r\n]+/);
        if (lns.length >= 3) return true;
        return false;
    },

    isBaniText: function(text) {
        if (!text) return false;
        if (this.hasStudentBiodata(text)) return false; // STRICT: Student biodata can NEVER be a quote
        if (/^(?:\u09AC\u09BE\u09A3\u09C0|\u09AC\u09BE\u09A8\u09C0|Bani)\s*[:\-]/i.test(text)) return true;
        if (/(?:[-\u2013\u2014~]|\([^\)]*)\s*(?:\u09AE\u09BE\u0993|\u09AE\u09BE\u0993\u09B2\u09BE\u09A8\u09BE|\u09B9\u09AF\u09B0\u09A4|\u09AE\u09C1\u09AB\u09A4\u09C0|\u09AE\u09C1\u09AB\u09A4\u09BF|\u09B6\u09BE\u09AF\u09BC\u0996|\u09B6\u09BE\u09DF\u0996|\u09A1\.|\u0986\u09B2\u09CD\u09B2\u09BE\u09AE\u09BE|\u09AE\u09C1\u09B9\u09BE\u09A6\u09CD\u09A6\u09BF\u09B8|\u0987\u09AE\u09BE\u09AE|\u09B0\u09BE\u09B8\u09C2\u09B2|\u09B9\u09BE\u0995\u09BF\u09AE\u09C1\u09B2|\u0986\u09A6\u09C0\u09AC|\u09AC\u09BE\u09A8\u09CD\u09A6\u09BE|\u0987\u09AC\u09A8\u09C7|\u0986\u09B2\s*\u0995\u09CB\u09B0\u0986\u09A8|\u0986\u09B2\s*\u0995\u09C1\u09B0\u0986\u09A8|\u0986\u09B2\s*\u09B9\u09BE\u09A6\u09BF\u09B8|\u0986\u09B2\s*\u09B9\u09BE\u09A6\u09C0\u09B8)/i.test(text)) return true;
        if (/^[\s\r\n]*[-\u2013\u2014~]/.test(text)) return true;
        if (/(?:\u09A4\u09BE\u0995\u0993\u09AF\u09BC\u09BE|\u09A4\u09BE\u0995\u0993\u09DF\u09BE|\u09B8\u09C1\u09A8\u09CD\u09A8\u09BE\u09A4|\u09B8\u09C1\u09A8\u09CD\u09A8\u09A4|\u0986\u09AE\u09B2|\u0986\u09B2\u09CD\u09B2\u09BE\u09B9|\u0995\u09C1\u09B0\u0986\u09A8|\u0995\u09CB\u09B0\u0986\u09A8|\u099C\u09BE\u09A8\u09CD\u09A8\u09BE\u09A4|\u099C\u09BE\u09B9\u09BE\u09A8\u09CD\u09A8\u09BE\u09AE|\u09B8\u09BE\u09AB\u09B2\u09CD\u09AF|\u09B8\u09AB\u09B2\u09A4\u09BE|\u0986\u09A4\u09CD\u09AE\u09B6\u09C1\u09A6\u09CD\u09A7\u09BF|\u0997\u09C1\u09A8\u09BE\u09B9|\u09AA\u09BE\u09AA|\u09A8\u09C7\u0995\u09C0|\u09AE\u09C3\u09A4\u09CD\u09AF\u09C1|\u0995\u09AC\u09B0|\u09A7\u09C8\u09B0\u09CD\u09AF|\u0985\u09B9\u0982\u0995\u09BE\u09B0|\u099A\u09B0\u09BF\u09A4\u09CD\u09B0|\u0987\u09B2\u09AE|\u09B8\u09CE \u09AE\u09BE\u09A8\u09C1\u09B7)/i.test(text)) return true;
        if (/(?:\u09B0\u09B9\u0983|\u09B0\u09B9:|\u09B0\u09B9\.|\u09B9\u09BE\u09AB\u09BF\u0983|\u09B9\u09BE\u09AB\u09BF:|\u09B9\u09BE\u09AB\u09BF\.|\u09A6\u09BE\u0983\u09AC\u09BE\u0983|\u09A6\u09BE\.\u09AC\u09BE\.)/.test(text)) return true;
        return false;
    },

    clusterProximityCards: function(textFrames, options) {
        if (!textFrames || textFrames.length === 0) return [];
        var cards = [];
        var opts = options || {};
        var maxDX = opts.isKeyring ? 180 : 75;
        var maxDY = opts.isKeyring ? 95 : 65;

        var validTFs = [];
        for (var i = 0; i < textFrames.length; i++) {
            var tf = textFrames[i];
            if (this.isItemHidden(tf)) continue;
            var cTxt = tf.contents || "";
            if (!this.hasStudentBiodata(cTxt) && this.isBackSideText(cTxt)) continue;
            validTFs.push(tf);
        }

        if (validTFs.length === 0) return [];

        // Sort all textframes top-to-bottom by Y, then left-to-right by X
        validTFs.sort(function(a, b) {
            var aGB = a.geometricBounds;
            var bGB = b.geometricBounds;
            if (Math.abs(bGB[1] - aGB[1]) > 25) return bGB[1] - aGB[1];
            return aGB[0] - bGB[0];
        });

        // Group textframes that belong to the same spatial card bounding box
        var clusters = [];
        for (var v = 0; v < validTFs.length; v++) {
            var vtf = validTFs[v];
            var vgb = vtf.geometricBounds;
            var vMidX = (vgb[0] + vgb[2]) / 2;
            var vMidY = (vgb[1] + vgb[3]) / 2;

            var placed = false;
            for (var cl = 0; cl < clusters.length; cl++) {
                var cCenter = clusters[cl].center;
                if (Math.abs(cCenter[0] - vMidX) < maxDX && Math.abs(cCenter[1] - vMidY) < maxDY) {
                    clusters[cl].tfs.push(vtf);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                clusters.push({
                    center: [vMidX, vMidY],
                    tfs: [vtf]
                });
            }
        }

        for (var k = 0; k < clusters.length; k++) {
            var cTfs = clusters[k].tfs;
            var card = this.analyzeCardGroup(cTfs, null, options);
            if (card.nameFrame || card.detailsFrame) {
                var cBounds = card.nameFrame ? card.nameFrame.geometricBounds : card.detailsFrame.geometricBounds;
                card.bounds = cBounds;
                card.artboardIndex = 0;
                cards.push(card);
            }
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

    collectScopeCandidates: function(doc, scopeMode) {
        var candidateItems = [];
        var sel = doc.selection;

        if (scopeMode === "selection" && sel && sel.length > 0) {
            for (var s = 0; s < sel.length; s++) {
                var it = sel[s];
                if (!this.isItemHidden(it)) candidateItems.push(it);
            }
            return candidateItems;
        }

        var visLayers = [];
        this.collectVisibleLayers(doc, visLayers);
        if (visLayers.length === 0) {
            for (var dl = 0; dl < doc.layers.length; dl++) {
                if (doc.layers[dl].visible && !doc.layers[dl].locked) visLayers.push(doc.layers[dl]);
            }
        }

        if (scopeMode === "document" || scopeMode === "all_artboards") {
            for (var l = 0; l < visLayers.length; l++) {
                var layer = visLayers[l];
                for (var p = 0; p < layer.pageItems.length; p++) {
                    var itm = layer.pageItems[p];
                    if (!this.isItemHidden(itm)) candidateItems.push(itm);
                }
            }
            return candidateItems;
        }

        var abIndex = doc.artboards.getActiveArtboardIndex();
        var ab = doc.artboards[abIndex];
        var abRect = ab.artboardRect; // [left, top, right, bottom]

        for (var l = 0; l < visLayers.length; l++) {
            var layer = visLayers[l];
            for (var p = 0; p < layer.pageItems.length; p++) {
                var itm = layer.pageItems[p];
                if (this.isItemHidden(itm)) continue;
                var gb = itm.geometricBounds;
                if (gb[0] < abRect[2] && gb[2] > abRect[0] && gb[1] > abRect[3] && gb[3] < abRect[1]) {
                    candidateItems.push(itm);
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
        return candidateItems;
    },

    dedupeAndCollectTFs: function(candidateItems) {
        var allTFs = [];
        this.collectTextFrames(candidateItems, allTFs);

        // Deduplicate true stacked duplicate ghost text frames (exact same position <= 3pt AND identical or empty content)
        var cleanAllTFs = [];
        for (var a = 0; a < allTFs.length; a++) {
            var atf = allTFs[a];
            if (!atf || this.isItemHidden(atf)) continue;
            var agb = atf.geometricBounds;
            var aTxtNorm = (atf.contents || "").replace(/^\s+|\s+$/g, "");
            var isDup = false;
            for (var c = 0; c < cleanAllTFs.length; c++) {
                var cgb = cleanAllTFs[c].geometricBounds;
                var cTxtNorm = (cleanAllTFs[c].contents || "").replace(/^\s+|\s+$/g, "");
                var samePos = (Math.abs(agb[0] - cgb[0]) <= 3 && Math.abs(agb[1] - cgb[1]) <= 3);
                if (samePos && (aTxtNorm === cTxtNorm || aTxtNorm === "")) {
                    try {
                        atf.contents = "";
                        atf.remove();
                    } catch(re) {}
                    isDup = true;
                    break;
                }
            }
            if (!isDup) cleanAllTFs.push(atf);
        }
        return cleanAllTFs;
    },

    extractUnitsFromCandidates: function(candidateItems, options) {
        var units = [];
        for (var g = 0; g < candidateItems.length; g++) {
            var itm = candidateItems[g];
            if (itm.typename === "GroupItem") {
                this.extractCardsFromItem(itm, units, options);
            }
        }
        if (units.length === 0) {
            var tfs = [];
            this.collectTextFrames(candidateItems, tfs);
            if (tfs.length > 0) {
                units = this.clusterProximityCards(tfs, options);
            }
        }
        return units;
    },

    detectCards: function(arg1, arg2, arg3) {
        var doc = app.activeDocument;
        if (!doc) return [];

        var scope = "artboard";
        var order = "zigzag";
        var options = {};

        if (typeof arg1 === "object" && arg1 !== null) {
            options = arg1;
            scope = options.scope || "artboard";
            order = options.order || "zigzag";
        } else if (typeof arg3 === "object" && arg3 !== null) {
            options = arg3;
            scope = arg1 || "artboard";
            order = arg2 || "zigzag";
        } else {
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
        }

        var sel = doc.selection;
        if (scope === "selection" && (!sel || sel.length === 0)) { scope = "artboard"; }

        var candidateItems = this.collectScopeCandidates(doc, scope);
        var allTFs = this.dedupeAndCollectTFs(candidateItems);
        var cardUnits = this.extractUnitsFromCandidates(candidateItems, options);

        // If Active Artboard yielded 0 cards (e.g. wrong active artboard or off-artboard placement), fall back cleanly
        if (cardUnits.length === 0 && scope === "artboard") {
            var docCandidates = this.collectScopeCandidates(doc, "document");
            if (docCandidates.length > 0) {
                allTFs = this.dedupeAndCollectTFs(docCandidates);
                cardUnits = this.extractUnitsFromCandidates(docCandidates, options);
            }
            if (cardUnits.length === 0 && sel && sel.length > 0) {
                var selCandidates = this.collectScopeCandidates(doc, "selection");
                if (selCandidates.length > 0) {
                    allTFs = this.dedupeAndCollectTFs(selCandidates);
                    cardUnits = this.extractUnitsFromCandidates(selCandidates, options);
                }
            }
        }

        // 3. Post-processing DUAL-BOX AUDIT & PAIRING
        var frameMode = options.frameMode || "auto";
        if (frameMode !== "single_box" && !options.isKeyring) {
            for (var cu = 0; cu < cardUnits.length; cu++) {
                var cCard = cardUnits[cu];

                // Case A: Card has nameFrame but missing detailsFrame
                if (cCard.nameFrame && !cCard.detailsFrame) {
                    var nGB = cCard.nameFrame.geometricBounds;
                    var nTop = nGB[1];
                    var nMidX = (nGB[0] + nGB[2]) / 2;
                    var nTxt = cCard.nameFrame.contents || "";
                    var isCombinedBox = this.hasStudentBiodata(nTxt) || cCard.nameFrame.lines.length >= 2;
                    if (isCombinedBox) {
                        // Already a combined Name + Details box, never pair a details frame below it
                        continue;
                    }
                    var bestDet = null;
                    var minDetDist = 9999;

                    for (var at = 0; at < allTFs.length; at++) {
                        var atf = allTFs[at];
                        if (atf === cCard.nameFrame || atf === cCard.serialFrame || atf === cCard.baniFrame || this.isItemHidden(atf)) continue;
                        if (this.isBackSideText(atf.contents) || this.isBaniText(atf.contents)) continue;
                        var atgb = atf.geometricBounds;
                        var atMidX = (atgb[0] + atgb[2]) / 2;
                        var dy = nTop - atgb[1]; // positive downwards
                        var dx = Math.abs(nMidX - atMidX);

                        if (dy > 3 && dy < 65 && dx < 60) {
                            if (dy < minDetDist) {
                                minDetDist = dy;
                                bestDet = atf;
                            }
                        }
                    }
                    if (bestDet) {
                        cCard.detailsFrame = bestDet;
                    }
                }

                // Case B: Card has detailsFrame but missing nameFrame
                if (cCard.detailsFrame && !cCard.nameFrame) {
                    var dGB = cCard.detailsFrame.geometricBounds;
                    var dTop = dGB[1];
                    var dMidX = (dGB[0] + dGB[2]) / 2;
                    var bestNm = null;
                    var minNmDist = 9999;

                    for (var at = 0; at < allTFs.length; at++) {
                        var atf = allTFs[at];
                        if (atf === cCard.detailsFrame || atf === cCard.serialFrame || atf === cCard.baniFrame || this.isItemHidden(atf)) continue;
                        if (this.isBackSideText(atf.contents)) continue;
                        var atgb = atf.geometricBounds;
                        var atMidX = (atgb[0] + atgb[2]) / 2;
                        var dy = atgb[1] - dTop; // positive upwards
                        var dx = Math.abs(dMidX - atMidX);

                        if (dy > 3 && dy < 65 && dx < 60) {
                            if (dy < minNmDist) {
                                minNmDist = dy;
                                bestNm = atf;
                            }
                        }
                    }
                    if (bestNm) {
                        cCard.nameFrame = bestNm;
                    }
                }

                // Case C: Guarantee nameFrame is strictly ABOVE detailsFrame
                if (cCard.nameFrame && cCard.detailsFrame && cCard.nameFrame !== cCard.detailsFrame) {
                    if (cCard.nameFrame.geometricBounds[1] < cCard.detailsFrame.geometricBounds[1]) {
                        var swap = cCard.nameFrame;
                        cCard.nameFrame = cCard.detailsFrame;
                        cCard.detailsFrame = swap;
                    }
                }
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
                if (!cCard.nameFrame && !cCard.detailsFrame) continue;
                if (cCard.serialFrame && cCard.formFrame && cCard.qtyFrame) continue; // already attached!
                var anchorFrame = cCard.nameFrame || cCard.detailsFrame;
                var cgb = anchorFrame.geometricBounds;
                var cLeft = cgb[0];
                var cTop = cgb[1];

                var bestSerial = null;
                var bestForm = null;
                var minSerialDist = 9999;
                var minFormDist = 9999;
                var minQtyDist = 9999;
                var bestQty = null;

                for (var dt = 0; dt < allDocTFs.length; dt++) {
                    var dtf = allDocTFs[dt];
                    if (dtf === cCard.nameFrame || dtf === cCard.detailsFrame || this.isItemHidden(dtf)) continue;
                    var dtgb = dtf.geometricBounds;
                    var dx = dtgb[0] - cLeft;
                    var dy = cTop - dtgb[1]; // positive downwards
                    var dRaw = dtf.contents.replace(/^\s+|\s+$/g, "");
                    var isYearNum = /^(?:19|20)\d\d$|^(?:\u09E7\u09EA|\u09E7\u09EB)[\u09E6-\u09EF]{2}$|^(?:\u09E8\u09E6|\u09E7\u09EF)[\u09E6-\u09EF]{2}$/.test(dRaw.replace(/\s+/g, ""));

                    if (!cCard.serialFrame && !isYearNum && !(options && options.isKeyring)) {
                        if (/^[\u09E6-\u09EF0-9]+$/.test(dRaw.replace(/\s+/g, "")) && dRaw.length <= 4) {
                            var cardBoxS = cCard.bounds || cgb;
                            var sCenterX = (dtgb[0] + dtgb[2]) / 2;
                            var sCenterY = (dtgb[1] + dtgb[3]) / 2;
                            var inSameBandY = (sCenterY <= cardBoxS[1] + 12) && (sCenterY >= cardBoxS[3] - 12);
                            if (inSameBandY) {
                                var nCenterX = (cgb[0] + cgb[2]) / 2;
                                var nCenterY = (cgb[1] + cgb[3]) / 2;
                                var sDist = Math.sqrt((sCenterX - nCenterX)*(sCenterX - nCenterX) + (sCenterY - nCenterY)*(sCenterY - nCenterY));
                                if (sDist < minSerialDist && sDist < 130) {
                                    minSerialDist = sDist;
                                    bestSerial = dtf;
                                }
                            }
                        }
                    }

                    if (!cCard.qtyFrame && !isYearNum) {
                        if (/^[\u09E6-\u09EF0-9]+$/.test(dRaw.replace(/\s+/g, "")) && dRaw.length <= 4) {
                            var cardBox = cCard.bounds || cgb;
                            var cRight = cardBox[2];
                            var cTopY = cardBox[1];
                            var cBotY = cardBox[3];
                            var dtCenterY = (dtgb[1] + dtgb[3]) / 2;

                            // Side number frame sits at/near right edge of card and within its vertical band
                            var isRightSide = (dtgb[0] >= cRight - 45) && (dtgb[0] <= cRight + 160);
                            var isVertAligned = (dtCenterY <= cTopY + 12) && (dtCenterY >= cBotY - 12);

                            if (isRightSide && isVertAligned) {
                                var crossedAnotherCard = false;
                                for (var oc = 0; oc < cardUnits.length; oc++) {
                                    if (oc === cu) continue;
                                    var ob = cardUnits[oc].bounds;
                                    if (ob && ob[0] >= cRight - 10 && dtgb[0] >= ob[0] && dtCenterY <= ob[1] + 15 && dtCenterY >= ob[3] - 15) {
                                        crossedAnotherCard = true;
                                        break;
                                    }
                                }
                                if (!crossedAnotherCard) {
                                    var distToRightEdge = Math.abs(dtgb[0] - cRight);
                                    if (distToRightEdge < minQtyDist) {
                                        minQtyDist = distToRightEdge;
                                        bestQty = dtf;
                                    }
                                }
                            }
                        }
                    }

                    if (!cCard.formFrame) {
                        var isFormLabel = /(?:\u09AB\u09B0\u09AE|\u09A6\u09BE\u0996\u09C7\u09B2\u09BE|\u09B0\u09CB\u09B2|Form|Roll|\u2021\u00B6\u00B4|\u2021dvi|diBk|\u2021ivj)/i.test(dRaw);
                        var isFormDigits = /^[\u09E6-\u09EF0-9\s\-\/]+$/.test(dRaw) && dRaw.length <= 10;
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
                if (bestQty && !cCard.qtyFrame) cCard.qtyFrame = bestQty;
            }
        }

        cardUnits = this.filterNonFillableCards(cardUnits, options);
        return this.sortCards(cardUnits, order || "zigzag", options.layoutGrid);
    },

    filterNonFillableCards: function(cardUnits, options) {
        if (!cardUnits || cardUnits.length === 0) return [];
        var opts = options || {};
        var isKeyring = (opts.isKeyring === true);

        var qtyBackedCount = 0;
        var strongBioCount = 0;
        for (var i = 0; i < cardUnits.length; i++) {
            var u = cardUnits[i];
            if (u.isStaticFrontSide) continue;
            if (u.qtyFrame || u.serialFrame) qtyBackedCount++;
            var t0 = u.nameFrame ? u.nameFrame.contents : "";
            var t1 = u.detailsFrame ? u.detailsFrame.contents : "";
            if (this.hasStrongBiodataSignals(t0) || this.hasStrongBiodataSignals(t1)) {
                strongBioCount++;
            }
        }

        var kept = [];
        for (var j = 0; j < cardUnits.length; j++) {
            var card = cardUnits[j];
            var txt0 = card.nameFrame ? card.nameFrame.contents : "";
            var txt1 = card.detailsFrame ? card.detailsFrame.contents : "";
            var hasBio = this.hasStudentBiodata(txt0) || this.hasStudentBiodata(txt1);
            var hasSideNum = isKeyring ? Boolean(card.qtyFrame) : Boolean(card.qtyFrame || card.serialFrame);

            // 1. Exclude Front-Side / Institution cover cards (even if a leftover address line had no keyword)
            if (card.isStaticFrontSide || (card.hasInstHeader && !hasBio)) {
                continue;
            }

            // 2. When Keyring cards on the sheet carry side numbers (e.g. "20"), reject cards missing a side number
            if (isKeyring) {
                if (qtyBackedCount >= 2 && !hasSideNum) continue;
                if (qtyBackedCount >= 1 && !hasSideNum && !hasBio) continue;
                if (strongBioCount >= 2 && !hasBio && !hasSideNum) continue;
            } else if (qtyBackedCount >= 2 && !hasSideNum && !hasBio) {
                continue;
            }

            kept.push(card);
        }
        return kept;
    },

    extractCardsFromItem: function(item, outCards, options) {
        if (!item || this.isItemHidden(item)) return;

        if (item.typename === "GroupItem") {
            var tfs = [];
            this.collectTextFrames(item.pageItems, tfs);
            if (tfs.length === 0) return;

            var acc = this.getAccurateCardBounds(item);
            var gb = (acc && acc.bounds) ? acc.bounds : item.geometricBounds;
            var w = (acc && acc.width > 0) ? acc.width : Math.abs(gb[2] - gb[0]);
            var h = (acc && acc.height > 0) ? acc.height : Math.abs(gb[1] - gb[3]);

            // Check if this group contains sub-groups that represent individual cards
            var subGroupTFCount = 0;
            for (var pi = 0; pi < item.pageItems.length; pi++) {
                var pSub = item.pageItems[pi];
                if (pSub.typename === "GroupItem" && !this.isItemHidden(pSub)) {
                    var sTfs = [];
                    this.collectTextFrames(pSub.pageItems, sTfs);
                    if (sTfs.length > 0) {
                        subGroupTFCount++;
                    }
                }
            }

            // Recurse carefully: only split if children genuinely resolve into 2+ separate cards (or oversized wrapper)
            if (subGroupTFCount >= 2 || w > 450 || (tfs.length >= 7 && subGroupTFCount >= 1)) {
                var childCards = [];
                for (var c = 0; c < item.pageItems.length; c++) {
                    this.extractCardsFromItem(item.pageItems[c], childCards, options);
                }
                if (childCards.length >= 2) {
                    for (var cc = 0; cc < childCards.length; cc++) outCards.push(childCards[cc]);
                    return;
                }
                if (childCards.length === 1 && (w > 480 || h > 350)) {
                    outCards.push(childCards[0]);
                    return;
                }
                var unified = this.analyzeCardGroup(tfs, item, options);
                if (unified.nameFrame || unified.namePlaceholderPath || unified.detailsFrame) {
                    unified.group = item;
                    unified.bounds = gb;
                    outCards.push(unified);
                    return;
                }
                if (childCards.length === 1) {
                    outCards.push(childCards[0]);
                }
                return;
            }

            // Single card group
            var card = this.analyzeCardGroup(tfs, item, options);
            if (card.nameFrame || card.namePlaceholderPath || card.detailsFrame) {
                card.group = item;
                card.bounds = gb;
                outCards.push(card);
                return;
            }

            for (var k = 0; k < item.pageItems.length; k++) {
                if (item.pageItems[k].typename === "GroupItem") {
                    this.extractCardsFromItem(item.pageItems[k], outCards, options);
                }
            }
        }
    },

    analyzeCardGroup: function(tfs, group, options) {
        var opts = options || {};
        var frameMode = opts.frameMode || "auto"; // "auto", "dual_box", "single_box"

        var card = {
            nameFrame: null,
            detailsFrame: null,
            baniFrame: null,
            qtyFrame: null,
            badgeFrame: null,
            serialFrame: null,
            formFrame: null,
            badgeNumber: -1,
            hasInstHeader: false,
            hasBioSignal: false,
            isStaticFrontSide: false
        };
        var candidateFrames = [];
        var hasBioSignal = false;
        var hasInstHeader = false;

        var groupBounds = group ? group.geometricBounds : null;
        var groupLeft = groupBounds ? groupBounds[0] : 0;
        var groupTop = groupBounds ? groupBounds[1] : 0;
        var groupRight = groupBounds ? groupBounds[2] : 0;
        var groupBottom = groupBounds ? groupBounds[3] : 0;
        var groupWidth = Math.abs(groupRight - groupLeft);
        var groupHeight = Math.abs(groupTop - groupBottom);

        // Deduplicate true stacked duplicate text frames inside the group (exact same position <= 3pt AND identical or empty content)
        var uniqueTFs = [];
        for (var d = 0; d < tfs.length; d++) {
            var dtf = tfs[d];
            if (!dtf || this.isItemHidden(dtf)) continue;
            var dgb = dtf.geometricBounds;
            var dTxtNorm = (dtf.contents || "").replace(/^\s+|\s+$/g, "");
            var isDup = false;
            for (var u = 0; u < uniqueTFs.length; u++) {
                var ugb = uniqueTFs[u].geometricBounds;
                var uTxtNorm = (uniqueTFs[u].contents || "").replace(/^\s+|\s+$/g, "");
                var samePos = (Math.abs(dgb[0] - ugb[0]) <= 3 && Math.abs(dgb[1] - ugb[1]) <= 3);
                if (samePos && (dTxtNorm === uTxtNorm || dTxtNorm === "")) {
                    try {
                        dtf.contents = "";
                        dtf.remove();
                    } catch(de) {}
                    isDup = true;
                    break;
                }
            }
            if (!isDup) uniqueTFs.push(dtf);
        }
        tfs = uniqueTFs;

        for (var i = 0; i < tfs.length; i++) {
            var tf = tfs[i];
            if (this.isItemHidden(tf)) continue; // STRICT: Ignore locked & hidden items
            var rawTxt = tf.contents;
            var cleanTxt = rawTxt.replace(/\s+/g, "");
            var gb = tf.geometricBounds;
            var tfLeft = gb[0];
            var tfTop = gb[1];
            var tfRight = gb[2];
            var tfBottom = gb[3];
            var tfW = Math.abs(tfRight - tfLeft);
            var tfH = Math.abs(tfTop - tfBottom);

            var relX = groupWidth > 0 ? (tfLeft - groupLeft) / groupWidth : 0;
            var relY = groupHeight > 0 ? (groupTop - tfTop) / groupHeight : 0;
            var isBio = this.hasStudentBiodata(rawTxt);
            if (isBio) hasBioSignal = true;

            // 1. Title / Memorabilia / Front-Side emblem banners (NEVER skip student biodata!)
            if (!isBio && (this.isBackSideText(rawTxt) || /(?:\u09A6\u09BE\u0993\u09B0\u09BE[\u09AF\u09BC\u09DF]\u09C7|\u09A6\u09BE\u0993\u09B0\u09BE|\u09AE\u09BE\u09B8\u09CD\u099F\u09BE\u09B0\u09CD\u09B8|\u09B8\u09CD\u09AE\u09C3\u09A4\u09BF|\u09B8\u09AE\u09BE\u09AA\u09A8\u09C0|\u09B9\u09BF\u09AB[\u099C\u09AF]|\u09A4\u09BE\u0995\u09AE\u09C0\u09B2|\u09A6\u09B8\u09CD\u09A4\u09BE\u09B0\u09AC\u09A8\u09CD\u09A6\u09C0|\u09AC\u09BF\u09A6\u09BE[\u09AF\u09BC\u09DF]\u09C0|\u09B8\u09CD\u09AE\u09BE\u09B0\u0995|\u09AB\u09BE\u09B0\u09C7\u0997\u09BF\u09A8|\u09AA\u09B0\u09BF\u099A\u09BF\u09A4\u09BF|\u09AC\u09BF\u09AD\u09BE\u0997|wnRwi|wL\u00AA\u00F3v\u00E3|`vIiv|nvw`m|cwiwP|fv\u2021iwMb)/i.test(rawTxt))) {
                continue;
            }

            // 2. Year tag (e.g., "2027", "২০২৭", "১৪৪৬")
            if (/^(?:19|20)\d\d$|^(?:\u09E7\u09EA|\u09E7\u09EB)[\u09E6-\u09EF]{2}$|^(?:\u09E8\u09E6|\u09E7\u09EF)[\u09E6-\u09EF]{2}$/.test(cleanTxt)) {
                card.badgeFrame = tf;
                continue;
            }

            // 3. Form number frame (contains "ফরম", "দাখেলা", "রোল", "Form" or sits near bottom-right; never steal 1-4 digit Keyring side qty)
            var isShortDigits = /^[\u09E6-\u09EF0-9]+$/.test(cleanTxt) && cleanTxt.length <= 4;
            var isFormLabel = /(?:\u09AB\u09B0\u09AE|\u09A6\u09BE\u0996\u09C7\u09B2\u09BE|\u09B0\u09CB\u09B2|Form|Roll|\u2021\u00B6\u00B4|\u2021dvi|diBk|\u2021ivj)/i.test(rawTxt);
            var isFormText = isFormLabel ||
                             (/^[\u09E6-\u09EF0-9\s\-\/]+$/.test(cleanTxt) && cleanTxt.length >= 4 && cleanTxt.length <= 8 && relY > 0.45 && !(opts.isKeyring && isShortDigits));
            if (!isBio && !isShortDigits && (isFormText || (!opts.isKeyring && relX > 0.40 && relY > 0.40 && tfW < 60 && tfH < 45 && tf.lines.length <= 2))) {
                card.formFrame = tf;
                continue;
            }
            if (!isBio && isFormText) {
                card.formFrame = tf;
                continue;
            }

            // 4. Serial badge / Quantity frame (sitting on top-right, right edge, or small number frame <= 4 digits)
            if (/^[\u09E6-\u09EF0-9]+$/.test(cleanTxt) && cleanTxt.length <= 4) {
                if (relX > 0.60 || (groupWidth > 0 && tfLeft > groupRight - 60) || (tfW < 40 && tfH < 35)) {
                    if (!card.serialFrame) {
                        card.serialFrame = tf;
                        if (!card.qtyFrame) card.qtyFrame = tf;
                        continue;
                    } else if (!card.qtyFrame) {
                        card.qtyFrame = tf;
                        continue;
                    }
                }
            }

            // 5. Explicit Bani quote
            if (this.isBaniText(rawTxt)) {
                card.baniFrame = tf;
                continue;
            }

            // 6. Institution name header (Front Side Madrasa/Institute banner - NEVER biodata with student signals!)
            if (!isBio && this.isInstitutionHeaderText(rawTxt)) {
                hasInstHeader = true;
                continue;
            }

            // 7. Design label
            if (!isBio && (/^\u09A1\u09BF\u099C\u09BE\u0987\u09A8\s*[\u09E6-\u09EF0-9]+/i.test(rawTxt) || /^(?:Tapper|Round|Design)/i.test(rawTxt))) {
                continue;
            }

            candidateFrames.push(tf);
        }

        card.hasInstHeader = hasInstHeader;
        card.hasBioSignal = hasBioSignal;
        if (hasInstHeader && !hasBioSignal) {
            card.isStaticFrontSide = true;
            return card;
        }

        // First pass: extract explicit Bani frames from candidates
        var nonBaniCandidates = [];
        for (var c = 0; c < candidateFrames.length; c++) {
            var cTf = candidateFrames[c];
            if (!card.baniFrame && this.isBaniText(cTf.contents)) {
                card.baniFrame = cTf;
            } else {
                nonBaniCandidates.push(cTf);
            }
        }
        candidateFrames = nonBaniCandidates;

        // Sort remaining candidate frames by Y coordinate descending (top-to-bottom):
        candidateFrames.sort(function(a, b) {
            return b.geometricBounds[1] - a.geometricBounds[1];
        });

        if (candidateFrames.length === 1) {
            card.nameFrame = candidateFrames[0];
            card.detailsFrame = null;
        } else if (candidateFrames.length >= 2) {
            var topHasBio = this.hasStudentBiodata(candidateFrames[0].contents);
            var topHasMultiLines = candidateFrames[0].lines.length >= 2;
            var isKeyringMode = (opts.isKeyring === true);

            if (isKeyringMode || frameMode === "single_box" || topHasBio || topHasMultiLines) {
                // Combined Box / Keyring mode: Top candidate holds Name + Details combined
                card.nameFrame = candidateFrames[0];
                card.detailsFrame = null;
                if (!card.baniFrame && !this.hasStudentBiodata(candidateFrames[1].contents)) {
                    card.baniFrame = candidateFrames[1];
                }
            } else {
                // True Dual Box mode (only when top box is strictly 1 single name line and 2nd box has details):
                card.nameFrame = candidateFrames[0];
                card.detailsFrame = candidateFrames[1];
                if (candidateFrames.length > 2 && !card.baniFrame && !this.hasStudentBiodata(candidateFrames[2].contents)) {
                    card.baniFrame = candidateFrames[2];
                }
            }
        }

        return card;
    },

    sortCards: function(cards, order, layoutGrid) {
        if (!cards || cards.length <= 1) return cards;
        var doc = app.activeDocument;
        var numABs = doc ? doc.artboards.length : 0;

        // Measure visual clipped bounds first; filter huge sheet banners while keeping large-scale mockups as fallback
        var filtered = [];
        var fallbackLarge = [];
        for (var c = 0; c < cards.length; c++) {
            var card = cards[c];
            var targetObj = card.group || card.item;
            var acc = targetObj ? this.getAccurateCardBounds(targetObj) : null;
            var gb = (acc && acc.bounds) ? acc.bounds : card.bounds;
            card.bounds = gb;
            var w = (acc && acc.width > 0) ? acc.width : Math.abs(gb[2] - gb[0]);
            var h = (acc && acc.height > 0) ? acc.height : Math.abs(gb[1] - gb[3]);
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
            if (w <= 520 && h <= 380) {
                filtered.push(card);
            } else if (w <= 1600 && h <= 1600) {
                fallbackLarge.push(card);
            }
        }
        if (filtered.length === 0 && fallbackLarge.length > 0) {
            filtered = fallbackLarge;
        }

        // Cluster cards by Artboard / Sheet
        var sheets = [];
        for (var i = 0; i < filtered.length; i++) {
            var c = filtered[i];
            var placed = false;
            for (var s = 0; s < sheets.length; s++) {
                var sFirst = sheets[s][0];
                if (sFirst.artboardIndex === c.artboardIndex && Math.abs(c.bounds[0] - sFirst.bounds[0]) < 600) {
                    sheets[s].push(c);
                    placed = true;
                    break;
                }
            }
            if (!placed) sheets.push([c]);
        }

        var finalResult = [];
        var gridMode = layoutGrid || "auto";

        for (var s = 0; s < sheets.length; s++) {
            var sheetCards = sheets[s];
            if (sheetCards.length === 0) continue;

            // Sort all cards in this sheet from left to right by X-center
            sheetCards.sort(function(a, b) {
                var aMidX = (a.bounds[0] + a.bounds[2]) / 2;
                var bMidX = (b.bounds[0] + b.bounds[2]) / 2;
                return aMidX - bMidX;
            });

            var targetCols = 0;
            if (gridMode === "2col") targetCols = 2;
            else if (gridMode === "3col") targetCols = 3;
            else if (gridMode === "4col") targetCols = 4;

            var cols = [];

            if (targetCols > 0 && sheetCards.length >= targetCols) {
                // Explicit N-column partition: divide into targetCols clusters based on X
                var minX = (sheetCards[0].bounds[0] + sheetCards[0].bounds[2]) / 2;
                var maxX = (sheetCards[sheetCards.length - 1].bounds[0] + sheetCards[sheetCards.length - 1].bounds[2]) / 2;
                var span = Math.max(1, maxX - minX);
                var colWidth = span / targetCols;

                for (var tc = 0; tc < targetCols; tc++) cols.push([]);

                for (var ci = 0; ci < sheetCards.length; ci++) {
                    var cardItem = sheetCards[ci];
                    var cardMidX = (cardItem.bounds[0] + cardItem.bounds[2]) / 2;
                    var colIdx = Math.floor((cardMidX - minX + (colWidth * 0.4)) / colWidth);
                    if (colIdx < 0) colIdx = 0;
                    if (colIdx >= targetCols) colIdx = targetCols - 1;
                    cols[colIdx].push(cardItem);
                }

                // If any bucket ended up empty, fallback to proportional chunking
                var hasEmpty = false;
                for (var ck = 0; ck < cols.length; ck++) {
                    if (cols[ck].length === 0) { hasEmpty = true; break; }
                }
                if (hasEmpty && sheetCards.length % targetCols === 0) {
                    cols = [];
                    var perCol = sheetCards.length / targetCols;
                    for (var tc = 0; tc < targetCols; tc++) {
                        cols.push(sheetCards.slice(tc * perCol, (tc + 1) * perCol));
                    }
                }
            } else {
                // Adaptive Smart Grid Clustering: detect natural column gaps
                for (var ci = 0; ci < sheetCards.length; ci++) {
                    var cardItem = sheetCards[ci];
                    var cardMidX = (cardItem.bounds[0] + cardItem.bounds[2]) / 2;
                    var placedCol = false;
                    for (var k = 0; k < cols.length; k++) {
                        var colMidX = (cols[k][0].bounds[0] + cols[k][0].bounds[2]) / 2;
                        if (Math.abs(colMidX - cardMidX) < 45) {
                            cols[k].push(cardItem);
                            placedCol = true;
                            break;
                        }
                    }
                    if (!placedCol) cols.push([cardItem]);
                }
            }

            // Sort each column internally from Top to Bottom (Y descending)
            for (var k = 0; k < cols.length; k++) {
                cols[k].sort(function(a, b) {
                    return b.bounds[1] - a.bounds[1];
                });
            }

            if (order === "column") {
                // Column by Column: Col 1 top-to-bottom, then Col 2 top-to-bottom...
                for (var k = 0; k < cols.length; k++) {
                    for (var ci = 0; ci < cols[k].length; ci++) {
                        finalResult.push(cols[k][ci]);
                    }
                }
            } else {
                // Row by Row (Zigzag): Row 1 (Col 1, Col 2, Col 3...), Row 2 (Col 1, Col 2, Col 3...)...
                var maxRows = 0;
                for (var k = 0; k < cols.length; k++) {
                    if (cols[k].length > maxRows) maxRows = cols[k].length;
                }
                for (var r = 0; r < maxRows; r++) {
                    for (var k = 0; k < cols.length; k++) {
                        if (r < cols[k].length) {
                            finalResult.push(cols[k][r]);
                        }
                    }
                }
            }
        }

        return finalResult;
    },

    _fontCache: {},

    
        ensureBornomalaDefault: function() {
        try {
            var bFonts = this.getBornomalaFonts();
            var fontReg = bFonts.bold || bFonts.regular;
            if (!fontReg || !app.documents.length) return JSON.stringify({ success: false });

            var doc = app.activeDocument;
            try {
                var ncs = doc.characterStyles["[Normal Character Style]"];
                if (ncs && ncs.characterAttributes) ncs.characterAttributes.textFont = fontReg;
            } catch(e1) {}
            try {
                var nps = doc.paragraphStyles["[Normal Paragraph Style]"];
                if (nps && nps.characterAttributes) nps.characterAttributes.textFont = fontReg;
            } catch(e2) {}
            return JSON.stringify({ success: true });
        } catch(ex) {
            return JSON.stringify({ success: false });
        }
    },

    getBornomalaFonts: function() {
        if (!this._fontCache) this._fontCache = {};
        if (this._fontCache["bornomala_default"]) return this._fontCache["bornomala_default"];
        var res = { bold: null, regular: null };

        // 1. Direct PostScript Name lookups
        var bNames = [
            "Bornomala-Bold",
            "BornomalaANSI-Bold",
            "Bornomala01MJ-Bold",
            "Bornomala02MJ-Bold",
            "Bornomala",
            "SutonnyMJ-Bold",
            "SutonnyMJ-Bold-Bold"
        ];
        var rNames = [
            "Bornomala-Regular",
            "BornomalaANSI-Regular",
            "Bornomala01MJ-Regular",
            "Bornomala02MJ-Regular",
            "Bornomala",
            "Bornomala ANSI",
            "SutonnyMJ",
            "SutonnyMJ-Regular"
        ];
        
        for (var b = 0; b < bNames.length; b++) {
            try { 
                var bf = app.textFonts.getByName(bNames[b]); 
                if (bf) { res.bold = bf; break; } 
            } catch(e) {}
        }
        for (var r = 0; r < rNames.length; r++) {
            try { 
                var rf = app.textFonts.getByName(rNames[r]); 
                if (rf) { res.regular = rf; break; } 
            } catch(e) {}
        }

        // 2. Search installed system fonts specifically for Bornomala / Sutonny
        if (!res.bold || !res.regular) {
            try {
                for (var i = 0; i < app.textFonts.length; i++) {
                    var f = app.textFonts[i];
                    var fn = f.name || "";
                    var fam = f.family || "";
                    var fs = f.style || "";
                    var fullDesc = (fn + " " + fam + " " + fs).toLowerCase();
                    
                    if (fullDesc.indexOf("bornomala") !== -1 || fullDesc.indexOf("sutonny") !== -1) {
                        if (!res.bold && (fs.toLowerCase().indexOf("bold") !== -1 || fn.toLowerCase().indexOf("bold") !== -1)) {
                            res.bold = f;
                        }
                        if (!res.regular && (fs.toLowerCase().indexOf("regular") !== -1 || fn.toLowerCase().indexOf("regular") !== -1 || fs === "" || fs === "Normal")) {
                            res.regular = f;
                        }
                    }
                    if (res.bold && res.regular) break;
                }
            } catch(e) {}
        }

        // 3. Fallback: Search active document text frames specifically for Bornomala / Sutonny
        if (!res.bold || !res.regular) {
            try {
                if (app.documents.length > 0) {
                    var doc = app.activeDocument;
                    for (var i = 0; i < doc.textFrames.length; i++) {
                        try {
                            var tf = doc.textFrames[i];
                            if (tf.paragraphs.length > 0 && tf.paragraphs[0].characters.length > 0) {
                                var f = tf.paragraphs[0].characters[0].characterAttributes.textFont;
                                if (f) {
                                    var fn = (f.name || "").toLowerCase();
                                    var fam = (f.family || "").toLowerCase();
                                    var fs = (f.style || "").toLowerCase();
                                    if (fn.indexOf("bornomala") !== -1 || fam.indexOf("bornomala") !== -1 || fn.indexOf("sutonny") !== -1 || fam.indexOf("sutonny") !== -1) {
                                        if (/bold/i.test(fn) || /bold/i.test(fs)) {
                                            if (!res.bold) res.bold = f;
                                        } else if (/regular|normal/i.test(fn) || /regular|normal/i.test(fs) || fs === "") {
                                            if (!res.regular) res.regular = f;
                                        }
                                    }
                                }
                            }
                        } catch(tfe) {}
                        if (res.bold && res.regular) break;
                    }
                }
            } catch(de) {}
        }

        if (res.bold && !res.regular) res.regular = res.bold;
        if (!res.bold && res.regular) res.bold = res.regular;

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
        if (!fam || /akhand|myriad/i.test(fam) || /akhand|myriad/i.test(baseFont.name)) return this.getBornomalaFonts();

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

    _isClippingMaskItem: function(it) {
        if (!it) return false;
        try {
            if (it.clipping) return true;
            if (it.typename === "CompoundPathItem" && it.pathItems && it.pathItems.length > 0 && it.pathItems[0].clipping) {
                return true;
            }
        } catch(e) {}
        return false;
    },

    _findCardFrameBoundsRecursive: function(node, depth, accState, maxRightBound) {
        if (!node || depth > 7 || this.isItemHidden(node)) return null;
        var hasRightLimit = (maxRightBound !== null && maxRightBound !== undefined);
        if (node.typename === "GroupItem" && node.pageItems) {
            if (node.clipped) {
                for (var c = 0; c < node.pageItems.length; c++) {
                    var cp = node.pageItems[c];
                    if (this._isClippingMaskItem(cp) && cp.geometricBounds) {
                        var cgb = cp.geometricBounds;
                        var cl = Math.min(cgb[0], cgb[2]);
                        var cr = Math.max(cgb[0], cgb[2]);
                        var ct = Math.max(cgb[1], cgb[3]);
                        var cb = Math.min(cgb[1], cgb[3]);
                        var cw = cr - cl;
                        var ch = ct - cb;
                        if (cw >= 120 && cw <= 280 && ch >= 60 && ch <= 160) {
                            var clipInsideQty = (!hasRightLimit || cr <= maxRightBound + 1.5);
                            var clipScore = (cw * ch) + (clipInsideQty ? 1000000 : 0);
                            if (clipScore > accState.bestClipScore) {
                                accState.bestClipScore = clipScore;
                                accState.bestClipBounds = [cl, ct, cr, cb];
                            }
                            if (depth === 0 && clipInsideQty) return accState.bestClipBounds;
                        }
                        break;
                    }
                }
            }
            for (var i = 0; i < node.pageItems.length; i++) {
                var sub = node.pageItems[i];
                if (!sub || this.isItemHidden(sub) || sub.typename === "TextFrame") continue;
                if (this._isClippingMaskItem(sub) && sub.geometricBounds) {
                    var mgb = sub.geometricBounds;
                    var ml = Math.min(mgb[0], mgb[2]);
                    var mr = Math.max(mgb[0], mgb[2]);
                    var mt = Math.max(mgb[1], mgb[3]);
                    var mb = Math.min(mgb[1], mgb[3]);
                    var mw = mr - ml;
                    var mh = mt - mb;
                    if (mw >= 120 && mw <= 280 && mh >= 60 && mh <= 160) {
                        var mInsideQty = (!hasRightLimit || mr <= maxRightBound + 1.5);
                        var mScore = (mw * mh) + (mInsideQty ? 1000000 : 0);
                        if (mScore > accState.bestClipScore) {
                            accState.bestClipScore = mScore;
                            accState.bestClipBounds = [ml, mt, mr, mb];
                        }
                    }
                }
                if (sub.typename === "GroupItem") {
                    this._findCardFrameBoundsRecursive(sub, depth + 1, accState, maxRightBound);
                } else if (sub.geometricBounds) {
                    var sb = sub.geometricBounds;
                    var sl = Math.min(sb[0], sb[2]);
                    var sr = Math.max(sb[0], sb[2]);
                    var st = Math.max(sb[1], sb[3]);
                    var sbB = Math.min(sb[1], sb[3]);
                    var sw = sr - sl;
                    var sh = st - sbB;

                    if (hasRightLimit && sl >= maxRightBound - 1.5) {
                        continue;
                    }

                    if (sw > 0 && sh > 0 && (!hasRightLimit || sr <= maxRightBound + 1.5)) {
                        if (sl < accState.minL) accState.minL = sl;
                        if (st > accState.maxT) accState.maxT = st;
                        if (sr > accState.maxR) accState.maxR = sr;
                        if (sbB < accState.minB) accState.minB = sbB;
                        accState.hasNonText = true;
                    }

                    if (sw >= 130 && sw <= 280 && sh >= 65 && sh <= 160) {
                        var isVectorFrame = ((sub.typename === "PathItem" && sub.closed) || sub.typename === "CompoundPathItem");
                        var isImageFrame = (sub.typename === "RasterItem" || sub.typename === "PlacedItem");
                        if (isVectorFrame || isImageFrame) {
                            var insideQty = (!hasRightLimit || sr <= maxRightBound + 1.5);
                            var area = sw * sh;
                            var score = area + (isVectorFrame ? 100000 : 0) + (insideQty ? 1000000 : 0);
                            if (score > accState.bestScore) {
                                accState.bestScore = score;
                                accState.bestBounds = [sl, st, sr, sbB];
                            }
                        }
                    }
                }
            }
        }
        return null;
    },

    getAccurateCardBounds: function(item, customW, customH, maxRightBound) {
        if (!item) return { width: 192, height: 98, bounds: [0, 0, 192, -98] };

        var gb = item.geometricBounds;
        var w = Math.abs(gb[2] - gb[0]);
        var h = Math.abs(gb[1] - gb[3]);
        var b = [Math.min(gb[0], gb[2]), Math.max(gb[1], gb[3]), Math.max(gb[0], gb[2]), Math.min(gb[1], gb[3])];

        if (customW > 0 && customH > 0) {
            return {
                width: customW,
                height: customH,
                bounds: [b[0], b[1], b[0] + customW, b[1] - customH]
            };
        }

        if (item.typename === "GroupItem") {
            try {
                var accState = {
                    bestClipScore: -1,
                    bestClipBounds: null,
                    bestScore: -1,
                    bestBounds: null,
                    hasNonText: false,
                    minL: 1e9,
                    maxT: -1e9,
                    maxR: -1e9,
                    minB: 1e9
                };
                var topClip = this._findCardFrameBoundsRecursive(item, 0, accState, maxRightBound);
                var chosen = topClip || accState.bestClipBounds || accState.bestBounds;
                if (!chosen && accState.hasNonText) {
                    var uw = accState.maxR - accState.minL;
                    var uh = accState.maxT - accState.minB;
                    if (uw >= 100 && uh >= 50) {
                        chosen = [accState.minL, accState.maxT, accState.maxR, accState.minB];
                    }
                }
                if (chosen) {
                    var cw = Math.abs(chosen[2] - chosen[0]);
                    var ch = Math.abs(chosen[1] - chosen[3]);
                    return {
                        width: Math.round(cw),
                        height: Math.round(ch),
                        bounds: [chosen[0], chosen[1], chosen[2], chosen[3]]
                    };
                }
            } catch (e) {}
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
        var customCols = parseInt(payload.cols !== undefined ? payload.cols : payload.columns, 10) || 0;
        var gapX = parseFloat(payload.gapX) || 0;
        var gapY = parseFloat(payload.gapY) || 0;
        var fitArtboard = payload.fitArtboard !== false;

        var customW = parseFloat(payload.cardW !== undefined ? payload.cardW : payload.cardWidth) || 0;
        var customH = parseFloat(payload.cardH !== undefined ? payload.cardH : payload.cardHeight) || 0;

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

            var phoneMatch = line.match(/(\+?(?:88)?01[0-9\-]{8,15}|[\u09E6-\u09EF\-]{10,15})/);
            var phone = "";
            var rest = line;
            if (phoneMatch) {
                phone = phoneMatch[1].replace(/^\s+|\s+$/g, "");
                rest = (line.substring(0, phoneMatch.index) + line.substring(phoneMatch.index + phoneMatch[0].length)).replace(/^[\s,]+|[\s,]+$/g, "");
            }

            var pitaIdx = rest.indexOf("\u09AA\u09BF\u09A4\u09BE:");
            if (pitaIdx !== -1) {
                var afterPita = rest.substring(pitaIdx + 5).replace(/^\s+|\s+$/g, "");
                var parts = afterPita.split(",");
                if (parts.length >= 2) {
                    var pName = ("\u09AA\u09BF\u09A4\u09BE: " + parts[0]).replace(/^\s+|\s+$/g, "");
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
        var bn = {'0':'\u09E6','1':'\u09E7','2':'\u09E8','3':'\u09E9','4':'\u09EA','5':'\u09EB','6':'\u09EC','7':'\u09ED','8':'\u09EE','9':'\u09EF'};
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
        var payload = {};
        try {
            if (typeof jsonPayload === "string") {
                try {
                    payload = JSON.parse(jsonPayload);
                } catch(eJson) {
                    payload = eval('(' + jsonPayload + ')');
                }
            } else {
                payload = jsonPayload;
            }
        } catch (e) {
            return JSON.stringify({
                status: "error",
                message: "Failed to parse data: " + e.message
            });
        }

        if (payload.isKeyring === true) {
            return this.populateKeyringCards(payload);
        } else {
            return this.populateDiaryCards(payload);
        }
    },

    populateKeyringCards: function(payload) {
        var doc = this.getActiveDoc();
        if (!doc) {
            return JSON.stringify({
                status: "error",
                message: "No active Illustrator document found. Please open or create a document."
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
        var order = payload.order || "row";
        var makeBold = payload.makeBold !== false;
        var fillBani = payload.fillBani !== false;
        var fillQty = payload.fillQty !== false;
        var skipFilledCards = payload.skipFilledCards !== false;
        var startIndex = parseInt(payload.startIndex, 10) || 0;

        var baseDetailsHScale = parseFloat(payload.detailsHScale);
        if (isNaN(baseDetailsHScale) || baseDetailsHScale <= 0) baseDetailsHScale = 100;

        var nameHScale = parseFloat(payload.nameHScale);
        if (isNaN(nameHScale) || nameHScale <= 0) nameHScale = 100;

        var userNameLeading = parseFloat(payload.nameLeading);
        var hasCustomNameLeading = (!isNaN(userNameLeading) && userNameLeading > 0);

        var userDetailsLeading = parseFloat(payload.detailsLeading);
        var hasCustomDetailsLeading = (!isNaN(userDetailsLeading) && userDetailsLeading > 0);
        var autoFit = (typeof payload.autoFit === "undefined") ? true : (payload.autoFit === true || payload.autoFit === "true");
        var cardWidthMm = parseFloat(payload.cardWidthMm);
        var cardWidthPt = (!isNaN(cardWidthMm) && cardWidthMm > 10) ? (cardWidthMm * 72.0 / 25.4) : 0;
        var safeRightMarginMm = (payload.safeRightMarginMm !== undefined && payload.safeRightMarginMm !== null && payload.safeRightMarginMm !== "") ? parseFloat(payload.safeRightMarginMm) : 8.5;
        if (isNaN(safeRightMarginMm) || safeRightMarginMm < 0) safeRightMarginMm = 8.5;
        var safeRightMarginPt = safeRightMarginMm * 72.0 / 25.4;
        var safeWidthMm = parseFloat(payload.safeWidthMm || payload.safeWidth || payload.maxWidthMm || payload.maxWidth);
        var safeWidthPt = (!isNaN(safeWidthMm) && safeWidthMm > 0) ? (safeWidthMm * 72.0 / 25.4) : 0;
        var minHScale = parseFloat(payload.minHScale);
        if (isNaN(minHScale) || minHScale <= 0) minHScale = 35;

        var layoutGrid = payload.layoutGrid || "auto";
        var frameMode = payload.frameMode || "auto";
        var cards = this.detectCards(scope, order, { isKeyring: true, layoutGrid: layoutGrid, frameMode: frameMode });
        if (!cards.length) {
            return JSON.stringify({
                status: "error",
                message: "No keyring card templates detected. Make sure your cards are visible and unlocked."
            });
        }

        var targetCards = [];
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

        if (targetCards.length === 0) targetCards = cards;

        var activeEntries = entries.slice(startIndex);
        if (activeEntries.length === 0) {
            startIndex = 0;
            activeEntries = entries;
        }

        var isCMYK = (doc.documentColorSpace === DocumentColorSpace.CMYK);
        var solidBlackCMYK = new CMYKColor();
        solidBlackCMYK.cyan = 0; solidBlackCMYK.magenta = 0; solidBlackCMYK.yellow = 0; solidBlackCMYK.black = 100;

        var keepTemplateStyle = (payload.keepTemplateStyle !== false);
        var userChosenColor = null;
        if (!keepTemplateStyle) {
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
            } else if (payload.nameColor) {
                var rawHex = String(payload.nameColor).replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
                if (rawHex.length === 3 || rawHex.length === 6) {
                    userChosenColor = this.hexToColor(rawHex, isCMYK);
                }
            }
        }

        var bornomalaPair = this.getBornomalaFonts();
        var boldFont = bornomalaPair.bold;
        var regularFont = bornomalaPair.regular || boldFont;

        var filledCount = 0;
        var fillLimit = Math.min(targetCards.length, activeEntries.length);

        for (var i = 0; i < fillLimit; i++) {
            var card = targetCards[i];
            var entry = activeEntries[i];

            // Clean/Purge any ghost text frames inside the card group
            if (card.group && card.group.pageItems) {
                try {
                    for (var kgpi = card.group.pageItems.length - 1; kgpi >= 0; kgpi--) {
                        var kgItem = card.group.pageItems[kgpi];
                        if (kgItem && kgItem.typename === "TextFrame" && !this.isItemHidden(kgItem)) {
                            if (kgItem !== card.nameFrame && kgItem !== card.detailsFrame && 
                                kgItem !== card.serialFrame && kgItem !== card.formFrame && 
                                kgItem !== card.baniFrame && kgItem !== card.badgeFrame && kgItem !== card.qtyFrame) {
                                var kgTxt = kgItem.contents;
                                if (this.hasStudentBiodata(kgTxt) || /(?:\u09AA\u09BF\u09A4\u09BE|\u09AE\u09BE\u09A4\u09BE|\u0997\u09CD\u09B0\u09BE\u09AE|\u09A1\u09BE\u0995|\u0989\u09AA\u099C\u09C7\u09B2\u09BE|\u099C\u09C7\u09B2\u09BE|\u09AE\u09CB\u09AC\u09BE\u0987\u09B2|\u09AB\u09CB\u09A8|\u09B0\u0995\u09CD\u09A4|01[3-9]\d{8}|\u09E6\u09E7[\u09E9-\u09EF][\u09E6-\u09EF]{8})/i.test(kgTxt)) {
                                    try {
                                        kgItem.contents = "";
                                        kgItem.remove();
                                    } catch(kgre) {
                                        try { kgItem.contents = ""; } catch(kge2) {}
                                    }
                                }
                            }
                        }
                    }
                } catch(kgrpErr) {}
            }

            // 1. POPULATE PERSON INFO (Name on line 1, Father/Address/Mobile on lines 2..4 next to icons)
            if (card.nameFrame && entry.name) {
                var cleanName = (entry.name || "").replace(/^\s+|\s+$/g, "");
                var cleanDetails = (entry.details || "").replace(/^\s+|\s+$/g, "");
                cleanDetails = cleanDetails.replace(/\r\n|\n|[\u0003\u000B\u2028\u2029]/g, "\r");

                var origNameFont = boldFont;
                var origNameSize = 11.0;
                var origNameLeading = 11.0;
                var origNameColor = userChosenColor || solidBlackCMYK;
                var origNameHScale = nameHScale;
                var origNameTracking = 0;
                var origNameJust = null;

                var origDetFont = regularFont;
                var origDetSize = 6.0;
                var origDetLeading = 6.73;
                var detailsHScale = baseDetailsHScale;
                var origDetColor = solidBlackCMYK;
                var origDetTracking = 0;
                var origDetJust = null;
                var origTfGB = null;
                try { origTfGB = card.nameFrame.geometricBounds; } catch(gbe) {}

                try {
                    if (card.nameFrame.paragraphs.length > 0) {
                        var p0 = card.nameFrame.paragraphs[0];
                        if (p0.characters.length > 0) {
                            var nca = p0.characters[0].characterAttributes;
                            if (nca.textFont) origNameFont = nca.textFont;
                            if (nca.size > 0) origNameSize = nca.size;
                            if (nca.leading > 0) origNameLeading = nca.leading;
                            if (keepTemplateStyle && nca.horizontalScale > 0) origNameHScale = nca.horizontalScale;
                            if (autoFit && origNameHScale < nameHScale && nameHScale >= 99) origNameHScale = nameHScale;
                            origNameTracking = nca.tracking;
                            if (nca.fillColor && nca.fillColor.typename !== "NoColor") {
                                origNameColor = nca.fillColor;
                            }
                        }
                        origNameJust = p0.paragraphAttributes.justification;
                    }

                    if (card.nameFrame.paragraphs.length > 1) {
                        var p1 = card.nameFrame.paragraphs[1];
                        if (p1.characters.length > 0) {
                            var dca = p1.characters[0].characterAttributes;
                            if (dca.textFont) origDetFont = dca.textFont;
                            if (dca.size > 0) origDetSize = dca.size;
                            if (dca.leading > 0) origDetLeading = dca.leading;
                            if (dca.horizontalScale > 0 && keepTemplateStyle) detailsHScale = dca.horizontalScale;
                            origDetTracking = dca.tracking;
                            if (dca.fillColor && dca.fillColor.typename !== "NoColor") {
                                origDetColor = dca.fillColor;
                            }
                        }
                        if (keepTemplateStyle && autoFit) {
                            var maxDetScale = detailsHScale;
                            for (var dpIdx = 1; dpIdx < card.nameFrame.paragraphs.length; dpIdx++) {
                                var dpIt = card.nameFrame.paragraphs[dpIdx];
                                if (dpIt && dpIt.characters && dpIt.characters.length > 0) {
                                    var dpScale = dpIt.characters[0].characterAttributes.horizontalScale;
                                    if (dpScale > maxDetScale) maxDetScale = dpScale;
                                }
                            }
                            detailsHScale = (maxDetScale < baseDetailsHScale && baseDetailsHScale >= 99) ? baseDetailsHScale : maxDetScale;
                        }
                    } else if (card.detailsFrame && card.detailsFrame !== card.nameFrame && card.detailsFrame !== card.baniFrame) {
                        if (card.detailsFrame.characters.length > 0) {
                            var ddca = card.detailsFrame.characters[0].characterAttributes;
                            if (ddca.textFont) origDetFont = ddca.textFont;
                            if (ddca.size > 0) origDetSize = ddca.size;
                            if (ddca.leading > 0) origDetLeading = ddca.leading;
                            if (ddca.horizontalScale > 0 && keepTemplateStyle) detailsHScale = ddca.horizontalScale;
                            if (autoFit && detailsHScale < baseDetailsHScale && baseDetailsHScale >= 99) detailsHScale = baseDetailsHScale;
                            origDetTracking = ddca.tracking;
                            if (ddca.fillColor && ddca.fillColor.typename !== "NoColor") {
                                origDetColor = ddca.fillColor;
                            }
                        }
                    }
                } catch(ne) {}

                if (!keepTemplateStyle && userChosenColor) origNameColor = userChosenColor;
                if (!keepTemplateStyle && hasCustomNameLeading) origNameLeading = userNameLeading;
                if (!keepTemplateStyle && hasCustomDetailsLeading) origDetLeading = userDetailsLeading;

                var targetMaxPt = autoFit ? this._computeKeyringSafeWidthPt(card, card.nameFrame, origTfGB, origNameJust, safeRightMarginPt, safeWidthPt, cardWidthPt) : 0;

                // In Keyrings, Name and Details (Father, Address, Mobile) are ALWAYS combined into the single biodata text frame
                var isSeparateDetFrame = false;

                if (!isSeparateDetFrame) {
                    // Single combined frame: Name (line 1) + Father (line 2) + Village (line 3) + Phone (line 4)
                    var fullInfo = cleanDetails ? (cleanName + "\r" + cleanDetails) : cleanName;
                    card.nameFrame.contents = fullInfo;

                    // 1. Apply base details styling to entire frame
                    try {
                        var nTr = card.nameFrame.textRange;
                        if (origDetFont) nTr.characterAttributes.textFont = origDetFont;
                        nTr.characterAttributes.size = origDetSize;
                        nTr.characterAttributes.leading = origDetLeading;
                        nTr.characterAttributes.horizontalScale = detailsHScale;
                        nTr.characterAttributes.tracking = origDetTracking;
                        nTr.characterAttributes.fillColor = origDetColor;
                        if (origDetJust !== null) nTr.paragraphAttributes.justification = origDetJust;
                        nTr.paragraphAttributes.spaceBefore = 0;
                        nTr.paragraphAttributes.spaceAfter = 0;
                    } catch(bStyErr) {}

                    // 2. Apply Name styling to Paragraph 0
                    try {
                        if (card.nameFrame.paragraphs.length > 0) {
                            var p0 = card.nameFrame.paragraphs[0];
                            if (origNameFont) p0.characterAttributes.textFont = origNameFont;
                            if (makeBold && !keepTemplateStyle) this.applyBoldFont(p0);
                            else if (!makeBold) this.applyRegularFont(p0);
                            p0.characterAttributes.size = origNameSize;
                            p0.characterAttributes.leading = origNameLeading;
                            p0.characterAttributes.horizontalScale = origNameHScale;
                            p0.characterAttributes.tracking = origNameTracking;
                            p0.characterAttributes.fillColor = origNameColor;
                            if (origNameJust !== null) p0.paragraphAttributes.justification = origNameJust;
                        }
                    } catch(p0Err) {}

                    // 3. Ensure subsequent paragraphs keep details styling
                    try {
                        for (var p = 1; p < card.nameFrame.paragraphs.length; p++) {
                            var pIt = card.nameFrame.paragraphs[p];
                            if (origDetFont) pIt.characterAttributes.textFont = origDetFont;
                            pIt.characterAttributes.size = origDetSize;
                            pIt.characterAttributes.leading = origDetLeading;
                            pIt.characterAttributes.horizontalScale = detailsHScale;
                            pIt.characterAttributes.tracking = origDetTracking;
                            pIt.characterAttributes.fillColor = origDetColor;
                            if (origDetJust !== null) pIt.paragraphAttributes.justification = origDetJust;
                        }
                    } catch(pDetErr) {}

                    if (autoFit && targetMaxPt > 0) {
                        this.fitTextFrameToWidth(card.nameFrame, targetMaxPt, detailsHScale, minHScale, origNameSize);
                    }
                } else {
                    // Separate Name frame and Details frame
                    card.nameFrame.contents = cleanName;
                    try {
                        var nTr = card.nameFrame.textRange;
                        if (origNameFont) nTr.characterAttributes.textFont = origNameFont;
                        nTr.characterAttributes.size = origNameSize;
                        nTr.characterAttributes.leading = origNameLeading;
                        nTr.characterAttributes.horizontalScale = nameHScale;
                        nTr.characterAttributes.tracking = origNameTracking;
                        nTr.characterAttributes.fillColor = origNameColor;
                        if (origNameJust !== null) nTr.paragraphAttributes.justification = origNameJust;
                    } catch(nStyErr) {}

                    card.detailsFrame.contents = cleanDetails;
                    try {
                        var dTr = card.detailsFrame.textRange;
                        if (origDetFont) dTr.characterAttributes.textFont = origDetFont;
                        dTr.characterAttributes.size = origDetSize;
                        dTr.characterAttributes.leading = origDetLeading;
                        dTr.characterAttributes.horizontalScale = detailsHScale;
                        dTr.characterAttributes.tracking = origDetTracking;
                        dTr.characterAttributes.fillColor = origDetColor;
                        if (origDetJust !== null) dTr.paragraphAttributes.justification = origDetJust;
                    } catch(dStyErr) {}
                }
            }

            // 3. POPULATE QTY FRAME (Right side quantity)
            if (fillQty && card.qtyFrame && entry.qty) {
                var origQtyFont = boldFont;
                var origQtySize = 22.0;
                var origQtyLeading = 22.0;
                var origQtyColor = solidBlackCMYK;
                var origQtyHScale = 100.0;
                var origQtyTracking = 0;
                var origQtyJust = null;

                try {
                    if (card.qtyFrame.characters.length > 0) {
                        var qca = card.qtyFrame.characters[0].characterAttributes;
                        if (qca.textFont) origQtyFont = qca.textFont;
                        if (qca.size > 0) origQtySize = qca.size;
                        if (qca.leading > 0) origQtyLeading = qca.leading;
                        if (qca.horizontalScale > 0) origQtyHScale = qca.horizontalScale;
                        origQtyTracking = qca.tracking;
                        if (qca.fillColor && qca.fillColor.typename !== "NoColor") {
                            origQtyColor = qca.fillColor;
                        }
                    }
                    if (card.qtyFrame.paragraphs.length > 0) {
                        origQtyJust = card.qtyFrame.paragraphs[0].paragraphAttributes.justification;
                    }
                } catch(qe) {}

                var qRaw = String(entry.qty).replace(/^\s+|\s+$/g, '');
                var isAnsiFont = (origQtyFont && /bornomala|sutonny/i.test(origQtyFont.name));
                var qDigits = qRaw.replace(/[^\d\u09E6-\u09EF]/g, '');
                var qFinal = qDigits;
                if (qDigits) {
                    if (isAnsiFont) {
                        var bnToAscii = {'\u09E6':'0','\u09E7':'1','\u09E8':'2','\u09E9':'3','\u09EA':'4','\u09EB':'5','\u09EC':'6','\u09ED':'7','\u09EE':'8','\u09EF':'9'};
                        qFinal = qDigits.replace(/[\u09E6-\u09EF]/g, function(d) { return bnToAscii[d] || d; });
                    } else {
                        qFinal = this.toBengaliDigits(qDigits);
                    }
                }

                card.qtyFrame.contents = qFinal;
                try {
                    var qTr = card.qtyFrame.textRange;
                    if (origQtyFont) qTr.characterAttributes.textFont = origQtyFont;
                    qTr.characterAttributes.size = origQtySize;
                    qTr.characterAttributes.leading = origQtyLeading;
                    qTr.characterAttributes.horizontalScale = origQtyHScale;
                    qTr.characterAttributes.tracking = origQtyTracking;
                    qTr.characterAttributes.fillColor = origQtyColor;
                    if (origQtyJust !== null) qTr.paragraphAttributes.justification = origQtyJust;
                    qTr.paragraphAttributes.spaceBefore = 0;
                    qTr.paragraphAttributes.spaceAfter = 0;
                } catch(qStyErr) {}
            }

            // 4. POPULATE BANI FRAME (if present)
            if (fillBani && entry.bani && entry.bani.replace(/\s+/g, '').length > 0) {
                var targetBaniFrame = card.baniFrame;
                if (!targetBaniFrame && card.group && card.group.pageItems) {
                    for (var bgi = 0; bgi < card.group.pageItems.length; bgi++) {
                        var bgIt = card.group.pageItems[bgi];
                        if (bgIt && bgIt.typename === "TextFrame" && !this.isItemHidden(bgIt)) {
                            if (bgIt !== card.nameFrame && bgIt !== card.qtyFrame && bgIt !== card.badgeFrame && bgIt !== card.serialFrame) {
                                targetBaniFrame = bgIt;
                                card.baniFrame = bgIt;
                                break;
                            }
                        }
                    }
                }

                if (targetBaniFrame) {
                    var origBaniFont = null;
                    var origBaniSize = null;
                    var origBaniLeading = null;
                    var origBaniColor = null;
                    var origBaniHScale = 100.0;

                    try {
                        if (targetBaniFrame.characters.length > 0) {
                            var bca = targetBaniFrame.characters[0].characterAttributes;
                            origBaniFont = bca.textFont;
                            origBaniSize = bca.size;
                            origBaniLeading = bca.leading;
                            origBaniColor = bca.fillColor;
                            if (bca.horizontalScale > 0) origBaniHScale = bca.horizontalScale;
                            if (autoFit && origBaniHScale < 95) origBaniHScale = 100.0;
                        }
                    } catch(be) {}

                    var cleanBani = entry.bani.split('\r\n').join('\r').split('\n').join('\r');
                    cleanBani = cleanBani.replace(/^(?:\u09AC\u09BE\u09A3\u09C0|\u09AC\u09BE\u09A8\u09C0|Bani)\s*[:\-]\s*/i, '');
                    targetBaniFrame.contents = cleanBani;
                    try {
                        var bTr = targetBaniFrame.textRange;
                        if (origBaniFont) bTr.characterAttributes.textFont = origBaniFont;
                        if (origBaniSize) bTr.characterAttributes.size = origBaniSize;
                        if (origBaniLeading) bTr.characterAttributes.leading = origBaniLeading;
                        if (origBaniColor) bTr.characterAttributes.fillColor = origBaniColor;
                        bTr.characterAttributes.horizontalScale = origBaniHScale;
                    } catch(bStyErr) {}
                    if (autoFit) {
                        var bQtyLeft = (card.qtyFrame && card.qtyFrame.geometricBounds) ? Math.min(card.qtyFrame.geometricBounds[0], card.qtyFrame.geometricBounds[2]) : null;
                        var accBaniCard = this.getAccurateCardBounds(card.group || targetBaniFrame, 0, 0, bQtyLeft);
                        var baniCardW = (accBaniCard && accBaniCard.width > 50) ? accBaniCard.width : (cardWidthPt > 40 ? cardWidthPt : (61.9 * 72.0 / 25.4));
                        if (cardWidthPt > 40 && baniCardW > cardWidthPt + 0.5) baniCardW = cardWidthPt;
                        var baniSafePt = Math.max(30.0, baniCardW - 14.0);
                        this.fitTextFrameToWidth(targetBaniFrame, baniSafePt, origBaniHScale, minHScale, origBaniSize || 8.0);
                    }
                }
            }

            filledCount++;
        }

        try { app.redraw(); } catch(e) {}

        return JSON.stringify({
            status: "success",
            filledCount: filledCount,
            totalCards: targetCards.length,
            totalEntries: entries.length,
            nextStartIndex: startIndex + filledCount,
            message: "Successfully populated " + filledCount + " keyring cards."
        });
    },

    populateDiaryCards: function(payload) {
        var doc = this.getActiveDoc();
        if (!doc) {
            return JSON.stringify({
                status: "error",
                message: "No active Illustrator document found. Please open or create a document."
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

        var userNameSize = parseFloat(payload.nameSize);
        var hasCustomNameSize = (!isNaN(userNameSize) && userNameSize > 0);

        var userDetailsSize = parseFloat(payload.detailsSize);
        var hasCustomDetailsSize = (!isNaN(userDetailsSize) && userDetailsSize > 0);

        var userDetailsLeading = parseFloat(payload.detailsLeading);
        var hasCustomDetailsLeading = (!isNaN(userDetailsLeading) && userDetailsLeading > 0);

        var userNameLeading = parseFloat(payload.nameLeading);
        var hasCustomNameLeading = (!isNaN(userNameLeading) && userNameLeading > 0);

        var autoFit = (payload.autoFit !== false && payload.autoFit !== "false");
        var safeWidthMm = parseFloat(payload.safeWidthMm || payload.safeWidth || payload.maxWidthMm || payload.maxWidth);
        var safeWidthPt = 0;
        if (!isNaN(safeWidthMm) && safeWidthMm > 0) {
            safeWidthPt = safeWidthMm * 72.0 / 25.4;
        }
        var minHScale = parseFloat(payload.minHScale);
        if (isNaN(minHScale) || minHScale <= 0) minHScale = 55;

        var layoutGrid = payload.layoutGrid || "auto";
        var frameMode = payload.frameMode || "auto";
        var cards = this.detectCards(scope, order, { isKeyring: false, layoutGrid: layoutGrid, frameMode: frameMode });
        if (!cards.length) {
            return JSON.stringify({
                status: "error",
                message: "No card templates detected. Make sure your cards are visible and unlocked."
            });
        }

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
                        if (f0 && !/akhand/i.test(f0.name) && (!docBoldFont || f0.name.indexOf("Bold") !== -1)) docBoldFont = f0;
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
                            if (f1 && !/akhand/i.test(f1.name) && (!docRegularFont || f1.name.indexOf("Bold") === -1)) docRegularFont = f1;
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

        // Master template styles - automatically inherits exact template size, leading, font, tracking & colors
        var masterTplName = { size: 0, leading: 0, tracking: 0, hScale: 100.0, font: globalBoldFont, color: null, just: null };
        var masterTplDetails = { size: 0, leading: 0, tracking: 0, hScale: 100.0, font: globalRegularFont, color: null, just: null };
        var masterTplSerial = { size: 0, leading: 0, tracking: 0, hScale: 100.0, font: globalBoldFont, color: null, just: null };
        var masterTplForm = { size: 0, leading: 0, tracking: -50, hScale: 98.6, font: globalRegularFont, color: null, just: null };

        for (var tci = 0; tci < targetCards.length; tci++) {
            var sampleCard = targetCards[tci];
            try {
                if (sampleCard.nameFrame && sampleCard.nameFrame.paragraphs && sampleCard.nameFrame.paragraphs.length > 0) {
                    var sp0 = sampleCard.nameFrame.paragraphs[0];
                    if (sp0 && sp0.characters.length > 0) {
                        var sca0 = sp0.characters[0].characterAttributes;
                        if (sca0.size > 0 && masterTplName.size === 0) masterTplName.size = sca0.size;
                        if (sca0.leading > 0 && masterTplName.leading === 0) masterTplName.leading = sca0.leading;
                        if (sca0.horizontalScale > 0) masterTplName.hScale = sca0.horizontalScale;
                        if (sca0.textFont && !masterTplName.font) masterTplName.font = sca0.textFont;
                        if (sca0.fillColor && sca0.fillColor.typename !== "NoColor" && !masterTplName.color) masterTplName.color = sca0.fillColor;
                        if (masterTplName.just === null) { try { masterTplName.just = sp0.paragraphAttributes.justification; } catch(j0e) {} }
                    }

                    if (sampleCard.nameFrame.paragraphs.length > 1) {
                        var sp1 = sampleCard.nameFrame.paragraphs[1];
                        if (sp1 && sp1.characters.length > 0) {
                            var sca1 = sp1.characters[0].characterAttributes;
                            if (sca1.size > 0 && masterTplDetails.size === 0) masterTplDetails.size = sca1.size;
                            if (sca1.leading > 0 && masterTplDetails.leading === 0) masterTplDetails.leading = sca1.leading;
                            if (sca1.horizontalScale > 0) masterTplDetails.hScale = sca1.horizontalScale;
                            if (sca1.textFont && !masterTplDetails.font) masterTplDetails.font = sca1.textFont;
                            if (sca1.fillColor && sca1.fillColor.typename !== "NoColor" && !masterTplDetails.color) masterTplDetails.color = sca1.fillColor;
                            if (masterTplDetails.just === null) { try { masterTplDetails.just = sp1.paragraphAttributes.justification; } catch(j1e) {} }
                        }
                    }
                }
                if (sampleCard.detailsFrame && sampleCard.detailsFrame.paragraphs && sampleCard.detailsFrame.paragraphs.length > 0) {
                    var sdp0 = sampleCard.detailsFrame.paragraphs[0];
                    if (sdp0 && sdp0.characters.length > 0) {
                        var sdca0 = sdp0.characters[0].characterAttributes;
                        if (sdca0.size > 0 && masterTplDetails.size === 0) masterTplDetails.size = sdca0.size;
                        if (sdca0.leading > 0 && masterTplDetails.leading === 0) masterTplDetails.leading = sdca0.leading;
                        if (sdca0.horizontalScale > 0) masterTplDetails.hScale = sdca0.horizontalScale;
                        if (sdca0.textFont && !masterTplDetails.font) masterTplDetails.font = sdca0.textFont;
                        if (sdca0.fillColor && sdca0.fillColor.typename !== "NoColor" && !masterTplDetails.color) masterTplDetails.color = sdca0.fillColor;
                        if (masterTplDetails.just === null) { try { masterTplDetails.just = sdp0.paragraphAttributes.justification; } catch(dj1e) {} }
                    }
                }
                if (sampleCard.serialFrame && sampleCard.serialFrame.textRange) {
                    var ssTr = sampleCard.serialFrame.textRange;
                    if (ssTr.characterAttributes.size > 0 && masterTplSerial.size === 0) masterTplSerial.size = ssTr.characterAttributes.size;
                    if (ssTr.characterAttributes.leading > 0 && masterTplSerial.leading === 0) masterTplSerial.leading = ssTr.characterAttributes.leading;
                    if (ssTr.characterAttributes.horizontalScale > 0) masterTplSerial.hScale = ssTr.characterAttributes.horizontalScale;
                    if (ssTr.characterAttributes.textFont && !masterTplSerial.font) masterTplSerial.font = ssTr.characterAttributes.textFont;
                    if (ssTr.characterAttributes.fillColor && ssTr.characterAttributes.fillColor.typename !== "NoColor" && !masterTplSerial.color) masterTplSerial.color = ssTr.characterAttributes.fillColor;
                }
                if (sampleCard.formFrame && sampleCard.formFrame.textRange) {
                    var sfTr = sampleCard.formFrame.textRange;
                    if (sfTr.characterAttributes.size > 0 && masterTplForm.size === 0) masterTplForm.size = sfTr.characterAttributes.size;
                    if (sfTr.characterAttributes.leading > 0 && masterTplForm.leading === 0) masterTplForm.leading = sfTr.characterAttributes.leading;
                    if (sfTr.characterAttributes.horizontalScale > 0) masterTplForm.hScale = sfTr.characterAttributes.horizontalScale;
                    if (sfTr.characterAttributes.textFont && !masterTplForm.font) masterTplForm.font = sfTr.characterAttributes.textFont;
                }
            } catch(e) {}
        }

        // Fallbacks only if template frames were completely empty
        if (masterTplName.size === 0) masterTplName.size = 13.0;
        if (masterTplName.leading === 0) masterTplName.leading = masterTplName.size * 1.1;
        if (masterTplDetails.size === 0) masterTplDetails.size = 10.0;
        if (masterTplDetails.leading === 0) masterTplDetails.leading = masterTplDetails.size * 1.15;
        if (masterTplSerial.size === 0) masterTplSerial.size = 8.5;
        if (masterTplSerial.leading === 0) masterTplSerial.leading = 8.5;
        if (masterTplForm.size === 0) masterTplForm.size = 5.3;
        if (masterTplForm.leading === 0) masterTplForm.leading = 5.6;

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

            var isCardNameWhite = false;
            var cardHasDetailsFrame = (card.detailsFrame !== null && card.detailsFrame !== undefined);

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
                        if (ca0.fillColor && ca0.fillColor.typename !== "NoColor") {
                            cardNameStyle.color = ca0.fillColor;
                            var caFc = ca0.fillColor;
                            if (caFc.typename === "CMYKColor" && caFc.cyan === 0 && caFc.magenta === 0 && caFc.yellow === 0 && caFc.black === 0) {
                                isCardNameWhite = true;
                            } else if (caFc.typename === "RGBColor" && caFc.red === 255 && caFc.green === 255 && caFc.blue === 255) {
                                isCardNameWhite = true;
                            } else if (caFc.typename === "GrayColor" && caFc.gray === 0) {
                                isCardNameWhite = true;
                            }
                        }
                        try { cardNameStyle.just = p0.paragraphAttributes.justification; } catch(j0) {}
                    }

                    if (card.nameFrame.paragraphs.length > 1 && !cardHasDetailsFrame) {
                        var p1 = card.nameFrame.paragraphs[1];
                        if (p1 && p1.characters.length > 0) {
                            var ca1 = p1.characters[0].characterAttributes;
                            if (ca1.textFont) cardDetStyle.font = ca1.textFont;
                            if (ca1.size > 0) cardDetStyle.size = ca1.size;
                            else if (masterTplDetails.size > 0) cardDetStyle.size = masterTplDetails.size;
                            if (ca1.leading > 0) cardDetStyle.leading = ca1.leading;
                            else if (masterTplDetails.leading > 0) cardDetStyle.leading = masterTplDetails.leading;
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

            // User overrides & intelligent color preservation
            if (isSingleColor) {
                cardNameStyle.color = solidBlackCMYK;
            } else if (isCardNameWhite && cardHasDetailsFrame) {
                // If template name is white in a multi-frame card, preserve white header
                cardNameStyle.color = solidWhiteCMYK;
            } else if (userChosenColor) {
                cardNameStyle.color = userChosenColor;
            }

            if (hasCustomNameSize) cardNameStyle.size = userNameSize;
            if (hasCustomDetailsSize) cardDetStyle.size = userDetailsSize;
            if (hasCustomNameLeading) cardNameStyle.leading = userNameLeading;
            if (hasCustomDetailsLeading) cardDetStyle.leading = userDetailsLeading;
            if (payload.nameHScale !== undefined && !isNaN(nameHScale) && nameHScale > 0) cardNameStyle.hScale = nameHScale;
            if (payload.detailsHScale !== undefined && !isNaN(detailsHScale) && detailsHScale > 0) cardDetStyle.hScale = detailsHScale;

            // --- STEP 2: POPULATE SERIAL / KROMIK (Only when serial is requested, NEVER for Keyrings) ---
            var shouldFillSerial = (!payload.isKeyring && payload.fillSerial !== false);
            if (shouldFillSerial && card.serialFrame && entry.serial) {
                try {
                    var sVal = entry.serial;
                    var sFont = cardSerialStyle.font || cardNameStyle.font;
                    var isAnsiFont = (sFont && /sutonny|bornomala/i.test(sFont.name));
                    if (isAnsiFont && /sutonny/i.test(sFont.name)) {
                        var bnToAscii = {"\u09E6":"0","\u09E7":"1","\u09E8":"2","\u09E9":"3","\u09EA":"4","\u09EB":"5","\u09EC":"6","\u09ED":"7","\u09EE":"8","\u09EF":"9"};
                        sVal = String(sVal).replace(/[\u09E6-\u09EF]/g, function(d) { return bnToAscii[d] || d; });
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

            // --- STEP 3: POPULATE FORM NUMBER ---
            var formHandled = false;
            var shouldFillForm = (payload.fillForm !== false && payload.fillFormNumber !== false);
            if (card.formFrame && shouldFillForm && (entry.formNumber || entry.form)) {
                try {
                    var rawForm = (entry.formNumber || entry.form || "").replace(/^\s+|\s+$/g, "");
                    var mDigits = rawForm.match(/([\u09E6-\u09EF0-9]+)/);
                    var formDigits = "";
                    if (mDigits) {
                        formDigits = this.toBengaliDigits(mDigits[1]);
                    } else {
                        var cleanDigits = rawForm.replace(/^[^:\d]+[:\-\s]*/, "").replace(/^\s+|\s+$/g, "");
                        formDigits = this.toBengaliDigits(cleanDigits);
                    }

                    if (formDigits) {
                        var existingFormTxt = card.formFrame.contents.replace(/^\s+|\s+$/g, "");

                        // Preserve existing template formatting (vertical rotation, paragraph sizes, leading)
                        if (card.formFrame.paragraphs && card.formFrame.paragraphs.length >= 2) {
                            try {
                                card.formFrame.paragraphs[1].contents = formDigits;
                                formHandled = true;
                            } catch(p1e) {
                                var p0Txt = card.formFrame.paragraphs[0].contents.replace(/[\r\n]+/g, '');
                                card.formFrame.contents = p0Txt + "\r" + formDigits;
                                formHandled = true;
                            }
                        } else if (/([\u09E6-\u09EF0-9]+)/.test(existingFormTxt)) {
                            card.formFrame.contents = existingFormTxt.replace(/[\u09E6-\u09EF0-9]+$/, formDigits);
                            formHandled = true;
                        } else {
                            var formLabel = /(?:\u09A6\u09BE\u0996\u09C7\u09B2\u09BE|\u09A1\u09BE\u0995\u09CB|\u2021`v\u2021Ljv)/i.test(existingFormTxt) ? "\u09A6\u09BE\u0996\u09C7\u09B2\u09BE" : "\u09AB\u09B0\u09AE";
                            card.formFrame.contents = formLabel + "\r" + formDigits;
                            formHandled = true;
                        }

                        try {
                            card.formFrame.zOrder(ZOrderMethod.BRINGTOFRONT);
                        } catch(zoe) {}
                    }
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
                        if (/(?:\u09AB\u09B0\u09AE|\u09A6\u09BE\u0996\u09C7\u09B2\u09BE|\u09B0\u09CB\u09B2|Form|Roll|\u2021\u00B6\u00B4|\u2021dvi|diBk|\u2021ivj)/i.test(rlText)) {
                            continue;
                        }
                        nonFormLines.push(rlText);
                    }
                    cleanDetails = nonFormLines.join("\r");

                    // Clean/Purge any ghost text frames inside the card group that overlap or remain underneath
                    if (card.group && card.group.pageItems) {
                        try {
                            for (var dgpi = card.group.pageItems.length - 1; dgpi >= 0; dgpi--) {
                                var dgItem = card.group.pageItems[dgpi];
                                if (dgItem && dgItem.typename === "TextFrame" && !this.isItemHidden(dgItem)) {
                                    if (dgItem !== card.nameFrame && dgItem !== card.detailsFrame && 
                                        dgItem !== card.serialFrame && dgItem !== card.formFrame && 
                                        dgItem !== card.baniFrame && dgItem !== card.badgeFrame && dgItem !== card.qtyFrame) {
                                        var dgTxt = dgItem.contents;
                                        if (this.hasStudentBiodata(dgTxt) || /(?:\u09AA\u09BF\u09A4\u09BE|\u09AE\u09BE\u09A4\u09BE|\u0997\u09CD\u09B0\u09BE\u09AE|\u09A1\u09BE\u0995|\u0989\u09AA\u099C\u09C7\u09B2\u09BE|\u099C\u09C7\u09B2\u09BE|\u09AE\u09CB\u09AC\u09BE\u0987\u09B2|\u09AB\u09CB\u09A8|\u09B0\u0995\u09CD\u09A4|01[3-9]\d{8}|\u09E6\u09E7[\u09E9-\u09EF][\u09E6-\u09EF]{8})/i.test(dgTxt)) {
                                            try {
                                                dgItem.contents = "";
                                                dgItem.remove();
                                            } catch(dgre) {
                                                try { dgItem.contents = ""; } catch(dge2) {}
                                            }
                                        }
                                    }
                                }
                            }
                        } catch(dgrpErr) {}
                    }

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
                        if (autoFit) {
                            var effectiveMaxPt = safeWidthPt;
                            if (card.serialFrame) {
                                var nGB = card.nameFrame.geometricBounds;
                                var sGB = card.serialFrame.geometricBounds;
                                if (sGB[0] > nGB[0] && Math.abs(sGB[1] - nGB[1]) < 35) {
                                    var badgeAvailPt = (sGB[0] - nGB[0]) - 8;
                                    if (badgeAvailPt > 20 && (effectiveMaxPt <= 0 || badgeAvailPt < effectiveMaxPt)) {
                                        effectiveMaxPt = badgeAvailPt;
                                    }
                                }
                            }
                            if (effectiveMaxPt > 0) {
                                this.fitTextFrameToWidth(card.nameFrame, effectiveMaxPt, cardNameStyle.hScale, minHScale, cardNameStyle.size);
                            }
                        }

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
                            if (autoFit && effectiveMaxPt > 0) {
                                this.fitTextFrameToWidth(card.detailsFrame, effectiveMaxPt, cardDetStyle.hScale, minHScale, cardDetStyle.size);
                            }
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
                                var nbFont = this.getFamilyFonts(cardNameStyle.font || globalBoldFont).bold || globalBoldFont;
                                if (nbFont) p0.characterAttributes.textFont = nbFont;
                                if (cardNameStyle.size > 0) p0.characterAttributes.size = cardNameStyle.size;
                                if (cardNameStyle.leading > 0) p0.characterAttributes.leading = cardNameStyle.leading;
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
                                var ndFont = this.getFamilyFonts(cardDetStyle.font || globalRegularFont).regular || globalRegularFont;
                                if (ndFont) pIt.characterAttributes.textFont = ndFont;
                                if (cardDetStyle.size > 0) pIt.characterAttributes.size = cardDetStyle.size;
                                if (cardDetStyle.leading > 0) pIt.characterAttributes.leading = cardDetStyle.leading;
                                pIt.characterAttributes.horizontalScale = cardDetStyle.hScale;
                                pIt.characterAttributes.tracking = cardDetStyle.tracking;
                                pIt.characterAttributes.fillColor = cardDetStyle.color;
                                if (cardDetStyle.just !== null) pIt.paragraphAttributes.justification = cardDetStyle.just;
                            }
                        } catch(pAddErr) {}

                        if (autoFit && card.nameFrame.paragraphs.length > 0) {
                            var effectiveMaxPt = safeWidthPt;
                            if (card.serialFrame) {
                                var nGB = card.nameFrame.geometricBounds;
                                var sGB = card.serialFrame.geometricBounds;
                                if (sGB[0] > nGB[0] && Math.abs(sGB[1] - nGB[1]) < 35) {
                                    var badgeAvailPt = (sGB[0] - nGB[0]) - 8;
                                    if (badgeAvailPt > 20 && (effectiveMaxPt <= 0 || badgeAvailPt < effectiveMaxPt)) {
                                        effectiveMaxPt = badgeAvailPt;
                                    }
                                }
                            }
                            if (effectiveMaxPt > 0) {
                                this.fitTextFrameToWidth(card.nameFrame.paragraphs[0], effectiveMaxPt, cardNameStyle.hScale, minHScale, cardNameStyle.size);
                            }
                        }
                    }
                }
            } catch(nErr) {}

            // --- STEP 4B: POPULATE BANI (Only if bani is provided and fillBani enabled) ---
            try {
                if (payload.fillBani !== false && card.baniFrame && entry.bani && entry.bani.replace(/\s+/g, '').length > 0) {
                    var origBaniFont = null;
                    var origBaniSize = null;
                    var origBaniLeading = null;
                    var origBaniColor = null;
                    try {
                        var btr = card.baniFrame.textRange;
                        origBaniFont = btr.characterAttributes.textFont;
                        origBaniSize = btr.characterAttributes.size;
                        origBaniLeading = btr.characterAttributes.leading;
                        origBaniColor = btr.characterAttributes.fillColor;
                    } catch(be) {}

                    var cleanBani = entry.bani.split('\r\n').join('\r').split('\n').join('\r');
                    card.baniFrame.contents = cleanBani;

                    try {
                        var nbtr = card.baniFrame.textRange;
                        if (origBaniFont) nbtr.characterAttributes.textFont = origBaniFont;
                        if (origBaniSize) nbtr.characterAttributes.size = origBaniSize;
                        if (origBaniLeading) nbtr.characterAttributes.leading = origBaniLeading;
                        if (origBaniColor) nbtr.characterAttributes.fillColor = origBaniColor;
                    } catch(bsty) {}
                }
            } catch(bErr) {}

            // --- STEP 5: POPULATE QTY ---
            try {
                if (payload.fillQty !== false && card.qtyFrame && entry.qty) {
                    var origQtySize = null;
                    var origQtyLeading = null;
                    var origQtyFont = null;
                    var origQtyColor = null;
                    try {
                        var qtr = card.qtyFrame.textRange;
                        origQtyFont = qtr.characterAttributes.textFont;
                        origQtySize = qtr.characterAttributes.size;
                        origQtyLeading = qtr.characterAttributes.leading;
                        origQtyColor = qtr.characterAttributes.fillColor;
                    } catch(qe) {}

                    var qVal = String(entry.qty).replace(/^\s+|\s+$/g, '');
                    var isAnsiQty = (origQtyFont && /bornomala|sutonny/i.test(origQtyFont.name));
                    var qDigits = qVal.replace(/[^\d\u09E6-\u09EF]/g, '');
                    if (qDigits) {
                        if (isAnsiQty) {
                            var bnToAscii = {'\u09E6':'0','\u09E7':'1','\u09E8':'2','\u09E9':'3','\u09EA':'4','\u09EB':'5','\u09EC':'6','\u09ED':'7','\u09EE':'8','\u09EF':'9'};
                            qVal = qDigits.replace(/[\u09E6-\u09EF]/g, function(d) { return bnToAscii[d] || d; });
                        } else {
                            qVal = this.toBengaliDigits(qDigits);
                        }
                    }
                    card.qtyFrame.contents = qVal;

                    try {
                        var nQtr = card.qtyFrame.textRange;
                        if (origQtyFont) nQtr.characterAttributes.textFont = origQtyFont;
                        if (origQtySize) nQtr.characterAttributes.size = origQtySize;
                        if (origQtyLeading) nQtr.characterAttributes.leading = origQtyLeading;
                        if (origQtyColor) nQtr.characterAttributes.fillColor = origQtyColor;
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
    },

    // ==========================================
    // Note Bani Batch Filler Engine
    // ==========================================
    isNoteHeaderOrLabel: function(text) {
        if (!text) return false;
        var clean = text.replace(/^\s+|\s+$/g, "");
        if (!clean) return false;

        // Pure numbers / page numbers (e.g., "1", "01", "১২", "- ৫ -")
        if (clean.length <= 12 && /^[\u09E6-\u09EF0-9\s\.\-\/\#\(\)\[\]\u2014\u2013]+$/.test(clean)) {
            return true;
        }

        // Weekday row ("শনি রবি সোম মঙ্গল বুধ বৃহঃ শুক্র")
        var weekdays = ["\u09B6\u09A8\u09BF", "\u09B0\u09AC\u09BF", "\u09B8\u09CB\u09AE", "\u09AE\u0999\u09CD\u0997\u09B2", "\u09AC\u09C1\u09A7", "\u09AC\u09C3\u09B9", "\u09B6\u09C1\u0995\u09CD\u09B0"];
        var dayHits = 0;
        for (var w = 0; w < weekdays.length; w++) {
            if (clean.indexOf(weekdays[w]) !== -1) dayHits++;
        }
        if (dayHits >= 2) return true;
        if (dayHits === 1 && clean.length <= 12) return true;

        // Short header / form labels
        if (clean.length <= 32) {
            var exactLabels = [
                "\u09AC\u09BF\u09B7\u09DF", "\u09AC\u09BF\u09B7\u09AF\u09BC", "\u09A4\u09BE\u09B0\u09BF\u0996", "\u09AA\u09C3\u09B7\u09CD\u09A0\u09BE", "\u09AA\u09C3\u09B7\u09CD\u09A0\u09BE \u09A8\u0982", "\u09A8\u09CB\u099F", "\u09A8\u09CB\u099F \u09A8\u0982",
                "\u09A8\u09CB\u099F\u09AC\u09C1\u0995", "\u09A1\u09BE\u09DF\u09C7\u09B0\u09BF", "\u09A1\u09BE\u09AF\u09BC\u09C7\u09B0\u09BF", "\u09A6\u09BF\u09A8", "\u09AE\u09BE\u09B8", "\u09B8\u09BE\u09B2", "\u09B6\u09BF\u0995\u09CD\u09B7\u09BE\u09AC\u09B0\u09CD\u09B7",
                "\u09B8\u09C7\u09B6\u09A8", "\u09B6\u09CD\u09B0\u09C7\u09A3\u09BF", "\u09B6\u09CD\u09B0\u09C7\u09A3\u09C0", "\u09AC\u09BF\u09AD\u09BE\u0997", "\u09B0\u09CB\u09B2", "\u09A8\u09BE\u09AE", "\u09AA\u09BF\u09A4\u09BE",
                "subject", "date", "topic", "note", "page", "day", "month", "year",
                "class", "section", "roll", "name"
            ];
            var lowerClean = clean.toLowerCase().replace(/[\:\-\.\s]+$/g, "");
            for (var lb = 0; lb < exactLabels.length; lb++) {
                if (lowerClean === exactLabels[lb]) return true;
            }
            if (/^(?:\u09AC\u09BF\u09B7\u09DF|\u09AC\u09BF\u09B7\u09AF\u09BC|\u09A4\u09BE\u09B0\u09BF\u0996|\u09AA\u09C3\u09B7\u09CD\u09A0\u09BE|subject|date|topic|page)\b/i.test(clean) && clean.length <= 22) {
                return true;
            }
        }
        return false;
    },

    findArtboardForPoint: function(doc, cx, cy) {
        if (!doc || !doc.artboards || !doc.artboards.length) return -1;
        var bestIdx = -1;
        var bestDist = 999999;
        for (var i = 0; i < doc.artboards.length; i++) {
            var r = doc.artboards[i].artboardRect; // [left, top, right, bottom]
            var abL = Math.min(r[0], r[2]);
            var abR = Math.max(r[0], r[2]);
            var abT = Math.max(r[1], r[3]);
            var abB = Math.min(r[1], r[3]);

            if (cx >= abL - 8 && cx <= abR + 8 && cy >= abB - 8 && cy <= abT + 8) {
                return i;
            }
            var dx = (cx < abL) ? (abL - cx) : (cx > abR ? cx - abR : 0);
            var dy = (cy < abB) ? (abB - cy) : (cy > abT ? cy - abT : 0);
            var d = Math.sqrt(dx * dx + dy * dy);
            if (d <= 25 && d < bestDist) {
                bestDist = d;
                bestIdx = i;
            }
        }
        return bestIdx;
    },

    getNoteFrameStyle: function(tf) {
        var style = {
            font: null,
            fontName: "",
            fontFamily: "",
            size: 10.0,
            autoLeading: true,
            leading: 12.0,
            horizontalScale: 100.0,
            verticalScale: 100.0,
            tracking: 0,
            fillColor: null,
            justification: null,
            spaceBefore: 0,
            spaceAfter: 0
        };
        if (!tf) return style;

        try {
            var targetCa = null;
            if (tf.characters && tf.characters.length > 0) {
                var limit = Math.min(tf.characters.length, 12);
                for (var c = 0; c < limit; c++) {
                    var ch = tf.characters[c];
                    var chStr = "";
                    try { chStr = ch.contents || ""; } catch(ce) {}
                    if (chStr && !/^\s+$/.test(chStr)) {
                        targetCa = ch.characterAttributes;
                        break;
                    }
                }
                if (!targetCa) targetCa = tf.characters[0].characterAttributes;
            } else if (tf.textRange && tf.textRange.characterAttributes) {
                targetCa = tf.textRange.characterAttributes;
            }

            if (targetCa) {
                try {
                    if (targetCa.textFont) {
                        style.font = targetCa.textFont;
                        style.fontName = targetCa.textFont.name || "";
                        style.fontFamily = targetCa.textFont.family || style.fontName.split("-")[0];
                    }
                } catch(fe) {}
                try { if (targetCa.size > 0) style.size = targetCa.size; } catch(se) {}
                try { style.autoLeading = !!targetCa.autoLeading; } catch(ae) {}
                try { if (targetCa.leading > 0) style.leading = targetCa.leading; } catch(le) {}
                try { if (targetCa.horizontalScale > 0) style.horizontalScale = targetCa.horizontalScale; } catch(he) {}
                try { if (targetCa.verticalScale > 0) style.verticalScale = targetCa.verticalScale; } catch(ve) {}
                try { style.tracking = targetCa.tracking; } catch(te) {}
                try {
                    if (targetCa.fillColor && targetCa.fillColor.typename !== "NoColor") {
                        style.fillColor = targetCa.fillColor;
                    }
                } catch(ce2) {}
            }

            if (tf.paragraphs && tf.paragraphs.length > 0) {
                try {
                    var pa = tf.paragraphs[0].paragraphAttributes;
                    if (pa) {
                        style.justification = pa.justification;
                        style.spaceBefore = pa.spaceBefore;
                        style.spaceAfter = pa.spaceAfter;
                    }
                } catch(pe) {}
            }
        } catch(e) {}
        return style;
    },

    collectAllVisibleTextFrames: function(doc, scope) {
        var rawFrames = [];
        if (scope === "selection") {
            if (doc.selection && doc.selection.length > 0) {
                this.collectTextFrames(doc.selection, rawFrames);
            }
        } else {
            var visLayers = [];
            this.collectVisibleLayers(doc, visLayers);
            for (var li = 0; li < visLayers.length; li++) {
                try {
                    this.collectTextFrames(visLayers[li].pageItems, rawFrames);
                } catch(e) {}
            }
        }

        // Deduplicate & exclude hidden/locked/backside frames
        var seen = [];
        var unique = [];
        for (var i = 0; i < rawFrames.length; i++) {
            var tf = rawFrames[i];
            if (!tf || tf.typename !== "TextFrame") continue;
            if (this.isItemHidden(tf)) continue;
            var dup = false;
            for (var s = 0; s < seen.length; s++) {
                if (seen[s] === tf) { dup = true; break; }
            }
            if (dup) continue;
            seen.push(tf);

            var txt = "";
            try { txt = tf.contents || ""; } catch(e2) {}
            if (this.isBackSideText(txt)) continue;

            unique.push(tf);
        }
        return unique;
    },

    sortNoteFrames: function(items, order) {
        if (!items || items.length <= 1) return items;
        var ord = order || "artboard_order";

        if (ord === "column") {
            // Cluster by X column (~80pt) then Y descending
            items.sort(function(a, b) {
                if (Math.abs(a.cx - b.cx) > 80) return a.cx - b.cx;
                return b.cy - a.cy;
            });
            return items;
        }

        if (ord === "zigzag") {
            // Global top-to-bottom, left-to-right
            items.sort(function(a, b) {
                if (Math.abs(a.cy - b.cy) > 40) return b.cy - a.cy;
                return a.cx - b.cx;
            });
            return items;
        }

        // Default "artboard_order": Artboard 1..N first, left-to-right (and top-to-bottom) within each artboard
        items.sort(function(a, b) {
            var abA = (a.abIdx >= 0) ? a.abIdx : 99999;
            var abB = (b.abIdx >= 0) ? b.abIdx : 99999;
            if (abA !== abB) return abA - abB;
            if (Math.abs(a.cy - b.cy) > 40) return b.cy - a.cy;
            return a.cx - b.cx;
        });
        return items;
    },

    detectNoteBaniFrames: function(doc, scope, order, sampleProfile) {
        var frames = this.collectAllVisibleTextFrames(doc, scope);
        if (!frames.length) return [];

        var activeAB = -1;
        try { activeAB = doc.artboards.getActiveArtboardIndex(); } catch(e) {}

        var candidates = [];
        var directTextSelection = (scope === "selection" && doc.selection && doc.selection.length > 0);
        if (directTextSelection) {
            for (var si = 0; si < doc.selection.length; si++) {
                if (!doc.selection[si] || doc.selection[si].typename !== "TextFrame") {
                    directTextSelection = false;
                    break;
                }
            }
        }

        for (var i = 0; i < frames.length; i++) {
            var tf = frames[i];
            var txt = "";
            try { txt = tf.contents || ""; } catch(e) {}
            var clean = txt.replace(/^\s+|\s+$/g, "");

            if (!sampleProfile && !directTextSelection && !clean) continue;
            if (!directTextSelection && this.isNoteHeaderOrLabel(clean)) continue;

            var b = null;
            try { b = tf.geometricBounds; } catch(be) {
                try { b = tf.visibleBounds; } catch(be2) {}
            }
            if (!b) continue;

            var cx = (b[0] + b[2]) / 2;
            var cy = (b[1] + b[3]) / 2;
            var abIdx = this.findArtboardForPoint(doc, cx, cy);

            if (scope === "artboard" && activeAB >= 0 && abIdx !== activeAB) {
                continue;
            }

            var relY = -1;
            if (abIdx >= 0) {
                var r = doc.artboards[abIdx].artboardRect;
                var abT = Math.max(r[1], r[3]);
                var abB = Math.min(r[1], r[3]);
                relY = (abT - cy) / Math.max(1, (abT - abB));
            }

            var style = this.getNoteFrameStyle(tf);
            candidates.push({
                tf: tf,
                text: clean,
                cx: cx,
                cy: cy,
                abIdx: abIdx,
                relY: relY,
                style: style
            });
        }

        if (!candidates.length) return [];

        var matched = [];

        // 1. If user locked onto a Sample Bani frame, match by font + size + vertical position
        if (sampleProfile && sampleProfile.fontName) {
            for (var k = 0; k < candidates.length; k++) {
                var c = candidates[k];
                var sameFont = (c.style.fontName === sampleProfile.fontName) ||
                               (sampleProfile.fontFamily && c.style.fontFamily === sampleProfile.fontFamily);
                var sameSize = Math.abs(c.style.size - sampleProfile.size) <= 1.5;
                var sameZone = (sampleProfile.relY < 0 || c.relY < 0 || Math.abs(c.relY - sampleProfile.relY) <= 0.18);
                if (sameFont && sameSize && sameZone) {
                    matched.push(c);
                }
            }
            return this.sortNoteFrames(matched, order);
        }

        // 2. If user directly selected TextFrames, trust the selection directly
        if (directTextSelection) {
            return this.sortNoteFrames(candidates, order);
        }

        // 3. Auto-detect via Bani content + bottom-region + consensus style clustering
        var scored = [];
        for (var j = 0; j < candidates.length; j++) {
            var cand = candidates[j];
            var t = cand.text;
            var sc = 0;

            if (this.isBaniText(t)) sc += 6;
            if (/^(?:\u09AC\u09BE\u09A3\u09C0|\u09AC\u09BE\u09A8\u09C0|Bani|Quote)\s*[:\-]?/i.test(t)) sc += 6;
            if (/[\u2014\u2013~]/.test(t) || /\s-\s/.test(t)) sc += 3;
            if (t.length >= 25) sc += 3;
            else if (t.length >= 14) sc += 1;

            if (cand.relY >= 0.65) sc += 5;
            else if (cand.relY >= 0.50) sc += 2;
            else if (cand.relY >= 0 && cand.relY < 0.28) sc -= 5;

            if (cand.style.size >= 5 && cand.style.size <= 16) sc += 2;
            else if (cand.style.size > 24) sc -= 5;

            if (sc >= 4) {
                cand.score = sc;
                scored.push(cand);
            }
        }

        if (!scored.length) {
            for (var f = 0; f < candidates.length; f++) {
                if (candidates[f].text.length >= 16 && (candidates[f].relY < 0 || candidates[f].relY >= 0.50)) {
                    candidates[f].score = 2;
                    scored.push(candidates[f]);
                }
            }
        }

        if (scored.length >= 3) {
            var groups = {};
            for (var g = 0; g < scored.length; g++) {
                var item = scored[g];
                var gk = (item.style.fontName || "default") + "__" + Math.round(item.style.size * 2);
                if (!groups[gk]) {
                    groups[gk] = {
                        fontName: item.style.fontName,
                        fontFamily: item.style.fontFamily,
                        sizeSum: 0,
                        relYSum: 0,
                        relYCount: 0,
                        scoreSum: 0,
                        count: 0
                    };
                }
                groups[gk].count++;
                groups[gk].sizeSum += item.style.size;
                groups[gk].scoreSum += item.score;
                if (item.relY >= 0) {
                    groups[gk].relYSum += item.relY;
                    groups[gk].relYCount++;
                }
            }

            var bestGroup = null;
            var bestWeight = -1;
            for (var key in groups) {
                if (groups.hasOwnProperty(key)) {
                    var grp = groups[key];
                    var weight = grp.count * 12 + grp.scoreSum;
                    if (weight > bestWeight) {
                        bestWeight = weight;
                        bestGroup = grp;
                    }
                }
            }

            if (bestGroup) {
                var refSize = bestGroup.sizeSum / bestGroup.count;
                var refRelY = bestGroup.relYCount > 0 ? (bestGroup.relYSum / bestGroup.relYCount) : -1;
                for (var m = 0; m < scored.length; m++) {
                    var scItem = scored[m];
                    var fOk = (!bestGroup.fontName || scItem.style.fontName === bestGroup.fontName ||
                               (bestGroup.fontFamily && scItem.style.fontFamily === bestGroup.fontFamily));
                    var sOk = Math.abs(scItem.style.size - refSize) <= 1.2;
                    var yOk = (refRelY < 0 || scItem.relY < 0 || Math.abs(scItem.relY - refRelY) <= 0.25);
                    if (fOk && sOk && yOk) {
                        matched.push(scItem);
                    }
                }
            }
        } else {
            matched = scored;
        }

        return this.sortNoteFrames(matched, order);
    },

    pickNoteBaniSample: function() {
        var doc = this.getActiveDoc();
        if (!doc) {
            return JSON.stringify({ status: "error", message: "No active Illustrator document found." });
        }
        var sel = doc.selection;
        if (!sel || sel.length === 0) {
            return JSON.stringify({ status: "error", message: "Please select 1 Bani TextFrame on canvas first." });
        }

        var tfs = [];
        this.collectTextFrames(sel, tfs);
        if (!tfs.length) {
            return JSON.stringify({ status: "error", message: "No TextFrame found in selection." });
        }

        var tf = tfs[0];
        var style = this.getNoteFrameStyle(tf);
        var relY = -1;
        try {
            var b = tf.geometricBounds;
            var cx = (b[0] + b[2]) / 2;
            var cy = (b[1] + b[3]) / 2;
            var abIdx = this.findArtboardForPoint(doc, cx, cy);
            if (abIdx >= 0) {
                var r = doc.artboards[abIdx].artboardRect;
                var abT = Math.max(r[1], r[3]);
                var abB = Math.min(r[1], r[3]);
                relY = (abT - cy) / Math.max(1, (abT - abB));
            }
        } catch(e) {}

        var sampleProfile = {
            fontName: style.fontName,
            fontFamily: style.fontFamily,
            size: Math.round(style.size * 100) / 100,
            relY: Math.round(relY * 1000) / 1000
        };

        return JSON.stringify({
            status: "success",
            sample: sampleProfile,
            message: "Locked: " + (style.fontName || "Template Font") + " (" + sampleProfile.size + " pt)"
        });
    },

    scanNoteBanis: function(payloadJson) {
        var doc = this.getActiveDoc();
        if (!doc) {
            return JSON.stringify({ status: "error", message: "No active Illustrator document found." });
        }

        var payload = {};
        try { if (payloadJson) payload = JSON.parse(payloadJson); } catch(e) {}

        var slots = this.detectNoteBaniFrames(
            doc,
            payload.scope || "all_artboards",
            payload.order || "artboard_order",
            payload.sampleProfile || null
        );

        var fontLabel = slots.length > 0 ? (slots[0].style.fontName || "Template") : "";
        var sizeLabel = slots.length > 0 ? (Math.round(slots[0].style.size * 10) / 10) : 0;

        return JSON.stringify({
            status: "success",
            count: slots.length,
            fontName: fontLabel,
            fontSize: sizeLabel,
            message: slots.length > 0
                ? ("Found " + slots.length + " Note Bani slot(s) (" + fontLabel + " " + sizeLabel + "pt)")
                : "No Note Bani frames detected. Select 1 sample Bani and click Pick Sample."
        });
    },

    computeNoteMaxWidthPt: function(doc, slot, customMaxMm, allSlots, sideMarginMm) {
        if (customMaxMm && customMaxMm > 0) {
            return customMaxMm * 72.0 / 25.4;
        }
        var tf = slot.tf;
        var style = slot.style || {};
        var abIdx = slot.abIdx;
        var gb = null;
        try { gb = tf.geometricBounds; } catch(e) {}
        if (!gb) return 190.0;

        var sMm = (sideMarginMm !== undefined && sideMarginMm >= 0) ? sideMarginMm : 20.0;
        var sideMarginPt = sMm * 72.0 / 25.4;

        var origW = Math.abs(gb[2] - gb[0]);
        if (abIdx >= 0 && doc && doc.artboards && doc.artboards[abIdx]) {
            var r = doc.artboards[abIdx].artboardRect;
            var abL = Math.min(r[0], r[2]);
            var abR = Math.max(r[0], r[2]);
            var abT = Math.max(r[1], r[3]);
            var abB = Math.min(r[1], r[3]);
            var abW = abR - abL;
            var abH = abT - abB;
            var midX = (abL + abR) / 2;

            // Count how many slots sit on this same artboard to detect 2-page spreads
            var slotsOnAb = 0;
            if (allSlots) {
                for (var si = 0; si < allSlots.length; si++) {
                    if (allSlots[si].abIdx === abIdx) slotsOnAb++;
                }
            }
            var isSpread = (slotsOnAb >= 2) || (abW > abH * 1.15);
            var spinePad = 14.0;
            var cx = slot.cx;

            var pageLeft = (isSpread && cx > midX) ? (midX + spinePad) : (abL + sideMarginPt);
            var pageRight = (isSpread && cx <= midX) ? (midX - spinePad) : (abR - sideMarginPt);

            var avail = 0;
            var just = style.justification;
            if (typeof Justification !== "undefined") {
                if (just === Justification.RIGHT) {
                    var rightAnchor = Math.min(gb[2], pageRight);
                    avail = rightAnchor - pageLeft;
                } else if (just === Justification.LEFT) {
                    var leftAnchor = Math.max(gb[0], pageLeft);
                    avail = pageRight - leftAnchor;
                } else {
                    // Center-aligned: anchor near flower or center within safe bounds
                    if (isSpread) {
                        var safeAnchor = (cx <= midX) ? Math.min(gb[2], pageRight) : Math.max(gb[0], pageLeft);
                        avail = (cx <= midX) ? (safeAnchor - pageLeft) : (pageRight - safeAnchor);
                        if (avail < 90) avail = pageRight - pageLeft;
                    } else {
                        var halfSpace = Math.min(Math.max(0, cx - pageLeft), Math.max(0, pageRight - cx));
                        avail = Math.max(halfSpace * 2, (pageRight - pageLeft) * 0.75);
                    }
                }
            } else {
                avail = (isSpread && cx <= midX) ? (Math.min(gb[2], pageRight) - pageLeft) : (pageRight - Math.max(gb[0], pageLeft));
            }

            // Never exceed the single-page safe zone [pageLeft, pageRight]
            var zoneMax = Math.max(80, pageRight - pageLeft);
            if (avail > zoneMax) avail = zoneMax;
            if (avail >= 70) return avail;
            return zoneMax;
        }

        return Math.max(origW, 190.0);
    },

    splitBalancedQuoteLines: function(text, numLines) {
        if (!text) return "";
        var clean = text.replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
        if (!clean || numLines <= 1) return clean;

        var words = clean.split(" ");
        var targetLines = Math.min(numLines, words.length);
        if (targetLines <= 1) return clean;

        var result = [];
        var idx = 0;
        var totalWords = words.length;

        for (var l = 0; l < targetLines; l++) {
            var remainingLines = targetLines - l;
            if (remainingLines === 1) {
                result.push(words.slice(idx).join(" "));
                break;
            }
            var remTextLen = words.slice(idx).join(" ").length;
            var idealLen = remTextLen / remainingLines;
            var lineWords = [];
            var curLen = 0;

            while (idx < totalWords - (remainingLines - 1)) {
                var w = words[idx];
                var nextLen = lineWords.length === 0 ? w.length : (curLen + 1 + w.length);
                if (lineWords.length > 0 && nextLen > idealLen && Math.abs(nextLen - idealLen) > Math.abs(curLen - idealLen)) {
                    break;
                }
                lineWords.push(w);
                curLen = nextLen;
                idx++;
                if (curLen >= idealLen) break;
            }
            if (lineWords.length === 0 && idx < totalWords) {
                lineWords.push(words[idx]);
                idx++;
            }
            result.push(lineWords.join(" "));
        }
        return result.join("\r");
    },

    applyNoteFrameStyle: function(tf, style, sizeOverride, hScaleOverride) {
        if (!tf || !style) return;
        var sizeToUse = (sizeOverride && sizeOverride > 0) ? sizeOverride : style.size;
        var hScaleToUse = (hScaleOverride && hScaleOverride > 0) ? hScaleOverride : style.horizontalScale;
        var leadToUse = style.leading;
        if (!style.autoLeading && style.leading > 0 && style.size > 0 && sizeToUse !== style.size) {
            leadToUse = style.leading * (sizeToUse / style.size);
        }

        try {
            var tr = tf.textRange;
            try { if (style.font) tr.characterAttributes.textFont = style.font; } catch(fe) {}
            try { if (sizeToUse > 0) tr.characterAttributes.size = sizeToUse; } catch(se) {}
            try {
                if (style.autoLeading) {
                    tr.characterAttributes.autoLeading = true;
                } else if (leadToUse > 0) {
                    tr.characterAttributes.autoLeading = false;
                    tr.characterAttributes.leading = leadToUse;
                }
            } catch(le) {}
            try { if (hScaleToUse > 0) tr.characterAttributes.horizontalScale = hScaleToUse; } catch(he) {}
            try { if (style.verticalScale > 0) tr.characterAttributes.verticalScale = style.verticalScale; } catch(ve) {}
            try { tr.characterAttributes.tracking = style.tracking; } catch(te) {}
            try { if (style.fillColor) tr.characterAttributes.fillColor = style.fillColor; } catch(ce) {}

            try {
                for (var p = 0; p < tf.paragraphs.length; p++) {
                    var pAttr = tf.paragraphs[p].paragraphAttributes;
                    if (style.justification !== null) pAttr.justification = style.justification;
                    pAttr.spaceBefore = style.spaceBefore;
                    pAttr.spaceAfter = style.spaceAfter;
                }
            } catch(pe) {}
        } catch(e) {}
    },

    populateNoteBanis: function(payloadJson) {
        var doc = this.getActiveDoc();
        if (!doc) {
            return JSON.stringify({ status: "error", message: "No active Illustrator document found." });
        }

        var payload = {};
        try { payload = JSON.parse(payloadJson); } catch(e) {
            return JSON.stringify({ status: "error", message: "Invalid Note Bani payload." });
        }

        var entries = payload.entries || [];
        var startIndex = payload.startIndex || 0;
        var preserveStyle = (payload.preserveStyle !== false);
        var scope = payload.scope || "all_artboards";
        var order = payload.order || "artboard_order";
        var sampleProfile = payload.sampleProfile || null;

        var autoWrapFit = (payload.autoWrapFit !== false);
        var maxWidthMm = parseFloat(payload.maxWidthMm);
        if (isNaN(maxWidthMm) || maxWidthMm <= 0) maxWidthMm = 0;
        var maxLinesPref = String(payload.maxLines || "auto");
        var minFontSize = parseFloat(payload.minFontSize);
        if (isNaN(minFontSize) || minFontSize <= 0) minFontSize = 6.5;

        var sideMarginMm = parseFloat(payload.sideMarginMm);
        if (isNaN(sideMarginMm) || sideMarginMm < 0) sideMarginMm = 20.0;
        var bottomMarginMm = parseFloat(payload.bottomMarginMm);
        if (isNaN(bottomMarginMm) || bottomMarginMm < 0) bottomMarginMm = 7.0;
        var sideMarginPt = sideMarginMm * 72.0 / 25.4;
        var bottomMarginPt = bottomMarginMm * 72.0 / 25.4;

        if (!entries.length || startIndex >= entries.length) {
            return JSON.stringify({ status: "error", message: "No Note Banis left to place." });
        }

        var slots = this.detectNoteBaniFrames(doc, scope, order, sampleProfile);
        if (!slots.length) {
            return JSON.stringify({
                status: "error",
                message: "No Note Bani frames found! Check scope or click 'Pick Sample Bani' on 1 frame."
            });
        }

        var filledCount = 0;
        var lastFontName = "";
        var lastFontSize = 0;

        for (var i = 0; i < slots.length; i++) {
            var entryIdx = startIndex + filledCount;
            if (entryIdx >= entries.length) break;

            var slot = slots[i];
            var tf = slot.tf;
            var style = preserveStyle ? slot.style : this.getNoteFrameStyle(tf);
            var rawBani = String(entries[entryIdx] || "");
            var cleanBani = rawBani.split("\r\n").join("\r").split("\n").join("\r");
            cleanBani = cleanBani.replace(/^\r+|\r+$/g, "");
            if (!cleanBani) continue;

            try {
                var origGb = null;
                try { origGb = tf.geometricBounds; } catch(gbe) {}
                var origMidY = origGb ? ((origGb[1] + origGb[3]) / 2) : null;
                var origAnchorRight = origGb ? origGb[2] : null;
                var origAnchorLeft = origGb ? origGb[0] : null;
                var maxWidthPt = autoWrapFit ? this.computeNoteMaxWidthPt(doc, slot, maxWidthMm, slots, sideMarginMm) : 0;

                // Separate quote lines from trailing author attribution line ("— Author")
                var bLines = cleanBani.split("\r");
                var authorLine = "";
                var quoteBody = cleanBani;
                if (bLines.length >= 2 && /^[\-\u2013\u2014~]/.test(bLines[bLines.length - 1].replace(/^\s+/, ""))) {
                    authorLine = bLines[bLines.length - 1].replace(/^\s+|\s+$/g, "");
                    quoteBody = bLines.slice(0, bLines.length - 1).join(" ").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
                } else {
                    quoteBody = bLines.join(" ").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
                }

                // Initial placement
                tf.contents = cleanBani;
                if (preserveStyle && style) {
                    this.applyNoteFrameStyle(tf, style, style.size, style.horizontalScale);
                }

                var isAreaText = false;
                try {
                    if (typeof TextType !== "undefined" && tf.kind === TextType.AREATEXT) {
                        isAreaText = true;
                    }
                } catch(tke) {}

                var appliedSize = style ? style.size : 10.0;
                var appliedHScale = style ? style.horizontalScale : 100.0;

                if (autoWrapFit && !isAreaText && maxWidthPt > 0) {
                    var curGb = null;
                    try { curGb = tf.geometricBounds; } catch(cbe) {}
                    var curW = curGb ? Math.abs(curGb[2] - curGb[0]) : 0;

                    if (curW > maxWidthPt) {
                        var maxTotalLines = (maxLinesPref === "auto") ? 3 : (parseInt(maxLinesPref, 10) || 3);
                        var maxQuoteLines = authorLine ? Math.max(1, maxTotalLines - 1) : Math.max(1, maxTotalLines);

                        // If quote is very long (> 2.2x available width) in auto mode, allow up to 3 quote lines + author (4 total)
                        if (maxLinesPref === "auto" && curW > maxWidthPt * 2.15) {
                            maxQuoteLines = authorLine ? 3 : 4;
                        }

                        var bestText = cleanBani;
                        var bestW = curW;

                        for (var ql = 2; ql <= maxQuoteLines; ql++) {
                            var wrappedQuote = this.splitBalancedQuoteLines(quoteBody, ql);
                            var candidateText = authorLine ? (wrappedQuote + "\r" + authorLine) : wrappedQuote;
                            tf.contents = candidateText;
                            if (preserveStyle && style) {
                                this.applyNoteFrameStyle(tf, style, style.size, style.horizontalScale);
                            }
                            try { curGb = tf.geometricBounds; } catch(cbe2) { curGb = null; }
                            var testW = curGb ? Math.abs(curGb[2] - curGb[0]) : bestW;
                            if (testW < bestW) {
                                bestW = testW;
                                bestText = candidateText;
                            }
                            if (testW <= maxWidthPt) {
                                break;
                            }
                        }

                        if (tf.contents !== bestText) {
                            tf.contents = bestText;
                            if (preserveStyle && style) {
                                this.applyNoteFrameStyle(tf, style, style.size, style.horizontalScale);
                            }
                        }

                        try { curGb = tf.geometricBounds; } catch(cbe3) { curGb = null; }
                        curW = curGb ? Math.abs(curGb[2] - curGb[0]) : bestW;

                        // If still wider than maxWidthPt after wrapping, gently scale down font size (down to minFontSize)
                        if (curW > maxWidthPt && style && style.size > minFontSize) {
                            var sizeRatio = (maxWidthPt / curW) * 0.97;
                            var targetSize = Math.max(minFontSize, Math.round(style.size * sizeRatio * 10) / 10);
                            if (targetSize < style.size) {
                                appliedSize = targetSize;
                                this.applyNoteFrameStyle(tf, style, appliedSize, appliedHScale);
                                try { curGb = tf.geometricBounds; } catch(cbe4) { curGb = null; }
                                curW = curGb ? Math.abs(curGb[2] - curGb[0]) : curW;
                            }
                        }

                        // Final horizontal scale trim if still slightly wider at minFontSize
                        if (curW > maxWidthPt && style) {
                            var hRatio = (maxWidthPt / curW) * 0.97;
                            var targetH = Math.max(70.0, Math.floor(appliedHScale * hRatio));
                            if (targetH < appliedHScale) {
                                appliedHScale = targetH;
                                this.applyNoteFrameStyle(tf, style, appliedSize, appliedHScale);
                            }
                        }
                    }

                    // Keep horizontal anchor alignment, center vertically beside ornament, and strictly enforce 20mm side & 7mm bottom cut gaps
                    try {
                        var finalGb = tf.geometricBounds;
                        var dx = 0;
                        if (typeof Justification !== "undefined" && style && style.justification === Justification.RIGHT && origAnchorRight !== null) {
                            dx = origAnchorRight - finalGb[2];
                        } else if (typeof Justification !== "undefined" && style && style.justification === Justification.LEFT && origAnchorLeft !== null) {
                            dx = origAnchorLeft - finalGb[0];
                        }

                        var dy = 0;
                        if (origMidY !== null) {
                            var newMidY = (finalGb[1] + finalGb[3]) / 2;
                            dy = origMidY - newMidY;
                        }

                        if (slot.abIdx >= 0 && doc.artboards[slot.abIdx]) {
                            var abr = doc.artboards[slot.abIdx].artboardRect;
                            var abL = Math.min(abr[0], abr[2]);
                            var abR = Math.max(abr[0], abr[2]);
                            var abB = Math.min(abr[1], abr[3]);

                            var safeLeft = abL + sideMarginPt;
                            var safeRight = abR - sideMarginPt;
                            var safeBottom = abB + bottomMarginPt;

                            if ((finalGb[0] + dx) < safeLeft) {
                                dx += (safeLeft - (finalGb[0] + dx));
                            }
                            if ((finalGb[2] + dx) > safeRight) {
                                dx -= ((finalGb[2] + dx) - safeRight);
                            }
                            if ((finalGb[3] + dy) < safeBottom) {
                                dy += (safeBottom - (finalGb[3] + dy));
                            }
                        }

                        if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2) {
                            tf.translate(dx, dy);
                        }
                    } catch(posErr) {}
                } else if (autoWrapFit && isAreaText && style && style.size > minFontSize) {
                    // For Area Text frames, shrink font size gently only if text overflows the box
                    try {
                        var safety = 0;
                        while (safety < 6 && appliedSize > minFontSize) {
                            safety++;
                            var visChars = 0;
                            for (var li = 0; li < tf.lines.length; li++) {
                                visChars += tf.lines[li].characters.length;
                            }
                            var totalNonBreak = tf.contents.replace(/[\r\n]/g, "").length;
                            if (visChars >= totalNonBreak) break;
                            appliedSize = Math.max(minFontSize, Math.round((appliedSize - 0.5) * 10) / 10);
                            this.applyNoteFrameStyle(tf, style, appliedSize, appliedHScale);
                        }
                    } catch(areaErr) {}
                }

                if (style && style.fontName) lastFontName = style.fontName;
                if (appliedSize > 0) lastFontSize = Math.round(appliedSize * 10) / 10;
                filledCount++;
            } catch(tfErr) {}
        }

        try { app.redraw(); } catch(e) {}

        return JSON.stringify({
            status: "success",
            filledCount: filledCount,
            totalSlots: slots.length,
            totalEntries: entries.length,
            nextStartIndex: startIndex + filledCount,
            fontName: lastFontName,
            fontSize: lastFontSize,
            message: "Placed " + filledCount + " of " + slots.length + " Note Bani(s) in " + (lastFontName || "template font") + " (" + lastFontSize + "pt)!"
        });
    },

    // ==========================================
    // Pen Strip Auto-Filler & Smart Fit Engine
    // ==========================================
    _mmToPt: function(mm) {
        return mm * 72.0 / 25.4;
    },

    _ptToMm: function(pt) {
        return pt * 25.4 / 72.0;
    },

    _roundMm: function(pt) {
        return Math.round(this._ptToMm(pt) * 100) / 100;
    },

    _isPenYearText: function(txt) {
        if (!txt) return false;
        var clean = txt.replace(/\s+/g, "");
        return /^(?:19|20)\d\d$|^(?:\u09E7\u09EA|\u09E7\u09EB)[\u09E6-\u09EF]{2}$|^(?:\u09E8\u09E6|\u09E7\u09EF)[\u09E6-\u09EF]{2}$/.test(clean);
    },

    _isPenQtyText: function(txt) {
        if (!txt) return false;
        var clean = txt.replace(/^\s+|\s+$/g, "");
        if (!clean || clean.length > 10) return false;
        var compact = clean.replace(/\s+/g, "");
        if (/^[\u09E6-\u09EF0-9]{1,4}$/.test(compact)) return true;
        if (/^[\u09E6-\u09EF0-9]{1,4}(?:\u099F\u09BF|\u09AA\u09BF\u09B8|pcs|pc|pens?)$/i.test(compact)) return true;
        return false;
    },

    _formatPenQtyDigits: function(qtyStr, isEnglishDigits, qtyFont) {
        var qRaw = String(qtyStr || "").replace(/^\s+|\s+$/g, "");
        var qDigits = qRaw.replace(/[^\d\u09E6-\u09EF]/g, "");
        if (!qDigits) return qRaw;

        var bnToAscii = {
            "\u09E6": "0", "\u09E7": "1", "\u09E8": "2", "\u09E9": "3", "\u09EA": "4",
            "\u09EB": "5", "\u09EC": "6", "\u09ED": "7", "\u09EE": "8", "\u09EF": "9"
        };
        var asciiDigits = qDigits.replace(/[\u09E6-\u09EF]/g, function(d) { return bnToAscii[d] || d; });

        var isAnsiFont = false;
        try {
            if (qtyFont && /sutonny|bornomalaansi/i.test(qtyFont.name || "")) isAnsiFont = true;
        } catch(e) {}

        if (isEnglishDigits || isAnsiFont) {
            return asciiDigits;
        }
        return this.toBengaliDigits(asciiDigits);
    },

    _resolvePenFontVariant: function(baseFont, wantBold) {
        if (!baseFont) {
            var bn = this.getBornomalaFonts();
            return wantBold ? (bn.bold || bn.regular) : (bn.regular || bn.bold);
        }

        var bName = "";
        var bStyle = "";
        var bFam = "";
        try { bName = baseFont.name || ""; } catch(e1) {}
        try { bStyle = baseFont.style || ""; } catch(e2) {}
        try { bFam = baseFont.family || ""; } catch(e3) {}

        var isCurrBold = /bold|black|heavy|semibold|demi|extrab|ultrab|\bbl\b/i.test(bName + " " + bStyle);
        if (wantBold && isCurrBold) return baseFont;
        if (!wantBold && !isCurrBold && /regular|normal|book|roman|plain/i.test(bName + " " + bStyle)) return baseFont;

        var pair = this.getFamilyFonts(baseFont);
        if (wantBold && pair && pair.bold) {
            if (!bFam || (pair.bold.family && pair.bold.family === bFam)) return pair.bold;
        }
        if (!wantBold && pair && pair.regular) {
            if (!bFam || (pair.regular.family && pair.regular.family === bFam)) return pair.regular;
        }

        try {
            var famLow = bFam ? bFam.toLowerCase() : bName.split("-")[0].toLowerCase();
            if (famLow) {
                for (var i = 0; i < app.textFonts.length; i++) {
                    var f = app.textFonts[i];
                    var fn = (f.name || "").toLowerCase();
                    var ff = (f.family || "").toLowerCase();
                    var fs = (f.style || "").toLowerCase();
                    if (ff === famLow || fn.indexOf(famLow.replace(/\s+/g, "")) === 0) {
                        var fBold = /bold|black|heavy|semibold|demi/.test(fn + " " + fs);
                        if (wantBold && fBold) return f;
                        if (!wantBold && !fBold && /regular|normal|book|roman|^$/.test(fs)) return f;
                    }
                }
            }
        } catch(fe) {}

        if (wantBold && pair && pair.bold) return pair.bold;
        if (!wantBold && pair && pair.regular) return pair.regular;
        return baseFont;
    },

    _clonePenColor: function(col) {
        if (!col) return null;
        try {
            if (col.typename === "NoColor") return null;
            if (col.typename === "CMYKColor") {
                var c = new CMYKColor();
                c.cyan = col.cyan;
                c.magenta = col.magenta;
                c.yellow = col.yellow;
                c.black = col.black;
                return c;
            }
            if (col.typename === "RGBColor") {
                var r = new RGBColor();
                r.red = col.red;
                r.green = col.green;
                r.blue = col.blue;
                return r;
            }
            if (col.typename === "GrayColor") {
                var g = new GrayColor();
                g.gray = col.gray;
                return g;
            }
            return col;
        } catch(e) {}
        return col;
    },

    _serializePenColor: function(col, doc) {
        var info = { hex: "", cmyk: null, rgb: null };
        if (!col) return info;
        try {
            if (col.typename === "SpotColor" && col.spot && col.spot.color) {
                col = col.spot.color;
            }
            if (col.typename === "CMYKColor") {
                info.cmyk = [
                    Math.round(col.cyan * 10) / 10,
                    Math.round(col.magenta * 10) / 10,
                    Math.round(col.yellow * 10) / 10,
                    Math.round(col.black * 10) / 10
                ];
                info.hex = this.cmykToHex(col.cyan, col.magenta, col.yellow, col.black);
            } else if (col.typename === "RGBColor") {
                info.rgb = [Math.round(col.red), Math.round(col.green), Math.round(col.blue)];
                info.hex = this.rgbToHex(col.red, col.green, col.blue);
            } else if (col.typename === "GrayColor") {
                var kVal = Math.round(col.gray * 10) / 10;
                info.cmyk = [0, 0, 0, kVal];
                var v = Math.round(255 * (1 - col.gray / 100));
                info.hex = this.rgbToHex(v, v, v);
            }
        } catch(e) {}
        return info;
    },

    _deserializePenColor: function(colorInfo, doc) {
        if (!colorInfo) return null;
        var isCMYK = doc ? (doc.documentColorSpace === DocumentColorSpace.CMYK) : true;
        if (isCMYK && colorInfo.cmyk && colorInfo.cmyk.length >= 4) {
            var c = new CMYKColor();
            c.cyan = Math.max(0, Math.min(100, Number(colorInfo.cmyk[0])));
            c.magenta = Math.max(0, Math.min(100, Number(colorInfo.cmyk[1])));
            c.yellow = Math.max(0, Math.min(100, Number(colorInfo.cmyk[2])));
            c.black = Math.max(0, Math.min(100, Number(colorInfo.cmyk[3])));
            return c;
        }
        if (!isCMYK && colorInfo.rgb && colorInfo.rgb.length >= 3) {
            var r = new RGBColor();
            r.red = Math.max(0, Math.min(255, Math.round(colorInfo.rgb[0])));
            r.green = Math.max(0, Math.min(255, Math.round(colorInfo.rgb[1])));
            r.blue = Math.max(0, Math.min(255, Math.round(colorInfo.rgb[2])));
            return r;
        }
        if (colorInfo.hex) {
            return this.hexToColor(colorInfo.hex, isCMYK);
        }
        return null;
    },

    _findFontByName: function(fontName) {
        if (!fontName) return null;
        try {
            var f = app.textFonts.getByName(fontName);
            if (f) return f;
        } catch(e) {}
        return null;
    },

    _collectPenPathsRecursive: function(node, depth, outPaths) {
        if (!node || depth > 6 || this.isItemHidden(node)) return;
        if (node.typename === "PathItem" || node.typename === "CompoundPathItem") {
            if (node.geometricBounds) outPaths.push(node);
            return;
        }
        if (node.typename === "GroupItem" && node.pageItems) {
            for (var i = 0; i < node.pageItems.length; i++) {
                this._collectPenPathsRecursive(node.pageItems[i], depth + 1, outPaths);
            }
        }
    },

    getPenCardBounds: function(item) {
        var res = {
            bounds: null,
            width: 0,
            height: 0,
            hasBorder: false,
            innerBoxBounds: null,
            nonTextBounds: null
        };
        if (!item || !item.geometricBounds) return res;

        var gb = item.geometricBounds;
        var fallbackB = [Math.min(gb[0], gb[2]), Math.max(gb[1], gb[3]), Math.max(gb[0], gb[2]), Math.min(gb[1], gb[3])];

        if (item.typename === "PathItem" || item.typename === "CompoundPathItem") {
            res.bounds = fallbackB;
            res.width = fallbackB[2] - fallbackB[0];
            res.height = fallbackB[1] - fallbackB[3];
            res.hasBorder = true;
            res.nonTextBounds = fallbackB;
            return res;
        }

        if (item.typename === "GroupItem") {
            var paths = [];
            this._collectPenPathsRecursive(item, 0, paths);

            var bestOuter = null;
            var bestOuterArea = -1;
            var minL = 1e9, maxT = -1e9, maxR = -1e9, minB = 1e9;
            var hasPaths = false;

            for (var i = 0; i < paths.length; i++) {
                var p = paths[i];
                var pb = p.geometricBounds;
                var pl = Math.min(pb[0], pb[2]);
                var pr = Math.max(pb[0], pb[2]);
                var pt = Math.max(pb[1], pb[3]);
                var pbot = Math.min(pb[1], pb[3]);
                var pw = pr - pl;
                var ph = pt - pbot;

                if (pw > 0 && ph > 0 && pw <= 550 && ph <= 140) {
                    if (pl < minL) minL = pl;
                    if (pt > maxT) maxT = pt;
                    if (pr > maxR) maxR = pr;
                    if (pbot < minB) minB = pbot;
                    hasPaths = true;
                }

                var isClosed = (p.typename === "CompoundPathItem") || (p.typename === "PathItem" && p.closed);
                if (isClosed && pw >= 60 && pw <= 520 && ph >= 10 && ph <= 120 && pw > ph * 1.35) {
                    var area = pw * ph;
                    if (area > bestOuterArea) {
                        bestOuterArea = area;
                        bestOuter = [pl, pt, pr, pbot];
                    }
                }
            }

            if (hasPaths) {
                res.nonTextBounds = [minL, maxT, maxR, minB];
            }

            if (bestOuter) {
                res.bounds = bestOuter;
                res.width = bestOuter[2] - bestOuter[0];
                res.height = bestOuter[1] - bestOuter[3];
                res.hasBorder = true;

                // Look for an inner target box (e.g. 25x5mm rectangle inside the strip)
                var oL = bestOuter[0], oT = bestOuter[1], oR = bestOuter[2], oB = bestOuter[3];
                var oW = res.width;
                var oH = res.height;
                var bestInner = null;
                var bestInnerArea = -1;
                for (var j = 0; j < paths.length; j++) {
                    var ip = paths[j];
                    if (ip.typename !== "PathItem" || !ip.closed) continue;
                    var ipb = ip.geometricBounds;
                    var il = Math.min(ipb[0], ipb[2]);
                    var ir = Math.max(ipb[0], ipb[2]);
                    var it = Math.max(ipb[1], ipb[3]);
                    var ib = Math.min(ipb[1], ipb[3]);
                    var iw = ir - il;
                    var ih = it - ib;
                    if (iw >= 28 && iw <= oW * 0.88 && ih >= 7 && ih <= oH + 1.0) {
                        if (il >= oL - 1 && ir <= oR + 1 && it <= oT + 1 && ib >= oB - 1) {
                            var iMidX = (il + ir) / 2;
                            var relX = (iMidX - oL) / Math.max(1, oW);
                            if (relX >= 0.18 && relX <= 0.82) {
                                var iArea = iw * ih;
                                if (iArea > bestInnerArea) {
                                    bestInnerArea = iArea;
                                    bestInner = [il, it, ir, ib];
                                }
                            }
                        }
                    }
                }
                if (bestInner) res.innerBoxBounds = bestInner;
                return res;
            }

            if (res.nonTextBounds) {
                var nw = res.nonTextBounds[2] - res.nonTextBounds[0];
                var nh = res.nonTextBounds[1] - res.nonTextBounds[3];
                if (nw >= 50 && nh >= 8) {
                    res.bounds = res.nonTextBounds;
                    res.width = nw;
                    res.height = nh;
                    return res;
                }
            }
        }

        res.bounds = fallbackB;
        res.width = fallbackB[2] - fallbackB[0];
        res.height = fallbackB[1] - fallbackB[3];
        return res;
    },

    _collectPenStripCandidates: function(item, outStrips, depth) {
        if (!item || this.isItemHidden(item) || depth > 6) return;
        if (item.typename !== "GroupItem") return;

        var acc = this.getPenCardBounds(item);
        var w = acc.width;
        var h = acc.height;

        // Check whether child groups represent multiple distinct strip cards
        var stripChildren = [];
        for (var i = 0; i < item.pageItems.length; i++) {
            var ch = item.pageItems[i];
            if (ch.typename === "GroupItem" && !this.isItemHidden(ch)) {
                var cAcc = this.getPenCardBounds(ch);
                if (cAcc.width >= 55 && cAcc.height >= 10) {
                    stripChildren.push({ item: ch, acc: cAcc });
                }
            }
        }

        var shouldRecurse = false;
        if (stripChildren.length >= 2) {
            if (h > 90 || w > 480) {
                shouldRecurse = true;
            } else {
                // Distinct rows or distinct bordered strips inside parent group
                var yVals = [];
                var borderedCount = 0;
                for (var s = 0; s < stripChildren.length; s++) {
                    var cb = stripChildren[s].acc.bounds;
                    yVals.push((cb[1] + cb[3]) / 2);
                    if (stripChildren[s].acc.hasBorder) borderedCount++;
                }
                if (borderedCount >= 2) {
                    shouldRecurse = true;
                } else {
                    yVals.sort(function(a, b) { return a - b; });
                    if ((yVals[yVals.length - 1] - yVals[0]) > 14) shouldRecurse = true;
                }
            }
        } else if (stripChildren.length === 1 && (h > 110 || w > 520)) {
            shouldRecurse = true;
        }

        if (shouldRecurse) {
            for (var k = 0; k < item.pageItems.length; k++) {
                this._collectPenStripCandidates(item.pageItems[k], outStrips, depth + 1);
            }
            return;
        }

        if (w >= 45 && h >= 8 && w <= 560 && h <= 130) {
            outStrips.push({ group: item, acc: acc, tfs: [] });
        }
    },

    _collectScopePenCandidates: function(doc, scopeMode) {
        var items = [];
        var sel = doc.selection;
        if (scopeMode === "selection" && sel && sel.length > 0) {
            for (var s = 0; s < sel.length; s++) {
                if (!this.isItemHidden(sel[s])) items.push(sel[s]);
            }
            return items;
        }

        var visLayers = [];
        this.collectVisibleLayers(doc, visLayers);
        if (!visLayers.length) {
            for (var dl = 0; dl < doc.layers.length; dl++) {
                if (doc.layers[dl].visible && !doc.layers[dl].locked) visLayers.push(doc.layers[dl]);
            }
        }

        if (scopeMode === "all_artboards" || scopeMode === "document") {
            for (var l = 0; l < visLayers.length; l++) {
                for (var p = 0; p < visLayers[l].pageItems.length; p++) {
                    var it = visLayers[l].pageItems[p];
                    if (!this.isItemHidden(it)) items.push(it);
                }
            }
            return items;
        }

        var abIndex = doc.artboards.getActiveArtboardIndex();
        var abRect = doc.artboards[abIndex].artboardRect;
        for (var l2 = 0; l2 < visLayers.length; l2++) {
            for (var p2 = 0; p2 < visLayers[l2].pageItems.length; p2++) {
                var it2 = visLayers[l2].pageItems[p2];
                if (this.isItemHidden(it2)) continue;
                var gb = it2.geometricBounds;
                if (gb[0] < abRect[2] && gb[2] > abRect[0] && gb[1] > abRect[3] && gb[3] < abRect[1]) {
                    items.push(it2);
                }
            }
        }
        return items;
    },

    detectPenCards: function(doc, scope, order, sampleProfile) {
        if (!doc) return [];
        var sel = doc.selection;
        if (scope === "selection" && (!sel || sel.length === 0)) scope = "artboard";

        var candidateItems = this._collectScopePenCandidates(doc, scope);
        if (!candidateItems.length && scope === "artboard") {
            candidateItems = this._collectScopePenCandidates(doc, "document");
        }
        if (!candidateItems.length) return [];

        // All visible doc TextFrames (used for finding side qtyFrames even outside selection/group)
        var allDocTFs = [];
        var visLayers = [];
        this.collectVisibleLayers(doc, visLayers);
        for (var vl = 0; vl < visLayers.length; vl++) {
            try { this.collectTextFrames(visLayers[vl].pageItems, allDocTFs); } catch(vle) {}
        }

        // 1. Collect grouped Pen strip candidates
        var rawCards = [];
        for (var i = 0; i < candidateItems.length; i++) {
            if (candidateItems[i].typename === "GroupItem") {
                this._collectPenStripCandidates(candidateItems[i], rawCards, 0);
            }
        }

        for (var g = 0; g < rawCards.length; g++) {
            var tfs = [];
            this.collectTextFrames(rawCards[g].group.pageItems, tfs);
            rawCards[g].tfs = tfs;
        }

        // 2. Fallback for ungrouped layouts: look for strip outer border PathItems
        if (rawCards.length === 0) {
            var borderPaths = [];
            var scopeTFs = [];
            this.collectTextFrames(candidateItems, scopeTFs);

            for (var p = 0; p < candidateItems.length; p++) {
                var ci = candidateItems[p];
                if ((ci.typename === "PathItem" && ci.closed) || ci.typename === "CompoundPathItem") {
                    var cb = ci.geometricBounds;
                    var cl = Math.min(cb[0], cb[2]);
                    var cr = Math.max(cb[0], cb[2]);
                    var ct = Math.max(cb[1], cb[3]);
                    var cbot = Math.min(cb[1], cb[3]);
                    var cw = cr - cl;
                    var ch = ct - cbot;
                    if (cw >= 60 && cw <= 520 && ch >= 10 && ch <= 95 && cw > ch * 1.35) {
                        borderPaths.push({ item: ci, bounds: [cl, ct, cr, cbot], area: cw * ch });
                    }
                }
            }

            // Exclude inner rectangles enclosed inside larger strip border rectangles
            var outerBorders = [];
            for (var bp = 0; bp < borderPaths.length; bp++) {
                var curB = borderPaths[bp];
                var enclosed = false;
                for (var bp2 = 0; bp2 < borderPaths.length; bp2++) {
                    if (bp === bp2) continue;
                    var otherB = borderPaths[bp2];
                    if (otherB.area > curB.area * 1.05 &&
                        curB.bounds[0] >= otherB.bounds[0] - 2 && curB.bounds[2] <= otherB.bounds[2] + 2 &&
                        curB.bounds[1] <= otherB.bounds[1] + 2 && curB.bounds[3] >= otherB.bounds[3] - 2) {
                        enclosed = true;
                        break;
                    }
                }
                if (!enclosed) outerBorders.push(curB);
            }

            if (outerBorders.length > 0) {
                for (var ob = 0; ob < outerBorders.length; ob++) {
                    var obItem = outerBorders[ob];
                    var obB = obItem.bounds;
                    var cardTfs = [];
                    for (var st = 0; st < scopeTFs.length; st++) {
                        var stf = scopeTFs[st];
                        if (this.isItemHidden(stf)) continue;
                        var stb = stf.geometricBounds;
                        var scx = (stb[0] + stb[2]) / 2;
                        var scy = (stb[1] + stb[3]) / 2;
                        // Check left anchor or center inside strip vertical band (even if text overflows right!)
                        if (scy <= obB[1] + 4 && scy >= obB[3] - 4 &&
                            ((scx >= obB[0] - 4 && scx <= obB[2] + 4) || (stb[0] >= obB[0] - 4 && stb[0] <= obB[2] - 10))) {
                            cardTfs.push(stf);
                        }
                    }

                    // Look for inner target rectangle inside this outer border
                    var innerBoxB = null;
                    var bestInnerA = -1;
                    for (var ibIdx = 0; ibIdx < borderPaths.length; ibIdx++) {
                        var candIn = borderPaths[ibIdx];
                        if (candIn === obItem) continue;
                        var cb2 = candIn.bounds;
                        var cw2 = cb2[2] - cb2[0];
                        var ch2 = cb2[1] - cb2[3];
                        if (cw2 >= 28 && cw2 <= (obB[2] - obB[0]) * 0.88 &&
                            cb2[0] >= obB[0] - 1 && cb2[2] <= obB[2] + 1 &&
                            cb2[1] <= obB[1] + 1 && cb2[3] >= obB[3] - 1) {
                            if (cw2 * ch2 > bestInnerA) {
                                bestInnerA = cw2 * ch2;
                                innerBoxB = cb2;
                            }
                        }
                    }

                    rawCards.push({
                        group: null,
                        borderItem: obItem.item,
                        acc: {
                            bounds: obB,
                            width: obB[2] - obB[0],
                            height: obB[1] - obB[3],
                            hasBorder: true,
                            innerBoxBounds: innerBoxB,
                            nonTextBounds: obB
                        },
                        tfs: cardTfs
                    });
                }
            } else if (scopeTFs.length > 0) {
                // Pure floating TextFrames fallback: tightly cluster by row (maxDY = 14pt)
                var validTFs = [];
                for (var vt = 0; vt < scopeTFs.length; vt++) {
                    var vtf = scopeTFs[vt];
                    if (this.isItemHidden(vtf)) continue;
                    var vtxt = (vtf.contents || "").replace(/^\s+|\s+$/g, "");
                    if (this._isPenQtyText(vtxt) || this._isPenYearText(vtxt) || this.isBackSideText(vtxt)) continue;
                    validTFs.push(vtf);
                }
                validTFs.sort(function(a, b) {
                    var dy = b.geometricBounds[1] - a.geometricBounds[1];
                    if (Math.abs(dy) > 10) return dy;
                    return a.geometricBounds[0] - b.geometricBounds[0];
                });
                var clusters = [];
                for (var cIdx = 0; cIdx < validTFs.length; cIdx++) {
                    var ctf = validTFs[cIdx];
                    var cgb = ctf.geometricBounds;
                    var cmx = (cgb[0] + cgb[2]) / 2;
                    var cmy = (cgb[1] + cgb[3]) / 2;
                    var placed = false;
                    for (var cl = 0; cl < clusters.length; cl++) {
                        if (Math.abs(clusters[cl].midY - cmy) <= 14 && Math.abs(clusters[cl].left - cgb[0]) <= 35) {
                            clusters[cl].tfs.push(ctf);
                            placed = true;
                            break;
                        }
                    }
                    if (!placed) {
                        clusters.push({ midX: cmx, midY: cmy, left: cgb[0], tfs: [ctf] });
                    }
                }
                for (var ci2 = 0; ci2 < clusters.length; ci2++) {
                    var ctfs = clusters[ci2].tfs;
                    var uL = 1e9, uT = -1e9, uR = -1e9, uB = 1e9;
                    for (var ut = 0; ut < ctfs.length; ut++) {
                        var ug = ctfs[ut].geometricBounds;
                        if (ug[0] < uL) uL = ug[0];
                        if (ug[1] > uT) uT = ug[1];
                        if (ug[2] > uR) uR = ug[2];
                        if (ug[3] < uB) uB = ug[3];
                    }
                    rawCards.push({
                        group: null,
                        acc: { bounds: [uL, uT, uR, uB], width: uR - uL, height: uT - uB, hasBorder: false, innerBoxBounds: null },
                        tfs: ctfs
                    });
                }
            }
        }

        if (!rawCards.length) return [];

        // 3. Build static decorative text consensus map (e.g. "আল মাদানী ২০২৭" repeated identically across >= 50% of cards)
        var textFreq = {};
        for (var rIdx = 0; rIdx < rawCards.length; rIdx++) {
            var seenInCard = {};
            var rTfs = rawCards[rIdx].tfs;
            for (var tfIdx = 0; tfIdx < rTfs.length; tfIdx++) {
                var rawC = (rTfs[tfIdx].contents || "").replace(/\s+/g, "");
                if (!rawC || seenInCard[rawC]) continue;
                seenInCard[rawC] = true;
                textFreq[rawC] = (textFreq[rawC] || 0) + 1;
            }
        }
        var staticThreshold = (rawCards.length >= 3) ? Math.max(2, Math.floor(rawCards.length * 0.5)) : 9999;

        // 4. Analyze each Pen card to identify nameFrame, detailsFrame, qtyFrame, staticFrames
        var penCards = [];
        for (var c = 0; c < rawCards.length; c++) {
            var rc = rawCards[c];
            var bounds = rc.acc.bounds;
            var cL = bounds[0], cT = bounds[1], cR = bounds[2], cB = bounds[3];
            var cW = Math.max(1, cR - cL);

            var cardObj = {
                group: rc.group,
                borderItem: rc.borderItem || null,
                bounds: bounds,
                hasBorder: rc.acc.hasBorder,
                innerBoxBounds: rc.acc.innerBoxBounds,
                nameFrame: null,
                detailsFrame: null,
                qtyFrame: null,
                staticFrames: [],
                allFrames: rc.tfs,
                artboardIndex: 0
            };

            var candidates = [];
            for (var t = 0; t < rc.tfs.length; t++) {
                var tf = rc.tfs[t];
                if (this.isItemHidden(tf)) continue;
                var txt = tf.contents || "";
                var normTxt = txt.replace(/\s+/g, "");
                var gb = tf.geometricBounds;
                var tfMidX = (gb[0] + gb[2]) / 2;
                var relX = (tfMidX - cL) / cW;
                var relLeft = (gb[0] - cL) / cW;
                var tfW = Math.abs(gb[2] - gb[0]);

                // Short qty frame at right side or outside right edge
                if (this._isPenQtyText(txt) && !this._isPenYearText(txt)) {
                    if (gb[0] >= cR - 10 || (relX >= 0.78 && tfW < 45)) {
                        if (!cardObj.qtyFrame) {
                            cardObj.qtyFrame = tf;
                            continue;
                        }
                    }
                }

                if (this._isPenYearText(txt) || (!this.hasStrongBiodataSignals(txt) && this.isBackSideText(txt))) {
                    cardObj.staticFrames.push(tf);
                    continue;
                }

                var isRepeatedStatic = (textFreq[normTxt] >= staticThreshold && !this.hasStrongBiodataSignals(txt) && rc.tfs.length >= 2);
                candidates.push({
                    tf: tf,
                    txt: txt,
                    gb: gb,
                    relX: relX,
                    relLeft: relLeft,
                    width: tfW,
                    isRepeatedStatic: isRepeatedStatic
                });
            }

            if (candidates.length === 1 && !candidates[0].isRepeatedStatic) {
                cardObj.nameFrame = candidates[0].tf;
            } else if (candidates.length >= 1) {
                var bestCand = null;
                var bestScore = -9999;
                for (var k = 0; k < candidates.length; k++) {
                    var cd = candidates[k];
                    var sc = 0;
                    if (cd.isRepeatedStatic) sc -= 35;
                    if (this.hasStrongBiodataSignals(cd.txt)) sc += 25;
                    if (cd.txt.indexOf("|") !== -1) sc += 6;
                    if (cd.tf.paragraphs && cd.tf.paragraphs.length >= 2 && !cd.isRepeatedStatic) sc += 8;

                    if (sampleProfile && sampleProfile.relCenterX !== undefined && sampleProfile.relCenterX >= 0) {
                        var diffX = Math.abs(cd.relX - sampleProfile.relCenterX);
                        if (diffX <= 0.18) sc += 30 * (1 - diffX);
                        else sc -= 10;
                    }

                    if (cd.relX >= 0.20 && cd.relX <= 0.78) sc += 10;
                    else if (cd.relX < 0.16 && cd.width < cW * 0.28) sc -= 12;
                    else if (cd.relX > 0.80 && cd.width < cW * 0.28) sc -= 12;

                    sc += Math.min(8, cd.width / 15.0);

                    if (sc > bestScore) {
                        bestScore = sc;
                        bestCand = cd;
                    }
                }
                if (bestCand && !bestCand.isRepeatedStatic) {
                    cardObj.nameFrame = bestCand.tf;
                    // Check if there is a separate detailsFrame immediately below a 1-line nameFrame in the same middle band
                    if (bestCand.tf.paragraphs.length <= 1) {
                        for (var k2 = 0; k2 < candidates.length; k2++) {
                            var cd2 = candidates[k2];
                            if (cd2.tf === bestCand.tf || cd2.isRepeatedStatic) continue;
                            var midX1 = (bestCand.gb[0] + bestCand.gb[2]) / 2;
                            var midX2 = (cd2.gb[0] + cd2.gb[2]) / 2;
                            if (Math.abs(midX1 - midX2) < 35 && bestCand.gb[1] > cd2.gb[1] && (bestCand.gb[1] - cd2.gb[1]) < 30) {
                                if (this.hasStrongBiodataSignals(cd2.txt) || cd2.relX >= 0.20) {
                                    cardObj.detailsFrame = cd2.tf;
                                    break;
                                }
                            }
                        }
                    }
                }
                for (var sf = 0; sf < candidates.length; sf++) {
                    if (candidates[sf].tf !== cardObj.nameFrame && candidates[sf].tf !== cardObj.detailsFrame) {
                        cardObj.staticFrames.push(candidates[sf].tf);
                    }
                }
            }

            // Accept cards that have a student frame OR have an inner target box / border (for blank templates!)
            if (cardObj.nameFrame || cardObj.hasBorder) {
                penCards.push(cardObj);
            }
        }

        if (!penCards.length) return [];

        // 5. Pair external side qtyFrames (e.g. "20", "10", "30" sitting outside right edge of each strip)
        for (var qIdx = 0; qIdx < penCards.length; qIdx++) {
            var pCard = penCards[qIdx];
            if (pCard.qtyFrame) continue;
            var pb = pCard.bounds;
            var pRight = pb[2], pLeft = pb[0], pTop = pb[1], pBot = pb[3];
            var bestQty = null;
            var bestQtyDist = 9999;

            for (var dt = 0; dt < allDocTFs.length; dt++) {
                var dtf = allDocTFs[dt];
                if (this.isItemHidden(dtf) || dtf === pCard.nameFrame || dtf === pCard.detailsFrame) continue;
                var dRaw = (dtf.contents || "").replace(/^\s+|\s+$/g, "");
                if (!this._isPenQtyText(dRaw)) continue;

                var dgb = dtf.geometricBounds;
                var dMidY = (dgb[1] + dgb[3]) / 2;
                var isVertMatch = (dMidY <= pTop + 8 && dMidY >= pBot - 8);
                if (!isVertMatch) continue;

                var onRight = (dgb[0] >= pRight - 8 && dgb[0] <= pRight + 190);
                var onLeft = (sampleProfile && sampleProfile.qtySide === "left" && dgb[2] <= pLeft + 6 && dgb[2] >= pLeft - 140);
                if (!onRight && !onLeft) continue;

                // If inside border, reject year numbers
                var insideBorder = (dgb[0] >= pLeft - 2 && dgb[2] <= pRight + 2);
                if (insideBorder && this._isPenYearText(dRaw)) continue;

                // Ensure it doesn't cross over another column's card
                var crossed = false;
                for (var oc = 0; oc < penCards.length; oc++) {
                    if (oc === qIdx) continue;
                    var ob = penCards[oc].bounds;
                    if (onRight && ob[0] >= pRight - 5 && dgb[0] >= ob[0] - 2 && dMidY <= ob[1] + 8 && dMidY >= ob[3] - 8) {
                        crossed = true; break;
                    }
                    if (onLeft && ob[2] <= pLeft + 5 && dgb[2] <= ob[2] + 2 && dMidY <= ob[1] + 8 && dMidY >= ob[3] - 8) {
                        crossed = true; break;
                    }
                }
                if (crossed) continue;

                var dist = onRight ? Math.abs(dgb[0] - pRight) : Math.abs(pLeft - dgb[2]);
                if (dist < bestQtyDist) {
                    bestQtyDist = dist;
                    bestQty = dtf;
                }
            }
            if (bestQty) pCard.qtyFrame = bestQty;
        }

        // 6. Assign artboard index & sort cleanly
        var numABs = doc.artboards.length;
        for (var aIdx = 0; aIdx < penCards.length; aIdx++) {
            var pc = penCards[aIdx];
            var ab = pc.bounds;
            var midX = (ab[0] + ab[2]) / 2;
            var midY = (ab[1] + ab[3]) / 2;
            pc.artboardIndex = this.findArtboardForPoint(doc, midX, midY);
            if (pc.artboardIndex < 0 && numABs > 0) pc.artboardIndex = 0;
        }

        return this._sortPenCards(penCards, order || "column");
    },

    _sortPenCards: function(cards, order) {
        if (!cards || cards.length <= 1) return cards;
        var sheets = [];
        for (var i = 0; i < cards.length; i++) {
            var c = cards[i];
            var placed = false;
            for (var s = 0; s < sheets.length; s++) {
                if (sheets[s][0].artboardIndex === c.artboardIndex) {
                    sheets[s].push(c);
                    placed = true;
                    break;
                }
            }
            if (!placed) sheets.push([c]);
        }
        sheets.sort(function(a, b) { return a[0].artboardIndex - b[0].artboardIndex; });

        var result = [];
        for (var si = 0; si < sheets.length; si++) {
            var sc = sheets[si];
            sc.sort(function(a, b) {
                return ((a.bounds[0] + a.bounds[2]) / 2) - ((b.bounds[0] + b.bounds[2]) / 2);
            });

            // Adaptive column clustering based on card bounds width
            var cols = [];
            for (var k = 0; k < sc.length; k++) {
                var item = sc[k];
                var itemMidX = (item.bounds[0] + item.bounds[2]) / 2;
                var itemW = Math.max(40, item.bounds[2] - item.bounds[0]);
                var colPlaced = false;
                for (var ci = 0; ci < cols.length; ci++) {
                    var cMidX = (cols[ci][0].bounds[0] + cols[ci][0].bounds[2]) / 2;
                    if (Math.abs(cMidX - itemMidX) < itemW * 0.55) {
                        cols[ci].push(item);
                        colPlaced = true;
                        break;
                    }
                }
                if (!colPlaced) cols.push([item]);
            }

            for (var ci2 = 0; ci2 < cols.length; ci2++) {
                cols[ci2].sort(function(a, b) { return b.bounds[1] - a.bounds[1]; });
            }

            if (order === "zigzag") {
                var maxR = 0;
                for (var r = 0; r < cols.length; r++) {
                    if (cols[r].length > maxR) maxR = cols[r].length;
                }
                for (var row = 0; row < maxR; row++) {
                    for (var col = 0; col < cols.length; col++) {
                        if (row < cols[col].length) result.push(cols[col][row]);
                    }
                }
            } else {
                for (var col2 = 0; col2 < cols.length; col2++) {
                    for (var row2 = 0; row2 < cols[col2].length; row2++) {
                        result.push(cols[col2][row2]);
                    }
                }
            }
        }
        return result;
    },

    _readParaStyleAttrs: function(para, fallbackFont, fallbackSize, fallbackColor) {
        var st = {
            font: fallbackFont || null,
            fontName: fallbackFont ? (fallbackFont.name || "") : "",
            size: fallbackSize || 8.0,
            autoLeading: true,
            leading: (fallbackSize || 8.0) * 1.15,
            tracking: 0,
            verticalScale: 100.0,
            color: fallbackColor || null,
            just: (typeof Justification !== "undefined") ? Justification.LEFT : null
        };
        if (!para) return st;
        try {
            if (para.characters && para.characters.length > 0) {
                var ca = para.characters[0].characterAttributes;
                if (ca.textFont) {
                    st.font = ca.textFont;
                    st.fontName = ca.textFont.name || "";
                }
                if (ca.size > 0) st.size = ca.size;
                try { st.autoLeading = !!ca.autoLeading; } catch(ae) {}
                if (ca.leading > 0) st.leading = ca.leading;
                if (typeof ca.tracking === "number") st.tracking = ca.tracking;
                if (ca.verticalScale > 0) st.verticalScale = ca.verticalScale;
                if (ca.fillColor && ca.fillColor.typename !== "NoColor") {
                    st.color = this._clonePenColor(ca.fillColor);
                }
            }
            if (para.paragraphAttributes) {
                try { st.just = para.paragraphAttributes.justification; } catch(je) {}
            }
        } catch(e) {}
        return st;
    },

    _measurePenClearMiddleGap: function(card) {
        if (!card) return null;
        var cB = card.bounds;
        var cL = cB[0], cR = cB[2], cT = cB[1], cBtm = cB[3];
        var cW = cR - cL;

        // Gather all items inside the card that sit left or right of the middle student text frame
        var leftEdgeR = cL + 3.0;
        var rightEdgeL = cR - 3.0;
        var tfLeft = card.nameFrame ? card.nameFrame.geometricBounds[0] : (cL + cW * 0.25);

        var itemsToCheck = [];
        if (card.staticFrames) {
            for (var s = 0; s < card.staticFrames.length; s++) itemsToCheck.push(card.staticFrames[s]);
        }
        if (card.group && card.group.pageItems) {
            for (var pi = 0; pi < card.group.pageItems.length; pi++) {
                var sub = card.group.pageItems[pi];
                if (!sub || this.isItemHidden(sub) || sub === card.nameFrame || sub === card.detailsFrame || sub === card.qtyFrame) continue;
                var sg = sub.geometricBounds;
                var sw = Math.abs(sg[2] - sg[0]);
                // Ignore the outer border path itself
                if (sw >= cW * 0.85) continue;
                itemsToCheck.push(sub);
            }
        }

        for (var i = 0; i < itemsToCheck.length; i++) {
            var it = itemsToCheck[i];
            if (!it || !it.geometricBounds) continue;
            var gb = it.geometricBounds;
            var itL = Math.min(gb[0], gb[2]);
            var itR = Math.max(gb[0], gb[2]);
            var itW = itR - itL;
            if (itW >= cW * 0.70) continue;

            if (itR <= tfLeft + 4.0 && itL < cL + cW * 0.35) {
                if (itR > leftEdgeR) leftEdgeR = itR;
            } else if (itL >= tfLeft + 15.0 && itR > cL + cW * 0.55) {
                if (itL < rightEdgeL) rightEdgeL = itL;
            }
        }

        var gapW = (rightEdgeL - leftEdgeR) - 2.0;
        if (gapW >= 25.0) {
            return { leftX: leftEdgeR + 1.0, rightX: rightEdgeL - 1.0, width: gapW };
        }
        return null;
    },

    _buildPenProfileFromCard: function(doc, card, makeBold) {
        var bornomala = this.getBornomalaFonts();
        var boldFont = bornomala.bold;
        var regFont = bornomala.regular || boldFont;
        var isCMYK = doc ? (doc.documentColorSpace === DocumentColorSpace.CMYK) : true;
        var blackCol = new CMYKColor();
        blackCol.cyan = 0; blackCol.magenta = 0; blackCol.yellow = 0; blackCol.black = 100;
        if (!isCMYK) {
            blackCol = new RGBColor();
            blackCol.red = 0; blackCol.green = 0; blackCol.blue = 0;
        }

        var nameSt = this._readParaStyleAttrs(null, boldFont, 8.0, blackCol);
        var fatherSt = this._readParaStyleAttrs(null, regFont, 7.0, blackCol);
        var lastSt = this._readParaStyleAttrs(null, regFont, 6.0, blackCol);

        if (card && card.nameFrame && card.nameFrame.paragraphs && card.nameFrame.paragraphs.length > 0) {
            var paras = card.nameFrame.paragraphs;
            nameSt = this._readParaStyleAttrs(paras[0], boldFont, 8.0, blackCol);
            if (makeBold) {
                nameSt.font = this._resolvePenFontVariant(nameSt.font, true);
                nameSt.fontName = nameSt.font ? (nameSt.font.name || "") : nameSt.fontName;
            }
            if (paras.length >= 2) {
                fatherSt = this._readParaStyleAttrs(paras[1], regFont, Math.max(4.5, nameSt.size * 0.9), blackCol);
            } else if (card.detailsFrame && card.detailsFrame.paragraphs.length > 0) {
                fatherSt = this._readParaStyleAttrs(card.detailsFrame.paragraphs[0], regFont, Math.max(4.5, nameSt.size * 0.9), blackCol);
            } else {
                fatherSt = this._readParaStyleAttrs(null, this._resolvePenFontVariant(nameSt.font, false), Math.max(4.5, nameSt.size * 0.9), blackCol);
            }
            if (paras.length >= 3) {
                lastSt = this._readParaStyleAttrs(paras[paras.length - 1], fatherSt.font, Math.max(4.0, fatherSt.size * 0.85), fatherSt.color || blackCol);
            } else if (card.detailsFrame && card.detailsFrame.paragraphs.length >= 2) {
                lastSt = this._readParaStyleAttrs(card.detailsFrame.paragraphs[card.detailsFrame.paragraphs.length - 1], fatherSt.font, fatherSt.size, fatherSt.color || blackCol);
            } else {
                lastSt = this._readParaStyleAttrs(null, fatherSt.font, fatherSt.size, fatherSt.color || blackCol);
                lastSt.just = fatherSt.just;
            }
        }

        var qtyInfo = {
            font: boldFont,
            fontName: boldFont ? (boldFont.name || "") : "",
            size: 12.0,
            autoLeading: true,
            leading: 12.0,
            hScale: 100.0,
            tracking: 0,
            color: blackCol,
            just: (typeof Justification !== "undefined") ? Justification.LEFT : null,
            isEnglishDigits: true,
            prefix: "",
            suffix: "",
            offsetX: 6.0,
            offsetMidY: 0.0,
            side: "right"
        };

        if (card && card.qtyFrame) {
            var qParas = card.qtyFrame.paragraphs;
            var qSt = this._readParaStyleAttrs((qParas && qParas.length > 0) ? qParas[0] : null, boldFont, 12.0, blackCol);
            qtyInfo.font = qSt.font;
            qtyInfo.fontName = qSt.fontName;
            qtyInfo.size = qSt.size;
            qtyInfo.autoLeading = qSt.autoLeading;
            qtyInfo.leading = qSt.leading;
            qtyInfo.tracking = qSt.tracking;
            qtyInfo.color = qSt.color || blackCol;
            qtyInfo.just = qSt.just;
            try {
                if (card.qtyFrame.characters.length > 0 && card.qtyFrame.characters[0].characterAttributes.horizontalScale > 0) {
                    qtyInfo.hScale = card.qtyFrame.characters[0].characterAttributes.horizontalScale;
                }
            } catch(qhe) {}

            var qRawTxt = (card.qtyFrame.contents || "").replace(/^\s+|\s+$/g, "");
            var hasEn = /[0-9]/.test(qRawTxt);
            var hasBn = /[\u09E6-\u09EF]/.test(qRawTxt);
            if (hasBn && !hasEn) qtyInfo.isEnglishDigits = false;
            else if (hasEn) qtyInfo.isEnglishDigits = true;
            else if (qtyInfo.font && /bornomala|sutonny/i.test(qtyInfo.fontName) && !/ansi/i.test(qtyInfo.fontName)) {
                qtyInfo.isEnglishDigits = false;
            }

            var qMatch = qRawTxt.match(/^(.*?)([0-9\u09E6-\u09EF]+)(.*)$/);
            if (qMatch) {
                qtyInfo.prefix = qMatch[1] || "";
                qtyInfo.suffix = qMatch[3] || "";
            }

            var qGb = card.qtyFrame.geometricBounds;
            var cGb = card.bounds;
            var cMidY = (cGb[1] + cGb[3]) / 2;
            var qMidY = (qGb[1] + qGb[3]) / 2;
            qtyInfo.offsetMidY = qMidY - cMidY;
            if (qGb[2] <= cGb[0] + 6) {
                qtyInfo.side = "left";
                qtyInfo.offsetX = cGb[0] - qGb[2];
            } else {
                qtyInfo.side = "right";
                qtyInfo.offsetX = qGb[0] - cGb[2];
            }
        }

        // Compute target zone geometry from innerBoxBounds or Card #1's text frame & middle gap
        var boxW = 0, boxH = 0, offLeft = 0, offMidY = 0, relMidX = 0.5;
        if (card) {
            var cb = card.bounds;
            var cbL = cb[0], cbT = cb[1], cbR = cb[2], cbB = cb[3];
            var cbW = Math.max(1, cbR - cbL);
            var cbMidY = (cbT + cbB) / 2;
            var clearGap = this._measurePenClearMiddleGap(card);

            if (card.innerBoxBounds) {
                var ib = card.innerBoxBounds;
                boxW = ib[2] - ib[0];
                boxH = ib[1] - ib[3];
                offLeft = ib[0] - cbL;
                offMidY = ((ib[1] + ib[3]) / 2) - cbMidY;
                relMidX = (((ib[0] + ib[2]) / 2) - cbL) / cbW;
            } else if (card.nameFrame) {
                var ngb = card.nameFrame.geometricBounds;
                var nW = Math.abs(ngb[2] - ngb[0]);
                var nH = Math.abs(ngb[1] - ngb[3]);
                var nMidY = (ngb[1] + ngb[3]) / 2;
                var isArea = false;
                try { isArea = (typeof TextType !== "undefined" && card.nameFrame.kind === TextType.AREATEXT); } catch(ake) {}

                offLeft = ngb[0] - cbL;
                offMidY = nMidY - cbMidY;
                relMidX = (((ngb[0] + ngb[2]) / 2) - cbL) / cbW;

                if (isArea) {
                    boxW = nW;
                    boxH = nH;
                } else if (clearGap) {
                    if (ngb[2] <= clearGap.rightX + 2.5 && nW >= 25.0) {
                        boxW = (nW >= clearGap.width * 0.72) ? nW : clearGap.width;
                    } else {
                        boxW = Math.max(25.0, clearGap.rightX - ngb[0]);
                    }
                    boxH = Math.max(nH, (cbT - cbB) * 0.78);
                } else {
                    if (!card.hasBorder) {
                        boxW = (nW >= 15.0) ? nW : Math.max(25.0, nW);
                        boxH = nH;
                    } else if (cbW <= 85.0 && nW <= cbW + 1.0) {
                        boxW = (nW >= 25.0) ? nW : cbW;
                        boxH = Math.max(nH, (cbT - cbB) * 0.85);
                    } else {
                        if (nW >= 25.0 && ngb[2] <= cbR - 1.0) boxW = nW;
                        else boxW = Math.max(25.0, (cbR - ngb[0]) - 3.0);
                        boxH = Math.max(nH, (cbT - cbB) * 0.78);
                    }
                }
            } else if (clearGap) {
                boxW = clearGap.width;
                boxH = (cbT - cbB) * 0.78;
                offLeft = clearGap.leftX - cbL;
                offMidY = 0;
            } else {
                boxW = Math.max(25.0, cbW - 8.0);
                boxH = (cbT - cbB) * 0.78;
                offLeft = 4.0;
                offMidY = 0;
            }
        }

        return {
            name: nameSt,
            father: fatherSt,
            lastLine: lastSt,
            qty: qtyInfo,
            boxWidthPt: boxW,
            boxHeightPt: boxH,
            offsetLeftPt: offLeft,
            offsetMidYPt: offMidY,
            relCenterX: relMidX,
            cardWidthPt: card ? (card.bounds[2] - card.bounds[0]) : 0,
            cardHeightPt: card ? (card.bounds[1] - card.bounds[3]) : 0
        };
    },

    pickPenSample: function() {
        var doc = this.getActiveDoc();
        if (!doc) return JSON.stringify({ status: "error", message: "No active Illustrator document found." });
        var sel = doc.selection;
        if (!sel || !sel.length) {
            return JSON.stringify({ status: "error", message: "Please select 1st Pen card (or its text frame) on canvas first." });
        }

        var cards = this.detectPenCards(doc, "selection", "column", null);
        var pickedCard = cards.length > 0 ? cards[0] : null;
        if (!pickedCard) {
            // If user selected only the inner TextFrame, match its containing card on the artboard
            var selTFs = [];
            this.collectTextFrames(sel, selTFs);
            if (selTFs.length > 0) {
                var targetTF = selTFs[0];
                var abCards = this.detectPenCards(doc, "artboard", "column", null);
                for (var i = 0; i < abCards.length; i++) {
                    if (abCards[i].nameFrame === targetTF || abCards[i].detailsFrame === targetTF) {
                        pickedCard = abCards[i];
                        break;
                    }
                    if (abCards[i].allFrames) {
                        for (var f = 0; f < abCards[i].allFrames.length; f++) {
                            if (abCards[i].allFrames[f] === targetTF) {
                                abCards[i].nameFrame = targetTF;
                                pickedCard = abCards[i];
                                break;
                            }
                        }
                    }
                    if (pickedCard) break;
                }
                if (!pickedCard) {
                    var tgb = targetTF.geometricBounds;
                    pickedCard = {
                        group: null,
                        bounds: [Math.min(tgb[0], tgb[2]), Math.max(tgb[1], tgb[3]), Math.max(tgb[0], tgb[2]), Math.min(tgb[1], tgb[3])],
                        hasBorder: false,
                        innerBoxBounds: null,
                        nameFrame: targetTF,
                        detailsFrame: null,
                        qtyFrame: null,
                        staticFrames: []
                    };
                }
            }
        }

        if (!pickedCard || !pickedCard.nameFrame) {
            return JSON.stringify({ status: "error", message: "Could not detect student text frame inside your selection." });
        }

        var prof = this._buildPenProfileFromCard(doc, pickedCard, false);
        var nameColInfo = this._serializePenColor(prof.name.color, doc);
        var fatherColInfo = this._serializePenColor(prof.father.color, doc);
        var lastColInfo = this._serializePenColor(prof.lastLine.color, doc);
        var qtyColInfo = this._serializePenColor(prof.qty.color, doc);

        var cb = pickedCard.bounds;
        var sample = {
            cardMidX: (cb[0] + cb[2]) / 2,
            cardMidY: (cb[1] + cb[3]) / 2,
            relCenterX: Math.round(prof.relCenterX * 1000) / 1000,
            boxWidthMm: Math.round(this._ptToMm(prof.boxWidthPt) * 10) / 10,
            boxHeightMm: Math.round(this._ptToMm(prof.boxHeightPt) * 10) / 10,
            offsetLeftPt: prof.offsetLeftPt,
            offsetMidYPt: prof.offsetMidYPt,
            fontName: prof.name.fontName,
            nameColorHex: nameColInfo.hex,
            qtySide: prof.qty.side,
            name: {
                fontName: prof.name.fontName,
                size: prof.name.size,
                autoLeading: prof.name.autoLeading,
                leading: prof.name.leading,
                tracking: prof.name.tracking,
                verticalScale: prof.name.verticalScale,
                just: prof.name.just ? String(prof.name.just) : "",
                color: nameColInfo
            },
            father: {
                fontName: prof.father.fontName,
                size: prof.father.size,
                autoLeading: prof.father.autoLeading,
                leading: prof.father.leading,
                tracking: prof.father.tracking,
                verticalScale: prof.father.verticalScale,
                just: prof.father.just ? String(prof.father.just) : "",
                color: fatherColInfo
            },
            lastLine: {
                fontName: prof.lastLine.fontName,
                size: prof.lastLine.size,
                autoLeading: prof.lastLine.autoLeading,
                leading: prof.lastLine.leading,
                tracking: prof.lastLine.tracking,
                verticalScale: prof.lastLine.verticalScale,
                just: prof.lastLine.just ? String(prof.lastLine.just) : "",
                color: lastColInfo
            },
            qty: {
                fontName: prof.qty.fontName,
                size: prof.qty.size,
                autoLeading: prof.qty.autoLeading,
                leading: prof.qty.leading,
                hScale: prof.qty.hScale,
                tracking: prof.qty.tracking,
                just: prof.qty.just ? String(prof.qty.just) : "",
                color: qtyColInfo,
                isEnglishDigits: prof.qty.isEnglishDigits,
                prefix: prof.qty.prefix,
                suffix: prof.qty.suffix,
                offsetX: prof.qty.offsetX,
                offsetMidY: prof.qty.offsetMidY,
                side: prof.qty.side
            }
        };

        var summary = "Locked Card 1: " + (prof.name.fontName || "Template") +
                      (nameColInfo.hex ? (" \u2022 " + nameColInfo.hex) : "") +
                      " \u2022 " + sample.boxWidthMm + "\u00D7" + sample.boxHeightMm + " mm";

        return JSON.stringify({
            status: "success",
            sample: sample,
            summary: summary,
            message: summary
        });
    },

    pickPenBox: function() {
        var doc = this.getActiveDoc();
        if (!doc) return JSON.stringify({ status: "error", message: "No active Illustrator document found." });
        var sel = doc.selection;
        if (!sel || !sel.length) {
            return JSON.stringify({ status: "error", message: "Select target box rectangle (e.g. 25x5mm) on canvas first." });
        }

        var item = sel[0];
        var gb = item.geometricBounds;
        if (!gb) {
            return JSON.stringify({ status: "error", message: "Could not measure selected object." });
        }
        var bL = Math.min(gb[0], gb[2]);
        var bR = Math.max(gb[0], gb[2]);
        var bT = Math.max(gb[1], gb[3]);
        var bB = Math.min(gb[1], gb[3]);
        var wPt = bR - bL;
        var hPt = bT - bB;
        if (wPt <= 2 || hPt <= 1) {
            return JSON.stringify({ status: "error", message: "Selected box has zero width or height." });
        }

        var widthMm = Math.round(this._ptToMm(wPt) * 10) / 10;
        var heightMm = Math.round(this._ptToMm(hPt) * 10) / 10;
        var boxMidX = (bL + bR) / 2;
        var boxMidY = (bT + bB) / 2;

        // Check if this box sits inside one of the Pen cards on the artboard
        var offsetLeftPt = null;
        var offsetMidYPt = null;
        var relCenterX = null;
        var cards = this.detectPenCards(doc, "artboard", "column", null);
        if (!cards.length) cards = this.detectPenCards(doc, "all_artboards", "column", null);
        for (var c = 0; c < cards.length; c++) {
            var cb = cards[c].bounds;
            if (boxMidX >= cb[0] && boxMidX <= cb[2] && boxMidY <= cb[1] + 2 && boxMidY >= cb[3] - 2) {
                if (wPt <= (cb[2] - cb[0]) * 0.92) {
                    offsetLeftPt = bL - cb[0];
                    offsetMidYPt = boxMidY - ((cb[1] + cb[3]) / 2);
                    relCenterX = (boxMidX - cb[0]) / Math.max(1, cb[2] - cb[0]);
                }
                break;
            }
        }

        return JSON.stringify({
            status: "success",
            box: {
                widthMm: widthMm,
                heightMm: heightMm,
                widthPt: wPt,
                heightPt: hPt,
                offsetLeftPt: offsetLeftPt,
                offsetMidYPt: offsetMidYPt,
                relCenterX: relCenterX
            },
            message: "Box Locked: " + widthMm + " \u00D7 " + heightMm + " mm"
        });
    },

    _parseJustificationStr: function(jStr) {
        if (!jStr || typeof Justification === "undefined") return null;
        if (jStr.indexOf("CENTER") !== -1) return Justification.CENTER;
        if (jStr.indexOf("RIGHT") !== -1) return Justification.RIGHT;
        if (jStr.indexOf("LEFT") !== -1) return Justification.LEFT;
        return null;
    },

    _mergePenProfileWithSample: function(doc, cards, sampleProfile, boxProfile, payload) {
        var makeBold = (payload && payload.makeBold !== false);
        var refCard = null;

        if (sampleProfile && sampleProfile.cardMidX !== undefined && cards.length > 0) {
            var bestDist = 9999;
            for (var c = 0; c < cards.length; c++) {
                var cb = cards[c].bounds;
                var cmx = (cb[0] + cb[2]) / 2;
                var cmy = (cb[1] + cb[3]) / 2;
                var d = Math.abs(cmx - sampleProfile.cardMidX) + Math.abs(cmy - sampleProfile.cardMidY);
                if (d < 25 && d < bestDist) {
                    bestDist = d;
                    refCard = cards[c];
                }
            }
        }
        if (!refCard && cards.length > 0) {
            // Prefer Card 0, or if Card 0 has no text frame pick first card with a nameFrame
            refCard = cards[0];
            if (!refCard.nameFrame) {
                for (var c2 = 0; c2 < cards.length; c2++) {
                    if (cards[c2].nameFrame) { refCard = cards[c2]; break; }
                }
            }
        }

        var prof = this._buildPenProfileFromCard(doc, refCard, makeBold);

        // If user explicitly locked a Sample Card (e.g. from Artboard 1 while filling Artboard 2), apply its attributes
        if (sampleProfile && sampleProfile.name) {
            var applySerialized = function(dst, src) {
                if (!src) return;
                var f = CardAutoFiller._findFontByName(src.fontName);
                if (f) { dst.font = f; dst.fontName = f.name || src.fontName; }
                if (src.size > 0) dst.size = src.size;
                dst.autoLeading = !!src.autoLeading;
                if (src.leading > 0) dst.leading = src.leading;
                if (typeof src.tracking === "number") dst.tracking = src.tracking;
                if (src.verticalScale > 0) dst.verticalScale = src.verticalScale;
                var col = CardAutoFiller._deserializePenColor(src.color, doc);
                if (col) dst.color = col;
                var j = CardAutoFiller._parseJustificationStr(src.just);
                if (j !== null) dst.just = j;
            };
            applySerialized(prof.name, sampleProfile.name);
            if (makeBold) {
                prof.name.font = this._resolvePenFontVariant(prof.name.font, true);
                prof.name.fontName = prof.name.font ? (prof.name.font.name || "") : prof.name.fontName;
            }
            applySerialized(prof.father, sampleProfile.father);
            applySerialized(prof.lastLine, sampleProfile.lastLine);
            if (sampleProfile.qty) {
                var qf = this._findFontByName(sampleProfile.qty.fontName);
                if (qf) { prof.qty.font = qf; prof.qty.fontName = qf.name || sampleProfile.qty.fontName; }
                if (sampleProfile.qty.size > 0) prof.qty.size = sampleProfile.qty.size;
                prof.qty.autoLeading = !!sampleProfile.qty.autoLeading;
                if (sampleProfile.qty.leading > 0) prof.qty.leading = sampleProfile.qty.leading;
                if (sampleProfile.qty.hScale > 0) prof.qty.hScale = sampleProfile.qty.hScale;
                if (typeof sampleProfile.qty.tracking === "number") prof.qty.tracking = sampleProfile.qty.tracking;
                var qCol = this._deserializePenColor(sampleProfile.qty.color, doc);
                if (qCol) prof.qty.color = qCol;
                var qj = this._parseJustificationStr(sampleProfile.qty.just);
                if (qj !== null) prof.qty.just = qj;
                prof.qty.isEnglishDigits = (sampleProfile.qty.isEnglishDigits !== false);
                prof.qty.prefix = sampleProfile.qty.prefix || "";
                prof.qty.suffix = sampleProfile.qty.suffix || "";
                if (typeof sampleProfile.qty.offsetX === "number") prof.qty.offsetX = sampleProfile.qty.offsetX;
                if (typeof sampleProfile.qty.offsetMidY === "number") prof.qty.offsetMidY = sampleProfile.qty.offsetMidY;
                if (sampleProfile.qty.side) prof.qty.side = sampleProfile.qty.side;
            }
            if (sampleProfile.boxWidthMm > 0) prof.boxWidthPt = this._mmToPt(sampleProfile.boxWidthMm);
            if (sampleProfile.boxHeightMm > 0) prof.boxHeightPt = this._mmToPt(sampleProfile.boxHeightMm);
            if (typeof sampleProfile.offsetLeftPt === "number") prof.offsetLeftPt = sampleProfile.offsetLeftPt;
            if (typeof sampleProfile.offsetMidYPt === "number") prof.offsetMidYPt = sampleProfile.offsetMidYPt;
            if (typeof sampleProfile.relCenterX === "number") prof.relCenterX = sampleProfile.relCenterX;
        }

        // Apply Picked Box geometry if provided
        if (boxProfile) {
            if (boxProfile.widthMm > 0) prof.boxWidthPt = this._mmToPt(boxProfile.widthMm);
            if (boxProfile.heightMm > 0) prof.boxHeightPt = this._mmToPt(boxProfile.heightMm);
            if (typeof boxProfile.offsetLeftPt === "number" && boxProfile.offsetLeftPt !== null) {
                prof.offsetLeftPt = boxProfile.offsetLeftPt;
            }
            if (typeof boxProfile.offsetMidYPt === "number" && boxProfile.offsetMidYPt !== null) {
                prof.offsetMidYPt = boxProfile.offsetMidYPt;
            }
        }

        // Explicit UI mm overrides take highest priority
        var customWMm = payload ? parseFloat(payload.targetWidthMm) : 0;
        var customHMm = payload ? parseFloat(payload.targetHeightMm) : 0;
        prof.hasExplicitHeightLimit = false;
        if (!isNaN(customWMm) && customWMm > 0) {
            prof.boxWidthPt = this._mmToPt(customWMm);
        }
        if (!isNaN(customHMm) && customHMm > 0) {
            prof.boxHeightPt = this._mmToPt(customHMm);
            prof.hasExplicitHeightLimit = true;
        } else if (boxProfile && boxProfile.heightMm > 0) {
            prof.hasExplicitHeightLimit = true;
        }

        // Optional user color override
        if (payload && payload.overrideColor === true) {
            var isCMYK = doc ? (doc.documentColorSpace === DocumentColorSpace.CMYK) : true;
            var ovColor = null;
            if (isCMYK && payload.nameCmyk && payload.nameCmyk.length >= 4) {
                var uc = new CMYKColor();
                uc.cyan = Math.max(0, Math.min(100, Math.round(Number(payload.nameCmyk[0]))));
                uc.magenta = Math.max(0, Math.min(100, Math.round(Number(payload.nameCmyk[1]))));
                uc.yellow = Math.max(0, Math.min(100, Math.round(Number(payload.nameCmyk[2]))));
                uc.black = Math.max(0, Math.min(100, Math.round(Number(payload.nameCmyk[3]))));
                ovColor = uc;
            } else if (payload.nameColor) {
                ovColor = this.hexToColor(String(payload.nameColor), isCMYK);
            }
            if (ovColor) prof.name.color = ovColor;
        }

        // Optional Qty digit format override
        if (payload && payload.qtyFormat === "en") prof.qty.isEnglishDigits = true;
        else if (payload && payload.qtyFormat === "bn") prof.qty.isEnglishDigits = false;

        prof.refCard = refCard;
        return prof;
    },

    scanPenCards: function(payloadJson) {
        var doc = this.getActiveDoc();
        if (!doc) return JSON.stringify({ status: "error", message: "No active Illustrator document found." });

        var payload = {};
        try { if (payloadJson) payload = JSON.parse(payloadJson); } catch(e) {}

        var cards = this.detectPenCards(doc, payload.scope || "artboard", payload.order || "column", payload.sampleProfile || null);
        if (!cards.length) {
            return JSON.stringify({
                status: "success",
                count: 0,
                summary: "No Pen strip cards detected on this scope.",
                message: "No Pen strip cards detected. Check Scope or select cards directly."
            });
        }

        var prof = this._mergePenProfileWithSample(doc, cards, payload.sampleProfile || null, payload.boxProfile || null, payload);
        var wMm = Math.round(this._ptToMm(prof.boxWidthPt) * 10) / 10;
        var hMm = Math.round(this._ptToMm(prof.boxHeightPt) * 10) / 10;
        var colInfo = this._serializePenColor(prof.name.color, doc);
        var summary = cards.length + " Pen Cards \u2022 " + wMm + "\u00D7" + hMm + "mm" +
                      (prof.name.fontName ? (" \u2022 " + prof.name.fontName) : "") +
                      (colInfo.hex ? (" " + colInfo.hex) : "");

        return JSON.stringify({
            status: "success",
            count: cards.length,
            widthMm: wMm,
            heightMm: hMm,
            summary: summary,
            message: "Found " + summary
        });
    },

    _applyPenParaStyle: function(para, st, hScaleOverride, sizeOverride, leadingOverride) {
        if (!para || !st) return;
        var targetSize = (sizeOverride && sizeOverride > 0) ? sizeOverride : st.size;
        var targetHScale = (hScaleOverride && hScaleOverride > 0) ? hScaleOverride : 100.0;
        var targetLead = st.leading;
        if (leadingOverride && leadingOverride > 0) {
            targetLead = leadingOverride;
        } else if (!st.autoLeading && st.leading > 0 && st.size > 0 && targetSize !== st.size) {
            targetLead = st.leading * (targetSize / st.size);
        }

        var applyToCA = function(ca) {
            if (!ca) return;
            try { if (st.font) ca.textFont = st.font; } catch(fe) {}
            try { if (targetSize > 0) ca.size = targetSize; } catch(se) {}
            try {
                if (st.autoLeading && !leadingOverride) {
                    ca.autoLeading = true;
                } else if (targetLead > 0) {
                    ca.autoLeading = false;
                    ca.leading = targetLead;
                }
            } catch(le) {}
            try { ca.horizontalScale = targetHScale; } catch(he) {}
            try { if (st.verticalScale > 0) ca.verticalScale = st.verticalScale; } catch(ve) {}
            try { ca.tracking = st.tracking; } catch(te) {}
            try { if (st.color) ca.fillColor = st.color; } catch(ce) {}
        };

        var appliedFast = false;
        try {
            if (para.characterAttributes) {
                applyToCA(para.characterAttributes);
                appliedFast = true;
            }
        } catch(pe) {}
        var needCharFallback = !appliedFast;
        if (appliedFast && para.characters && para.characters.length > 0) {
            try {
                var checkCA = para.characters[0].characterAttributes;
                if (Math.abs((checkCA.horizontalScale || 100) - targetHScale) > 0.6) {
                    needCharFallback = true;
                }
            } catch(chkE) { needCharFallback = true; }
        }
        if (needCharFallback) {
            try {
                if (para.characters) {
                    for (var c = 0; c < para.characters.length; c++) {
                        applyToCA(para.characters[c].characterAttributes);
                    }
                }
            } catch(ce2) {}
        }
        try {
            if (para.paragraphAttributes) {
                if (st.just !== null) para.paragraphAttributes.justification = st.just;
                para.paragraphAttributes.spaceBefore = 0;
                para.paragraphAttributes.spaceAfter = 0;
            }
        } catch(pae) {}
    },

    _computePenLineFit: function(probe, pText, st, targetWidthPt, minScale, maxScale, minFontSize, isHeader) {
        var result = { hScale: 100, size: st.size };
        if (!pText || !targetWidthPt || targetWidthPt <= 0) return result;

        var fitMaxPt = Math.max(8.0, targetWidthPt - 0.3);
        var charAttr = {
            textFont: st.font,
            size: st.size,
            tracking: st.tracking
        };

        var curW = this._measureParaWidthPt(probe, pText, charAttr, 100, isHeader, st.size);

        if (curW > fitMaxPt) {
            var targetScale = Math.floor(100 * (fitMaxPt / curW));
            if (targetScale > 100) targetScale = 100;
            if (targetScale < minScale) targetScale = minScale;

            var scaledW = this._measureParaWidthPt(probe, pText, charAttr, targetScale, isHeader, st.size);
            if (scaledW > fitMaxPt && targetScale > minScale) {
                var refined = Math.floor(targetScale * (fitMaxPt / scaledW));
                if (refined >= targetScale) refined = targetScale - 1;
                targetScale = Math.max(minScale, refined);
                scaledW = this._measureParaWidthPt(probe, pText, charAttr, targetScale, isHeader, st.size);
                for (var n = 0; n < 4 && scaledW > fitMaxPt && targetScale > minScale; n++) {
                    targetScale--;
                    scaledW = this._measureParaWidthPt(probe, pText, charAttr, targetScale, isHeader, st.size);
                }
            } else if (scaledW <= fitMaxPt && targetScale < 100) {
                for (var b = 0; b < 3 && (targetScale + 1) <= 100; b++) {
                    var testW = this._measureParaWidthPt(probe, pText, charAttr, targetScale + 1, isHeader, st.size);
                    if (testW <= fitMaxPt) {
                        targetScale++;
                        scaledW = testW;
                    } else {
                        break;
                    }
                }
            }

            result.hScale = targetScale;
            if (targetScale <= minScale && scaledW > fitMaxPt && st.size > minFontSize) {
                var neededSize = Math.max(minFontSize, Math.floor(st.size * (fitMaxPt / scaledW) * 10) / 10);
                result.size = neededSize;
                charAttr.size = neededSize;
                var reW = this._measureParaWidthPt(probe, pText, charAttr, targetScale, isHeader, neededSize);
                if (reW > fitMaxPt && neededSize > minFontSize) {
                    result.size = Math.max(minFontSize, Math.floor(neededSize * (fitMaxPt / reW) * 10) / 10);
                }
            }
        } else if (curW < fitMaxPt && maxScale > 100) {
            var expandScale = Math.floor(100 * (fitMaxPt / curW));
            expandScale = Math.min(maxScale, Math.max(100, expandScale));
            var expW = this._measureParaWidthPt(probe, pText, charAttr, expandScale, isHeader, st.size);
            for (var en = 0; en < 4 && expW > fitMaxPt && expandScale > 100; en++) {
                expandScale--;
                expW = this._measureParaWidthPt(probe, pText, charAttr, expandScale, isHeader, st.size);
            }
            while (expandScale < maxScale && expW < fitMaxPt) {
                var nextW = this._measureParaWidthPt(probe, pText, charAttr, expandScale + 1, isHeader, st.size);
                if (nextW <= fitMaxPt) {
                    expandScale++;
                    expW = nextW;
                } else {
                    break;
                }
            }
            result.hScale = expandScale;
        }

        return result;
    },

    _applyPenCardEntry: function(doc, probe, card, refCard, prof, lines, qtyStr, opts) {
        if (!card || !lines || !lines.length) return false;

        // 1. Ensure target nameFrame exists (if card was blank, clone from refCard.nameFrame)
        var tf = card.nameFrame;
        if (!tf && refCard && refCard.nameFrame) {
            try {
                tf = refCard.nameFrame.duplicate();
                if (card.group) {
                    tf.moveToBeginning(card.group);
                }
                card.nameFrame = tf;
            } catch(dupErr) {}
        }
        if (!tf) return false;

        // If card had a separate detailsFrame from an unformatted split, absorb or clear it cleanly
        if (card.detailsFrame && card.detailsFrame !== tf) {
            try {
                card.detailsFrame.contents = "";
                card.detailsFrame.remove();
            } catch(dfe) {}
            card.detailsFrame = null;
        }

        var origGb = null;
        try { origGb = tf.geometricBounds; } catch(gbe) {}
        var origLeft = origGb ? Math.min(origGb[0], origGb[2]) : null;
        var origMidY = origGb ? ((origGb[1] + origGb[3]) / 2) : null;

        // Clean lines array
        var cleanLines = [];
        for (var li = 0; li < lines.length; li++) {
            var ln = String(lines[li] || "").replace(/^\s+|\s+$/g, "");
            if (ln) cleanLines.push(ln);
        }
        if (!cleanLines.length) return false;

        tf.contents = cleanLines.join("\r");

        // Resolve per-paragraph styles
        var keepCard1Style = (opts.keepCard1Style !== false);
        var makeBold = (opts.makeBold !== false);
        var expandShort = (opts.expandShort !== false);
        var autoFit = (opts.autoFit !== false);

        var nameSt = prof.name;
        var fatherSt = prof.father;
        var lastSt = prof.lastLine;

        if (!keepCard1Style && card === refCard) {
            nameSt = this._readParaStyleAttrs(tf.paragraphs[0], prof.name.font, prof.name.size, prof.name.color);
            if (makeBold) nameSt.font = this._resolvePenFontVariant(nameSt.font, true);
        }

        var paraCount = tf.paragraphs.length;
        var lineFits = [];
        var minNameH = opts.minNameHScale || 45;
        var maxNameH = expandShort ? (opts.maxNameHScale || 130) : 100;
        var minFatherH = opts.minFatherHScale || 45;
        var maxFatherH = expandShort ? (opts.maxFatherHScale || 115) : 100;
        var minLastH = opts.minLastHScale || 35;
        var minFontPt = opts.minFontSize || 4.0;
        var targetW = prof.boxWidthPt;

        for (var p = 0; p < paraCount; p++) {
            var para = tf.paragraphs[p];
            var pTxt = (para.contents || "").replace(/^\s+|\s+$/g, "");
            var stToUse;
            var pMinH = minFatherH;
            var pMaxH = maxFatherH;

            if (p === 0) {
                stToUse = nameSt;
                pMinH = minNameH;
                pMaxH = maxNameH;
            } else if (paraCount >= 3 && p === paraCount - 1) {
                stToUse = lastSt;
                pMinH = minLastH;
                pMaxH = 100; // Last line (Address | Phone) only compresses, never stretches
            } else if (paraCount === 2 && p === 1 && (pTxt.indexOf("|") !== -1 || /[\u09E6-\u09EF0-9]{8,}/.test(pTxt.replace(/[-\s]/g, "")))) {
                stToUse = lastSt;
                pMinH = minLastH;
                pMaxH = 100;
            } else {
                stToUse = fatherSt;
                pMinH = minFatherH;
                pMaxH = maxFatherH;
            }

            if (autoFit && targetW > 0) {
                var fit = this._computePenLineFit(probe, pTxt, stToUse, targetW, pMinH, pMaxH, minFontPt, (p === 0));
                lineFits.push({ st: stToUse, hScale: fit.hScale, size: fit.size, txt: pTxt, minH: pMinH, maxH: pMaxH, isHeader: (p === 0) });
                this._applyPenParaStyle(para, stToUse, fit.hScale, fit.size, null);
            } else {
                lineFits.push({ st: stToUse, hScale: 100, size: stToUse.size, txt: pTxt, minH: pMinH, maxH: pMaxH, isHeader: (p === 0) });
                this._applyPenParaStyle(para, stToUse, 100, stToUse.size, null);
            }
        }

        // Optional vertical fit if explicit Height (mm) / Box (e.g. 5mm) is exceeded
        var isArea = false;
        try { isArea = (typeof TextType !== "undefined" && tf.kind === TextType.AREATEXT); } catch(ake) {}

        if (autoFit && prof.boxHeightPt > 0 && !isArea) {
            var curGb = tf.geometricBounds;
            var curH = Math.abs(curGb[1] - curGb[3]);
            var heightLimit = prof.hasExplicitHeightLimit ? prof.boxHeightPt : (prof.boxHeightPt + 1.5);
            if (curH > heightLimit && curH > 0) {
                var vRatio = (prof.boxHeightPt / curH) * 0.96;
                for (var vp = 0; vp < tf.paragraphs.length && vp < lineFits.length; vp++) {
                    var lf = lineFits[vp];
                    var newSize = Math.max(minFontPt, Math.round(lf.size * vRatio * 10) / 10);
                    var newLead = lf.st.autoLeading ? null : Math.max(newSize * 1.05, Math.round(lf.st.leading * vRatio * 10) / 10);
                    if (newSize < lf.size || newLead) {
                        var adjSt = {
                            font: lf.st.font,
                            size: newSize,
                            autoLeading: lf.st.autoLeading,
                            leading: newLead || lf.st.leading,
                            tracking: lf.st.tracking,
                            verticalScale: lf.st.verticalScale,
                            color: lf.st.color,
                            just: lf.st.just
                        };
                        var adjFit = targetW > 0
                            ? this._computePenLineFit(probe, lf.txt, adjSt, targetW, lf.minH, lf.maxH, minFontPt, lf.isHeader)
                            : { hScale: lf.hScale, size: newSize };
                        this._applyPenParaStyle(tf.paragraphs[vp], adjSt, adjFit.hScale, adjFit.size, newLead);
                    }
                }
            }
        } else if (autoFit && isArea && tf.paragraphs && tf.paragraphs.length > 0) {
            // For AreaText (e.g. 25x5mm box), prevent overflow/wrap if lines exceed box height
            try {
                var areaSafety = 0;
                while (areaSafety < 6) {
                    areaSafety++;
                    var visChars = 0;
                    for (var ali = 0; ali < tf.lines.length; ali++) {
                        visChars += tf.lines[ali].characters.length;
                    }
                    var totalChars = tf.contents.replace(/[\r\n]/g, "").length;
                    if (visChars >= totalChars && tf.lines.length <= cleanLines.length) break;
                    var shrunkAny = false;
                    for (var avp = 0; avp < tf.paragraphs.length && avp < lineFits.length; avp++) {
                        var alf = lineFits[avp];
                        var nSz = Math.max(minFontPt, Math.round((alf.size - 0.5) * 10) / 10);
                        if (nSz < alf.size) {
                            alf.size = nSz;
                            shrunkAny = true;
                            var nLd = alf.st.autoLeading ? null : Math.max(nSz * 1.05, Math.round((alf.st.leading * (nSz / alf.st.size)) * 10) / 10);
                            var aSt = {
                                font: alf.st.font, size: nSz, autoLeading: alf.st.autoLeading,
                                leading: nLd || alf.st.leading, tracking: alf.st.tracking,
                                verticalScale: alf.st.verticalScale, color: alf.st.color, just: alf.st.just
                            };
                            var aFit = targetW > 0
                                ? this._computePenLineFit(probe, alf.txt, aSt, targetW, alf.minH, alf.maxH, minFontPt, alf.isHeader)
                                : { hScale: alf.hScale, size: nSz };
                            this._applyPenParaStyle(tf.paragraphs[avp], aSt, aFit.hScale, aFit.size, nLd);
                        }
                    }
                    if (!shrunkAny) break;
                }
            } catch(areaErr) {}
        }

        // Align text frame cleanly inside card's target zone (matching Card #1 / picked Box)
        try {
            var fGb = tf.geometricBounds;
            var fMidX = (fGb[0] + fGb[2]) / 2;
            var fMidY = (fGb[1] + fGb[3]) / 2;
            var cB = card.bounds;
            var cL = cB[0], cMidY = (cB[1] + cB[3]) / 2;

            var targetLeftX = card.hasBorder ? (cL + prof.offsetLeftPt) : (origLeft !== null ? origLeft : fGb[0]);
            var targetMidY = card.hasBorder ? (cMidY + prof.offsetMidYPt) : (origMidY !== null ? origMidY : fMidY);

            if (card.innerBoxBounds) {
                targetLeftX = card.innerBoxBounds[0];
                targetMidY = (card.innerBoxBounds[1] + card.innerBoxBounds[3]) / 2;
            }

            var dx = 0;
            if (typeof Justification !== "undefined" && nameSt.just === Justification.CENTER && prof.boxWidthPt > 0) {
                dx = (targetLeftX + prof.boxWidthPt / 2) - fMidX;
            } else if (typeof Justification !== "undefined" && nameSt.just === Justification.RIGHT && prof.boxWidthPt > 0) {
                dx = (targetLeftX + prof.boxWidthPt) - fGb[2];
            } else {
                dx = targetLeftX - fGb[0];
            }
            var dy = targetMidY - fMidY;

            if (Math.abs(dx) > 0.15 || Math.abs(dy) > 0.15) {
                tf.translate(dx, dy);
            }
        } catch(posErr) {}

        // 2. Populate or clone side Qty frame ("pashe songkha sohoo")
        if (opts.fillQty !== false && qtyStr !== undefined && qtyStr !== null && String(qtyStr).replace(/\s+/g, "") !== "") {
            var qFrame = card.qtyFrame;
            var qCreated = false;
            if (!qFrame && refCard && refCard.qtyFrame) {
                try {
                    qFrame = refCard.qtyFrame.duplicate();
                    card.qtyFrame = qFrame;
                    qCreated = true;
                } catch(qde) {}
            }
            if (qFrame) {
                var formattedDigits = this._formatPenQtyDigits(qtyStr, prof.qty.isEnglishDigits, prof.qty.font);
                var qContent = (prof.qty.prefix || "") + formattedDigits + (prof.qty.suffix || "");
                qFrame.contents = qContent;
                try {
                    var qTr = qFrame.textRange;
                    if (prof.qty.font) qTr.characterAttributes.textFont = prof.qty.font;
                    if (prof.qty.size > 0) qTr.characterAttributes.size = prof.qty.size;
                    if (prof.qty.autoLeading) {
                        qTr.characterAttributes.autoLeading = true;
                    } else if (prof.qty.leading > 0) {
                        qTr.characterAttributes.autoLeading = false;
                        qTr.characterAttributes.leading = prof.qty.leading;
                    }
                    if (prof.qty.hScale > 0) qTr.characterAttributes.horizontalScale = prof.qty.hScale;
                    qTr.characterAttributes.tracking = prof.qty.tracking || 0;
                    if (prof.qty.color) qTr.characterAttributes.fillColor = prof.qty.color;
                    if (prof.qty.just !== null) qTr.paragraphAttributes.justification = prof.qty.just;
                    qTr.paragraphAttributes.spaceBefore = 0;
                    qTr.paragraphAttributes.spaceAfter = 0;
                } catch(qStyErr) {}

                if (qCreated) {
                    try {
                        var nqGb = qFrame.geometricBounds;
                        var cb2 = card.bounds;
                        var cb2MidY = (cb2[1] + cb2[3]) / 2;
                        var targetQX = (prof.qty.side === "left")
                            ? (cb2[0] - prof.qty.offsetX - (nqGb[2] - nqGb[0]))
                            : (cb2[2] + prof.qty.offsetX);
                        var targetQMidY = cb2MidY + prof.qty.offsetMidY;
                        var qdx = targetQX - nqGb[0];
                        var qdy = targetQMidY - ((nqGb[1] + nqGb[3]) / 2);
                        if (Math.abs(qdx) > 0.1 || Math.abs(qdy) > 0.1) {
                            qFrame.translate(qdx, qdy);
                        }
                    } catch(qPosErr) {}
                }
            }
        }

        return true;
    },

    populatePenCards: function(payloadJson) {
        var doc = this.getActiveDoc();
        if (!doc) {
            return JSON.stringify({ status: "error", message: "No active Illustrator document found." });
        }

        var payload = {};
        try { payload = (typeof payloadJson === "string") ? JSON.parse(payloadJson) : (payloadJson || {}); } catch(e) {
            return JSON.stringify({ status: "error", message: "Invalid Pen payload." });
        }

        var entries = payload.entries || [];
        if (!entries.length) {
            return JSON.stringify({ status: "error", message: "No Pen entries to populate." });
        }

        var scope = payload.scope || "artboard";
        var order = payload.order || "column";
        var startIndex = parseInt(payload.startIndex, 10) || 0;
        if (startIndex >= entries.length) startIndex = 0;

        var cards = this.detectPenCards(doc, scope, order, payload.sampleProfile || null);
        if (!cards.length) {
            return JSON.stringify({
                status: "error",
                message: "No Pen strip templates detected. Make sure strips are visible and unlocked."
            });
        }

        var prof = this._mergePenProfileWithSample(doc, cards, payload.sampleProfile || null, payload.boxProfile || null, payload);
        var refCard = prof.refCard || cards[0];

        var probe = this._createTextWidthProbe(null);
        var filledCount = 0;
        var skippedCount = 0;
        var entryIdx = startIndex;
        var startCardIdx = (payload.skipFirstCard === true) ? 1 : 0;
        var skipFilled = (payload.skipFilledCards !== false);

        try {
            for (var c = startCardIdx; c < cards.length; c++) {
                if (entryIdx >= entries.length) break;
                var card = cards[c];

                if (skipFilled && card.nameFrame) {
                    var stripSerRe = /^[\u09E6-\u09EF0-9]{1,4}[\.\-\)\:]\s*/;
                    var rawL0 = (card.nameFrame.contents || "").split(/\r|\n/)[0].replace(/^\s+|\s+$/g, "");
                    var cardLine0 = rawL0.replace(/\s+/g, "");
                    var cardLine0Clean = rawL0.replace(stripSerRe, "").replace(/\s+/g, "");
                    if (cardLine0) {
                        var rawEntryNm = (entries[entryIdx].name || "").replace(/^\s+|\s+$/g, "");
                        var curEntryName = rawEntryNm.replace(/\s+/g, "");
                        var curEntryClean = rawEntryNm.replace(stripSerRe, "").replace(/\s+/g, "");
                        if ((curEntryName && cardLine0 === curEntryName) || (curEntryClean && cardLine0Clean === curEntryClean)) {
                            // Card already holds the current entry (e.g. Card #1 already placed!)
                            skippedCount++;
                            entryIdx++;
                            continue;
                        }
                        var matchedPrior = false;
                        for (var pe = 0; pe < entryIdx; pe++) {
                            var peRaw = (entries[pe].name || "").replace(/^\s+|\s+$/g, "");
                            var peNorm = peRaw.replace(/\s+/g, "");
                            var peClean = peRaw.replace(stripSerRe, "").replace(/\s+/g, "");
                            if ((peNorm && peNorm === cardLine0) || (peClean && peClean === cardLine0Clean)) {
                                matchedPrior = true;
                                break;
                            }
                        }
                        if (matchedPrior) {
                            skippedCount++;
                            continue;
                        }
                    }
                }

                var entry = entries[entryIdx];
                var lines = (entry.lines && entry.lines.length) ? entry.lines : [entry.name];
                if (this._applyPenCardEntry(doc, probe, card, refCard, prof, lines, entry.qty, payload)) {
                    filledCount++;
                    entryIdx++;
                }
            }
        } finally {
            if (probe) {
                try { probe.remove(); } catch(re) {}
            }
        }

        try { app.redraw(); } catch(e) {}

        var wMm = Math.round(this._ptToMm(prof.boxWidthPt) * 10) / 10;
        var hMm = Math.round(this._ptToMm(prof.boxHeightPt) * 10) / 10;
        var summary = cards.length + " Pen Cards \u2022 " + wMm + "\u00D7" + hMm + "mm";

        return JSON.stringify({
            status: "success",
            filledCount: filledCount,
            skippedCount: skippedCount,
            totalCards: cards.length,
            totalEntries: entries.length,
            nextStartIndex: entryIdx,
            consumedEndIndex: entryIdx,
            summary: summary,
            message: "Populated " + filledCount + " Pen card(s)" + (skippedCount > 0 ? (" (skipped " + skippedCount + ")") : "") + " inside " + wMm + "mm!"
        });
    },

    formatExistingPenCards: function(payloadJson) {
        var doc = this.getActiveDoc();
        if (!doc) {
            return JSON.stringify({ status: "error", message: "No active Illustrator document found." });
        }

        var payload = {};
        try { payload = (typeof payloadJson === "string") ? JSON.parse(payloadJson) : (payloadJson || {}); } catch(e) {}

        var scope = payload.scope || "artboard";
        var order = payload.order || "column";
        var cards = this.detectPenCards(doc, scope, order, payload.sampleProfile || null);
        if (!cards.length) {
            return JSON.stringify({ status: "error", message: "No Pen strip cards found on canvas." });
        }

        var prof = this._mergePenProfileWithSample(doc, cards, payload.sampleProfile || null, payload.boxProfile || null, payload);
        var refCard = prof.refCard || cards[0];
        var startIdx = (payload.skipFirstCard === true) ? 1 : 0;

        var probe = this._createTextWidthProbe(null);
        var styledCount = 0;

        try {
            for (var c = startIdx; c < cards.length; c++) {
                var card = cards[c];
                if (!card.nameFrame) continue;

                var rawTxt = (card.nameFrame.contents || "").replace(/\r\n|\n/g, "\r").replace(/^\s+|\s+$/g, "");
                if (!rawTxt) continue;
                var rawLines = rawTxt.split("\r");
                if (card.detailsFrame && card.detailsFrame !== card.nameFrame) {
                    var detTxt = (card.detailsFrame.contents || "").replace(/\r\n|\n/g, "\r").replace(/^\s+|\s+$/g, "");
                    if (detTxt) rawLines = rawLines.concat(detTxt.split("\r"));
                }

                var cleanLines = [];
                for (var li = 0; li < rawLines.length; li++) {
                    var l = rawLines[li].replace(/^\s+|\s+$/g, "");
                    if (l) cleanLines.push(l);
                }
                if (!cleanLines.length) continue;

                var existingQty = card.qtyFrame ? (card.qtyFrame.contents || "") : "";
                if (this._applyPenCardEntry(doc, probe, card, refCard, prof, cleanLines, existingQty, payload)) {
                    styledCount++;
                }
            }
        } finally {
            if (probe) {
                try { probe.remove(); } catch(re) {}
            }
        }

        try { app.redraw(); } catch(e) {}

        var wMm = Math.round(this._ptToMm(prof.boxWidthPt) * 10) / 10;
        var hMm = Math.round(this._ptToMm(prof.boxHeightPt) * 10) / 10;
        return JSON.stringify({
            status: "success",
            filledCount: styledCount,
            totalCards: cards.length,
            summary: cards.length + " Pen Cards \u2022 " + wMm + "\u00D7" + hMm + "mm",
            message: "Styled & fitted " + styledCount + " Pen card(s) to " + wMm + "mm!"
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
            var opened = false;
            try {
                var urlFile = new File(Folder.temp.fsName + "/open_link.url");
                urlFile.open("w");
                urlFile.write('[InternetShortcut]\r\nURL=' + url + '\r\n');
                urlFile.close();
                opened = urlFile.execute();
            } catch (err3) {}

            if (!opened) {
                try {
                    if (typeof app.system === "function") {
                        app.system('cmd.exe /c start "" "' + url + '"');
                    }
                } catch (err4) {}
            }
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

function getSelectedCanvasWidth() {
    return CardAutoFiller.getSelectedCanvasWidth();
}

function getSelectedCanvasColor() {
    return CardAutoFiller.getSelectedCanvasColor();
}

function pickNoteBaniSample() {
    return CardAutoFiller.pickNoteBaniSample();
}

function scanNoteBanis(payloadJson) {
    return CardAutoFiller.scanNoteBanis(payloadJson);
}

function populateNoteBanis(payloadJson) {
    return CardAutoFiller.populateNoteBanis(payloadJson);
}

function pickPenSample() {
    return CardAutoFiller.pickPenSample();
}

function pickPenBox() {
    return CardAutoFiller.pickPenBox();
}

function scanPenCards(payloadJson) {
    return CardAutoFiller.scanPenCards(payloadJson);
}

function populatePenCards(payloadJson) {
    return CardAutoFiller.populatePenCards(payloadJson);
}

function formatExistingPenCards(payloadJson) {
    return CardAutoFiller.formatExistingPenCards(payloadJson);
}
