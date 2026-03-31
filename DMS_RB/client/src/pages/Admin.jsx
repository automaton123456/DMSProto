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

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeCode(value) {
  return normalizeText(value).toUpperCase();
}

function sameText(a, b) {
  return normalizeText(a).toLowerCase() === normalizeText(b).toLowerCase();
}

function parseApproverList(value) {
  const items = Array.isArray(value) ? value : String(value ?? '').split(/[\r\n,;]+/);
  const seen = new Set();
  const usernames = [];

  items.forEach((item) => {
    const username = normalizeText(item);
    const key = username.toLowerCase();
    if (!username || seen.has(key)) return;
    seen.add(key);
    usernames.push(username);
  });

  return usernames;
}

function findUserByUsername(users, username) {
  return (users || []).find((user) => sameText(user.username, username));
}

function appendUsernameToList(existingValue, username) {
  const usernames = parseApproverList(existingValue);
  if (usernames.some((item) => sameText(item, username))) {
    return usernames.join('\n');
  }
  return [...usernames, username].join('\n');
}

function formatApprovalType(value) {
  return value === 'em' ? 'E&M' : 'Discipline (MSV)';
}

function groupDisciplineRules(rows) {
  const map = new Map();

  rows.forEach((row) => {
    const key = `${normalizeText(row.department_id).toLowerCase()}|${normalizeText(row.approval_type).toLowerCase()}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        department_id: row.department_id || '',
        approval_type: formatApprovalType(row.approval_type),
        approval_type_code: row.approval_type || 'msv',
        approver_usernames: [],
        approver_summary: ''
      });
    }

    const group = map.get(key);
    if (row.approver_username) {
      group.approver_usernames.push(row.approver_username);
      group.approver_summary = group.approver_usernames.join(', ');
    }
  });

  return Array.from(map.values()).sort((a, b) =>
    a.department_id.localeCompare(b.department_id) || a.approval_type_code.localeCompare(b.approval_type_code)
  );
}

function groupMaintenanceRules(rows) {
  const map = new Map();

  rows.forEach((row) => {
    const key = [
      normalizeText(row.maintenance_strategy).toLowerCase(),
      row.maintenance_days ?? '',
      normalizeText(row.approval_type).toLowerCase()
    ].join('|');

    if (!map.has(key)) {
      map.set(key, {
        key,
        maintenance_strategy: row.maintenance_strategy || '',
        maintenance_days: row.maintenance_days ?? '',
        approval_type: formatApprovalType(row.approval_type),
        approval_type_code: row.approval_type || 'msv',
        approver_usernames: [],
        approver_summary: ''
      });
    }

    const group = map.get(key);
    if (row.approver_username) {
      group.approver_usernames.push(row.approver_username);
      group.approver_summary = group.approver_usernames.join(', ');
    }
  });

  return Array.from(map.values()).sort((a, b) =>
    normalizeText(a.maintenance_strategy).localeCompare(normalizeText(b.maintenance_strategy)) ||
    Number(a.maintenance_days || 0) - Number(b.maintenance_days || 0) ||
    a.approval_type_code.localeCompare(b.approval_type_code)
  );
}

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
function ApproversDisciplineTab({ users }) {
  const emptyForm = { departmentId:'', approvalType:'msv', approverUsernames:'' };
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingRule, setEditingRule] = useState(null);
  const [approverCandidate, setApproverCandidate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('Positive');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const load = () => fetch('/api/admin/approvers/discipline').then(r => r.json()).then(setRows);
  useEffect(() => { load(); }, []);
  const groupedRows = groupDisciplineRules(rows.filter(r => r.active));
  const typedApprovers = parseApproverList(form.approverUsernames);
  const invalidApprovers = typedApprovers.filter((username) => !findUserByUsername(users, username));

  const save = async () => {
    const departmentId = normalizeText(form.departmentId);
    const approvalType = normalizeText(form.approvalType).toLowerCase();
    const approverUsernames = typedApprovers;

    if (!departmentId || approverUsernames.length === 0) {
      setMsgType('Negative');
      setMsg('Department ID and at least one approver are required.');
      return;
    }
    if (invalidApprovers.length > 0) {
      setMsgType('Negative');
      setMsg(`Unknown approver username(s): ${invalidApprovers.join(', ')}`);
      return;
    }

    const nextKey = `${departmentId.toLowerCase()}|${approvalType}`;
    const currentKey = editingRule ? `${normalizeText(editingRule.departmentId).toLowerCase()}|${normalizeText(editingRule.approvalType).toLowerCase()}` : null;
    const duplicate = groupedRows.find(r => r.key === nextKey && r.key !== currentKey);
    if (duplicate) {
      setMsgType('Negative');
      setMsg(`A rule already exists for ${departmentId} / ${approvalType.toUpperCase()}. Edit the existing rule instead.`);
      return;
    }

    const isEditing = modalMode === 'edit' && editingRule !== null;
    try {
      const response = await fetch('/api/admin/approvers/discipline-group', {
        method: isEditing ? 'PUT' : 'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          departmentId,
          approvalType,
          approverUsernames,
          ...(isEditing ? {
            originalDepartmentId: editingRule.departmentId,
            originalApprovalType: editingRule.approvalType
          } : {})
        })
      });
      const res = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(res.error || 'Failed to save approver rule');
      setMsgType('Positive');
      setForm(emptyForm);
      setEditingRule(null);
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
    try {
      const response = await fetch('/api/admin/approvers/discipline-group', {
        method:'DELETE',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          departmentId: row.department_id,
          approvalType: row.approval_type_code
        })
      });
      const res = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(res.error || 'Failed to remove approver rule');
      setMsgType('Positive');
      setMsg('Approver rule removed. Pending workflows re-evaluated.');
      setTimeout(() => setMsg(''), 3000);
      load();
    } catch (err) {
      setMsgType('Negative');
      setMsg(err.message);
    }
  };

  const edit = (row) => {
    setModalMode('edit');
    setEditingRule({
      departmentId: row.department_id || '',
      approvalType: row.approval_type_code || 'msv'
    });
    setForm({
      departmentId: row.department_id || '',
      approvalType: row.approval_type_code || 'msv',
      approverUsernames: (row.approver_usernames || []).join('\n')
    });
    setApproverCandidate('');
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setModalMode('add');
    setEditingRule(null);
    setForm(emptyForm);
    setApproverCandidate('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setForm(emptyForm);
    setEditingRule(null);
    setApproverCandidate('');
    setIsModalOpen(false);
  };

  const addApproverCandidate = () => {
    const candidate = normalizeText(approverCandidate);
    if (!candidate) return;
    const user = findUserByUsername(users, candidate);
    if (!user) {
      setMsgType('Negative');
      setMsg(`Username "${candidate}" is not in the active users list.`);
      return;
    }
    setForm((prev) => ({
      ...prev,
      approverUsernames: appendUsernameToList(prev.approverUsernames, user.username)
    }));
    setApproverCandidate('');
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
                <div style={{ gridColumn:'1 / -1' }}>
                  <Label>Add From Users</Label>
                  <div style={{ display:'flex', gap:'0.5rem', marginBottom:'0.75rem', alignItems:'center' }}>
                    <input
                      className="form-control form-control-sm"
                      list="discipline-approver-users"
                      value={approverCandidate}
                      onChange={(e) => setApproverCandidate(e.target.value)}
                      placeholder="Start typing a username"
                    />
                    <Button design="Default" onClick={addApproverCandidate}>Add</Button>
                    <datalist id="discipline-approver-users">
                      {(users || []).map((user) => (
                        <option key={user.username} value={user.username}>{user.displayName || user.username}</option>
                      ))}
                    </datalist>
                  </div>
                  <Label>Approver Usernames</Label>
                  <textarea
                    className="form-control form-control-sm"
                    value={form.approverUsernames}
                    onChange={e => setForm(p => ({ ...p, approverUsernames: e.target.value }))}
                    placeholder={'One username per line, or separate with commas'}
                    rows={5}
                    style={{ width:'100%' }}
                  />
                  <div style={{ fontSize:'0.78rem', color:'#6a6d70', marginTop:'0.35rem' }}>
                    Multiple approvers are allowed for the same department and approval type.
                  </div>
                  {typedApprovers.length > 0 && (
                    <div style={{ fontSize:'0.78rem', color:'#6a6d70', marginTop:'0.5rem' }}>
                      Selected: {typedApprovers.map((username) => {
                        const user = findUserByUsername(users, username);
                        return user ? `${user.username} (${user.displayName || user.username})` : username;
                      }).join(', ')}
                    </div>
                  )}
                  {invalidApprovers.length > 0 && (
                    <div style={{ fontSize:'0.78rem', color:'#b00', marginTop:'0.35rem' }}>
                      Invalid usernames: {invalidApprovers.join(', ')}
                    </div>
                  )}
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
            { key:'approver_summary', label:'Approvers' }
          ]}
          rows={groupedRows}
          onEdit={edit}
          onDelete={remove}
        />
      </Card>
    </div>
  );
}

// ── Approvers by Maintenance ──────────────────────────────────────────────────
function ApproversMaintenanceTab({ users }) {
  const emptyForm = { maintenanceStrategy:'', maintenanceDays:'', approvalType:'msv', approverUsernames:'' };
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingRule, setEditingRule] = useState(null);
  const [approverCandidate, setApproverCandidate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('Positive');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const load = () => fetch('/api/admin/approvers/maintenance').then(r => r.json()).then(setRows);
  useEffect(() => { load(); }, []);
  const groupedRows = groupMaintenanceRules(rows.filter(r => r.active));
  const typedApprovers = parseApproverList(form.approverUsernames);
  const invalidApprovers = typedApprovers.filter((username) => !findUserByUsername(users, username));

  const save = async () => {
    const maintenanceStrategy = normalizeText(form.maintenanceStrategy);
    const maintenanceDays = normalizeText(form.maintenanceDays) === '' ? null : parseInt(form.maintenanceDays, 10);
    const approvalType = normalizeText(form.approvalType).toLowerCase();
    const approverUsernames = typedApprovers;

    if (!maintenanceStrategy && maintenanceDays === null) {
      setMsgType('Negative');
      setMsg('Maintenance Strategy or Maintenance Days is required.');
      return;
    }
    if (maintenanceDays !== null && (!Number.isInteger(maintenanceDays) || maintenanceDays < 0)) {
      setMsgType('Negative');
      setMsg('Maintenance Days must be a whole number >= 0.');
      return;
    }
    if (approverUsernames.length === 0) {
      setMsgType('Negative');
      setMsg('At least one approver is required.');
      return;
    }
    if (invalidApprovers.length > 0) {
      setMsgType('Negative');
      setMsg(`Unknown approver username(s): ${invalidApprovers.join(', ')}`);
      return;
    }

    const nextKey = [maintenanceStrategy.toLowerCase(), maintenanceDays ?? '', approvalType].join('|');
    const currentKey = editingRule
      ? [normalizeText(editingRule.maintenanceStrategy).toLowerCase(), editingRule.maintenanceDays ?? '', normalizeText(editingRule.approvalType).toLowerCase()].join('|')
      : null;
    const duplicate = groupedRows.find(r => r.key === nextKey && r.key !== currentKey);
    if (duplicate) {
      setMsgType('Negative');
      setMsg('A maintenance approver rule already exists for that strategy/days/type combination.');
      return;
    }

    const isEditing = modalMode === 'edit' && editingRule !== null;
    try {
      const response = await fetch('/api/admin/approvers/maintenance-group', {
        method: isEditing ? 'PUT' : 'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          maintenanceStrategy: maintenanceStrategy || null,
          maintenanceDays,
          approvalType,
          approverUsernames,
          ...(isEditing ? {
            original: {
              maintenanceStrategy: editingRule.maintenanceStrategy || null,
              maintenanceDays: editingRule.maintenanceDays ?? null,
              approvalType: editingRule.approvalType
            }
          } : {})
        })
      });
      const res = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(res.error || 'Failed to save maintenance approver rule');
      setMsgType('Positive');
      setForm(emptyForm);
      setEditingRule(null);
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
    try {
      const response = await fetch('/api/admin/approvers/maintenance-group', {
        method:'DELETE',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          maintenanceStrategy: row.maintenance_strategy || null,
          maintenanceDays: row.maintenance_days === '' ? null : row.maintenance_days,
          approvalType: row.approval_type_code
        })
      });
      const res = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(res.error || 'Failed to remove maintenance approver rule');
      setMsgType('Positive');
      setMsg('Rule removed.');
      setTimeout(() => setMsg(''), 3000);
      load();
    } catch (err) {
      setMsgType('Negative');
      setMsg(err.message);
    }
  };

  const edit = (row) => {
    setModalMode('edit');
    setEditingRule({
      maintenanceStrategy: row.maintenance_strategy || '',
      maintenanceDays: row.maintenance_days === '' ? null : row.maintenance_days,
      approvalType: row.approval_type_code || 'msv'
    });
    setForm({
      maintenanceStrategy: row.maintenance_strategy || '',
      maintenanceDays: row.maintenance_days === '' ? '' : row.maintenance_days,
      approvalType: row.approval_type_code || 'msv',
      approverUsernames: (row.approver_usernames || []).join('\n')
    });
    setApproverCandidate('');
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setModalMode('add');
    setEditingRule(null);
    setForm(emptyForm);
    setApproverCandidate('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setForm(emptyForm);
    setEditingRule(null);
    setApproverCandidate('');
    setIsModalOpen(false);
  };

  const addApproverCandidate = () => {
    const candidate = normalizeText(approverCandidate);
    if (!candidate) return;
    const user = findUserByUsername(users, candidate);
    if (!user) {
      setMsgType('Negative');
      setMsg(`Username "${candidate}" is not in the active users list.`);
      return;
    }
    setForm((prev) => ({
      ...prev,
      approverUsernames: appendUsernameToList(prev.approverUsernames, user.username)
    }));
    setApproverCandidate('');
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
                <div style={{ gridColumn:'1 / -1' }}>
                  <Label>Add From Users</Label>
                  <div style={{ display:'flex', gap:'0.5rem', marginBottom:'0.75rem', alignItems:'center' }}>
                    <input
                      className="form-control form-control-sm"
                      list="maintenance-approver-users"
                      value={approverCandidate}
                      onChange={(e) => setApproverCandidate(e.target.value)}
                      placeholder="Start typing a username"
                    />
                    <Button design="Default" onClick={addApproverCandidate}>Add</Button>
                    <datalist id="maintenance-approver-users">
                      {(users || []).map((user) => (
                        <option key={user.username} value={user.username}>{user.displayName || user.username}</option>
                      ))}
                    </datalist>
                  </div>
                  <Label>Approver Usernames</Label>
                  <textarea
                    className="form-control form-control-sm"
                    value={form.approverUsernames}
                    onChange={e => setForm(p => ({ ...p, approverUsernames: e.target.value }))}
                    rows={5}
                    placeholder={'One username per line, or separate with commas'}
                    style={{ width:'100%' }}
                  />
                  {typedApprovers.length > 0 && (
                    <div style={{ fontSize:'0.78rem', color:'#6a6d70', marginTop:'0.5rem' }}>
                      Selected: {typedApprovers.map((username) => {
                        const user = findUserByUsername(users, username);
                        return user ? `${user.username} (${user.displayName || user.username})` : username;
                      }).join(', ')}
                    </div>
                  )}
                  {invalidApprovers.length > 0 && (
                    <div style={{ fontSize:'0.78rem', color:'#b00', marginTop:'0.35rem' }}>
                      Invalid usernames: {invalidApprovers.join(', ')}
                    </div>
                  )}
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
            { key:'maintenance_strategy', label:'Strategy' },
            { key:'maintenance_days',     label:'Days' },
            { key:'approval_type',        label:'Approval Type' },
            { key:'approver_summary',     label:'Approvers' }
          ]}
          rows={groupedRows}
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
    const username = normalizeText(form.username);
    if (!username) {
      setMsgType('Negative');
      setMsg('Username is required.');
      return;
    }

    const isEditing = userModalMode === 'edit' && editingUsername;
    const email = normalizeText(form.email);
    if (!isEditing && !email) {
      setMsgType('Negative');
      setMsg('Email is required when adding a user.');
      return;
    }

    const duplicate = users.find(u => sameText(u.username, username) && (!isEditing || !sameText(u.username, editingUsername)));
    if (duplicate) {
      setMsgType('Negative');
      setMsg(`User "${username}" already exists.`);
      return;
    }

    try {
      const response = await fetch(isEditing ? `/api/admin/users/${editingUsername}` : '/api/admin/users', {
        method: isEditing ? 'PUT' : 'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ...form, username, email })
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
            <span style={{ fontSize:'0.78rem', color:'#6a6d70' }}>Columns: Username | Display Name | Email | Role (user, editor, admin)</span>
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
                <div><Label>{userModalMode === 'add' ? 'Email*' : 'Email'}</Label><Input value={form.email} onInput={e => setForm(p => ({ ...p, email: e.target.value }))} style={{ width:'100%' }} required={userModalMode === 'add'} /></div>
                <div>
                  <Label>Role</Label>
                  <Select style={{ width:'100%' }} onChange={e => setForm(p => ({ ...p, role: e.detail.selectedOption.dataset.value }))}>
                    <Option data-value="user" selected={form.role === 'user'}>User</Option>
                    <Option data-value="editor" selected={form.role === 'editor'}>Editor</Option>
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
                    <span style={{
                      background: u.role === 'admin' ? '#e3f2fd' : u.role === 'editor' ? '#fff3cd' : '#f0f0f0',
                      color: u.role === 'admin' ? '#0070f2' : u.role === 'editor' ? '#8a6d1f' : '#666',
                      padding:'0.2rem 0.6rem',
                      borderRadius:'1rem',
                      fontSize:'0.72rem',
                      fontWeight:600
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding:'0.6rem 0.9rem' }}>
                    <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                      <Button design="Default" onClick={() => editUser(u)}>Edit</Button>
                      {u.username !== currentUser.username && (
                        <>
                          <Button design={u.role === 'user' ? 'Emphasized' : 'Transparent'} onClick={() => updateRole(u.username, 'user')} disabled={u.role === 'user'}>
                            Make User
                          </Button>
                          <Button design={u.role === 'editor' ? 'Emphasized' : 'Transparent'} onClick={() => updateRole(u.username, 'editor')} disabled={u.role === 'editor'}>
                            Make Editor
                          </Button>
                          <Button design={u.role === 'admin' ? 'Emphasized' : 'Transparent'} onClick={() => updateRole(u.username, 'admin')} disabled={u.role === 'admin'}>
                            Make Admin
                          </Button>
                        </>
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
  const [msgType, setMsgType] = useState('Positive');
  const [editingCode, setEditingCode] = useState(null);

  const loadTypes  = () => fetch('/api/admin/config/doc-types').then(r => r.json()).then(setTypes);
  useEffect(() => { loadTypes(); }, []);

  const saveType = async () => {
    const code = normalizeCode(typeForm.code);
    const description = normalizeText(typeForm.description);
    if (!code) {
      setMsgType('Negative');
      setMsg('Code is required.');
      return;
    }

    const isEditing = modalMode === 'edit' && editingCode;
    const duplicate = types.find(t => sameText(t.code, code) && (!isEditing || !sameText(t.code, editingCode)));
    if (duplicate) {
      setMsgType('Negative');
      setMsg(`Document type "${code}" already exists.`);
      return;
    }

    try {
      const response = await fetch(isEditing ? `/api/admin/config/doc-types/${editingCode}` : '/api/admin/config/doc-types', {
        method: isEditing ? 'PUT' : 'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ code, description })
      });
      const res = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(res.error || 'Failed to save document type');
      setMsgType('Positive');
      setTypeForm({ code:'', description:'' });
      setEditingCode(null);
      setIsModalOpen(false);
      setModalMode('add');
      setMsg('Document type saved.');
      setTimeout(() => setMsg(''), 3000);
      loadTypes();
    } catch (err) {
      setMsgType('Negative');
      setMsg(err.message);
    }
  };

  const delType = async (code) => {
    await fetch(`/api/admin/config/doc-types/${code}`, { method:'DELETE' });
    loadTypes();
  };

  const editType = (row) => {
    setModalMode('edit');
    setEditingCode(row.code || null);
    setTypeForm({ code: row.code || '', description: row.description || '' });
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setModalMode('add');
    setEditingCode(null);
    setTypeForm({ code:'', description:'' });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setTypeForm({ code:'', description:'' });
    setEditingCode(null);
    setIsModalOpen(false);
  };

  return (
    <div>
      {msg && <MessageStrip design={msgType} style={{ marginBottom:'1rem' }} onClose={() => setMsg('')}>{msg}</MessageStrip>}
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
                    <Input placeholder="Code" value={typeForm.code} onInput={e => setTypeForm(p => ({ ...p, code: e.target.value }))} style={{ width:'90px' }} disabled={modalMode === 'edit'} />
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
  const [msgType, setMsgType] = useState('Positive');
  const [editingCode, setEditingCode] = useState(null);

  const loadTypes  = () => fetch('/api/admin/config/doc-types').then(r => r.json()).then(setTypes);
  const loadGroups = () => fetch('/api/admin/config/doc-groups').then(r => r.json()).then(setGroups);
  useEffect(() => { loadTypes(); loadGroups(); }, []);

  const saveGroup = async () => {
    const docType = normalizeCode(groupForm.docType);
    const code = normalizeCode(groupForm.code);
    const description = normalizeText(groupForm.description);
    if (!code || !docType) {
      setMsgType('Negative');
      setMsg('Document type and code are required.');
      return;
    }

    const isEditing = modalMode === 'edit' && editingCode;
    const duplicate = groups.find(g => sameText(g.code, code) && (!isEditing || !sameText(g.code, editingCode)));
    if (duplicate) {
      setMsgType('Negative');
      setMsg(`Document group "${code}" already exists.`);
      return;
    }

    try {
      const response = await fetch(isEditing ? `/api/admin/config/doc-groups/${editingCode}` : '/api/admin/config/doc-groups', {
        method: isEditing ? 'PUT' : 'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          docType,
          code,
          description,
          workflowRequired: Boolean(groupForm.workflowRequired)
        })
      });
      const res = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(res.error || 'Failed to save document group');
      setMsgType('Positive');
      setGroupForm(emptyGroupForm);
      setEditingCode(null);
      setIsModalOpen(false);
      setModalMode('add');
      setMsg('Document group saved.');
      setTimeout(() => setMsg(''), 3000);
      loadGroups();
    } catch (err) {
      setMsgType('Negative');
      setMsg(err.message);
    }
  };

  const delGroup = async (code) => {
    await fetch(`/api/admin/config/doc-groups/${code}`, { method:'DELETE' });
    loadGroups();
  };

  const editGroup = (row) => {
    setModalMode('edit');
    setEditingCode(row.code || null);
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
    setEditingCode(null);
    setGroupForm(emptyGroupForm);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setGroupForm(emptyGroupForm);
    setEditingCode(null);
    setIsModalOpen(false);
  };

  return (
    <div>
      {msg && <MessageStrip design={msgType} style={{ marginBottom:'1rem' }} onClose={() => setMsg('')}>{msg}</MessageStrip>}
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
                    <div><Label>Code</Label><Input value={groupForm.code} onInput={e => setGroupForm(p => ({ ...p, code: e.target.value }))} style={{ width:'100%' }} disabled={modalMode === 'edit'} /></div>
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
        <span style={{ fontSize:'0.78rem', color:'#6a6d70' }}>M=Mandatory, O=Optional, D=Display only, null=Hidden</span>
      </div>
      <Card style={{ marginBottom:'1rem' }}>
        <div style={{ padding:'0.9rem 1rem', fontSize:'0.82rem', color:'#4b5563', lineHeight:1.5 }}>
          <div><strong>Visibility codes:</strong> `M` = Mandatory, `O` = Optional, `D` = Display only, `M*` = Multiple entries with at least one required, `AMO` = Mandatory for approvers only, `MO` = One object-link field in the row is mandatory and related object-link values should stay together in the same row.</div>
        </div>
      </Card>
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

// ── Departments ───────────────────────────────────────────────────────────────
function WorkCentersTab() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ departmentId:'', departmentName:'', description:'' });
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('Positive');
  const [editingDepartmentId, setEditingDepartmentId] = useState(null);

  const load = () => fetch('/api/admin/config/work-centers').then(r => r.json()).then(setRows);
  useEffect(() => { load(); }, []);

  const save = async () => {
    const departmentId = normalizeText(form.departmentId);
    if (!departmentId) {
      setMsgType('Negative');
      setMsg('Department ID is required.');
      return;
    }

    const isEditing = Boolean(editingDepartmentId);
    const duplicate = rows.filter(r => r.active).find(
      r => sameText(r.department_id, departmentId) && (!isEditing || !sameText(r.department_id, editingDepartmentId))
    );
    if (duplicate) {
      setMsgType('Negative');
      setMsg(`Department "${departmentId}" already exists.`);
      return;
    }

    try {
      const response = await fetch(isEditing ? `/api/admin/config/work-centers/${editingDepartmentId}` : '/api/admin/config/work-centers', {
        method: isEditing ? 'PUT' : 'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          departmentId,
          departmentName: normalizeText(form.departmentName),
          description: normalizeText(form.description)
        })
      });
      const res = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(res.error || 'Failed to save department');
      setMsgType('Positive');
      setForm({ departmentId:'', departmentName:'', description:'' });
      setEditingDepartmentId(null);
      setMsg('Department saved.');
      setTimeout(() => setMsg(''), 3000);
      load();
    } catch (err) {
      setMsgType('Negative');
      setMsg(err.message);
    }
  };

  const remove = async (row) => {
    await fetch(`/api/admin/config/work-centers/${row.department_id}`, { method:'DELETE' });
    load();
  };

  const edit = (row) => {
    setEditingDepartmentId(row.department_id || null);
    setForm({
      departmentId: row.department_id || '',
      departmentName: row.department_name || '',
      description: row.description || ''
    });
  };

  const cancelEdit = () => {
    setEditingDepartmentId(null);
    setForm({ departmentId:'', departmentName:'', description:'' });
  };

  return (
    <div>
      {msg && <MessageStrip design={msgType} style={{ marginBottom:'1rem' }} onClose={() => setMsg('')}>{msg}</MessageStrip>}
      <Card style={{ marginBottom:'1.5rem' }}>
        <div style={{ padding:'1.25rem' }}>
          <Title level="H5" style={{ marginBottom:'1rem' }}>{editingDepartmentId ? 'Edit Department' : 'Add Department'}</Title>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(190px, 1fr))', gap:'1rem', marginBottom:'1rem' }}>
            <div><Label>Department ID*</Label><Input value={form.departmentId} onInput={e => setForm(p => ({ ...p, departmentId: e.target.value }))} placeholder="e.g. 1813" style={{ width:'100%' }} disabled={Boolean(editingDepartmentId)} /></div>
            <div><Label>Name</Label><Input value={form.departmentName} onInput={e => setForm(p => ({ ...p, departmentName: e.target.value }))} style={{ width:'100%' }} /></div>
            <div><Label>Description</Label><Input value={form.description} onInput={e => setForm(p => ({ ...p, description: e.target.value }))} style={{ width:'100%' }} /></div>
          </div>
          <div style={{ display:'flex', gap:'0.75rem' }}>
            <Button design="Emphasized" onClick={save}>Save</Button>
            {editingDepartmentId && <Button design="Default" onClick={cancelEdit}>Cancel</Button>}
          </div>
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
  const { currentUser, users } = useAuth();
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
    { id:'work-centers',      label:'Departments' }
  ];

  const orderedTabs = [
    tabs.find((tab) => tab.id === 'overview'),
    tabs.find((tab) => tab.id === 'workflows'),
    tabs.find((tab) => tab.id === 'users'),
    tabs.find((tab) => tab.id === 'approvers-disc'),
    tabs.find((tab) => tab.id === 'approvers-maint'),
    tabs.find((tab) => tab.id === 'doc-types'),
    tabs.find((tab) => tab.id === 'doc-groups'),
    tabs.find((tab) => tab.id === 'field-visibility'),
    tabs.find((tab) => tab.id === 'attachment-naming'),
    tabs.find((tab) => tab.id === 'work-centers')
  ].filter(Boolean);

  return (
    <div className="page-container">
      <Title level="H2" style={{ marginBottom:'1.5rem' }}>Administration</Title>
      <TabBar tabs={orderedTabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview'          && <OverviewTab stats={stats} />}
      {activeTab === 'workflows'         && <WorkflowTab currentUser={currentUser} />}
      {activeTab === 'approvers-disc'    && <ApproversDisciplineTab users={users} />}
      {activeTab === 'approvers-maint'   && <ApproversMaintenanceTab users={users} />}
      {activeTab === 'users'             && <UsersTab currentUser={currentUser} />}
      {activeTab === 'doc-types'         && <DocumentTypesTab />}
      {activeTab === 'doc-groups'        && <DocumentGroupsTab />}
      {activeTab === 'field-visibility'  && <FieldVisibilityTab />}
      {activeTab === 'attachment-naming' && <AttachmentNamingTab />}
      {activeTab === 'work-centers'      && <WorkCentersTab />}
    </div>
  );
}
