define(function main(require, exports, module) {
    var PreferencesManager = brackets.getModule("preferences/PreferencesManager"),
        prefs = PreferencesManager.getExtensionPrefs("brackets-saxon");

    // Default settings
    prefs.definePreference("saxon-bin", "string", "bin/saxon9he.jar");
    prefs.definePreference("saxon-xsl", "string", "");
    prefs.definePreference("saxon-xml", "string", "");
    prefs.definePreference("saxon-output", "string", "");
    prefs.definePreference("autoscroll", "boolean", true);
    prefs.definePreference("v8-flags", "string", "");

    if("saxon-bin" in localStorage) {
        prefs.set("saxon-bin", localStorage["saxon-bin"]);
        localStorage.removeItem("saxon-bin");
    }
    if("saxon-xsl" in localStorage) {
        prefs.set("saxon-xsl", localStorage["saxon-xsl"]);
        localStorage.removeItem("saxon-xsl");
    }
    if("saxon-xml" in localStorage) {
        prefs.set("saxon-xml", localStorage["saxon-xml"]);
        localStorage.removeItem("saxon-xml");
    }
    if("saxon-output" in localStorage) {
        prefs.set("saxon-output", localStorage["saxon-output"]);
        localStorage.removeItem("saxon-output");
    }
    if("autoscroll" in localStorage) {
        prefs.set("autoscroll", localStorage["autoscroll"]);
        localStorage.removeItem("autoscroll");
    }
    if("v8-flags" in localStorage) {
        prefs.set("v8-flags", localStorage["v8-flags"]);
        localStorage.removeItem("v8-flags");
    }

    prefs.save();

    module.exports = prefs;
});
