oApplication = { // Application is an object  
	views: {}, // Application views  
	load: function (src, id, libs, theme, callback) {
		var opts = {
			length: 12, // The length of each line  
			width: 4, // The line thickness  
			radius: 12, // The radius of the inner circle  
		};
		var target = document.getElementById('content');
		this.spinner = new Spinner(opts).spin(target);
		setTimeout(this.loadSAPUI5(src, id, libs, theme, callback));
	},
	loadSAPUI5: function (src, id, libs, theme, callback) {
		var s, r, t;
		r = false;
		s = document.createElement('script');
		s.type = 'text/javascript';
		s.src = src;
		s.id = id;
		s.setAttribute("data-sap-ui-libs", libs);
		s.setAttribute("data-sap-ui-theme", theme);
		s.onload = s.onreadystatechange = function () {
			//console.log( this.readyState ); //uncomment this line to see which ready states are called.  
			if (!r && (!this.readyState || this.readyState == 'complete')) {
				r = true;
				callback();
			}
		};
		t = document.getElementsByTagName('script')[0];
		t.parentElement.insertBefore(s, t);
	},
	onSAPUI5Loaded: function () {
		oApplication.initializeUI5();
		$("body").fadeOut("slow", function () {
			$("#content").empty();
			$("#content").removeAttr('style');
			oApplication.app.placeAt("content");
			$(this).fadeIn("slow");
		});
	},
	initializeUI5: function () {
		var oApp = new sap.m.App("mApp");
		var oPage = new sap.m.Page({
			id: "mPage", // sap.ui.core.ID  
			title: "Mobile page", // string  
			showFooter: false, // boolean, since 1.13.1  
		});
		var oContent = new sap.m.ObjectHeader({
			id: "mObjHeader", // sap.ui.core.ID  
			title: "Title", // string  
			number: "250", // string  
			numberUnit: "EUR", // string  
			markFavorite: true, // boolean, since 1.16.0  
			markFlagged: true, // boolean, since 1.16.0  
			showMarkers: true, // boolean, since 1.16.0  
			attributes: [new sap.m.ObjectAttribute({
				id: "mAttribute", // sap.ui.core.ID  
				visible: true, // boolean  
				text: "This is a test attribute of ObjectHeader", // string  
			})], // sap.m.ObjectAttribute  
		});
		oPage.addContent(oContent);
		oApp.addPage(oPage);
		this.app = oApp;
	}
}