sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/MessageBox",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"doctranslationv1/model/securityUtils"
], function (Controller, MessageBox, JSONModel, MessageToast, SecurityUtils) {
	"use strict";

	return Controller.extend("doctranslationv1.controller.LoginPage", {
		onInit: function () {
			this.oRouter = this.getOwnerComponent().getRouter();
		},

		onRegisterPress: function () {
			var contactModel = new JSONModel({
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
			// Rate limiting: max 5 login attempts per minute
			if (!SecurityUtils.checkRateLimit("login", 5, 60000)) {
				MessageBox.error("Too many login attempts. Please wait a moment before trying again.");
				return false;
			}

			var registrationId = this.getView().byId("id_userid").getValue();
			var passwordValue = this.getView().byId("id_password").getValue();

			// Reset value states
			this.getView().byId("id_userid").setValueState("None");
			this.getView().byId("id_password").setValueState("None");

			// Validate inputs
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

			// Validate email format for security
			if (!SecurityUtils.isValidEmail(registrationId)) {
				this.getView().byId("id_userid").setValueState("Error");
				MessageToast.show("Please enter a valid email address");
				return false;
			}

			// Sanitize input to prevent OData injection
			var sanitizedRegistrationId = SecurityUtils.sanitizeODataInput(registrationId);

			var oDataModel = this.getView().getModel("userModel");
			var that = this;

			// Use sanitized input in OData query
			oDataModel.read("/USERDETAILS('" + sanitizedRegistrationId + "')", {
				success: function (oData, _oResponse) {
					// Note: In production, password comparison should happen server-side
					// with hashed passwords. This client-side comparison is a security risk.
					// TODO: Implement server-side password hashing and comparison
					if (oData.Password === passwordValue) {
						that.getView().byId("id_userid").setValueState("Success");
						that.getView().byId("id_password").setValueState("Success");
						
						// Use encodeURIComponent for URL parameter
						that.oRouter.navTo("View1", { Email: SecurityUtils.encodeForURL(registrationId) });
					} else {
						// Generic error message to prevent user enumeration
						MessageBox.warning("Invalid credentials. Please check your email and password.");
					}
				},
				error: function (_error) {
					// Generic error message to prevent user enumeration
					MessageBox.warning("Invalid credentials. Please check your email and password.");
				}
			});

			return true;
		},

		_validateSubmit: function () {
			var firstName = sap.ui.core.Fragment.byId("loginRegister", "firstName").getValue();
			var lastName = sap.ui.core.Fragment.byId("loginRegister", "lastName").getValue();
			var email = sap.ui.core.Fragment.byId("loginRegister", "email").getValue();
			var password = sap.ui.core.Fragment.byId("loginRegister", "password").getValue();

			if (firstName === "") {
				MessageBox.error("Please Enter First Name.");
				return false;
			}

			// Validate first name contains only allowed characters
			if (!SecurityUtils.isAlphanumeric(firstName)) {
				MessageBox.error("First Name contains invalid characters.");
				return false;
			}

			if (lastName === "") {
				MessageBox.error("Please Enter Last Name.");
				return false;
			}

			// Validate last name contains only allowed characters
			if (!SecurityUtils.isAlphanumeric(lastName)) {
				MessageBox.error("Last Name contains invalid characters.");
				return false;
			}

			if (email === "") {
				MessageBox.error("Please Enter Email.");
				return false;
			}

			if (!this.validateEmail()) {
				return false;
			}

			if (password === "") {
				MessageBox.error("Please Enter Password.");
				return false;
			}

			if (!this.validatePassword()) {
				return false;
			}

			return true;
		},

		validateEmail: function () {
			var email = sap.ui.core.Fragment.byId("loginRegister", "email").getValue();

			// Use security utils for email validation
			if (!SecurityUtils.isValidEmail(email)) {
				MessageBox.error("Please enter a valid email address.");
				sap.ui.core.Fragment.byId("loginRegister", "id_proof").setEnabled(false);
				sap.ui.core.Fragment.byId("loginRegister", "id_registrationSubmit").setEnabled(false);
				return false;
			}

			// Additional check for company domain (Capgemini)
			if (!/^[\w.+-]+@capgemini\.com$/i.test(email)) {
				MessageBox.error("Please use a valid Capgemini email address.");
				sap.ui.core.Fragment.byId("loginRegister", "id_proof").setEnabled(false);
				sap.ui.core.Fragment.byId("loginRegister", "id_registrationSubmit").setEnabled(false);
				return false;
			}

			// Sanitize email for OData query
			var sanitizedEmail = SecurityUtils.sanitizeODataInput(email);
			var oDataModel = this.getView().getModel("userModel");
			var that = this;

			oDataModel.read("/USERDETAILS(EmailID='" + sanitizedEmail + "')", {
				success: function (_oData, _oResponse) {
					that.EmailValidateFlag = true;
					sap.ui.core.Fragment.byId("loginRegister", "id_proof").setEnabled(false);
					MessageBox.information("This email is already registered.");
					sap.ui.core.Fragment.byId("loginRegister", "id_registrationSubmit").setEnabled(false);
				},
				error: function (_error) {
					// Email not found - user can register
					sap.ui.core.Fragment.byId("loginRegister", "id_proof").setEnabled(true);
				}
			});

			return true;
		},

		validatePassword: function () {
			if (this.EmailValidateFlag === true) {
				MessageBox.information("This email is already registered.");
				return false;
			}

			sap.ui.core.Fragment.byId("loginRegister", "id_proof").setSelected(false);
			sap.ui.core.Fragment.byId("loginRegister", "id_registrationSubmit").setEnabled(false);

			var password = sap.ui.core.Fragment.byId("loginRegister", "password").getValue();

			// Use security utils for password validation
			var passwordCheck = SecurityUtils.checkPasswordStrength(password);
			
			if (!passwordCheck.isValid) {
				MessageBox.error(passwordCheck.message);
				sap.ui.core.Fragment.byId("loginRegister", "id_proof").setEnabled(false);
				sap.ui.core.Fragment.byId("loginRegister", "id_registrationSubmit").setEnabled(false);
				return false;
			}

			sap.ui.core.Fragment.byId("loginRegister", "id_proof").setEnabled(true);
			return true;
		},

		onConsentClick: function () {
			var proofSwitchState = sap.ui.core.Fragment.byId("loginRegister", "id_proof").getSelected();
			sap.ui.core.Fragment.byId("loginRegister", "id_registrationSubmit").setEnabled(proofSwitchState === true);
		},

		onSubmitPress: function () {
			if (sap.ui.core.Fragment.byId("loginRegister", "id_proof").getSelected() === false) {
				MessageBox.error("Please accept the consent");
				return;
			}

			if (!this._validateSubmit()) {
				return;
			}

			var that = this;
			var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;

			MessageBox.confirm("Please Confirm the Registration?", {
				actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
				styleClass: bCompact ? "sapUiSizeCompact" : "",
				onClose: function (sAction) {
					if (sAction === "OK") {
						that._onProceedSubmitRequest();
					}
				}
			});
		},

		_onProceedSubmitRequest: function () {
			// Sanitize all input values
			var firstName = SecurityUtils.sanitizeHTML(sap.ui.core.Fragment.byId("loginRegister", "firstName").getValue());
			var lastName = SecurityUtils.sanitizeHTML(sap.ui.core.Fragment.byId("loginRegister", "lastName").getValue());
			var email = sap.ui.core.Fragment.byId("loginRegister", "email").getValue();
			var password = sap.ui.core.Fragment.byId("loginRegister", "password").getValue();

			var payload = {
				firstName: firstName,
				lastName: lastName,
				email: email,
				password: password  // Note: Password should be hashed server-side, not sent in plain text
			};

			var parsedPayload = JSON.stringify(payload);
			var jurl = "/jj7/capgemini/apps/coe/OpenAiDocGen/services/createUser.xsjs";
			var that = this;

			// Changed from synchronous to asynchronous AJAX call
			jQuery.ajax({
				url: jurl,
				async: true,  // Changed from false to true for better security and UX
				type: 'POST',  // Changed from TYPE to type (correct property name)
				data: {
					dataobject: parsedPayload
				},
				success: function (data) {
					if (data.result === "Ok") {
						// Don't send password in workflow - security risk
						that.registerWorkflow(data.email, data.firstName, data.lastName);

						sap.ui.core.Fragment.byId("loginRegister", "id_proof").setSelected(false);

						if (that._oPopover1) {
							that._oPopover1.destroy();
							that._oPopover1 = null;
						}
					} else {
						MessageBox.information("Registration failed. Please contact the Team at sapinnovationteam.in@capgemini.com");
						if (that._oPopover1) {
							that._oPopover1.destroy();
							that._oPopover1 = null;
						}
					}
				},
				error: function (_data) {
					MessageBox.error("Registration failed. Please try again later or contact support.");
				}
			});
		},

		registerWorkflow: function (email, firstName, lastName) {
			var that = this;
			
			// Get token asynchronously first, then register workflow
			this._getTokenForWorkflowAsync(function() {
				var payload = JSON.stringify({
					"definitionId": "openaidocgenuserregisterwf",
					"context": {
						"toEmails": email,
						// Password removed from workflow context for security
						"firstName": firstName,
						"lastName": lastName
					}
				});

				var xhr = new XMLHttpRequest();
				xhr.withCredentials = false;

				xhr.addEventListener("readystatechange", function () {
					if (this.readyState === this.DONE) {
						if (this.status >= 200 && this.status < 300) {
							MessageBox.success("Successfully Registered! You will receive your Registration ID through email shortly.");
						} else {
							MessageBox.warning("Registration submitted but email notification may be delayed.");
						}
					}
				});

				var url1 = '/destination/bpmworkflowruntime1/workflow-service/rest/v1/workflow-instances';
				xhr.open("POST", url1);
				xhr.setRequestHeader("X-CSRF-Token", that._token);
				xhr.setRequestHeader("Content-Type", "application/json");
				xhr.setRequestHeader("Accept", "application/json");
				xhr.send(payload);
			});
		},

		// Renamed and made asynchronous
		_getTokenForWorkflowAsync: function (callback) {
			var that = this;
			var url = '/destination/bpmworkflowruntime1/workflow-service/rest/v1/xsrf-token';

			$.ajax({
				url: url,
				method: "GET",
				async: true,  // Changed from false to true
				headers: {
					"X-CSRF-Token": "Fetch",
					"Content-Type": "application/json"
				},
				success: function (_result, _xhr, data) {
					that._token = data.getResponseHeader("X-CSRF-Token");
					if (callback && typeof callback === "function") {
						callback();
					}
				},
				error: function (_error) {
					MessageBox.error("Failed to initialize secure connection. Please try again.");
				}
			});
		},

		// Legacy synchronous version - deprecated, kept for compatibility
		getTokenForWOrkflow: function () {
			var that = this;
			var url = '/destination/bpmworkflowruntime1/workflow-service/rest/v1/xsrf-token';
			
			$.ajax({
				url: url,
				method: "GET",
				async: false,  // Deprecated: use _getTokenForWorkflowAsync instead
				headers: {
					"X-CSRF-Token": "Fetch",
					"Content-Type": "application/json"
				},
				success: function (_result, _xhr, data) {
					that._token = data.getResponseHeader("X-CSRF-Token");
				}
			});
		},

		onCancelContact: function () {
			if (this._oPopover1) {
				this._oPopover1.close();
			}
		},

		onNoticeLinkPress: function () {
			var link = "https://res.cloudinary.com/coeportal/image/upload/v1676022677/Innovate%202%20Improve%20Event%202023/Data_Protection_Notice_Template_-_i2i_event_2_xtv5kc.pdf";
			
			// Validate URL before opening
			if (SecurityUtils.isValidURL(link, ["res.cloudinary.com"])) {
				window.open(link, "_blank", "noopener,noreferrer");
			}
		},

		onConsentEmailPress: function () {
			sap.m.URLHelper.triggerEmail(
				"dpocapgemini.global@capgemini.com",
				"SAP Development Accelerator Application Registration"
			);
		}
	});
});