/**
 * Illustrator Name & Bio Card Auto-Filler Pro (Standalone Script)
 * Author: Yahia Bin Zaman (https://github.com/yahiabinzaman)
 * Version: 2.2.0 Pro - Enhanced with Keyring & Multi-Field Auto-Fill (Name, Bani & Pcs)
 */

#target illustrator

(function() {
    'use strict';

    if (!app.documents.length) {
        alert("Please open an Illustrator document first.");
        return;
    }

    var doc = app.activeDocument;
    var serialPrefixRegex = /^(\s*[\(\[\{]?[০-৯0-9]{1,4}[\.\)\-\/\:\|\]\}]\s*)/;
    var serialLineRegex = /^\s*[\(\[\{]?([০-৯0-9]{1,4})[\.\)\-\/\:\|\]\}]?\s*$/;
    var qtyRegex = /(?:^|\s*)([০-৯0-9]{1,4})\s*(?:পিস|পিছ|টি|টা|pc|pcs|piece|pieces)(?:\s*|$)/i;
    var bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

    var sampleBanglaData = "১\n" +
        "হাফেজ মো: সিফাতুল্লাহ বিশ্বাস\n" +
        "পিতা: আজাহারুল ইসলাম\n" +
        "ব্রাহ্মণডাঙ্গা, মনিরামপুর, যশোর\n" +
        "০১৯২৩৪৩০৯৬০\n" +
        "১০ পিস\n" +
        "বাণী: বিন্দু বিন্দু জলে তৈরী হয় সাগর, একটু একটু চেষ্টায় সফল হয় জীবন। — মাওলানা আবু তাহের মিসবাহ দা:বা:\n\n" +
        "২\n" +
        "হাফেজ শুয়াইব হুসাইন\n" +
        "পিতা: সাইফুল ইসলাম\n" +
        "বাঁকড়া, ঝিকরগাছা, যশোর\n" +
        "০১৭৪৫৬৪৩২৯৪\n" +
        "১৫ পিস\n" +
        "বাণী: আল্লাহর উপর ভরসা রেখে যারা দ্বীনের মেহনত মোজাহাদা করে, হতাশা কখনো তাদের হতোদ্যম করতে পারেনা, তারা তো সফলতার জন্য নয়, আল্লাহর সন্তুষ্টির জন্যই কাজ করে। — মাওলানা আবু তাহের মিসবাহ দা:বা:\n\n" +
        "৩\n" +
        "হাফেজ আবু বকর সিদ্দিক\n" +
        "পিতা: জনাব হাসিবুল ইসলাম\n" +
        "আকুন্দবাড়ীয়া, সদর, চুয়াডাঙ্গা\n" +
        "০১৯৬৫৮২৮৮৫৭\n" +
        "২৫ পিস\n" +
        "বাণী: আমি পিঁপড়া হয়ে পদদলিত হব, কিন্তু ভ্রমর হয়ে কাউকে দংশন করব না। — শায়খুল হাদিস ইবরাহীম খলীল রহ.";

    // Build ScriptUI Window
    var win = new Window("dialog", "Name & Card Auto-Filler Pro v2.2 - Yahia Bin Zaman");
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 10;
    win.margins = 14;

    // Tabbed Panel
    var tpanel = win.add("tabbedpanel");
    tpanel.alignChildren = ["fill", "fill"];

    // ==========================================
    // TAB 1: Auto Fill (Keyring / Card Auto-Fill)
    // ==========================================
    var tabFill = tpanel.add("tab", undefined, "⚡ Auto Fill Cards");
    tabFill.alignChildren = ["fill", "top"];
    tabFill.spacing = 8;
    tabFill.margins = 10;

    var txtInput = tabFill.add("edittext", undefined, sampleBanglaData, { multiline: true, scrolling: true });
    txtInput.preferredSize = [490, 130];

    var btnRow = tabFill.add("group");
    btnRow.orientation = "row";
    var btnLoadFromCanvas = btnRow.add("button", undefined, "Load Selected Text from Canvas");
    var btnSample = btnRow.add("button", undefined, "Load Sample");
    var btnClear = btnRow.add("button", undefined, "Clear");

    var grpOpt = tabFill.add("group");
    grpOpt.orientation = "row";
    grpOpt.add("statictext", undefined, "Order:");
    var ddlOrder = grpOpt.add("dropdownlist", undefined, [
        "Column-wise (Col 1: top->bottom, Col 2)",
        "Row by Row (1, 2 | 3, 4)",
        "Match Badge Number (০১, ০২...)"
    ]);
    ddlOrder.selection = 0;

    grpOpt.add("statictext", undefined, "Scope:");
    var ddlScope = grpOpt.add("dropdownlist", undefined, [
        "Active Artboard",
        "Selected Cards",
        "All Artboards"
    ]);
    ddlScope.selection = 0;

    // Options Checkboxes
    var pnlOptions = tabFill.add("panel", undefined, "Auto-Fill Settings & Features");
    pnlOptions.alignChildren = ["fill", "top"];
    pnlOptions.spacing = 6;
    pnlOptions.margins = 10;

    var grpMode = pnlOptions.add("group");
    grpMode.orientation = "row";
    grpMode.add("statictext", undefined, "কাজের ধরন (Mode):");
    var ddlWorkMode = grpMode.add("dropdownlist", undefined, [
        "🔑 Keyring Mode (সিরিয়াল ছাড়া শুধু নাম, বাণী ও পিস)",
        "📔 Diary Mode (সিরিয়ালসহ নাম ও ডিটেইলস)"
    ]);
    ddlWorkMode.selection = 0;

    var chkStripNum = pnlOptions.add("checkbox", undefined, "নাম থেকে সিরিয়াল নাম্বার বাদ দাও (১, ২, ১০ ইত্যাদি বাদ যাবে)");
    chkStripNum.value = true;

    ddlWorkMode.onChange = function() {
        if (ddlWorkMode.selection.index === 0) {
            // Keyring
            chkStripNum.value = true;
            chkFillBani.value = true;
            chkFillQty.value = true;
        } else {
            // Diary
            chkStripNum.value = false;
            chkFillBani.value = false;
            chkFillQty.value = false;
        }
    };

    var chkMakeBold = pnlOptions.add("checkbox", undefined, "নামে Bold ফন্ট স্টাইলিং প্রিজার্ভ / অ্যাপ্লাই করো");
    chkMakeBold.value = true;

    var grpNameColor = pnlOptions.add("group");
    grpNameColor.orientation = "row";
    grpNameColor.add("statictext", undefined, "নামের কালার (Name Color):");
    var ddlNameColor = grpNameColor.add("dropdownlist", undefined, [
        "টেমপ্লেট লালচে-ব্রাউন (Default #A22F10)",
        "সলিড ব্ল্যাক (Solid Black #000000)",
        "রয়্যাল ব্লু (Royal Blue #1E5AA8)",
        "ইসলামিক গ্রীন (Green #1B6E3F)",
        "মেরুন লাল (Crimson #9C1A1A)",
        "গোল্ডেন আম্বার (Amber #C88210)"
    ]);
    ddlNameColor.selection = 0;

    var chkFillBani = pnlOptions.add("checkbox", undefined, "বাণী (Bani Quote) আলাদা ফ্রেমে অটো বসাও");
    chkFillBani.value = true;

    var grpQty = pnlOptions.add("group");
    grpQty.orientation = "row";
    var chkFillQty = grpQty.add("checkbox", undefined, "পিস / সংখ্যা অটো রিপ্লেস করো (Demo '10' -> Pcs):");
    chkFillQty.value = true;
    var ddlQtyFormat = grpQty.add("dropdownlist", undefined, [
        "Auto (Match Demo Digits)",
        "English Digits (10, 15, 25)",
        "Bangla Digits (১০, ১৫, ২৫)"
    ]);
    ddlQtyFormat.selection = 0;

    var chkSkipNoName = pnlOptions.add("checkbox", undefined, "নাম ছাড়া শুধু সংখ্যা/পিস এন্ট্রিগুলো বাদ দাও (Skip empty names)");
    chkSkipNoName.value = true;

    // ==========================================
    // TAB 2: Canvas Move & Align
    // ==========================================
    var tabMove = tpanel.add("tab", undefined, "🎯 Canvas Move & Align");
    tabMove.alignChildren = ["fill", "top"];
    tabMove.spacing = 8;
    tabMove.margins = 10;

    tabMove.add("statictext", undefined, "Select Template Cards (Left) and Text Blocks (Right) on canvas:", { multiline: true });

    var grpMoveSort = tabMove.add("group");
    grpMoveSort.orientation = "row";
    grpMoveSort.add("statictext", undefined, "Direction:");
    var ddlMoveSort = grpMoveSort.add("dropdownlist", undefined, ["Column-wise", "Row by Row"]);
    ddlMoveSort.selection = 0;

    var grpOffset = tabMove.add("group");
    grpOffset.orientation = "row";
    grpOffset.add("statictext", undefined, "Offset X (pt):");
    var txtOffsetX = grpOffset.add("edittext", undefined, "45");
    txtOffsetX.characters = 5;
    grpOffset.add("statictext", undefined, "Offset Y (pt):");
    var txtOffsetY = grpOffset.add("edittext", undefined, "-15");
    txtOffsetY.characters = 5;

    var chkGroupPlaced = tabMove.add("checkbox", undefined, "Group placed text block with card shape");
    chkGroupPlaced.value = true;
    var chkBringFront = tabMove.add("checkbox", undefined, "Bring placed text to front");
    chkBringFront.value = true;

    // ==========================================
    // TAB 3: Badge Renumber
    // ==========================================
    var tabBadge = tpanel.add("tab", undefined, "🏷️ Badge Renumber");
    tabBadge.alignChildren = ["fill", "top"];
    tabBadge.spacing = 8;
    tabBadge.margins = 10;

    var grpBadgeStyle = tabBadge.add("group");
    grpBadgeStyle.orientation = "row";
    grpBadgeStyle.add("statictext", undefined, "Style:");
    var ddlBadgeStyle = grpBadgeStyle.add("dropdownlist", undefined, [
        "Bangla 2-Digit (০১, ০২, ০৩...)",
        "Bangla (১, ২, ৩...)",
        "English 2-Digit (01, 02, 03...)",
        "English (1, 2, 3...)"
    ]);
    ddlBadgeStyle.selection = 0;

    grpBadgeStyle.add("statictext", undefined, "Start:");
    var txtBadgeStart = grpBadgeStyle.add("edittext", undefined, "1");
    txtBadgeStart.characters = 4;

    var btnRenumber = tabBadge.add("button", undefined, "🔢 Renumber Selected Badges");

    // ==========================================
    // TAB 4: Template Duplicator
    // ==========================================
    var tabDup = tpanel.add("tab", undefined, "📋 Template Duplicator");
    tabDup.alignChildren = ["fill", "top"];
    tabDup.spacing = 8;
    tabDup.margins = 10;

    var pnlDupInfo = tabDup.add("panel", undefined, "Duplication & Artboard Settings");
    pnlDupInfo.alignChildren = ["fill", "top"];
    pnlDupInfo.spacing = 6;

    var lblDupDesc = pnlDupInfo.add("statictext", undefined, "Select 1 template card on canvas to duplicate across artboards:", { multiline: true });
    lblDupDesc.preferredSize = [-1, 24];

    var grpDupInputs = pnlDupInfo.add("group");
    grpDupInputs.orientation = "row";
    grpDupInputs.add("statictext", undefined, "Total Copies:");
    var txtTotalCopies = grpDupInputs.add("edittext", undefined, "50");
    txtTotalCopies.characters = 5;

    grpDupInputs.add("statictext", undefined, "Cards / Artboard:");
    var txtCardsPerAB = grpDupInputs.add("edittext", undefined, "20");
    txtCardsPerAB.characters = 4;

    var grpDupPresets = pnlDupInfo.add("group");
    grpDupPresets.orientation = "row";
    grpDupPresets.add("statictext", undefined, "Presets:");
    var btnP10 = grpDupPresets.add("button", undefined, "10 / AB");
    var btnP20 = grpDupPresets.add("button", undefined, "20 / AB");
    var btnP25 = grpDupPresets.add("button", undefined, "25 / AB");
    btnP10.onClick = function() { txtCardsPerAB.text = "10"; updateDupSummary(); };
    btnP20.onClick = function() { txtCardsPerAB.text = "20"; updateDupSummary(); };
    btnP25.onClick = function() { txtCardsPerAB.text = "25"; updateDupSummary(); };

    var grpDupGrid = pnlDupInfo.add("group");
    grpDupGrid.orientation = "row";
    grpDupGrid.add("statictext", undefined, "Cols (0=Auto):");
    var txtCols = grpDupGrid.add("edittext", undefined, "2");
    txtCols.characters = 3;
    grpDupGrid.add("statictext", undefined, "Gap X:");
    var txtGapX = grpDupGrid.add("edittext", undefined, "0");
    txtGapX.characters = 3;
    grpDupGrid.add("statictext", undefined, "Gap Y:");
    var txtGapY = grpDupGrid.add("edittext", undefined, "0");
    txtGapY.characters = 3;

    var lblDupSummary = pnlDupInfo.add("statictext", undefined, "Summary: 50 cards -> 3 artboards (20, 20, 10)");
    function updateDupSummary() {
        var tot = parseInt(txtTotalCopies.text, 10) || 50;
        var pAB = parseInt(txtCardsPerAB.text, 10) || 20;
        if (pAB <= 0) pAB = 20;
        var abC = Math.ceil(tot / pAB);
        lblDupSummary.text = "Summary: " + tot + " cards -> " + abC + " artboard(s)";
    }
    txtTotalCopies.onChanging = updateDupSummary;
    txtCardsPerAB.onChanging = updateDupSummary;

    var btnRunDup = tabDup.add("button", undefined, "✨ Duplicate Templates & Create Artboards");
    btnRunDup.preferredSize = [-1, 35];
    btnRunDup.onClick = function() {
        executeDuplicator();
    };

    // ==========================================
    // Action Buttons Row
    // ==========================================
    var actGroup = win.add("group");
    actGroup.orientation = "row";
    actGroup.alignment = ["fill", "center"];

    var btnCancel = actGroup.add("button", undefined, "Cancel", { name: "cancel" });
    var btnExecute = actGroup.add("button", undefined, "🚀 Execute Action", { name: "ok" });
    btnExecute.preferredSize = [200, 36];

    // Author Footer
    var lblAuthor = win.add("statictext", undefined, "Developed by Yahia Bin Zaman  •  github.com/yahiabinzaman");
    lblAuthor.alignment = ["center", "center"];
    lblAuthor.graphics.foregroundColor = lblAuthor.graphics.newPen(lblAuthor.graphics.PenType.SOLID_COLOR, [0.3, 0.7, 1.0, 1], 1);

    // ==========================================
    // Event Handlers
    // ==========================================
    btnSample.onClick = function() { txtInput.text = sampleBanglaData; };
    btnClear.onClick = function() { txtInput.text = ""; };

    btnLoadFromCanvas.onClick = function() {
        var sel = doc.selection;
        if (!sel || !sel.length) {
            alert("Please select text frame(s) on canvas.");
            return;
        }
        var tfs = [];
        collectTextFrames(sel, tfs);
        if (!tfs.length) {
            alert("No text frames found in selection.");
            return;
        }
        tfs.sort(function(a, b) {
            var bTop = b.geometricBounds[1], aTop = a.geometricBounds[1];
            if (Math.abs(bTop - aTop) > 20) return bTop - aTop;
            return a.geometricBounds[0] - b.geometricBounds[0];
        });
        var out = [];
        for (var i = 0; i < tfs.length; i++) {
            var c = tfs[i].contents;
            if (c && c.replace(/\s+/g, '').length > 0) out.push(c);
        }
        txtInput.text = out.join("\n\n");
    };

    btnRenumber.onClick = function() {
        var sel = doc.selection;
        if (!sel || !sel.length) { alert("Please select card badge frames."); return; }
        var tfs = [];
        collectTextFrames(sel, tfs);
        var badges = [];
        for (var i = 0; i < tfs.length; i++) {
            var txt = tfs[i].contents.replace(/\s+/g, '');
            if (txt.length <= 4 || bengaliToInt(txt) > 0) badges.push(tfs[i]);
        }
        if (!badges.length) { alert("No number badges found in selection."); return; }
        badges.sort(function(a, b) {
            var bTop = b.geometricBounds[1], aTop = a.geometricBounds[1];
            if (Math.abs(bTop - aTop) > 35) return bTop - aTop;
            return a.geometricBounds[0] - b.geometricBounds[0];
        });
        var st = parseInt(txtBadgeStart.text, 10) || 1;
        var mode = ddlBadgeStyle.selection.index;
        for (var j = 0; j < badges.length; j++) {
            var cur = st + j;
            var formatted = "";
            if (mode === 0) formatted = intToBengali(cur, true);
            else if (mode === 1) formatted = intToBengali(cur, false);
            else if (mode === 2) formatted = (cur < 10 ? "0" : "") + cur;
            else formatted = String(cur);
            badges[j].contents = formatted;
        }
        app.redraw();
        alert("Renumbered " + badges.length + " badges successfully!");
        win.close();
    };

    
    function executeDuplicator() {
        var sel = doc.selection;
        if (!sel || sel.length === 0) {
            alert("Please select your template card on canvas first.");
            return;
        }

        var totalCopies = parseInt(txtTotalCopies.text, 10) || 50;
        var cardsPerAB = parseInt(txtCardsPerAB.text, 10) || 20;
        var customCols = parseInt(txtCols.text, 10) || 0;
        var gapX = parseFloat(txtGapX.text) || 0;
        var gapY = parseFloat(txtGapY.text) || 0;

        if (totalCopies <= 0) totalCopies = 1;
        if (cardsPerAB <= 0) cardsPerAB = 20;

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

        var mGB = masterItem.geometricBounds;
        var cardW = mGB[2] - mGB[0];
        var cardH = mGB[1] - mGB[3];

        var curABIndex = doc.artboards.getActiveArtboardIndex();
        var baseAB = doc.artboards[curABIndex];
        var baseRect = baseAB.artboardRect;
        var abW = baseRect[2] - baseRect[0];
        var abH = baseRect[1] - baseRect[3];

        var cols = customCols;
        if (cols <= 0) {
            cols = Math.max(1, Math.floor((abW + gapX) / (cardW + gapX)));
        }

        var totalGridW = cols * cardW + (cols - 1) * gapX;
        var rowsPerAB = Math.ceil(cardsPerAB / cols);
        var totalGridH = rowsPerAB * cardH + (rowsPerAB - 1) * gapY;

        var marginX = 15;
        var marginY = 15;

        // Uniform Artboard Dimensions (All artboards exactly identical)
        var finalABW = Math.max(abW, Math.round(totalGridW + 2 * marginX));
        var finalABH = Math.max(abH, Math.round(totalGridH + 2 * marginY));

        baseAB.artboardRect = [baseRect[0], baseRect[1], baseRect[0] + finalABW, baseRect[1] - finalABH];

        var marginL = Math.max(marginX, (finalABW - totalGridW) / 2);
        var marginT = marginY;

        var totalABsNeeded = Math.ceil(totalCopies / cardsPerAB);
        var abList = [baseAB];

        var maxRight = -999999;
        var topRef = baseRect[1];
        for (var abIdx = 0; abIdx < doc.artboards.length; abIdx++) {
            var r = doc.artboards[abIdx].artboardRect;
            if (r[2] > maxRight) maxRight = r[2];
        }

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

        for (var i = 0; i < totalCopies; i++) {
            var abPage = Math.floor(i / cardsPerAB);
            var idxOnPage = i % cardsPerAB;
            var c = idxOnPage % cols;
            var r = Math.floor(idxOnPage / cols);

            var targetAB = abList[abPage];
            var tRect = targetAB.artboardRect;

            var posX = tRect[0] + marginL + c * (cardW + gapX);
            var posY = tRect[1] - marginT - r * (cardH + gapY);

            if (i === 0) {
                masterItem.position = [posX, posY];
            } else {
                var dup = masterItem.duplicate();
                dup.position = [posX, posY];
            }
        }

        app.redraw();
        alert("Successfully generated " + totalCopies + " duplicate template(s) across " + totalABsNeeded + " artboard(s)!");
        tpanel.selection = tabFill;
    }

btnExecute.onClick = function() {
        if (tpanel.selection === tabDup) { executeDuplicator(); return; }
        if (tpanel.selection.index === 1) {
            // TAB 2: Canvas Move
            executeCanvasMove();
            return;
        }

        // TAB 1: Auto Fill
        executeAutoFill();
    };

    function executeCanvasMove() {
        var sel = doc.selection;
        if (!sel || sel.length < 2) {
            alert("Please select Cards (Left) and Text Blocks (Right).");
            return;
        }
        var allBounds = [];
        for (var k = 0; k < sel.length; k++) allBounds.push({ item: sel[k], x: sel[k].geometricBounds[0] });
        allBounds.sort(function(a, b) { return a.x - b.x; });
        var half = Math.floor(allBounds.length / 2);
        var cards = [], textBlocks = [];
        for (var m = 0; m < half; m++) cards.push(allBounds[m].item);
        for (var n = half; n < allBounds.length; n++) textBlocks.push(allBounds[n].item);

        var ord = ddlMoveSort.selection.index === 0 ? "column" : "zigzag";
        var sortFn = function(items, o) {
            if (o === "column") {
                items.sort(function(a, b) {
                    var aGB = a.geometricBounds, bGB = b.geometricBounds;
                    if (Math.abs(aGB[0] - bGB[0]) > 60) return aGB[0] - bGB[0];
                    return bGB[1] - aGB[1];
                });
            } else {
                items.sort(function(a, b) {
                    var aGB = a.geometricBounds, bGB = b.geometricBounds;
                    if (Math.abs(bGB[1] - aGB[1]) > 35) return bGB[1] - aGB[1];
                    return aGB[0] - bGB[0];
                });
            }
        };
        sortFn(cards, ord);
        sortFn(textBlocks, ord);

        var offX = parseFloat(txtOffsetX.text) || 45;
        var offY = parseFloat(txtOffsetY.text) || -15;
        var count = Math.min(cards.length, textBlocks.length);

        for (var p = 0; p < count; p++) {
            var c = cards[p], t = textBlocks[p];
            var cGB = c.geometricBounds, tGB = t.geometricBounds;
            var curr = t.position;
            var dx = (cGB[0] + offX) - tGB[0];
            var dy = (cGB[1] + offY) - tGB[1];
            t.position = [curr[0] + dx, curr[1] + dy];
            if (chkBringFront.value) t.zOrder(ZOrderMethod.BRINGTOFRONT);
            if (chkGroupPlaced.value && c.typename === "GroupItem" && t.parent !== c) {
                try { t.moveToBeginning(c); } catch(e) {}
            }
        }
        app.redraw();
        alert("Success! Moved " + count + " text blocks into cards!");
        win.close();
    }

    function formatDetailsText(details) {
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
    }

    function executeAutoFill() {
        if (!app.documents.length) {
            alert("No active document open.");
            return;
        }
        var doc = app.activeDocument;
        var raw = txtInput.text.replace(/^\s+|\s+$/g, '');
        if (!raw) {
            alert("Please enter biodata list or click 'Load Sample'.");
            return;
        }

        var entries = parseTextAdvanced(raw, chkStripNum.value, chkSkipNoName.value);
        if (!entries.length) {
            alert("No valid entries could be parsed from input text.");
            return;
        }

        var order = ddlOrder.selection.index === 0 ? "column" : (ddlOrder.selection.index === 1 ? "zigzag" : "auto_badge");
        var scope = ddlScope.selection.index === 0 ? "artboard" : (ddlScope.selection.index === 1 ? "selection" : "all_artboards");

        var cards = detectCardsAdvanced(scope);
        if (!cards.length) {
            alert("No template cards detected. Make sure cards are on the active artboard or selected.");
            return;
        }
        cards = sortCards(cards, order);

        // Skip cards that are already populated with visible text color
        var targetCards = [];
        for (var ci = 0; ci < cards.length; ci++) {
            var cCard = cards[ci];
            var isFilled = false;
            if (cCard.nameFrame && cCard.nameFrame.characters.length > 0) {
                var cfc = cCard.nameFrame.characters[0].fillColor;
                if (cfc && cfc.typename !== "NoColor") isFilled = true;
            }
            if (!isFilled) targetCards.push(cCard);
        }
        if (targetCards.length === 0) targetCards = cards;

        // Locate template fonts & colors from active document or target cards
        var docNameColor = null;
        var docBoldFont = null;
        var docRegularFont = null;
        var docDetailsLeading = null;
        var docNameLeading = null;
        var docBaniLeading = null;

        // Step A: Inspect target template cards
        for (var tc = 0; tc < targetCards.length; tc++) {
            var cCard = targetCards[tc];
            var cTF = cCard.nameFrame;
            if (cTF && cTF.characters && cTF.characters.length > 0) {
                var maxC = Math.min(cTF.characters.length, 30);
                for (var chIdx = 0; chIdx < maxC; chIdx++) {
                    try {
                        var ch = cTF.characters[chIdx];
                        var ca = ch.characterAttributes;
                        if (!ca) continue;
                        var tfnt = ca.textFont;
                        if (tfnt) {
                            var fn = tfnt.name || "";
                            if (!docBoldFont && fn.indexOf("Bold") !== -1) {
                                docBoldFont = tfnt;
                            }
                            if (!docRegularFont && (fn.indexOf("Regular") !== -1 || fn.indexOf("Normal") !== -1)) {
                                docRegularFont = tfnt;
                            }
                        }
                        var fc = ca.fillColor;
                        if (!docNameColor && fc && fc.typename !== "NoColor") {
                            if (fc.typename === "SpotColor" || (fc.typename === "CMYKColor" && fc.magenta > 50)) {
                                docNameColor = fc;
                            }
                        }
                    } catch(e) {}
                }

                try {
                    if (!docNameLeading && cTF.paragraphs.length > 0 && cTF.paragraphs[0].characters.length > 0) {
                        var nl = cTF.paragraphs[0].characters[0].characterAttributes.leading;
                        if (nl > 0) docNameLeading = nl;
                    }
                    if (!docDetailsLeading) {
                        if (cCard.detailsFrame && cCard.detailsFrame.characters.length > 0) {
                            var dl = cCard.detailsFrame.characters[0].characterAttributes.leading;
                            if (dl > 0) docDetailsLeading = dl;
                        } else if (cTF.paragraphs.length > 1 && cTF.paragraphs[1].characters.length > 0) {
                            var dl2 = cTF.paragraphs[1].characters[0].characterAttributes.leading;
                            if (dl2 > 0) docDetailsLeading = dl2;
                        }
                    }
                } catch(le) {}
            }

            if (!docBaniLeading && cCard.baniFrame && cCard.baniFrame.characters.length > 0) {
                try {
                    var bl = cCard.baniFrame.characters[0].characterAttributes.leading;
                    if (bl > 0) docBaniLeading = bl;
                } catch(be) {}
            }

            if (docBoldFont && docRegularFont && docNameColor && docDetailsLeading && docNameLeading) break;
        }

        // Step B: Fallback check all document text frames
        if (!docBoldFont || !docRegularFont || !docNameColor) {
            for (var tfIdx = 0; tfIdx < doc.textFrames.length; tfIdx++) {
                var candTF = doc.textFrames[tfIdx];
                try {
                    for (var c = 0; c < Math.min(candTF.characters.length, 30); c++) {
                        var ch = candTF.characters[c];
                        var ca = ch.characterAttributes;
                        if (!ca) continue;
                        var tfnt = ca.textFont;
                        if (tfnt) {
                            var fn = tfnt.name || "";
                            if (!docRegularFont && (fn.indexOf("Regular") !== -1 || fn.indexOf("Normal") !== -1)) {
                                docRegularFont = tfnt;
                            }
                            if (!docBoldFont && fn.indexOf("Bold") !== -1) {
                                docBoldFont = tfnt;
                            }
                        }
                        var fc = ca.fillColor;
                        if (!docNameColor && fc && fc.typename !== "NoColor") {
                            if (fc.typename === "SpotColor" || (fc.typename === "CMYKColor" && fc.magenta > 50)) {
                                docNameColor = fc;
                            }
                        }
                    }
                } catch(e) {}
                if (docBoldFont && docRegularFont && docNameColor) break;
            }
        }

        if (!docNameColor) {
            try {
                var sw = doc.swatches.getByName("C=0 M=87 Y=100 K=38");
                if (sw) docNameColor = sw.color;
            } catch(e) {}
        }
        if (!docNameColor) {
            var cmykBrown = new CMYKColor();
            cmykBrown.cyan = 0; cmykBrown.magenta = 87; cmykBrown.yellow = 100; cmykBrown.black = 38;
            docNameColor = cmykBrown;
        }

        var solidBlackCMYK = new CMYKColor();
        solidBlackCMYK.cyan = 0; solidBlackCMYK.magenta = 0; solidBlackCMYK.yellow = 0; solidBlackCMYK.black = 100;

        var colorMap = [null, "#000000", "#1E5AA8", "#1B6E3F", "#9C1A1A", "#C88210"];
        var chosenHex = colorMap[ddlNameColor.selection.index];
        var isCMYK = (doc.documentColorSpace === DocumentColorSpace.CMYK);
        var finalNameColor = docNameColor;
        if (chosenHex) {
            finalNameColor = hexToColor(chosenHex, isCMYK) || docNameColor;
        }

        var detHScale = (typeof txtDetailsHScale !== "undefined" && txtDetailsHScale) ? (parseFloat(txtDetailsHScale.text) || 85) : 85;
        var nmHScale = (typeof txtNameHScale !== "undefined" && txtNameHScale) ? (parseFloat(txtNameHScale.text) || 100) : 100;

        var filledCount = 0;
        var limit = Math.min(targetCards.length, entries.length);

        for (var i = 0; i < limit; i++) {
            var cd = targetCards[i];
            var en = entries[i];

            // Extract this specific card's own leading BEFORE modifying contents
            var thisCardDetailsLeading = null;
            var thisCardNameLeading = null;
            var thisCardBaniLeading = null;

            try {
                if (cd.detailsFrame && cd.detailsFrame.characters.length > 0) {
                    var l0 = cd.detailsFrame.characters[0].characterAttributes.leading;
                    if (l0 > 0) thisCardDetailsLeading = l0;
                }
                if (cd.nameFrame && cd.nameFrame.characters.length > 0) {
                    if (cd.nameFrame.paragraphs.length > 0 && cd.nameFrame.paragraphs[0].characters.length > 0) {
                        var nl0 = cd.nameFrame.paragraphs[0].characters[0].characterAttributes.leading;
                        if (nl0 > 0) thisCardNameLeading = nl0;
                    }
                    if (!thisCardDetailsLeading && cd.nameFrame.paragraphs.length > 1 && cd.nameFrame.paragraphs[1].characters.length > 0) {
                        var dl0 = cd.nameFrame.paragraphs[1].characters[0].characterAttributes.leading;
                        if (dl0 > 0) thisCardDetailsLeading = dl0;
                    }
                }
                if (cd.baniFrame && cd.baniFrame.characters.length > 0) {
                    var bl0 = cd.baniFrame.characters[0].characterAttributes.leading;
                    if (bl0 > 0) thisCardBaniLeading = bl0;
                }
            } catch(e) {}

            var finalDetailsLeading = thisCardDetailsLeading || docDetailsLeading || 9.6;
            var finalNameLeading = thisCardNameLeading || docNameLeading || finalDetailsLeading || 10;
            var finalBaniLeading = thisCardBaniLeading || docBaniLeading || 6.1279;

            try {
                // 1. Personal Info (Name + Details)
                if (cd.nameFrame && en.name) {
                    var cardNameColor = null;
                    try {
                        if (cd.nameFrame.characters.length > 0) {
                            var fc = cd.nameFrame.characters[0].characterAttributes.fillColor;
                            if (fc && (fc.typename === "SpotColor" || (fc.typename === "CMYKColor" && fc.magenta > 50))) {
                                cardNameColor = fc;
                            }
                        }
                    } catch(e) {}

                    if (cd.detailsFrame) {
                        cd.nameFrame.contents = en.name;
                        try {
                            if (docBoldFont) cd.nameFrame.textRange.characterAttributes.textFont = docBoldFont;
                            else if (chkMakeBold.value) applyBoldFont(cd.nameFrame);
                            cd.nameFrame.textRange.characterAttributes.size = 10;
                            cd.nameFrame.textRange.characterAttributes.leading = finalNameLeading;
                            cd.nameFrame.textRange.characterAttributes.tracking = -14;
                            cd.nameFrame.textRange.characterAttributes.horizontalScale = nmHScale;
                            cd.nameFrame.textRange.characterAttributes.fillColor = finalNameColor;
                        } catch(e) {}

                        if (en.details) {
                            cd.detailsFrame.contents = en.details;
                            try {
                                if (docRegularFont) cd.detailsFrame.textRange.characterAttributes.textFont = docRegularFont;
                                cd.detailsFrame.textRange.characterAttributes.size = 7.5;
                                cd.detailsFrame.textRange.characterAttributes.leading = finalDetailsLeading;
                                cd.detailsFrame.textRange.characterAttributes.tracking = -15;
                                cd.detailsFrame.textRange.characterAttributes.horizontalScale = detHScale;
                                cd.detailsFrame.textRange.characterAttributes.fillColor = solidBlackCMYK;
                            } catch(e) {}
                        }
                    } else {
                        var fullInfo = en.name + (en.details ? ("\r" + en.details) : "");
                        cd.nameFrame.contents = fullInfo;

                        // Precise typography matching template:
                        // Line 1: Bornomala-Bold, 10pt, Leading matching template, Tracking -14, User chosen color
                        // Lines 2-N: Bornomala-Regular, 7.5pt, Leading matching template, Tracking -15, Solid Black
                        try {
                            if (cd.nameFrame.paragraphs.length > 0) {
                                var p0 = cd.nameFrame.paragraphs[0];
                                if (docBoldFont) p0.characterAttributes.textFont = docBoldFont;
                                else if (chkMakeBold.value) applyBoldFont(p0);
                                p0.characterAttributes.size = 10;
                                p0.characterAttributes.leading = finalNameLeading;
                                p0.characterAttributes.tracking = -14;
                                p0.characterAttributes.horizontalScale = nmHScale;
                                p0.characterAttributes.fillColor = finalNameColor;
                            }
                        } catch(p0Err) {}

                        // Additional pass for lines 2..N: strictly apply Regular font, 7.5pt, Solid Black
                        var pLen = cd.nameFrame.paragraphs.length;
                        for (var p = 1; p < pLen; p++) {
                            try {
                                var para = cd.nameFrame.paragraphs[p];
                                if (!para || para.characters.length === 0) continue;
                                if (docRegularFont) {
                                    para.characterAttributes.textFont = docRegularFont;
                                } else {
                                    applyRegularFont(para);
                                }
                                para.characterAttributes.size = 7.5;
                                para.characterAttributes.leading = finalDetailsLeading;
                                para.characterAttributes.tracking = -15;
                                para.characterAttributes.horizontalScale = detHScale;
                                para.characterAttributes.fillColor = solidBlackCMYK;
                            } catch(pe) {}
                        }
                    }
                }

                // 2. Bani Quote: Bornomala-Bold, 5pt, Dynamic Leading, Tracking -15, Solid Black
                if (chkFillBani.value && cd.baniFrame && en.bani) {
                    cd.baniFrame.contents = en.bani;
                    try {
                        var btf = cd.baniFrame;
                        if (docBoldFont) btf.textRange.characterAttributes.textFont = docBoldFont;
                        btf.textRange.characterAttributes.size = 5;
                        btf.textRange.characterAttributes.leading = finalBaniLeading;
                        btf.textRange.characterAttributes.tracking = -15;
                                                // Smart background color check: White on dark shapes, Black on light
                        var isDarkBg = false;
                        try {
                            if (cd.group) {
                                var bgb = btf.geometricBounds;
                                for (var p = 0; p < cd.group.pageItems.length; p++) {
                                    var pi = cd.group.pageItems[p];
                                    if (pi.typename === "PathItem" && pi.filled) {
                                        var pgb = pi.geometricBounds;
                                        if (pgb[0] <= bgb[0] + 10 && pgb[2] >= bgb[2] - 10 && pgb[1] >= bgb[1] - 10 && pgb[3] <= bgb[3] + 10) {
                                            var fc = pi.fillColor;
                                            if (fc.typename === "CMYKColor") {
                                                if (fc.black > 25 || (fc.cyan + fc.magenta > 70)) isDarkBg = true;
                                            } else if (fc.typename === "RGBColor") {
                                                if (fc.red < 120 && fc.green < 120 && fc.blue < 120) isDarkBg = true;
                                            }
                                        }
                                    }
                                }
                            }
                        } catch(bge) {}

                        if (isDarkBg) {
                            var whiteColor = (doc.documentColorSpace === DocumentColorSpace.CMYK) ? new CMYKColor() : new RGBColor();
                            if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
                                whiteColor.cyan = 0; whiteColor.magenta = 0; whiteColor.yellow = 0; whiteColor.black = 0;
                            } else {
                                whiteColor.red = 255; whiteColor.green = 255; whiteColor.blue = 255;
                            }
                            btf.textRange.characterAttributes.fillColor = whiteColor;
                        } else {
                            btf.textRange.characterAttributes.fillColor = solidBlackCMYK;
                        }

                        if (en.bani.length > 140 && btf.kind === TextType.AREATEXT) {
                            btf.textRange.characterAttributes.size = 4.3;
                            btf.textRange.characterAttributes.leading = 5.2;
                        }
                    } catch(be) {}
                }

                // 3. Quantity Demo Number replacement
                if (chkFillQty.value && cd.qtyFrame && en.qty) {
                    var rawNum = bengaliToInt(en.qty);
                    if (rawNum > 0) {
                        var fmt = ddlQtyFormat.selection.index;
                        var finalQtyStr = "";
                        if (fmt === 1) finalQtyStr = String(rawNum);
                        else if (fmt === 2) finalQtyStr = intToBengali(rawNum, false);
                        else {
                            var demoTxt = cd.qtyFrame.contents;
                            if (/[০-৯]/.test(demoTxt)) finalQtyStr = intToBengali(rawNum, false);
                            else finalQtyStr = String(rawNum);
                        }
                        cd.qtyFrame.contents = finalQtyStr;
                        try {
                            cd.qtyFrame.textRange.characterAttributes.fillColor = solidBlackCMYK;
                        } catch(qe) {}
                    }
                }

                filledCount++;
            } catch (err) {}
        }

        app.redraw();
        alert("🎉 Success!\nPopulated " + filledCount + " card(s) out of " + entries.length + " parsed entries.\n(Cards available: " + cards.length + ")");
        win.close();
    }

    // ==========================================
    // Advanced Parser (Handles Serial, Name, Details, Qty & Bani)
    // ==========================================
    function parseTextAdvanced(raw, stripNum, skipEmptyName) {
        var lines = raw.split(/\r\n|\r|\n/);
        var entries = [];
        var cur = null;

        function finalizeEntry(e) {
            if (!e) return;
            var nonMetaLines = [];
            var baniLines = [];
            var inBani = false;

            for (var l = 0; l < e.rawLines.length; l++) {
                var line = e.rawLines[l].replace(/^\s+|\s+$/g, '');
                if (!line) continue;

                if (inBani) {
                    baniLines.push(line);
                    continue;
                }

                if (/^(?:[\u09AC][\u09BE][\u09A3\u09A8][\u09C0])\s*[:\u0983]/i.test(line)) {
                    inBani = true;
                    baniLines.push(line);
                    continue;
                }

                var qm = line.match(qtyRegex);
                if (qm) {
                    e.qty = qm[1];
                    continue;
                }

                nonMetaLines.push(line);
            }

            if (nonMetaLines.length > 0) {
                var nameLine = nonMetaLines[0];
                if (stripNum) {
                    // Keyring mode: completely strip serial prefix
                    nameLine = nameLine.replace(serialPrefixRegex, '').replace(/^\s+|\s+$/g, '');
                } else {
                    // Diary mode: ensure serial is prefixed
                    var clean = nameLine.replace(serialPrefixRegex, '').replace(/^\s+|\s+$/g, '');
                    if (e.serial) nameLine = e.serial + ". " + clean;
                }
                e.name = nameLine;
                e.details = nonMetaLines.slice(1).join('\r');
            }
            if (baniLines.length > 0) {
                e.bani = baniLines.join(' ');
            }
        }

        for (var j = 0; j < lines.length; j++) {
            var line = lines[j].replace(/^\s+|\s+$/g, '');
            if (!line) continue;

            var sm = line.match(serialLineRegex);
            if (sm) {
                if (cur) { finalizeEntry(cur); entries.push(cur); }
                cur = { serial: sm[1], rawLines: [], name: "", details: "", qty: "", bani: "" };
            } else if (serialPrefixRegex.test(line)) {
                if (cur) { finalizeEntry(cur); entries.push(cur); }
                cur = { serial: "", rawLines: [line], name: "", details: "", qty: "", bani: "" };
            } else {
                if (!cur) cur = { serial: "", rawLines: [], name: "", details: "", qty: "", bani: "" };
                cur.rawLines.push(line);
            }
        }
        if (cur) { finalizeEntry(cur); entries.push(cur); }

        var result = [];
        for (var k = 0; k < entries.length; k++) {
            if (skipEmptyName && !entries[k].name) continue;
            result.push(entries[k]);
        }
        return result;
    }

    // ==========================================
    // Advanced Card Detection (Handles Grouped & Proximity Loose Frames)
    // ==========================================
    function isTextFrameNoColor(tf) {
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
    }

    function isItemHidden(item) {
        if (!item) return true;
        try {
            if (item.hidden) return true;
        } catch(e) {}
        try {
            var cur = item;
            while (cur) {
                if (cur.typename === "Layer") {
                    if (!cur.visible) return true;
                    if (cur.parent && cur.parent.typename === "Layer" && !cur.parent.visible) return true;
                    break;
                }
                if (cur.hidden) return true;
                cur = cur.parent;
            }
        } catch(e) {}
        return false;
    }

    function isBackSideText(text) {
        if (!text) return false;
        var norm = text.replace(/[\s\(\)\-\_–—\.\,\:\;\[\]\{\}\/\\।০-৯0-9'"]/g, '');
        if (norm.indexOf("দাওরায়েহাদীস") !== -1 ||
            norm.indexOf("দাওরায়েহাদিস") !== -1 ||
            norm.indexOf("দাওরায়েহাদীছ") !== -1 ||
            norm.indexOf("দাওরায়েহাদিসসমাপনীস্মৃতি") !== -1 ||
            norm.indexOf("দাওরায়েহাদীসমাস্টার্সসমাপনীস্মৃতি") !== -1 ||
            norm.indexOf("মাস্টার্সসমাপনীস্মৃতি") !== -1 ||
            norm.indexOf("হিফজসমাপনী") !== -1 ||
            norm.indexOf("হিফযসমাপনী") !== -1 ||
            norm.indexOf("হিফজুলকুরআন") !== -1 ||
            norm.indexOf("হিফযুলকুরআন") !== -1 ||
            norm.indexOf("হিফজুলকুরআনসমাপনী") !== -1 ||
            norm.indexOf("হিফযুলকুরআনসমাপনী") !== -1 ||
            norm.indexOf("সমাপনীস্মৃতি") !== -1 ||
            norm.indexOf("বিদায়ীস্মৃতি") !== -1 ||
            norm.indexOf("বিদায়িস্মৃতি") !== -1 ||
            norm.indexOf("স্মৃতিস্মারক") !== -1) {
            return true;
        }
        var backRegex = /(?:দাওরায়ে\s*হাদ[ীি][সছ]|হিফ[জয]\s*সমাপনী|হিফ[জয]ুল\s*কুর?আন|সমাপনী\s*স্মৃতি|মাস্টার্স\s*সমাপনী|বিদায়[ীি]\s*স্মৃতি|স্মৃতি\s*স্মারক|مرحلة\s*التكميل)/;
        return backRegex.test(text);
    }

    function hasStudentBiodata(text) {
        if (!text) return false;
        if (text.indexOf("পিতা:") !== -1 || text.indexOf("পিতা :") !== -1 || text.indexOf("পিতা") !== -1 ||
            text.indexOf("الوالদ:") !== -1 || text.indexOf("الوالড :") !== -1 || text.indexOf("বাবার নাম") !== -1) {
            return true;
        }
        if (/01[3-9]\d{8}/.test(text) || /০১[৩-৯][০-৯]{8}/.test(text) || /٠١[٠-৯]{9}/.test(text)) {
            return true;
        }
        var studentTitles = ["মাওলানা", "মুহাম্মাদ", "মোহাম্মদ", "মোঃ", "হাফেজ", "মুফতী", "ক্বারী", "শিক্ষার্থী", "ছাত্র", "الحافظ", "مولانا"];
        for (var s = 0; s < studentTitles.length; s++) {
            if (text.indexOf(studentTitles[s]) !== -1 && (text.indexOf("\n") !== -1 || text.indexOf("\r") !== -1)) {
                return true;
            }
        }
        return false;
    }

    function collectVisibleLayers(parent, outLayers) {
        if (!parent) return;
        try {
            var lays = parent.layers;
            if (!lays) return;
            for (var l = 0; l < lays.length; l++) {
                var lay = lays[l];
                if (!lay.visible) continue; // STRICT: Ignore hidden layers completely!
                outLayers.push(lay);
                if (lay.layers && lay.layers.length > 0) {
                    collectVisibleLayers(lay, outLayers);
                }
            }
        } catch(e) {}
    }

    function collectTextFrames(items, outList) {
        if (!items) return;
        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            if (isItemHidden(it)) continue; // STRICT: Ignore hidden items
            if (it.typename === "TextFrame") {
                outList.push(it);
            } else if (it.typename === "GroupItem") {
                collectTextFrames(it.pageItems, outList);
            }
        }
    }

    function detectCardsAdvanced(scope) {
        var cardUnits = [];
        var candidateItems = [];

        if (scope === "selection" && doc.selection && doc.selection.length > 0) {
            for (var s = 0; s < doc.selection.length; s++) {
                var sItem = doc.selection[s];
                if (isItemHidden(sItem)) continue; // STRICT: Ignore hidden items
                candidateItems.push(sItem);
            }
        } else if (scope === "all_artboards") {
            var visibleLayers = [];
            collectVisibleLayers(doc, visibleLayers);
            for (var l = 0; l < visibleLayers.length; l++) {
                var layer = visibleLayers[l];
                for (var i = 0; i < layer.pageItems.length; i++) {
                    var pIt = layer.pageItems[i];
                    if (isItemHidden(pIt)) continue; // STRICT: Ignore hidden items
                    candidateItems.push(pIt);
                }
            }
        } else {
            var abIndex = doc.artboards.getActiveArtboardIndex();
            var abRect = doc.artboards[abIndex].artboardRect;
            var visibleLayers = [];
            collectVisibleLayers(doc, visibleLayers);
            for (var l = 0; l < visibleLayers.length; l++) {
                var layer = visibleLayers[l];
                for (var j = 0; j < layer.pageItems.length; j++) {
                    var pItem = layer.pageItems[j];
                    if (isItemHidden(pItem)) continue; // STRICT: Ignore hidden items
                    var gb = pItem.geometricBounds;
                    if (gb[0] < abRect[2] && gb[2] > abRect[0] && gb[1] > abRect[3] && gb[3] < abRect[1]) {
                        candidateItems.push(pItem);
                    }
                }
            }
        }

        // 1. Recursive group-based detection
        for (var g = 0; g < candidateItems.length; g++) {
            extractCardsFromItem(candidateItems[g], cardUnits);
        }

        // 2. Proximity-based detection fallback
        if (cardUnits.length === 0) {
            var allTFs = [];
            collectTextFrames(candidateItems, allTFs);
            var filteredTFs = [];
            for (var t = 0; t < allTFs.length; t++) {
                var tf = allTFs[t];
                if (isItemHidden(tf)) continue;
                if (isBackSideText(tf.contents)) continue; // STRICT: Never consider back-side text
                if (tf.contents.length > 500 || tf.lines.length > 15) continue;
                filteredTFs.push(tf);
            }
            if (filteredTFs.length >= 2) {
                cardUnits = clusterProximityCards(filteredTFs);
            }
        }

        // 3. Tag artboardIndex and exclude items floating on pasteboard outside any artboard
        var validCards = [];
        for (var c = 0; c < cardUnits.length; c++) {
            var cd = cardUnits[c];
            var midX = (cd.bounds[0] + cd.bounds[2]) / 2;
            var midY = (cd.bounds[1] + cd.bounds[3]) / 2;
            cd.artboardIndex = 0;
            var isOnArtboard = false;
            for (var a = 0; a < doc.artboards.length; a++) {
                var r = doc.artboards[a].artboardRect;
                if (midX >= r[0] && midX <= r[2] && midY <= r[1] && midY >= r[3]) {
                    cd.artboardIndex = a;
                    isOnArtboard = true;
                    break;
                }
            }
            if (scope === "selection" || isOnArtboard) {
                validCards.push(cd);
            }
        }

        return validCards;
    }

    function extractCardsFromItem(item, outCards) {
        if (!item || isItemHidden(item)) return;

        if (item.typename === "GroupItem") {
            var tfs = [];
            collectTextFrames(item.pageItems, tfs);
            if (tfs.length === 0) return;

            var hasBack = false;
            var hasBio = false;
            var personCount = 0;

            for (var t = 0; t < tfs.length; t++) {
                var cTxt = tfs[t].contents;
                if (isBackSideText(cTxt)) {
                    hasBack = true;
                }
                if (hasStudentBiodata(cTxt)) {
                    hasBio = true;
                    personCount++;
                }
            }

            // STRICT: If this group is a BACK-SIDE design (e.g. দাওরায়ে হাদীস সমাপনী স্মৃতি, হিফজ সমাপনী, etc.)
            // and contains NO student biodata, it must NEVER be detected as a card!
            if (hasBack && !hasBio) {
                return; // DO NOT DETECT BACK-SIDE TEMPLATES!
            }

            // If this group contains multiple cards (e.g. column or grid of cards grouped together):
            if (personCount > 1) {
                for (var c = 0; c < item.pageItems.length; c++) {
                    extractCardsFromItem(item.pageItems[c], outCards);
                }
                return;
            }

            // Otherwise, analyze this group as a potential single card
            if (tfs.length >= 1) {
                var card = analyzeCardGroup(tfs, item);
                if (card.nameFrame || card.namePlaceholderPath) {
                    card.group = item;
                    card.bounds = item.geometricBounds;
                    outCards.push(card);
                    return;
                }
            }

            // If not recognized directly, drill down into child groups
            for (var k = 0; k < item.pageItems.length; k++) {
                if (item.pageItems[k].typename === "GroupItem") {
                    extractCardsFromItem(item.pageItems[k], outCards);
                }
            }
        }
    }

    function analyzeCardGroup(tfs, group) {
        var card = { nameFrame: null, detailsFrame: null, baniFrame: null, qtyFrame: null, badgeFrame: null, badgeNumber: -1 };
        var candidateFrames = [];

        for (var i = 0; i < tfs.length; i++) {
            var tf = tfs[i];
            if (isItemHidden(tf)) continue; // STRICT: Ignore hidden items
            var rawTxt = tf.contents;
            var cleanTxt = rawTxt.replace(/\s+/g, "");
            var num = bengaliToInt(cleanTxt);

            // 1. Qty / Pcs frame: small numeric frame (e.g. "10", "২০", "15")
            if (cleanTxt.length <= 4 && num > 0 && tf.width < 45 && tf.height < 30) {
                if (!card.qtyFrame) card.qtyFrame = tf;
                else card.badgeFrame = tf;
                card.badgeNumber = num;
                continue;
            }

            // 2. Title / Memorabilia / Back-side frame (STRICT: "দাওরায়ে হাদীস সমাপনী স্মৃতি", "হিফজ সমাপনী", etc.)
            if (isBackSideText(rawTxt) || /(?:দাওরায়ে|মাস্টার্স|স্মৃতি|সমাপনী|হিফ[জয]|তাকমীল|দস্তারবন্দী|বিদায়ী|স্মারক)/.test(rawTxt)) {
                if (rawTxt.length < 90) {
                    continue;
                }
            }

            // 3. Madrasa / Institution name frame
            if (/gv`vwim|gv`ivmv|mZxNvUv|মাদ্রাসা|মাদরাসা|মারকায|জামিয়া|ইনস্টিটিউট|বিদ্যালয়|স্কুল|কলেজ/.test(rawTxt)) {
                continue;
            }

            // 4. Design label (e.g. "ডিজাইন ১", "ডিজাইন ২", "Tapper Round")
            if (/^ডিজাইন\s*[০-৯0-9]+/i.test(rawTxt) || /^(?:Tapper|Round|Design)/i.test(rawTxt)) {
                continue;
            }

            candidateFrames.push(tf);
        }

        // USER RULE: "name er jayga ar banir jaygay kono fill color thakbe na oi jayga gulo te data gula bosbe"
        // In card templates, Name sits at the TOP (higher Y), Bani sits at the BOTTOM (lower Y).
        // Sort candidate frames by Y coordinate descending (top-to-bottom):
        candidateFrames.sort(function(a, b) {
            return b.geometricBounds[1] - a.geometricBounds[1];
        });

        // Check for explicit "বাণী" in candidate frames
        var explicitBaniIdx = -1;
        for (var b = 0; b < candidateFrames.length; b++) {
            if (/[ব][া][ণন][ী]/.test(candidateFrames[b].contents) || /^[ব][া][ণন][ী]/i.test(candidateFrames[b].contents.replace(/\s+/g, ""))) {
                explicitBaniIdx = b;
                break;
            }
        }

        var explicitBioIdx = -1;
        for (var bio = 0; bio < candidateFrames.length; bio++) {
            if (hasStudentBiodata(candidateFrames[bio].contents)) {
                explicitBioIdx = bio;
                break;
            }
        }

        if (candidateFrames.length === 1) {
            card.nameFrame = candidateFrames[0];
        } else if (candidateFrames.length === 2) {
            if (explicitBaniIdx === 0 && explicitBioIdx === 1) {
                card.baniFrame = candidateFrames[0];
                card.nameFrame = candidateFrames[1];
            } else if (explicitBaniIdx === 1) {
                card.nameFrame = candidateFrames[0];
                card.baniFrame = candidateFrames[1];
            } else {
                card.nameFrame = candidateFrames[0]; // Top = Name
                card.baniFrame = candidateFrames[1]; // Bottom = Bani
            }
        } else if (candidateFrames.length >= 3) {
            if (explicitBaniIdx !== -1) {
                card.baniFrame = candidateFrames[explicitBaniIdx];
                var rest = [];
                for (var r = 0; r < candidateFrames.length; r++) {
                    if (r !== explicitBaniIdx) rest.push(candidateFrames[r]);
                }
                card.nameFrame = rest[0];
                if (rest.length > 1) card.detailsFrame = rest[1];
            } else {
                card.nameFrame = candidateFrames[0]; // Top = Name
                card.detailsFrame = candidateFrames[1]; // Middle = Details
                card.baniFrame = candidateFrames[candidateFrames.length - 1]; // Bottom = Bani
            }
        }

        // Fallback: If no textframes for Name/Bani found, check for unfilled PathItems (transparent placeholder boxes)
        if (!card.nameFrame && group && group.pageItems) {
            var noFillPaths = [];
            for (var p = 0; p < group.pageItems.length; p++) {
                var pi = group.pageItems[p];
                if (isItemHidden(pi)) continue;
                if (pi.typename === "PathItem") {
                    var isF = false;
                    try { isF = pi.filled; } catch(e) {}
                    if (!isF && pi.width > 40 && pi.height > 10) {
                        noFillPaths.push(pi);
                    }
                }
            }
            if (noFillPaths.length > 0) {
                noFillPaths.sort(function(a, b) {
                    return b.geometricBounds[1] - a.geometricBounds[1];
                });
                card.namePlaceholderPath = noFillPaths[0];
                if (noFillPaths.length > 1) {
                    card.baniPlaceholderPath = noFillPaths[noFillPaths.length - 1];
                }
            }
        }

        return card;
    }

    function clusterProximityCards(allTFs) {
        var infoList = [];
        for (var j = 0; j < allTFs.length; j++) {
            var itf = allTFs[j];
            if (isItemHidden(itf)) continue; // STRICT: Ignore hidden items
            var txt = itf.contents;
            var width = itf.geometricBounds[2] - itf.geometricBounds[0];

            // NEVER treat back-side text as student info frame!
            if (isBackSideText(txt)) continue;
            if (/[ব][া][ণন][ী]/.test(txt)) continue;
            if (/^[০-৯0-9]{1,4}$/.test(txt.replace(/\s+/g, ''))) continue;
            if (txt.indexOf("হিফজুল") !== -1 || txt.indexOf("সমাপনী") !== -1 || txt.indexOf("স্মৃতি") !== -1 || width < 40) continue;

            if (hasStudentBiodata(txt) || itf.lines.length >= 2 || txt.indexOf("পিতা:") !== -1 || txt.indexOf("হাফেজ") !== -1 || txt.indexOf("মো:") !== -1) {
                infoList.push(itf);
            }
        }

        var cards = [];
        for (var k = 0; k < infoList.length; k++) {
            var infoTF = infoList[k];
            var igb = infoTF.geometricBounds;
            var infoTop = igb[1];
            var infoLeft = igb[0];

            var card = {
                nameFrame: infoTF,
                detailsFrame: null,
                baniFrame: null,
                qtyFrame: null,
                badgeFrame: null,
                badgeNumber: -1,
                bounds: [igb[0] - 50, igb[1] + 20, igb[2] + 80, igb[3] - 40]
            };

            for (var m = 0; m < allTFs.length; m++) {
                var cand = allTFs[m];
                if (cand === infoTF || isItemHidden(cand)) continue;
                var cgb = cand.geometricBounds;
                var dy = infoTop - cgb[1];
                var dx = cgb[0] - infoLeft;

                if (dy >= -30 && dy <= 90 && dx >= -60 && dx <= 140) {
                    var ctxt = cand.contents.replace(/^\s+|\s+$/g, '');
                    if (isBackSideText(ctxt)) continue; // STRICT: Never treat back-side text as bani/qty
                    if (/[ব][া][ণন][ী]/.test(ctxt)) {
                        card.baniFrame = cand;
                    } else if (/^[০-৯0-9]{1,4}$/.test(ctxt)) {
                        card.qtyFrame = cand;
                    } else if (ctxt.indexOf("হিফজুল") !== -1 || ctxt.indexOf("সমাপনী") !== -1 || ctxt.indexOf("স্মৃতি") !== -1) {
                        card.badgeFrame = cand;
                    }
                }
            }
            cards.push(card);
        }

        return cards;
    }

    function applyBoldFont(textRangeOrFrame) {
        try {
            var tr = textRangeOrFrame.textRange ? textRangeOrFrame.textRange : textRangeOrFrame;
            if (!tr || !tr.characterAttributes) return;
            var currFont = tr.characterAttributes.textFont;
            if (!currFont) return;
            if (/bold|bl/i.test(currFont.name) || /bold|bl/i.test(currFont.style)) return;
            for (var i = 0; i < app.textFonts.length; i++) {
                var f = app.textFonts[i];
                if (f.family === currFont.family && /bold|semibold|demi/i.test(f.style)) {
                    tr.characterAttributes.textFont = f;
                    return;
                }
            }
        } catch (e) {}
    }

    function applyRegularFont(textRangeOrFrame) {
        try {
            var tr = textRangeOrFrame.textRange ? textRangeOrFrame.textRange : textRangeOrFrame;
            if (!tr || !tr.characterAttributes) return;
            var currFont = tr.characterAttributes.textFont;
            if (!currFont) return;
            if (/regular|normal/i.test(currFont.name) || /regular|normal/i.test(currFont.style)) return;

            var doc = app.activeDocument;
            for (var i = 0; i < doc.textFrames.length; i++) {
                var tf = doc.textFrames[i];
                for (var c = 0; c < Math.min(tf.characters.length, 15); c++) {
                    var f = tf.characters[c].textFont;
                    if (f && f.family === currFont.family && /regular|normal/i.test(f.style || f.name)) {
                        tr.characterAttributes.textFont = f;
                        return;
                    }
                }
            }
        } catch (e) {}
    }

    
    function hexToColor(hex, isCMYK) {
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
    }

    win.show();
})();
