sap.ui.jsview("dms.DMSHompage", {

	/** Specifies the Controller belonging to this View. 
	* In the case that it is not implemented, or that "null" is returned, this View does not have a Controller.
	* @memberOf dms.DMSHompage
	*/ 
	getControllerName : function() {
		return "dms.DMSHompage";
	},
	
	
	/** Is initially called once after the Controller has been instantiated. It is the place where the UI is constructed. 
	* Since the Controller is given to this method, its event handlers can be attached right away. 
	* @memberOf dms.DMSHompage
	*/ 
	createContent : function(oController) {
		var oContainer = new sap.m.TileContainer("tileContainer"); 
		
		//Create new DMS form
		var newDMSTile = new sap.m.StandardTile("newDMSTile", {
			icon : sap.ui.core.IconPool.getIconURI("create"),
			title : "Create DMS Document",
			press : oController.handleTilePress
		});  
		      
		//All DMS's to be approved by me
		 var inboxDMSTile = new sap.m.StandardTile("inboxDMSTile", {
			 icon : sap.ui.core.IconPool.getIconURI("inbox"),
			 number : "{/ABAP_JSON/INBOX_COUNT}",
			 numberUnit : "Items",
			 title : "DMS Inbox",
			 press : oController.handleTilePress
		});
		 
		 
		//My DMS documents in progress
		 var inboxMyDMSTile = new sap.m.StandardTile("inboxMyDMSTile", {
			 icon : sap.ui.core.IconPool.getIconURI("inbox"),
			 number : "{/ABAP_JSON/MY_DMS_COUNT}",
			 numberUnit : "Items",
			 title : "My DMS Forms",
			 press : oController.handleTilePress
		});		 
		
		 
		oContainer.addTile(newDMSTile);
		oContainer.addTile(inboxDMSTile);
		oContainer.addTile(inboxMyDMSTile);
		        
		inboxDMSTile.setModel(tileData);
		inboxMyDMSTile.setModel(tileData);
		var width  = $( window ).width();
		var height = $( window ).height();
		 
		
		var logout = new sap.m.Button("logout", {press: oController.logout, icon: sap.ui.core.IconPool.getIconURI("unlocked")});
		
		var homepageNavBar = new sap.m.Bar("HomepageBar", { contentLeft: [],	
			  contentMiddle: [new sap.m.Label('HomepageBarTitle', {text: "E&M Document Management System"})],
			  contentRight: [ logout ]
      });
    
		var page = new sap.m.Page({id:"Homepage", enableScrolling: false});
		page.addContent(oContainer);
		page.setCustomHeader(homepageNavBar);
		    	   	  
		return page; 
	}

});