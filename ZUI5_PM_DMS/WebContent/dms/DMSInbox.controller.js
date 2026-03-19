sap.ui.controller("dms.DMSInbox", {

/**
* Called when a controller is instantiated and its View controls (if available) are already created.
* Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
* @memberOf dms.DMSInbox
*/
	onInit: function() {
		 this.getView().addDelegate({ onBeforeShow: this.initialisePage });
	},

/**
* Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
* (NOT before the first rendering! onInit() is used for that one!).
* @memberOf dms.DMSInbox
*/
	onBeforeRendering: function() {
		
	},

/**
* Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
* This hook is the same one that SAPUI5 controls get after being rendered.
* @memberOf dms.DMSInbox
*/
	onAfterRendering: function() {
		
		
	},
	
/**
 * Called before the view is shown
 * Load up data for inbox
 */	
	initialisePage: function(event){
	   inboxModel.loadData(sap_system + "/kcad/cross_app/zdms_service/get_work_items", null, false, "POST");
    },
/**
* Called when the Controller is destroyed. Use this one to free resources and finalize activities.
* @memberOf dms.DMSInbox
*/
	onExit: function() {

	},
	
	processItem: function(event){					
		openWFDMSUploadForm();
		
		var table = event.getSource();
		var selectedItem = table.getSelectedItem();
		table.setSelectedItem(selectedItem, false);
		
	}

});