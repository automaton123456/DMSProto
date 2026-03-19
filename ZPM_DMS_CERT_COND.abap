FUNCTION zpm_dms_cert_cond.
*"----------------------------------------------------------------------
*"*"Local Interface:
*"  IMPORTING
*"     REFERENCE(DOC_SETTINGS) TYPE  ZPM_DMS_DOC_GEN
*"     REFERENCE(SCREEN_SETTTINGS) TYPE  ZPM_DMS_CL_OBJ
*"     REFERENCE(DMS_DATA) TYPE  ZPM_DMS_DATA_STRUCT
*"  EXPORTING
*"     VALUE(CONDITION_RESULT) TYPE  FLAG
*"----------------------------------------------------------------------

***** begin of changes   T40K980842 - GOVE - RFC348 - DMS web application enhancements  30.01.2017
* Function module contains extra conditions that must be met for triggering the workflow requirment. To trigger a workflow either the functional location
* or equipment must be assigned to open orders with main workcenter 'INSP' OR a work order number must be entered. Otherwise no workflow (and hence no
* order number) is required. This is because the work order number is set to 'only mandatory for approvers' and there will be no approver if these
* conditions aren't met. Instead such documents are just directly uploaded to SAP and attached to the relevant object links with no approval needed.

**** In the scenario where the user enters either an equipment or functional location. Only if those technical objects are attached to open orders
**** with a main work center of INSP will a workflow be required. Since these orders require an inspection by a third party, whom will issue a
**** certification, approval should be required when attaching any certifications to these technical objects. Objects without open inspection work orders
**** will not require an approval workflow. If an order number is entered by the user a workflow should always be triggered as order will be TECO'd by
**** the DMS work order close procedure and this should only be done after relavant approval confirming the inspection has been completed (cert recieved).

  TYPES: BEGIN OF typ_orders,
           aufnr TYPE viaufkst-aufnr,
           equnr TYPE viaufkst-equnr,
           tplnr TYPE viaufkst-tplnr,
           vaplz TYPE viaufkst-vaplz,
           iphas TYPE viaufkst-iphas,
         END OF typ_orders.

  DATA: lt_orders TYPE STANDARD TABLE OF typ_orders,
        wa_orders TYPE typ_orders.

  DATA: insp_found TYPE flag,
        order_found TYPE flag,
        lv_eqtyp TYPE equi-eqtyp,
        wa_object_link LIKE LINE OF dms_data-object_links.


LOOP AT dms_data-object_links INTO wa_object_link.
* If a work order is entered then a workflow is shall always be required (because the work order will be closed by the system).
  IF wa_object_link-work_order IS NOT INITIAL.
    order_found = 'X'.
    EXIT.
  ENDIF.

* Document Type CER + Doc Group = CE + Equipment with active Maintenance items with Group = *-INSP exists
  IF wa_object_link-equipment IS NOT INITIAL.

    CLEAR: lv_eqtyp,
           lt_orders.

    SELECT SINGLE eqtyp
    FROM equi
    INTO lv_eqtyp
    WHERE equnr = wa_object_link-equipment.

    IF lv_eqtyp <> 'S'. "Only do the checks if equipment category is anything other than cat 'S'.
                        "Since Serialized equipment do not have any order etc.
                        "So such documents should just be directly uploaded without workflow requirement.

*     check if there are any active work orders associated with this equipment
*     Fetch all the open orders associated with the equipment
      SELECT aufnr equnr tplnr vaplz iphas
        FROM viaufkst
        INTO TABLE lt_orders
        WHERE equnr = wa_object_link-equipment
        AND ( iphas = '0' OR iphas = '2' )
        AND vaplz = 'INSP'.

      IF sy-subrc = 0. "We have open work orders for this equipment with main work center = 'INSP'.
         insp_found = 'X'. "INSP was found! so workflow IS required.
         EXIT.
      ELSE.
        "continue
      ENDIF.
    ENDIF.

  ENDIF.


*  Document Type CER + Doc Group = CE + Equipment = BLANK + Functional Location with active Work Orders with Main Work center = INSP exists
  IF wa_object_link-equipment IS INITIAL.
     IF wa_object_link-func_location IS NOT INITIAL.

          CLEAR: lv_eqtyp,
                 lt_orders.

*         Fetch all the OPEN orders with maint center = 'INSP' associated with this functional location
          SELECT aufnr equnr tplnr vaplz iphas
            FROM viaufkst
            INTO TABLE lt_orders
            WHERE tplnr = wa_object_link-func_location
            AND ( iphas = '0' OR iphas = '2' )
            AND vaplz = 'INSP'.

          IF sy-subrc = 0. "We have open work orders for this equipment with main work center = 'INSP'.
             insp_found = 'X'. "INSP was found! so workflow IS required.
             EXIT.
          ELSE.
            "continue
          ENDIF.

     ENDIF.
  ENDIF.
ENDLOOP.


* Determine final return condition result of function module
IF insp_found = 'X' OR order_found = 'X'.
  condition_result = 'X'. "WF triggering conditions were met so workflow is required
ELSE.
  condition_result = ' '. "WF triggering conditions NOT met so NO workflow is required
ENDIF.

****** end of changes  T40K980842 - GOVE - RFC348 - DMS web application enhancements 30.01.2017
ENDFUNCTION.
