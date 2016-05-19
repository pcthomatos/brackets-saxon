define(function (require, exports, module) {
    "use strict";

    /** --- MODULES --- **/
    var CommandManager = brackets.getModule("command/CommandManager"),
        Menus = brackets.getModule("command/Menus"),
        DocumentManager = brackets.getModule("document/DocumentManager"),
        WorkspaceManager = brackets.getModule("view/WorkspaceManager"),
        ExtensionUtils = brackets.getModule("utils/ExtensionUtils"),
        NodeDomain = brackets.getModule("utils/NodeDomain"),
        ProjectManager = brackets.getModule("project/ProjectManager"),
        Dialogs = brackets.getModule("widgets/Dialogs"),
        ansi = require("./ansi"),
        prefs = require("./preferences"),
        SaxonMenuID = "saxon",
        SaxonMenu = Menus.addMenu("Saxon", SaxonMenuID),
        SAXON_SETTINGS_DIALOG_ID = "saxon-settings-dialog",
        SAXON_INSTALL_DIALOG_ID = "saxon-install-dialog",
        SAXON_EXEC_DIALOG_ID = "saxon-exec-dialog",
        LS_PREFIX = "saxon-",
        DOMAIN_NAME = "brackets-saxon",
        scrollEnabled = prefs.get("autoscroll");

    var domain  = new NodeDomain(DOMAIN_NAME, ExtensionUtils.getModulePath(module, "saxon/processDomain"));

    domain.on("output", function(info, data) {
        Panel.write(data);
    });

    var buildHB = function(command){
            var saxonBin = prefs.get("saxon-bin"),
                command = command.replace(/\/\/+/, '/');

            if(saxonBin === "") {
                saxonBin = "saxon";
            }

            Panel.show(command);
            Panel.clear();

            domain.exec("startProcess", command, saxonBin)
                .done(function(exitCode) {
                    Panel.write("Program exited with status code of " + exitCode + ".");
                }).fail(function(err) {
                    Panel.write("Error inside brackets-saxon' processes occured: \n" + err);
                });
        };

    /**
     * Panel alias terminal
     */
    $(".content").append(require("text!html/panel.html"));
    var Panel = {

        id: "brackets-saxon-terminal",
        panel: null,
        commandTitle: null,
        height: 201,

        get: function (qs) {
            return this.panel.querySelector(qs);
        },

        /**
         * Basic functionality
         */
        show: function (command) {
            this.panel.style.display = "block";
            this.commandTitle.textContent = command;
            WorkspaceManager.recomputeLayout();
        },
        hide: function () {
            this.panel.style.display = "none";
            WorkspaceManager.recomputeLayout();
        },
        clear: function () {
            this.pre.innerHTML = null;
        },

        /**
         * Prints a string into the terminal
         * It will be colored and then escape to prohibit XSS (Yes, inside an editor!)
         *
         * @param: String to be output
         */
        write: function (str) {
            var e = document.createElement("span");
            e.innerHTML = ansi(str.replace(/</g, "&lt;").replace(/>/g, "&gt;"));

            var scroll = false;
            if (this.pre.parentNode.scrollTop === 0 || this.pre.parentNode.scrollTop === this.pre.parentNode.scrollHeight || this.pre.parentNode.scrollHeight - this.pre.parentNode.scrollTop === this.pre.parentNode.clientHeight) {
                scroll = true;
            }

            this.pre.appendChild(e);

            if (scroll && scrollEnabled) {
                this.pre.parentNode.scrollTop = this.pre.parentNode.scrollHeight;
            }
        },

        /**
         * Used to enable resizing the panel
         */
        mousemove: function (e) {

            var h = Panel.height + (Panel.y - e.pageY);
            Panel.panel.style.height = h + "px";
            WorkspaceManager.recomputeLayout();

        },
        mouseup: function (e) {

            document.removeEventListener("mousemove", Panel.mousemove);
            document.removeEventListener("mouseup", Panel.mouseup);

            Panel.height = Panel.height + (Panel.y - e.pageY);

        },
        y: 0
    };

    // Still resizing
    Panel.panel = document.getElementById(Panel.id);
    Panel.commandTitle = Panel.get(".cmd");
    Panel.pre = Panel.get(".table-container pre");
    Panel.get(".resize").addEventListener("mousedown", function (e) {

        Panel.y = e.pageY;

        document.addEventListener("mousemove", Panel.mousemove);
        document.addEventListener("mouseup", Panel.mouseup);

    });

    /**
     * Terminal buttons
     */
    Panel.get(".action-close").addEventListener("click", function () {
        domain.exec("stopProcess");
        Panel.hide();
    });
    Panel.get(".action-terminate").addEventListener("click", function () {
        domain.exec("stopProcess");
    });
    Panel.get(".action-rerun").addEventListener("click", function () {
        buildHB(prefs.get("hb-ui"));
    });

    var Dialog = {
        /**
         * The settings modal is used to configure the path to saxon's and saxon's binary
         * HTML : html/modal-settings.html
         */
        settings: {

            /**
             * HTML put inside the dialog
             */
            html: require("text!html/modal-settings.html"),

            /**
             * Opens up the modal
             */
            show: function () {
                Dialogs.showModalDialog(
                    SAXON_SETTINGS_DIALOG_ID, // ID the specify the dialog
                    "Saxon-Configuration", // Title
                    this.html, // HTML-Content
                    [ // Buttons
                        {
                            className: Dialogs.DIALOG_BTN_CLASS_PRIMARY,
                            id: Dialogs.DIALOG_BTN_OK,
                            text: "Save"
                        }, {
                            className: Dialogs.DIALOG_BTN_CLASS_NORMAL,
                            id: Dialogs.DIALOG_BTN_CANCEL,
                            text: "Cancel"
                        }
                    ]
                ).done(function (id) {

                    // Only saving
                    if (id !== "ok") return;

                    var saxon   = saxonJar.value,
                        classPath   = classPathJar.value,
                        xsl     = xslLocation.value,
                        xml     = xmlLocation.value,
                        output  = outputLocation.value;

                    // Store autoscroll config globally
                    scrollEnabled = scrollInput.checked;

                    prefs.set("saxon-bin",    saxon.trim());
                    prefs.set("classPath-bin",    classPath.trim());
                    prefs.set("saxon-xsl",    xsl.trim());
                    prefs.set("saxon-xml",    xml.trim());
                    prefs.set("saxon-output", output.trim());
                    prefs.set("autoscroll",   scrollEnabled);
                    prefs.save();

                });

                // It's important to get the elements after the modal is rendered but before the done event
                var saxonJar        = document.querySelector("." + SAXON_SETTINGS_DIALOG_ID + " .saxonJar"),
                    classPathJar    = document.querySelector("." + SAXON_SETTINGS_DIALOG_ID + " .classPathJar"),
                    xslLocation     = document.querySelector("." + SAXON_SETTINGS_DIALOG_ID + " .xslLocation"),
                    xmlLocation     = document.querySelector("." + SAXON_SETTINGS_DIALOG_ID + " .xmlLocation"),
                    outputLocation  = document.querySelector("." + SAXON_SETTINGS_DIALOG_ID + " .outputLocation"),
                    scrollInput     = document.querySelector("." + SAXON_SETTINGS_DIALOG_ID + " .autoscroll");

                saxonJar.value        = prefs.get("saxon-bin");
                classPathJar.value    = prefs.get("classPath-bin") || '';
                xslLocation.value     = prefs.get("saxon-xsl");
                xmlLocation.value     = prefs.get("saxon-xml");
                outputLocation.value  = prefs.get("saxon-output");
                scrollInput.checked   = prefs.get("autoscroll");
            }
        }
    };

    /**
     * Menu
     */
    var RUN_CMD_ID = "brackets-saxon.run",
        CONFIG_CMD_ID = "brackets-saxon.config";

    CommandManager.register("Run XSL Transform", RUN_CMD_ID, function () {
        console.log('java -cp "' +prefs.get("classPath-bin")+  '" ' + prefs.get("saxon-bin") + ' -t -s:'  + prefs.get("saxon-xml") + ' -xsl:'  + prefs.get("saxon-xsl") + " -o:" + prefs.get("saxon-output"));
        buildHB('java -cp "' +prefs.get("classPath-bin")+  '" ' + prefs.get("saxon-bin") + ' -t -s:'  + prefs.get("saxon-xml") + ' -xsl:'  + prefs.get("saxon-xsl") + " -o:" + prefs.get("saxon-output") );
    });

    CommandManager.register("Configuration...", CONFIG_CMD_ID, function () {
        Dialog.settings.show();

    });

    SaxonMenu.addMenuItem(RUN_CMD_ID, 'F7');
    SaxonMenu.addMenuDivider();
    SaxonMenu.addMenuItem(CONFIG_CMD_ID);

});
