sap.ui.jsview("dms.DMSAttachments", {

	/** Specifies the Controller belonging to this View. 
	* In the case that it is not implemented, or that "null" is returned, this View does not have a Controller.
	* @memberOf dms.DMSAttachments
	*/ 
	getControllerName : function() {
		return "dms.DMSAttachments";
	},

	/** Is initially called once after the Controller has been instantiated. It is the place where the UI is constructed. 
	* Since the Controller is given to this method, its event handlers can be attached right away. 
	* @memberOf dms.DMSAttachments
	*/ 
	createContent : function(oController) {
		var attachmentList = new sap.m.List("attachmentList", { inset : false, mode: sap.m.ListMode.Delete,
			headerToolbar: new sap.m.Toolbar({ content: [ new sap.m.Button("AddAttachemnt", {text: "Add Attachment", press: oController.addAttachment})]})                                  
		});
		
		attachmentList.attachDelete(oController.deleteAttachment);
		
		var itemTemplate = new sap.m.StandardListItem();
		attachmentList.insertItem(itemTemplate, 9999);
		
		
		var attachments = new sap.ui.layout.form.SimpleForm(
				"attachments",
				{
					layout:  sap.ui.layout.form.SimpleFormLayout.ResponsiveGridLayout,
					maxContainerCols: 6,
					content:[ new sap.ui.core.Title({text:"Attachments"}), 
					          attachmentList
					]});
		
	
 		return attachments;
	}

});