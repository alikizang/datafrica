import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-middleware";
import { adminDb } from "@/lib/firebase-admin";
import { logActivity } from "@/lib/activity-log";
import {
  TEMPLATE_META,
  DEFAULT_TEMPLATES,
  sendTemplateEmail,
  clearTemplateCache,
  type EmailTemplateType,
} from "@/lib/email";

const VALID_TYPES = Object.keys(TEMPLATE_META) as EmailTemplateType[];

// GET /api/admin/email-templates — List all templates with status
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const snap = await adminDb.collection("email_templates").get();
    const customized = new Map<string, Record<string, unknown>>();
    snap.docs.forEach((doc) => customized.set(doc.id, doc.data()));

    const templates = VALID_TYPES.map((type) => {
      const meta = TEMPLATE_META[type];
      const custom = customized.get(type);
      const defaults = DEFAULT_TEMPLATES[type];

      return {
        type,
        label: meta.label,
        description: meta.description,
        placeholders: meta.placeholders,
        subject: custom?.subject || defaults.subject,
        bodyHtml: custom?.bodyHtml || defaults.bodyHtml,
        enabled: custom ? custom.enabled !== false : true,
        isCustomized: !!custom,
        updatedAt: custom?.updatedAt || null,
      };
    });

    return NextResponse.json({ templates });
  } catch (err) {
    console.error("Failed to list email templates:", err);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

// PUT /api/admin/email-templates — Save a custom template
export async function PUT(request: NextRequest) {
  const { error, user: adminUser } = await requireAdmin(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { type, subject, bodyHtml, enabled } = body;

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid template type" }, { status: 400 });
    }

    await adminDb.collection("email_templates").doc(type).set(
      {
        subject: subject || DEFAULT_TEMPLATES[type as EmailTemplateType].subject,
        bodyHtml: bodyHtml || DEFAULT_TEMPLATES[type as EmailTemplateType].bodyHtml,
        enabled: enabled !== false,
        updatedAt: new Date().toISOString(),
        updatedBy: adminUser?.uid || "unknown",
      },
      { merge: true }
    );

    clearTemplateCache();

    logActivity({
      action: "admin.action",
      userId: adminUser?.uid || "",
      details: `Updated email template: ${type}`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to save email template:", err);
    return NextResponse.json({ error: "Failed to save template" }, { status: 500 });
  }
}

// POST /api/admin/email-templates — Send test email to admin
export async function POST(request: NextRequest) {
  const { error, user: adminUser } = await requireAdmin(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { type } = body;

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid template type" }, { status: 400 });
    }

    const templateType = type as EmailTemplateType;
    const meta = TEMPLATE_META[templateType];

    // Build sample variables
    const sampleVars: Record<string, string> = {};
    for (const p of meta.placeholders) {
      switch (p) {
        case "name": sampleVars[p] = "John Doe"; break;
        case "email": sampleVars[p] = adminUser?.email || "test@example.com"; break;
        case "datasetTitle": sampleVars[p] = "Sample Dataset - Business Directory"; break;
        case "amount": sampleVars[p] = "15,000 CFA"; break;
        case "currency": sampleVars[p] = "XOF"; break;
        case "date": sampleVars[p] = new Date().toLocaleDateString(); break;
        case "planName": sampleVars[p] = "Pro Plan"; break;
        case "billingCycle": sampleVars[p] = "monthly"; break;
        case "startDate": sampleVars[p] = new Date().toLocaleDateString(); break;
        case "endDate": case "nextEndDate": sampleVars[p] = new Date(Date.now() + 30 * 86400000).toLocaleDateString(); break;
        case "renewalDate": sampleVars[p] = new Date().toLocaleDateString(); break;
        case "fromName": sampleVars[p] = "Admin Team"; break;
        case "title": sampleVars[p] = "Test Broadcast Title"; break;
        case "message": sampleVars[p] = "This is a test broadcast message from the admin panel."; break;
        case "reason": sampleVars[p] = "Violation of terms of service (test)"; break;
        default: sampleVars[p] = `[${p}]`;
      }
    }

    const sent = await sendTemplateEmail(templateType, adminUser?.email || "", sampleVars);

    if (sent) {
      return NextResponse.json({ success: true, sentTo: adminUser?.email });
    } else {
      return NextResponse.json({ error: "Failed to send test email. Check Gmail configuration." }, { status: 500 });
    }
  } catch (err) {
    console.error("Failed to send test email:", err);
    return NextResponse.json({ error: "Failed to send test email" }, { status: 500 });
  }
}

// DELETE /api/admin/email-templates — Reset template to default
export async function DELETE(request: NextRequest) {
  const { error, user: adminUser } = await requireAdmin(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { type } = body;

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid template type" }, { status: 400 });
    }

    const docRef = adminDb.collection("email_templates").doc(type);
    const doc = await docRef.get();
    if (doc.exists) {
      await docRef.delete();
      clearTemplateCache();
    }

    logActivity({
      action: "admin.action",
      userId: adminUser?.uid || "",
      details: `Reset email template to default: ${type}`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to reset email template:", err);
    return NextResponse.json({ error: "Failed to reset template" }, { status: 500 });
  }
}
