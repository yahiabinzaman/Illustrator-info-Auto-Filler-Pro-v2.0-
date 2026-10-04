//@target illustrator

/**
 * ============================================================================
 * ONE-CLICK INSTALLER FOR NAME & CARD AUTO-FILLER (EXTENSION & SCRIPT)
 * ============================================================================
 */

(function () {
    var scriptFile = new File($.fileName);
    var scriptFolder = scriptFile.parent;

    var extFolderName = "Name_Card_AutoFiller";
    var isMac = (File.fs === "Macintosh" || (typeof $.os !== "undefined" && $.os.indexOf("Mac") !== -1));

    // 1. Install CEP Extension to User CEP Directory
    var cepFolder;
    if (isMac) {
        cepFolder = new Folder("~/Library/Application Support/Adobe/CEP/extensions");
    } else {
        cepFolder = new Folder(Folder.userData.fsName + "/Adobe/CEP/extensions");
    }

    if (!cepFolder.exists) {
        cepFolder.create();
    }

    var targetExtFolder = new Folder(cepFolder.fsName + "/" + extFolderName);
    if (!targetExtFolder.exists) {
        targetExtFolder.create();
    }

    function copyFolderRecursive(srcFolder, destFolder) {
        if (!srcFolder.exists) return;
        if (!destFolder.exists) destFolder.create();
        var files = srcFolder.getFiles();
        for (var i = 0; i < files.length; i++) {
            var item = files[i];
            if (item instanceof Folder) {
                var newSub = new Folder(destFolder.fsName + "/" + item.name);
                copyFolderRecursive(item, newSub);
            } else if (item instanceof File) {
                var destFile = new File(destFolder.fsName + "/" + item.name);
                item.copy(destFile);
            }
        }
    }

    // Copy Extension components
    copyFolderRecursive(scriptFolder, targetExtFolder);

    // 2. Also copy standalone script to Illustrator Scripts folder
    var standaloneScript = new File(scriptFolder.fsName + "/jsx/hostscript.jsx");
    var scriptsFolder = null;
    var appFolder = Folder.appPackage;

    var possiblePaths = [
        appFolder.fsName + "/Presets.localized/en_US/Scripts",
        appFolder.fsName + "/Presets.localized/en_GB/Scripts",
        appFolder.fsName + "/Presets/en_US/Scripts",
        appFolder.fsName + "/Presets/en_GB/Scripts",
        Folder.startup.fsName + "/Presets.localized/en_US/Scripts",
        Folder.startup.fsName + "/Presets.localized/en_GB/Scripts",
        Folder.startup.fsName + "/Presets/en_US/Scripts",
        "/Applications/Adobe Illustrator 2025/Presets.localized/en_US/Scripts",
        "/Applications/Adobe Illustrator 2024/Presets.localized/en_US/Scripts",
        "/Applications/Adobe Illustrator 2022/Presets.localized/en_GB/Scripts"
    ];

    for (var i = 0; i < possiblePaths.length; i++) {
        var testFolder = new Folder(possiblePaths[i]);
        if (testFolder.exists) {
            scriptsFolder = testFolder;
            break;
        }
    }

    var scriptInstalled = false;
    if (scriptsFolder && scriptsFolder.exists && standaloneScript.exists) {
        var destScript = new File(scriptsFolder.fsName + "/Card_Data_AutoFiller.jsx");
        scriptInstalled = standaloneScript.copy(destScript);
    }

    var msg = "🎉 Success! Name & Card Auto-Filler has been installed!\n\n" +
        "1. Extension Panel Location:\n" +
        "   Window > Extensions > Name & Card Auto-Filler\n\n" +
        (scriptInstalled ? "2. Standalone Script Menu Location:\n   File > Scripts > Card_Data_AutoFiller\n\n" : "") +
        "(Please restart Adobe Illustrator once to refresh the menus).";

    alert(msg);
})();
