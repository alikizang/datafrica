"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { toast } from "sonner";
import {
  ArrowLeft,
  Mail,
  Save,
  Send,
  RotateCcw,
  X,
  Eye,
  Code,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface TemplateItem {
  type: string;
  label: string;
  description: string;
  placeholders: string[];
  subject: string;
  bodyHtml: string;
  enabled: boolean;
  isCustomized: boolean;
  updatedAt: string | null;
}

export default function AdminEmailTemplatesPage() {
  const { getIdToken } = useAuth();
  const { t } = useLanguage();
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editing, setEditing] = useState<TemplateItem | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editEnabled, setEditEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const fetchTemplates = async () => {
    const token = await getIdToken();
    if (!token) return;
    try {
      const res = await fetch("/api/admin/email-templates", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEdit = (tpl: TemplateItem) => {
    setEditing(tpl);
    setEditSubject(tpl.subject);
    setEditBody(tpl.bodyHtml);
    setEditEnabled(tpl.enabled);
    setShowPreview(false);
  };

  const handleSave = async () => {
    if (!editing) return;
    const token = await getIdToken();
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type: editing.type,
          subject: editSubject,
          bodyHtml: editBody,
          enabled: editEnabled,
        }),
      });
      if (res.ok) {
        toast.success(t("admin.templateSaved"));
        setEditing(null);
        fetchTemplates();
      } else {
        toast.error(t("common.error"));
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  const handleTestSend = async (type: string) => {
    const token = await getIdToken();
    if (!token) return;
    setTesting(true);
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type }),
      });
      if (res.ok) {
        toast.success(t("admin.testSendSuccess"));
      } else {
        const data = await res.json();
        toast.error(data.error || t("common.error"));
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setTesting(false);
    }
  };

  const handleReset = async (type: string) => {
    const token = await getIdToken();
    if (!token) return;
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type }),
      });
      if (res.ok) {
        toast.success(t("admin.templateReset"));
        setEditing(null);
        fetchTemplates();
      }
    } catch {
      toast.error(t("common.error"));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("admin.backToAdmin")}
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("admin.emailTemplates")}</h1>
            <p className="text-sm text-muted-foreground">{t("admin.emailTemplatesDesc")}</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <div
                key={tpl.type}
                className="glass-card rounded-xl border border-border p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{tpl.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{tpl.description}</p>
                  </div>
                  {!tpl.enabled ? (
                    <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">
                      {t("admin.templateDisabled")}
                    </Badge>
                  ) : tpl.isCustomized ? (
                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                      {t("admin.templateCustomized")}
                    </Badge>
                  ) : (
                    <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs">
                      {t("admin.templateDefault")}
                    </Badge>
                  )}
                </div>

                <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
                  <span className="font-medium">Subject: </span>
                  <span className="text-foreground">{tpl.subject}</span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {tpl.placeholders.map((p) => (
                    <span
                      key={p}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono"
                    >
                      {`{{${p}}}`}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border">
                  <button
                    onClick={() => openEdit(tpl)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                  >
                    <Code className="h-3 w-3" />
                    {t("admin.editTemplate")}
                  </button>
                  <button
                    onClick={() => handleTestSend(tpl.type)}
                    disabled={testing || !tpl.enabled}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50"
                  >
                    <Send className="h-3 w-3" />
                    {t("admin.testSend")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{editing.label}</h2>
                <p className="text-xs text-muted-foreground">{editing.description}</p>
              </div>
              <button
                onClick={() => setEditing(null)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Enable toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {editing.enabled ? (
                    <span className="flex items-center gap-1.5 text-green-500">
                      <CheckCircle className="h-4 w-4" /> Enabled
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-red-500">
                      <XCircle className="h-4 w-4" /> Disabled
                    </span>
                  )}
                </span>
                <button
                  onClick={() => setEditEnabled(!editEnabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    editEnabled ? "bg-green-500" : "bg-muted"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full transition-transform shadow ${
                      editEnabled ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </div>

              {/* Subject */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Subject</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Placeholders reference */}
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">{t("admin.placeholders")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {editing.placeholders.map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setEditBody((prev) => prev + `{{${p}}}`);
                      }}
                      className="text-xs px-2 py-1 rounded bg-primary/10 text-primary font-mono hover:bg-primary/20 transition-colors cursor-pointer"
                      title={`Click to insert {{${p}}}`}
                    >
                      {`{{${p}}}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body HTML */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-foreground">Body HTML</label>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                  >
                    <Eye className="h-3 w-3" />
                    {showPreview ? "Edit" : "Preview"}
                  </button>
                </div>
                {showPreview ? (
                  <div
                    className="w-full min-h-[300px] border border-border rounded-lg bg-white p-4 text-sm"
                    dangerouslySetInnerHTML={{ __html: editBody }}
                  />
                ) : (
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={14}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                  />
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-5 border-t border-border">
              <div className="flex items-center gap-2">
                {editing.isCustomized && (
                  <button
                    onClick={() => handleReset(editing.type)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted rounded-lg transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    {t("admin.resetToDefault")}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Save className="h-3 w-3" />
                  {saving ? "..." : t("common.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
