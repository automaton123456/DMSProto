sap.ui.controller("dms.DMSMyDMSForms", {

/**
* Called when a controller is instantiated and its View controls (if available) are already created.
* Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
* @memberOf dms.DMSMyDMSForms
*/
	onInit: function() {
       this.getView().addDelegate({ onBeforeShow: this.initialisePage });
	},
	
	
	initialisePage: function(event){
	   myDMSModel.loadData(sap_system + "/kcad/cross_app/zdms_service/get_my_dms", null, false, "POST");
	},
	
	processItem: function(event){
		var inbox = sap.ui.getCore().byId("myDMSTable");
		var item_path = inbox.getSelectedItem().getBindingContext().sPath;
		
		var dms_id = myDMSModel.getProperty(item_path).DMS_ID;
		var dms_status = myDMSModel.getProperty(item_path).STATUS;
		
		
		if (dms_status === 'Rejected'){
			openResubmitDMSUploadForm(dms_id);
		} else {
			displayDMSUploadForm(dms_id);
		}
		
		
		
		
		var table = event.getSource();
		var selectedItem = table.getSelectedItem();
		table.setSelectedItem(selectedItem, false);
		
	}

/**
* Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
* (NOT before the first rendering! onInit() is used for that one!).
* @memberOf dms.DMSMyDMSForms
*/
//	onBeforeRendering: function() {
//
//	},

/**
* Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
* This hook is the same one that SAPUI5 controls get after being rendered.
* @memberOf dms.DMSMyDMSForms
*/
//	onAfterRendering: function() {
//
//	},

/**
* Called when the Controller is destroyed. Use this one to free resources and finalize activities.
* @memberOf dms.DMSMyDMSForms
*/
//	onExit: function() {
//
//	}

});