import React from 'react';
import Alert from 'react-bootstrap/Alert';

function StepCircle({ status }) {
  const icons = { completed: '✓', active: '●', rejected: '✗', upcoming: '○' };
  return (
    <div className={`step-circle ${status}`}>
      {icons[status] || '○'}
    </div>
  );
}

export default function WorkflowTracker({ workflow, originatorName, createdDate }) {
  if (!workflow) return null;

  if (!workflow.required) {
    return (
      <Alert variant="info" className="mb-3">
        No workflow approval required for this document type
      </Alert>
    );
  }

  const getStepStatus = (step) => {
    if (step.status === 'approved') return 'completed';
    if (step.status === 'rejected') return 'rejected';
    if (step.status === 'pending') return 'active';
    return 'upcoming';
  };

  const formatDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

  return (
    <div style={{ overflowX: 'auto' }}>
      <div className="workflow-tracker">
        {/* Submitted step */}
        <div className="workflow-step completed">
          <StepCircle status="completed" />
          <div className="step-info">
            <div className="step-name">Submitted</div>
            <div className="step-detail">
              {originatorName}<br />
              {formatDate(createdDate)}
            </div>
          </div>
        </div>

        {/* Approval steps */}
        {workflow.steps.map((step) => {
          const status = getStepStatus(step);
          return (
            <div key={step.step} className={`workflow-step ${status}`}>
              <StepCircle status={status} />
              <div className="step-info">
                <div className="step-name">{step.name}</div>
                <div className="step-detail">
                  {status === 'completed' && (
                    <>
                      <span className="text-success fw-semibold">Approved</span><br />
                      {step.actionedByName}<br />
                      {formatDate(step.actionDate)}
                    </>
                  )}
                  {status === 'active' && (
                    <>
                      <span className="text-primary fw-semibold">Pending</span><br />
                      Awaiting: {step.assignedApprovers?.join(', ')}
                    </>
                  )}
                  {status === 'rejected' && (
                    <>
                      <span className="text-danger fw-semibold">Rejected</span><br />
                      {step.actionedByName}<br />
                      {formatDate(step.actionDate)}
                      {step.rejectionReason && (
                        <><br /><em>"{step.rejectionReason}"</em></>
                      )}
                    </>
                  )}
                  {status === 'upcoming' && (
                    <>
                      <span className="text-muted">Upcoming</span><br />
                      {step.assignedApprovers?.join(', ')}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Filed step */}
        {workflow.currentStep === 'completed' && (
          <div className="workflow-step completed">
            <StepCircle status="completed" />
            <div className="step-info">
              <div className="step-name">Filed</div>
              <div className="step-detail text-success fw-semibold">Completed</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
