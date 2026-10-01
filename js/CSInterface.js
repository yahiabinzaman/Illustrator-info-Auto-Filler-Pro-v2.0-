/**
 * CSInterface - Adobe CEP Extension API Interface
 */
function CSInterface() {}

CSInterface.prototype.hostEnvironment = window.__adobe_cep__ ? JSON.parse(window.__adobe_cep__.getHostEnvironment()) : null;

CSInterface.prototype.evalScript = function(script, callback) {
    if (window.__adobe_cep__) {
        if (callback === null || callback === undefined) {
            callback = function(result) {};
        }
        window.__adobe_cep__.evalScript(script, callback);
    } else {
        console.warn("evalScript outside CEP environment:", script);
        if (callback) callback("mock_result");
    }
};

CSInterface.prototype.openURLInDefaultBrowser = function(url) {
    if (window.__adobe_cep__) {
        window.__adobe_cep__.openURLInDefaultBrowser(url);
    } else {
        window.open(url, "_blank");
    }
};

CSInterface.prototype.closeExtension = function() {
    if (window.__adobe_cep__) {
        window.__adobe_cep__.closeExtension();
    }
};

CSInterface.prototype.resizeContent = function(width, height) {
    if (window.__adobe_cep__) {
        window.__adobe_cep__.resizeContent(width, height);
    }
};

CSInterface.prototype.addEventListener = function(type, listener, obj) {
    if (window.__adobe_cep__) {
        window.__adobe_cep__.addEventListener(type, listener, obj);
    }
};

CSInterface.prototype.removeEventListener = function(type, listener, obj) {
    if (window.__adobe_cep__) {
        window.__adobe_cep__.removeEventListener(type, listener, obj);
    }
};

var SystemPath = {
    USER_DATA: "userData",
    COMMON_FILES: "commonFiles",
    MY_DOCUMENTS: "myDocuments",
    APPLICATION: "application",
    EXTENSION: "extension",
    HOST_APPLICATION: "hostApplication"
};

CSInterface.prototype.getSystemPath = function(pathType) {
    var path = decodeURI(window.__adobe_cep__ ? window.__adobe_cep__.getSystemPath(pathType) : "");
    var OSVersion = this.hostEnvironment ? this.hostEnvironment.OSVersion : "";
    if (OSVersion.indexOf("Windows") >= 0) {
        path = path.replace("file:///", "");
    } else if (OSVersion.indexOf("Mac") >= 0) {
        path = path.replace("file://", "");
    }
    return path;
};

CSInterface.prototype.registerKeyEventsInterest = function(keyEventsInterest) {
    if (window.__adobe_cep__ && window.__adobe_cep__.registerKeyEventsInterest) {
        return window.__adobe_cep__.registerKeyEventsInterest(keyEventsInterest);
    }
};


