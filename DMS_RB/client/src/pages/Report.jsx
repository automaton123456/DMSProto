import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
import Spinner from 'react-bootstrap/Spinner';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const ALL_STATUSES = ['Draft', 'Pending MSV Approval', 'Pending E&M Approval', 'Approved', 'Rejected'];

export default function Report() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sortKey, setSortKey] = useState('createdDate');
  const [sortDir, setSortDir] = useState('desc');

  const [docId, setDocId] = useState(searchParams.get('documentId') || '');
  const [rigFilter, setRigFilter] = useState(searchParams.get('rig') || '');
  const [docTypeFilter, setDocTypeFilter] = useState(searchParams.get('docType') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [originatorFilter, setOriginatorFilter] = useState(searchParams.get('originator') || '');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [woFilter, setWoFilter] = useState('');
  const [eqFilter, setEqFilter] = useState('');
  const [descFilter, setDescFilter] = useState('');

  const [rigs, setRigs] = useState([]);
  const [docTypes, setDocTypes] = useState([]);

  useEffect(() => {
    fetch('/api/rigs').then(r => r.json()).then(setRigs);
    fetch('/api/config/document-types').then(r => r.json()).then(setDocTypes);
    if (searchParams.toString()) runSearch();
  }, []);

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (docId) params.append('documentId', docId);
    if (rigFilter) params.append('rig', rigFilter);
    if (docTypeFilter) params.append('docType', docTypeFilter);
    if (statusFilter) params.append('status', statusFilter);
    if (originatorFilter) params.append('originator', originatorFilter);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    if (woFilter) params.append('workOrder', woFilter);
    if (eqFilter) params.append('equipment', eqFilter);
    if (descFilter) params.append('description', descFilter);
    return params.toString();
  };

  const runSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const qs = buildQueryString();
      const res = await fetch(`/api/report${qs ? '?' + qs : ''}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch { setResults([]); }
    setLoading(false);
  };

  const clearFilters = () => {
    setDocId(''); setRigFilter(''); setDocTypeFilter(''); setStatusFilter('');
    setOriginatorFilter(''); setDateFrom(''); setDateTo('');
    setWoFilter(''); setEqFilter(''); setDescFilter('');
    setResults([]); setSearched(false);
  };

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = [...results].sort((a, b) => {
    const av = sortKey === 'addDesc' ? (a.classifications?.addDesc || '') :
      sortKey === 'docTypeGroup' ? `${a.docType}/${a.docGroup}` : a[sortKey] || '';
    const bv = sortKey === 'addDesc' ? (b.classifications?.addDesc || '') :
      sortKey === 'docTypeGroup' ? `${b.docType}/${b.docGroup}` : b[sortKey] || '';
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const SortIcon = ({ col }) => (
    <span className="ms-1 text-muted" style={{ opacity: sortKey === col ? 1 : 0.4, fontSize: '0.75rem' }}>
      {sortKey === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  return (
    <div className="page-container">
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb" style={{ fontSize: '0.875rem' }}>
          <li className="breadcrumb-item">
            <span className="text-primary" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>Home</span>
          </li>
          <li className="breadcrumb-item active">DMS Report</li>
        </ol>
      </nav>

      <h3 className="fw-bold mb-4">DMS Report</h3>

      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <h6 className="text-muted fw-bold mb-3" style={{ letterSpacing: '0.05em' }}>SEARCH FILTERS</h6>
          <Row className="g-3 mb-3">
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Document ID</Form.Label>
                <Form.Control size="sm" value={docId} onChange={e => setDocId(e.target.value)} placeholder="e.g. 000001" onKeyDown={e => e.key === 'Enter' && runSearch()} />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Rig</Form.Label>
                <Form.Select size="sm" value={rigFilter} onChange={e => setRigFilter(e.target.value)}>
                  <option value="">All Rigs</option>
                  {rigs.map(r => <option key={r.id} value={r.id}>{r.id}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Document Type</Form.Label>
                <Form.Select size="sm" value={docTypeFilter} onChange={e => setDocTypeFilter(e.target.value)}>
                  <option value="">All Types</option>
                  {docTypes.map(t => <option key={t.code} value={t.code}>{t.code} — {t.description}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Status</Form.Label>
                <Form.Select size="sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">All Statuses</option>
                  {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Description</Form.Label>
                <Form.Control size="sm" value={descFilter} onChange={e => setDescFilter(e.target.value)} placeholder="Partial match" onKeyDown={e => e.key === 'Enter' && runSearch()} />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Originator</Form.Label>
                <Form.Control size="sm" value={originatorFilter} onChange={e => setOriginatorFilter(e.target.value)} placeholder="Username" onKeyDown={e => e.key === 'Enter' && runSearch()} />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Work Order</Form.Label>
                <Form.Control size="sm" value={woFilter} onChange={e => setWoFilter(e.target.value)} placeholder="Partial match" onKeyDown={e => e.key === 'Enter' && runSearch()} />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Equipment</Form.Label>
                <Form.Control size="sm" value={eqFilter} onChange={e => setEqFilter(e.target.value)} placeholder="Partial match" onKeyDown={e => e.key === 'Enter' && runSearch()} />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Date From</Form.Label>
                <Form.Control size="sm" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Date To</Form.Label>
                <Form.Control size="sm" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </Form.Group>
            </Col>
          </Row>

          <div className="d-flex gap-2">
            <Button variant="primary" onClick={runSearch}>🔍 Search</Button>
            <Button variant="outline-secondary" onClick={clearFilters}>✕ Clear</Button>
            {results.length > 0 && (
              <Button variant="outline-success" onClick={() => window.open(`/api/report/export?${buildQueryString()}`)}>
                ⬇ Export CSV
              </Button>
            )}
          </div>
        </Card.Body>
      </Card>

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : searched ? (
        <Card className="shadow-sm">
          <Card.Header className="bg-white d-flex align-items-center gap-2">
            <span className="fw-semibold">{results.length} result{results.length !== 1 ? 's' : ''}</span>
            {results.length > 0 && <span className="text-muted small">— click any row to open document</span>}
          </Card.Header>

          {results.length === 0 ? (
            <Card.Body className="text-center py-5">
              <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>🔍</div>
              <h5 className="text-muted">No documents found</h5>
              <p className="text-muted mb-0">Try adjusting your search filters</p>
            </Card.Body>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <Table hover className="mb-0" style={{ fontSize: '0.875rem' }}>
                <thead className="table-light">
                  <tr>
                    {[
                      ['documentId', 'Document ID'],
                      ['rig', 'Rig'],
                      ['docTypeGroup', 'Type/Group'],
                      ['addDesc', 'Description'],
                      ['originator', 'Originator'],
                      ['status', 'Status'],
                      ['createdDate', 'Date Created']
                    ].map(([key, label]) => (
                      <th key={key} className="sortable-th" onClick={() => handleSort(key)}>
                        {label}<SortIcon col={key} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(doc => (
                    <tr key={doc.documentId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/documents/${doc.documentId}`)}>
                      <td className="fw-semibold text-primary">{doc.documentId}</td>
                      <td>{doc.rig}</td>
                      <td>{doc.docType}/{doc.docGroup}</td>
                      <td className="text-muted" style={{ maxWidth: 180 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.classifications?.addDesc || '—'}
                        </div>
                      </td>
                      <td>{doc.originator}</td>
                      <td><StatusBadge status={doc.status} /></td>
                      <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>
                        {new Date(doc.createdDate).toLocaleDateString('en-GB')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card>
      ) : (
        <div className="text-center py-5 text-muted">
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>🔍</div>
          <p>Set filters above and click <strong>Search</strong> to find documents</p>
        </div>
      )}
    </div>
  );
}
