import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
import Spinner from 'react-bootstrap/Spinner';
import Badge from 'react-bootstrap/Badge';
import Icon from '@mdi/react';
import { mdiMagnify, mdiClose, mdiDownload, mdiChartBoxOutline, mdiPencilOutline, mdiOpenInNew } from '@mdi/js';
import { useAuth } from '../context/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const ALL_STATUSES = ['Draft', 'Pending Discipline Approval', 'Pending MSV Approval', 'Pending E&M Approval', 'Approved', 'Rejected'];

function getInitialValue(searchParams, key, fallback = '') {
  return searchParams.get(key) || fallback;
}

export default function Report({ completedOnly = false }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sortKey, setSortKey] = useState('createdDate');
  const [sortDir, setSortDir] = useState('desc');

  const [docId, setDocId] = useState(getInitialValue(searchParams, 'documentId'));
  const [rigFilter, setRigFilter] = useState(getInitialValue(searchParams, 'rig'));
  const [docTypeFilter, setDocTypeFilter] = useState(getInitialValue(searchParams, 'docType'));
  const [docGroupFilter, setDocGroupFilter] = useState(getInitialValue(searchParams, 'docGroup'));
  const [statusFilter, setStatusFilter] = useState(completedOnly ? 'Approved' : getInitialValue(searchParams, 'status'));
  const [originatorFilter, setOriginatorFilter] = useState(getInitialValue(searchParams, 'originator'));
  const [dateFrom, setDateFrom] = useState(getInitialValue(searchParams, 'dateFrom'));
  const [dateTo, setDateTo] = useState(getInitialValue(searchParams, 'dateTo'));
  const [woFilter, setWoFilter] = useState(getInitialValue(searchParams, 'workOrder'));
  const [woDescFilter, setWoDescFilter] = useState(getInitialValue(searchParams, 'workOrderDescription'));
  const [eqFilter, setEqFilter] = useState(getInitialValue(searchParams, 'equipment'));
  const [eqDescFilter, setEqDescFilter] = useState(getInitialValue(searchParams, 'equipmentDescription'));
  const [departmentFilter, setDepartmentFilter] = useState(getInitialValue(searchParams, 'owningDepartmentId'));
  const [descFilter, setDescFilter] = useState(getInitialValue(searchParams, 'description'));
  const [docDateFilter, setDocDateFilter] = useState(getInitialValue(searchParams, 'docDate'));
  const [manuNameFilter, setManuNameFilter] = useState(getInitialValue(searchParams, 'manuName'));
  const [manuSerialFilter, setManuSerialFilter] = useState(getInitialValue(searchParams, 'manuSerial'));
  const [alertNumFilter, setAlertNumFilter] = useState(getInitialValue(searchParams, 'alertNum'));
  const [certAuthFilter, setCertAuthFilter] = useState(getInitialValue(searchParams, 'certAuth'));
  const [certNumFilter, setCertNumFilter] = useState(getInitialValue(searchParams, 'certNum'));
  const [docLocFilter, setDocLocFilter] = useState(getInitialValue(searchParams, 'docLoc'));
  const [fullTextFilter, setFullTextFilter] = useState(getInitialValue(searchParams, 'fullText'));

  const [rigs, setRigs] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [docGroups, setDocGroups] = useState([]);

  const isPrivilegedUser = ['admin', 'editor'].includes(currentUser?.role);
  const reportTitle = completedOnly ? 'Completed DMS Report' : 'DMS Report';
  const reportSubtitle = completedOnly
    ? 'Approved workflow documents only'
    : 'Search all DMS documents';

  useEffect(() => {
    fetch('/api/rigs').then((r) => r.json()).then(setRigs);
    fetch('/api/config/document-types').then((r) => r.json()).then(setDocTypes);
  }, []);

  useEffect(() => {
    if (!docTypeFilter) {
      setDocGroups([]);
      setDocGroupFilter('');
      return;
    }
    fetch(`/api/config/document-groups/${docTypeFilter}`).then((r) => r.json()).then(setDocGroups);
  }, [docTypeFilter]);

  useEffect(() => {
    if (completedOnly || searchParams.toString()) runSearch();
  }, []);

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (docId) params.append('documentId', docId);
    if (rigFilter) params.append('rig', rigFilter);
    if (docTypeFilter) params.append('docType', docTypeFilter);
    if (docGroupFilter) params.append('docGroup', docGroupFilter);
    if (completedOnly) params.append('status', 'Approved');
    else if (statusFilter) params.append('status', statusFilter);
    if (originatorFilter) params.append('originator', originatorFilter);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    if (woFilter) params.append('workOrder', woFilter);
    if (woDescFilter) params.append('workOrderDescription', woDescFilter);
    if (eqFilter) params.append('equipment', eqFilter);
    if (eqDescFilter) params.append('equipmentDescription', eqDescFilter);
    if (departmentFilter) params.append('owningDepartmentId', departmentFilter);
    if (descFilter) params.append('description', descFilter);
    if (docDateFilter) params.append('docDate', docDateFilter);
    if (manuNameFilter) params.append('manuName', manuNameFilter);
    if (manuSerialFilter) params.append('manuSerial', manuSerialFilter);
    if (alertNumFilter) params.append('alertNum', alertNumFilter);
    if (certAuthFilter) params.append('certAuth', certAuthFilter);
    if (certNumFilter) params.append('certNum', certNumFilter);
    if (docLocFilter) params.append('docLoc', docLocFilter);
    if (fullTextFilter) params.append('fullText', fullTextFilter);
    return params.toString();
  };

  const runSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const qs = buildQueryString();
      const res = await fetch(`/api/report${qs ? `?${qs}` : ''}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    }
    setLoading(false);
  };

  const clearFilters = () => {
    setDocId('');
    setRigFilter('');
    setDocTypeFilter('');
    setDocGroupFilter('');
    setStatusFilter(completedOnly ? 'Approved' : '');
    setOriginatorFilter('');
    setDateFrom('');
    setDateTo('');
    setWoFilter('');
    setWoDescFilter('');
    setEqFilter('');
    setEqDescFilter('');
    setDepartmentFilter('');
    setDescFilter('');
    setDocDateFilter('');
    setManuNameFilter('');
    setManuSerialFilter('');
    setAlertNumFilter('');
    setCertAuthFilter('');
    setCertNumFilter('');
    setDocLocFilter('');
    setFullTextFilter('');
    setResults([]);
    setSearched(false);
  };

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    return [...results].sort((a, b) => {
      const av = sortKey === 'addDesc'
        ? (a.classifications?.addDesc || '')
        : sortKey === 'docTypeGroup'
          ? `${a.docType}/${a.docGroup}`
          : a[sortKey] || '';
      const bv = sortKey === 'addDesc'
        ? (b.classifications?.addDesc || '')
        : sortKey === 'docTypeGroup'
          ? `${b.docType}/${b.docGroup}`
          : b[sortKey] || '';
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [results, sortDir, sortKey]);

  const openDocument = (documentId, editMode = false) => {
    navigate(editMode ? `/documents/${documentId}?edit=1&source=completed-report` : `/documents/${documentId}`);
  };

  const SortIcon = ({ col }) => (
    <span className="ms-1 text-muted" style={{ opacity: sortKey === col ? 1 : 0.4, fontSize: '0.72rem' }}>
      {sortKey === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  return (
    <div className="page-container">
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb" style={{ fontSize: '0.8rem' }}>
          <li className="breadcrumb-item">
            <span className="text-primary" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>Home</span>
          </li>
          <li className="breadcrumb-item active">{reportTitle}</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-4">
        <div>
          <h3 className="fw-bold mb-1">{reportTitle}</h3>
          <p className="text-muted mb-0">{reportSubtitle}</p>
        </div>
        {completedOnly && (
          <Badge bg="success" style={{ fontSize: '0.78rem' }}>Approved only</Badge>
        )}
      </div>

      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <h6 className="text-muted fw-bold mb-3" style={{ letterSpacing: '0.05em', fontSize: '0.72rem' }}>SEARCH FILTERS</h6>
          <Row className="g-2 mb-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Full Text</Form.Label>
                <Form.Control size="sm" value={fullTextFilter} onChange={(e) => setFullTextFilter(e.target.value)} placeholder="Search across all document fields" onKeyDown={(e) => e.key === 'Enter' && runSearch()} />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Document ID</Form.Label>
                <Form.Control size="sm" value={docId} onChange={(e) => setDocId(e.target.value)} placeholder="e.g. 000001" onKeyDown={(e) => e.key === 'Enter' && runSearch()} />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Rig</Form.Label>
                <Form.Select size="sm" value={rigFilter} onChange={(e) => setRigFilter(e.target.value)}>
                  <option value="">All Rigs</option>
                  {rigs.map((rig) => <option key={rig.id} value={rig.id}>{rig.id}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Originator</Form.Label>
                <Form.Control size="sm" value={originatorFilter} onChange={(e) => setOriginatorFilter(e.target.value)} placeholder="Username or display name" onKeyDown={(e) => e.key === 'Enter' && runSearch()} />
              </Form.Group>
            </Col>

            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Document Type</Form.Label>
                <Form.Select size="sm" value={docTypeFilter} onChange={(e) => setDocTypeFilter(e.target.value)}>
                  <option value="">All Types</option>
                  {docTypes.map((type) => <option key={type.code} value={type.code}>{type.code} - {type.description}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Document Group</Form.Label>
                <Form.Select size="sm" value={docGroupFilter} onChange={(e) => setDocGroupFilter(e.target.value)} disabled={!docTypeFilter}>
                  <option value="">All Groups</option>
                  {docGroups.map((group) => <option key={group.code} value={group.code}>{group.code} - {group.description}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            {!completedOnly && (
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="fw-semibold small">Status</Form.Label>
                  <Form.Select size="sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">All Statuses</option>
                    {ALL_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
            )}
            <Col md={completedOnly ? 3 : 3}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Department</Form.Label>
                <Form.Control size="sm" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} placeholder="Owning department ID" onKeyDown={(e) => e.key === 'Enter' && runSearch()} />
              </Form.Group>
            </Col>

            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Description</Form.Label>
                <Form.Control size="sm" value={descFilter} onChange={(e) => setDescFilter(e.target.value)} placeholder="Additional description" onKeyDown={(e) => e.key === 'Enter' && runSearch()} />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Document Date</Form.Label>
                <Form.Control size="sm" value={docDateFilter} onChange={(e) => setDocDateFilter(e.target.value)} placeholder="YYYY-MM-DD or partial" onKeyDown={(e) => e.key === 'Enter' && runSearch()} />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Manufacturer</Form.Label>
                <Form.Control size="sm" value={manuNameFilter} onChange={(e) => setManuNameFilter(e.target.value)} placeholder="Manufacturer name" onKeyDown={(e) => e.key === 'Enter' && runSearch()} />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Manufacturer Serial</Form.Label>
                <Form.Control size="sm" value={manuSerialFilter} onChange={(e) => setManuSerialFilter(e.target.value)} placeholder="Serial number" onKeyDown={(e) => e.key === 'Enter' && runSearch()} />
              </Form.Group>
            </Col>

            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Alert Number</Form.Label>
                <Form.Control size="sm" value={alertNumFilter} onChange={(e) => setAlertNumFilter(e.target.value)} placeholder="Alert number" onKeyDown={(e) => e.key === 'Enter' && runSearch()} />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Certifying Authority</Form.Label>
                <Form.Control size="sm" value={certAuthFilter} onChange={(e) => setCertAuthFilter(e.target.value)} placeholder="Authority" onKeyDown={(e) => e.key === 'Enter' && runSearch()} />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Certificate Number</Form.Label>
                <Form.Control size="sm" value={certNumFilter} onChange={(e) => setCertNumFilter(e.target.value)} placeholder="Certificate number" onKeyDown={(e) => e.key === 'Enter' && runSearch()} />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Document Location</Form.Label>
                <Form.Control size="sm" value={docLocFilter} onChange={(e) => setDocLocFilter(e.target.value)} placeholder="Location" onKeyDown={(e) => e.key === 'Enter' && runSearch()} />
              </Form.Group>
            </Col>

            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Work Order</Form.Label>
                <Form.Control size="sm" value={woFilter} onChange={(e) => setWoFilter(e.target.value)} placeholder="Work order number" onKeyDown={(e) => e.key === 'Enter' && runSearch()} />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small">WO Description</Form.Label>
                <Form.Control size="sm" value={woDescFilter} onChange={(e) => setWoDescFilter(e.target.value)} placeholder="Work order description" onKeyDown={(e) => e.key === 'Enter' && runSearch()} />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Equipment</Form.Label>
                <Form.Control size="sm" value={eqFilter} onChange={(e) => setEqFilter(e.target.value)} placeholder="Asset number or text" onKeyDown={(e) => e.key === 'Enter' && runSearch()} />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Equipment Description</Form.Label>
                <Form.Control size="sm" value={eqDescFilter} onChange={(e) => setEqDescFilter(e.target.value)} placeholder="Equipment description" onKeyDown={(e) => e.key === 'Enter' && runSearch()} />
              </Form.Group>
            </Col>

            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Created From</Form.Label>
                <Form.Control size="sm" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label className="fw-semibold small">Created To</Form.Label>
                <Form.Control size="sm" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </Form.Group>
            </Col>
          </Row>

          <div className="d-flex gap-2 flex-wrap">
            <Button variant="primary" onClick={runSearch}>
              <Icon path={mdiMagnify} size={0.7} className="me-1" />Search
            </Button>
            <Button variant="outline-secondary" onClick={clearFilters}>
              <Icon path={mdiClose} size={0.7} className="me-1" />Clear
            </Button>
            {results.length > 0 && (
              <Button variant="outline-success" onClick={() => window.open(`/api/report/export?${buildQueryString()}`)}>
                <Icon path={mdiDownload} size={0.7} className="me-1" />Export CSV
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
          <Card.Header className="bg-white d-flex align-items-center justify-content-between gap-2 flex-wrap">
            <span className="fw-semibold" style={{ fontSize: '0.875rem' }}>
              {results.length} result{results.length !== 1 ? 's' : ''}
            </span>
            <span className="text-muted small">
              {completedOnly ? 'Approved documents only' : 'Open a document to review details'}
            </span>
          </Card.Header>

          {results.length === 0 ? (
            <Card.Body className="text-center py-5">
              <Icon path={mdiMagnify} size={3} className="text-muted mb-3" style={{ opacity: 0.25 }} />
              <h5 className="text-muted">No documents found</h5>
              <p className="text-muted mb-0">Try adjusting your search filters</p>
            </Card.Body>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <Table hover className="mb-0" style={{ fontSize: '0.8125rem' }}>
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
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((doc) => (
                    <tr key={doc.documentId}>
                      <td className="fw-semibold text-primary">{doc.documentId}</td>
                      <td>{doc.rig}</td>
                      <td>{doc.docType}/{doc.docGroup}</td>
                      <td className="text-muted" style={{ maxWidth: 220 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.classifications?.addDesc || '—'}</div>
                      </td>
                      <td>{doc.originator}</td>
                      <td><StatusBadge status={doc.status} /></td>
                      <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>{new Date(doc.createdDate).toLocaleDateString('en-GB')}</td>
                      <td>
                        <div className="d-flex gap-2 flex-wrap">
                          <Button size="sm" variant="outline-primary" onClick={() => openDocument(doc.documentId)}>
                            <Icon path={mdiOpenInNew} size={0.65} className="me-1" />Open
                          </Button>
                          {completedOnly && isPrivilegedUser && (
                            <Button size="sm" variant="outline-secondary" onClick={() => openDocument(doc.documentId, true)}>
                              <Icon path={mdiPencilOutline} size={0.65} className="me-1" />Edit
                            </Button>
                          )}
                        </div>
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
          <Icon path={mdiChartBoxOutline} size={3} className="mb-3" style={{ opacity: 0.2 }} />
          <p>Set filters above and click <strong>Search</strong> to find documents</p>
        </div>
      )}
    </div>
  );
}
