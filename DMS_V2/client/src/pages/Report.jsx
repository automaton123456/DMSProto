import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Title, Card, Button, Input, Select, Option,
  BusyIndicator, Label, Icon, MessageStrip
} from '@ui5/webcomponents-react';
import { useAuth } from '../context/AuthContext.jsx';

const STATUS_STYLES = {
  'Draft':                      { background: '#f0f0f0',  color: '#666' },
  'Approved':                   { background: '#e8f5e9',  color: '#107e3e' },
  'Rejected':                   { background: '#fce4ec',  color: '#b00' },
  'Pending Discipline Approval':{ background: '#fff3e0',  color: '#b26000' },
  'Pending MSV Approval':       { background: '#fff3e0',  color: '#b26000' },
  'Pending E&M Approval':       { background: '#e3f2fd',  color: '#0070f2' }
};

const ALL_STATUSES = [
  'Draft', 'Pending Discipline Approval', 'Pending MSV Approval',
  'Pending E&M Approval', 'Approved', 'Rejected'
];

const nativeDateStyle = {
  width: '100%', height: '2.25rem', padding: '0 0.625rem',
  border: '1px solid var(--sapField_BorderColor, #bfbfbf)',
  borderRadius: '0.25rem', fontSize: '0.875rem', fontFamily: 'inherit',
  color: 'var(--sapTextColor, #32363a)', background: 'var(--sapField_Background, #fff)',
  outline: 'none', boxSizing: 'border-box', cursor: 'pointer'
};

export default function Report() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);
  const [sortKey,  setSortKey]  = useState('createdDate');
  const [sortDir,  setSortDir]  = useState('desc');

  // ── Filters ──────────────────────────────────────────────────────────────
  const [docId,          setDocId]          = useState(searchParams.get('documentId') || '');
  const [rigFilter,      setRigFilter]      = useState(searchParams.get('rig') || '');
  const [docTypeFilter,  setDocTypeFilter]  = useState(searchParams.get('docType') || '');
  const [statusFilter,   setStatusFilter]   = useState(searchParams.get('status') || '');
  const [originatorFilter,setOriginatorFilter] = useState(searchParams.get('originator') || '');
  const [dateFrom,       setDateFrom]       = useState('');
  const [dateTo,         setDateTo]         = useState('');
  const [woFilter,       setWoFilter]       = useState('');
  const [eqFilter,       setEqFilter]       = useState('');
  const [descFilter,     setDescFilter]     = useState('');
  const [manuFilter,     setManuFilter]     = useState('');
  const [certAuthFilter, setCertAuthFilter] = useState('');
  const [certNumFilter,  setCertNumFilter]  = useState('');
  const [fullTextFilter, setFullTextFilter] = useState('');

  const [rigs,     setRigs]     = useState([]);
  const [docTypes, setDocTypes] = useState([]);

  useEffect(() => {
    fetch('/api/rigs').then(r => r.json()).then(setRigs);
    fetch('/api/config/document-types').then(r => r.json()).then(setDocTypes);
    if (searchParams.toString()) runSearch();
  }, []);

  const buildQueryString = () => {
    const p = new URLSearchParams();
    if (docId)          p.append('documentId',  docId);
    if (rigFilter)      p.append('rig',         rigFilter);
    if (docTypeFilter)  p.append('docType',     docTypeFilter);
    if (statusFilter)   p.append('status',      statusFilter);
    if (originatorFilter) p.append('originator', originatorFilter);
    if (dateFrom)       p.append('dateFrom',    dateFrom);
    if (dateTo)         p.append('dateTo',      dateTo);
    if (woFilter)       p.append('workOrder',   woFilter);
    if (eqFilter)       p.append('equipment',   eqFilter);
    if (descFilter)     p.append('description', descFilter);
    if (manuFilter)     p.append('manuName',    manuFilter);
    if (certAuthFilter) p.append('certAuth',    certAuthFilter);
    if (certNumFilter)  p.append('certNum',     certNumFilter);
    if (fullTextFilter) p.append('fullText',    fullTextFilter);
    return p.toString();
  };

  const runSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const qs  = buildQueryString();
      const res = await fetch(`/api/report${qs ? '?' + qs : ''}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (e) {
      setResults([]);
    }
    setLoading(false);
  };

  const handleExport = () => {
    const qs = buildQueryString();
    window.open(`/api/report/export${qs ? '?' + qs : ''}`);
  };

  const clearFilters = () => {
    setDocId(''); setRigFilter(''); setDocTypeFilter(''); setStatusFilter('');
    setOriginatorFilter(''); setDateFrom(''); setDateTo('');
    setWoFilter(''); setEqFilter(''); setDescFilter('');
    setManuFilter(''); setCertAuthFilter(''); setCertNumFilter('');
    setFullTextFilter('');
    setResults([]); setSearched(false);
  };

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = [...results].sort((a, b) => {
    const av = sortKey === 'addDesc'      ? (a.classifications?.addDesc || '') :
               sortKey === 'docTypeGroup' ? `${a.docType}/${a.docGroup}` :
               a[sortKey] || '';
    const bv = sortKey === 'addDesc'      ? (b.classifications?.addDesc || '') :
               sortKey === 'docTypeGroup' ? `${b.docType}/${b.docGroup}` :
               b[sortKey] || '';
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const SortIcon = ({ col }) => (
    <span style={{ marginLeft:'0.3rem', opacity: sortKey === col ? 1 : 0.3 }}>
      {sortKey === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  return (
    <div className="page-container">
      {/* Breadcrumb */}
      <div style={{ display:'flex', alignItems:'center', gap:'0.4rem', marginBottom:'1rem', fontSize:'0.875rem' }}>
        <span onClick={() => navigate('/')} style={{ color:'#0070f2', cursor:'pointer' }}>Home</span>
        <span style={{ color:'#8c8c8c' }}>/</span>
        <span style={{ color:'#32363a', fontWeight:500 }}>DMS Report (CV04N)</span>
      </div>
      <Title level="H2" style={{ marginBottom:'1.5rem' }}>DMS Report — CV04N Search</Title>

      {/* Filters */}
      <Card style={{ marginBottom:'1.5rem' }}>
        <div style={{ padding:'1.25rem 1.5rem' }}>
          <Title level="H5" style={{ marginBottom:'1rem', color:'#6a6d70' }}>SEARCH FILTERS</Title>

          {/* Full-text search bar */}
          <div style={{ marginBottom:'1rem', padding:'0.75rem', background:'#f0f7ff', borderRadius:'0.5rem', border:'1px solid #cce0ff' }}>
            <Label style={{ fontWeight:600, color:'#0070f2' }}>Full-Text Search (searches all fields)</Label>
            <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.4rem' }}>
              <Input
                value={fullTextFilter}
                onInput={e => setFullTextFilter(e.target.value)}
                placeholder="Search across document ID, description, manufacturer, certifying authority, work order, asset number…"
                style={{ flex:1 }}
              />
            </div>
          </div>

          {/* Field filters */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(210px, 1fr))', gap:'1rem', marginBottom:'1rem' }}>
            <div>
              <Label>Document ID</Label>
              <Input value={docId} onInput={e => setDocId(e.target.value)} placeholder="e.g. 000001" style={{ width:'100%' }} />
            </div>
            <div>
              <Label>Rig</Label>
              <Select style={{ width:'100%' }} onChange={e => setRigFilter(e.detail.selectedOption.dataset.value)}>
                <Option data-value="">All Rigs</Option>
                {rigs.map(r => <Option key={r.id} data-value={r.id} selected={r.id === rigFilter}>{r.id}</Option>)}
              </Select>
            </div>
            <div>
              <Label>Document Type</Label>
              <Select style={{ width:'100%' }} onChange={e => setDocTypeFilter(e.detail.selectedOption.dataset.value)}>
                <Option data-value="">All Types</Option>
                {docTypes.map(t => <Option key={t.code} data-value={t.code} selected={t.code === docTypeFilter}>{t.code} — {t.description}</Option>)}
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select style={{ width:'100%' }} onChange={e => setStatusFilter(e.detail.selectedOption.dataset.value)}>
                <Option data-value="">All Statuses</Option>
                {ALL_STATUSES.map(s => <Option key={s} data-value={s} selected={s === statusFilter}>{s}</Option>)}
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={descFilter} onInput={e => setDescFilter(e.target.value)} placeholder="Partial match" style={{ width:'100%' }} />
            </div>
            <div>
              <Label>Manufacturer</Label>
              <Input value={manuFilter} onInput={e => setManuFilter(e.target.value)} placeholder="Partial match" style={{ width:'100%' }} />
            </div>
            <div>
              <Label>Certifying Authority</Label>
              <Input value={certAuthFilter} onInput={e => setCertAuthFilter(e.target.value)} placeholder="Partial match" style={{ width:'100%' }} />
            </div>
            <div>
              <Label>Certificate Number</Label>
              <Input value={certNumFilter} onInput={e => setCertNumFilter(e.target.value)} placeholder="Partial match" style={{ width:'100%' }} />
            </div>
            <div>
              <Label>Originator</Label>
              <Input value={originatorFilter} onInput={e => setOriginatorFilter(e.target.value)} placeholder="Username" style={{ width:'100%' }} />
            </div>
            <div>
              <Label>Work Order</Label>
              <Input value={woFilter} onInput={e => setWoFilter(e.target.value)} placeholder="Partial match" style={{ width:'100%' }} />
            </div>
            <div>
              <Label>E&amp;M Asset Number</Label>
              <Input value={eqFilter} onInput={e => setEqFilter(e.target.value)} placeholder="Partial match" style={{ width:'100%' }} />
            </div>
            <div>
              <Label>Date From</Label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={nativeDateStyle} />
            </div>
            <div>
              <Label>Date To</Label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={nativeDateStyle} />
            </div>
          </div>

          <div style={{ display:'flex', gap:'0.75rem' }}>
            <Button design="Emphasized" icon="search" onClick={runSearch}>Search</Button>
            <Button design="Transparent" icon="clear-all" onClick={clearFilters}>Clear</Button>
            {results.length > 0 && (
              <Button design="Default" icon="download" onClick={handleExport}>Export CSV</Button>
            )}
          </div>
        </div>
      </Card>

      {/* Results */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'3rem' }}>
          <BusyIndicator active size="L" />
        </div>
      ) : searched ? (
        <Card>
          <div style={{ padding:'0.75rem 1.5rem', borderBottom:'1px solid #e8e8e8', display:'flex', alignItems:'center', gap:'0.75rem' }}>
            <span style={{ fontWeight:600, fontSize:'0.9rem' }}>
              {results.length} result{results.length !== 1 ? 's' : ''}
            </span>
            {results.length > 0 && (
              <span style={{ color:'#6a6d70', fontSize:'0.8rem' }}>— click any row to open document</span>
            )}
          </div>

          {results.length === 0 ? (
            <div style={{ padding:'3rem', textAlign:'center' }}>
              <Icon name="search" style={{ fontSize:'3rem', color:'#d9d9d9', marginBottom:'1rem' }} />
              <Title level="H4" style={{ color:'#6a6d70' }}>No documents found</Title>
              <p style={{ color:'#6a6d70', fontSize:'0.9rem' }}>Try adjusting your search filters</p>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.875rem' }}>
                <thead>
                  <tr style={{ background:'#f5f6f7', borderBottom:'2px solid #e8e8e8' }}>
                    {[
                      ['documentId',   'Doc ID'],
                      ['version',      'Version'],
                      ['rig',          'Rig'],
                      ['docTypeGroup', 'Type/Group'],
                      ['addDesc',      'Description'],
                      ['originator',   'Originator'],
                      ['status',       'Status'],
                      ['createdDate',  'Created']
                    ].map(([key, label]) => (
                      <th key={key} onClick={() => handleSort(key)} style={{
                        padding:'0.65rem 1rem', textAlign:'left', cursor:'pointer',
                        fontWeight:600, userSelect:'none', whiteSpace:'nowrap'
                      }}>
                        {label}<SortIcon col={key} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(doc => (
                    <tr
                      key={doc.documentId}
                      onClick={() => navigate(`/documents/${doc.documentId}`)}
                      style={{ cursor:'pointer', borderBottom:'1px solid #f0f0f0' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                      <td style={{ padding:'0.65rem 1rem', fontWeight:600, color:'#0070f2' }}>{doc.documentId}</td>
                      <td style={{ padding:'0.65rem 1rem', color:'#6a6d70' }}>v{doc.version || '1.0'}</td>
                      <td style={{ padding:'0.65rem 1rem' }}>{doc.rig}</td>
                      <td style={{ padding:'0.65rem 1rem' }}>{doc.docType}/{doc.docGroup}</td>
                      <td style={{ padding:'0.65rem 1rem', color:'#6a6d70', maxWidth:'180px' }}>
                        <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {doc.classifications?.addDesc || '—'}
                        </div>
                      </td>
                      <td style={{ padding:'0.65rem 1rem' }}>{doc.originator}</td>
                      <td style={{ padding:'0.65rem 1rem' }}>
                        <span style={{
                          ...(STATUS_STYLES[doc.status] || {}),
                          padding:'0.2rem 0.6rem', borderRadius:'1rem', fontSize:'0.72rem', fontWeight:600
                        }}>
                          {doc.status}
                        </span>
                      </td>
                      <td style={{ padding:'0.65rem 1rem', color:'#6a6d70', whiteSpace:'nowrap' }}>
                        {new Date(doc.createdDate).toLocaleDateString('en-GB')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <div style={{ textAlign:'center', padding:'3rem', color:'#6a6d70' }}>
          <Icon name="search" style={{ fontSize:'3rem', color:'#d9d9d9', marginBottom:'1rem' }} />
          <p>Use the full-text box or set specific filters above, then click <strong>Search</strong></p>
        </div>
      )}
    </div>
  );
}
