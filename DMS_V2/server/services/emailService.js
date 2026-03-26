/**
 * Email Service — stubbed out. Email is disabled until SMTP config is provided.
 * To enable: set enabled=true in config_email table and provide SMTP details.
 *
 * Replace the send() body with real nodemailer logic once config is ready.
 */
const configRepo = require('../repositories/configRepository');

function isEnabled() {
  const cfg = configRepo.getEmailConfig();
  return cfg.enabled === 'true';
}

async function send({ to, subject, text, html }) {
  if (!isEnabled()) {
    console.log(`[Email disabled] Would send to ${to}: ${subject}`);
    return;
  }
  // Future: initialise nodemailer transport from configRepo.getEmailConfig() here
  console.log(`[Email] Sending to ${to}: ${subject}`);
}

async function notifyApprovalRequired(approverEmail, approverName, documentId) {
  return send({
    to: approverEmail,
    subject: `Action Required: Document ${documentId} awaiting your approval`,
    text: `Dear ${approverName},\n\nDocument ${documentId} has been submitted and requires your approval.\n\nPlease log in to the DMS to review.`
  });
}

async function notifyStepApproved(originatorEmail, originatorName, documentId, stepName, approverName) {
  return send({
    to: originatorEmail,
    subject: `Document ${documentId} approved at ${stepName}`,
    text: `Dear ${originatorName},\n\nDocument ${documentId} has been approved at the ${stepName} step by ${approverName}.`
  });
}

async function notifyFullyApproved(originatorEmail, originatorName, documentId) {
  return send({
    to: originatorEmail,
    subject: `Document ${documentId} fully approved`,
    text: `Dear ${originatorName},\n\nDocument ${documentId} has been fully approved and filed.`
  });
}

async function notifyRejected(originatorEmail, originatorName, documentId, stepName, reason) {
  return send({
    to: originatorEmail,
    subject: `Document ${documentId} rejected at ${stepName}`,
    text: `Dear ${originatorName},\n\nDocument ${documentId} has been rejected at the ${stepName} step.\nReason: ${reason || 'No reason provided.'}`
  });
}

module.exports = {
  isEnabled,
  send,
  notifyApprovalRequired,
  notifyStepApproved,
  notifyFullyApproved,
  notifyRejected
};
