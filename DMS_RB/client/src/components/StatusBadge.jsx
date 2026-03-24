import React from 'react';
import Badge from 'react-bootstrap/Badge';

const STATUS_VARIANT = {
  'Draft':                  ['secondary', null],
  'Approved':               ['success',   null],
  'Rejected':               ['danger',    null],
  'Pending MSV Approval':   ['warning',   'dark'],
  'Pending E&M Approval':   ['primary',   null],
};

export default function StatusBadge({ status }) {
  const [bg, text] = STATUS_VARIANT[status] || ['secondary', null];
  return (
    <Badge bg={bg} text={text ?? undefined}>
      {status}
    </Badge>
  );
}
