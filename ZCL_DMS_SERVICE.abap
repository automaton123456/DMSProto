class ZCL_DMS_SERVICE definition
  public
  final
  create public .

public section.

*"* public components of class ZCL_DMS_SERVICE
*"* do not include other source files here!!!
  interfaces IF_HTTP_EXTENSION .

  data MSV_APPROVAL_STEP type SWD_STEP_T value 'TS99000009' ##NO_TEXT.
  data FINAL_APPROVAL_STEP type SWD_STEP_T value 'TS99000006' ##NO_TEXT.
protected section.
*"* protected components of class ZCL_DMS_SERVICE
*"* do not include other source files here!!!
private section.

*"* private components of class ZCL_DMS_SERVICE
*"* do not include other source files here!!!
  methods REJECT_FORM
    importing
      !SERVER type ref to IF_HTTP_SERVER .
  methods APPROVE_FORM
    importing
      !SERVER type ref to IF_HTTP_SERVER .
  methods SUBMIT
    importing
      !SERVER type ref to IF_HTTP_SERVER .
  methods GET_DOCUMENT_TYPES
    importing
      !SERVER type ref to IF_HTTP_SERVER .
  methods GET_DOCUMENT_GROUPS
    importing
      !SERVER type ref to IF_HTTP_SERVER .
  methods GET_TEMPLATE
    importing
      !SERVER type ref to IF_HTTP_SERVER .
  methods CHECK_WORK_ORDER
    importing
      !SERVER type ref to IF_HTTP_SERVER .
  methods CHECK_FUNCTIONAL_LOCATION
    importing
      !SERVER type ref to IF_HTTP_SERVER .
  methods CHECK_EQUIPMENT
    importing
      !SERVER type ref to IF_HTTP_SERVER .
  methods CHECK_MATERIAL
    importing
      !SERVER type ref to IF_HTTP_SERVER .
  methods GET_WORK_ITEMS
    importing
      !SERVER type ref to IF_HTTP_SERVER .
  methods LOAD_DMS_OBJECT
    importing
      !SERVER type ref to IF_HTTP_SERVER .
  methods GET_MY_MOC
    importing
      !SERVER type ref to IF_HTTP_SERVER .
  methods GET_WORK_ITEMS_DATA
    returning
      value(LS_DMS_INBOX) type ZPM_DMS_INBOX .
  methods GET_MY_MOC_DATA
    returning
      value(LS_DMS_INBOX) type ZPM_MYDMS_INBOX .
  methods GET_TILE_DATA
    importing
      !SERVER type ref to IF_HTTP_SERVER .
  methods DELETE_FORM
    importing
      !SERVER type ref to IF_HTTP_SERVER .
ENDCLASS.



CLASS ZCL_DMS_SERVICE IMPLEMENTATION.


* <SIGNATURE>---------------------------------------------------------------------------------------+
* | Instance Private Method ZCL_DMS_SERVICE->APPROVE_FORM
* +-------------------------------------------------------------------------------------------------+
* | [--->] SERVER                         TYPE REF TO IF_HTTP_SERVER
* +--------------------------------------------------------------------------------------</SIGNATURE>
METHOD approve_form.
  DATA: request_data  TYPE string,
        dms_data      TYPE zpm_dms_data_struct,
        dms_model     TYPE REF TO zcl_pm_dms_data_model,
        response_data TYPE zpm_dms_submit_response,
        ls_message    TYPE bapiret2.

  request_data = server->request->get_form_field( name = 'request_data' ).

  REPLACE 'ABAP_JSON' IN request_data WITH 'ZPM_DMS_DATA_STRUCT'.


  DATA: xslt_error TYPE REF TO cx_xslt_exception,
        xslt_message TYPE string.

  TRY.
      CALL TRANSFORMATION id SOURCE XML request_data
                             RESULT zpm_dms_data_struct = dms_data.
    CATCH cx_sy_conversion_data_loss .
    CATCH cx_xslt_exception INTO xslt_error.
      xslt_message = xslt_error->get_text( ).
      WRITE:/ xslt_message .

  ENDTRY.

  CREATE OBJECT dms_model
    EXPORTING
      dms_data_in = dms_data.

  response_data = dms_model->approve_form( ).

  READ TABLE response_data-messages INTO ls_message WITH KEY type = 'E'.
  IF sy-subrc <> 0.
    CALL FUNCTION 'BAPI_TRANSACTION_COMMIT'.
  ELSE.
    CALL FUNCTION 'BAPI_TRANSACTION_ROLLBACK'.
  ENDIF.





  DATA lv_json TYPE string.

  CALL METHOD zcl_abap_utilities=>generate_json_string
    EXPORTING
      lt_data = response_data
    RECEIVING
      result  = lv_json.

  CALL METHOD server->response->set_cdata( data = lv_json ).

ENDMETHOD.


* <SIGNATURE>---------------------------------------------------------------------------------------+
* | Instance Private Method ZCL_DMS_SERVICE->CHECK_EQUIPMENT
* +-------------------------------------------------------------------------------------------------+
* | [--->] SERVER                         TYPE REF TO IF_HTTP_SERVER
* +--------------------------------------------------------------------------------------</SIGNATURE>
METHOD check_equipment.
  DATA: equipment           TYPE equnr,
        doc_data            TYPE zpm_dms_check_eq,
        functional_location TYPE tplnr.

  equipment = server->request->get_form_field( name = 'equipment' ).
  functional_location = server->request->get_form_field( name = 'func_loc' ).

  doc_data = zcl_pm_dms_data_model=>check_equipment( equipment  = equipment functional_location = functional_location ).

* Convert to JSON format
  DATA lv_json TYPE string.

  CALL METHOD zcl_abap_utilities=>generate_json_string
    EXPORTING
      lt_data = doc_data
    RECEIVING
      result  = lv_json.

  CALL METHOD server->response->set_cdata( data = lv_json ).
ENDMETHOD.


* <SIGNATURE>---------------------------------------------------------------------------------------+
* | Instance Private Method ZCL_DMS_SERVICE->CHECK_FUNCTIONAL_LOCATION
* +-------------------------------------------------------------------------------------------------+
* | [--->] SERVER                         TYPE REF TO IF_HTTP_SERVER
* +--------------------------------------------------------------------------------------</SIGNATURE>
METHOD check_functional_location.
  DATA: func_location TYPE tplnr,
        doc_data      TYPE ZPM_DMS_CHECK_FL.

  func_location  = server->request->get_form_field( name = 'func_loc' ).


  doc_data = zcl_pm_dms_data_model=>check_functional_location( functional_location  = func_location  ).

* Convert to JSON format
  DATA lv_json TYPE string.

  CALL METHOD zcl_abap_utilities=>generate_json_string
    EXPORTING
      lt_data = doc_data
    RECEIVING
      result  = lv_json.

  CALL METHOD server->response->set_cdata( data = lv_json ).
ENDMETHOD.


* <SIGNATURE>---------------------------------------------------------------------------------------+
* | Instance Private Method ZCL_DMS_SERVICE->CHECK_MATERIAL
* +-------------------------------------------------------------------------------------------------+
* | [--->] SERVER                         TYPE REF TO IF_HTTP_SERVER
* +--------------------------------------------------------------------------------------</SIGNATURE>
METHOD check_material.
  DATA: material     TYPE matnr,
        doc_data     TYPE zpm_dms_check_m,
        equipment    type equnr.

  material = server->request->get_form_field( name = 'material' ).
  equipment = server->request->get_form_field( name = 'equipment' ).


  doc_data = zcl_pm_dms_data_model=>check_material( material  = material equipment = equipment ).

* Convert to JSON format
  DATA lv_json TYPE string.

  CALL METHOD zcl_abap_utilities=>generate_json_string
    EXPORTING
      lt_data = doc_data
    RECEIVING
      result  = lv_json.

  CALL METHOD server->response->set_cdata( data = lv_json ).
ENDMETHOD.


* <SIGNATURE>---------------------------------------------------------------------------------------+
* | Instance Private Method ZCL_DMS_SERVICE->CHECK_WORK_ORDER
* +-------------------------------------------------------------------------------------------------+
* | [--->] SERVER                         TYPE REF TO IF_HTTP_SERVER
* +--------------------------------------------------------------------------------------</SIGNATURE>
METHOD check_work_order.
  DATA: work_order TYPE aufnr,
        doc_group  TYPE char30,
        doc_data   TYPE zpm_dms_check_wo,
        wf_id TYPE sww_wiid.

* (these values are encoded in App URL)
  work_order  = server->request->get_form_field( name = 'order' ).
  doc_group   = server->request->get_form_field( name = 'doc_group' ).
  wf_id       = server->request->get_form_field( name = 'wf_id' ).

  doc_data = zcl_pm_dms_data_model=>check_work_order( work_order = work_order doc_group = doc_group wf_id = wf_id ).

* Convert to JSON format
  DATA lv_json TYPE string.

  CALL METHOD zcl_abap_utilities=>generate_json_string
    EXPORTING
      lt_data = doc_data
    RECEIVING
      result  = lv_json.

  CALL METHOD server->response->set_cdata( data = lv_json ).
ENDMETHOD.


* <SIGNATURE>---------------------------------------------------------------------------------------+
* | Instance Private Method ZCL_DMS_SERVICE->DELETE_FORM
* +-------------------------------------------------------------------------------------------------+
* | [--->] SERVER                         TYPE REF TO IF_HTTP_SERVER
* +--------------------------------------------------------------------------------------</SIGNATURE>
METHOD delete_form.
  DATA: request_data  TYPE string,
        dms_data      TYPE zpm_dms_data_struct,
        dms_model     TYPE REF TO zcl_pm_dms_data_model,
        response_data TYPE zpm_dms_submit_response,
        ls_message    TYPE bapiret2.

  request_data = server->request->get_form_field( name = 'request_data' ).

  REPLACE 'ABAP_JSON' IN request_data WITH 'ZPM_DMS_DATA_STRUCT'.


  DATA: xslt_error   TYPE REF TO cx_xslt_exception,
        xslt_message TYPE string.

  TRY.
      CALL TRANSFORMATION id SOURCE XML request_data
                             RESULT zpm_dms_data_struct = dms_data.
    CATCH cx_sy_conversion_data_loss .
    CATCH cx_xslt_exception INTO xslt_error.
      xslt_message = xslt_error->get_text( ).
      WRITE:/ xslt_message .

  ENDTRY.

  CREATE OBJECT dms_model
    EXPORTING
      dms_data_in = dms_data.


  dms_model->dms_data-dms_data-status = 'Deleted'.

  dms_model->set_data( ).


  IF sy-subrc = 0.
    DATA message TYPE bapiret2.
    message-type = 'S'.
    message-message = 'EFR Deleted'.

    APPEND message TO response_data-messages.

    COMMIT WORK.
  ENDIF.






  DATA lv_json TYPE string.

  CALL METHOD zcl_abap_utilities=>generate_json_string
    EXPORTING
      lt_data = response_data
    RECEIVING
      result  = lv_json.

  CALL METHOD server->response->set_cdata( data = lv_json ).

ENDMETHOD.


* <SIGNATURE>---------------------------------------------------------------------------------------+
* | Instance Private Method ZCL_DMS_SERVICE->GET_DOCUMENT_GROUPS
* +-------------------------------------------------------------------------------------------------+
* | [--->] SERVER                         TYPE REF TO IF_HTTP_SERVER
* +--------------------------------------------------------------------------------------</SIGNATURE>
METHOD get_document_groups.
  DATA: doc_groups TYPE zui5_dropdown_t,
        doc_type   TYPE dokar.

  doc_type = server->request->get_form_field( name = 'doc_type' ).

  doc_groups = zcl_pm_dms_data_model=>get_document_groups( doc_type ).

* Convert to JSON format
  DATA lv_json TYPE string.

  CALL METHOD zcl_abap_utilities=>generate_json_string
    EXPORTING
      lt_data = doc_groups
    RECEIVING
      result  = lv_json.

  CALL METHOD server->response->set_cdata( data = lv_json ).
ENDMETHOD.


* <SIGNATURE>---------------------------------------------------------------------------------------+
* | Instance Private Method ZCL_DMS_SERVICE->GET_DOCUMENT_TYPES
* +-------------------------------------------------------------------------------------------------+
* | [--->] SERVER                         TYPE REF TO IF_HTTP_SERVER
* +--------------------------------------------------------------------------------------</SIGNATURE>
METHOD get_document_types.
  DATA doc_types TYPE zui5_dropdown_t.

  doc_types = zcl_pm_dms_data_model=>get_document_types( ).

* Convert to JSON format
  DATA lv_json TYPE string.

  CALL METHOD zcl_abap_utilities=>generate_json_string
    EXPORTING
      lt_data = doc_types
    RECEIVING
      result  = lv_json.

  CALL METHOD server->response->set_cdata( data = lv_json ).
ENDMETHOD.


* <SIGNATURE>---------------------------------------------------------------------------------------+
* | Instance Private Method ZCL_DMS_SERVICE->GET_MY_MOC
* +-------------------------------------------------------------------------------------------------+
* | [--->] SERVER                         TYPE REF TO IF_HTTP_SERVER
* +--------------------------------------------------------------------------------------</SIGNATURE>
METHOD get_my_moc.
  DATA: ls_dms_inbox   TYPE zpm_mydms_inbox.

  ls_dms_inbox = get_my_moc_data( ).

* Convert to JSON format
  DATA lv_json TYPE string.

  CALL METHOD zcl_abap_utilities=>generate_json_string
    EXPORTING
      lt_data = ls_dms_inbox
    RECEIVING
      result  = lv_json.

  CALL METHOD server->response->set_cdata( data = lv_json ).
ENDMETHOD.


* <SIGNATURE>---------------------------------------------------------------------------------------+
* | Instance Private Method ZCL_DMS_SERVICE->GET_MY_MOC_DATA
* +-------------------------------------------------------------------------------------------------+
* | [<-()] LS_DMS_INBOX                   TYPE        ZPM_MYDMS_INBOX
* +--------------------------------------------------------------------------------------</SIGNATURE>
METHOD get_my_moc_data.
  DATA: lt_task_filter TYPE swrttask,
        lt_messages    TYPE TABLE OF swr_mstruc,
        lt_worklist    TYPE TABLE OF swr_wihdr,
        ls_task_filter TYPE swr_task.

* Get items created by me which are not closed
  DATA my_work_items TYPE TABLE OF swwwihead.

  SELECT * FROM zpm_my_open_dms
    INTO CORRESPONDING FIELDS OF TABLE ls_dms_inbox-items
    WHERE originator_uname = sy-uname.


  DATA: approvers TYPE swrtwiagent,
        approver  TYPE swr_wiagent,
        workitems TYPE swrtwiid,
        workitem  TYPE sww_wiid.


  FIELD-SYMBOLS: <item> TYPE zpm_mydms_data.

* Add assigned agents
  LOOP AT ls_dms_inbox-items ASSIGNING <item>.
    REFRESH: approvers, workitems.

    IF sy-subrc = 0.
      REFRESH workitems.
      APPEND <item>-wf_id TO workitems.

      DATA(current_task)    = zcl_pm_web_utilities=>get_latest_wftask( <item>-wf_id ).
      approvers       = zcl_pm_web_utilities=>get_approvers_for_task( current_task ).
      <item>-approvers  = zcl_pm_web_utilities=>approvers_to_string( approvers ).


      IF <item>-approvers IS INITIAL.
        <item>-approvers = 'No approver assigned'.
      ENDIF.

      SHIFT <item>-approvers LEFT DELETING LEADING space.
    ENDIF.

  ENDLOOP.


ENDMETHOD.


* <SIGNATURE>---------------------------------------------------------------------------------------+
* | Instance Private Method ZCL_DMS_SERVICE->GET_TEMPLATE
* +-------------------------------------------------------------------------------------------------+
* | [--->] SERVER                         TYPE REF TO IF_HTTP_SERVER
* +--------------------------------------------------------------------------------------</SIGNATURE>
METHOD get_template.
  DATA: doc_group  TYPE string,
        doc_type   TYPE string,
        doc_data   TYPE zpm_dms_data_struct.

  doc_type  = server->request->get_form_field( name = 'doc_type' ).
  doc_group = server->request->get_form_field( name = 'doc_group' ).


  doc_data = zcl_pm_dms_data_model=>get_template( doc_type = doc_type doc_group = doc_group ).

* Convert to JSON format
  DATA lv_json TYPE string.

  CALL METHOD zcl_abap_utilities=>generate_json_string
    EXPORTING
      lt_data = doc_data
    RECEIVING
      result  = lv_json.

  CALL METHOD server->response->set_cdata( data = lv_json ).
ENDMETHOD.


* <SIGNATURE>---------------------------------------------------------------------------------------+
* | Instance Private Method ZCL_DMS_SERVICE->GET_TILE_DATA
* +-------------------------------------------------------------------------------------------------+
* | [--->] SERVER                         TYPE REF TO IF_HTTP_SERVER
* +--------------------------------------------------------------------------------------</SIGNATURE>
METHOD GET_TILE_DATA.
  DATA: my_dms         TYPE zpm_mydms_inbox,
       	inbox          TYPE zpm_dms_inbox,
        home_icon_data TYPE zpm_dms_home_icons.


  my_dms = get_my_moc_data( ).
  inbox  = get_work_items_data( ).

  DESCRIBE TABLE my_dms-items LINES home_icon_data-my_dms_count.
  DESCRIBE TABLE inbox-items  LINES  home_icon_data-inbox_count.


* Convert to JSON format
  data lv_json type string.

  call method zcl_abap_utilities=>generate_json_string
    exporting
      lt_data = home_icon_data
    receiving
      result  = lv_json.

  call method server->response->set_cdata( data = lv_json ).


ENDMETHOD.


* <SIGNATURE>---------------------------------------------------------------------------------------+
* | Instance Private Method ZCL_DMS_SERVICE->GET_WORK_ITEMS
* +-------------------------------------------------------------------------------------------------+
* | [--->] SERVER                         TYPE REF TO IF_HTTP_SERVER
* +--------------------------------------------------------------------------------------</SIGNATURE>
METHOD get_work_items.
  DATA: ls_dms_inbox   TYPE zpm_dms_inbox.

  ls_dms_inbox = get_work_items_data( ).


* Convert to JSON format
  DATA lv_json TYPE string.

  CALL METHOD zcl_abap_utilities=>generate_json_string
    EXPORTING
      lt_data = ls_dms_inbox
    RECEIVING
      result  = lv_json.

  CALL METHOD server->response->set_cdata( data = lv_json ).
ENDMETHOD.


* <SIGNATURE>---------------------------------------------------------------------------------------+
* | Instance Private Method ZCL_DMS_SERVICE->GET_WORK_ITEMS_DATA
* +-------------------------------------------------------------------------------------------------+
* | [<-()] LS_DMS_INBOX                   TYPE        ZPM_DMS_INBOX
* +--------------------------------------------------------------------------------------</SIGNATURE>
METHOD GET_WORK_ITEMS_DATA.
  DATA: lt_task_filter TYPE swrttask,
        lt_messages    TYPE TABLE OF swr_mstruc,
        lt_worklist    TYPE TABLE OF swr_wihdr,
        ls_task_filter TYPE swr_task.

  ls_task_filter = 'TS99000006'.
  APPEND ls_task_filter TO lt_task_filter.

  ls_task_filter = 'TS99000009'.
  APPEND ls_task_filter TO lt_task_filter.


  CALL FUNCTION 'SAP_WAPI_CREATE_WORKLIST'
    EXPORTING
      user           = sy-uname
      language       = 'E'
    TABLES
      worklist       = lt_worklist
      message_struct = lt_messages
      task_filter    = lt_task_filter.


* Generate list for screen
  IF lt_worklist[] IS NOT INITIAL.
    SELECT * FROM zpm_dms_data
      INTO TABLE ls_dms_inbox-items
      FOR ALL ENTRIES IN lt_worklist
      WHERE wf_id = lt_worklist-wi_chckwi.
  ENDIF.


ENDMETHOD.


* <SIGNATURE>---------------------------------------------------------------------------------------+
* | Instance Public Method ZCL_DMS_SERVICE->IF_HTTP_EXTENSION~HANDLE_REQUEST
* +-------------------------------------------------------------------------------------------------+
* | [--->] SERVER                         TYPE REF TO IF_HTTP_SERVER
* +--------------------------------------------------------------------------------------</SIGNATURE>
METHOD if_http_extension~handle_request.
* Read the request url!
  DATA: url_info         TYPE string.

  url_info = server->request->get_header_field( name = '~PATH_INFO' ).

* Force login language to english for file description!!!
  sy-langu = 'E'.


* Remove any trash off the url
  SHIFT url_info LEFT BY 1 PLACES.
  REPLACE ALL OCCURRENCES OF '/$metadata' IN url_info WITH space.

  CASE url_info.
    WHEN 'template'.
      me->get_template( server ).
    WHEN 'doc_types'.
      me->get_document_types( server ).
    WHEN 'doc_groups'.
      me->get_document_groups( server ).
    WHEN 'check_work_order'.
      me->check_work_order( server ).
    WHEN 'check_functional_location'.
      me->check_functional_location( server ).
    WHEN 'check_equipment'.
      me->check_equipment( server ).
    WHEN 'check_material'.
      me->check_material( server ).
    WHEN 'submit'.
      me->submit( server ).
    WHEN 'get_work_items'.
      me->get_work_items( server ).
    WHEN 'get_my_dms'.
      me->get_my_moc( server ).
    WHEN 'load_dms_doc'.
      me->load_dms_object( server ).
    WHEN 'approve_form'.
      me->approve_form( server ).
    WHEN 'reject_form'.
      me->reject_form( server ).
    WHEN 'get_tile_data'.
      me->get_tile_data( server ).
    WHEN 'delete_form'.
      me->delete_form( server ).
  ENDCASE.

ENDMETHOD.


* <SIGNATURE>---------------------------------------------------------------------------------------+
* | Instance Private Method ZCL_DMS_SERVICE->LOAD_DMS_OBJECT
* +-------------------------------------------------------------------------------------------------+
* | [--->] SERVER                         TYPE REF TO IF_HTTP_SERVER
* +--------------------------------------------------------------------------------------</SIGNATURE>
METHOD load_dms_object.
  DATA: dms_id TYPE zpm_dms_id,
        model  TYPE REF TO zcl_pm_dms_data_model.

  dms_id = server->request->get_form_field( name = 'dms_doc' ).

  model = zcl_pm_dms_data_model=>create_model_from_id( id = dms_id ).

* Convert to JSON format
  DATA lv_json TYPE string.

  CALL METHOD zcl_abap_utilities=>generate_json_string
    EXPORTING
      lt_data = model->dms_data
    RECEIVING
      result  = lv_json.

  CALL METHOD server->response->set_cdata( data = lv_json ).

ENDMETHOD.


* <SIGNATURE>---------------------------------------------------------------------------------------+
* | Instance Private Method ZCL_DMS_SERVICE->REJECT_FORM
* +-------------------------------------------------------------------------------------------------+
* | [--->] SERVER                         TYPE REF TO IF_HTTP_SERVER
* +--------------------------------------------------------------------------------------</SIGNATURE>
METHOD reject_form.
  DATA: request_data  TYPE string,
        dms_data      TYPE zpm_dms_data_struct,
        dms_model     TYPE REF TO zcl_pm_dms_data_model,
        response_data TYPE zpm_dms_submit_response,
        reject_reason TYPE string.

  request_data = server->request->get_form_field( name = 'request_data' ).
  reject_reason = server->request->get_form_field( name = 'reject_reason' ).

  REPLACE 'ABAP_JSON' IN request_data WITH 'ZPM_DMS_DATA_STRUCT'.



  DATA: xslt_error TYPE REF TO cx_xslt_exception,
        xslt_message TYPE string.

  TRY.
      CALL TRANSFORMATION id SOURCE XML request_data
                             RESULT zpm_dms_data_struct = dms_data.
    CATCH cx_sy_conversion_data_loss .
    CATCH cx_xslt_exception INTO xslt_error.
      xslt_message = xslt_error->get_text( ).
      WRITE:/ xslt_message .

  ENDTRY.

  CREATE OBJECT dms_model
    EXPORTING
      dms_data_in = dms_data.

  response_data = dms_model->reject_form( reject_reason ).

  CALL FUNCTION 'BAPI_TRANSACTION_COMMIT'.




  DATA lv_json TYPE string.

  CALL METHOD zcl_abap_utilities=>generate_json_string
    EXPORTING
      lt_data = response_data
    RECEIVING
      result  = lv_json.

  CALL METHOD server->response->set_cdata( data = lv_json ).

ENDMETHOD.


* <SIGNATURE>---------------------------------------------------------------------------------------+
* | Instance Private Method ZCL_DMS_SERVICE->SUBMIT
* +-------------------------------------------------------------------------------------------------+
* | [--->] SERVER                         TYPE REF TO IF_HTTP_SERVER
* +--------------------------------------------------------------------------------------</SIGNATURE>
METHOD submit.
  DATA: request_data  TYPE string,
        dms_data      TYPE zpm_dms_data_struct,
        dms_model     TYPE REF TO zcl_pm_dms_data_model,
        response_data TYPE zpm_dms_submit_response,
        ls_message    TYPE bapiret2,
        duplicate     TYPE c.

  request_data = server->request->get_form_field( name = 'request_data' ).

  REPLACE 'ABAP_JSON' IN request_data WITH 'ZPM_DMS_DATA_STRUCT'.


* When a new form is submitted check to see if it has already been created
  DATA: xslt_error   TYPE REF TO cx_xslt_exception,
        xslt_message TYPE string.

  TRY.
      CALL TRANSFORMATION id SOURCE XML request_data
                             RESULT zpm_dms_data_struct = dms_data.
    CATCH cx_sy_conversion_data_loss .
    CATCH cx_xslt_exception INTO xslt_error.
      xslt_message = xslt_error->get_text( ).
      WRITE:/ xslt_message .

  ENDTRY.

  CREATE OBJECT dms_model
    EXPORTING
      dms_data_in = dms_data.

  response_data = dms_model->submit( ).

  READ TABLE response_data-messages INTO ls_message WITH KEY type = 'E'.
  IF sy-subrc <> 0.
    CALL FUNCTION 'BAPI_TRANSACTION_COMMIT'.
  ELSE.
    CALL FUNCTION 'BAPI_TRANSACTION_ROLLBACK'.
  ENDIF.



  DATA lv_json TYPE string.

  CALL METHOD zcl_abap_utilities=>generate_json_string
    EXPORTING
      lt_data = response_data
    RECEIVING
      result  = lv_json.

  CALL METHOD server->response->set_cdata( data = lv_json ).

ENDMETHOD.
ENDCLASS.
