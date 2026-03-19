sap.ui.controller("dms.DMSUploadForm", {

	/**
	 * Called when a controller is instantiated and its View controls (if available) are alrbmiteady created.
	 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
	 * @memberOf dms.DMSUploadForm
	 */

	onInit: function () {},

	categoryChanged: function (event) {

		var category = event.oSource.getSelectedKey();

		documentGroups.loadData(sap_system + "/kcad/cross_app/zdms_service/doc_groups?doc_type=" + category + "&sap-client=200", null, false,
			"POST");

		if (category == "")
			sap.ui.getCore().byId("selDocGroup").setEnabled(false);
		else
			sap.ui.getCore().byId("selDocGroup").setEnabled(true);

		//Hide all content we don't want to see
		var createDMS = sap.ui.getCore().byId("App").getCurrentPage().getContent()[0];

		hideClassificationsForm();
		createDMS.removeContent(sap.ui.getCore().byId("objectLinks"));
		createDMS.removeContent(attachmentsView);
		sap.ui.getCore().byId("attachmentList").removeAllItems();

	},

	groupChanged: function (event) {
		var group = event.oSource.getSelectedKey();
		var category = sap.ui.getCore().byId("selDocCategory").getSelectedKey();
		var createDMS = sap.ui.getCore().byId("App").getCurrentPage().getContent()[0];

		documentTemplate.loadData(sap_system + "/kcad/cross_app/zdms_service/template?doc_type=" + category + "&doc_group=" + group +
			"&sap-client=200", null, false, "POST");

		resetClassifications();
		initialiseScreen();
	},

	formatVisibility: function (value) {
		if (value == "M" || value == "O") {
			if (this.getParent() != null)
				this.getParent().setVisible(true);
			return true;
		} else {
			if (this.getParent() != null)
				this.getParent().setVisible(false);

			return false;
		}
	},

	updateTable: function () {
		objectLinksBindItems();
	},

	deleteObjectLink: function (event) {
		var oTable = sap.ui.getCore().byId("objectLinksTable");
		var objectLinks = oTable.getModel().getData().ABAP_JSON.OBJECT_LINKS;
		var path = event.getParameter('listItem').getBindingContext().sPath;
		var selectedIndex = parseInt(path.substring(24));

		if (objectLinks.length > 1) {
			objectLinks.splice(selectedIndex, 1);
			oTable.removeItem(event.getParameter('listItem'));
			event.getParameter('listItem').destroy();
		} else {
			documentTemplate.setProperty(path + "/DMS_ID", "");
			documentTemplate.setProperty(path + "/EQUIPMENT", "");
			documentTemplate.setProperty(path + "/FUNC_LOCATION", "");
			documentTemplate.setProperty(path + "/ITEM", 0000);
			documentTemplate.setProperty(path + "/MANDT", "");
			documentTemplate.setProperty(path + "/MATERIAL", "");
			documentTemplate.setProperty(path + "/WORK_ORDER", "");
		}
	},

	addRow: function (event) {
		formHasErrors = false;
		formErrors = "";

		var oTable = sap.ui.getCore().byId("objectLinksTable");

		validateObjectLinks();

		if (formHasErrors) {
			return;
		}

		var line = {
			DMS_ID: "",
			EQUIPMENT: "",
			FUNC_LOCATION: "",
			START_DATE: "",
			MANUF_SER_NO: "",
			ITEM: "0000",
			MANDT: "",
			MATERIAL: "",
			WORK_ORDER: ""
		};
		documentTemplate.getData()["ABAP_JSON"]["OBJECT_LINKS"].push(line);

		objectLinksBindItems();
	},

	workOrderChanged: function (event) {
		var field = event.getSource();
		var workOrder = event.getParameter("newValue");
		var docGroup = sap.ui.getCore().byId("selDocGroup").getSelectedKey();
		var path = field.getBindingContext().getPath();
		var aTableData = documentTemplate.getData().ABAP_JSON.OBJECT_LINKS;
		var wf_id = field.getModel().getData()["ABAP_JSON"].DMS_DATA.WF_ID;
		var iRowIndex = parseInt(path.substr(path.lastIndexOf("/") + 1, path.length));

		//Validate duplicate work orders
		if (workOrder.length > 0) {
			for (var cnt = 0; cnt < aTableData.length; cnt++) {
				if (aTableData[cnt].WORK_ORDER === workOrder && iRowIndex !== cnt) {
					field.setValueState(sap.ui.core.ValueState.Error);
					field.setValueStateText("Work Order " + workOrder + " already exists in the table");
					return;
				}
			}
		}

		if (workOrder != "") {
			jQuery.ajax({
				async: false,
				type: 'POST',
				url: sap_system + "/kcad/cross_app/zdms_service/check_work_order?order=" + workOrder + "&doc_group=" + docGroup + "&wf_id=" +
					wf_id,

				success: function (data) {
					var response = jQuery.parseJSON(data);
					var errorFlag = false;
					var errorMessage;

					//Validate duplicate work orders
					if (workOrder.length > 0) {
						for (var cnt = 0; cnt < aTableData.length; cnt++) {
							if (aTableData[cnt].WORK_ORDER === workOrder && iRowIndex !== cnt) {
								errorFlag = true;
								errorMessage = "Work order " + workOrder + " already exists in the table"
								formHasErrors = true;
							}
						}
					}

					var i = 0;

					for (i = 0; i < response.ABAP_JSON.MESSAGES.length; i++) {
						if (response.ABAP_JSON.MESSAGES[i].TYPE == 'E') {
							errorFlag = true;
							errorMessage = response.ABAP_JSON.MESSAGES[i].MESSAGE;
							formHasErrors = true;
						}
					}

					if (errorFlag) {
						field.setValueState(sap.ui.core.ValueState.Error);
						field.setValueStateText(errorMessage);
						formErrors += "\n" + errorMessage;

						var screenConfig = documentTemplate.getData().ABAP_JSON.SCREEN_CONFIG;

						if (screenConfig.FUNC_LOCATION_VIS !== "M" && screenConfig.FUNC_LOCATION_VIS !== "O" && screenConfig.FUNC_LOCATION_VIS !== "MO") {
							documentTemplate.setProperty(path + "/FUNC_LOCATION", "");
							documentTemplate.setProperty(path + "/FUNC_LOCATION_TXT", "");
						}

						if (screenConfig.EQUIP_MASTER_VIS !== "M" && screenConfig.EQUIP_MASTER_VIS !== "O" && screenConfig.EQUIP_MASTER_VIS !== "MO") {
							documentTemplate.setProperty(path + "/EQUIPMENT", "");
							documentTemplate.setProperty(path + "/EQUIPMENT_TXT", "");
							ocumentTemplate.setProperty(path + "/MANU_SER_NO", "");
						}

						if (screenConfig.MATERIAL_MASTER_VIS !== "M" && screenConfig.MATERIAL_MASTER_VIS !== "O" && screenConfig.MATERIAL_MASTER_VIS !==
							"MO") {
							documentTemplate.setProperty(path + "/MATERIAL", "");
							documentTemplate.setProperty(path + "/MATERIAL_TXT", "");
						}

						documentTemplate.setProperty(path + "/WORK_ORDER_TXT", "");

					} else {
						field.setValueState(sap.ui.core.ValueState.None);
						field.setValueStateText("");

						var orderOldvalue = "";

						if (formType === "Approve" && orderOldvalue === "") {
							var currPath = field.getBindingContext().getPath();
							var currModel = field.getBindingContext().getModel();

							var oldEquipment = currModel.getProperty(currPath).EQUIPMENT;
							var oldFunctionalLocation = currModel.getProperty(currPath).FUNC_LOCATION;

							var techObjectsMatch = true;
							var warningMessage = "";

							//Fields only need to be checked if they are required / visable
							if (documentTemplate.getData().ABAP_JSON.SCREEN_CONFIG.EQUIP_MASTER_VIS !== "") {
								if (oldEquipment !== response.ABAP_JSON.EQUIPMENT) {
									techObjectsMatch = false;
									warningMessage += "\n\nEquipment - New: " + response.ABAP_JSON.EQUIPMENT;
									warningMessage += "\nEquipment - Old: " + oldEquipment;
								}
							}

							if (documentTemplate.getData().ABAP_JSON.SCREEN_CONFIG.FUNC_LOCATION_VIS !== "") {
								if (oldFunctionalLocation !== response.ABAP_JSON.FUNCT_LOC) {
									techObjectsMatch = false;
									warningMessage += "\n\nFunctional Location - New: " + response.ABAP_JSON.FUNCT_LOC;
									warningMessage += "\nFunctional Location - Old: " + oldFunctionalLocation;

								}
							}
							if (techObjectsMatch === false) {
								warningMessage = "Current technical objects do not match new work order" + warningMessage +
									"\n\n Would you like to overwrite them";

								sap.m.MessageBox.confirm(warningMessage, {
									title: "Warning",
									onClose: function (choice) {
										if (choice === "OK") {
											updateTechObjectsFromWO(field, response);
										} else {
											field.setValue("");
										}
									}
								});

							} else {
								updateTechObjectsFromWO(field, response);
							}
						} else {
							updateTechObjectsFromWO(field, response);

						}
					}
				},

				error: function (jqXHR, textStatus, errorThrown) {
					sap.ui.commons.MessageBox.show("Error Occurred when processing\n" + errorThrown + "\n",
						sap.ui.commons.MessageBox.Icon.ERROR,
						"Error occured when submitting form"
					);
				}
			});

		} else {

			if (checkIfEmptyAllowed("WORK_ORDER", field) == false) {
				formHasErrors = true;
				formErrors += "\n" + "Work Order is mandatory please enter a value";

				return;
			}

			documentTemplate.setProperty(path + "/FUNC_LOCATION", "");
			documentTemplate.setProperty(path + "/FUNC_LOCATION_TXT", "");
			documentTemplate.setProperty(path + "/EQUIPMENT", "");
			documentTemplate.setProperty(path + "/EQUIPMENT_TXT", "");
			documentTemplate.setProperty(path + "/MATERIAL", "");
			documentTemplate.setProperty(path + "/MATERIAL_TXT", "");
			documentTemplate.setProperty(path + "/WORK_ORDER_TXT", "");

		}
	},

	functionalLocationChanged: function (event) {
		var flInputField = event.getSource();
		var funcLoc = event.getParameter("newValue").toUpperCase();
		flInputField.setValue(funcLoc);

		var path = flInputField.getBindingContext().getPath();

		if (funcLoc != "") {
			//For equipment alerts only MISC functional location is allowed!
			if (sap.ui.getCore().byId("selDocGroup").getSelectedKey() == "EA") {
				funcLoc = funcLoc.toUpperCase();

				if (funcLoc.indexOf("MISC-100-020") == -1) {
					var errorMessage = "For Equipment Alerts only use MISC-100-020 functional locations";

					flInputField.setValueState(sap.ui.core.ValueState.Error);
					flInputField.setValueStateText(errorMessage);
					formErrors += "\n" + errorMessage;
					formHasErrors = true;
					return;
				}
			}

			jQuery.ajax({
				async: false,
				type: 'POST',
				url: sap_system + "/kcad/cross_app/zdms_service/check_functional_location?func_loc=" + funcLoc,

				success: function (data) {
					var response = jQuery.parseJSON(data);
					var errorFlag = false;
					var errorMessage;

					var i = 0;

					for (i = 0; i < response.ABAP_JSON.MESSAGES.length; i++) {
						if (response.ABAP_JSON.MESSAGES[i].TYPE == 'E') {
							errorFlag = true;
							errorMessage = response.ABAP_JSON.MESSAGES[i].MESSAGE;
							formHasErrors = true;
						}
					}

					if (errorFlag) {
						flInputField.setValueState(sap.ui.core.ValueState.Error);
						flInputField.setValueStateText(errorMessage);
						documentTemplate.setProperty(path + "/FUNC_LOCATION_TXT", "");

						formErrors += "\n" + errorMessage;

					} else {
						flInputField.setValueState(sap.ui.core.ValueState.Success);

						documentTemplate.setProperty(path + "/FUNC_LOCATION_TXT", response.ABAP_JSON.FUNCT_LOC_TXT);
					}

				},

				error: function (jqXHR, textStatus, errorThrown) {
					sap.ui.commons.MessageBox.show("Error Occurred when processing\n" + errorThrown + "\n",
						sap.ui.commons.MessageBox.Icon.ERROR,
						"Error occured when submitting form"
					);
				}
			});
		} else {
			if (checkIfEmptyAllowed("FUNC_LOCATION", flInputField) == false) {
				formHasErrors = true;
				formErrors += "\n" + "Functional Location is mandatory please enter a value";
			}

			documentTemplate.setProperty(path + "/FUNC_LOCATION_TXT", "");
		}
	},

	equipmentChanged: function (event) {
		var eqInputField = event.getSource();
		var equipment = event.getParameter("newValue").toUpperCase();
		eqInputField.setValue(equipment);
		var path = eqInputField.getBindingContext().getPath();
		var functionalLocation = documentTemplate.getProperty(path + "/FUNC_LOCATION");

		//If the field is not linked ie M** do not pass the functional location to the equipment
		if (!isFieldLinked("EQUIP_MASTER"))
			functionalLocation = "";

		if (equipment != "") {
			jQuery.ajax({
				async: false,
				type: 'POST',
				url: sap_system + "/kcad/cross_app/zdms_service/check_equipment?equipment=" + equipment + "&func_loc=" + functionalLocation,

				success: function (data) {
					var response = jQuery.parseJSON(data);
					var errorFlag = false;
					var errorMessage;
					var i = 0;

					for (i = 0; i < response.ABAP_JSON.MESSAGES.length; i++) {
						if (response.ABAP_JSON.MESSAGES[i].TYPE == 'E') {
							errorFlag = true;
							errorMessage = response.ABAP_JSON.MESSAGES[i].MESSAGE;
							formHasErrors = true;
						}
					}

					if (errorFlag) {
						eqInputField.setValueState(sap.ui.core.ValueState.Error);
						eqInputField.setValueStateText(errorMessage);
						formErrors += "\n" + errorMessage;

						documentTemplate.setProperty(path + "/FUNC_LOCATION_TXT", "");
						documentTemplate.setProperty(path + "/MATERIAL_TXT", "");
						documentTemplate.setProperty(path + "/EQUIPMENT_TXT", "");

						if (sap.ui.getCore().byId("selDocGroup").getSelectedKey() != "EA")
							documentTemplate.setProperty(path + "/FUNC_LOCATION", "");

						documentTemplate.setProperty(path + "/MATERIAL", "");

					} else {
						eqInputField.setValueState(sap.ui.core.ValueState.Success);

						if (documentTemplate.getData().ABAP_JSON.SCREEN_CONFIG.FUNC_LOCATION_VIS != "" &&
							(sap.ui.getCore().byId("selDocGroup").getSelectedKey() != "EA")) {
							documentTemplate.setProperty(path + "/FUNC_LOCATION", response.ABAP_JSON.FUNC_LOCATION);
							documentTemplate.setProperty(path + "/FUNC_LOCATION_TXT", response.ABAP_JSON.FUNCT_LOC_TXT);
						}
						if (documentTemplate.getData().ABAP_JSON.SCREEN_CONFIG.MATERIAL_MASTER_VIS != "") {
							documentTemplate.setProperty(path + "/MATERIAL", response.ABAP_JSON.MATERIAL);
							documentTemplate.setProperty(path + "/MATERIAL_TXT", response.ABAP_JSON.MATERIAL_TXT);
						}

						documentTemplate.setProperty(path + "/EQUIPMENT_TXT", response.ABAP_JSON.EQUIPMENT_TXT);

						documentTemplate.setProperty(path + "/MANU_SER_NO", response.ABAP_JSON.MANU_SER_NO);

					}
				},

				error: function (jqXHR, textStatus, errorThrown) {
					sap.ui.commons.MessageBox.show("Error Occurred when processing\n" + errorThrown + "\n",
						sap.ui.commons.MessageBox.Icon.ERROR,
						"Error occured when submitting form"
					);
				}
			});

		} else {
			if (checkIfEmptyAllowed("EQUIP_MASTER", eqInputField) == false) {
				formHasErrors = true;
				formErrors += "\n" + "Equipment is mandatory please enter a value";
			}

			documentTemplate.setProperty(path + "/FUNC_LOCATION_TXT", "");
			documentTemplate.setProperty(path + "/MATERIAL_TXT", "");
			documentTemplate.setProperty(path + "/EQUIPMENT_TXT", "");
			if (sap.ui.getCore().byId("selDocGroup").getSelectedKey() != "EA")
				documentTemplate.setProperty(path + "/FUNC_LOCATION", "");

			documentTemplate.setProperty(path + "/MATERIAL", "");

		}
	},

	materialChanged: function (event) {
		var matInputField = event.getSource();
		var material = event.getParameter("newValue");

		var path = matInputField.getBindingContext().getPath();
		var equipment = documentTemplate.getProperty(path + "/EQUIPMENT");

		//If the field is not linked ie M** do not pass the equipment
		if (!isFieldLinked("MATERIAL_MASTER"))
			equipment = "";

		if (material != "") {
			jQuery.ajax({
				async: false,
				type: 'POST',
				url: sap_system + "/kcad/cross_app/zdms_service/check_material?material=" + material + "&equipment" + equipment,

				success: function (data) {
					var response = jQuery.parseJSON(data);
					var errorFlag = false;
					var errorMessage;

					var i = 0;

					for (i = 0; i < response.ABAP_JSON.MESSAGES.length; i++) {
						if (response.ABAP_JSON.MESSAGES[i].TYPE == 'E') {
							errorFlag = true;
							errorMessage = response.ABAP_JSON.MESSAGES[i].MESSAGE;
							formHasErrors = true;
						}
					}

					if (errorFlag) {
						matInputField.setValueState(sap.ui.core.ValueState.Error);
						matInputField.setValueStateText(errorMessage);
						formErrors += "\n" + errorMessage;

						documentTemplate.setProperty(path + "/MATERIAL_TXT", "");
					} else
						matInputField.setValueState(sap.ui.core.ValueState.Success);

					documentTemplate.setProperty(path + "/MATERIAL_TXT", response.ABAP_JSON.MATERIAL_TXT);
				},

				error: function (jqXHR, textStatus, errorThrown) {
					sap.ui.commons.MessageBox.show("Error Occurred when processing\n" + errorThrown + "\n",
						sap.ui.commons.MessageBox.Icon.ERROR,
						"Error occured when submitting form"
					);
				}
			});

		} else {
			if (checkIfEmptyAllowed("MATERIAL_MASTER", matInputField) == false) {
				formHasErrors = true;
				formErrors += "\n" + "Material is mandatory please enter a value";
			}

			documentTemplate.setProperty(path + "/MATERIAL_TXT", "");
		}
	},

	submit: function (event) {
		formHasErrors = false;
		var source = event.getSource().getId();

		if (source === "WFApprove") {
			approveDMSForm();
		} else if (source === "WFReject") {
			rejectPressed();
		} else if (source === "submit" || source === "resubmit") {
			submitNewDMSForm();
		} else if (source === "deleteDMS") {
			deleteDMSForm();
		}
	},

	/**
	 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
	 * (NOT before the first rendering! onInit() is used for that one!).
	 * @memberOf dms.DMSUploadForm
	 */
	onBeforeRendering: function () {},

	/**
	 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
	 * This hook is the same one that SAPUI5 controls get after being rendered.
	 * @memberOf dms.DMSUploadForm
	 */
	onAfterRendering: function () {},

	/**
	 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
	 * @memberOf dms.DMSUploadForm
	 */
	//  onExit: function() {
	//
	//  }

	workOrderValueHelp: function (event) {
		var field = event.getSource();

		var id = "woOrderF4";

		//if (f4Dialog === undefined) {
		var searchField = new sap.m.SearchField({
			search: function (event) {
				searchHelpFilterSearch(id);
			}
		});

		var oFilterBar = new sap.ui.comp.smartfilterbar.SmartFilterBar({
			id: "smartBar",
			entityType: "WorkOrderSearch"
		});

		//oFilterBar.addEventDelegate({
		//	"onAfterRendering": function () {
		//			$("#smartBar-filterItemControlWorkOrderSearch-EQUIPMENT_s").parent().parent().css({"width":"15rem"});
		//	}
		//});

		oFilterBar.setFilterContainerWidth("25rem")

		var equipment = event.getSource().getBindingContext().getProperty('EQUIPMENT');
		var documentGroup = documentTemplate.getProperty("/ABAP_JSON/DMS_DATA/DOC_GROUP");

		//Set filter for equipment it entered
		var equipment = event.getSource().getBindingContext().getProperty('EQUIPMENT');
		var functionalLocation = event.getSource().getBindingContext().getProperty('FUNC_LOCATION');

		if (documentGroup === "CE" || documentGroup === "CO") {
			var controlTaskListGroup = new sap.ui.comp.smartfilterbar.ControlConfiguration({
				key: "MN_WK_CTR_s",
				defaultFilterValues: [
					new sap.ui.comp.smartfilterbar.SelectOption({
						sign: "I",
						low: "INSP"
					}),
					new sap.ui.comp.smartfilterbar.SelectOption({
						sign: "I", 
						low: "HOSE"
					}),
					new sap.ui.comp.smartfilterbar.SelectOption({
						sign: "I",
						low: "CEMENT"
					}),
					new sap.ui.comp.smartfilterbar.SelectOption({
						sign: "I",
						low: "TPTE"
					}),
					new sap.ui.comp.smartfilterbar.SelectOption({
						sign: "I",
						low: "EMM-INSP"
					}),
					new sap.ui.comp.smartfilterbar.SelectOption({
						sign: "I",
						low: "ESP-INSP"
					}),
					new sap.ui.comp.smartfilterbar.SelectOption({
						sign: "I",
						low: "MSP-INSP"
					}),
					new sap.ui.comp.smartfilterbar.SelectOption({
						sign: "I",
						low: "RM-INSP"
					}),
					new sap.ui.comp.smartfilterbar.SelectOption({
						sign: "I",
						low: "TP-INSP"
					})
				]
			});

			oFilterBar.addControlConfiguration(controlTaskListGroup);
		}

		var controlSysStatus = new sap.ui.comp.smartfilterbar.ControlConfiguration({
			key: "SYSTEM_STATUS_ss",
			defaultFilterValues: [
				new sap.ui.comp.smartfilterbar.SelectOption({
					sign: "I",
					low: "REL"
				}),
				new sap.ui.comp.smartfilterbar.SelectOption({
					sign: "I",
					low: "CRTD"
				})
			]
		});

		var controlBasicStartDate = new sap.ui.comp.smartfilterbar.ControlConfiguration({
			key: "BASIC_START_DATE_s",
			controlType: "date"
		});

		if (equipment !== "" || equipment === undefined) {
			var controlEquipment = new sap.ui.comp.smartfilterbar.ControlConfiguration({
				key: "EQUIPMENT_s",
				defaultFilterValues: [
					new sap.ui.comp.smartfilterbar.SelectOption({
						sign: "I",
						low: equipment
					})
				]
			});

			oFilterBar.addControlConfiguration(controlEquipment);
		}

		//Set filter for functional location if entered
		if (functionalLocation !== "" || functionalLocation === undefined) {
			var controlFL = new sap.ui.comp.smartfilterbar.ControlConfiguration({
				key: "FUNCT_LOC_s",
				defaultFilterValues: [
					new sap.ui.comp.smartfilterbar.SelectOption({
						sign: "I",
						low: functionalLocation
					})
				]
			});

			oFilterBar.addControlConfiguration(controlFL);
		}

		oFilterBar.addControlConfiguration(controlSysStatus);
		oFilterBar.addControlConfiguration(controlBasicStartDate);

		oFilterBar.setModel(searchModel);

		oFilterBar.attachInitialized(function (oEvent) {

			//oFilterBar.setFilterData(fixedFilters, true);
			//oFilterBar.setEnableBasicSearch(true);
			//oFilterBar.setBasicSearchFieldName("FulltextS");
			//oFilterBar.setBasicSearch(searchField);
			//oFilterBar.setModel(searchModel);

			//oFilterBar.addFieldToAdvancedArea("ORDERID_s");
			//oFilterBar.addFieldToAdvancedArea("ORDER_TYPE_s");
			oFilterBar.addFieldToAdvancedArea("EQUIPMENT_s");
			oFilterBar.addFieldToAdvancedArea("FUNCT_LOC_s");
			oFilterBar.addFieldToAdvancedArea("MN_WK_CTR_s");
			//oFilterBar.addFieldToAdvancedArea("BASIC_START_DATE_s");
			oFilterBar.addFieldToAdvancedArea("SHORT_TEXT_s");
			oFilterBar.addFieldToAdvancedArea("SYSTEM_STATUS_ss");
			//oFilterBar.addFieldToAdvancedArea("TASK_LIST_GROUP_s");
			//oFilterBar.addFieldToAdvancedArea("GROUP_COUNTER_s");

			oFilterBar.attachSearch(function () {
				searchHelpFilterSearch(id);
			});
		});

		//Table item template
		var oColModel = new sap.ui.model.json.JSONModel();
		oColModel.setData({
			cols: [{
				label: "Work Order",
				template: "ORDERID_s"
			}, {
				label: "Description",
				template: "SHORT_TEXT_s"
			}, {
				label: "Equipment",
				template: "EQUIPMENT_s"
			}, {
				label: "Func Location",
				template: "FUNCT_LOC_s"
			}, {
				label: "Basic start date",
				template: "BASIC_START_DATE_s",
				oType: new sap.ui.model.type.Date({
					pattern: 'dd/MM/yyyy'
				})
			}]
		});

		f4Dialog = createHelpDialog(id, searchField, oColModel, "Work Order", "ORDERID_s", "", oFilterBar, field);
		f4Dialog.open();
		//}

		//f4Dialog.open();

	},

	onDateChanged: function (oEvent) {
		if (oEvent.getParameter("dateValue") > new Date()) {
			oEvent.getSource().setDateValue(new Date());

			sap.m.MessageToast.show("Date can't be in the future");
		}
	},

	equipmentValueHelp: function (event) {
		var field = event.getSource();

		var id = "equipmentFilters";
		var equipmentDialog = sap.ui.getCore().byId(id);

		if (equipmentDialog === undefined) {
			var searchField = new sap.m.SearchField({
				search: function (event) {
					searchHelpFilterSearch(id);
				}
			});

			var oFilterBar = new sap.ui.comp.smartfilterbar.SmartFilterBar({
				entityType: "EquipmentSerialSearch"
			});

			oFilterBar.setModel(searchModel);

			oFilterBar.setFilterContainerWidth("25rem")

			oFilterBar.attachInitialized(function (oEvent) {
				oFilterBar.setEnableBasicSearch(false);
				//oFilterBar.setBasicSearchFieldName("FulltextS");
				//oFilterBar.setBasicSearch(searchField);
				//oFilterBar.setUseToolbar(false);

				oFilterBar.addFieldToAdvancedArea("Id");
				oFilterBar.addFieldToAdvancedArea("DescriptS");
				oFilterBar.addFieldToAdvancedArea("ManuSerialS");
				oFilterBar.addFieldToAdvancedArea("SernrS");

				oFilterBar.attachSearch(function () {
					searchHelpFilterSearch(id);
				});
			});

			//Table item template
			var oColModel = new sap.ui.model.json.JSONModel();
			oColModel.setData({
				cols: [{
					label: "Serial Number",
					template: "SernrS"
				}, {
					label: "Equipment",
					template: "Id"
				}, {
					label: "Category",
					template: "EquicatgryS"
				}, {
					label: "Description",
					template: "DescriptS"
				}, {
					label: "Maint Plant",
					template: "MaintplantS"
				}, {
					label: "Material",
					template: "MaterialS"
				}, {
					label: "Manuf. Serial Number",
					template: "ManuSerialS"
				}]
			});

			equipmentDialog = createHelpDialog("equipmentFilters", searchField, oColModel, "Equipment", "Id", "Id", oFilterBar, field);

		}
		equipmentDialog.open();
	}

});