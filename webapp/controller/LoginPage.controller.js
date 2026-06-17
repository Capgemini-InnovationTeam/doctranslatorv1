sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/MessageBox",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast"
], function (Controller, MessageBox, JSONModel, MessageToast) {
	"use strict";

	return Controller.extend("doctranslationv1.controller.LoginPage", {
	onInit: function () {
			this.oRouter = this.getOwnerComponent().getRouter();
		},
		onRegisterPress: function () {
			var contactModel = new sap.ui.model.json.JSONModel({

				firstName: '',
				lastName: '',
				emailId: '',
				countryCode: '',
				mobileNumber: '',
				password: ''

			});
			if (!this._oPopover1) {
				this._oPopover1 = sap.ui.xmlfragment("loginRegister", "doctranslationv1.view.fragments.loginRegister", this);
				this.getView().addDependent(this._oPopover1);

			}
			this._oPopover1.setModel(contactModel, "contact");
			this._oPopover1.open();
		},
		onLoginPress: function () {
			
				// this.oRouter.navTo("View1");
			var registrationId = this.getView().byId("id_userid").getValue();
			var passwordValue = this.getView().byId("id_password").getValue();

			if (registrationId !== "") {
				this.getView().byId("id_userid").setValueState("Success");

			}
			if (passwordValue !== ""){
				this.getView().byId("id_password").setValueState("Success");
			}

			var bValid = true;
			if (registrationId === "") {
				this.getView().byId("id_userid").setValueState("Error");
				MessageToast.show("Please enter User ID");
				return false;
			}
			if (passwordValue === "") {
				this.getView().byId("id_password").setValueState("Error");
				MessageToast.show("Please enter password");
				return false;
			}

			if ((registrationId !== "") && (passwordValue !== "")) {
				var oDataModel = this.getView().getModel("userModel");
				oDataModel.read("/USERDETAILS('" + registrationId + "')", {
					success: function (oData, oResponse) {
						if (oData.Password === passwordValue) {
							var Role;
							if(oData.Role !=="Admin"){
									Role = "User";
							}
							else Role = oData.Role;
							this.oRouter.navTo("View1",{Email:registrationId});
							//	Path: oItem.getPath().substr(1)
							//	Path: oItem.getProperty("CustomerName")
							//	Path: encodeURIComponent(oItem.getProperty("CustomerName"))
							//Path: window.encodeURIComponent(oItem.getPath().substr(1))
							//	Path: window.encodeURIComponent(oItem.getPath().slice(18, -2))
							//			Path: window.encodeURIComponent(oItem.getPath().slice(17, -1))
							//		});

						}
						if (oData.Password !== passwordValue) {
							sap.m.MessageBox.information("Incorrect Password!");
						}

					}.bind(this),
					error: function (error) {

						sap.m.MessageBox.information("Incorrect Registrated Email ID");
					}
				});
			}
			return bValid;
		},
		_validateSubmit: function () {

			var bValid = true;

			if (sap.ui.core.Fragment.byId("loginRegister", "firstName").getValue() === "") {
				sap.m.MessageBox.error("Please Enter FirstName.");
				return false;
			}

			if (sap.ui.core.Fragment.byId("loginRegister", "lastName").getValue() === "") {
				sap.m.MessageBox.error("Please Enter Last Name.");
				return false;
			}
			if (sap.ui.core.Fragment.byId("loginRegister", "email").getValue() === "") {
				sap.m.MessageBox.error("Please Enter Email.");
				return false;
			} else {
				this.validateEmail();
			}

			if (sap.ui.core.Fragment.byId("loginRegister", "password").getValue() === "") {
				sap.m.MessageBox.error("Please Enter Password.");
				return false;
			} else {
				this.validatePassword();
			}

			if (!bValid) {
				sap.m.MessageBox.error("Please enter all mandatory fields.");
			}

			return bValid;
		},
		validateEmail: function () {
			//	sap.ui.core.Fragment.byId("loginRegister", "id_proof").setSelected(false);
			//	sap.ui.core.Fragment.byId("loginRegister", "id_registrationSubmit").setEnabled(false);
			var email = sap.ui.core.Fragment.byId("loginRegister", "email").getValue();

			if (/^\w+([.-]?\w+)*@capgemini\.com+$/
.test(email)) {

				var oDataModel = this.getView().getModel("userModel");
				oDataModel.read("/USERDETAILS(EmailID='" + email + "')", {

					success: function (oData, oResponse) {
						this.EmailValidateFlag = true;
						sap.ui.core.Fragment.byId("loginRegister", "id_proof").setEnabled(false);

						sap.m.MessageBox.information("You have been Registered Already!");
						sap.ui.core.Fragment.byId("loginRegister", "id_registrationSubmit").setEnabled(false);

					}.bind(this),
					error: function (error) {

						sap.ui.core.Fragment.byId("loginRegister", "id_proof").setEnabled(true);

					}
				});

				return (true);
			} else {
				MessageBox.error(email + " is not a valid email address");
				sap.ui.core.Fragment.byId("loginRegister", "id_proof").setEnabled(false);
				sap.ui.core.Fragment.byId("loginRegister", "id_registrationSubmit").setEnabled(false);
				return (false);
			}

		},
		validatePassword: function () {
			if (this.EmailValidateFlag === true) {
				sap.m.MessageBox.information("You have been Registered Already!");
			} else {
				sap.ui.core.Fragment.byId("loginRegister", "id_proof").setSelected(false);
				sap.ui.core.Fragment.byId("loginRegister", "id_registrationSubmit").setEnabled(false);
				var password = sap.ui.core.Fragment.byId("loginRegister", "password").getValue();

				//	if (/^[A-Za-z]\w{7,14}$/.test(password)) {
				//	if (/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/.test(password)) {

				if (/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*_-]).{8,}$/.test(password)) {
					sap.ui.core.Fragment.byId("loginRegister", "id_proof").setEnabled(true);

					//	return (true);
				} else {
					MessageBox.error("Please enter a valid password !");
					sap.ui.core.Fragment.byId("loginRegister", "id_proof").setEnabled(false);
					sap.ui.core.Fragment.byId("loginRegister", "id_registrationSubmit").setEnabled(false);
					//	return (false);
				}
			}
		},
		onConsentClick: function () {

			var proofSwitchState = sap.ui.core.Fragment.byId("loginRegister", "id_proof").getSelected();
			if (proofSwitchState === true) {

				sap.ui.core.Fragment.byId("loginRegister", "id_registrationSubmit").setEnabled(true);
			}
			if (proofSwitchState === false) {
				sap.ui.core.Fragment.byId("loginRegister", "id_registrationSubmit").setEnabled(false);
			}

		},
		onSubmitPress: function () {
			var that = this;
			if (sap.ui.core.Fragment.byId("loginRegister", "id_proof").getSelected() === false) {
				sap.m.MessageBox.error("Please accept the consent");
			}
			if (!this._validateSubmit()) {
				return;
			}
			var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
			sap.m.MessageBox.confirm(
				"Please Confirm the Registration?", {
					actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
					styleClass: bCompact ? "sapUiSizeCompact" : "",
					onClose: function (sAction) {
						if (sAction === "OK") {

							that._onProceedSubmitRequest();
						}
					}
				}
			);
		},
		_onProceedSubmitRequest: function () {

			var firstName = sap.ui.core.Fragment.byId("loginRegister", "firstName").getValue();
			var lastName = sap.ui.core.Fragment.byId("loginRegister", "lastName").getValue();
			var email = sap.ui.core.Fragment.byId("loginRegister", "email").getValue();
			var password = sap.ui.core.Fragment.byId("loginRegister", "password").getValue();

			var payload = {
				firstName: firstName,
				lastName: lastName,
				email: email,
				password: password
			};

			var parsedPayload = JSON.stringify(payload);
			var jurl = "/jj7/capgemini/apps/coe/OpenAiDocGen/services/createUser.xsjs";
			jQuery.ajax({
				url: jurl,
				async: false,
				TYPE: 'POST',
				data: {
					dataobject: parsedPayload
				},

				success: function (data) {

					if (data.result === "Ok") {

						this.registerWorkflow(data.email, data.password, data.firstName, data.lastName);

						sap.ui.core.Fragment.byId("loginRegister", "id_proof").setSelected(null);

						this._oPopover1.destroy();
						this._oPopover1 = null;
					} else {

						sap.m.MessageBox.information("Please contact the Team! - sapinnovationteam.in@capgemini.com");
						this._oPopover1.destroy();
						this._oPopover1 = null;

					}

				}.bind(this),
				error: function (data) {
					sap.m.MessageBox.information("Please contact the Team!");
				}
			});

		},
		registerWorkflow: function (email, password, firstName, lastName) {
			this.getTokenForWOrkflow();

			var payload = JSON.stringify({
				"definitionId": "openaidocgenuserregisterwf",
				"context": {
					"toEmails": email,
					"password": password,
					"firstName": firstName,
					"lastName": lastName

				}
			});

			var xhr = new XMLHttpRequest();
			xhr.withCredentials = false;

			xhr.addEventListener("readystatechange", function () {
				if (this.readyState === this.DONE) {
					
					sap.m.MessageBox.information("Successfully Registered and you will receive your Registration ID through Mail shortly!");
					// tracking.trackEvent("Button", "Click", "Submit", 1);
				}
			});

			var url1 = '/destination/bpmworkflowruntime1/workflow-service/rest/v1/workflow-instances';
			//setting request method
			xhr.open("POST", url1);

			//adding request headers
			xhr.setRequestHeader("X-CSRF-Token", this._token);
			xhr.setRequestHeader("Content-Type", "application/json");
			xhr.setRequestHeader("Accept", "application/json");

			//sending request
			xhr.send(payload);

		},
		getTokenForWOrkflow: function () {
			var that = this;
			var url = '/destination/bpmworkflowruntime1/workflow-service/rest/v1/xsrf-token';
			$.ajax({
				url: url,
				method: "GET",
				async: false,
				headers: {
					"X-CSRF-Token": "Fetch",
					"Content-Type": "application/json"
				},
				success: function (result, xhr, data) {

					that._token = data.getResponseHeader("X-CSRF-Token");
				}
			});
		},
		onCancelContact: function () {
			this._oPopover1.close();
			//	this._oPopover1 = null;
		},
		onNoticeLinkPress: function () {
			var link =
				"https://res.cloudinary.com/coeportal/image/upload/v1676022677/Innovate%202%20Improve%20Event%202023/Data_Protection_Notice_Template_-_i2i_event_2_xtv5kc.pdf";
			window.open(link, "_blank");
		},
		onConsentEmailPress: function () {
			sap.m.URLHelper.triggerEmail(
				"dpocapgemini.global@capgemini.com",
				"SAP Development Acclerator Application Registration"

			);
		}

	

	});

});