import React, { useState, useEffect, useRef } from 'react';
import Spinner from 'react-bootstrap/Spinner';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

function Title({ level = 'H2', children, style }) {
  const tag = `h${String(level).replace(/[^0-9]/g, '') || '2'}`;
  return React.createElement(tag, { style, className: 'fw-bold' }, children);
}

function Card({ children, style }) {
  return <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '0.5rem', ...style }}>{children}</div>;
}

function Button({ design = 'Default', onClick, children, style, disabled, type = 'button' }) {
  const cls = design === 'Emphasized' ? 'btn btn-primary btn-sm' : design === 'Negative' ? 'btn btn-danger btn-sm' : 'btn btn-outline-secondary btn-sm';
  return <button type={type} className={cls} onClick={onClick} style={style} disabled={disabled}>{children}</button>;
}

function Input(props) {
  const { onInput, value, style, ...rest } = props;
  return <input className="form-control form-control-sm" value={value ?? ''} onChange={onInput} style={style} {...rest} />;
}

function Select({ onChange, children, style }) {
  return (
    <select
      className="form-select form-select-sm"
      style={style}
      onChange={(e) => onChange?.({ detail: { selectedOption: e.target.selectedOptions[0] } })}
    >
      {children}
    </select>
  );
}

function Option({ children, ...props }) {
  return <option {...props}>{children}</option>;
}

function Label({ children }) {
  return <label className="form-label mb-1">{children}</label>;
}

function MessageStrip({ design = 'Information', children, style, onClose }) {
  const cls = design === 'Negative' ? 'alert alert-danger' : design === 'Warning' ? 'alert alert-warning' : 'alert alert-success';
  return (
    <div className={`${cls} py-2 px-3`} style={style} role="alert">
      <div className="d-flex justify-content-between align-items-start gap-2">
        <div>{children}</div>
        {onClose && <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>}
      </div>
    </div>
  );
}

function BusyIndicator() {
  return <Spinner animation="border" size="sm" />;
}

const STATUS_COLORS = {
  Draft: '#666', Approved: '#107e3e', Rejected: '#b00',
  'Pending Discipline Approval': '#b26000',
  'Pending MSV Approval': '#b26000',
  'Pending E&M Approval': '#0070f2'
};

const FIELD_NAMES = ['docDate','manuName','manuSerial','alertNum','certAuth','certNum','addDesc','docLoc','workOrder','equipment'];

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display:'flex', gap:0, borderBottom:'2px solid #e8e8e8', marginBottom:'1.5rem', flexWrap:'wrap' }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding:'0.65rem 1.1rem', border:'none', background:'none', cursor:'pointer',
          fontWeight:600, fontSize:'0.85rem',
          color: active === t.id ? '#0070f2' : '#6a6d70',
          borderBottom: active === t.id ? '2px solid #0070f2' : '2px solid transparent',
          marginBottom:'-2px', transition:'color 0.15s'
        }}>{t.label}</button>
      ))}
    </div>
  );
}

function TableGrid({ cols, rows, onEdit, onDelete, deleteLabel = 'Remove' }) {
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem' }}>
        <thead>
          <tr style={{ background:'#f5f6f7', borderBottom:'2px solid #e8e8e8' }}>
            {cols.map(c => <th key={c.key} style={{ padding:'0.6rem 0.9rem', textAlign:'left', fontWeight:600 }}>{c.label}</th>)}
            {(onEdit || onDelete) && <th style={{ padding:'0.6rem 0.9rem' }}></th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={cols.length + ((onEdit || onDelete) ? 1 : 0)} style={{ padding:'1.5rem', textAlign:'center', color:'#999' }}>No entries</td></tr>
          )}
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom:'1px solid #f0f0f0' }}>
              {cols.map(c => <td key={c.key} style={{ padding:'0.6rem 0.9rem' }}>{row[c.key] ?? '—'}</td>)}
              {(onEdit || onDelete) && (
                <td style={{ padding:'0.6rem 0.9rem' }}>
                  <div style={{ display:'flex', gap:'0.5rem', justifyContent:'flex-end' }}>
                    {onEdit && <Button design="Default" onClick={() => onEdit(row)}>Edit</Button>}
                    {onDelete && <Button design="Negative" onClick={() => onDelete(row)}>{deleteLabel}</Button>}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────
function OverviewTab({ stats }) {
  if (!stats) return null;
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(175px, 1fr))', gap:'1rem' }}>
      <Card style={{ padding:'1.25rem', textAlign:'center' }}>
        <div style={{ fontSize:'2.5rem', fontWeight:700, color:'#0070f2' }}>{stats.total}</div>
        <div style={{ fontSize:'0.8rem', color:'#6a6d70', marginTop:'0.25rem' }}>Total Documents</div>
      </Card>
      {Object.entries(stats.byStatus).map(([status, count]) => (
        <Card key={status} style={{ padding:'1.25rem', textAlign:'center' }}>
          <div style={{ fontSize:'2rem', fontWeight:700, color: STATUS_COLORS[status] || '#32363a' }}>{count}</div>
          <div style={{ fontSize:'0.75rem', color:'#6a6d70', marginTop:'0.25rem' }}>{status}</div>
        </Card>
      ))}
    </div>
  );
}

// ── Workflow Maintenance ──────────────────────────────────────────────────────
function WorkflowTab({ currentUser }) {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
    const data = await fetch(`/api/admin/workflows${qs}`).then(r => r.json());
    setWorkflows(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  const restart = async (docId) => {
    await fetch(`/api/admin/workflows/${docId}/restart`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ currentUser })
    });
    setMsg(`Workflow restarted for ${docId}`);
    setTimeout(() => setMsg(''), 3000);
    load();
  };

  const errorDocs = workflows.filter(w => w.hasNoApprovers);

  return (
    <div>
      {msg && <MessageStrip design="Positive" style={{ marginBottom:'1rem' }} onClose={() => setMsg('')}>{msg}</MessageStrip>}

      {errorDocs.length > 0 && (
        <MessageStrip design="Warning" style={{ marginBottom:'1rem' }}>
          {errorDocs.length} document(s) have pending steps with no approvers assigned. Fix the approver rules below, then restart these workflows.
        </MessageStrip>
      )}

      <div style={{ display:'flex', gap:'1rem', marginBottom:'1rem', alignItems:'flex-end' }}>
        <div>
          <Label>Filter by Status</Label>
          <Select style={{ width:'220px' }} onChange={e => setStatusFilter(e.detail.selectedOption.dataset.value)}>
            <Option data-value="">All Statuses</Option>
            {['Draft','Pending Discipline Approval','Pending E&M Approval','Approved','Rejected'].map(s =>
              <Option key={s} data-value={s}>{s}</Option>
            )}
          </Select>
        </div>
        <Button design="Default" onClick={load}>Refresh</Button>
      </div>

      {loading ? <BusyIndicator active /> : (
        <Card>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem' }}>
              <thead>
                <tr style={{ background:'#f5f6f7', borderBottom:'2px solid #e8e8e8' }}>
                  {['Doc ID','Rig','Type/Group','Originator','Status','Version','WF Step','Actions'].map(h =>
                    <th key={h} style={{ padding:'0.6rem 0.9rem', textAlign:'left', fontWeight:600, whiteSpace:'nowrap' }}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {workflows.length === 0 && (
                  <tr><td colSpan={8} style={{ padding:'2rem', textAlign:'center', color:'#999' }}>No documents found</td></tr>
                )}
                {workflows.map(w => (
                  <tr key={w.documentId} style={{ borderBottom:'1px solid #f0f0f0', background: w.hasNoApprovers ? '#fff8e1' : 'white' }}>
                    <td style={{ padding:'0.6rem 0.9rem', fontWeight:600, color:'#0070f2' }}>{w.documentId}</td>
                    <td style={{ padding:'0.6rem 0.9rem' }}>{w.rig}</td>
                    <td style={{ padding:'0.6rem 0.9rem' }}>{w.docType}/{w.docGroup}</td>
                    <td style={{ padding:'0.6rem 0.9rem' }}>{w.originator}</td>
                    <td style={{ padding:'0.6rem 0.9rem' }}>
                      <span style={{ background: STATUS_COLORS[w.status] ? STATUS_COLORS[w.status]+'22' : '#f0f0f0', color: STATUS_COLORS[w.status] || '#666', padding:'0.2rem 0.55rem', borderRadius:'1rem', fontSize:'0.72rem', fontWeight:600 }}>{w.status}</span>
                      {w.hasNoApprovers && <span style={{ marginLeft:'0.4rem', color:'#b26000', fontSize:'0.72rem' }}>⚠ No approvers</span>}
                    </td>
                    <td style={{ padding:'0.6rem 0.9rem', color:'#6a6d70' }}>v{w.version || '1.0'}</td>
                    <td style={{ padding:'0.6rem 0.9rem', color:'#6a6d70' }}>{w.currentStep || '—'}</td>
                    <td style={{ padding:'0.6rem 0.9rem' }}>
                      {w.workflowRequired && (
                        <Button design="Transparent" onClick={() => restart(w.documentId)}>Restart</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Approvers by Discipline ───────────────────────────────────────────────────
function ApproversDisciplineTab() {
  const emptyForm = { departmentId:'', approvalType:'msv', approverUsername:'' };
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('Positive');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const load = () => fetch('/api/admin/approvers/discipline').then(r => r.json()).then(setRows);
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.departmentId || !form.approverUsername) return;
    const isEditing = modalMode === 'edit' && editingId !== null;
    try {
      const response = await fetch(isEditing ? `/api/admin/approvers/discipline/${editingId}` : '/api/admin/approvers/discipline', {
        method: isEditing ? 'PUT' : 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form)
      });
      const res = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(res.error || 'Failed to save approver rule');
      setMsgType('Positive');
      setForm(emptyForm);
      setEditingId(null);
      setIsModalOpen(false);
      setMsg(modalMode === 'edit' ? 'Approver updated. Pending workflows re-evaluated.' : 'Approver added. Pending workflows re-evaluated.');
      setTimeout(() => setMsg(''), 3000);
      load();
    } catch (err) {
      setMsgType('Negative');
      setMsg(err.message);
    }
  };

  const remove = async (row) => {
    await fetch(`/api/admin/approvers/discipline/${row.id}`, { method:'DELETE' });
    setMsg('Approver removed. Pending workflows re-evaluated.');
    setTimeout(() => setMsg(''), 3000);
    load();
  };

  const edit = (row) => {
    setModalMode('edit');
    setEditingId(row.id);
    setForm({
      departmentId: row.department_id || '',
      approvalType: row.approval_type || 'msv',
      approverUsername: row.approver_username || ''
    });
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setModalMode('add');
    setEditingId(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setForm(emptyForm);
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const response = await fetch('/api/admin/approvers/discipline/upload', { method:'POST', body: fd });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Failed to upload Excel');
      setMsgType('Positive');
      setMsg(`Imported ${res.imported} rows. Pending workflows re-evaluated.`);
      setTimeout(() => setMsg(''), 4000);
      load();
    } catch (err) {
      setMsgType('Negative');
      setMsg(err.message);
    }
    setUploading(false);
    fileRef.current.value = '';
  };

  const downloadTemplate = () => {
    window.location.href = '/api/admin/approvers/discipline/download';
  };

  return (
    <div>
      {msg && <MessageStrip design={msgType} style={{ marginBottom:'1rem' }} onClose={() => setMsg('')}>{msg}</MessageStrip>}

      <Card style={{ marginBottom:'1.5rem' }}>
        <div style={{ padding:'1.25rem' }}>
          <Title level="H5" style={{ marginBottom:'1rem' }}>Approver Rules</Title>
          <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
            <Button design="Emphasized" onClick={openAddModal}>Add Rule</Button>
            <Button design="Default" onClick={downloadTemplate}>Download Excel</Button>
            <Button design="Default" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload Excel'}
            </Button>
            <span style={{ fontSize:'0.78rem', color:'#6a6d70' }}>Columns: Department ID | Approval Type | Approver Username</span>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display:'none' }} onChange={handleUpload} />
          </div>
        </div>
      </Card>
      {isModalOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1050, padding:'1rem' }}>
          <Card style={{ width:'100%', maxWidth:'680px' }}>
            <div style={{ padding:'1.25rem' }}>
              <Title level="H5" style={{ marginBottom:'1rem' }}>{modalMode === 'edit' ? 'Edit Approver Rule' : 'Add Approver Rule'}</Title>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'1rem', marginBottom:'1rem' }}>
                <div>
                  <Label>Department ID</Label>
                  <Input value={form.departmentId} onInput={e => setForm(p => ({ ...p, departmentId: e.target.value }))} placeholder="e.g. 1813 or default" style={{ width:'100%' }} />
                </div>
                <div>
                  <Label>Approval Type</Label>
                  <Select style={{ width:'100%' }} onChange={e => setForm(p => ({ ...p, approvalType: e.detail.selectedOption.dataset.value }))}>
                    <Option data-value="msv" selected={form.approvalType === 'msv'}>Discipline (MSV)</Option>
                    <Option data-value="em"  selected={form.approvalType === 'em'}>E&M</Option>
                  </Select>
                </div>
                <div>
                  <Label>Approver Username</Label>
                  <Input value={form.approverUsername} onInput={e => setForm(p => ({ ...p, approverUsername: e.target.value }))} placeholder="e.g. MANAGER1" style={{ width:'100%' }} />
                </div>
              </div>
              <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end' }}>
                <Button design="Default" onClick={closeModal}>Cancel</Button>
                <Button design="Emphasized" onClick={save}>{modalMode === 'edit' ? 'Edit' : 'Add'}</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Card>
        <TableGrid
          cols={[
            { key:'department_id',   label:'Department ID' },
            { key:'approval_type',   label:'Approval Type' },
            { key:'approver_username', label:'Approver Username' }
          ]}
          rows={rows.filter(r => r.active)}
          onEdit={edit}
          onDelete={remove}
        />
      </Card>
    </div>
  );
}

// ── Approvers by Maintenance ──────────────────────────────────────────────────
function ApproversMaintenanceTab() {
  const emptyForm = { maintenanceStrategy:'', maintenanceDays:'', approvalType:'msv', approverUsername:'' };
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('Positive');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const load = () => fetch('/api/admin/approvers/maintenance').then(r => r.json()).then(setRows);
  useEffect(() => { load(); }, []);

  const save = async () => {
    const isEditing = modalMode === 'edit' && editingId !== null;
    try {
      const response = await fetch(isEditing ? `/api/admin/approvers/maintenance/${editingId}` : '/api/admin/approvers/maintenance', {
        method: isEditing ? 'PUT' : 'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          maintenanceStrategy: form.maintenanceStrategy || null,
          maintenanceDays: form.maintenanceDays ? parseInt(form.maintenanceDays, 10) : null,
          approvalType: form.approvalType,
          approverUsername: form.approverUsername
        })
      });
      const res = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(res.error || 'Failed to save maintenance approver rule');
      setMsgType('Positive');
      setForm(emptyForm);
      setEditingId(null);
      setIsModalOpen(false);
      setMsg(modalMode === 'edit' ? 'Rule updated.' : 'Rule added.');
      setTimeout(() => setMsg(''), 3000);
      load();
    } catch (err) {
      setMsgType('Negative');
      setMsg(err.message);
    }
  };

  const remove = async (row) => {
    await fetch(`/api/admin/approvers/maintenance/${row.id}`, { method:'DELETE' });
    setMsg('Rule removed.'); setTimeout(() => setMsg(''), 3000);
    load();
  };

  const edit = (row) => {
    setModalMode('edit');
    setEditingId(row.id);
    setForm({
      maintenanceStrategy: row.maintenance_strategy || '',
      maintenanceDays: row.maintenance_days || '',
      approvalType: row.approval_type || 'msv',
      approverUsername: row.approver_username || ''
    });
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setModalMode('add');
    setEditingId(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setForm(emptyForm);
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const response = await fetch('/api/admin/approvers/maintenance/upload', { method:'POST', body: fd });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Failed to upload Excel');
      setMsgType('Positive');
      setMsg(`Imported ${res.imported} rows.`);
      setTimeout(() => setMsg(''), 4000);
      load();
    } catch (err) {
      setMsgType('Negative');
      setMsg(err.message);
    }
    setUploading(false);
    fileRef.current.value = '';
  };

  const downloadTemplate = () => {
    window.location.href = '/api/admin/approvers/maintenance/download';
  };

  return (
    <div>
      {msg && <MessageStrip design={msgType} style={{ marginBottom:'1rem' }} onClose={() => setMsg('')}>{msg}</MessageStrip>}
      <Card style={{ marginBottom:'1.5rem' }}>
        <div style={{ padding:'1.25rem' }}>
          <Title level="H5" style={{ marginBottom:'1rem' }}>Maintenance Approver Rules</Title>
          <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
            <Button design="Emphasized" onClick={openAddModal}>Add Rule</Button>
            <Button design="Default" onClick={downloadTemplate}>Download Excel</Button>
            <Button design="Default" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload Excel'}
            </Button>
            <span style={{ fontSize:'0.78rem', color:'#6a6d70' }}>Columns: Maintenance Strategy | Maintenance Days | Approval Type | Approver Username</span>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display:'none' }} onChange={handleUpload} />
          </div>
        </div>
      </Card>
      {isModalOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1050, padding:'1rem' }}>
          <Card style={{ width:'100%', maxWidth:'680px' }}>
            <div style={{ padding:'1.25rem' }}>
              <Title level="H5" style={{ marginBottom:'1rem' }}>{modalMode === 'edit' ? 'Edit Maintenance Approver Rule' : 'Add Maintenance Approver Rule'}</Title>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(190px, 1fr))', gap:'1rem', marginBottom:'1rem' }}>
                <div><Label>Maintenance Strategy</Label><Input value={form.maintenanceStrategy} onInput={e => setForm(p => ({ ...p, maintenanceStrategy: e.target.value }))} style={{ width:'100%' }} /></div>
                <div><Label>Maintenance Days</Label><Input type="number" value={form.maintenanceDays} onInput={e => setForm(p => ({ ...p, maintenanceDays: e.target.value }))} style={{ width:'100%' }} /></div>
                <div>
                  <Label>Approval Type</Label>
                  <Select style={{ width:'100%' }} onChange={e => setForm(p => ({ ...p, approvalType: e.detail.selectedOption.dataset.value }))}>
                    <Option data-value="msv" selected={form.approvalType === 'msv'}>Discipline</Option>
                    <Option data-value="em" selected={form.approvalType === 'em'}>E&M</Option>
                  </Select>
                </div>
                <div><Label>Approver Username</Label><Input value={form.approverUsername} onInput={e => setForm(p => ({ ...p, approverUsername: e.target.value }))} style={{ width:'100%' }} /></div>
              </div>
              <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end' }}>
                <Button design="Default" onClick={closeModal}>Cancel</Button>
                <Button design="Emphasized" onClick={save}>{modalMode === 'edit' ? 'Edit' : 'Add'}</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
      <Card>
        <TableGrid
          cols={[
            { key:'maintenance_strategy', label:'Strategy' },
            { key:'maintenance_days',     label:'Days' },
            { key:'approval_type',        label:'Approval Type' },
            { key:'approver_username',    label:'Approver Username' }
          ]}
          rows={rows.filter(r => r.active)}
          onEdit={edit}
          onDelete={remove}
        />
      </Card>
    </div>
  );
}

// ── Users ─────────────────────────────────────────────────────────────────────
function UsersTab({ currentUser }) {
  const emptyUserForm = { username:'', displayName:'', email:'', role:'user' };
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyUserForm);
  const [editingUsername, setEditingUsername] = useState(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userModalMode, setUserModalMode] = useState('add');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('Positive');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const load = () => fetch('/api/admin/users').then(r => r.json()).then(setUsers);
  useEffect(() => { load(); }, []);

  const saveUser = async () => {
    if (!form.username) return;
    const isEditing = userModalMode === 'edit' && editingUsername;
    try {
      const response = await fetch(isEditing ? `/api/admin/users/${editingUsername}` : '/api/admin/users', {
        method: isEditing ? 'PUT' : 'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(form)
      });
      const res = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(res.error || 'Failed to save user');
      setMsgType('Positive');
      setForm(emptyUserForm);
      setEditingUsername(null);
      setIsUserModalOpen(false);
      setMsg(userModalMode === 'edit' ? 'User updated.' : 'User added.');
      setTimeout(() => setMsg(''), 3000);
      load();
    } catch (err) {
      setMsgType('Negative');
      setMsg(err.message);
    }
  };

  const updateRole = async (username, role) => {
    await fetch(`/api/admin/users/${username}/role`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ role }) });
    setMsg(`Role updated for ${username}`); setTimeout(() => setMsg(''), 3000);
    load();
  };

  const editUser = (user) => {
    setUserModalMode('edit');
    setEditingUsername(user.username || null);
    setForm({
      username: user.username || '',
      displayName: user.displayName || '',
      email: user.email || '',
      role: user.role || 'user'
    });
    setIsUserModalOpen(true);
  };

  const openAddModal = () => {
    setUserModalMode('add');
    setEditingUsername(null);
    setForm(emptyUserForm);
    setIsUserModalOpen(true);
  };

  const closeUserModal = () => {
    setForm(emptyUserForm);
    setEditingUsername(null);
    setIsUserModalOpen(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const response = await fetch('/api/admin/users/upload', { method:'POST', body: fd });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Failed to upload Excel');
      setMsgType('Positive');
      setMsg(`Imported ${res.imported} users.`);
      setTimeout(() => setMsg(''), 4000);
      load();
    } catch (err) {
      setMsgType('Negative');
      setMsg(err.message);
    }
    setUploading(false);
    fileRef.current.value = '';
  };

  const downloadUsers = () => {
    window.location.href = '/api/admin/users/download';
  };

  return (
    <div>
      {msg && <MessageStrip design={msgType} style={{ marginBottom:'1rem' }} onClose={() => setMsg('')}>{msg}</MessageStrip>}
      <Card style={{ marginBottom:'1.5rem' }}>
        <div style={{ padding:'1.25rem' }}>
          <Title level="H5" style={{ marginBottom:'1rem' }}>Users</Title>
          <div style={{ display:'flex', gap:'0.75rem', alignItems:'center', flexWrap:'wrap' }}>
            <Button design="Emphasized" onClick={openAddModal}>Add User</Button>
            <Button design="Default" onClick={downloadUsers}>Download Excel</Button>
            <Button design="Default" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload Excel'}
            </Button>
            <span style={{ fontSize:'0.78rem', color:'#6a6d70' }}>Columns: Username | Display Name | Email | Role</span>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display:'none' }} onChange={handleUpload} />
          </div>
        </div>
      </Card>
      {isUserModalOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1050, padding:'1rem' }}>
          <Card style={{ width:'100%', maxWidth:'680px' }}>
            <div style={{ padding:'1.25rem' }}>
              <Title level="H5" style={{ marginBottom:'1rem' }}>{userModalMode === 'edit' ? 'Edit User' : 'Add User'}</Title>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(190px, 1fr))', gap:'1rem', marginBottom:'1rem' }}>
                <div><Label>Username*</Label><Input value={form.username} onInput={e => setForm(p => ({ ...p, username: e.target.value }))} style={{ width:'100%' }} disabled={userModalMode === 'edit'} /></div>
                <div><Label>Display Name</Label><Input value={form.displayName} onInput={e => setForm(p => ({ ...p, displayName: e.target.value }))} style={{ width:'100%' }} /></div>
                <div><Label>Email</Label><Input value={form.email} onInput={e => setForm(p => ({ ...p, email: e.target.value }))} style={{ width:'100%' }} /></div>
                <div>
                  <Label>Role</Label>
                  <Select style={{ width:'100%' }} onChange={e => setForm(p => ({ ...p, role: e.detail.selectedOption.dataset.value }))}>
                    <Option data-value="user" selected={form.role === 'user'}>User</Option>
                    <Option data-value="admin" selected={form.role === 'admin'}>Admin</Option>
                  </Select>
                </div>
              </div>
              <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end' }}>
                <Button design="Default" onClick={closeUserModal}>Cancel</Button>
                <Button design="Emphasized" onClick={saveUser}>{userModalMode === 'edit' ? 'Edit' : 'Add'}</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
      <Card>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem' }}>
            <thead>
              <tr style={{ background:'#f5f6f7', borderBottom:'2px solid #e8e8e8' }}>
                {['Username','Display Name','Email','Role','Actions'].map(h =>
                  <th key={h} style={{ padding:'0.6rem 0.9rem', textAlign:'left', fontWeight:600 }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.username} style={{ borderBottom:'1px solid #f0f0f0' }}>
                  <td style={{ padding:'0.6rem 0.9rem', fontWeight:600 }}>{u.username}</td>
                  <td style={{ padding:'0.6rem 0.9rem' }}>{u.displayName}</td>
                  <td style={{ padding:'0.6rem 0.9rem', color:'#6a6d70' }}>{u.email}</td>
                  <td style={{ padding:'0.6rem 0.9rem' }}>
                    <span style={{ background: u.role === 'admin' ? '#e3f2fd' : '#f0f0f0', color: u.role === 'admin' ? '#0070f2' : '#666', padding:'0.2rem 0.6rem', borderRadius:'1rem', fontSize:'0.72rem', fontWeight:600 }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding:'0.6rem 0.9rem' }}>
                    <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                      <Button design="Default" onClick={() => editUser(u)}>Edit</Button>
                      {u.username !== currentUser.username && (
                        <Button design="Transparent" onClick={() => updateRole(u.username, u.role === 'admin' ? 'user' : 'admin')}>
                          {u.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Document Types ─────────────────────────────────────────────────────────────
function DocumentTypesTab() {
  const [types,  setTypes]  = useState([]);
  const [typeForm,  setTypeForm]  = useState({ code:'', description:'' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [msg, setMsg] = useState('');

  const loadTypes  = () => fetch('/api/admin/config/doc-types').then(r => r.json()).then(setTypes);
  useEffect(() => { loadTypes(); }, []);

  const saveType = async () => {
    if (!typeForm.code) return;
    await fetch('/api/admin/config/doc-types', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(typeForm) });
    setTypeForm({ code:'', description:'' });
    setIsModalOpen(false);
    setModalMode('add');
    setMsg('Document type saved.'); setTimeout(() => setMsg(''), 3000);
    loadTypes();
  };

  const delType = async (code) => {
    await fetch(`/api/admin/config/doc-types/${code}`, { method:'DELETE' });
    loadTypes();
  };

  const editType = (row) => {
    setModalMode('edit');
    setTypeForm({ code: row.code || '', description: row.description || '' });
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setModalMode('add');
    setTypeForm({ code:'', description:'' });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setTypeForm({ code:'', description:'' });
    setIsModalOpen(false);
  };

  return (
    <div>
      {msg && <MessageStrip design="Positive" style={{ marginBottom:'1rem' }} onClose={() => setMsg('')}>{msg}</MessageStrip>}
      <Card>
        <div style={{ padding:'1.25rem' }}>
          <Title level="H5" style={{ marginBottom:'1rem' }}>Document Types</Title>
          <div style={{ marginBottom:'1rem' }}>
            <Button design="Emphasized" onClick={openAddModal}>Add Type</Button>
          </div>
          {isModalOpen && (
            <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1050, padding:'1rem' }}>
              <Card style={{ width:'100%', maxWidth:'580px' }}>
                <div style={{ padding:'1.25rem' }}>
                  <Title level="H5" style={{ marginBottom:'1rem' }}>{modalMode === 'edit' ? 'Edit Document Type' : 'Add Document Type'}</Title>
                  <div style={{ display:'flex', gap:'0.75rem', marginBottom:'1rem', flexWrap:'wrap' }}>
                    <Input placeholder="Code" value={typeForm.code} onInput={e => setTypeForm(p => ({ ...p, code: e.target.value }))} style={{ width:'90px' }} />
                    <Input placeholder="Description" value={typeForm.description} onInput={e => setTypeForm(p => ({ ...p, description: e.target.value }))} style={{ flex:1, minWidth:'140px' }} />
                  </div>
                  <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end' }}>
                    <Button design="Default" onClick={closeModal}>Cancel</Button>
                    <Button design="Emphasized" onClick={saveType}>{modalMode === 'edit' ? 'Edit' : 'Add'}</Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
          <TableGrid
            cols={[{ key:'code', label:'Code' }, { key:'description', label:'Description' }]}
            rows={types}
            onEdit={editType}
            onDelete={r => delType(r.code)}
          />
        </div>
      </Card>
    </div>
  );
}

// ── Document Groups ───────────────────────────────────────────────────────────
function DocumentGroupsTab() {
  const emptyGroupForm = { docType:'', code:'', description:'', workflowRequired: false };
  const [types,  setTypes]  = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupForm, setGroupForm] = useState(emptyGroupForm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [msg, setMsg] = useState('');

  const loadTypes  = () => fetch('/api/admin/config/doc-types').then(r => r.json()).then(setTypes);
  const loadGroups = () => fetch('/api/admin/config/doc-groups').then(r => r.json()).then(setGroups);
  useEffect(() => { loadTypes(); loadGroups(); }, []);

  const saveGroup = async () => {
    if (!groupForm.code || !groupForm.docType) return;
    await fetch('/api/admin/config/doc-groups', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(groupForm) });
    setGroupForm(emptyGroupForm);
    setIsModalOpen(false);
    setModalMode('add');
    setMsg('Document group saved.'); setTimeout(() => setMsg(''), 3000);
    loadGroups();
  };

  const delGroup = async (code) => {
    await fetch(`/api/admin/config/doc-groups/${code}`, { method:'DELETE' });
    loadGroups();
  };

  const editGroup = (row) => {
    setModalMode('edit');
    setGroupForm({
      docType: row.doc_type || '',
      code: row.code || '',
      description: row.description || '',
      workflowRequired: row.workflow_required === 'Yes'
    });
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setModalMode('add');
    setGroupForm(emptyGroupForm);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setGroupForm(emptyGroupForm);
    setIsModalOpen(false);
  };

  return (
    <div>
      {msg && <MessageStrip design="Positive" style={{ marginBottom:'1rem' }} onClose={() => setMsg('')}>{msg}</MessageStrip>}
      <Card>
        <div style={{ padding:'1.25rem' }}>
          <Title level="H5" style={{ marginBottom:'1rem' }}>Document Groups</Title>
          <div style={{ marginBottom:'1rem' }}>
            <Button design="Emphasized" onClick={openAddModal}>Add Group</Button>
          </div>
          {isModalOpen && (
            <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1050, padding:'1rem' }}>
              <Card style={{ width:'100%', maxWidth:'680px' }}>
                <div style={{ padding:'1.25rem' }}>
                  <Title level="H5" style={{ marginBottom:'1rem' }}>{modalMode === 'edit' ? 'Edit Document Group' : 'Add Document Group'}</Title>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginBottom:'0.75rem' }}>
                    <div><Label>Doc Type</Label>
                      <Select style={{ width:'100%' }} onChange={e => setGroupForm(p => ({ ...p, docType: e.detail.selectedOption.dataset.value }))}>
                        <Option data-value="">— select —</Option>
                        {types.map(t => <Option key={t.code} data-value={t.code} selected={groupForm.docType === t.code}>{t.code}</Option>)}
                      </Select>
                    </div>
                    <div><Label>Code</Label><Input value={groupForm.code} onInput={e => setGroupForm(p => ({ ...p, code: e.target.value }))} style={{ width:'100%' }} /></div>
                    <div style={{ gridColumn:'1/-1' }}><Label>Description</Label><Input value={groupForm.description} onInput={e => setGroupForm(p => ({ ...p, description: e.target.value }))} style={{ width:'100%' }} /></div>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                      <input type="checkbox" checked={groupForm.workflowRequired} onChange={e => setGroupForm(p => ({ ...p, workflowRequired: e.target.checked }))} />
                      <Label>Workflow Required</Label>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end' }}>
                    <Button design="Default" onClick={closeModal}>Cancel</Button>
                    <Button design="Emphasized" onClick={saveGroup}>{modalMode === 'edit' ? 'Edit' : 'Add'}</Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
          <TableGrid
            cols={[
              { key:'doc_type', label:'Type' }, { key:'code', label:'Code' },
              { key:'description', label:'Description' },
              { key:'workflow_required', label:'WF Req.' }
            ]}
            rows={groups.map(g => ({ ...g, workflow_required: g.workflow_required ? 'Yes' : 'No' }))}
            onEdit={editGroup}
            onDelete={r => delGroup(r.code)}
          />
        </div>
      </Card>
    </div>
  );
}

// ── Field Visibility ──────────────────────────────────────────────────────────
function FieldVisibilityTab() {
  const [allGroups, setAllGroups] = useState([]);
  const [config, setConfig] = useState({});
  const [msg, setMsg] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');

  useEffect(() => {
    fetch('/api/admin/config/doc-groups').then(r => r.json()).then(setAllGroups);
    fetch('/api/admin/config/field-visibility').then(r => r.json()).then(setConfig);
  }, []);

  const visOptions = [null, 'M', 'O', 'MO', 'M*', 'AMO', 'D'];

  const update = (group, field, val) => {
    setConfig(prev => ({
      ...prev,
      [group]: { ...(prev[group] || {}), [field]: val === '' ? null : val }
    }));
  };

  const save = async (group) => {
    await fetch(`/api/admin/config/field-visibility/${group}`, {
      method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(config[group] || {})
    });
    setMsg(`Saved field visibility for ${group}`); setTimeout(() => setMsg(''), 3000);
  };

  const displayGroups = selectedGroup ? allGroups.filter(g => g.code === selectedGroup) : allGroups;

  return (
    <div>
      {msg && <MessageStrip design="Positive" style={{ marginBottom:'1rem' }} onClose={() => setMsg('')}>{msg}</MessageStrip>}
      <div style={{ marginBottom:'1rem', display:'flex', alignItems:'flex-end', gap:'1rem' }}>
        <div>
          <Label>Filter Group</Label>
          <Select style={{ width:'160px' }} onChange={e => setSelectedGroup(e.detail.selectedOption.dataset.value)}>
            <Option data-value="">All Groups</Option>
            {allGroups.map(g => <Option key={g.code} data-value={g.code}>{g.code}</Option>)}
          </Select>
        </div>
        <span style={{ fontSize:'0.78rem', color:'#6a6d70' }}>M=Mandatory, O=Optional, MO=Mand/Optional, D=Display, null=Hidden</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
        {displayGroups.map(g => (
          <Card key={g.code}>
            <div style={{ padding:'1rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem' }}>
                <Title level="H5">{g.code} — {g.description}</Title>
                <Button design="Emphasized" onClick={() => save(g.code)}>Save</Button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:'0.75rem' }}>
                {FIELD_NAMES.map(field => (
                  <div key={field}>
                    <Label>{field}</Label>
                    <Select style={{ width:'100%' }} onChange={e => update(g.code, field, e.detail.selectedOption.dataset.value)}>
                      {visOptions.map(v => (
                        <Option key={String(v)} data-value={v ?? ''} selected={(config[g.code]?.[field] ?? null) === v}>
                          {v === null ? '(hidden)' : v}
                        </Option>
                      ))}
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Attachment Naming ─────────────────────────────────────────────────────────
function AttachmentNamingTab() {
  const [allGroups, setAllGroups] = useState([]);
  const [naming, setNaming] = useState({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/admin/config/doc-groups').then(r => r.json()).then(setAllGroups);
    fetch('/api/admin/config/attachment-naming').then(r => r.json()).then(setNaming);
  }, []);

  const save = async (group) => {
    await fetch(`/api/admin/config/attachment-naming/${group}`, {
      method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(naming[group] || [])
    });
    setMsg(`Saved naming for ${group}`); setTimeout(() => setMsg(''), 3000);
  };

  const updateField = (group, idx, val) => {
    setNaming(prev => {
      const arr = [...(prev[group] || [])];
      arr[idx] = val;
      return { ...prev, [group]: arr };
    });
  };

  const addField = (group) => {
    setNaming(prev => ({ ...prev, [group]: [...(prev[group] || []), ''] }));
  };

  const removeField = (group, idx) => {
    setNaming(prev => {
      const arr = (prev[group] || []).filter((_, i) => i !== idx);
      return { ...prev, [group]: arr };
    });
  };

  return (
    <div>
      {msg && <MessageStrip design="Positive" style={{ marginBottom:'1rem' }} onClose={() => setMsg('')}>{msg}</MessageStrip>}
      <p style={{ color:'#6a6d70', fontSize:'0.85rem', marginBottom:'1rem' }}>
        Configure the fields used to auto-generate attachment filenames for each document group.
      </p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:'1rem' }}>
        {allGroups.map(g => (
          <Card key={g.code}>
            <div style={{ padding:'1rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem' }}>
                <Title level="H5">{g.code}</Title>
                <Button design="Emphasized" onClick={() => save(g.code)}>Save</Button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem', marginBottom:'0.5rem' }}>
                {(naming[g.code] || []).map((f, i) => (
                  <div key={i} style={{ display:'flex', gap:'0.4rem', alignItems:'center' }}>
                    <Select style={{ flex:1 }} onChange={e => updateField(g.code, i, e.detail.selectedOption.dataset.value)}>
                      {FIELD_NAMES.map(fn => <Option key={fn} data-value={fn} selected={f === fn}>{fn}</Option>)}
                    </Select>
                    <Button design="Negative" onClick={() => removeField(g.code, i)}>✕</Button>
                  </div>
                ))}
              </div>
              <Button design="Transparent" onClick={() => addField(g.code)}>Add Field</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Work Centers ──────────────────────────────────────────────────────────────
function WorkCentersTab() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ departmentId:'', departmentName:'', description:'' });
  const [msg, setMsg] = useState('');

  const load = () => fetch('/api/admin/config/work-centers').then(r => r.json()).then(setRows);
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.departmentId) return;
    await fetch('/api/admin/config/work-centers', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) });
    setForm({ departmentId:'', departmentName:'', description:'' });
    setMsg('Work center saved.'); setTimeout(() => setMsg(''), 3000);
    load();
  };

  const remove = async (row) => {
    await fetch(`/api/admin/config/work-centers/${row.department_id}`, { method:'DELETE' });
    load();
  };

  const edit = (row) => {
    setForm({
      departmentId: row.department_id || '',
      departmentName: row.department_name || '',
      description: row.description || ''
    });
  };

  return (
    <div>
      {msg && <MessageStrip design="Positive" style={{ marginBottom:'1rem' }} onClose={() => setMsg('')}>{msg}</MessageStrip>}
      <Card style={{ marginBottom:'1.5rem' }}>
        <div style={{ padding:'1.25rem' }}>
          <Title level="H5" style={{ marginBottom:'1rem' }}>Add / Edit Department (Work Center)</Title>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(190px, 1fr))', gap:'1rem', marginBottom:'1rem' }}>
            <div><Label>Department ID*</Label><Input value={form.departmentId} onInput={e => setForm(p => ({ ...p, departmentId: e.target.value }))} placeholder="e.g. 1813" style={{ width:'100%' }} /></div>
            <div><Label>Name</Label><Input value={form.departmentName} onInput={e => setForm(p => ({ ...p, departmentName: e.target.value }))} style={{ width:'100%' }} /></div>
            <div><Label>Description</Label><Input value={form.description} onInput={e => setForm(p => ({ ...p, description: e.target.value }))} style={{ width:'100%' }} /></div>
          </div>
          <Button design="Emphasized" onClick={save}>Save</Button>
        </div>
      </Card>
      <Card>
        <TableGrid
          cols={[
            { key:'department_id',   label:'Department ID' },
            { key:'department_name', label:'Name' },
            { key:'description',     label:'Description' }
          ]}
          rows={rows.filter(r => r.active)}
          onEdit={edit}
          onDelete={remove}
        />
      </Card>
    </div>
  );
}

// ── Main Admin Component ──────────────────────────────────────────────────────
export default function Admin() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    fetch('/api/admin/stats').then(r => r.json()).then(s => {
      setStats(s);
      setLoading(false);
    });
  }, [currentUser]);

  if (currentUser?.role !== 'admin') {
    return (
      <div className="page-container">
        <MessageStrip design="Negative">Access denied. Admin role required.</MessageStrip>
        <Button design="Transparent" onClick={() => navigate('/')} style={{ marginTop:'1rem' }}>Go Home</Button>
      </div>
    );
  }

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', padding:'4rem' }}>
      <BusyIndicator active size="L" />
    </div>
  );

  const tabs = [
    { id:'overview',          label:'Overview' },
    { id:'workflows',         label:'Workflow Monitor' },
    { id:'approvers-disc',    label:'Approvers — Discipline' },
    { id:'approvers-maint',   label:'Approvers — Maintenance' },
    { id:'users',             label:'Users' },
    { id:'doc-types',         label:'Document Types' },
    { id:'doc-groups',        label:'Document Groups' },
    { id:'field-visibility',  label:'Field Visibility' },
    { id:'attachment-naming', label:'Attachment Naming' },
    { id:'work-centers',      label:'Work Centers' }
  ];

  return (
    <div className="page-container">
      <Title level="H2" style={{ marginBottom:'1.5rem' }}>Administration</Title>
      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview'          && <OverviewTab stats={stats} />}
      {activeTab === 'workflows'         && <WorkflowTab currentUser={currentUser} />}
      {activeTab === 'approvers-disc'    && <ApproversDisciplineTab />}
      {activeTab === 'approvers-maint'   && <ApproversMaintenanceTab />}
      {activeTab === 'users'             && <UsersTab currentUser={currentUser} />}
      {activeTab === 'doc-types'         && <DocumentTypesTab />}
      {activeTab === 'doc-groups'        && <DocumentGroupsTab />}
      {activeTab === 'field-visibility'  && <FieldVisibilityTab />}
      {activeTab === 'attachment-naming' && <AttachmentNamingTab />}
      {activeTab === 'work-centers'      && <WorkCentersTab />}
    </div>
  );
}
