sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/core/Fragment",
	"sap/ui/model/Sorter",
	"sap/ui/export/Spreadsheet",
	"sap/ui/Device"
], function (Controller, JSONModel, MessageToast, MessageBox, Fragment, Sorter, Spreadsheet, Device) {
	"use strict";

	return Controller.extend("doctranslationv1.controller.BatchTranslation", {

		onInit: function () {

			this._oRouter = this.getOwnerComponent().getRouter();
			this._oRouter.getRoute("BatchTranslation").attachPatternMatched(this._onObjectMatched, this);
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
		handleRefresh: function () {
			this.loadFileStatuses();
			this.GCPSrcFile();
			this.GCPDstFile();
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
			this.saveFileStatuses();
			this.getView().byId("batchTranslate").setEnabled(true);
		},
		 handleFileChange: function (oEvent) {

			this.file = oEvent.getParameter("files");
			this.fileName = this.file.name;

			if (!this.file || this.file.length === 0) {
				MessageToast.show("Please select files first.");
				return;
			}
			var oModel = this.getView().getModel();
			var aFileData = oModel.getProperty("/files");

			for (var i = 0; i < this.file.length; i++) {

				aFileData.push({
					fileName: this.file[i].name,
					translationLanguage: "",
					progress: 0,
					status: "Pending",
					translatedDocument: "",
					sourceFileLink: "",
					startAt: "", 
					completedAt: "",
					fileObject: this.file[i]
				});

			}

			oModel.setProperty("/files", aFileData);
			this.saveFileStatuses();
		},

		onUploadPress: function (_oFileData, _index) {
			
				this.getView().byId("batchTranslate").setEnabled(false);
			MessageBox.information("Batch Document Translation is Successfully Intiated and Once it is Completed you will be notify through Mail. ");

			var oModel = this.getView().getModel();
			var gFiles = oModel.getProperty("/files");

			gFiles.forEach(function (file) {
				file.startAt = new Date().toLocaleString();
			});

			oModel.setProperty("/files", gFiles);
			this.saveFileStatuses();

			var apiLink = "https://gcpbatchdocumenttranslation.cfapps.us10-001.hana.ondemand.com/gcpbatchdocumenttranslation";
			var form = new FormData();
			for (var i = 0; i < gFiles.length; i++) {
				form.append("files", this.file[i], this.file[i].name);
				form.append("target_language", this.lang);
				form.append("source_language", "en-US");
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
					try {
						if (typeof response === "string") {
							response = JSON.parse(response);
						}

						var aFiles = oModel.getProperty("/files").reverse();
						var destlink = Object.keys(response).reverse();

						aFiles.forEach(function (file, index) {
							
							if (index < destlink.length) {

								var key = destlink[index];
								if (key === "Ouput_File0") {
									oModel.setProperty("/files", aFiles);
								} else {
									file.translatedDocument = response[key];
									file.progress = 100;
									file.status = "Complete";
									file.completedAt = new Date().toLocaleString();
								}
							}
						});

						oModel.setProperty("/files", aFiles);
						that.GCPSrcFile();
						if(aFiles[0].status === "Complete"){
							that.registerWorkflow();
					}
						that.saveFileStatuses();
				} catch (_error) {
					
					MessageBox.error(response);
                       that.response = response;
				
						that.failureMail();
							that.saveFileStatuses();
					}
					that.oBusyDialog.close();
				that.getView().byId("batchUpload").clear();
			},
		error: function (_jqXHR, _textStatus, _errorThrown) {
				
					
				that.oBusyDialog.close();
				that.GCPSrcFile();
				that.GCPDstFile();
			}
		});

	},
	GCPSrcFile: function () {
			var that = this;
			$.ajax({
				url: "https://gcpbatchdocumenttranslation.cfapps.us10-001.hana.ondemand.com/sourcefiles",
				method: "GET",
				timeout: 0,

				success: function (response) {
					
					
					var oModel = that.getView().getModel();
					try {
						if (typeof response === "string") {
							response = JSON.parse(response);
						}

						var aFiles = oModel.getProperty("/files");
						var destlink = Object.keys(response).reverse();

						aFiles.forEach(function (file, index) {
							
							if (index < destlink.length) {

								var key = destlink[index];
							

									file.sourceFileLink = response[key];

								
							}
						});

					oModel.setProperty("/files", aFiles);
					that.saveFileStatuses();
				} catch (_error) {
					that.saveFileStatuses();
				}

			that.oBusyDialog.close();
			that.getView().byId("batchUpload").clear();
		},
		error: function (_jqXHR, _textStatus, _errorThrown) {
			that.oBusyDialog.close();
			
			sap.m.MessageBox.error("POST request failed");

			that.saveFileStatuses();
		}
	});
},
GCPDstFile: function () {
			var that = this;
			$.ajax({
				url: "https://gcpbatchdocumenttranslation.cfapps.us10-001.hana.ondemand.com/translatedfiles",
				method: "GET",
				timeout: 0,

				success: function (response) {
					
					
					var oModel = that.getView().getModel();
					try {
						if (typeof response === "string") {
							response = JSON.parse(response);
						}

						var aFiles = oModel.getProperty("/files");
						var destlink = Object.keys(response);
var startTime = new Date(aFiles[0].startAt);

						aFiles.forEach(function (file, index) {
							
							if (index < destlink.length) {
	var key = destlink[index+1];
						
									file.translatedDocument = response[key];
									file.completedAt = new Date(startTime.getTime() + 10 * 60 * 1000).toLocaleString();
									file.progress = 100;
									file.status = "Complete";
								}
						
						});
	
				oModel.setProperty("/files", aFiles);
					that.saveFileStatuses();
				} catch (_error) {
					that.saveFileStatuses();
				}

			that.oBusyDialog.close();
			that.getView().byId("batchUpload").clear();
		},
		error: function (_jqXHR, _textStatus, _errorThrown) {
			that.oBusyDialog.close();
		
			sap.m.MessageBox.error("POST request failed");

			that.saveFileStatuses();
		}
	});
},
saveFileStatuses: function () {
		
			var oModel = this.getView().getModel();
			var aFiles = oModel.getProperty("/files");
			localStorage.setItem("uploadedFiles", JSON.stringify(aFiles));
		},

		loadFileStatuses: function () {
		
			var oModel = this.getView().getModel();
			var aFiles = JSON.parse(localStorage.getItem("uploadedFiles") || "[]");
			oModel.setProperty("/files", aFiles);

			// Check the status of each file if it's still pending
			this.checkFileStatuses();
		},
		checkFileStatuses: function () {
		
			var oModel = this.getView().getModel();
			var aFiles = oModel.getProperty("/files");

			aFiles.forEach(function (oFileData) {
				if (oFileData.status === "Pending") {
					oFileData.status = "Pending";
					oFileData.progress = 0;
					oModel.setProperty("/files", aFiles);
					this.saveFileStatuses();
				}
			}.bind(this));
				var currentdate = new Date().toLocaleString();
				var completedate = aFiles[0].completedAt;
					if(completedate === currentdate){
							this.registerWorkflow();
					}
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
			this._oTable = this.byId('batchSummaryTable');
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
			var sFragmentPath = "doctran.view.fragments.SortDialog";
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
			var sFragmentPath = "doctran.view.fragments.FilterDialog";
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
		var oTable = this.byId("batchSummaryTable"),
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
		
		var oTable = this.byId("batchSummaryTable");
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
			this.getView().byId("batchSummaryTable").getBinding("items").filter(oTableSearchState, "Application");
		},
		handleClear: function () {

			var oTable = this.getView().byId("batchSummaryTable");
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
			
			var aFiles = oModel.getProperty("/files");
				localStorage.setItem("uploadedFiles", JSON.stringify(aFiles));
				oModel.setProperty("/files", aFiles);
		this.getView().byId("batchUpload").clear();
		this.getView().byId("batchLanguageSelect").setSelectedKey("");
		this.getView().byId("batchTranslate").setEnabled(false);
		},
		registerWorkflow: function () {
			this.getTokenForWOrkflow();
			var payload = JSON.stringify({
				"definitionId": "doctranslationv1",
				"context": {
					"Email": this.Email
				}
			});
			var xhr = new XMLHttpRequest();
			xhr.withCredentials = false;
			xhr.addEventListener("readystatechange", function () {
				if (this.readyState === this.DONE) {
				}
			});
			var url1 = '/destination/bpmworkflowruntime1/workflow-service/rest/v1/workflow-instances';
			xhr.open("POST", url1);
			xhr.setRequestHeader("X-CSRF-Token", this._token);
			xhr.setRequestHeader("Content-Type", "application/json");
			xhr.setRequestHeader("Accept", "application/json");
			xhr.send(payload);
		},
		failureMail: function () {
			this.getTokenForWOrkflow();
			var payload = JSON.stringify({
				"definitionId": "failuremail",
				"context": {
					"Email": this.Email,
					"Failmsg" : this.response
				}
			});
			var xhr = new XMLHttpRequest();
			xhr.withCredentials = false;
			xhr.addEventListener("readystatechange", function () {
				if (this.readyState === this.DONE) {
				}
			});
			var url1 = '/destination/bpmworkflowruntime1/workflow-service/rest/v1/workflow-instances';
			xhr.open("POST", url1);
			xhr.setRequestHeader("X-CSRF-Token", this._token);
			xhr.setRequestHeader("Content-Type", "application/json");
			xhr.setRequestHeader("Accept", "application/json");
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
		}

	});

});