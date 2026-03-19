*Workflow approval rule for workflow
FUNCTION zpm_dms_wfr_mwc.
*"----------------------------------------------------------------------
*"*"Local Interface:
*"  IMPORTING
*"     REFERENCE(DMS_OBJECT) TYPE REF TO  ZCL_PM_DMS_DATA
*"  TABLES
*"      ACTOR_TAB STRUCTURE  SWHACTOR
*"----------------------------------------------------------------------

  DATA ls_actors TYPE swhactor.
  ls_actors-otype = 'US'.

  DATA: lv_username   TYPE sy-uname,
        lv_rigflcode  LIKE zpm_efr_rigs-rigflcode,
        lv_aufnr      TYPE bapi_alm_order_header_e-orderid,
        lv_order_head TYPE bapi_alm_order_header_e,
        lv_tplnr      TYPE tplnr,
        therest       TYPE string,
        return        TYPE TABLE OF bapiret2,
        message       TYPE string,
        lv_dms_id     TYPE zpm_dms_id,
        lt_order_head TYPE TABLE OF bapi_alm_order_header_e.

  lv_dms_id = dms_object->get_dms_id( ).
  DATA(main_work_center) = zcl_pm_dms_data_model=>get_most_important_wc_h( lv_dms_id ).

  lv_aufnr = dms_object->get_first_work_order( ).
  CALL FUNCTION 'CONVERSION_EXIT_ALPHA_INPUT'
    EXPORTING
      input  = lv_aufnr
    IMPORTING
      output = lv_aufnr.


  CALL FUNCTION 'BAPI_ALM_ORDER_GET_DETAIL'
    EXPORTING
      number    = lv_aufnr
    IMPORTING
      es_header = lv_order_head
    TABLES
      return    = return.


  lv_rigflcode = lv_order_head-funct_loc.
  SPLIT lv_rigflcode AT '-' INTO lv_rigflcode therest.

* Find approver!
  SELECT username FROM zpm_dms_mwc_sup INTO lv_username
    WHERE rigflcode = lv_rigflcode
      AND gewrk = main_work_center.

    actor_tab-otype = 'US'.
    actor_tab-objid = lv_username.
    APPEND actor_tab.

    CONCATENATE 'S|ZKPM|000|Approver added:' lv_username INTO message SEPARATED BY space.
    zcl_web_app_log=>add_message_string( message ).
    CLEAR message.
  ENDSELECT.

  SORT actor_tab.
  DELETE ADJACENT DUPLICATES FROM actor_tab.



* when no approvers found send an error log to pm administrator
  IF actor_tab[] IS INITIAL.
    zcl_web_app_log=>add_message_string( 'E|ZKPM|000|No workflow approvers found please check workflow' ).
    zcl_web_app_log=>add_message_string( 'E|ZKPM|000|Using logic: Approver by main work center' ).

*   Send error message to support administrator
    DATA: error_string TYPE string,
          lv_misc      TYPE string.

    MOVE dms_object->get_wf_id( ) TO lv_misc.
    CONCATENATE 'E|ZKPM|000|Workflow ID:' lv_misc INTO error_string.
    zcl_web_app_log=>add_message_string( error_string ).

    CLEAR error_string.
    CONCATENATE 'E|ZKPM|000|Rig:' lv_rigflcode ', W Center:' lv_order_head-mn_wk_ctr INTO error_string.
    zcl_web_app_log=>add_message_string( error_string ).

    zcl_web_app_log=>save_messages( object = 'ZPM' subobject = 'DMS' extnumber = lv_dms_id error_email_address = zcl_pm_web_utilities=>get_pm_administrator_email( 'DMS' ) ).

  ELSE.
    zcl_web_app_log=>save_messages( object = 'ZPM' subobject = 'DMS' extnumber = lv_dms_id ).
  ENDIF.
ENDFUNCTION.
