sap.ui.jsview("dms.DMSUploadForm", {

	/** Specifies the Controller belonging to this View. 
	* In the case that it is not implemented, or that "null" is returned, this View does not have a Controller.
	* @memberOf dms.DMSUploadForm
	*/ 
	getControllerName : function() {
		return "dms.DMSUploadForm";
	},
  
	
	/** Is initially called once after the Controller has been instantiated. It is the place where the UI is constructed. 
	* Since the Controller is given to this method, its event handlers can be attached right away. 
	* @memberOf dms.DMSUploadForm
	*/ 
	createContent : function(oController) {
		documentTypes.loadData(sap_system + "/kcad/cross_app/zdms_service/doc_types?sap-client=200", null, false, "POST");
		
		var submit  = new sap.m.Button("submit", {text: "Submit", press: oController.submit});		
		var approve = new sap.m.Button("WFApprove", {text: "Approve", press: oController.submit});
		var reject  = new sap.m.Button("WFReject", {text: "Reject", press: oController.submit});
		var resubmit  = new sap.m.Button("resubmit", {text: "Resubmit", press: oController.submit});
		var deleteDMS  = new sap.m.Button("deleteDMS", {text: "Delete", press: oController.submit});
		
		var Bar1 = new sap.m.Bar("dmsNewFormBar",{ contentLeft: [],	
			  contentMiddle: [new sap.m.Label( {text: "Create New DMS Document"})],
			  contentRight: [ submit ]
	    });
		
		var Bar2 = new sap.m.Bar("dmsWFBar", { contentLeft: [],	
			  contentMiddle: [new sap.m.Label('BarTitle', {text: "Approve DMS Request"})],
			  contentRight: [ approve, reject ]
        });
		
		var Bar3 = new sap.m.Bar("dmsViewBar", { contentLeft: [],	
			  contentMiddle: [new sap.m.Label('BarTitleView', {text: "View My DMS Request"})]
      });
      
      		var Bar4 = new sap.m.Bar("dmsResumitBar", { contentLeft: [],	
			  contentMiddle: [new sap.m.Label('BarTitleResubmit', {text: "Resubmit DMS Request"})],
			  contentRight: [ deleteDMS, resubmit ]
      });
		
		uploadForm = createUploadForm(oController);
		
 		var page =  new sap.m.Page("dms.uploadFormPage", { content: [ uploadForm ]});



 		return page;
	}

});