/**
 * Workflow Service — manages document approval workflow.
 * Uses repository layer for all data access.
 */
const docRepo    = require('../repositories/documentRepository');
const configRepo = require('../repositories/configRepository');
const userRepo   = require('../repositories/userRepository');
const notifRepo  = require('../repositories/notificationRepository');
const histRepo   = require('../repositories/historyRepository');
const emailSvc   = require('./emailService');

function requiresWorkflow(docGroup) {
  return configRepo.isWorkflowRequired(docGroup);
}

function getApproversForDocument(doc) {
  const deptId = String(doc.objectLinks?.[0]?.owningDepartmentId || doc.objectLinks?.[0]?.owning_department_id || 'default');
  const msvApprovers = configRepo.getApproversForDept(deptId, 'msv');
  const emApprovers  = configRepo.getApproversForDept(deptId, 'em');
  return { msvApprovers, emApprovers };
}

function buildWorkflowSteps(msvApprovers, emApprovers) {
  return [
    {
      step: 1, name: 'Discipline Approval', status: 'pending',
      assignedApprovers: msvApprovers,
      actionedBy: null, actionedByName: null, actionDate: null, rejectionReason: null
    },
    {
      step: 2, name: 'E&M Approval', status: 'upcoming',
      assignedApprovers: emApprovers,
      actionedBy: null, actionedByName: null, actionDate: null, rejectionReason: null
    }
  ];
}

function initWorkflow(doc) {
  if (!requiresWorkflow(doc.docGroup)) {
    return { required: false, currentStep: 'completed', steps: [] };
  }
  const { msvApprovers, emApprovers } = getApproversForDocument(doc);
  return {
    required: true,
    currentStep: 'msv',
    steps: buildWorkflowSteps(msvApprovers, emApprovers)
  };
}

function notifyApprovers(approvers, doc, message, link, currentStep) {
  for (const username of approvers) {
    notifRepo.add({ recipientUsername: username, type: 'approval_required', message, documentId: doc.documentId, link });
    const user = userRepo.getByUsername(username);
    if (user) {
      emailSvc.notifyApprovalRequired(user.email, user.display_name, {
        documentId: doc.documentId,
        rig: doc.rig,
        docType: doc.docType,
        docGroup: doc.docGroup,
        status: doc.status,
        originator: doc.originator,
        currentStep,
        link
      });
    }
  }
}

async function approveStep(doc, username) {
  if (!doc.workflow || !doc.workflow.required) return;

  const user     = userRepo.toApiShape(userRepo.getByUsername(username));
  const userName = user ? user.displayName : username;
  const now      = new Date().toISOString();

  if (doc.workflow.currentStep === 'msv') {
    const step1 = doc.workflow.steps.find(s => s.step === 1);
    const step2 = doc.workflow.steps.find(s => s.step === 2);

    // Update step 1 in DB
    docRepo.updateWorkflowStep(doc.documentId, 1, {
      status:           'approved',
      actioned_by:      username,
      actioned_by_name: userName,
      action_date:      now
    });
    // Activate step 2
    docRepo.updateWorkflowStep(doc.documentId, 2, { status: 'pending' });
    docRepo.updateDocumentStatus(doc.documentId, 'Pending E&M Approval');

    // Notify E&M approvers
    notifyApprovers(
      step2.assignedApprovers, doc,
      `Document ${doc.documentId} requires your E&M approval`,
      `/documents/${doc.documentId}/approve`,
      'E&M Approval'
    );
    // Notify originator
    notifRepo.add({
      recipientUsername: doc.originatorUsername, type: 'step_approved',
      message: `Document ${doc.documentId} approved at ${step1.name} by ${userName}`,
      documentId: doc.documentId, link: `/documents/${doc.documentId}`
    });

    // History entry
    histRepo.add({
      documentId: doc.documentId, version: doc.version || '1.0',
      changedBy: username, changedByName: userName,
      changeDate: now, changeType: 'approve',
      changeSummary: `${step1.name} approved by ${userName}`
    });

    const originator = userRepo.toApiShape(userRepo.getByUsername(doc.originatorUsername));
    if (originator) emailSvc.notifyStepApproved(originator.email, originator.displayName, {
      documentId: doc.documentId,
      rig: doc.rig,
      docType: doc.docType,
      docGroup: doc.docGroup,
      status: 'Pending E&M Approval',
      originator: doc.originator,
      currentStep: step1.name,
      actionBy: userName,
      link: `/documents/${doc.documentId}`
    });

  } else if (doc.workflow.currentStep === 'em') {
    const step2 = doc.workflow.steps.find(s => s.step === 2);

    docRepo.updateWorkflowStep(doc.documentId, 2, {
      status:           'approved',
      actioned_by:      username,
      actioned_by_name: userName,
      action_date:      now
    });
    docRepo.updateDocumentStatus(doc.documentId, 'Approved');

    notifRepo.add({
      recipientUsername: doc.originatorUsername, type: 'fully_approved',
      message: `Document ${doc.documentId} has been fully approved and filed`,
      documentId: doc.documentId, link: `/documents/${doc.documentId}`
    });

    histRepo.add({
      documentId: doc.documentId, version: doc.version || '1.0',
      changedBy: username, changedByName: userName,
      changeDate: now, changeType: 'approve',
      changeSummary: `${step2.name} approved by ${userName} — Document fully approved`
    });

    const originator = userRepo.toApiShape(userRepo.getByUsername(doc.originatorUsername));
    if (originator) emailSvc.notifyFullyApproved(originator.email, originator.displayName, {
      documentId: doc.documentId,
      rig: doc.rig,
      docType: doc.docType,
      docGroup: doc.docGroup,
      status: 'Approved',
      originator: doc.originator,
      currentStep: step2.name,
      actionBy: userName,
      link: `/documents/${doc.documentId}`
    });
  }
}

async function rejectStep(doc, username, reason) {
  if (!doc.workflow || !doc.workflow.required) return;

  const user     = userRepo.toApiShape(userRepo.getByUsername(username));
  const userName = user ? user.displayName : username;
  const now      = new Date().toISOString();

  const currentStepNum = doc.workflow.currentStep === 'msv' ? 1 : 2;
  const step = doc.workflow.steps.find(s => s.step === currentStepNum);

  docRepo.updateWorkflowStep(doc.documentId, currentStepNum, {
    status:           'rejected',
    actioned_by:      username,
    actioned_by_name: userName,
    action_date:      now,
    rejection_reason: reason || null
  });
  docRepo.updateDocumentStatus(doc.documentId, 'Rejected');

  notifRepo.add({
    recipientUsername: doc.originatorUsername, type: 'rejected',
    message: `Document ${doc.documentId} rejected at ${step.name}${reason ? ': ' + reason : ''}`,
    documentId: doc.documentId, link: `/documents/${doc.documentId}`
  });

  histRepo.add({
    documentId: doc.documentId, version: doc.version || '1.0',
    changedBy: username, changedByName: userName,
    changeDate: now, changeType: 'reject',
    changeSummary: `${step.name} rejected by ${userName}${reason ? ': ' + reason : ''}`
  });

  const originator = userRepo.toApiShape(userRepo.getByUsername(doc.originatorUsername));
  if (originator) emailSvc.notifyRejected(originator.email, originator.displayName, {
    documentId: doc.documentId,
    rig: doc.rig,
    docType: doc.docType,
    docGroup: doc.docGroup,
    status: 'Rejected',
    originator: doc.originator,
    currentStep: step.name,
    actionBy: userName,
    reason,
    link: `/documents/${doc.documentId}`
  });
}

async function resubmitWorkflow(doc, username) {
  const { msvApprovers, emApprovers } = getApproversForDocument(doc);
  const steps = buildWorkflowSteps(msvApprovers, emApprovers);

  docRepo.replaceWorkflowSteps(doc.documentId, steps);
  docRepo.updateDocumentStatus(doc.documentId, 'Pending Discipline Approval');

  const user     = userRepo.toApiShape(userRepo.getByUsername(username));
  const userName = user ? user.displayName : username;
  const now      = new Date().toISOString();

  // Notify MSV approvers
  notifyApprovers(
    msvApprovers, doc,
    `Document ${doc.documentId} has been resubmitted for approval`,
    `/documents/${doc.documentId}/approve`,
    'Discipline Approval'
  );

  histRepo.add({
    documentId: doc.documentId, version: doc.version || '1.0',
    changedBy: username, changedByName: userName,
    changeDate: now, changeType: 'resubmit',
    changeSummary: `Workflow restarted by ${userName}`
  });
}

function isApproverForDocument(doc, username) {
  if (!doc.workflow || !doc.workflow.required) return false;
  const currentStep = doc.workflow.currentStep;
  if (currentStep === 'msv') {
    const step1 = doc.workflow.steps?.find(s => s.step === 1);
    return step1?.assignedApprovers?.includes(username);
  }
  if (currentStep === 'em') {
    const step2 = doc.workflow.steps?.find(s => s.step === 2);
    return step2?.assignedApprovers?.includes(username);
  }
  return false;
}

/** Re-evaluate approver assignments for all pending documents.
 *  Called after approver config changes. */
function reEvaluatePendingWorkflows() {
  const docRepo2 = require('../repositories/documentRepository');
  const pending  = docRepo2.query({ status: ['Pending Discipline Approval', 'Pending MSV Approval', 'Pending E&M Approval'] });

  for (const doc of pending) {
    const { msvApprovers, emApprovers } = getApproversForDocument(doc);

    if (doc.workflow?.currentStep === 'msv') {
      docRepo.updateWorkflowStep(doc.documentId, 1, {
        assigned_approvers: JSON.stringify(msvApprovers)
      });
      docRepo.updateWorkflowStep(doc.documentId, 2, {
        assigned_approvers: JSON.stringify(emApprovers)
      });
    } else if (doc.workflow?.currentStep === 'em') {
      docRepo.updateWorkflowStep(doc.documentId, 2, {
        assigned_approvers: JSON.stringify(emApprovers)
      });
    }
  }
  return pending.length;
}

module.exports = {
  requiresWorkflow,
  getApproversForDocument,
  initWorkflow,
  approveStep,
  rejectStep,
  resubmitWorkflow,
  isApproverForDocument,
  reEvaluatePendingWorkflows
};
