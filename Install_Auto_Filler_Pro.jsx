//@target illustrator

/**
 * ============================================================================
 * ONE-CLICK INSTALLER FOR AUTO FILLER PRO (COLORLAB EDITION)
 * ============================================================================
 */

(function () {
    var scriptFile = new File($.fileName);
    var scriptFolder = scriptFile.parent;

    var extFolderName = "com.colorlab.autofillerpro";
    var isMac = (File.fs === "Macintosh" || (typeof $.os !== "undefined" && $.os.indexOf("Mac") !== -1));

    var cepFolder = isMac
        ? new Folder("~/Library/Application Support/Adobe/CEP/extensions")
        : new Folder(Folder.userData.fsName + "/Adobe/CEP/extensions");

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
            if (item.name === ".git" || item.name === ".DS_Store") continue;
            if (item instanceof Folder) {
                var newSub = new Folder(destFolder.fsName + "/" + item.name);
                copyFolderRecursive(item, newSub);
            } else if (item instanceof File) {
                var destFile = new File(destFolder.fsName + "/" + item.name);
                item.copy(destFile);
            }
        }
    }

    copyFolderRecursive(scriptFolder, targetExtFolder);

    var msg = "Success! Auto Filler Pro v3.4 has been installed!\n\n" +
        "Extension Panel Location:\n" +
        "   Window > Extensions > Auto Filler Pro\n\n" +
        "(Please restart Adobe Illustrator once to refresh the menus.)";

    alert(msg, "Auto Filler Pro Installer");
})();
