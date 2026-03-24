import React from 'react';

const STATUS_CLASS = {
  'Draft': 'status-draft',
  'Approved': 'status-approved',
  'Rejected': 'status-rejected',
  'Pending MSV Approval': 'status-msv',
  'Pending E&M Approval': 'status-em'
};

export default function StatusBadge({ status, style = {} }) {
  const cls = STATUS_CLASS[status] || 'status-draft';
  return (
    <span
      className={cls}
      style={{
        padding: '0.2rem 0.65rem',
        borderRadius: '1rem',
        fontSize: '0.72rem',
        fontWeight: 700,
        display: 'inline-block',
        ...style
      }}
    >
      {status}
    </span>
  );
}
