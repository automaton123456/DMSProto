* Workflow rules for choosing approvers
FUNCTION zpm_dms_wfr_woc.
*"----------------------------------------------------------------------
*"*"Local Interface:
*"  IMPORTING
*"     REFERENCE(DMS_OBJECT) TYPE REF TO  ZCL_PM_DMS_DATA
*"  TABLES
*"      ACTOR_TAB STRUCTURE  SWHACTOR
*"----------------------------------------------------------------------

  DATA ls_actors TYPE swhactor.
  ls_actors-otype = 'US'.

  DATA: lv_username  TYPE sy-uname,
        lv_rigflcode LIKE zpm_efr_rigs-rigflcode,
        lv_aufnr     TYPE bapi_alm_order_header_e-orderid,
        rest         TYPE string,
        subrc        TYPE sy-subrc,
        lv_equipment TYPE bapi_itob_parms-equipment.

* Get most important work center from list of work orders



* Read values assigned to the rule criteria
  lv_aufnr = dms_object->get_first_work_order( ).
  lv_rigflcode = dms_object->get_first_func_location( ).
  lv_equipment = dms_object->get_first_equip_master( ).

  data(lv_dms_id) = dms_object->get_dms_id( ).
  DATA(main_work_center) = zcl_pm_dms_data_model=>get_most_important_work_center( lv_dms_id ).


  CALL FUNCTION 'CONVERSION_EXIT_ALPHA_INPUT'
    EXPORTING
      input  = lv_aufnr
    IMPORTING
      output = lv_aufnr.

  IF lv_aufnr IS NOT INITIAL AND ( lv_rigflcode IS INITIAL AND lv_equipment IS INITIAL ).
    DATA: number TYPE  bapi_alm_order_header_e-orderid,
          return TYPE TABLE OF bapiret2.
    number = lv_aufnr.

    DATA es_header TYPE bapi_alm_order_header_e.

    CALL FUNCTION 'BAPI_ALM_ORDER_GET_DETAIL'
      EXPORTING
        number    = number
      IMPORTING
        es_header = es_header
      TABLES
        return    = return.

    lv_rigflcode = es_header-funct_loc.
    lv_equipment = es_header-equipment.

  ENDIF.


  SPLIT lv_rigflcode AT '-' INTO lv_rigflcode rest.

* Calculate maintenance package days
  DATA: char_wert  TYPE char22,
        lt_return  TYPE TABLE OF bapiret2,
        lv_days    TYPE i,
        ls_viaufks TYPE zviaufks,
        lv_arbpl   TYPE arbpl,
        message    TYPE string.

  lv_arbpl = main_work_center.


  SELECT SINGLE * FROM zviaufks
    INTO ls_viaufks
    WHERE aufnr = lv_aufnr.

  DATA: ls_vimhis TYPE vimhis,
        ls_t351p  TYPE t351p.

  SELECT SINGLE * FROM vimhis
    INTO ls_vimhis
    WHERE warpl = ls_viaufks-warpl
      AND abnum = ls_viaufks-abnum
      AND wapos = ls_viaufks-wapos.

  SELECT SINGLE * FROM t351p INTO ls_t351p
    WHERE strat = ls_vimhis-strat
      AND zaehl = ls_vimhis-zaehl.


  CALL FUNCTION 'FLTP_CHAR_CONVERSION_FROM_SI'
    EXPORTING
      char_unit       = 'TAG' "ls_t351p-zeieh
      decimals        = 0
      exponent        = 0
      fltp_value_si   = ls_t351p-zykzt
      indicator_value = 'X'
      masc_symbol     = ' '
    IMPORTING
      char_value      = char_wert.

  MOVE char_wert TO lv_days.

* Check the final operation work center
  DATA: lt_operations TYPE TABLE OF viaufk_afvc WITH HEADER LINE.

  SELECT * FROM viaufk_afvc
    INTO TABLE lt_operations
    WHERE aufnr = lv_aufnr.

*  SORT lt_operations BY vornr DESCENDING.
  READ TABLE lt_operations INDEX 1.

* Convert work center to nice name
*  SELECT SINGLE arbpl
*    INTO lv_arbpl
*    FROM crhd
*    WHERE objty = 'A'
*      AND objid = lt_operations-arbid.


  IF lv_rigflcode IS NOT INITIAL.
* Find approver!
    SELECT username FROM zpm_dms_woc_sup INTO lv_username
      WHERE rig = lv_rigflcode
        AND gewrk = lv_arbpl
        AND maint_days_low <= lv_days
        AND maint_days_high >= lv_days.

*         Make sure user is valid for workflow
      PERFORM check_user
        USING lv_username
              subrc.

      IF subrc <> 0.
        CONTINUE.
      ENDIF.

      actor_tab-otype = 'US'.
      actor_tab-objid = lv_username.
      APPEND actor_tab.

      CONCATENATE 'S|ZKPM|000|Approver added:' lv_username INTO message SEPARATED BY space.
      zcl_web_app_log=>add_message_string( message ).
      CLEAR message.
    ENDSELECT.

* No functional location find approvers for base as equipment is not installled
  ELSE.
    DATA: ls_eq_general TYPE bapi_itob.

    CONCATENATE 'S|ZKPM|000|No functional location found, using equipment:' lv_equipment INTO message SEPARATED BY space.
    zcl_web_app_log=>add_message_string( message ).
    CLEAR message.

    IF lv_equipment IS NOT INITIAL.
      CALL FUNCTION 'BAPI_EQUI_GETDETAIL'
        EXPORTING
          equipment        = lv_equipment
        IMPORTING
          data_general_exp = ls_eq_general
*         RETURN           =
        .

      DATA: lt_func_locs TYPE TABLE OF tplnr,
            lv_func_loc  TYPE tplnr.
      FIELD-SYMBOLS: <tplnr> TYPE tplnr.

      IF ls_eq_general-maintplant NE 'SCRP'. "Only if the plant is not SCRP do we look for approvers. If plant is SCRP we just want the workflow to error.
*         Get all functional locations connected to maintenance plants
        SELECT tplnr FROM iflo
          INTO TABLE lt_func_locs
          WHERE swerk = ls_eq_general-maintplant.

        LOOP AT lt_func_locs ASSIGNING <tplnr>.
          SPLIT <tplnr> AT '-' INTO <tplnr> rest.
        ENDLOOP.

        SORT lt_func_locs.
        DELETE ADJACENT DUPLICATES FROM lt_func_locs.

        LOOP AT lt_func_locs INTO lv_func_loc.
          SELECT username FROM zpm_dms_woc_sup INTO lv_username
          WHERE rig = lv_func_loc
            AND gewrk = lv_arbpl
            AND maint_days_low <= lv_days
            AND maint_days_high >= lv_days.

*             Make sure user is valid for workflow
            PERFORM check_user
              USING lv_username
                    subrc.

            IF subrc <> 0.
              CONTINUE.
            ENDIF.


            actor_tab-otype = 'US'.
            actor_tab-objid = lv_username.
            APPEND actor_tab.

            CONCATENATE 'S|ZKPM|000|Approver added:' lv_username INTO message SEPARATED BY space.
            zcl_web_app_log=>add_message_string( message ).
            CLEAR message.
          ENDSELECT.
        ENDLOOP.
      ENDIF.
    ELSE.
      CONCATENATE 'E|ZKPM|000|No equipment found cannot find approver' '' INTO message SEPARATED BY space.
      zcl_web_app_log=>add_message_string( message ).
      CLEAR message.
    ENDIF.
  ENDIF.

  SORT actor_tab.
  DELETE actor_tab WHERE objid IS INITIAL.
  DELETE ADJACENT DUPLICATES FROM actor_tab.

  lv_dms_id = dms_object->get_dms_id( ).


* When no approvers found send an error log to PM administrator
  IF actor_tab[] IS INITIAL.
    zcl_web_app_log=>add_message_string( 'E|ZKPM|000|No workflow approvers found please check workflow' ).
    zcl_web_app_log=>add_message_string( 'E|ZKPM|000|Using logic: Approver by maintenance strategy' ).

*   Send error message to support administrator
    DATA: error_string TYPE string,
          lv_misc      TYPE string.

    MOVE dms_object->get_wf_id( ) TO lv_misc.
    CONCATENATE 'E|ZKPM|000|Workflow ID:' lv_misc INTO error_string.
    zcl_web_app_log=>add_message_string( error_string ).

    MOVE lv_days TO lv_misc.

    CLEAR error_string.
    CONCATENATE 'E|ZKPM|000|Rig:' lv_rigflcode ', W Center:' lv_arbpl ', M days:' lv_misc INTO error_string.
    zcl_web_app_log=>add_message_string( error_string ).

    zcl_web_app_log=>save_messages( object = 'ZPM' subobject = 'DMS' extnumber = lv_dms_id error_email_address = zcl_pm_web_utilities=>get_pm_administrator_email( 'DMS' ) ).

  ELSE.
    zcl_web_app_log=>save_messages( object = 'ZPM' subobject = 'DMS' extnumber = lv_dms_id ).
  ENDIF.

ENDFUNCTION.


*&---------------------------------------------------------------------*
*&      Form  check_user
*&---------------------------------------------------------------------*
*       text
*----------------------------------------------------------------------*
*      -->USER       text
*      -->SUBRC      text
*----------------------------------------------------------------------*
FORM check_user
  USING user    TYPE sy-uname
        subrc   TYPE sy-subrc.

  CLEAR subrc.

  DATA: lv_user              TYPE bapibname-bapibname,
        ls_return            TYPE bapiret2,
        lt_return            TYPE TABLE OF bapiret2,
        ls_user_login_detail TYPE bapilogond,
        message              TYPE string.

  lv_user = user.

* Check to see if user exists
  CALL FUNCTION 'BAPI_USER_GET_DETAIL'
    EXPORTING
      username      = lv_user
      cache_results = 'X'
    IMPORTING
      logondata     = ls_user_login_detail
    TABLES
      return        = lt_return.

*         User probably doesn't exist don't bother adding them
  READ TABLE lt_return INTO ls_return WITH KEY type = 'E'.
  IF sy-subrc = 0.
    CONCATENATE 'E|ZKPM|000|User:' lv_user 'does not exist' INTO message SEPARATED BY space.
    zcl_web_app_log=>add_message_string( message ).
    subrc = 1.
  ELSEIF ls_user_login_detail-gltgb <= sy-datum.
    CONCATENATE 'E|ZKPM|000|User:' lv_user 'is expired' INTO message SEPARATED BY space.
    zcl_web_app_log=>add_message_string( message ).
    subrc = 2.
  ENDIF.



ENDFORM.                    "check_user
