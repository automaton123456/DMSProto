import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Title, Text, Card, Button, Select, Option, Input,
  Label, MessageStrip, Dialog, TextArea, BusyIndicator,
  Breadcrumbs, BreadcrumbsItem, Tag, Icon, Bar
} from '@ui5/webcomponents-react';
import { useAuth } from '../context/AuthContext.jsx';
import WorkflowTracker from '../components/WorkflowTracker.jsx';

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

const STATUS_STYLES = {
  'Draft': { background: '#f0f0f0', color: '#666' },
  'Approved': { background: '#e8f5e9', color: '#107e3e' },
  'Rejected': { background: '#fce4ec', color: '#b00' },
  'Pending MSV Approval': { background: '#fff3e0', color: '#b26000' },
  'Pending E&M Approval': { background: '#e3f2fd', color: '#0070f2' }
};

export default function DocumentForm({ mode: initialMode }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Data state
  const [doc, setDoc] = useState(null);
  const [mode, setMode] = useState(initialMode); // create, view, edit, approve
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Config data
  const [rigs, setRigs] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [docGroups, setDocGroups] = useState([]);
  const [fieldConfig, setFieldConfig] = useState(null);

  // Form values
  const [rig, setRig] = useState(searchParams.get('rig') || '');
  const [docType, setDocType] = useState(searchParams.get('docType') || '');
  const [docGroup, setDocGroup] = useState(searchParams.get('docGroup') || '');
  const [classifications, setClassifications] = useState({});
  const [objectLinks, setObjectLinks] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);

  // WO/Equipment search
  const [woSearch, setWoSearch] = useState('');
  const [woResults, setWoResults] = useState([]);
  const [eqSearch, setEqSearch] = useState('');
  const [eqResults, setEqResults] = useState([]);
  const [activeSearch, setActiveSearch] = useState(null); // 'wo-{idx}' or 'eq-{idx}'

  // Dialogs
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showApproveDialog, setShowApproveDialog] = useState(false);

  const fileInputRef = useRef();
  const [dragover, setDragover] = useState(false);

  // Load initial config
  useEffect(() => {
    fetch('/api/config/document-types').then(r => r.json()).then(setDocTypes);
    fetch('/api/rigs').then(r => r.json()).then(setRigs);
  }, []);

  // Load document if editing/viewing
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

        // Determine actual mode
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

  // Load doc groups when type changes
  useEffect(() => {
    if (!docType) { setDocGroups([]); return; }
    fetch(`/api/config/document-groups/${docType}`)
      .then(r => r.json())
      .then(setDocGroups);
  }, [docType]);

  // Load field config when group changes
  useEffect(() => {
    if (!docGroup) { setFieldConfig(null); return; }
    fetch(`/api/config/field-config/${docGroup}`)
      .then(r => r.json())
      .then(config => {
        setFieldConfig(config);
        // Auto-set docLoc from rig
        if (rig && !classifications.docLoc) {
          setClassifications(prev => ({ ...prev, docLoc: rig }));
        }
      });
  }, [docGroup]);

  // Auto-set docLoc when rig changes
  useEffect(() => {
    if (rig && fieldConfig?.docLoc) {
      setClassifications(prev => ({ ...prev, docLoc: rig }));
    }
  }, [rig]);

  function isApproverForDoc(doc, username) {
    if (!doc?.workflow?.required) return false;
    if (doc.workflow.currentStep === 'msv') {
      return doc.workflow.steps?.[0]?.assignedApprovers?.includes(username);
    }
    if (doc.workflow.currentStep === 'em') {
      return doc.workflow.steps?.[1]?.assignedApprovers?.includes(username);
    }
    return false;
  }

  const isReadOnly = mode === 'readonly' || mode === 'approve';

  // Work order search
  const searchWO = async (search) => {
    if (!search || search.length < 2) { setWoResults([]); return; }
    const res = await fetch(`/api/workorders?search=${encodeURIComponent(search)}&rig=${rig}`);
    const data = await res.json();
    setWoResults(data);
  };

  // Equipment search
  const searchEQ = async (search) => {
    if (!search || search.length < 2) { setEqResults([]); return; }
    const res = await fetch(`/api/equipment?search=${encodeURIComponent(search)}&rig=${rig}`);
    const data = await res.json();
    setEqResults(data);
  };

  const addObjectLink = () => {
    setObjectLinks(prev => [...prev, { workOrder: '', workOrderText: '', equipment: '', equipmentText: '' }]);
  };

  const removeObjectLink = (idx) => {
    setObjectLinks(prev => prev.filter((_, i) => i !== idx));
  };

  const selectWO = (idx, wo) => {
    setObjectLinks(prev => prev.map((l, i) => i === idx ? {
      ...l,
      workOrder: wo.WipEntityName,
      workOrderText: wo.Description,
      owningDepartmentId: wo.OwningDepartmentId
    } : l));
    setWoResults([]);
    setActiveSearch(null);
  };

  const selectEQ = (idx, eq) => {
    setObjectLinks(prev => prev.map((l, i) => i === idx ? {
      ...l,
      equipment: eq.assetNumber,
      equipmentText: eq.description
    } : l));
    setEqResults([]);
    setActiveSearch(null);
  };

  // File handling
  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragover(false);
    const files = Array.from(e.dataTransfer?.files || e.target.files || []);
    setPendingFiles(prev => [...prev, ...files]);
  };

  const removePendingFile = (idx) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const removeAttachment = async (filename) => {
    if (!id) return;
    await fetch(`/api/documents/${id}/attachments/${encodeURIComponent(filename)}`, { method: 'DELETE' });
    setAttachments(prev => prev.filter(a => a !== filename));
  };

  // Validate form
  const validate = () => {
    if (!rig) return 'Please select a Rig';
    if (!docType) return 'Please select a Document Type';
    if (!docGroup) return 'Please select a Document Group';
    if (!fieldConfig) return 'Field configuration not loaded';

    // Check mandatory fields
    for (const [field, vis] of Object.entries(fieldConfig)) {
      if (vis === 'M' || vis === 'M*') {
        if (!classifications[field]) {
          return `${FIELD_LABELS[field] || field} is required`;
        }
      }
    }

    if (pendingFiles.length === 0 && attachments.length === 0) {
      return 'At least one attachment is required';
    }
    return null;
  };

  // Upload pending files to a document
  const uploadPendingFiles = async (docId) => {
    if (pendingFiles.length === 0) return;
    const formData = new FormData();
    pendingFiles.forEach(f => formData.append('files', f));
    await fetch(`/api/documents/${docId}/attachments`, { method: 'POST', body: formData });
    setPendingFiles([]);
  };

  // Save / Submit
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
      navigate(action === 'draft' ? '/my-documents' : `/documents/${result.documentId}`);
    } catch (e) {
      setError(e.message);
    }
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
      setDoc(updated);
      setMode('readonly');
      setShowApproveDialog(false);
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
      setDoc(updated);
      setMode('readonly');
      setShowRejectDialog(false);
      setRejectReason('');
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this draft?')) return;
    await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    navigate('/my-documents');
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <BusyIndicator active size="L" />
    </div>
  );

  const isNewForm = !id;
  const pageTitle = isNewForm ? 'Create DMS Document' : `Document ${doc?.documentId || id}`;
  const statusStyle = STATUS_STYLES[doc?.status] || {};

  return (
    <div className="page-container">
      {/* Breadcrumb */}
      <Breadcrumbs style={{ marginBottom: '1rem' }}>
        <BreadcrumbsItem onClick={() => navigate('/')}>Home</BreadcrumbsItem>
        {mode === 'approve' || mode === 'readonly' ? (
          <BreadcrumbsItem onClick={() => navigate('/inbox')}>Inbox</BreadcrumbsItem>
        ) : (
          <BreadcrumbsItem onClick={() => navigate('/my-documents')}>My Documents</BreadcrumbsItem>
        )}
        <BreadcrumbsItem>{pageTitle}</BreadcrumbsItem>
      </Breadcrumbs>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <Title level="H2">{pageTitle}</Title>
        {doc?.status && (
          <span style={{
            ...statusStyle,
            padding: '0.3rem 0.9rem',
            borderRadius: '1rem',
            fontSize: '0.8rem',
            fontWeight: 700
          }}>
            {doc.status}
          </span>
        )}
      </div>

      {/* Rejection reason banner */}
      {doc?.status === 'Rejected' && doc?.workflow?.rejectionReason && (
        <MessageStrip design="Negative" style={{ marginBottom: '1rem' }} hideCloseButton>
          Rejected: {doc.workflow.rejectionReason}
        </MessageStrip>
      )}
      {doc?.status === 'Rejected' && !doc?.workflow?.rejectionReason && (
        <MessageStrip design="Negative" style={{ marginBottom: '1rem' }} hideCloseButton>
          This document was rejected. You may edit and resubmit.
        </MessageStrip>
      )}

      {error && (
        <MessageStrip design="Negative" style={{ marginBottom: '1rem' }} onClose={() => setError('')}>
          {error}
        </MessageStrip>
      )}

      {/* ── Section 1: Document Classification ── */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.25rem 1.5rem' }}>
          <Title level="H4" style={{ marginBottom: '1.25rem', paddingBottom: '0.5rem', borderBottom: '2px solid #0070f2' }}>
            Document Classification
          </Title>

          <div className="form-row">
            {/* Rig */}
            <div>
              <Label required={!isReadOnly}>Rig</Label>
              {isReadOnly ? (
                <div style={{ padding: '0.5rem 0', fontWeight: 500 }}>{rig || '—'}</div>
              ) : (
                <Select key={`rig-${rig}`} style={{ width: '100%' }} onChange={e => setRig(e.detail.selectedOption.dataset.value)}>
                  <Option data-value="" selected={!rig}>— Select Rig —</Option>
                  {rigs.map(r => <Option key={r.id} data-value={r.id} selected={r.id === rig}>{r.id} — {r.name}</Option>)}
                </Select>
              )}
            </div>

            {/* Doc Type */}
            <div>
              <Label required={!isReadOnly}>Document Type</Label>
              {isReadOnly ? (
                <div style={{ padding: '0.5rem 0', fontWeight: 500 }}>
                  {docTypes.find(t => t.code === docType)?.description || docType || '—'}
                </div>
              ) : (
                <Select key={`type-${docType}`} style={{ width: '100%' }} onChange={e => { setDocType(e.detail.selectedOption.dataset.value); setDocGroup(''); }}>
                  <Option data-value="" selected={!docType}>— Select Type —</Option>
                  {docTypes.map(t => <Option key={t.code} data-value={t.code} selected={t.code === docType}>{t.code} — {t.description}</Option>)}
                </Select>
              )}
            </div>

            {/* Doc Group */}
            <div>
              <Label required={!isReadOnly}>Document Group</Label>
              {isReadOnly ? (
                <div style={{ padding: '0.5rem 0', fontWeight: 500 }}>
                  {docGroups.find(g => g.code === docGroup)?.description || docGroup || '—'}
                </div>
              ) : (
                <Select key={`group-${docGroup}`} style={{ width: '100%' }} onChange={e => setDocGroup(e.detail.selectedOption.dataset.value)} disabled={!docType}>
                  <Option data-value="" selected={!docGroup}>— Select Group —</Option>
                  {docGroups.map(g => <Option key={g.code} data-value={g.code} selected={g.code === docGroup}>{g.code} — {g.description}</Option>)}
                </Select>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Section 2: Classification Fields (dynamic) ── */}
      {fieldConfig && (
        <Card style={{ marginBottom: '1.5rem' }}>
          <div style={{ padding: '1.25rem 1.5rem' }}>
            <Title level="H4" style={{ marginBottom: '1.25rem', paddingBottom: '0.5rem', borderBottom: '2px solid #0070f2' }}>
              Classification Details
            </Title>
            <div className="form-row">
              {Object.entries(FIELD_LABELS).map(([key, label]) => {
                const vis = fieldConfig[key];
                if (!vis || vis === 'D') return null; // skip hidden and display-only

                const isMandatory = vis === 'M' || vis === 'M*' || vis === 'AMO';
                const value = classifications[key] || '';

                return (
                  <div key={key}>
                    <Label required={isMandatory && !isReadOnly}>
                      {label}
                      {vis === 'M*' && <span style={{ fontSize: '0.72rem', color: '#6a6d70', marginLeft: '0.25rem' }}>(multiple allowed)</span>}
                    </Label>
                    {isReadOnly ? (
                      <div style={{ padding: '0.5rem 0', fontWeight: 500, color: value ? '#32363a' : '#6a6d70' }}>
                        {value || '—'}
                      </div>
                    ) : key === 'docDate' ? (
                      <input
                        type="date"
                        value={value}
                        onChange={e => setClassifications(prev => ({ ...prev, [key]: e.target.value }))}
                        style={{
                          width: '100%',
                          height: '2.25rem',
                          padding: '0 0.625rem',
                          border: '1px solid var(--sapField_BorderColor, #bfbfbf)',
                          borderRadius: '0.25rem',
                          fontSize: '0.875rem',
                          fontFamily: 'inherit',
                          color: 'var(--sapTextColor, #32363a)',
                          background: 'var(--sapField_Background, #fff)',
                          outline: 'none',
                          boxSizing: 'border-box',
                          cursor: 'pointer'
                        }}
                        onFocus={e => e.target.style.borderColor = 'var(--sapField_Focus_BorderColor, #0070f2)'}
                        onBlur={e => e.target.style.borderColor = 'var(--sapField_BorderColor, #bfbfbf)'}
                      />
                    ) : key === 'docLoc' ? (
                      <Input
                        style={{ width: '100%' }}
                        value={value}
                        onInput={e => setClassifications(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder={rig || 'Location'}
                      />
                    ) : (
                      <Input
                        style={{ width: '100%' }}
                        value={value}
                        onInput={e => setClassifications(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder={`Enter ${label.toLowerCase()}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* ── Section 3: Object Links ── */}
      {fieldConfig && (fieldConfig.workOrder || fieldConfig.equipment) && (
        <Card style={{ marginBottom: '1.5rem' }}>
          <div style={{ padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.5rem', borderBottom: '2px solid #0070f2' }}>
              <Title level="H4">Object Links</Title>
              {!isReadOnly && (
                <Button design="Transparent" icon="add" onClick={addObjectLink}>Add Row</Button>
              )}
            </div>

            {objectLinks.length === 0 ? (
              <div style={{ color: '#6a6d70', fontSize: '0.875rem', padding: '0.5rem 0' }}>
                {isReadOnly ? 'No object links' : 'Click "Add Row" to link work orders or equipment'}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="object-links-table">
                  <thead>
                    <tr>
                      {fieldConfig.workOrder && <th>Work Order</th>}
                      {fieldConfig.workOrder && <th>Description</th>}
                      {fieldConfig.equipment && <th>Equipment</th>}
                      {fieldConfig.equipment && <th>Equipment Text</th>}
                      {!isReadOnly && <th style={{ width: '60px' }}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {objectLinks.map((link, idx) => (
                      <tr key={idx}>
                        {fieldConfig.workOrder && (
                          <td style={{ position: 'relative' }}>
                            {isReadOnly ? (
                              <span style={{ fontWeight: 500 }}>{link.workOrder || '—'}</span>
                            ) : (
                              <div>
                                <Input
                                  value={link.workOrder}
                                  onInput={e => {
                                    const val = e.target.value;
                                    setObjectLinks(prev => prev.map((l, i) => i === idx ? { ...l, workOrder: val, workOrderText: '' } : l));
                                    setWoSearch(val);
                                    setActiveSearch(`wo-${idx}`);
                                    searchWO(val);
                                  }}
                                  placeholder="Search work orders..."
                                  style={{ width: '100%' }}
                                />
                                {activeSearch === `wo-${idx}` && woResults.length > 0 && (
                                  <div style={{
                                    position: 'absolute', zIndex: 100, background: 'white',
                                    border: '1px solid #e8e8e8', borderRadius: '4px',
                                    maxHeight: '200px', overflowY: 'auto',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: '300px'
                                  }}>
                                    {woResults.map(wo => (
                                      <div
                                        key={wo.WipEntityId}
                                        onClick={() => selectWO(idx, wo)}
                                        style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem', borderBottom: '1px solid #f0f0f0' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                      >
                                        <div style={{ fontWeight: 600 }}>{wo.WipEntityName}</div>
                                        <div style={{ color: '#6a6d70', fontSize: '0.75rem' }}>{wo.Description?.slice(0, 80)}</div>
                                        <div style={{ color: '#6a6d70', fontSize: '0.72rem' }}>Status: {wo.Status} | {wo.WorkOrderTypeDisp}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        )}
                        {fieldConfig.workOrder && (
                          <td style={{ color: '#6a6d70', fontSize: '0.8rem', maxWidth: '200px' }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {link.workOrderText || '—'}
                            </div>
                          </td>
                        )}
                        {fieldConfig.equipment && (
                          <td style={{ position: 'relative' }}>
                            {isReadOnly ? (
                              <span style={{ fontWeight: 500 }}>{link.equipment || '—'}</span>
                            ) : (
                              <div>
                                <Input
                                  value={link.equipment}
                                  onInput={e => {
                                    const val = e.target.value;
                                    setObjectLinks(prev => prev.map((l, i) => i === idx ? { ...l, equipment: val, equipmentText: '' } : l));
                                    setEqSearch(val);
                                    setActiveSearch(`eq-${idx}`);
                                    searchEQ(val);
                                  }}
                                  placeholder="Search equipment..."
                                  style={{ width: '100%' }}
                                />
                                {activeSearch === `eq-${idx}` && eqResults.length > 0 && (
                                  <div style={{
                                    position: 'absolute', zIndex: 100, background: 'white',
                                    border: '1px solid #e8e8e8', borderRadius: '4px',
                                    maxHeight: '200px', overflowY: 'auto',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: '300px'
                                  }}>
                                    {eqResults.map(eq => (
                                      <div
                                        key={eq.assetNumber}
                                        onClick={() => selectEQ(idx, eq)}
                                        style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem', borderBottom: '1px solid #f0f0f0' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                      >
                                        <div style={{ fontWeight: 600 }}>{eq.assetNumber}</div>
                                        <div style={{ color: '#6a6d70', fontSize: '0.75rem' }}>{eq.description}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        )}
                        {fieldConfig.equipment && (
                          <td style={{ color: '#6a6d70', fontSize: '0.8rem', maxWidth: '200px' }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {link.equipmentText || '—'}
                            </div>
                          </td>
                        )}
                        {!isReadOnly && (
                          <td>
                            <Button design="Transparent" icon="delete" onClick={() => removeObjectLink(idx)} />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── Section 4: Attachments ── */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.25rem 1.5rem' }}>
          <Title level="H4" style={{ marginBottom: '1.25rem', paddingBottom: '0.5rem', borderBottom: '2px solid #0070f2' }}>
            Attachments {(attachments.length + pendingFiles.length) > 0 && (
              <Tag colorScheme="6" style={{ marginLeft: '0.5rem' }}>{attachments.length + pendingFiles.length}</Tag>
            )}
          </Title>

          {/* Drop zone */}
          {!isReadOnly && (
            <div
              className={`drop-zone ${dragover ? 'dragover' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragover(true); }}
              onDragLeave={() => setDragover(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{ marginBottom: '1rem' }}
            >
              <Icon name="upload-to-cloud" style={{ fontSize: '2rem', color: '#0070f2', marginBottom: '0.5rem' }} />
              <div className="drop-zone-text">
                <strong>Drag & drop files here</strong> or click to browse<br />
                <span style={{ fontSize: '0.75rem' }}>PDF, DOC, XLS, images — max 20MB each</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileDrop}
              />
            </div>
          )}

          {/* Pending files (not yet uploaded) */}
          {pendingFiles.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#6a6d70', marginBottom: '0.5rem', fontWeight: 600 }}>
                FILES TO UPLOAD ({pendingFiles.length})
              </div>
              {pendingFiles.map((f, idx) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 0.75rem', background: '#f0f7ff', borderRadius: '4px', marginBottom: '0.3rem'
                }}>
                  <Icon name="document" style={{ color: '#0070f2' }} />
                  <span style={{ flex: 1, fontSize: '0.85rem' }}>{f.name}</span>
                  <span style={{ fontSize: '0.75rem', color: '#6a6d70' }}>
                    {(f.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <Button design="Transparent" icon="decline" onClick={() => removePendingFile(idx)} />
                </div>
              ))}
            </div>
          )}

          {/* Saved attachments */}
          {attachments.length > 0 ? (
            <div>
              {attachments.length > 0 && pendingFiles.length > 0 && (
                <div style={{ fontSize: '0.8rem', color: '#6a6d70', marginBottom: '0.5rem', fontWeight: 600 }}>
                  SAVED ATTACHMENTS ({attachments.length})
                </div>
              )}
              {attachments.map((filename, idx) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 0.75rem', borderBottom: '1px solid #f0f0f0',
                  transition: 'background 0.1s'
                }}>
                  <Icon name="pdf-attachment" style={{ color: '#b00' }} />
                  <span style={{ flex: 1, fontSize: '0.85rem' }}>{filename}</span>
                  <Button
                    design="Transparent"
                    icon="download"
                    onClick={() => window.open(`/api/documents/${id}/attachments/${encodeURIComponent(filename)}`)}
                  />
                  {!isReadOnly && (
                    <Button design="Transparent" icon="delete" onClick={() => removeAttachment(filename)} />
                  )}
                </div>
              ))}
            </div>
          ) : !pendingFiles.length ? (
            <div style={{ color: '#6a6d70', fontSize: '0.875rem', padding: '0.5rem 0', textAlign: 'center' }}>
              No attachments {isReadOnly ? '' : '— drag files above or click to upload'}
            </div>
          ) : null}
        </div>
      </Card>

      {/* ── Section 5: Workflow Tracker ── */}
      {doc?.workflow && (
        <Card style={{ marginBottom: '1.5rem' }}>
          <div style={{ padding: '1.25rem 1.5rem' }}>
            <Title level="H4" style={{ marginBottom: '1.25rem', paddingBottom: '0.5rem', borderBottom: '2px solid #0070f2' }}>
              Workflow Status
            </Title>
            <WorkflowTracker
              workflow={doc.workflow}
              originatorName={doc.originator}
              createdDate={doc.createdDate}
            />
          </div>
        </Card>
      )}

      {/* ── Action Bar ── */}
      <div style={{
        position: 'sticky', bottom: 0,
        background: 'white',
        borderTop: '1px solid #e8e8e8',
        padding: '0.75rem 1.5rem',
        display: 'flex', gap: '0.75rem', alignItems: 'center',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.06)',
        margin: '0 -2rem',
        zIndex: 50
      }}>
        {/* Edit mode */}
        {(mode === 'create' || mode === 'edit') && (
          <>
            <Button design="Emphasized" icon="paper-plane" onClick={() => handleSave('submit')} disabled={saving}>
              {doc?.status === 'Rejected' ? 'Resubmit' : 'Submit'}
            </Button>
            <Button design="Default" icon="save" onClick={() => handleSave('draft')} disabled={saving}>
              Save as Draft
            </Button>
            <div style={{ flex: 1 }} />
            {doc?.status === 'Draft' && id && (
              <Button design="Negative" icon="delete" onClick={handleDelete} disabled={saving}>
                Delete Draft
              </Button>
            )}
            <Button design="Transparent" onClick={() => navigate(-1)} disabled={saving}>
              Cancel
            </Button>
          </>
        )}

        {/* Approval mode */}
        {mode === 'approve' && (
          <>
            <Button design="Positive" icon="accept" onClick={() => setShowApproveDialog(true)} disabled={saving}>
              Approve
            </Button>
            <Button design="Negative" icon="decline" onClick={() => setShowRejectDialog(true)} disabled={saving}>
              Reject
            </Button>
            <div style={{ flex: 1 }} />
            <Button design="Transparent" icon="nav-back" onClick={() => navigate('/inbox')}>
              Back to Inbox
            </Button>
          </>
        )}

        {/* Read-only mode */}
        {mode === 'readonly' && (
          <>
            <Button design="Transparent" icon="nav-back" onClick={() => navigate(-1)}>
              Back
            </Button>
          </>
        )}

        {saving && <BusyIndicator active size="S" style={{ marginLeft: '1rem' }} />}
      </div>

      {/* Approve Confirmation Dialog */}
      <Dialog
        open={showApproveDialog}
        headerText="Confirm Approval"
        onAfterClose={() => setShowApproveDialog(false)}
        footer={
          <Bar endContent={
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button design="Positive" onClick={handleApprove} disabled={saving}>Approve</Button>
              <Button design="Transparent" onClick={() => setShowApproveDialog(false)}>Cancel</Button>
            </div>
          } />
        }
      >
        <div style={{ padding: '1rem' }}>
          <p>Are you sure you want to approve document <strong>{doc?.documentId}</strong>?</p>
        </div>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={showRejectDialog}
        headerText="Reject Document"
        onAfterClose={() => setShowRejectDialog(false)}
        footer={
          <Bar endContent={
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button design="Negative" onClick={handleReject} disabled={saving}>Reject</Button>
              <Button design="Transparent" onClick={() => { setShowRejectDialog(false); setRejectReason(''); }}>Cancel</Button>
            </div>
          } />
        }
      >
        <div style={{ padding: '1rem', minWidth: '360px' }}>
          <p style={{ marginBottom: '1rem' }}>
            Rejecting document <strong>{doc?.documentId}</strong>. A rejection reason is optional.
          </p>
          <Label>Rejection Reason (optional)</Label>
          <TextArea
            value={rejectReason}
            onInput={e => setRejectReason(e.target.value)}
            placeholder="Enter a reason for rejection..."
            rows={4}
            style={{ width: '100%', marginTop: '0.5rem' }}
          />
        </div>
      </Dialog>
    </div>
  );
}
