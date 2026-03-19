sap.ui.jsview("dms.DMSInbox", {

	/** Specifies the Controller belonging to this View. 
	* In the case that it is not implemented, or that "null" is returned, this View does not have a Controller.
	* @memberOf dms.DMSInbox
	*/ 
	getControllerName : function() {
		return "dms.DMSInbox";
	},

	/** Is initially called once after the Controller has been instantiated. It is the place where the UI is constructed. 
	* Since the Controller is given to this method, its event handlers can be attached right away. 
	* @memberOf dms.DMSInbox
	*/ 
	createContent : function(oController) {
		var table = new sap.m.Table("inboxTable", {
			mode: sap.m.ListMode.SingleSelectMaster,
			select: oController.processItem,
            columns : [ new sap.m.Column( {header : new sap.m.Label({ text : "Originator" })}),
                        new sap.m.Column( {header : new sap.m.Label({ text : "Document Type" })}),
                        new sap.m.Column( {header : new sap.m.Label({ text : "Document Group" })}),
                        new sap.m.Column( {header : new sap.m.Label({ text : "Additional Description" })}),
                        new sap.m.Column( {header : new sap.m.Label({ text : "Document Location" })}),
                        new sap.m.Column( {header : new sap.m.Label({ text : "Document Date" })}),
                        new sap.m.Column( {header : new sap.m.Label({ text : "Functional Location" })}),
                        new sap.m.Column( {header : new sap.m.Label({ text : "Equipment" })}),
                        new sap.m.Column( {header : new sap.m.Label({ text : "Material" })}),
                        new sap.m.Column( {header : new sap.m.Label({ text : "Work Order" })}),
                        new sap.m.Column( {header : new sap.m.Label({ text : "Workflow ID" })}),
            ]});
		
	    table.bindAggregation("items", {
	        path: "/ABAP_JSON/ITEMS/",
	        template: new sap.m.ColumnListItem({
	            cells: [
                        new sap.m.Label({ text: "{ORIGINATOR}" }),
	                    new sap.m.Label({ text: "{DOC_TYPE}" }),
	                    new sap.m.Label({ text: "{DOC_GROUP}" }),
	                    new sap.m.Label({ text: "{ADD_DESCRIPTION}" }),
	                    new sap.m.Label({ text: "{DOC_LOCATION}" }),	                    
	                    new sap.m.Label({ text: "{DOC_DATE}" }),
	                    new sap.m.Label({ text: "{FUNC_LOCATION}" }),
	                    new sap.m.Label({ text: "{EQUIP_MASTER}" }),
	                    new sap.m.Label({ text: "{MATERIAL_MASTER}" }),
	                    new sap.m.Label({ text: "{WORK_ORDER}" }),
	                    new sap.m.Label({ text: "{WF_ID}" }),
	            ]
	        })
	    });
		
	    table.setModel(inboxModel);
		
	    var page = new sap.m.Page("dms.inboxPage", {title:"DMS Approval Inbox",id:"InboxPage", enableScrolling: false});
      	
    	var scroll = new sap.m.ScrollContainer({
  		  width : "100%",
  		  height: "100%",
  		  vertical :true
  		});
  	
  	    scroll.addContent(table);
  	    page.addContent(scroll);
    	
    	return page;
	}

});