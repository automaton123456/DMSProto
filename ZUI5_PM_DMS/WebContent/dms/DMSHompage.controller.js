sap.ui.controller("dms.DMSHompage", {

/**
* Called when a controller is instantiated and its View controls (if available) are already created.
* Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
* @memberOf dms.DMSHompage
*/
	onInit: function() {
		 this.getView().addDelegate({ onBeforeShow: this.initialisePage });
	},

	
   /**
   * Called before the view is shown
   * Load up data for inbox
   */	
	initialisePage: function(event){
		tileData.loadData(sap_system + "/kcad/cross_app/zdms_service/get_tile_data", null, false, "POST");
  },

/**
* Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
* (NOT before the first rendering! onInit() is used for that one!).
* @memberOf dms.DMSHompage
*/
	onBeforeRendering: function() {

	},

/**
* Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
* This hook is the same one that SAPUI5 controls get after being rendered.
* @memberOf dms.DMSHompage
*/
	onAfterRendering: function() {
		
	},

/**
* Called when the Controller is destroyed. Use this one to free resources and finalize activities.
* @memberOf dms.DMSHompage
*/
//	onExit: function() {
//
//	}
	
	handleTilePress: function(event){
		
	    if(event.getParameter("id") == "newDMSTile"){
	    	openNewDMSUploadForm();
	    	
	    } else if(event.getParameter("id") == "inboxDMSTile"){
	    	navigateTo("dms.inbox");
	    	
	    } else if(event.getParameter("id") == "inboxMyDMSTile"){
	    	navigateTo("dms.myDMSForms");
	    }
	},
	
	logout: function(){
		$.ajax({  
	        type: "GET",  
	        url: "/sap/public/bc/icf/logoff"  //Clear SSO cookies: SAP Provided service to do that  
	     }).done(function(data){ //Now clear the authentication header stored in the browser  
	                         if (!document.execCommand("ClearAuthenticationCache")) {  
	                              //"ClearAuthenticationCache" will work only for IE. Below code for other browsers  
	                              $.ajax({  
	                                            type: "GET",  
	                                            url: "/zmoc/", //any URL to a Gateway service  
	                                            username: 'dummy', //dummy credentials: when request fails, will clear the authentication header  
	                                            password: 'dummy',  
	                                            statusCode: { 401: function() {  
	                                                      //This empty handler function will prevent authentication pop-up in chrome/firefox  
	                                            	//alert('Logged out successfully'); 
	                                            } },  
	                                            error: function() {  
	                                                 //alert('reached error of wrong username password');  
	                                            	window.location.href("http://www.kcadeutag.com");
	                                            }  
	                             });  
	                         } else {
	                        	 window.location.replace("http://www.kcadeutag.com");
	                         } 
	     })  	
	 }
});