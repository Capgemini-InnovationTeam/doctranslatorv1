sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/layout/VerticalLayout",
	"sap/ui/unified/FileUploader",
	"sap/m/Button",
	"sap/m/MessageToast",
	"sap/ui/core/format/DateFormat",
	"sap/m/MessageBox",
	"sap/m/Link",
	"sap/ui/core/Fragment",
	'sap/ui/model/Filter',
	'sap/ui/model/Sorter',
	'sap/ui/export/Spreadsheet',
	"sap/ui/model/FilterOperator",
	"sap/m/VBox",
	"sap/ui/Device"
], function (Controller, JSONModel, VerticalLayout, FileUploader, Button, MessageToast, DateFormat, MessageBox, Link, Fragment, Filter,
	Sorter, Spreadsheet, FilterOperator, VBox,Device) {
	"use strict";

	return Controller.extend("doctranslationv1.controller.DocumentBrowse", {

		onInit: function () {
			this._oRouter = this.getOwnerComponent().getRouter();
			this._oRouter.getRoute("DocumentBrowse").attachPatternMatched(this._onObjectMatched, this);
			var oModel = new JSONModel({
				files: []
			});
			this.getView().setModel(oModel);

			this.oBusyDialog = new sap.m.BusyDialog({
				title: "Please wait",
				text: "Getting data from Gen AI..."
			});

			var currentPath = window.location.pathname;
			this.appModulePath = currentPath.substring(0, currentPath.lastIndexOf("/"));
		},

		_onObjectMatched: function (oEvent) {
			this.Email = oEvent.getParameter("arguments").Email;
		},

		navBack: function () {
			this._oRouter.navTo("View1", { Email: this.Email });
		},

		onLanguageSelect: function (oEvent) {
			var sSelectedKey = oEvent.getParameter("selectedItem").getText();
			this.lang = oEvent.getParameter("selectedItem").getKey();
			var oModel = this.getView().getModel();
			var aFiles = oModel.getProperty("/files");

			aFiles.forEach(function (file) {
				file.translationLanguage = sSelectedKey;
			});

			oModel.setProperty("/files", aFiles);
			this.getView().byId("translate").setEnabled(true);
		},

		handleFileChange: function (oEvent) {
			this.file = oEvent.getParameter("files");
			this.fileName = this.file.name;
			var allowedFileTypes = [
				"application/pdf",
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				"application/vnd.openxmlformats-officedocument.presentationml.presentation"
			];

			if (!this.file || this.file.length === 0) {
				MessageToast.show("Please select files first.");
				return;
			}

			var oModel = this.getView().getModel();
			var aFileData = oModel.getProperty("/files");

			for (var i = 0; i < this.file.length; i++) {
				if (allowedFileTypes.includes(this.file[i].type)) {
					aFileData.push({
						fileName: this.file[i].name,
						translationLanguage: "",
						progress: 0,
						status: "Pending",
						translatedDocument: "",
						sourceFileLink: "",
						fileObject: this.file[i]
					});
				} else {
					MessageBox.error("Unsupported file type: " + this.file[i].name);
					this.getView().byId("upload").clear();
				}
			}

			oModel.setProperty("/files", aFileData);
		},

		onUploadPress: function (oFileData, index) {
			this.oBusyDialog.open();

			var apiLink = this.appModulePath + "/doc-translation-api/uploadfiles";
			var form = new FormData();
			for (var i = 0; i < this.file.length; i++) {
				form.append("files", this.file[i], this.file[i].name);
				form.append("lang", this.lang);
			}

			var that = this;

			$.ajax({
				url: that.appModulePath + "/index.html",
				method: "GET",
				headers: { "X-CSRF-Token": "Fetch" },
				complete: function (jqXHR) {
					var csrfToken = jqXHR.getResponseHeader("X-CSRF-Token");

					$.ajax({
						url: apiLink,
						method: "POST",
						timeout: 0,
						processData: false,
						contentType: false,
						headers: { "X-CSRF-Token": csrfToken || "" },
						data: form,
						success: function (response) {
							var oModel = that.getView().getModel();
							try {
								if (typeof response === "string") {
									response = JSON.parse(response);
								}

							var aFiles = oModel.getProperty("/files");
							var destlink = Object.keys(response.dest).reverse();
							var _srclink = Object.keys(response.src).reverse();

							aFiles.forEach(function (file, index) {
									if (index < destlink.length) {
										var key = destlink[index];
										file.translatedDocument = response.dest[key];
										file.sourceFileLink = response.src[key];
										file.progress = 100;
										file.status = "Complete";
									}
								});

						oModel.setProperty("/files", aFiles);
						} catch (_error) {
							MessageBox.error(response);
								oModel.setProperty("/files/" + index + "/status", "Failed");
							}

							that.oBusyDialog.close();
							that.getView().byId("upload").clear();
						},
						error: function (jqXHR, textStatus, errorThrown) {
							that.oBusyDialog.close();
							MessageBox.error("POST request failed: " + errorThrown);
							var oModel = that.getView().getModel();
							oModel.setProperty("/files/" + index + "/status", "Failed");
						}
					});
				}
			});
		},

		handleRefreshPressed: function () {
			var oModel = new JSONModel({
				files: []
			});
			this.getView().setModel(oModel);
		},

		onExport: function () {
			var aCols, oRowBinding, oSettings, oSheet, oTable;

			if (!this._oTable) {
				this._oTable = this.byId('idSummaryTable');
			}

			oTable = this._oTable;
			oRowBinding = oTable.getBinding('items');
			aCols = this.createColumnConfig();

			oSettings = {
				workbook: {
					columns: aCols,
					hierarchyLevel: 'Level'
				},
				dataSource: oRowBinding,
				fileName: 'TranslatedDocuments.xlsx',
				worker: false
			};

			oSheet = new Spreadsheet(oSettings);
			oSheet.build().finally(function () {
				oSheet.destroy();
			});
		},

		createColumnConfig: function () {
			var aCols = [];

			aCols.push({ label: 'File Name', property: 'fileName', type: Number, scale: 0 });
			aCols.push({ label: 'Source Document', property: 'sourceFileLink', type: String });
			aCols.push({ label: 'Translation Language', property: 'translationLanguage', type: String });
			aCols.push({ label: 'Translated Document', property: 'translatedDocument', type: String });
			aCols.push({ label: 'Progress', property: 'progress', type: String });
			aCols.push({ label: 'Status', property: 'Status', type: Number, scale: 0 });

			return aCols;
		},

		getViewSettingsDialog: function (sDialogFragmentName) {
			var pDialog = this._mViewSettingsDialogs[sDialogFragmentName];

			if (!pDialog) {
				pDialog = Fragment.load({
					id: this.getView().getId(),
					name: sDialogFragmentName,
					controller: this
				}).then(function (oDialog) {
					if (Device.system.desktop) {
						oDialog.addStyleClass("sapUiSizeCompact");
					}
					return oDialog;
				});
				this._mViewSettingsDialogs[sDialogFragmentName] = pDialog;
			}
			return pDialog;
		},

		handleSortButtonPressed: function () {
			var oView = this.getView();
			var sFragmentPath = "doctran.view.fragments.SortDialog";

			Fragment.load({
				id: oView.getId(),
				name: sFragmentPath,
				controller: this
			}).then(function (oDialog) {
				oView.addDependent(oDialog);
				oDialog.open();
			}.bind(this));
		},

		handleFilterButtonPressed: function () {
			var oView = this.getView();
			var sFragmentPath = "doctran.view.fragments.FilterDialog";

			Fragment.load({
				id: oView.getId(),
				name: sFragmentPath,
				controller: this
			}).then(function (oDialog) {
				oView.addDependent(oDialog);
				oDialog.open();
			}.bind(this));
		},

		handleSortDialogConfirm: function (oEvent) {
			var oTable = this.byId("idSummaryTable");
			var mParams = oEvent.getParameters();
			var oBinding = oTable.getBinding("items");
			var aSorters = [];

			aSorters.push(new Sorter(mParams.sortItem.getKey(), mParams.sortDescending));
			oBinding.sort(aSorters);
		},

		handleFilterDialogConfirm: function (oEvent) {
			var oTable = this.byId("idSummaryTable");
			var mParams = oEvent.getParameters();
			var oBinding = oTable.getBinding("items");
			var aFilters = [];

			mParams.filterItems.forEach(function (oItem) {
				var aSplit = oItem.getKey();
				var oFilter = new sap.ui.model.Filter("translationLanguage", sap.ui.model.FilterOperator.Contains, aSplit);
				aFilters.push(oFilter);
			});

			oBinding.filter(aFilters);
		},

		onSearch: function (oEvent) {
			var oTableSearchState = [];
			var sQuery = oEvent.getParameter("query");

			if (sQuery && sQuery.length > 0) {
				var aFilters = [];
				aFilters.push(new sap.ui.model.Filter("fileName", sap.ui.model.FilterOperator.Contains, sQuery));
				var iQuery = Number(sQuery);
				if (!isNaN(iQuery)) {
					aFilters.push(new sap.ui.model.Filter("translationLanguage", sap.ui.model.FilterOperator.EQ, iQuery));
				}
				oTableSearchState = new sap.ui.model.Filter({
					filters: aFilters,
					and: false
				});
			}

			this.getView().byId("idSummaryTable").getBinding("items").filter(oTableSearchState, "Application");
		},

		handleClear: function () {
			var oTable = this.getView().byId("idSummaryTable");
			var oBinding = oTable.getBinding("items");
			oBinding.filter([]);
			oBinding.refresh();

			var oModel = new JSONModel({ files: [] });
			this.getView().setModel(oModel);
			this.getView().byId("upload").clear();
			this.getView().byId("languageSelect").setSelectedKey("");
			this.getView().byId("translate").setEnabled(false);
		}

	});

});
