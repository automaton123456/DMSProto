const nodemailer = require('nodemailer');
const configRepo = require('../repositories/configRepository');

let transporter = null;
let transportCacheKey = '';

function isEnabled() {
  const cfg = configRepo.getEmailConfig();
  return String(cfg.enabled).toLowerCase() === 'true';
}

function asInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function resolveConfig() {
  const cfg = configRepo.getEmailConfig();
  return {
    enabled: String(cfg.enabled).toLowerCase() === 'true',
    host: cfg.smtp_host || '',
    port: asInt(cfg.smtp_port, 25),
    user: cfg.smtp_user || '',
    pass: cfg.smtp_pass || '',
    fromAddress: cfg.from_address || 'dms@localhost',
    fromName: cfg.from_name || 'DMS System',
    appBaseUrl: (cfg.app_base_url || '').replace(/\/$/, '')
  };
}

function getTransport(config) {
  const cacheKey = `${config.host}|${config.port}|${config.user}|${config.pass ? 'set' : 'none'}`;
  if (transporter && cacheKey === transportCacheKey) return transporter;

  if (!config.host) {
    throw new Error('SMTP host is not configured.');
  }

  const transportOptions = {
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    tls: {
      rejectUnauthorized: false
    }
  };

  if (config.user) {
    transportOptions.auth = {
      user: config.user,
      pass: config.pass
    };
  }

  transporter = nodemailer.createTransport(transportOptions);
  transportCacheKey = cacheKey;
  return transporter;
}

function escapeHtml(value) {
  return String(value ?? '—')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function requestUrl(config, details = {}) {
  if (details.link && /^https?:\/\//i.test(details.link)) return details.link;
  if (config.appBaseUrl && details.documentId) return `${config.appBaseUrl}/documents/${encodeURIComponent(details.documentId)}`;
  if (details.documentId) return `/documents/${details.documentId}`;
  return details.link || '';
}

function requestDetailsRows(details = {}) {
  return [
    ['Document ID', details.documentId],
    ['Rig', details.rig],
    ['Document Type', details.docType],
    ['Document Group', details.docGroup],
    ['Status', details.status],
    ['Originator', details.originator],
    ['Current Step', details.currentStep],
    ['Actioned By', details.actionBy],
    ['Rejection Reason', details.reason]
  ].filter(([, val]) => val !== undefined && val !== null && val !== '');
}

function detailsTableHtml(details) {
  const rows = requestDetailsRows(details);
  if (!rows.length) return '';

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:720px;border:1px solid #d9d9d9;font-family:Arial,sans-serif;font-size:14px;">
      <thead>
        <tr>
          <th style="text-align:left;padding:10px;background:#f5f6f7;border:1px solid #d9d9d9;">Field</th>
          <th style="text-align:left;padding:10px;background:#f5f6f7;border:1px solid #d9d9d9;">Value</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(([key, value]) => `<tr><td style="padding:8px 10px;border:1px solid #d9d9d9;font-weight:600;">${escapeHtml(key)}</td><td style="padding:8px 10px;border:1px solid #d9d9d9;">${escapeHtml(value)}</td></tr>`).join('')}
      </tbody>
    </table>
  `;
}

function composeHtml({ greeting, intro, details, ctaLabel }) {
  const cfg = resolveConfig();
  const url = requestUrl(cfg, details);
  const cta = url ? `<p style="margin-top:16px;"><a href="${escapeHtml(url)}" style="background:#0a6ed1;color:#fff;text-decoration:none;padding:10px 14px;border-radius:4px;display:inline-block;">${escapeHtml(ctaLabel || 'Open request')}</a></p><p style="font-size:12px;color:#6a6d70;word-break:break-all;">${escapeHtml(url)}</p>` : '';

  return `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#32363a;line-height:1.5;">
      <p>${escapeHtml(greeting)}</p>
      <p>${escapeHtml(intro)}</p>
      ${detailsTableHtml(details)}
      ${cta}
    </div>
  `;
}

async function send({ to, subject, text, html }) {
  if (!to) return;

  const cfg = resolveConfig();
  if (!cfg.enabled) {
    console.log(`[Email disabled] Would send to ${to}: ${subject}`);
    return;
  }

  const transport = getTransport(cfg);
  await transport.sendMail({
    from: cfg.fromName ? `${cfg.fromName} <${cfg.fromAddress}>` : cfg.fromAddress,
    to,
    subject,
    text,
    html
  });

  console.log(`[Email] Sent to ${to}: ${subject}`);
}

async function notifyApprovalRequired(approverEmail, approverName, details) {
  const subject = `Action Required: Document ${details.documentId} awaiting your approval`;
  const url = requestUrl(resolveConfig(), details);
  return send({
    to: approverEmail,
    subject,
    text: `Dear ${approverName},\n\nDocument ${details.documentId} has been submitted and requires your approval.\n\nOpen request: ${url}`,
    html: composeHtml({
      greeting: `Dear ${approverName},`,
      intro: `A document has been submitted and requires your approval.`,
      details,
      ctaLabel: 'Review request'
    })
  });
}

async function notifyStepApproved(originatorEmail, originatorName, details) {
  const subject = `Document ${details.documentId} approved at ${details.currentStep}`;
  const url = requestUrl(resolveConfig(), details);
  return send({
    to: originatorEmail,
    subject,
    text: `Dear ${originatorName},\n\nDocument ${details.documentId} has been approved at the ${details.currentStep} step by ${details.actionBy}.\n\nOpen request: ${url}`,
    html: composeHtml({
      greeting: `Dear ${originatorName},`,
      intro: `Your document has been approved at the ${details.currentStep} step by ${details.actionBy}.`,
      details,
      ctaLabel: 'Open request'
    })
  });
}

async function notifyFullyApproved(originatorEmail, originatorName, details) {
  const subject = `Document ${details.documentId} fully approved`;
  const url = requestUrl(resolveConfig(), details);
  return send({
    to: originatorEmail,
    subject,
    text: `Dear ${originatorName},\n\nDocument ${details.documentId} has been fully approved and filed.\n\nOpen request: ${url}`,
    html: composeHtml({
      greeting: `Dear ${originatorName},`,
      intro: 'Your document has been fully approved and filed.',
      details,
      ctaLabel: 'View approved request'
    })
  });
}

async function notifyRejected(originatorEmail, originatorName, details) {
  const subject = `Document ${details.documentId} rejected at ${details.currentStep}`;
  const url = requestUrl(resolveConfig(), details);
  return send({
    to: originatorEmail,
    subject,
    text: `Dear ${originatorName},\n\nDocument ${details.documentId} has been rejected at the ${details.currentStep} step.\nReason: ${details.reason || 'No reason provided.'}\n\nOpen request: ${url}`,
    html: composeHtml({
      greeting: `Dear ${originatorName},`,
      intro: `Your document has been rejected at the ${details.currentStep} step.`,
      details,
      ctaLabel: 'Open request'
    })
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
