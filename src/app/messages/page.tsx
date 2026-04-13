"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import {
  ArrowLeft,
  Send,
  Loader2,
  Mail,
  MailOpen,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  subject: string;
  body: string;
  readByUser: boolean;
  readByAdmin: boolean;
  createdAt: string;
}

export default function MessagesPage() {
  const { user, getIdToken } = useAuth();
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [unread, setUnread] = useState(0);

  const fetchMessages = useCallback(async () => {
    if (!user) return;
    const token = await getIdToken();
    if (!token) return;

    try {
      const res = await fetch("/api/messages", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setUnread(data.unread || 0);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [user, getIdToken]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Mark unread messages as read on mount
  useEffect(() => {
    if (!user || messages.length === 0) return;
    const unreadIds = messages
      .filter((m) => m.senderId !== user.uid && !m.readByUser)
      .map((m) => m.id);
    if (unreadIds.length === 0) return;

    (async () => {
      const token = await getIdToken();
      if (!token) return;
      await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messageIds: unreadIds }),
      });
      setUnread(0);
    })();
  }, [messages, user, getIdToken]);

  const handleSend = async () => {
    if (!body.trim()) return;
    const token = await getIdToken();
    if (!token) return;
    setSending(true);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to: "admin", subject, body }),
      });
      if (res.ok) {
        toast.success(t("messages.sent"));
        setSubject("");
        setBody("");
        fetchMessages();
      } else {
        toast.error(t("common.error"));
      }
    } catch { toast.error(t("common.error")); }
    finally { setSending(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("dashboard.backToDashboard")}
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("messages.title")}</h1>
            <p className="text-sm text-muted-foreground">
              {unread > 0 ? `${unread} ${t("messages.unreadCount")}` : t("messages.subtitle")}
            </p>
          </div>
        </div>

        {/* Compose */}
        <div className="glass-card rounded-xl border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">{t("messages.compose")}</h2>
          <div className="space-y-3">
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("messages.subjectPlaceholder")}
              className="bg-muted border-border text-foreground rounded-xl"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("messages.bodyPlaceholder")}
              className="w-full h-28 px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSend}
                disabled={sending || !body.trim()}
                className="rounded-xl bg-primary hover:bg-primary/90 text-white"
              >
                {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                {t("messages.send")}
              </Button>
            </div>
          </div>
        </div>

        {/* Message history */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{t("messages.empty")}</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isFromMe = msg.senderId === user?.uid;
              return (
                <div
                  key={msg.id}
                  className={`glass-card rounded-xl border border-border p-4 ${
                    !isFromMe && !msg.readByUser ? "border-primary/30 bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                      isFromMe ? "bg-primary/10" : "bg-emerald-500/10"
                    }`}>
                      {!isFromMe && !msg.readByUser ? (
                        <Mail className="h-4 w-4 text-primary" />
                      ) : (
                        <MailOpen className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">
                          {isFromMe ? t("messages.you") : msg.senderName || "Admin"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {msg.subject && (
                        <p className="text-sm font-medium text-foreground mb-1">{msg.subject}</p>
                      )}
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{msg.body}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
