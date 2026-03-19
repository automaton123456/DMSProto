We have built this SAP application inside SAP with UI5 but we want to create a version with no dependencies on SAP or an ERP. We will have an equipment feed, a work order feed, A workflow engine 
and an upload attachments feed ideally in react on a nodejs server.

How can we build something with very similar functionality but it is built in react and uses a workflow engine and db outside of SAP. We should be able to bolt any system onto the back of this to provide, equipment's, functional locations, and upload the attachments.

We don't have functional locations or notifications or a DMS system any more.

The Functional locations is built up from the equipment hierarchy in EBS 


The SAP tables for our DMS document is 


ZPM_DMS_DATA

DMS data for requests with workflow

MANDT	MANDT	CLNT	3	0	Client
DMS_ID	ZPM_DMS_ID	CHAR	32	0	DMS Id
DOC_TYPE	DOKAR	CHAR	3	0	Document Type
DOC_GROUP	ZPM_DMS_DOC_GROUP	CHAR	3	0	Document group
DOC_DATE	ZPM_DMS_CHAR_VALUE	STRING	0	0	Characteristic value
MANU_NAME	ZPM_DMS_CHAR_VALUE	STRING	0	0	Characteristic value
MANU_SERIAL	ZPM_DMS_CHAR_VALUE	STRING	0	0	Characteristic value
ALERT_NUMBER	ZPM_DMS_CHAR_VALUE	STRING	0	0	Characteristic value
CERT_AUTH	ZPM_DMS_CHAR_VALUE	STRING	0	0	Characteristic value
CERT_NUM	ZPM_DMS_CHAR_VALUE	STRING	0	0	Characteristic value
ADD_DESCRIPTION	ZPM_DMS_CHAR_VALUE	STRING	0	0	Characteristic value
DOC_LOCATION	ZPM_DMS_CHAR_VALUE	STRING	0	0	Characteristic value
MANU_PART	ZPM_DMS_CHAR_VALUE	STRING	0	0	Characteristic value
EQUIP_MASTER	EQUNR	CHAR	18	0	Equipment Number
FUNC_LOCATION	TPLNR	CHAR	30	0	Functional Location
MATERIAL_MASTER	MATNR	CHAR	18	0	Material Number
WF_ID	SWW_WIID	NUMC	12	0	Work item ID
ORIGINATOR	ZPM_DMS_ORIGINATOR	CHAR	60	0	Originator
WORK_ORDER	CHAR12	CHAR	12	0	Character Field of Length 12
ORIGINATOR_UNAME	XUBNAME	CHAR	12	0	User Name in User Master Record
STATUS	ZPM_WF_STATUS	CHAR	10	0	Status for workflow
STATUS_TEXT	ZPM_WF_STATUS_TEXT	CHAR	1333	0	Status text description
REJECTION_DETAILS	ZPM_WF_STATUS_TEXT	CHAR	1333	0	Status text description


ZPM_DMS_DATA_OL

Object links

MANDT	MANDT	CLNT	3	0	Client
DMS_ID	ZPM_DMS_ID	CHAR	32	0	DMS Id
ITEM	NUMC4	NUMC	4	0	Count parameters
WORK_ORDER	AUFNR	CHAR	12	0	Order Number
WORK_ORDER_TXT	ZTEXT_STRING	STRING	0	0	Generic string
START_DATE	CO_GSTRP	DATS	8	0	Basic start date
EQUIPMENT	EQUNR	CHAR	18	0	Equipment Number
EQUIPMENT_TXT	ZTEXT_STRING	STRING	0	0	Generic string
MANU_SER_NO	SERGE	CHAR	30	0	Manufacturer serial number
FUNC_LOCATION	TPLNR	CHAR	30	0	Functional Location
FUNC_LOCATION_TXT	ZTEXT_STRING	STRING	0	0	Generic string
MATERIAL	MATNR	CHAR	18	0	Material Number
MATERIAL_TXT	ZTEXT_STRING	STRING	0	0	Generic string



ZPM_DMS_CL_OBJ

MANDT	MANDT	CLNT	3	0	Client
DOC_GROUP	ZPM_DMS_DOC_GROUP	CHAR	3	0	Document group
DOC_DATE_VIS	ZPM_DMS_DOC_DATE_VIS	CHAR	4	0	Visibility setting for field
MANU_NAME_VIS	ZPM_DMS_MANUFACTURER_VIS	CHAR	4	0	Visibility setting for field
MANU_SERIAL_VIS	ZPM_DMS_MANUFACTURER_SN_VIS	CHAR	4	0	Visibility setting for field
ALERT_NUMBER_VIS	ZPM_DMS_ALERT_NUMBER	CHAR	4	0	Visibility setting for field
CERT_AUTH_VIS	ZPM_DMS_CERT_AUTHORITY_VIS	CHAR	4	0	Visibility setting for field
CERT_NUM_VIS	ZPM_DMS_CERT_NUMBER	CHAR	4	0	Visibility setting for field
ADD_DESCRIPTION_VIS	ZPM_DMS_ADD_DESCRIPTION_VIS	CHAR	4	0	Visibility setting for field
DOC_LOCATION_VIS	ZPM_DMS_DOC_LOCATION	CHAR	4	0	Document location visibility
WORK_ORDER_VIS	ZPM_DMS_WORK_ORDER_VIS	CHAR	4	0	Visibility setting for field
FUNC_LOCATION_VIS	ZPM_DMS_FUNC_LOCATION_VIS	CHAR	4	0	Visibility setting for field
EQUIP_MASTER_VIS	ZPM_DMS_EQUIP_MASTER_VIS	CHAR	4	0	Visibility setting for field
MATERIAL_MASTER_VIS	ZPM_DMS_MATERIAL_MASTER_VIS	CHAR	4	0	Visibility setting for field
MANU_PART_NUM_VIS	ZPM_DMS_MANU_PART_NO_VIS	CHAR	4	0	Visibility setting for field



        No display
M	Mandatory
O	Optional
D	Display only
M*	Multiple entries, 1 entry mandatory
M**	1 entry mandatory, validated with logic
MD	Mandatory display only
MO	1 object in row is mandatory(All OL columns must be same)
AMO	Mandatory for approvers only

Doc Group Doc Date Manufactur Manu S/N Alert Num Cert Auth Cert Num Add Desc Doc locati Work Order Func Loc Equipment Material Manu Part

AC        M                                                         M        M          M*         D
AD        M        O                             O                  M        M                     MO       MO
CA        M                                                         M        M                     MO       MO
CE        M        M          O                  M         M        O        M          AMO        MO       MO                 O
CM        M        M          O                  M         M        O        M                     MO                 MO
CO        M        M          O                            M        O        M          AMO        MO       MO        D
CT        M        M                                                M        M
DF        M                                                         M        M                     O        O         O
DW        M        M          O                                     O        M                     MO       MO        MO
EA        M        M                   M                            M        M                     M*
EV        M                                                         M        M          M*         D
EX                 M                                       M                 M
HZ        M                                      O                  M        M                     MO       MO
MA        M        M          O                                     O        M                     MO       MO        MO
MC        M                                                         M        M                     O        O         O
PC        M                   O                                     O        M                     MO       MO        MD
RA        M                                      M         M        M        M                     MO       O
RR        M                                      M                  O        M                     MO       MO
SC        M        M          O                                     O        M                     MO       MO        MO
SL        M        M          O                                     O        M                     MO       MO        MO
ST        M                                      O                  M        M                     M*       M*
TP        M        M          M                            O        O        M          O          MO       MO
VR        M                                      M                  M        M                     MO       MO




