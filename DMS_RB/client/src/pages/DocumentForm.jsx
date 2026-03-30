import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';
import Breadcrumb from 'react-bootstrap/Breadcrumb';
import Badge from 'react-bootstrap/Badge';
import Icon from '@mdi/react';
import {
  mdiCloudUploadOutline, mdiFileOutline, mdiPaperclip, mdiDownload,
  mdiTrashCanOutline, mdiSend, mdiContentSaveOutline, mdiCheck, mdiClose,
  mdiArrowLeft, mdiHome, mdiMagnify
} from '@mdi/js';
import { useAuth } from '../context/AuthContext.jsx';
import WorkflowTracker from '../components/WorkflowTracker.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const FIELD_LABELS = {
  docDate: 'Document Date',
  manuName: 'Manufacturer Name',
  manuSerial: 'Manufacturer Serial No',
  alertNum: 'Alert Number',
  certAuth: 'Certifying Authority',
  certNum: 'Certificate Number',
  addDesc: 'Additional Description',
  docLoc: 'Document Location'
};

const EMPTY_OBJECT_LINK = {
  workOrder: '',
  workOrderText: '',
  equipment: '',
  equipmentText: ''
};

export default function DocumentForm({ mode: initialMode }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [doc, setDoc] = useState(null);
  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [rigs, setRigs] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [docGroups, setDocGroups] = useState([]);
  const [fieldConfig, setFieldConfig] = useState(null);

  const [rig, setRig] = useState(searchParams.get('rig') || '');
  const [docType, setDocType] = useState(searchParams.get('docType') || '');
  const [docGroup, setDocGroup] = useState(searchParams.get('docGroup') || '');
  const [classifications, setClassifications] = useState({});
  const [objectLinks, setObjectLinks] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);

  const [woResults, setWoResults] = useState([]);
  const [eqResults, setEqResults] = useState([]);
  const [activeSearch, setActiveSearch] = useState(null);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);

  const [woHelp, setWoHelp] = useState({ open: false, rowIdx: null, search: '', results: [], searching: false });
  const [eqHelp, setEqHelp] = useState({ open: false, rowIdx: null, search: '', results: [], searching: false });

  const fileInputRef = useRef();
  const [dragover, setDragover] = useState(false);

  useEffect(() => {
    fetch('/api/config/document-types').then(r => r.json()).then(setDocTypes);
    fetch('/api/rigs').then(r => r.json()).then(setRigs);
  }, []);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/documents/${id}`)
      .then(r => r.json())
      .then(data => {
        setDoc(data);
        setRig(data.rig);
        setDocType(data.docType);
        setDocGroup(data.docGroup);
        setClassifications(data.classifications || {});
        setObjectLinks(data.objectLinks || []);
        setAttachments(data.attachments || []);

        const isApprover = currentUser && data.workflow && isApproverForDoc(data, currentUser.username);
        const isOriginator = data.originatorUsername === currentUser?.username;

        if (initialMode === 'approve' && isApprover) {
          setMode('approve');
        } else if (isOriginator && (data.status === 'Draft' || data.status === 'Rejected')) {
          setMode('edit');
        } else {
          setMode('readonly');
        }
        setLoading(false);
      })
      .catch(() => { setError('Document not found'); setLoading(false); });
  }, [id, currentUser]);

  useEffect(() => {
    if (!docType) { setDocGroups([]); return; }
    fetch(`/api/config/document-groups/${docType}`).then(r => r.json()).then(setDocGroups);
  }, [docType]);

  useEffect(() => {
    if (!docGroup) { setFieldConfig(null); return; }
    fetch(`/api/config/field-config/${docGroup}`)
      .then(r => r.json())
      .then(config => {
        setFieldConfig(config);
      });
  }, [docGroup]);

  useEffect(() => {
    if (!fieldConfig || objectLinks.length > 0) return;

    const needsDefaultObjectLink =
      fieldConfig.workOrder === 'MO' ||
      fieldConfig.workOrder === 'AMO' ||
      fieldConfig.equipment === 'MO' ||
      fieldConfig.equipment === 'AMO';

    if (needsDefaultObjectLink) {
      setObjectLinks([EMPTY_OBJECT_LINK]);
    }
  }, [fieldConfig, objectLinks.length]);

  function isApproverForDoc(doc, username) {
    if (!doc?.workflow?.required) return false;
    if (doc.workflow.currentStep === 'msv') return doc.workflow.steps?.[0]?.assignedApprovers?.includes(username);
    if (doc.workflow.currentStep === 'em') return doc.workflow.steps?.[1]?.assignedApprovers?.includes(username);
    return false;
  }

  const isReadOnly = mode === 'readonly' || mode === 'approve';

  const searchWO = async (search) => {
    if (!search || search.length < 2) { setWoResults([]); return; }
    const res = await fetch(`/api/workorders?search=${encodeURIComponent(search)}&rig=${rig}`);
    setWoResults(await res.json());
  };

  const searchEQ = async (search) => {
    if (!search || search.length < 2) { setEqResults([]); return; }
    const res = await fetch(`/api/equipment?search=${encodeURIComponent(search)}&rig=${rig}`);
    setEqResults(await res.json());
  };

  const openWOHelp = (rowIdx) => setWoHelp({ open: true, rowIdx, search: '', results: [], searching: false });
  const openEQHelp = (rowIdx) => setEqHelp({ open: true, rowIdx, search: '', results: [], searching: false });

  const runWOHelpSearch = async () => {
    if (!woHelp.search.trim()) return;
    setWoHelp(prev => ({ ...prev, searching: true, results: [] }));
    const res = await fetch(`/api/workorders?search=${encodeURIComponent(woHelp.search)}&rig=${rig}`);
    const data = await res.json();
    setWoHelp(prev => ({ ...prev, results: Array.isArray(data) ? data : [], searching: false }));
  };

  const runEQHelpSearch = async () => {
    if (!eqHelp.search.trim()) return;
    setEqHelp(prev => ({ ...prev, searching: true, results: [] }));
    const res = await fetch(`/api/equipment?search=${encodeURIComponent(eqHelp.search)}&rig=${rig}`);
    const data = await res.json();
    setEqHelp(prev => ({ ...prev, results: Array.isArray(data) ? data : [], searching: false }));
  };

  const selectWO = (idx, wo) => {
    setObjectLinks(prev => prev.map((l, i) => i === idx ? {
      ...l, workOrder: wo.WipEntityName, workOrderText: wo.Description, owningDepartmentId: wo.OwningDepartmentId
    } : l));
    setWoResults([]); setActiveSearch(null);
  };

  const selectEQ = (idx, eq) => {
    setObjectLinks(prev => prev.map((l, i) => i === idx ? {
      ...l, equipment: eq.assetNumber, equipmentText: eq.description
    } : l));
    setEqResults([]); setActiveSearch(null);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragover(false);
    const files = Array.from(e.dataTransfer?.files || e.target.files || []);
    setPendingFiles(prev => [...prev, ...files]);
  };

  const validate = () => {
    if (!rig) return 'Please select a Rig';
    if (!docType) return 'Please select a Document Type';
    if (!docGroup) return 'Please select a Document Group';
    if (!fieldConfig) return 'Field configuration not loaded';
    for (const [field, vis] of Object.entries(fieldConfig)) {
      if (vis === 'M' || vis === 'M*') {
        if (!classifications[field]) return `${FIELD_LABELS[field] || field} is required`;
      }
    }
    if (pendingFiles.length === 0 && attachments.length === 0) return 'At least one attachment is required';
    return null;
  };

  const uploadPendingFiles = async (docId) => {
    if (pendingFiles.length === 0) return;
    const formData = new FormData();
    pendingFiles.forEach(f => formData.append('files', f));
    await fetch(`/api/documents/${docId}/attachments`, { method: 'POST', body: formData });
    setPendingFiles([]);
  };

  const handleSave = async (action) => {
    if (action === 'submit') {
      const err = validate();
      if (err) { setError(err); return; }
    }
    setError('');
    setSaving(true);
    try {
      const body = { currentUser: currentUser.username, action, rig, docType, docGroup, classifications, objectLinks };
      let result;
      if (id) {
        const res = await fetch(`/api/documents/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        result = await res.json();
      } else {
        const res = await fetch('/api/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        result = await res.json();
      }
      if (result.error) { setError(result.error); setSaving(false); return; }
      await uploadPendingFiles(result.documentId);
      if (action === 'draft') {
        navigate('/my-documents');
      } else {
        setSuccessInfo({ documentId: result.documentId, status: result.status || 'Submitted' });
      }
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const handleApprove = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentUser: currentUser.username })
      });
      const updated = await res.json();
      if (updated.error) { setError(updated.error); setSaving(false); return; }
      setDoc(updated); setMode('readonly'); setShowApproveModal(false);
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const handleReject = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentUser: currentUser.username, reason: rejectReason })
      });
      const updated = await res.json();
      if (updated.error) { setError(updated.error); setSaving(false); return; }
      setDoc(updated); setMode('readonly'); setShowRejectModal(false); setRejectReason('');
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this draft?')) return;
    await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    navigate('/my-documents');
  };

  const removeAttachment = async (filename) => {
    if (!id) return;
    await fetch(`/api/documents/${id}/attachments/${encodeURIComponent(filename)}`, { method: 'DELETE' });
    setAttachments(prev => prev.filter(a => a !== filename));
  };

  // ── Loading ──
  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <Spinner animation="border" variant="primary" />
    </div>
  );

  // ── Success screen ──
  if (successInfo) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center text-center"
        style={{ minHeight: '70vh', gap: '1.25rem', padding: '2rem' }}>
        <div className="bg-success rounded-circle d-flex align-items-center justify-content-center shadow"
          style={{ width: 80, height: 80 }}>
          <Icon path={mdiCheck} size={2} color="white" />
        </div>
        <h3 className="fw-bold text-success">Document Submitted Successfully</h3>
        <p className="fw-semibold">
          Document <span className="text-primary">{successInfo.documentId}</span> has been created
        </p>
        <Alert variant="info" style={{ maxWidth: 480, textAlign: 'left' }}>
          <strong>Submitted for Approval</strong><br />
          Your document has been submitted and is now pending review by the designated approvers.
          You will receive a notification once it has been reviewed.
        </Alert>
        <p className="text-muted small">You can track the status in <strong>My Documents</strong></p>
        <div className="d-flex gap-2">
          <Button variant="primary" onClick={() => navigate('/')}><Icon path={mdiHome} size={0.7} className="me-1" />Go to Home</Button>
          <Button variant="outline-secondary" onClick={() => navigate('/my-documents')}>My Documents</Button>
        </div>
      </div>
    );
  }

  const isNewForm = !id;
  const pageTitle = isNewForm ? 'Create DMS Document' : `Document ${doc?.documentId || id}`;

  return (
    <div className="page-container">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-3" style={{ fontSize: '0.875rem' }}>
        <Breadcrumb.Item onClick={() => navigate('/')}>Home</Breadcrumb.Item>
        {mode === 'approve' || mode === 'readonly' ? (
          <Breadcrumb.Item onClick={() => navigate('/inbox')}>Inbox</Breadcrumb.Item>
        ) : (
          <Breadcrumb.Item onClick={() => navigate('/my-documents')}>My Documents</Breadcrumb.Item>
        )}
        <Breadcrumb.Item active>{pageTitle}</Breadcrumb.Item>
      </Breadcrumb>

      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4 flex-wrap">
        <h3 className="fw-bold mb-0">{pageTitle}</h3>
        {doc?.status && <StatusBadge status={doc.status} />}
      </div>

      {/* Banners */}
      {doc?.status === 'Rejected' && (
        <Alert variant="danger" className="mb-3">
          {doc.workflow?.rejectionReason
            ? `Rejected: ${doc.workflow.rejectionReason}`
            : 'This document was rejected. You may edit and resubmit.'}
        </Alert>
      )}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')} className="mb-3">
          {error}
        </Alert>
      )}

      {/* ── Section 1: Document Classification ── */}
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <div className="section-header">Document Classification</div>
          <Row className="g-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label className="fw-semibold">
                  Rig {!isReadOnly && <span className="text-danger">*</span>}
                </Form.Label>
                {isReadOnly ? (
                  <div className="fw-semibold pt-1">{rig || '—'}</div>
                ) : (
                  <Form.Select value={rig} onChange={e => setRig(e.target.value)}>
                    <option value="">— Select Rig —</option>
                    {rigs.map(r => <option key={r.id} value={r.id}>{r.id} — {r.name}</option>)}
                  </Form.Select>
                )}
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label className="fw-semibold">
                  Document Type {!isReadOnly && <span className="text-danger">*</span>}
                </Form.Label>
                {isReadOnly ? (
                  <div className="fw-semibold pt-1">
                    {docTypes.find(t => t.code === docType)?.description || docType || '—'}
                  </div>
                ) : (
                  <Form.Select value={docType} onChange={e => { setDocType(e.target.value); setDocGroup(''); }}>
                    <option value="">— Select Type —</option>
                    {docTypes.map(t => <option key={t.code} value={t.code}>{t.code} — {t.description}</option>)}
                  </Form.Select>
                )}
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label className="fw-semibold">
                  Document Group {!isReadOnly && <span className="text-danger">*</span>}
                </Form.Label>
                {isReadOnly ? (
                  <div className="fw-semibold pt-1">
                    {docGroups.find(g => g.code === docGroup)?.description || docGroup || '—'}
                  </div>
                ) : (
                  <Form.Select value={docGroup} onChange={e => setDocGroup(e.target.value)} disabled={!docType}>
                    <option value="">— Select Group —</option>
                    {docGroups.map(g => <option key={g.code} value={g.code}>{g.code} — {g.description}</option>)}
                  </Form.Select>
                )}
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* ── Section 2: Classification Details (dynamic) ── */}
      {fieldConfig && (
        <Card className="mb-4 shadow-sm">
          <Card.Body>
            <div className="section-header">Classification Details</div>
            <Row className="g-3">
              {Object.entries(FIELD_LABELS).map(([key, label]) => {
                const vis = fieldConfig[key];
                if (!vis || vis === 'D') return null;
                const isMandatory = vis === 'M' || vis === 'M*' || vis === 'AMO';
                const value = classifications[key] || '';
                return (
                  <Col key={key} md={6} lg={4}>
                    <Form.Group>
                      <Form.Label className="fw-semibold">
                        {label}
                        {isMandatory && !isReadOnly && <span className="text-danger ms-1">*</span>}
                        {vis === 'M*' && <span className="text-muted ms-1" style={{ fontSize: '0.72rem' }}>(multiple)</span>}
                      </Form.Label>
                      {isReadOnly ? (
                        <div className={`fw-semibold pt-1 ${value ? '' : 'text-muted'}`}>
                          {value || '—'}
                        </div>
                      ) : key === 'docDate' ? (
                        <Form.Control
                          type="date"
                          value={value}
                          onChange={e => setClassifications(prev => ({ ...prev, [key]: e.target.value }))}
                        />
                      ) : (
                        <Form.Control
                          type="text"
                          value={value}
                          onChange={e => setClassifications(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder={key === 'docLoc' ? (rig || 'Location') : `Enter ${label.toLowerCase()}`}
                        />
                      )}
                    </Form.Group>
                  </Col>
                );
              })}
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* ── Section 3: Object Links ── */}
      {fieldConfig && (fieldConfig.workOrder || fieldConfig.equipment) && (
        <Card className="mb-4 shadow-sm">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center section-header">
              <span>Object Links</span>
              {!isReadOnly && (
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => setObjectLinks(prev => [...prev, { ...EMPTY_OBJECT_LINK }])}
                >
                  + Add Row
                </Button>
              )}
            </div>

            {objectLinks.length === 0 ? (
              <p className="text-muted mb-0" style={{ fontSize: '0.875rem' }}>
                {isReadOnly ? 'No object links' : 'Click "Add Row" to link work orders or equipment'}
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="object-links-table">
                  <thead>
                    <tr>
                      {fieldConfig.workOrder && <th>Work Order</th>}
                      {fieldConfig.workOrder && <th>WO Description</th>}
                      {fieldConfig.equipment && <th>Equipment</th>}
                      {fieldConfig.equipment && <th>Equipment Text</th>}
                      {!isReadOnly && <th style={{ width: 50 }}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {objectLinks.map((link, idx) => (
                      <tr key={idx}>
                        {fieldConfig.workOrder && (
                          <td style={{ position: 'relative', minWidth: 180 }}>
                            {isReadOnly ? (
                              <span className="fw-semibold">{link.workOrder || '—'}</span>
                            ) : (
                              <div>
                                <div className="d-flex gap-1">
                                  <Form.Control
                                    size="sm"
                                    value={link.workOrder}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setObjectLinks(prev => prev.map((l, i) => i === idx ? { ...l, workOrder: val, workOrderText: '' } : l));
                                      setActiveSearch(`wo-${idx}`);
                                      searchWO(val);
                                    }}
                                    placeholder="Work order..."
                                  />
                                  <Button size="sm" variant="outline-secondary" onClick={() => openWOHelp(idx)} title="Search"><Icon path={mdiMagnify} size={0.6} /></Button>
                                </div>
                                {activeSearch === `wo-${idx}` && woResults.length > 0 && (
                                  <div className="autocomplete-list">
                                    {woResults.map(wo => (
                                      <div key={wo.WipEntityId} className="autocomplete-item" onClick={() => selectWO(idx, wo)}>
                                        <div className="fw-semibold">{wo.WipEntityName}</div>
                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{wo.Description?.slice(0, 80)}</div>
                                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>Status: {wo.Status} | {wo.WorkOrderTypeDisp}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        )}
                        {fieldConfig.workOrder && (
                          <td className="text-muted" style={{ fontSize: '0.8rem', maxWidth: 200 }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {link.workOrderText || '—'}
                            </div>
                          </td>
                        )}
                        {fieldConfig.equipment && (
                          <td style={{ position: 'relative', minWidth: 180 }}>
                            {isReadOnly ? (
                              <span className="fw-semibold">{link.equipment || '—'}</span>
                            ) : (
                              <div>
                                <div className="d-flex gap-1">
                                  <Form.Control
                                    size="sm"
                                    value={link.equipment}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setObjectLinks(prev => prev.map((l, i) => i === idx ? { ...l, equipment: val, equipmentText: '' } : l));
                                      setActiveSearch(`eq-${idx}`);
                                      searchEQ(val);
                                    }}
                                    placeholder="Equipment..."
                                  />
                                  <Button size="sm" variant="outline-secondary" onClick={() => openEQHelp(idx)} title="Search"><Icon path={mdiMagnify} size={0.6} /></Button>
                                </div>
                                {activeSearch === `eq-${idx}` && eqResults.length > 0 && (
                                  <div className="autocomplete-list">
                                    {eqResults.map(eq => (
                                      <div key={eq.assetNumber} className="autocomplete-item" onClick={() => selectEQ(idx, eq)}>
                                        <div className="fw-semibold">{eq.assetNumber}</div>
                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{eq.description}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        )}
                        {fieldConfig.equipment && (
                          <td className="text-muted" style={{ fontSize: '0.8rem', maxWidth: 200 }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {link.equipmentText || '—'}
                            </div>
                          </td>
                        )}
                        {!isReadOnly && (
                          <td>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => setObjectLinks(prev => prev.filter((_, i) => i !== idx))}
                            >
                              <Icon path={mdiTrashCanOutline} size={0.65} />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {/* ── Section 4: Attachments ── */}
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <div className="section-header d-flex align-items-center gap-2">
            Attachments
            {(attachments.length + pendingFiles.length) > 0 && (
              <Badge bg="primary" style={{ fontSize: '0.72rem' }}>
                {attachments.length + pendingFiles.length}
              </Badge>
            )}
          </div>

          {!isReadOnly && (
            <div
              className={`drop-zone mb-3 ${dragover ? 'dragover' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragover(true); }}
              onDragLeave={() => setDragover(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon path={mdiCloudUploadOutline} size={1.8} className="text-primary mb-1" />
              <div>
                <strong>Drag & drop files here</strong> or click to browse<br />
                <span className="text-muted" style={{ fontSize: '0.75rem' }}>PDF, DOC, XLS, images — max 20MB each</span>
              </div>
              <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileDrop} />
            </div>
          )}

          {pendingFiles.length > 0 && (
            <div className="mb-3">
              <div className="fw-semibold text-muted mb-2" style={{ fontSize: '0.78rem' }}>
                FILES TO UPLOAD ({pendingFiles.length})
              </div>
              {pendingFiles.map((f, idx) => (
                <div key={idx} className="d-flex align-items-center gap-2 p-2 rounded mb-1 bg-primary-subtle">
                  <Icon path={mdiFileOutline} size={0.8} className="text-muted" />
                  <span className="flex-grow-1" style={{ fontSize: '0.85rem' }}>{f.name}</span>
                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                  <Button size="sm" variant="outline-danger" onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== idx))}><Icon path={mdiClose} size={0.6} /></Button>
                </div>
              ))}
            </div>
          )}

          {attachments.length > 0 ? (
            <div>
              {attachments.length > 0 && pendingFiles.length > 0 && (
                <div className="fw-semibold text-muted mb-2" style={{ fontSize: '0.78rem' }}>
                  SAVED ATTACHMENTS ({attachments.length})
                </div>
              )}
              {attachments.map((filename, idx) => (
                <div key={idx} className="d-flex align-items-center gap-2 p-2 border-bottom">
                  <Icon path={mdiPaperclip} size={0.8} className="text-muted" />
                  <span className="flex-grow-1" style={{ fontSize: '0.85rem' }}>{filename}</span>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => window.open(`/api/documents/${id}/attachments/${encodeURIComponent(filename)}`)}
                  >
                    <Icon path={mdiDownload} size={0.65} />
                  </Button>
                  {!isReadOnly && (
                    <Button size="sm" variant="outline-danger" onClick={() => removeAttachment(filename)}><Icon path={mdiTrashCanOutline} size={0.65} /></Button>
                  )}
                </div>
              ))}
            </div>
          ) : !pendingFiles.length ? (
            <p className="text-muted text-center mb-0" style={{ fontSize: '0.875rem' }}>
              No attachments {isReadOnly ? '' : '— drag files above or click to upload'}
            </p>
          ) : null}
        </Card.Body>
      </Card>

      {/* ── Section 5: Workflow ── */}
      {doc?.workflow && (
        <Card className="mb-4 shadow-sm">
          <Card.Body>
            <div className="section-header">Workflow Status</div>
            <WorkflowTracker
              workflow={doc.workflow}
              originatorName={doc.originator}
              createdDate={doc.createdDate}
            />
          </Card.Body>
        </Card>
      )}

      {/* ── Action Bar ── */}
      <div className="action-bar">
        {(mode === 'create' || mode === 'edit') && (
          <>
            <Button
              variant="primary"
              onClick={() => handleSave('submit')}
              disabled={saving}
            >
              <Icon path={mdiSend} size={0.7} className="me-1" />{doc?.status === 'Rejected' ? 'Resubmit' : 'Submit'}
            </Button>
            <Button variant="outline-secondary" onClick={() => handleSave('draft')} disabled={saving}>
              <Icon path={mdiContentSaveOutline} size={0.7} className="me-1" />Save as Draft
            </Button>
            <div className="flex-grow-1" />
            {doc?.status === 'Draft' && id && (
              <Button variant="outline-danger" onClick={handleDelete} disabled={saving}><Icon path={mdiTrashCanOutline} size={0.7} className="me-1" />Delete Draft</Button>
            )}
            <Button variant="link" className="text-muted" onClick={() => navigate(-1)} disabled={saving}>Cancel</Button>
          </>
        )}

        {mode === 'approve' && (
          <>
            <Button variant="success" onClick={() => setShowApproveModal(true)} disabled={saving}><Icon path={mdiCheck} size={0.7} className="me-1" />Approve</Button>
            <Button variant="danger" onClick={() => setShowRejectModal(true)} disabled={saving}><Icon path={mdiClose} size={0.7} className="me-1" />Reject</Button>
            <div className="flex-grow-1" />
            <Button variant="link" className="text-muted" onClick={() => navigate('/inbox')}><Icon path={mdiArrowLeft} size={0.7} className="me-1" />Back to Inbox</Button>
          </>
        )}

        {mode === 'readonly' && (
          <Button variant="link" className="text-muted" onClick={() => navigate(-1)}><Icon path={mdiArrowLeft} size={0.7} className="me-1" />Back</Button>
        )}

        {saving && <Spinner size="sm" animation="border" variant="primary" className="ms-2" />}
      </div>

      {/* Approve Modal */}
      <Modal show={showApproveModal} onHide={() => setShowApproveModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Approval</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to approve document <strong>{doc?.documentId}</strong>?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowApproveModal(false)}>Cancel</Button>
          <Button variant="success" onClick={handleApprove} disabled={saving}>
            {saving ? <Spinner size="sm" /> : <><Icon path={mdiCheck} size={0.7} className="me-1" />Approve</>}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Reject Modal */}
      <Modal show={showRejectModal} onHide={() => { setShowRejectModal(false); setRejectReason(''); }} centered>
        <Modal.Header closeButton>
          <Modal.Title>Reject Document</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Rejecting document <strong>{doc?.documentId}</strong>. A rejection reason is optional.</p>
          <Form.Group>
            <Form.Label>Rejection Reason (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Enter a reason for rejection..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => { setShowRejectModal(false); setRejectReason(''); }}>Cancel</Button>
          <Button variant="danger" onClick={handleReject} disabled={saving}>
            {saving ? <Spinner size="sm" /> : <><Icon path={mdiClose} size={0.7} className="me-1" />Reject</>}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* WO Help Modal */}
      <Modal show={woHelp.open} onHide={() => setWoHelp(p => ({ ...p, open: false }))} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Search Work Orders</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex gap-2 mb-3">
            <Form.Control
              placeholder="Search work orders..."
              value={woHelp.search}
              onChange={e => setWoHelp(p => ({ ...p, search: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && runWOHelpSearch()}
            />
            <Button variant="primary" onClick={runWOHelpSearch} disabled={woHelp.searching}>
              {woHelp.searching ? <Spinner size="sm" /> : <><Icon path={mdiMagnify} size={0.7} className="me-1" />Search</>}
            </Button>
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {woHelp.results.map(wo => (
              <div
                key={wo.WipEntityId}
                className="autocomplete-item border rounded mb-1"
                onClick={() => { selectWO(woHelp.rowIdx, wo); setWoHelp(p => ({ ...p, open: false })); }}
              >
                <div className="fw-semibold">{wo.WipEntityName}</div>
                <div className="text-muted small">{wo.Description}</div>
                <div className="text-muted" style={{ fontSize: '0.72rem' }}>Status: {wo.Status}</div>
              </div>
            ))}
            {woHelp.results.length === 0 && !woHelp.searching && woHelp.search && (
              <p className="text-muted text-center py-3">No results found</p>
            )}
          </div>
        </Modal.Body>
      </Modal>

      {/* EQ Help Modal */}
      <Modal show={eqHelp.open} onHide={() => setEqHelp(p => ({ ...p, open: false }))} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Search Equipment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex gap-2 mb-3">
            <Form.Control
              placeholder="Search equipment..."
              value={eqHelp.search}
              onChange={e => setEqHelp(p => ({ ...p, search: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && runEQHelpSearch()}
            />
            <Button variant="primary" onClick={runEQHelpSearch} disabled={eqHelp.searching}>
              {eqHelp.searching ? <Spinner size="sm" /> : <><Icon path={mdiMagnify} size={0.7} className="me-1" />Search</>}
            </Button>
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {eqHelp.results.map(eq => (
              <div
                key={eq.assetNumber}
                className="autocomplete-item border rounded mb-1"
                onClick={() => { selectEQ(eqHelp.rowIdx, eq); setEqHelp(p => ({ ...p, open: false })); }}
              >
                <div className="fw-semibold">{eq.assetNumber}</div>
                <div className="text-muted small">{eq.description}</div>
              </div>
            ))}
            {eqHelp.results.length === 0 && !eqHelp.searching && eqHelp.search && (
              <p className="text-muted text-center py-3">No results found</p>
            )}
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}
