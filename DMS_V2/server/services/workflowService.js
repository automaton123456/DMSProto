/**
 * Workflow Service - manages document approval workflow
 */
const ds = require('./dataStore');

function requiresWorkflow(docGroup) {
  const config = ds.getDocGen();
  return config.workflowRequired.includes(docGroup);
}

function getApproversForDocument(doc) {
  const approverConfig = ds.getApprovers();
  const deptId = String(doc.objectLinks?.[0]?.owningDepartmentId || 'default');

  const msvApprovers = approverConfig.msvApprovers[deptId] || approverConfig.msvApprovers.default;
  const emApprovers = approverConfig.emApprovers[deptId] || approverConfig.emApprovers.default;

  return { msvApprovers, emApprovers };
}

function initWorkflow(doc) {
  if (!requiresWorkflow(doc.docGroup)) {
    return { required: false, currentStep: 'completed', steps: [] };
  }

  const { msvApprovers, emApprovers } = getApproversForDocument(doc);

  return {
    required: true,
    currentStep: 'msv',
    steps: [
      {
        step: 1,
        name: 'MSV Approval',
        status: 'pending',
        assignedApprovers: msvApprovers,
        actionedBy: null,
        actionedByName: null,
        actionDate: null,
        rejectionReason: null
      },
      {
        step: 2,
        name: 'E&M Approval',
        status: 'upcoming',
        assignedApprovers: emApprovers,
        actionedBy: null,
        actionedByName: null,
        actionDate: null,
        rejectionReason: null
      }
    ]
  };
}

function approveStep(doc, username) {
  if (!doc.workflow.required) return doc;

  const user = ds.getUserByUsername(username);
  const userName = user ? user.displayName : username;
  const now = new Date().toISOString();

  if (doc.workflow.currentStep === 'msv') {
    const step1 = doc.workflow.steps.find(s => s.step === 1);
    step1.status = 'approved';
    step1.actionedBy = username;
    step1.actionedByName = userName;
    step1.actionDate = now;

    const step2 = doc.workflow.steps.find(s => s.step === 2);
    step2.status = 'pending';
    doc.workflow.currentStep = 'em';
    doc.status = 'Pending E&M Approval';

    // Notify E&M approvers
    step2.assignedApprovers.forEach(approver => {
      ds.addNotification({
        recipientUsername: approver,
        type: 'approval_required',
        message: `Document ${doc.documentId} requires your E&M approval`,
        documentId: doc.documentId,
        link: `/documents/${doc.documentId}/approve`
      });
    });
    // Notify originator
    ds.addNotification({
      recipientUsername: doc.originatorUsername,
      type: 'step_approved',
      message: `Document ${doc.documentId} has been approved at MSV Approval by ${userName}`,
      documentId: doc.documentId,
      link: `/documents/${doc.documentId}`
    });

  } else if (doc.workflow.currentStep === 'em') {
    const step2 = doc.workflow.steps.find(s => s.step === 2);
    step2.status = 'approved';
    step2.actionedBy = username;
    step2.actionedByName = userName;
    step2.actionDate = now;

    doc.workflow.currentStep = 'completed';
    doc.status = 'Approved';

    // Notify originator
    ds.addNotification({
      recipientUsername: doc.originatorUsername,
      type: 'fully_approved',
      message: `Document ${doc.documentId} has been fully approved and filed`,
      documentId: doc.documentId,
      link: `/documents/${doc.documentId}`
    });
  }

  return doc;
}

function rejectStep(doc, username, reason = '') {
  if (!doc.workflow.required) return doc;

  const user = ds.getUserByUsername(username);
  const userName = user ? user.displayName : username;
  const now = new Date().toISOString();

  const currentStepNum = doc.workflow.currentStep === 'msv' ? 1 : 2;
  const step = doc.workflow.steps.find(s => s.step === currentStepNum);

  step.status = 'rejected';
  step.actionedBy = username;
  step.actionedByName = userName;
  step.actionDate = now;
  step.rejectionReason = reason || null;

  doc.workflow.currentStep = 'rejected';
  doc.status = 'Rejected';
  doc.workflow.rejectionReason = reason || null;

  // Notify originator
  ds.addNotification({
    recipientUsername: doc.originatorUsername,
    type: 'rejected',
    message: `Document ${doc.documentId} has been rejected at ${step.name}${reason ? ': ' + reason : ''}`,
    documentId: doc.documentId,
    link: `/documents/${doc.documentId}`
  });

  return doc;
}

function resubmitWorkflow(doc) {
  const { msvApprovers, emApprovers } = getApproversForDocument(doc);

  doc.workflow = {
    required: true,
    currentStep: 'msv',
    steps: [
      {
        step: 1,
        name: 'MSV Approval',
        status: 'pending',
        assignedApprovers: msvApprovers,
        actionedBy: null,
        actionedByName: null,
        actionDate: null,
        rejectionReason: null
      },
      {
        step: 2,
        name: 'E&M Approval',
        status: 'upcoming',
        assignedApprovers: emApprovers,
        actionedBy: null,
        actionedByName: null,
        actionDate: null,
        rejectionReason: null
      }
    ]
  };
  doc.status = 'Pending MSV Approval';

  // Notify MSV approvers
  msvApprovers.forEach(approver => {
    ds.addNotification({
      recipientUsername: approver,
      type: 'resubmitted',
      message: `Document ${doc.documentId} has been resubmitted for approval`,
      documentId: doc.documentId,
      link: `/documents/${doc.documentId}/approve`
    });
  });

  return doc;
}

function isApproverForDocument(doc, username) {
  if (!doc.workflow || !doc.workflow.required) return false;
  if (doc.workflow.currentStep === 'msv') {
    const step1 = doc.workflow.steps?.find(s => s.step === 1);
    return step1?.assignedApprovers?.includes(username);
  }
  if (doc.workflow.currentStep === 'em') {
    const step2 = doc.workflow.steps?.find(s => s.step === 2);
    return step2?.assignedApprovers?.includes(username);
  }
  return false;
}

module.exports = {
  requiresWorkflow,
  initWorkflow,
  approveStep,
  rejectStep,
  resubmitWorkflow,
  isApproverForDocument
};
