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

	return Controller.extend("doctranslationv1.controller.TxtTranslate", {
	onInit: function () {

			this._oRouter = this.getOwnerComponent().getRouter();
				this._oRouter.getRoute("TxtTranslate").attachPatternMatched(this._onObjectMatched, this);
			var oModel = new JSONModel({
				files: []
			});
			this.getView().setModel(oModel);

			this.oBusyDialog = new sap.m.BusyDialog({
				title: "Please wait",
				text: "Getting data from Gen AI..."
			});
		},
			_onObjectMatched: function (oEvent) {

			this.Email = oEvent.getParameter("arguments").Email;
		},
		navBack: function () {
		
			this._oRouter.navTo("View1",{Email:this.Email});
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
		Templatepress: function () {
			
           var templateUrl = "https://res.cloudinary.com/coeportal/raw/upload/v1719996953/Template_cw9ciy.docx"; // URL to your document template
            // Create an anchor element and trigger a download
    fetch(templateUrl)
                .then(response => response.blob())
                .then(blob => {
                    var blobUrl = window.URL.createObjectURL(blob);
 
                    // Create an anchor element and trigger a download
                    var link = document.createElement("a");
                    link.href = blobUrl;
                    link.style.display = "none";
                    link.download = "Template.docx"; // Set the default file name here
 
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
 
                    // Clean up the Blob URL
                    window.URL.revokeObjectURL(blobUrl);
                })
                .catch(error => {
                    	MessageBox.error("Failed to download file:", error);
                });
        },
		handleFileChange: function (oEvent) {

				
		
			this.file = oEvent.getParameter("files");
			this.fileName = this.file.name;
		var _allowedFileTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			"application/vnd.openxmlformats-officedocument.presentationml.presentation"
		];

			if (!this.file || this.file.length === 0) {
				MessageToast.show("Please select files first.");
				return;
			}
			var oModel = this.getView().getModel();
			var aFileData = oModel.getProperty("/files");
		
				for (var i = 0; i < this.file.length; i++) {
						// if (allowedFileTypes.includes(this.file[i].type)) {
					aFileData.push({
						fileName: this.file[i].name,
						translationLanguage: "",
						progress: 0,
						status: "Pending",
						translatedDocument: "",
						sourceFileLink: "",
						fileObject: this.file[i]
					});
			// 	} else {
			// 	MessageBox.error("Unsupported file type: " + this.file[i].name);
			// 		this.getView().byId("upload").clear();
			// }
				}
		
			oModel.setProperty("/files", aFileData);
		},
	
		onUploadPress: function (oFileData, index) {

			this.oBusyDialog.open();

			var apiLink = "https://gcpdocumenttranslation.cfapps.us10-001.hana.ondemand.com/gcpdocumenttranslation";
			//var form = new FormData();
			//         form.append("files", oFileData.fileObject, oFileData.fileName);
			var form = new FormData();
			for (var i = 0; i < this.file.length; i++) {
				form.append("files", this.file[i], this.file[i].name);
				form.append("target_language", this.lang);
			}

			var that = this;
			$.ajax({
				url: apiLink,
				method: "POST",
				timeout: 0,
				processData: false,
				mimeType: "multipart/form-data",
				contentType: false,
				data: form,
				success: function (response) {
					
					
					var oModel = that.getView().getModel();
					try {
						if (typeof response === "string") {
							response = JSON.parse(response);
						}
					
						var aFiles = oModel.getProperty("/files");
						var destlink = Object.keys(response.Output_Files);
						var srclink = Object.keys(response.Input_Files);
						aFiles.forEach(function (file, index) {
							
							if (index < destlink.length) {
								var dstkey = destlink[index];
									var srckey = srclink[index];
								file.translatedDocument = response.Output_Files[dstkey];
								file.sourceFileLink = response.Input_Files[srckey];
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
			error: function (_jqXHR, _textStatus, _errorThrown) {
				var oModel = that.getView().getModel();
				that.oBusyDialog.close();
				// this.oBusyDialog.close();
				sap.m.MessageBox.error("POST request failed");
			
				oModel.setProperty("/files/" + index + "/status", "Failed");
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
				worker: false // We need to disable worker because we are using a MockServer as OData Service
			};

			oSheet = new Spreadsheet(oSettings);
			oSheet.build().finally(function () {
				oSheet.destroy();
			});
		},
		createColumnConfig: function () {
			var aCols = [];

			aCols.push({
				label: 'File Name',
				property: 'fileName',
				type: Number,
				scale: 0
			});

			aCols.push({
				label: 'Source Document',
				property: 'sourceFileLink',
				type: String
			});

			aCols.push({
				label: 'Translation Language',
				property: 'translationLanguage',
				type: String
			});

			aCols.push({
				label: 'Translated Document',
				property: 'translatedDocument',
				type: String
			});

			aCols.push({
				label: 'Progress',
				property: 'progress',
				type: String
			});

			aCols.push({
				label: 'Status',
				property: 'Status',
				type: Number,
				scale: 0
			});

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
			var sFragmentPath = "doctranslationv1.view.fragments.SortDialog";
			var oViewSettingsDialog;

			// Load the fragment
			Fragment.load({
				id: oView.getId(),
				name: sFragmentPath,
				controller: this
			}).then(function (oDialog) {
				oView.addDependent(oDialog);
				oViewSettingsDialog = oDialog;
				oViewSettingsDialog.open();
		}.bind(this)).catch(function (_oError) {
			// Handle error
			
		});
	},
	handleFilterButtonPressed: function () {
			var oView = this.getView();
			var sFragmentPath = "doctranslationv1.view.fragments.FilterDialog";
			var oViewSettingsDialog;

			// Load the fragment
			Fragment.load({
				id: oView.getId(),
				name: sFragmentPath,
				controller: this
			}).then(function (oDialog) {
				oView.addDependent(oDialog);
				oViewSettingsDialog = oDialog;
				oViewSettingsDialog.open();
		}.bind(this)).catch(function (_oError) {
			// Handle error
			
		});
	},

	handleSortDialogConfirm: function (oEvent) {
			var oTable = this.byId("idSummaryTable"),
				mParams = oEvent.getParameters(),
				oBinding = oTable.getBinding("items"),
				sPath,
				bDescending,
				aSorters = [];

			sPath = mParams.sortItem.getKey();
			bDescending = mParams.sortDescending;
			aSorters.push(new Sorter(sPath, bDescending));

			// apply the selected sort settings
			oBinding.sort(aSorters);
		},
		handleFilterDialogConfirm: function (oEvent) {
			
			var oTable = this.byId("idSummaryTable");
			var mParams = oEvent.getParameters();
			var oBinding = oTable.getBinding("items");
			var aFilters = [];
			mParams.filterItems.forEach(function (oItem) {
				var aSplit = oItem.getKey()

				var oFilter = new sap.ui.model.Filter("translationLanguage", sap.ui.model.FilterOperator.Contains, aSplit);
				aFilters.push(oFilter);
			});

			// Apply filter settings
			oBinding.filter(aFilters);

		},
		onSearch: function (oEvent) {
			var oTableSearchState = [],
				sQuery = oEvent.getParameter("query");

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
			// Get the binding for the items aggregation (assuming it's a list)
			var oBinding = oTable.getBinding("items");

			// Clear the current filters
			oBinding.filter([]);

			// Optional: Refresh the binding if needed
			oBinding.refresh();
			var oModel = new JSONModel({
				files: []
			});
			this.getView().setModel(oModel);
			this.getView().byId("upload").clear();
			this.getView().byId("languageSelect").setSelectedKey("");
			this.getView().byId("translate").setEnabled(false);
		},
	

	});

});