#target illustrator

/**
 * Set Bornomala as Default Font in Adobe Illustrator
 * Author: Yahia Bin Zaman & Antigravity
 * 
 * Automatically updates:
 * 1. Active open document(s)
 * 2. All New Document Profiles (Print.ai, Web.ai, Art & Illustration.ai, etc.)
 * Sets [Normal Character Style] and [Normal Paragraph Style] to Bornomala-Regular
 * And adds Bornomala-Bold character style.
 */

(function() {
    var fontReg = null;
    var fontBold = null;

    for (var i = 0; i < app.textFonts.length; i++) {
        try {
            var tf = app.textFonts[i];
            var fn = tf.name;
            var fam = tf.family || "";
            var fs = tf.style || "";
            
            if (fn === "Bornomala-Regular" || fn === "BornomalaANSI-Regular" || fn === "Bornomala") {
                if (!fontReg) fontReg = tf;
            }
            if (fn === "Bornomala-Bold" || fn === "BornomalaANSI-Bold") {
                if (!fontBold) fontBold = tf;
            }
        } catch(e) {}
    }

    // Comprehensive search across installed fonts
    if (!fontReg || !fontBold) {
        for (var j = 0; j < app.textFonts.length; j++) {
            try {
                var tf = app.textFonts[j];
                var fn = tf.name || "";
                var fam = tf.family || "";
                var fs = tf.style || "";
                var desc = (fn + " " + fam + " " + fs).toLowerCase();
                
                if (desc.indexOf("bornomala") !== -1 || desc.indexOf("sutonny") !== -1) {
                    if (!fontBold && (desc.indexOf("bold") !== -1)) fontBold = tf;
                    else if (!fontReg && (desc.indexOf("regular") !== -1 || fs === "" || fs === "Normal")) fontReg = tf;
                }
            } catch(e2) {}
        }
    }

    if (fontReg && !fontBold) fontBold = fontReg;
    if (!fontReg && fontBold) fontReg = fontBold;

    if (!fontReg) {
        alert("❌ ত্রুটি: Bornomala ফন্টটি Illustrator-এ খুঁজে পাওয়া যায়নি!

দয়া করে ফন্ট ফোল্ডারে থাকা Bornomala-Regular.ttf এবং Bornomala-Bold.ttf ইনস্টল করুন।", "Bornomala Font Not Found");
        return;
    }

    var updatedCount = 0;
    var profileNames = ["Print.ai", "Art & Illustration.ai", "Web.ai", "Mobile.ai", "Film & Video.ai", "Social.ai", "Branding.ai"];

    function updateDocStyles(doc) {
        var changed = false;
        try {
            var ncs = doc.characterStyles["[Normal Character Style]"];
            if (ncs) {
                ncs.characterAttributes.textFont = fontReg;
                changed = true;
            }
        } catch(e1) {}

        try {
            var nps = doc.paragraphStyles["[Normal Paragraph Style]"];
            if (nps) {
                nps.characterAttributes.textFont = fontReg;
                changed = true;
            }
        } catch(e2) {}

        if (fontBold) {
            try {
                var bcs = null;
                try { bcs = doc.characterStyles.getByName("Bornomala Bold"); } catch(bErr) {}
                if (!bcs) bcs = doc.characterStyles.add("Bornomala Bold");
                bcs.characterAttributes.textFont = fontBold;
                changed = true;
            } catch(e3) {}
        }
        return changed;
    }

    // 1. Update all currently open documents
    for (var d = 0; d < app.documents.length; d++) {
        try {
            updateDocStyles(app.documents[d]);
        } catch(docErr) {}
    }

    // 2. Scan and update all New Document Profiles across Adobe Illustrator installations
    var versions = ["30", "29", "28", "27", "26"];
    var locales = ["en_US", "en_GB", "en_AE", "en_IL"];

    for (var v = 0; v < versions.length; v++) {
        for (var loc = 0; loc < locales.length; loc++) {
            var profFolder = new Folder(Folder.userData + "/Adobe/Adobe Illustrator " + versions[v] + "/" + locales[loc] + "/New Document Profiles");
            if (profFolder.exists) {
                for (var p = 0; p < profileNames.length; p++) {
                    var aiFile = new File(profFolder.fsName + "/" + profileNames[p]);
                    if (aiFile.exists) {
                        try {
                            var bakFile = new File(aiFile.fsName + ".bak");
                            if (!bakFile.exists) {
                                aiFile.copy(bakFile);
                            }

                            var profDoc = app.open(aiFile);
                            updateDocStyles(profDoc);
                            profDoc.save();
                            profDoc.close();
                            updatedCount++;
                        } catch(profErr) {}
                    }
                }
            }
        }
    }

    var msg = "🎉 সফল হয়েছে!

";
    msg += "• ডিফল্ট ফন্ট সেট করা হয়েছে: " + fontReg.name + "
";
    if (fontBold) msg += "• বোল্ড স্টাইল যুক্ত করা হয়েছে: " + fontBold.name + "
";
    msg += "• ওপেন থাকা ডকুমেন্ট আপডেট: " + app.documents.length + " টি
";
    msg += "• আপডেট করা টেমপ্লেট প্রোফাইল সংখ্যা: " + updatedCount + " টি

";
    msg += "এখন থেকে নতুন টেক্সট বক্স নিলে বা যেকোনো নতুন ফাইল (Cmd+N) তৈরি করলেই ডিফল্ট ফন্ট হিসেবে Bornomala আসবে!";

    alert(msg, "Bornomala Default Font Configured");
})();
