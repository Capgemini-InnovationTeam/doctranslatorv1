sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Text"
], function (Controller, Dialog, Button, Text) {
    "use strict";
 
    return Controller.extend("doctranslationv1.controller.View1", {
 
        onInit: function () {
            this._oRouter = this.getOwnerComponent().getRouter();
        },
 
        _onObjectMatched: function (oEvent) {
            this.Email = oEvent.getParameter("arguments").Email;
        },
 
        onpress: function () {
            this._oRouter.navTo("DocumentBrowse");
        },
 
        // 👉 GCP click
        ontxtpress: function () {
            this._showComingSoonDialog();
        },
 
        // 👉 Batch click
        onbatch: function () {
            this._showComingSoonDialog();
        },
 
        // 🔥 CLEAN CENTER POPUP FUNCTION
        _showComingSoonDialog: function () {
            if (!this._oDialog) {
                this._oDialog = new Dialog({
                    title: "Coming Soon",
                    type: "Message",
                    content: new Text({
                        text: "This feature is currently under development and will be available soon."
                    }),
                    beginButton: new Button({
                        text: "Got it",
                        press: function () {
                            this._oDialog.close();
                        }.bind(this)
                    }),
                    afterClose: function () {
                        this._oDialog.destroy();
                        this._oDialog = null;
                    }.bind(this)
                });
            }
 
            this._oDialog.open();
        }
 
    });
});