import nodemailer from "nodemailer";
import { adminDb } from "@/lib/firebase-admin";

// ─── Transport ────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const FROM_NAME = process.env.GMAIL_FROM_NAME || "Datafrica";
const FROM_EMAIL = process.env.GMAIL_USER || "noreply@datafrica.com";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://mydatafrica.web.app";

// ─── Types ────────────────────────────────────────────────────────────
export type EmailTemplateType =
  | "welcome"
  | "purchase_confirmation"
  | "subscription_created"
  | "subscription_renewed"
  | "new_message"
  | "broadcast"
  | "account_disabled";

export interface EmailTemplate {
  subject: string;
  bodyHtml: string;
}

export interface TemplateMeta {
  type: EmailTemplateType;
  label: string;
  description: string;
  placeholders: string[];
}

// ─── Template metadata (available placeholders per type) ──────────────
export const TEMPLATE_META: Record<EmailTemplateType, Omit<TemplateMeta, "type">> = {
  welcome: {
    label: "Welcome",
    description: "Sent when a new user registers",
    placeholders: ["name", "email"],
  },
  purchase_confirmation: {
    label: "Purchase Confirmation",
    description: "Sent when a dataset purchase is confirmed",
    placeholders: ["name", "datasetTitle", "amount", "currency", "date"],
  },
  subscription_created: {
    label: "Subscription Created",
    description: "Sent when a new subscription is activated",
    placeholders: ["name", "planName", "billingCycle", "startDate", "endDate", "amount", "currency"],
  },
  subscription_renewed: {
    label: "Subscription Renewed",
    description: "Sent when a subscription is renewed",
    placeholders: ["name", "planName", "renewalDate", "nextEndDate", "amount", "currency"],
  },
  new_message: {
    label: "New Message",
    description: "Sent when a user or admin receives a new message",
    placeholders: ["name", "fromName"],
  },
  broadcast: {
    label: "Broadcast",
    description: "Sent when admin broadcasts a message via email",
    placeholders: ["name", "title", "message"],
  },
  account_disabled: {
    label: "Account Disabled",
    description: "Sent when a user account is banned or suspended",
    placeholders: ["name", "reason"],
  },
};

// ─── Default templates ────────────────────────────────────────────────
const DEFAULT_TEMPLATES: Record<EmailTemplateType, EmailTemplate> = {
  welcome: {
    subject: "Welcome to Datafrica, {{name}}!",
    bodyHtml: `
      <h1 style="color: #3d7eff; font-size: 24px; margin: 0 0 16px;">Welcome to Datafrica!</h1>
      <p>Hi {{name}},</p>
      <p>Thank you for joining Datafrica, Africa's premier data marketplace. You now have access to verified business directories, leads, and institutional data from across the continent.</p>
      <p>Start exploring datasets and unlock the power of African data.</p>
      <a href="${BASE_URL}/datasets" style="display: inline-block; background: #3d7eff; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">Browse Datasets</a>
    `,
  },
  purchase_confirmation: {
    subject: "Purchase Confirmed - {{datasetTitle}}",
    bodyHtml: `
      <h1 style="color: #3d7eff; font-size: 24px; margin: 0 0 16px;">Purchase Confirmed!</h1>
      <p>Hi {{name}},</p>
      <p>Your purchase has been confirmed. Here are the details:</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 16px 0;">
        <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">Dataset</p>
        <p style="margin: 0 0 16px; color: #0f172a; font-size: 16px; font-weight: 600;">{{datasetTitle}}</p>
        <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">Amount Paid</p>
        <p style="margin: 0; color: #3d7eff; font-size: 20px; font-weight: 700;">{{amount}} {{currency}}</p>
        <p style="margin: 8px 0 0; color: #64748b; font-size: 13px;">{{date}}</p>
      </div>
      <a href="${BASE_URL}/dashboard" style="display: inline-block; background: #3d7eff; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">View in Dashboard</a>
    `,
  },
  subscription_created: {
    subject: "Subscription Activated - {{planName}}",
    bodyHtml: `
      <h1 style="color: #3d7eff; font-size: 24px; margin: 0 0 16px;">Subscription Activated!</h1>
      <p>Hi {{name}},</p>
      <p>Your subscription has been activated. Here are the details:</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 16px 0;">
        <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">Plan</p>
        <p style="margin: 0 0 16px; color: #0f172a; font-size: 16px; font-weight: 600;">{{planName}} ({{billingCycle}})</p>
        <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">Amount</p>
        <p style="margin: 0 0 16px; color: #3d7eff; font-size: 20px; font-weight: 700;">{{amount}} {{currency}}</p>
        <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">Period</p>
        <p style="margin: 0; color: #0f172a; font-size: 14px;">{{startDate}} &mdash; {{endDate}}</p>
      </div>
      <a href="${BASE_URL}/dashboard" style="display: inline-block; background: #3d7eff; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">View Subscription</a>
    `,
  },
  subscription_renewed: {
    subject: "Subscription Renewed - {{planName}}",
    bodyHtml: `
      <h1 style="color: #3d7eff; font-size: 24px; margin: 0 0 16px;">Subscription Renewed!</h1>
      <p>Hi {{name}},</p>
      <p>Your subscription to <strong>{{planName}}</strong> has been successfully renewed.</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 16px 0;">
        <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">Amount</p>
        <p style="margin: 0 0 16px; color: #3d7eff; font-size: 20px; font-weight: 700;">{{amount}} {{currency}}</p>
        <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">Renewed</p>
        <p style="margin: 0 0 16px; color: #0f172a; font-size: 14px;">{{renewalDate}}</p>
        <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">Next expiry</p>
        <p style="margin: 0; color: #0f172a; font-size: 14px;">{{nextEndDate}}</p>
      </div>
      <a href="${BASE_URL}/dashboard" style="display: inline-block; background: #3d7eff; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">View Subscription</a>
    `,
  },
  new_message: {
    subject: "New message from {{fromName}} - Datafrica",
    bodyHtml: `
      <h1 style="color: #3d7eff; font-size: 24px; margin: 0 0 16px;">New Message</h1>
      <p>Hi {{name}},</p>
      <p>You have a new message from <strong>{{fromName}}</strong> on Datafrica.</p>
      <a href="${BASE_URL}/messages" style="display: inline-block; background: #3d7eff; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">Read Message</a>
    `,
  },
  broadcast: {
    subject: "{{title}} - Datafrica",
    bodyHtml: `
      <h1 style="color: #3d7eff; font-size: 24px; margin: 0 0 16px;">{{title}}</h1>
      <p>Hi {{name}},</p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 16px 0;">
        <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.6;">{{message}}</p>
      </div>
      <a href="${BASE_URL}" style="display: inline-block; background: #3d7eff; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">Visit Datafrica</a>
    `,
  },
  account_disabled: {
    subject: "Account Notice - Datafrica",
    bodyHtml: `
      <h1 style="color: #ef4444; font-size: 24px; margin: 0 0 16px;">Account Notice</h1>
      <p>Hi {{name}},</p>
      <p>Your Datafrica account has been restricted by an administrator.</p>
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; margin: 16px 0;">
        <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">Reason</p>
        <p style="margin: 0; color: #dc2626; font-size: 15px;">{{reason}}</p>
      </div>
      <p style="color: #64748b; font-size: 14px;">If you believe this is a mistake, please contact support.</p>
    `,
  },
};

// ─── Template cache ───────────────────────────────────────────────────
const templateCache = new Map<string, { template: EmailTemplate | null; fetchedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ─── Core functions ───────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapInBrandedShell(bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 32px 16px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 20px; font-weight: 700; color: #3d7eff;">Datafrica</span>
    </div>
    <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
      ${bodyHtml}
    </div>
    <div style="text-align: center; margin-top: 24px; color: #94a3b8; font-size: 13px;">
      <p style="margin: 0;">&copy; ${new Date().getFullYear()} Datafrica. All rights reserved.</p>
      <p style="margin: 4px 0 0;"><a href="${BASE_URL}" style="color: #94a3b8;">mydatafrica.web.app</a></p>
    </div>
  </div>
</body>
</html>`;
}

export async function getTemplate(type: EmailTemplateType): Promise<EmailTemplate | null> {
  const now = Date.now();
  const cached = templateCache.get(type);
  if (cached && now - cached.fetchedAt < CACHE_TTL) {
    return cached.template;
  }

  try {
    const doc = await adminDb.collection("email_templates").doc(type).get();
    if (doc.exists) {
      const data = doc.data() as { subject?: string; bodyHtml?: string; enabled?: boolean };
      // Explicitly disabled
      if (data.enabled === false) {
        templateCache.set(type, { template: null, fetchedAt: now });
        return null;
      }
      const template: EmailTemplate = {
        subject: data.subject || DEFAULT_TEMPLATES[type].subject,
        bodyHtml: data.bodyHtml || DEFAULT_TEMPLATES[type].bodyHtml,
      };
      templateCache.set(type, { template, fetchedAt: now });
      return template;
    }
  } catch {
    // Firestore error — fall back to default
  }

  const defaultTpl = DEFAULT_TEMPLATES[type];
  templateCache.set(type, { template: defaultTpl, fetchedAt: now });
  return defaultTpl;
}

export function renderTemplate(
  template: EmailTemplate,
  variables: Record<string, string>
): { subject: string; html: string } {
  let subject = template.subject;
  let body = template.bodyHtml;

  for (const [key, value] of Object.entries(variables)) {
    const safeValue = escapeHtml(value);
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    subject = subject.replace(regex, value); // Subject doesn't need HTML escaping
    body = body.replace(regex, safeValue);
  }

  return { subject, html: wrapInBrandedShell(body) };
}

export async function sendTemplateEmail(
  type: EmailTemplateType,
  to: string,
  variables: Record<string, string>
): Promise<boolean> {
  const template = await getTemplate(type);
  if (!template) return false; // Template disabled

  const { subject, html } = renderTemplate(template, variables);
  return sendEmail({ to, subject, html });
}

// ─── Low-level send ───────────────────────────────────────────────────

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<boolean> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn("Gmail not configured (GMAIL_USER / GMAIL_APP_PASSWORD missing). Email not sent.");
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""),
    });
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

// ─── Backward-compatible exports (delegates to new system) ────────────

export function welcomeEmail(name: string): { subject: string; html: string } {
  return renderTemplate(DEFAULT_TEMPLATES.welcome, { name });
}

export function purchaseConfirmationEmail(
  name: string,
  datasetTitle: string,
  amount: number,
  currency: string
): { subject: string; html: string } {
  const formatted = currency === "XOF" || currency === "CFA"
    ? `${amount.toLocaleString()} CFA`
    : `$${amount.toLocaleString()}`;
  return renderTemplate(DEFAULT_TEMPLATES.purchase_confirmation, {
    name,
    datasetTitle,
    amount: formatted,
    currency,
    date: new Date().toLocaleDateString(),
  });
}

export function newMessageEmail(name: string, fromName: string): { subject: string; html: string } {
  return renderTemplate(DEFAULT_TEMPLATES.new_message, { name, fromName });
}

// ─── Utility exports ──────────────────────────────────────────────────

export { DEFAULT_TEMPLATES, CACHE_TTL };

export function clearTemplateCache() {
  templateCache.clear();
}
