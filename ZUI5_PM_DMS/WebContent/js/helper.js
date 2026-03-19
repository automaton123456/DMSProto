function toggleObjectLinkVisibility(column, value) {
	var tableColumn = sap.ui.getCore().byId(column);

	if (value === "" || value === null)
		tableColumn.setVisible(false);
	else
		tableColumn.setVisible(true);

}

function validateForm() {
	formHasErrors = false;
	formErrors = "";
	validateClassifications();
	validateObjectLinks();
	validateAttachments();
}

function validateAttachments() {
	var attachmentsCount = attachmentsModel.getData().ABAP_JSON.length;

	if (attachmentsCount === 0) {
		formHasErrors = true;
		formErrors += "\nPlease enter at least one attachment";
	}
}

function validateClassifications() {
	var dmsData = documentTemplate.getData().ABAP_JSON.DMS_DATA;
	var screenConfig = documentTemplate.getData().ABAP_JSON.SCREEN_CONFIG;
	var objectLinks = documentTemplate.getData().ABAP_JSON.OBJECT_LINKS;

	if (!classificationIsValid("ADD_DESCRIPTION", "Additional Description")) {
		formHasErrors = true;
	}
	if (!classificationIsValid("ALERT_NUMBER", "Alert Number")) {
		formHasErrors = true;
	}
	if (!classificationIsValid("CERT_AUTH", "Certification Authority")) {
		formHasErrors = true;
	}
	if (!classificationIsValid("CERT_NUM", "Certification Number")) {
		formHasErrors = true;
	}
	if (!classificationIsValid("DOC_DATE", "Document Date")) {
		formHasErrors = true;
	}
	if (!classificationIsValid("MANU_NAME", "Manufacturer Name")) {
		formHasErrors = true;
	}
	if (!classificationIsValid("MANU_SERIAL", "Manufacturer S/N")) {
		formHasErrors = true;
	}
	if (!classificationIsValid("DOC_LOCATION", "Document Location")) {
		formHasErrors = true;
	}
}

function classificationIsValid(fieldname, fieldDescription) {
	var dmsData = documentTemplate.getData().ABAP_JSON.DMS_DATA;
	var screenConfig = documentTemplate.getData().ABAP_JSON.SCREEN_CONFIG;

	var fieldConfig = screenConfig[fieldname + "_VIS"];
	var fieldValue = dmsData[fieldname];

	var fieldObject = sap.ui.getCore().byId(fieldname);

	switch (fieldConfig) {
	case "":
		return true;
		break;

	case "O":
		return true;

	case "M":
		if (fieldValue === "") {
			if (fieldObject.setValueStateText != undefined)
				fieldObject.setValueStateText("Field is mandatory, please enter a value");

			formErrors += "\n" + fieldDescription + " is mandatory, please enter a value";

			fieldObject.setValueState(sap.ui.core.ValueState.Error);
			return false;
		} else {
			fieldObject.setValueState(sap.ui.core.ValueState.Success);
			return true;
		}
	}
}

function objectLinksAllowed() {
	var screenConfig = documentTemplate.getData().ABAP_JSON.SCREEN_CONFIG;

	if (screenConfig.FUNC_LOCATION_VIS === 'AMO' || screenConfig.EQUIP_MASTER_VIS === 'AMO' || screenConfig.MATERIAL_MASTER_VIS === 'AMO' ||
		screenConfig.WORK_ORDER_VIS === 'AMO')
		return true;

	if (screenConfig.FUNC_LOCATION_VIS === 'M*' || screenConfig.EQUIP_MASTER_VIS === 'M*' || screenConfig.MATERIAL_MASTER_VIS === 'M*' ||
		screenConfig.WORK_ORDER_VIS === 'M*')
		return true;

	if (screenConfig.FUNC_LOCATION_VIS === 'M' || screenConfig.EQUIP_MASTER_VIS === 'M' || screenConfig.MATERIAL_MASTER_VIS === 'M' ||
		screenConfig.WORK_ORDER_VIS === 'M')
		return true;

	if (screenConfig.FUNC_LOCATION_VIS === 'M**' || screenConfig.EQUIP_MASTER_VIS === 'M**' || screenConfig.MATERIAL_MASTER_VIS === 'M**' ||
		screenConfig.WORK_ORDER_VIS === 'M**')
		return true;

	if (screenConfig.FUNC_LOCATION_VIS === 'O' || screenConfig.EQUIP_MASTER_VIS === 'O' || screenConfig.MATERIAL_MASTER_VIS === 'O' ||
		screenConfig.WORK_ORDER_VIS === 'O')
		return true;

	if (screenConfig.FUNC_LOCATION_VIS === 'MO' || screenConfig.EQUIP_MASTER_VIS === 'MO' || screenConfig.MATERIAL_MASTER_VIS === 'MO' ||
		screenConfig.WORK_ORDER_VIS === 'MO')
		return true;

	return false;
}

function multipleObjectLinksAllowed() {
	var screenConfig = documentTemplate.getData().ABAP_JSON.SCREEN_CONFIG;

	if (objectLinksAllowed()) {
		if (screenConfig.FUNC_LOCATION_VIS === 'M*' || screenConfig.EQUIP_MASTER_VIS === 'M*' || screenConfig.MATERIAL_MASTER_VIS === 'M*' ||
			screenConfig.WORK_ORDER_VIS === 'M*')
			return true;

		if (screenConfig.FUNC_LOCATION_VIS === 'MO' || screenConfig.EQUIP_MASTER_VIS === 'MO' || screenConfig.MATERIAL_MASTER_VIS === 'MO' ||
			screenConfig.WORK_ORDER_VIS === 'MO')
			return true;
	}

	return false;
}

function validateObjectLinks() {


	//  By firing the change event on entry fields we can revalidate all fields
	var rows = sap.ui.getCore().byId("objectLinksTable").getItems();
	for (var i = 0; i < rows.length; i++) {
		var columns = sap.ui.getCore().byId("objectLinksTable").getItems()[i].getCells();

		var woField = columns[0].getItems()[0];
		var eqField = columns[2].getItems()[0];
		var flField = columns[4].getItems()[0];
		var matField = columns[5].getItems()[0];

		var workOrder = woField.getValue();
		var equipment = eqField.getValue();
		var funcLoc = flField.getValue();
		var material = matField.getValue();

		var screenConfig = documentTemplate.getData().ABAP_JSON.SCREEN_CONFIG;

		if (woField.getValueState() === "Error") {
			formHasErrors = true;
			formErrors = "\n" + woField.getValueStateText();
		}

		//Always validate WO is mandatory
		if (screenConfig.WORK_ORDER_VIS.substring(0, 1) === "M")
			woField.fireChange({
				newValue: workOrder
			});

		//Special validation for AMO workorder, Work order only mandator on approval
		if (screenConfig.WORK_ORDER_VIS === "AMO") {
			//woField.fireChange({
			//	newValue: workOrder
			//});

			//If the work order is blank either functional location or equipment must be entered
			if (formType === "New") {
				if (workOrder === "") {
					if (equipment === "" && funcLoc === "") {
						formHasErrors = true;
						formErrors = "\nRow: " + i + ": If work order is blank, equipment or functional location must be entered";
					}

					if (equipment != "") {
						eqField.fireChange({
							newValue: equipment
						});
					}
					if (funcLoc != "") {
						flField.fireChange({
							newValue: funcLoc
						});
					}
				}

				//Work order is mandatory in Approve of AMO config	
			} else if (formType === "Approve") {
				woField.fireChange({
					newValue: workOrder
				});
			}
		}

		//Special MO row based validation used here
		else if (screenConfig.MATERIAL_MASTER_VIS === "MO" ||
			screenConfig.EQUIP_MASTER_VIS === "MO" ||
			screenConfig.FUNC_LOCATION_VIS === "MO") {

			if (equipment === "" &&
				funcLoc === "" &&
				material === "") {

				formHasErrors = true;
				formErrors = "\nRow: " + i + ": At least one technical object must be entered";
			} else {

				if (equipment != "")
					eqField.fireChange({
						newValue: equipment
					});

				if (funcLoc != "")
					flField.fireChange({
						newValue: funcLoc
					});

				if (material != "")
					matField.fireChange({
						newValue: material
					});
			}

		} else {
			//Validate row if it is mandatory    		    		
			if (screenConfig.EQUIP_MASTER_VIS.substring(0, 1) === "M") {
				eqField.fireChange({
					newValue: equipment
				});
			} else if (screenConfig.EQUIP_MASTER_VIS.substring(0, 1) === "O" && equipment != "") {
				eqField.fireChange({
					newValue: equipment
				});
			}

			if (screenConfig.FUNC_LOCATION_VIS.substring(0, 1) === "M") {
				flField.fireChange({
					newValue: funcLoc
				});
			} else if (screenConfig.FUNC_LOCATION_VIS.substring(0, 1) === "O" && funcLoc != "") {
				flField.fireChange({
					newValue: funcLoc
				});
			}

			if (screenConfig.MATERIAL_MASTER_VIS.substring(0, 1) === "M") {
				matField.fireChange({
					newValue: material
				});

			} else if (screenConfig.MATERIAL_MASTER_VIS.substring(0, 1) === "O" && material != "") {
				matField.fireChange({
					newValue: material
				});
			}
		}
	}
}

function setMandatoryFields() {
	var screenConfig = documentTemplate.getData().ABAP_JSON.SCREEN_CONFIG;

	if (screenConfig.MANU_NAME_VIS === "M")
		sap.ui.getCore().byId("lblManuName").setText("Manufacturer Name *");
	else
		sap.ui.getCore().byId("lblManuName").setText("Manufacturer Name");

	if (screenConfig.ALERT_NUMBER_VIS === "M")
		sap.ui.getCore().byId("lblAlertNum").setText("Alert Number *");
	else
		sap.ui.getCore().byId("lblAlertNum").setText("Alert Number");

	if (screenConfig.CERT_AUTH_VIS === "M")
		sap.ui.getCore().byId("lblCertAuth").setText("Certification Authority *");
	else
		sap.ui.getCore().byId("lblCertAuth").setText("Certification Authority");

	if (screenConfig.CERT_NUM_VIS === "M")
		sap.ui.getCore().byId("lblCertNum").setText("Certification Number *");
	else
		sap.ui.getCore().byId("lblCertNum").setText("Certification Number");

	if (screenConfig.ADD_DESCRIPTION_VIS === "M")
		sap.ui.getCore().byId("lblAddDesc").setText("Additional Description *");
	else
		sap.ui.getCore().byId("lblAddDesc").setText("Additional Description");

	if (screenConfig.DOC_DATE_VIS === "M")
		sap.ui.getCore().byId("lblDocDate").setText("Document Date *");
	else
		sap.ui.getCore().byId("lblDocDate").setText("Document Date");

	if (screenConfig.DOC_LOCATION_VIS === "M")
		sap.ui.getCore().byId("lblDocLocation").setText("Document Location *");
	else
		sap.ui.getCore().byId("lblDocLocation").setText("Document Location");

	if (screenConfig.WORK_ORDER_VIS.substring(0, 1) === "M" || (screenConfig.WORK_ORDER_VIS === 'AMO' && formType === "Approve"))
		sap.ui.getCore().byId("lblObjectLinks.wO").setText("Work Order *");
	else
		sap.ui.getCore().byId("lblObjectLinks.wO").setText("Work Order");

	if (screenConfig.MATERIAL_MASTER_VIS.substring(0, 1) === "M")
		sap.ui.getCore().byId("lblObjectLinks.m").setText("Material *");
	else
		sap.ui.getCore().byId("lblObjectLinks.m").setText("Material");

	if (screenConfig.EQUIP_MASTER_VIS.substring(0, 1) === "M")
		sap.ui.getCore().byId("lblObjectLinks.eQ").setText("Equipment*");
	else
		sap.ui.getCore().byId("lblObjectLinks.eQ").setText("Equipment");

	if (screenConfig.FUNC_LOCATION_VIS.substring(0, 1) === "M")
		sap.ui.getCore().byId("lblObjectLinks.fL").setText("Functional Location *");
	else
		sap.ui.getCore().byId("lblObjectLinks.fL").setText("Functional Location");

	if (screenConfig.MANU_SERIAL_VIS === "M")
		sap.ui.getCore().byId("lblManuSN").setText("Manufacturer S/N *");
	else
		sap.ui.getCore().byId("lblManuSN").setText("Manufacturer S/N");

}

function isFieldLinked(type) {
	var screenConfig = documentTemplate.getData().ABAP_JSON.SCREEN_CONFIG;

	var fieldConfig = screenConfig["" + type + '_VIS'];

	if (fieldConfig === "M**")
		return true;
	else
		return false;
}

function checkIfEmptyAllowed(fieldname, field) {
	var screenConfig = documentTemplate.getData().ABAP_JSON.SCREEN_CONFIG;

	var fieldConfig = screenConfig["" + fieldname + '_VIS'];

	if (fieldConfig === "M**" || fieldConfig === "M" || fieldConfig === "M*" || fieldConfig === "MD" || (fieldConfig === "AMO" && formType ===
			"Approve")) {
		field.setValueState(sap.ui.core.ValueState.Error);
		field.setValueStateText("Field is mandatory enter a value");
		return false;

	} else if (fieldConfig === "AMO") {
		if (formType === 'Approve') {
			return false;
		} else if (formType === 'New') {
			return true;
		}

	} else {
		field.setValueState(sap.ui.core.ValueState.None);
		field.setValueStateText("");
		return true;
	}
}

function hideClassificationsForm() {
	var createDMS = sap.ui.getCore().byId("App").getCurrentPage().getContent()[0];

	resetClassifications();

	createDMS.removeContent(sap.ui.getCore().byId("Classifications"));
}

function resetClassifications() {
	resetField("ADD_DESCRIPTION");
	resetField("ALERT_NUMBER");
	resetField("CERT_AUTH");
	resetField("CERT_NUM");
	resetField("DOC_DATE");
	resetField("MANU_NAME");
	resetField("MANU_SERIAL");
	resetField("DOC_LOCATION");
	resetField("MANU_PART");
}

function resetField(id) {
	var field = sap.ui.getCore().byId(id);

	field.setValueState(sap.ui.core.ValueState.None);

	if (field.setValueStateText != undefined)
		field.setValueStateText("");
}

function submitForm() {
	jQuery.ajax({
		async: true,
		type: 'POST',
		url: sap_system + "/kcad/cross_app/zdms_service/submit",
		data: {
			request_data: documentTemplate.getJSON()
		},

		beforeSend: function () {
			openBusyDialog("Submitting DMS form");
		},

		success: function (data) {
			closeBusyDialog();

			var response = jQuery.parseJSON(data);
			var message = "";
			var errorFlag = false;

			var i = 0;

			for (i = 0; i < response.ABAP_JSON.MESSAGES.length; i++) {
				if (response.ABAP_JSON.MESSAGES[i].TYPE === "E")
					errorFlag = true;

				message += response.ABAP_JSON.MESSAGES[i].MESSAGE + '\n';

			}

			//operation successfull clear the screen!
			if (errorFlag === false) {
				sap.m.MessageToast.show(message);
				navigateHome();
			} else {
				sap.ui.commons.MessageBox.show("" + message,
					sap.ui.commons.MessageBox.Icon.ERROR, "DMS result\n"
				);
			}

		},

		error: function (jqXHR, textStatus, errorThrown) {
			sap.ui.commons.MessageBox.show("Error Occurred when processing\n" + errorThrown + "\n",
				sap.ui.commons.MessageBox.Icon.ERROR,
				"Error occured when submitting form"
			);

			closeBusyDialog();
		}
	});

}

function initialiseScreen() {
	var group = sap.ui.getCore().byId("selDocGroup").getSelectedKey();
	var category = sap.ui.getCore().byId("selDocCategory").getSelectedKey();
	var createDMS = sap.ui.getCore().byId("App").getCurrentPage().getContent()[0];

	var rejectionDetails = sap.ui.getCore().byId("sfRejectionDetails");
	createDMS.addContent(rejectionDetails);

	if (sap.ui.getCore().byId("inRejectionDetails").getValue() === "") {
		rejectionDetails.setVisible(false);
	} else {
		rejectionDetails.setVisible(true);
	}

	if (group != "") {
		createDMS.addContent(sap.ui.getCore().byId("Classifications"));

		//If Work Order approval mandatory only show warning message
		var screenConfig = documentTemplate.getData().ABAP_JSON.SCREEN_CONFIG;

		if (screenConfig["WORK_ORDER_VIS"] === "AMO" && formType === "New") {
			sap.ui.getCore().byId("workOrderWarning").setVisible(true);
		} else {
			sap.ui.getCore().byId("workOrderWarning").setVisible(false);
		}

		//If object links allowed!
		if (objectLinksAllowed()) {
			createDMS.addContent(sap.ui.getCore().byId("objectLinks"));

			toggleObjectLinkVisibility("objectLinks.eQ", screenConfig.EQUIP_MASTER_VIS);
			toggleObjectLinkVisibility("objectLinks.Msn", screenConfig.EQUIP_MASTER_VIS);
			toggleObjectLinkVisibility("objectLinks.fL", screenConfig.FUNC_LOCATION_VIS);
			toggleObjectLinkVisibility("objectLinks.m", screenConfig.MATERIAL_MASTER_VIS);
			toggleObjectLinkVisibility("objectLinks.wO", screenConfig.WORK_ORDER_VIS);
			toggleObjectLinkVisibility("objectLinks.Bsd", screenConfig.WORK_ORDER_VIS);

			if (multipleObjectLinksAllowed())
				sap.ui.getCore().byId("olToolbar").setVisible(true);
			else
				sap.ui.getCore().byId("olToolbar").setVisible(false);

		} else {
			createDMS.removeContent(sap.ui.getCore().byId("objectLinks"));
		}

		//Add attachments to the items
		createDMS.addContent(attachmentsView);
		sap.ui.controller("dms.DMSAttachments").refreshAttachmentList();

		//Reset form error handling
		formHasErrors = false;

		//Set texts for mandatory fields
		setMandatoryFields();

	} else {
		//No Group selected yet, hide all content
		createDMS.removeContent(sap.ui.getCore().byId("Classifications"));
		createDMS.removeContent(sap.ui.getCore().byId("objectLinks"));
		createDMS.removeContent(attachmentsView);

	}

}

function createUploadForm(oController) {

	var inRejectionDetails = new sap.m.TextArea("inRejectionDetails", {
		width: "900px",
		rows: 4
	});
	inRejectionDetails.bindProperty("value", "/ABAP_JSON/DMS_DATA/STATUS_TEXT");
	inRejectionDetails.setEditable(false);
	inRejectionDetails.setModel(documentTemplate);

	var sfRejectionDetails = new sap.ui.layout.form.SimpleForm(
		"sfRejectionDetails", {
			layout: sap.ui.layout.form.SimpleFormLayout.ResponsiveGridLayout,
			editable: false,
			content: [
				new sap.ui.core.Title({
					text: "Rejection Reason"
				}),
				inRejectionDetails
			]
		});

	if (sap.ui.getCore().byId("selDocCategory") != undefined) {
		return sap.ui.getCore().byId("sf1");
	}

	var selDocCategory = new sap.m.Select("selDocCategory", {
		width: "400px",
		change: oController.categoryChanged
	});
	var selDocGroup = new sap.m.Select("selDocGroup", {
		width: "400px",
		change: oController.groupChanged,
		enabled: false
	});

	var oItemSelectTemplate = new sap.ui.core.Item({
		key: "{DDKEY}",
		text: "{TEXT}"
	});

	selDocCategory.setModel(documentTypes);
	selDocCategory.bindAggregation("items", "/ABAP_JSON/", oItemSelectTemplate);

	selDocGroup.setModel(documentGroups);
	selDocGroup.bindAggregation("items", "/ABAP_JSON/", oItemSelectTemplate);

	//Manufacturers name
	var inManuName = new sap.m.Input("MANU_NAME", {
		type: "Text",
		width: "400px",
		maxLength: 30
	});
	var lblManuName = new sap.m.Label("lblManuName", {
		text: "Manufacturer Name",
		width: "200px",
		labelFor: inManuName
	});
	inManuName.setModel(documentTemplate);
	inManuName.bindProperty("value", "/ABAP_JSON/DMS_DATA/MANU_NAME");
	inManuName.bindProperty("visible", "/ABAP_JSON/SCREEN_CONFIG/MANU_NAME_VIS", oController.formatVisibility);

	//Manufacturers serial number
	var inManuSN = new sap.m.Input("MANU_SERIAL", {
		type: "Text",
		width: "400px",
		maxLength: 30
	});
	var lblManuSN = new sap.m.Label("lblManuSN", {
		text: "Manufacturer S/N",
		width: "200px",
		labelFor: inManuSN
	});
	inManuSN.setModel(documentTemplate);
	inManuSN.bindProperty("value", "/ABAP_JSON/DMS_DATA/MANU_SERIAL");
	inManuSN.bindProperty("visible", "/ABAP_JSON/SCREEN_CONFIG/MANU_SERIAL_VIS", oController.formatVisibility);
	
	
	//Manufacturers Part Number 
	var inManuPartNum = new sap.m.Input("MANU_PART", {
		type: "Text",
		width: "400px",
		maxLength: 30
	});
	var lblManuPartNum = new sap.m.Label("lblManuNameNum", {
		text: "Manufacturer Part Number",
		width: "200px",
		labelFor: inManuPartNum
	});
	inManuPartNum.setModel(documentTemplate);
	inManuPartNum.bindProperty("value", "/ABAP_JSON/DMS_DATA/MANU_PART");
	inManuPartNum.bindProperty("visible", "/ABAP_JSON/SCREEN_CONFIG/MANU_PART_NUM_VIS", oController.formatVisibility);

	//Alert number
	var inAlertNum = new sap.m.Input("ALERT_NUMBER", {
		type: "Text",
		width: "400px",
		maxLength: 30
	});
	var lblAlertNum = new sap.m.Label("lblAlertNum", {
		text: "Alert Number",
		width: "200px",
		labelFor: inAlertNum
	});
	inAlertNum.setModel(documentTemplate);
	inAlertNum.bindProperty("value", "/ABAP_JSON/DMS_DATA/ALERT_NUMBER");
	inAlertNum.bindProperty("visible", "/ABAP_JSON/SCREEN_CONFIG/ALERT_NUMBER_VIS", oController.formatVisibility);

	//Certification authority
	var inCertAuth = new sap.m.Input("CERT_AUTH", {
		type: "Text",
		width: "400px",
		maxLength: 30
	});
	var lblCertAuth = new sap.m.Label("lblCertAuth", {
		text: "Certifiction Authority",
		width: "200px",
		labelFor: inCertAuth
	});
	inCertAuth.setModel(documentTemplate);
	inCertAuth.bindProperty("value", "/ABAP_JSON/DMS_DATA/CERT_AUTH");
	inCertAuth.bindProperty("visible", "/ABAP_JSON/SCREEN_CONFIG/CERT_AUTH_VIS", oController.formatVisibility);

	//Certification number
	var inCertNum = new sap.m.Input("CERT_NUM", {
		type: "Text",
		width: "400px",
		maxLength: 30
	});
	var lblCertNum = new sap.m.Label("lblCertNum", {
		text: "Certification Number",
		width: "200px",
		labelFor: inCertNum
	});
	inCertNum.setModel(documentTemplate);
	inCertNum.bindProperty("value", "/ABAP_JSON/DMS_DATA/CERT_NUM");
	inCertNum.bindProperty("visible", "/ABAP_JSON/SCREEN_CONFIG/CERT_NUM_VIS", oController.formatVisibility);

	//Additional description
	var inAddDesc = new sap.m.Input("ADD_DESCRIPTION", {
		type: "Text",
		width: "400px",
		maxLength: 30
	});
	var lblAddDesc = new sap.m.Label("lblAddDesc", {
		text: "Additional Description",
		width: "200px",
		labelFor: inAddDesc
	});
	inAddDesc.setModel(documentTemplate);
	inAddDesc.bindProperty("value", "/ABAP_JSON/DMS_DATA/ADD_DESCRIPTION");
	inAddDesc.bindProperty("visible", "/ABAP_JSON/SCREEN_CONFIG/ADD_DESCRIPTION_VIS", oController.formatVisibility);

	//Document date
	var dtDocDate = new sap.m.DateTimeInput("DOC_DATE", {
		type: "Date",
		width: "400px",
		change: oController.onDateChanged
	});

	//Stop users from being able to edit the date picker text!
	dtDocDate.addEventDelegate({
		"onAfterRendering": function () {
			jQuery('#DOC_DATE-Picker-inner').prop("readonly", true);
		}
	}, this);

	var lblDocDate = new sap.m.Label("lblDocDate", {
		text: "Document Date",
		width: "200px",
		labelFor: dtDocDate
	});
	dtDocDate.setValueFormat("yyyyMMdd");

	dtDocDate.setModel(documentTemplate);
	dtDocDate.bindProperty("value", "/ABAP_JSON/DMS_DATA/DOC_DATE");
	dtDocDate.bindProperty("visible", "/ABAP_JSON/SCREEN_CONFIG/DOC_DATE_VIS", oController.formatVisibility);

	//Document location
	var inDocLocation = new sap.m.Input("DOC_LOCATION", {
		type: "Text",
		width: "400px",
		maxLength: 30
	});
	var lblDocLocation = new sap.m.Label("lblDocLocation", {
		text: "Document Location",
		width: "200px",
		labelFor: inDocLocation
	});
	inDocLocation.setModel(documentTemplate);
	inDocLocation.bindProperty("value", "/ABAP_JSON/DMS_DATA/DOC_LOCATION");
	inDocLocation.bindProperty("visible", "/ABAP_JSON/SCREEN_CONFIG/DOC_LOCATION_VIS", oController.formatVisibility);

	var lblDocCategory = new sap.m.Label("lblDocCategory", {
		text: "Document Category *",
		width: "200px",
		labelFor: selDocCategory
	});
	var lblDocGroup = new sap.m.Label("lblDocGroup", {
		text: "Document Group *",
		width: "200px",
		labelFor: selDocGroup
	});

	var oSimpleForm = new sap.ui.layout.form.SimpleForm("uploadForm", {
		layout: sap.ui.layout.form.SimpleFormLayout.ResponsiveGridLayout,
		maxContainerCols: 6,
		content: [
			new sap.ui.layout.HorizontalLayout({
				allowWrapping: true,
				content: [
					new sap.ui.layout.VerticalLayout({
						width: "420px",
						content: [lblDocCategory, selDocCategory]
					}),
					new sap.ui.layout.VerticalLayout({
						width: "420px",
						content: [lblDocGroup, selDocGroup]
					})
				]

			})
		]
	});

	var classifications = new sap.ui.layout.form.SimpleForm("Classifications", {
		layout: sap.ui.layout.form.SimpleFormLayout.ResponsiveGridLayout,
		maxContainerCols: 6,
		content: [
			new sap.ui.core.Title({
				text: "Classifications"
			}),
			new sap.ui.layout.HorizontalLayout({
				allowWrapping: true,
				content: [
					new sap.ui.layout.VerticalLayout({
						width: "420px",
						content: [lblDocLocation, inDocLocation],
						visible: false
					}),
					new sap.ui.layout.VerticalLayout({
						width: "420px",
						content: [lblDocDate, dtDocDate],
						visible: false
					}),
					new sap.ui.layout.VerticalLayout("manuName", {
						width: "420px",
						content: [lblManuName, inManuName],
						visible: false
					}),
					new sap.ui.layout.VerticalLayout({
						width: "420px",
						content: [lblManuSN, inManuSN],
						visible: false
					}),
					new sap.ui.layout.VerticalLayout({
						width: "420px",
						content: [lblManuPartNum, inManuPartNum],
						visible: false
					}),
					new sap.ui.layout.VerticalLayout({
						width: "420px",
						content: [lblAlertNum, inAlertNum],
						visible: false
					}),
					new sap.ui.layout.VerticalLayout({
						width: "420px",
						content: [lblCertAuth, inCertAuth],
						visible: false
					}),
					new sap.ui.layout.VerticalLayout({
						width: "420px",
						content: [lblCertNum, inCertNum],
						visible: false
					}),
					new sap.ui.layout.VerticalLayout({
						width: "420px",
						content: [lblAddDesc, inAddDesc],
						visible: false
					}),
				]
			}),
		]
	});

	//Object links
	var table = new sap.m.Table("objectLinksTable", {
		mode: sap.m.ListMode.Delete,
		headerToolbar: new sap.m.Toolbar("olToolbar", {
			content: [new sap.m.Button({
				text: "Add Row",
				press: oController.addRow
			})]
		}),

		columns: [new sap.m.Column("objectLinks.wO", {
				header: new sap.m.Label("lblObjectLinks.wO", {
					text: "Work Order"
				}),
				width: "18%"
			}),

			new sap.m.Column("objectLinks.Bsd", {
				header: new sap.m.Label("lblObjectLinks.Bsd", {
					text: "Basic Start Date"
				}),
				minScreenWidth: sap.m.ScreenSize.Desktop,
				demandPopin: true,
				width: "10%"
			}),

			new sap.m.Column("objectLinks.eQ", {
				header: new sap.m.Label("lblObjectLinks.eQ", {
					text: "Equipment"
				}),
				width: "18%"
			}),

			new sap.m.Column("objectLinks.Msn", {
				header: new sap.m.Label("lblObjectLinks.Msn", {
					text: "Manuf. Ser. No"
				}),
				minScreenWidth: sap.m.ScreenSize.Desktop,
				demandPopin: true,
				width: "18%"
			}),

			new sap.m.Column("objectLinks.fL", {
				header: new sap.m.Label("lblObjectLinks.fL", {
					text: "Functional Location"
				}),
				width: "18%"
			}),
			new sap.m.Column("objectLinks.m", {
				header: new sap.m.Label("lblObjectLinks.m", {
					text: "Material"
				}),
				width: "18%"
			}),
		]
	});

	table.attachDelete(oController.deleteObjectLink);
	table.setModel(documentTemplate);
	objectLinksBindItems();

	var workOrderWarning = new sap.ui.layout.HorizontalLayout("workOrderWarning", {
		content: [new sap.ui.core.Icon({
				src: "sap-icon://message-warning",
				size: "15px"
			}),
			new sap.m.Label({
				text: "\u00A0\u00A0If possible please enter a work order",
				design: sap.m.LabelDesign.Bold
			})
		]
	});

	workOrderWarning.setVisible(false);

	var objectLinks = new sap.ui.layout.form.SimpleForm(
		"objectLinks", {
			layout: sap.ui.layout.form.SimpleFormLayout.ResponsiveGridLayout,
			maxContainerCols: 6,
			allowWrapping: true,
			content: [
				new sap.ui.core.Title({
					text: "Object Links"
				}),

				new sap.ui.layout.VerticalLayout({
					content: [workOrderWarning, table]
				})

			]
		});

}

function setUploadFormEnabled(enabled) {
	//Document settings
	sap.ui.getCore().byId("selDocCategory").setEnabled(enabled);
	sap.ui.getCore().byId("selDocGroup").setEnabled(enabled);

	//Attributes
	sap.ui.getCore().byId("MANU_NAME").setEnabled(enabled);
	sap.ui.getCore().byId("MANU_SERIAL").setEnabled(enabled);
	sap.ui.getCore().byId("ALERT_NUMBER").setEnabled(enabled);
	sap.ui.getCore().byId("CERT_AUTH").setEnabled(enabled);
	sap.ui.getCore().byId("CERT_NUM").setEnabled(enabled);
	sap.ui.getCore().byId("ADD_DESCRIPTION").setEnabled(enabled);
	sap.ui.getCore().byId("DOC_DATE").setEnabled(enabled);

	sap.ui.getCore().byId("DOC_LOCATION").setEnabled(enabled);

	//Fields inside table
	var rows = sap.ui.getCore().byId("objectLinksTable").getItems();

	var i;

	for (i = 0; i < rows.length; i++) {
		var columns = sap.ui.getCore().byId("objectLinksTable").getItems()[i].getCells();

		columns[0].getItems()[0].setEnabled(enabled);
		columns[2].getItems()[0].setEnabled(enabled);
		columns[4].getItems()[0].setEnabled(enabled);
		columns[5].getItems()[0].setEnabled(enabled);
	}

	sap.ui.getCore().byId("AddAttachemnt").setEnabled(enabled);

	if (enabled === false) {
		sap.ui.getCore().byId("attachmentList").setMode(sap.m.ListMode.Display);
		sap.ui.getCore().byId("objectLinksTable").setMode(sap.m.ListMode.Display);
	} else {
		sap.ui.getCore().byId("attachmentList").setMode(sap.m.ListMode.Delete);
		sap.ui.getCore().byId("objectLinksTable").setMode(sap.m.ListMode.Delete);
	}

}

function approveDMSForm() {
	validateForm();

	if (formHasErrors === true) {
		sap.m.MessageBox.alert(formErrors, null, "The following errors have occurred");
		return;
	}

	jQuery.ajax({
		async: true,
		type: 'POST',
		url: sap_system + "/kcad/cross_app/zdms_service/approve_form",
		data: {
			request_data: documentTemplate.getJSON()
		},

		beforeSend: function () {
			openBusyDialog("Approving DMS form");
		},

		success: function (data) {
			closeBusyDialog();

			var response = jQuery.parseJSON(data);
			var message = "";
			var errorFlag = false;

			var i = 0;

			for (i = 0; i < response.ABAP_JSON.MESSAGES.length; i++) {
				if (response.ABAP_JSON.MESSAGES[i].TYPE === "E")
					errorFlag = true;

				message += response.ABAP_JSON.MESSAGES[i].MESSAGE + '\n';

			}

			if (errorFlag === false) {
				sap.m.MessageToast.show(message);
				navigateHome();
			} else {
				sap.ui.commons.MessageBox.show("" + message,
					sap.ui.commons.MessageBox.Icon.ERROR, "DMS result\n"
				);
			}
		},

		error: function (jqXHR, textStatus, errorThrown) {
			closeBusyDialog();

			sap.ui.commons.MessageBox.show("Error Occurred when processing\n" + errorThrown + "\n",
				sap.ui.commons.MessageBox.Icon.ERROR,
				"Error occured when submitting form"
			);
		}

	});
}

function deleteDMSForm() {
	jQuery.ajax({
		async: true,
		type: 'POST',
		url: sap_system + "/kcad/cross_app/zdms_service/delete_form",
		data: {
			request_data: documentTemplate.getJSON()
		},

		beforeSend: function () {
			openBusyDialog("Deleting DMS form");
		},

		success: function (data) {
			closeBusyDialog();

			var response = jQuery.parseJSON(data);
			var message = "";
			var errorFlag = false;

			var i = 0;

			for (i = 0; i < response.ABAP_JSON.MESSAGES.length; i++) {
				if (response.ABAP_JSON.MESSAGES[i].TYPE === "E")
					errorFlag = true;

				message += response.ABAP_JSON.MESSAGES[i].MESSAGE + '\n';

			}

			if (errorFlag === false) {
				sap.m.MessageToast.show(message);
				navigateHome();
			} else {
				sap.ui.commons.MessageBox.show("" + message,
					sap.ui.commons.MessageBox.Icon.ERROR, "DMS result\n"
				);
			}
		},

		error: function (jqXHR, textStatus, errorThrown) {
			closeBusyDialog();

			sap.ui.commons.MessageBox.show("Error Occurred when processing\n" + errorThrown + "\n",
				sap.ui.commons.MessageBox.Icon.ERROR,
				"Error occured when submitting form"
			);
		}

	});
}

function rejectPressed() {
	var oDialog1 = sap.ui.getCore().byId("rejectDialog");

	if (oDialog1 === undefined || oDialog1 === null) {
		oDialog1 = new sap.m.Dialog("rejectDialog", {
			beginButton: new sap.m.Button({
				text: "Reject",
				press: function () {
					rejectDMSForm();
				}
			}),
			endButton: new sap.m.Button({
				text: "Cancel",
				press: function () {
					oDialog1.close();
				}
			}),
			content: [new sap.m.TextArea("rejectionReason", {
				rows: 4,
				width: "350px"
			})],
			title: "Reject DMS document"
		});
	} else {
		sap.ui.getCore().byId("rejectionReason").setValue("");
	}

	oDialog1.open();

}

function rejectDMSForm() {
	var DMS_ID = documentTemplate.getProperty("/ABAP_JSON/DMS_DATA/DMS_ID");
	var oDialog1 = sap.ui.getCore().byId("rejectDialog");

	//Exit if rejection reason not entered
	var rejectionReason = sap.ui.getCore().byId("rejectionReason");
	if (rejectionReason.getValue() === "") {
		return;
	}
	
	var rejectionReasonTxt = rejectionReason.getValue().replace(/(\n)+/g, ' ');

	oDialog1.close();

	//Reject the workitem
	jQuery.ajax({
		async: true,
		type: 'POST',
		url: sap_system + "/kcad/cross_app/zdms_service/reject_form?dms_id=" + DMS_ID + "&reject_reason=" + rejectionReasonTxt + "",
		data: {
			request_data: documentTemplate.getJSON()
		},

		beforeSend: function () {
			openBusyDialog("Rejecting DMS form");
		},

		success: function (data) {
			closeBusyDialog();
			var response = jQuery.parseJSON(data);
			var message = "";
			var errorFlag = false;

			var i = 0;

			for (i = 0; i < response.ABAP_JSON.MESSAGES.length; i++) {
				if (response.ABAP_JSON.MESSAGES[i].TYPE === "E")
					errorFlag = true;

				message += response.ABAP_JSON.MESSAGES[i].MESSAGE + '\n';

			}

			if (errorFlag === false) {
				sap.m.MessageToast.show(message);
				navigateHome();
			} else {
				sap.ui.commons.MessageBox.show("" + message,
					sap.ui.commons.MessageBox.Icon.ERROR, "DMS result\n"
				);
			}

		},

		error: function (jqXHR, textStatus, errorThrown) {
			closeBusyDialog();

			sap.ui.commons.MessageBox.show("Error Occurred when processing\n" + errorThrown + "\n",
				sap.ui.commons.MessageBox.Icon.ERROR,
				"Error occured when submitting form"
			);
		}
	});
}

function navigateHome() {
	var application = sap.ui.getCore().byId("App");
	application.to("dms.homepage");
}

function navigateTo(pageId) {
	jQuery.sap.history.addHistory("page", {});

	var application = sap.ui.getCore().byId("App");
	application.to(pageId);
}

function openNewDMSUploadForm() {
	formType = "New";
	setUploadFormEnabled(true);

	navigateTo("dms.uploadForm");

	var uploadForm = sap.ui.getCore().byId("uploadForm");
	var uploadFormPage = sap.ui.getCore().byId("dms.uploadFormPage");
	var submit = sap.ui.getCore().byId("submit");
	uploadFormPage.addContent(uploadForm);

	//	Make sure that everything is blank in model
	documentTemplate.setJSON("[]");

	//  Create Navbar

	uploadFormPage.setCustomHeader(sap.ui.getCore().byId("dmsNewFormBar"));

	sap.ui.getCore().byId("selDocCategory").setEnabled(true);
	sap.ui.getCore().byId("selDocGroup").setEnabled(true);

	sap.ui.getCore().byId("selDocGroup").setSelectedKey("");
	sap.ui.getCore().byId("selDocCategory").setSelectedKey("");

	hideClassificationsForm();
	uploadFormPage.removeContent(sap.ui.getCore().byId("objectLinks"));
	uploadFormPage.removeContent(attachmentsView);
	sap.ui.getCore().byId("attachmentList").destroyItems();
	//sap.ui.getCore().byId("attachmentList").removeAllItems();

}

function openWFDMSUploadForm() {
	formType = "Approve";
	setUploadFormEnabled(true);

	navigateTo("dms.uploadForm");

	var inbox = sap.ui.getCore().byId("inboxTable");
	var item_path = inbox.getSelectedItem().getBindingContext().sPath;

	var dms_id = inboxModel.getProperty(item_path).DMS_ID;

	var uploadForm = sap.ui.getCore().byId("uploadForm");
	var uploadFormPage = sap.ui.getCore().byId("dms.uploadFormPage");
	var approve = sap.ui.getCore().byId("WFApprove");
	var reject = sap.ui.getCore().byId("WFReject");

	uploadFormPage.addContent(uploadForm);

	//  Create Navbar
	uploadFormPage.setCustomHeader(sap.ui.getCore().byId("dmsWFBar"));

	//Initialise the models
	documentTemplate.loadData(sap_system + "/kcad/cross_app/zdms_service/load_dms_doc?dms_doc=" + dms_id, null, false, "POST");

	var group = documentTemplate.getData().ABAP_JSON.DMS_DATA.DOC_GROUP;
	var category = documentTemplate.getData().ABAP_JSON.DMS_DATA.DOC_TYPE;

	documentGroups.loadData(sap_system + "/kcad/cross_app/zdms_service/doc_groups?doc_type=" + category + "&sap-client=200", null, false,
		"POST");

	sap.ui.getCore().byId("selDocGroup").setSelectedKey(group);
	sap.ui.getCore().byId("selDocCategory").setSelectedKey(category);

	// Initialise the screen	
	sap.ui.getCore().byId("selDocCategory").setEnabled(false);
	sap.ui.getCore().byId("selDocGroup").setEnabled(false);

	initialiseScreen();
}

function openResubmitDMSUploadForm() {
	formType = "New";
	setUploadFormEnabled(true);

	navigateTo("dms.uploadForm");

	var inbox = sap.ui.getCore().byId("myDMSTable");
	//inbox.setSelectedItem(event.getParameter("listItem"), false);
	//var item_path = event.getParameter("listItem").getBindingContext().sPath;
	var item_path = inbox.getSelectedItem().getBindingContext().sPath;

	var dms_id = myDMSModel.getProperty(item_path).DMS_ID;

	var uploadForm = sap.ui.getCore().byId("uploadForm");
	var uploadFormPage = sap.ui.getCore().byId("dms.uploadFormPage");
	var approve = sap.ui.getCore().byId("WFApprove");
	var reject = sap.ui.getCore().byId("WFReject");

	uploadFormPage.addContent(uploadForm);

	//  Create Navbar
	uploadFormPage.setCustomHeader(sap.ui.getCore().byId("dmsResumitBar"));

	//Initialise the models
	documentTemplate.loadData(sap_system + "/kcad/cross_app/zdms_service/load_dms_doc?dms_doc=" + dms_id, null, false, "POST");

	var group = documentTemplate.getData().ABAP_JSON.DMS_DATA.DOC_GROUP;
	var category = documentTemplate.getData().ABAP_JSON.DMS_DATA.DOC_TYPE;

	documentGroups.loadData(sap_system + "/kcad/cross_app/zdms_service/doc_groups?doc_type=" + category + "&sap-client=200", null, false,
		"POST");

	sap.ui.getCore().byId("selDocGroup").setSelectedKey(group);
	sap.ui.getCore().byId("selDocCategory").setSelectedKey(category);

	// Initialise the screen	
	sap.ui.getCore().byId("selDocCategory").setEnabled(false);
	sap.ui.getCore().byId("selDocGroup").setEnabled(false);

	initialiseScreen();
	setUploadFormEnabled(true);
}

function displayDMSUploadForm(dms_id) {
	navigateTo("dms.uploadForm");

	var uploadForm = sap.ui.getCore().byId("uploadForm");
	var uploadFormPage = sap.ui.getCore().byId("dms.uploadFormPage");

	uploadFormPage.addContent(uploadForm);

	//  Create Navbar
	uploadFormPage.setCustomHeader(sap.ui.getCore().byId("dmsViewBar"));

	//Initialise the models
	documentTemplate.loadData(sap_system + "/kcad/cross_app/zdms_service/load_dms_doc?dms_doc=" + dms_id, null, false, "POST");

	var group = documentTemplate.getData().ABAP_JSON.DMS_DATA.DOC_GROUP;
	var category = documentTemplate.getData().ABAP_JSON.DMS_DATA.DOC_TYPE;

	documentGroups.loadData(sap_system + "/kcad/cross_app/zdms_service/doc_groups?doc_type=" + category + "&sap-client=200", null, false,
		"POST");

	sap.ui.getCore().byId("selDocGroup").setSelectedKey(group);
	sap.ui.getCore().byId("selDocCategory").setSelectedKey(category);

	// Initialise the screen	
	initialiseScreen();

	setUploadFormEnabled(false);
}

function submitNewDMSForm() {
	validateForm();

	if (formHasErrors === false) {
		submitForm();
	} else {
		sap.m.MessageBox.alert(formErrors, null, "The following errors have occurred");
	}
}

function objectLinkInput(valueBinding, textBinding, changeFunction, maxLength, width, editablePath, handleValueHelp) {
	var aContent = [];

	var valueField = new sap.m.Input({
		value: valueBinding,
		type: "Text",
		change: changeFunction,
		maxLength: maxLength,

		editable: {
			path: editablePath,
			formatter: function (value) {
				if (value === 'D' || value === 'MD')
					return false;

				return true;
			}
		}
	});

	aContent.push(valueField);

	if (handleValueHelp !== undefined) {
		valueField.setShowValueHelp(true);
		valueField.attachValueHelpRequest(handleValueHelp);
	}

	if (textBinding) {
		var textField = new sap.m.Text({
			text: textBinding
		});

		aContent.push(textField);
	}

	return new sap.m.FlexBox({
		direction: "Column",
		items: aContent
	});

}

function objectLinkText(valueBinding, maxLength, width) {

	var valueField = new sap.m.Input({
		value: valueBinding,
		type: "Text",
		maxLength: maxLength,
		editable: false
	});

	return valueField;
}

function objectLinkDate(valueBinding, width) {
	var aContent = [];
	var valueField = new sap.m.Input({
		value: {
			path: valueBinding,
			type: 'sap.ui.model.odata.type.Date',
			formatOptions: {
				style: 'medium'
			}
		},
		editable: false,
		width: width
	});

	aContent.push(valueField);

	return new sap.m.FlexBox({
		direction: "Column",
		items: aContent
	});

}

function objectLinksBindItems() {
	var oController = sap.ui.controller("dms.DMSUploadForm");

	var oTable = sap.ui.getCore().byId("objectLinksTable");

	oTable.bindItems("/ABAP_JSON/OBJECT_LINKS",
		new sap.m.ColumnListItem({
			cells: [objectLinkInput("{WORK_ORDER}", "{WORK_ORDER_TXT}", oController.workOrderChanged, 12, "200px",
					"/ABAP_JSON/SCREEN_CONFIG/WORK_ORDER_VIS/", oController.workOrderValueHelp),

				objectLinkDate("START_DATE", "120px"),

				objectLinkInput("{EQUIPMENT}", "{EQUIPMENT_TXT}", oController.equipmentChanged, 18, "200px",
					"/ABAP_JSON/SCREEN_CONFIG/EQUIP_MASTER_VIS/",
					oController.equipmentValueHelp),

				objectLinkText("{MANU_SER_NO}", 30, "280px"),

				objectLinkInput("{FUNC_LOCATION}", "{FUNC_LOCATION_TXT}", oController.functionalLocationChanged, 30, "280px",
					"/ABAP_JSON/SCREEN_CONFIG/FUNC_LOCATION_VIS/"),

				objectLinkInput("{MATERIAL}", "{MATERIAL_TXT}", oController.materialChanged, 18, "200px",
					"/ABAP_JSON/SCREEN_CONFIG/MATERIAL_MASTER_VIS/")
			]
		})
	);

}

function openBusyDialog(text) {
	var dialog = sap.ui.getCore().byId("busyDialog");

	if (dialog === null || dialog === undefined) {
		dialog = new sap.m.BusyDialog("busyDialog");
	}

	dialog.setText(text);
	dialog.open();
}

function closeBusyDialog() {
	var dialog = sap.ui.getCore().byId("busyDialog");

	if (dialog != null || dialog != undefined) {
		dialog.close();
	}
}

jQuery.sap.require("jquery.sap.history");

var historyDefaultHandler = function (navType) {
	var application = sap.ui.getCore().byId("App");

	if (navType === jQuery.sap.history.NavType.Back) {
		application.back();
	} else {
		jQuery.sap.history.back();
	}
};

var historyPageHandler = function (params, navType) {
	var application = sap.ui.getCore().byId("App");
	if (navType === jQuery.sap.history.NavType.Back) {
		application.back();
	} else {
		jQuery.sap.history.back();
	}
};

jQuery.sap.history({
	routes: [{
		// This handler is executed when you navigate back to the history state on the path "page"
		path: "page",
		handler: jQuery.proxy(historyPageHandler, this)
	}],
	// The default handler is executed when you navigate back to the history state with an empty hash
	defaultHandler: jQuery.proxy(historyDefaultHandler, this)
});

function navHandler(channelId, eventId, data) {
	if (eventId === "to") {
		if (!data.id) {
			jQuery.sap.log.error("'nav to' event cannot be processed. data.id must be given");
		}
	}
}

function closeBrowserWindow() {
	if (document.all) {
		// IE clears HTTP Authentication
		document.execCommand("ClearAuthenticationCache");
	} else {
		jQuery.ajax({
			url: '<%:Url.Action("LogOff401", new { id = random })%>',
			type: 'POST',
			username: '<%:random%>',
			password: '<%:random%>',
			success: function () {
				alert('logged off');
			}
		});
	}

	window.location.href = 'http://www.kcadeutag.com';
}

function updateTechObjectsFromWO(field, response) {
	var path = field.getBindingContext().getPath();
	field.setValueState(sap.ui.core.ValueState.Success);

	documentTemplate.setProperty(path + "/START_DATE", response.ABAP_JSON.START_DATE);

	//Set the fields next door to the work order
	if (documentTemplate.getData().ABAP_JSON.SCREEN_CONFIG.FUNC_LOCATION_VIS != "" && (sap.ui.getCore().byId("selDocGroup").getSelectedKey() !=
			"EA")) {
		documentTemplate.setProperty(path + "/FUNC_LOCATION", response.ABAP_JSON.FUNCT_LOC);
		documentTemplate.setProperty(path + "/FUNC_LOCATION_TXT", response.ABAP_JSON.FUNCT_LOC_TXT);
	}
	if (documentTemplate.getData().ABAP_JSON.SCREEN_CONFIG.EQUIP_MASTER_VIS != "") {
		documentTemplate.setProperty(path + "/EQUIPMENT", response.ABAP_JSON.EQUIPMENT);
		documentTemplate.setProperty(path + "/EQUIPMENT_TXT", response.ABAP_JSON.EQUIPMENT_TXT);
		documentTemplate.setProperty(path + "/MANU_SER_NO", response.ABAP_JSON.MANU_SER_NO);
	}

	if (documentTemplate.getData().ABAP_JSON.SCREEN_CONFIG.MATERIAL_MASTER_VIS != "") {
		documentTemplate.setProperty(path + "/MATERIAL", response.ABAP_JSON.MATERIAL);
		documentTemplate.setProperty(path + "/MATERIAL_TXT", response.ABAP_JSON.MATERIAL_TXT);

	}

	documentTemplate.setProperty(path + "/WORK_ORDER_TXT", response.ABAP_JSON.WORK_ORDER_TXT);
}

function searchHelpFilterSearch(searchHelpId) {
	var oSelectDialog = sap.ui.getCore().byId(searchHelpId);

	oSelectDialog.setBusy(true);

	var filterBar = oSelectDialog.getFilterBar();
	var filters = filterBar.getFilters();

	var entitySet = filterBar.getEntityType() + "Set";
	var basicSearchControl = filterBar.getBasicSearchControl();

	if (basicSearchControl !== undefined) {
		var basicSearchValue = basicSearchControl.getValue();
		var searchFieldName = filterBar.getBasicSearchFieldName();

		if (basicSearchValue !== "") {
			filters.push(new sap.ui.model.Filter(searchFieldName, sap.ui.model.FilterOperator.EQ, basicSearchValue));
		}
	}

	//Contact Gateway for data!
	var oModel = searchModel;

	oModel.read(entitySet, {
		filters: filters,
		async: false,
		success: function (oData, oResponse) {
			var oRowsModel = new sap.ui.model.json.JSONModel();
			oRowsModel.setData(oData.results);

			if (oRowsModel.getData().length === 0) {
				//oSelectDialog.setNoDataText("No Items Found");
			}

			if (oSelectDialog.getTable == null) {
				oSelectDialog.theTable.setModel(oRowsModel);
				oSelectDialog.theTable.bindRows("/");
			} else {
				oSelectDialog.getTable().setModel(oRowsModel);
				oSelectDialog.getTable().bindRows("/");
			}

			oSelectDialog.setBusy(false);
		},
		error: function () {
			oSelectDialog.setBusy(false);
		}

	});
}

function createHelpDialog(id, oSearchField, oColumnModel, title, tokenKey, descriptionKey, filterBar, field) {
	var oSelectDialog = new sap.ui.comp.valuehelpdialog.ValueHelpDialog(id, {
		key: tokenKey,
		//descriptionKey: descriptionKey,
		title: title,
		supportMultiselect: false,
		noDataText: "",
		confirm: function (event) {
			oSelectDialog.close();
		},

		ok: function (event) {
			oSelectDialog.close();
			var tokens = event.getParameter("tokens");

			var newValue = tokens[tokens.length - 1].getKey();

			field.setValue(newValue);
			field.fireChange({
				newValue: newValue
			});

			oSelectDialog.destroy();
		},

		cancel: function (event) {
			oSelectDialog.close();
			oSelectDialog.destroy();
		},

		search: function (event) {
			oSelectDialog.close();
		}
	});

	if (oSelectDialog.getTable == null) {
		oSelectDialog.theTable.setModel(oColumnModel, "columns");
		oSelectDialog.theTable.bindRows("/");
	} else {
		oSelectDialog.getTable().setModel(oColumnModel, "columns");
		oSelectDialog.getTable().bindRows("/");
	}


	if (filterBar != null) {
		oSelectDialog.setFilterBar(filterBar);
	}

	return oSelectDialog;
}

function buildFilterSearchTerm(fieldname, data) {
	if (data.getValue) {
		if (data.getValue() === "") {
			return "";
		}
		return " and " + fieldname + " eq '*" + data.getValue() + "*'";
	}

	return "";
}