sap.ui.jsview("dms.DMSMyDMSForms", {

	/** Specifies the Controller belonging to this View. 
	 * In the case that it is not implemented, or that "null" is returned, this View does not have a Controller.
	 * @memberOf dms.DMSMyDMSForms
	 */

	getControllerName: function () {
		return "dms.DMSMyDMSForms";
	},

	/** Is initially called once after the Controller has been instantiated. It is the place where the UI is constructed. 
	 * Since the Controller is given to this method, its event handlers can be attached right away. 
	 * @memberOf dms.DMSMyDMSForms
	 */
	createContent: function (oController) {
		var table = new sap.m.Table("myDMSTable", {
			select: oController.processItem,
			mode: sap.m.ListMode.SingleSelectMaster,
			columns: [new sap.m.Column({
					header: new sap.m.Label({
						text: "Approver/s"
					})
				}),
				new sap.m.Column({
					header: new sap.m.Label({
						text: "Status"
					})
				}),
				new sap.m.Column({
					header: new sap.m.Label({
						text: "Document Type"
					})
				}),
				new sap.m.Column({
					header: new sap.m.Label({
						text: "Document Group"
					})
				}),

				new sap.m.Column({
					header: new sap.m.Label({
						text: "Additional Description"
					})
				}),
				new sap.m.Column({
					header: new sap.m.Label({
						text: "Document Location"
					})
				}),

				new sap.m.Column({
					header: new sap.m.Label({
						text: "Document Date"
					})
				}),
				new sap.m.Column({
					header: new sap.m.Label({
						text: "Functional Location"
					})
				}),
				new sap.m.Column({
					header: new sap.m.Label({
						text: "Equipment"
					})
				}),
				new sap.m.Column({
					header: new sap.m.Label({
						text: "Material"
					})
				}),
				new sap.m.Column({
					header: new sap.m.Label({
						text: "Work Order"
					})
				}),
				new sap.m.Column({
					header: new sap.m.Label({
						text: "Workflow Id"
					})
				})
			]
		});

		table.bindAggregation("items", {
			path: "/ABAP_JSON/ITEMS/",
			template: new sap.m.ColumnListItem({
				cells: [
					new sap.m.Label({
						text: "{APPROVERS}",
						tooltip: "{APPROVERS}"
					}),
					new sap.m.ObjectStatus({
						text: {
							path: "STATUS"
						},
						state: {
							path: "STATUS",
							formatter: function (status) {
								if (status === 'REJECTED' || status === 'Rejected') {
									return sap.ui.core.ValueState.Error;
								} else {
									return sap.ui.core.ValueState.Success;
								}
							}
						}
					}),
					new sap.m.Label({
						text: "{DOC_TYPE}"
					}),
					new sap.m.Label({
						text: "{DOC_GROUP}"
					}),

					new sap.m.Label({
						text: "{ADD_DESCRIPTION}"
					}),
					new sap.m.Label({
						text: "{DOC_LOCATION}"
					}),

					new sap.m.Label({
						text: "{DOC_DATE}"
					}),
					new sap.m.Label({
						text: "{FUNC_LOCATION}"
					}),
					new sap.m.Label({
						text: "{EQUIP_MASTER}"
					}),
					new sap.m.Label({
						text: "{MATERIAL_MASTER}"
					}),
					new sap.m.Label({
						text: "{WORK_ORDER}"
					}),
					new sap.m.Label({
						text: "{WF_ID}"
					})
				]
			})
		});

		table.setModel(myDMSModel);

		var page = new sap.m.Page("dms.myDMSPage", {
			title: "My DMS Forms",
			id: "myDMSPage",
			enableScrolling: false
		});
		var scroll = new sap.m.ScrollContainer({
			width: "100%",
			height: "100%",
			vertical: true
		});

		scroll.addContent(table);
		page.addContent(scroll);

		return page;
	}

});