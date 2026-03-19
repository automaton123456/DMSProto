sap.ui.controller("dms.DMSAttachments", {

/**
* Called when a controller is instantiated and its View controls (if available) are already created.
* Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
* @memberOf dms.DMSAttachments
*/
  onInit: function() {
    this.getView().addDelegate({ onBeforeShow: this.initialisePage });
  },

/**
* Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
* (NOT before the first rendering! onInit() is used for that one!).
* @memberOf dms.DMSAttachments
*/
//  onBeforeRendering: function() {
//
//  },

/**
* Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
* This hook is the same one that SAPUI5 controls get after being rendered.
* @memberOf dms.DMSAttachments
*/
//  onAfterRendering: function() {
//
//  },

/**
* Called when the Controller is destroyed. Use this one to free resources and finalize activities.
* @memberOf dms.DMSAttachments
*/
//  onExit: function() {
//
//  }

  /**
   * Called before the view is shown
   * Load up data for inbox
   */
    initialisePage: function(event){
      this.refreshAttachmentList();
  },

  addAttachment: function(event){
    var DMS_ID = documentTemplate.getProperty("/ABAP_JSON/DMS_DATA/DMS_ID");
    var oDialog1 = sap.ui.getCore().byId("uploadDialog");

    if(oDialog1 == undefined || oDialog1 == null){
       oDialog1 = new sap.m.Dialog("uploadDialog",
           { beginButton: new sap.m.Button({text: "OK",
              press: function(){
                var oSimpleFileUploader = sap.ui.getCore().byId("fileUploader");

                if(oSimpleFileUploader.getValue() == "" )
                   return;
                            oSimpleFileUploader.upload();
                            openBusyDialog("Uploading file");
              oDialog1.close();
                oSimpleFileUploader.setValue("");
                oSimpleFileUploader.oFilePath.setValue("");
                }
             }),

                 endButton: new sap.m.Button({text: "Cancel", press:function(){oDialog1.close();}})

           }

           );
       oDialog1.setTitle("Add Attachment");

       jQuery.sap.require("sap.ui.commons.FileUploader");

       var controller = sap.ui.getCore().byId("dms.DMSAttachments").getController();


       oSimpleFileUploader = new sap.ui.commons.FileUploader("fileUploader", {
                  width: "600px",
                  uploadUrl : sap_system + "/kcad/cross_app/zui5_files/add?guid=" + DMS_ID + "&process_name=DMS&misc=DMS",
                  name: "fileUploader",
                  uploadOnChange: false,
                  sendXHR: true,
                  uploadComplete: controller.checkUploadForError
        });


    oDialog1.addContent(oSimpleFileUploader);


    oDialog1.addContent();

    } else {
        oSimpleFileUploader.setUploadUrl(sap_system + "/kcad/cross_app/zui5_files/add?guid=" + DMS_ID + "&process_name=DMS&misc=DMS");
    }


      oDialog1.open();
  },

  checkUploadForError: function(oEvent){
    var controller = sap.ui.getCore().byId("dms.DMSAttachments").getController();

    if(oEvent.getParameter("status") === 500){
      sap.m.MessageBox.error(oEvent.getParameter("responseRaw"), {
        title: "File Upload Failed"
      });

      closeBusyDialog();

    } else {
        controller.refreshAttachmentList();
    }
  },

  refreshAttachmentList: function(){
    closeBusyDialog();

    var DMS_ID = documentTemplate.getProperty("/ABAP_JSON/DMS_DATA/DMS_ID");
    attachmentsModel.loadData(sap_system + "/kcad/cross_app/zui5_files/get_list?guid=" + DMS_ID + "&process_name=DMS", null, false, "POST");

    var oTemplate = new sap.m.StandardListItem({title: "{FILENAME}", type: "Active", press: sap.ui.controller("dms.DMSAttachments").viewAttachment});
    var attachmentList = sap.ui.getCore().byId("attachmentList");

    attachmentList.setModel(attachmentsModel);
    attachmentList.bindItems("/ABAP_JSON/", oTemplate);
    attachmentList.bindItems("/ABAP_JSON/", oTemplate,attachmentsModel);


  },

  viewAttachment: function(event){
    var dataLine = attachmentsModel.getProperty(event.oSource.getBindingContextPath());

    sap.m.URLHelper.redirect(sap_system + dataLine.DOWNLOAD_LINK, false);
  },

  deleteAttachment: function(event){
    var item = event.getParameter("listItem");

    var dataLine = attachmentsModel.getProperty(item.getBindingContextPath());

    $.ajax({ url: sap_system + dataLine.DELETE_LINK,
      async   : true,
            type    : "POST",
          beforeSend: function(){
            openBusyDialog("Rejecting DMS form");
          },
            success : function(json) {
              closeBusyDialog("Rejecting DMS form");
                       var attachmentList = sap.ui.getCore().byId("attachmentList");
                       attachmentList.removeItem(item);
                       item.destroy();
                      },

            error : function(xhr, status) {
                       alert("Sorry, there was a problem!");
                    },

            complete : function(xhr,status) {

            }
       })
  }
});