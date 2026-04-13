"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import {
  ArrowLeft,
  Send,
  Loader2,
  MessageSquare,
  Users,
  Mail,
  MailOpen,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Conversation {
  userId: string;
  senderName: string;
  senderEmail: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: boolean;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  subject: string;
  body: string;
  readByAdmin: boolean;
  createdAt: string;
}

export default function AdminMessagesPage() {
  const { user, getIdToken } = useAuth();
  const { t } = useLanguage();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Reply form
  const [replyBody, setReplyBody] = useState("");

  // Bulk message form
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkBody, setBulkBody] = useState("");
  const [bulkSending, setBulkSending] = useState(false);

  const getToken = useCallback(async () => await getIdToken(), [getIdToken]);

  // Fetch conversations
  useEffect(() => {
    async function fetch_() {
      if (!user || user.role !== "admin") return;
      const token = await getToken();
      if (!token) return;

      try {
        const res = await fetch("/api/messages?mode=admin", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setConversations(data.conversations || []);
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    }
    fetch_();
  }, [user, getToken]);

  // Fetch messages for selected user
  const openConversation = async (userId: string) => {
    setSelectedUser(userId);
    setMsgLoading(true);
    const token = await getToken();
    if (!token) { setMsgLoading(false); return; }

    try {
      const res = await fetch(`/api/messages?mode=admin&with=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);

        // Mark unread as read
        const unreadIds = (data.messages || [])
          .filter((m: Message) => !m.readByAdmin && m.senderId !== user?.uid)
          .map((m: Message) => m.id);
        if (unreadIds.length > 0) {
          await fetch("/api/messages", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ messageIds: unreadIds }),
          });
          setConversations((prev) =>
            prev.map((c) => (c.userId === userId ? { ...c, unread: false } : c))
          );
        }
      }
    } catch { /* silent */ }
    finally { setMsgLoading(false); }
  };

  const handleReply = async () => {
    if (!replyBody.trim() || !selectedUser) return;
    const token = await getToken();
    if (!token) return;
    setSending(true);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to: selectedUser, subject: "", body: replyBody }),
      });
      if (res.ok) {
        toast.success(t("messages.sent"));
        setReplyBody("");
        openConversation(selectedUser);
      } else { toast.error(t("common.error")); }
    } catch { toast.error(t("common.error")); }
    finally { setSending(false); }
  };

  const handleBulkSend = async () => {
    if (!bulkBody.trim()) return;
    const token = await getToken();
    if (!token) return;
    setBulkSending(true);

    try {
      const res = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject: bulkSubject, body: bulkBody }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`${t("messages.sent")} (${data.totalSent} ${t("messages.users")})`);
        setBulkSubject("");
        setBulkBody("");
        setBulkMode(false);
      } else { toast.error(t("common.error")); }
    } catch { toast.error(t("common.error")); }
    finally { setBulkSending(false); }
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

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t("messages.adminTitle")}</h1>
              <p className="text-sm text-muted-foreground">{t("messages.adminSubtitle")}</p>
            </div>
          </div>
          <Button
            onClick={() => { setBulkMode(!bulkMode); setSelectedUser(null); }}
            className={`rounded-xl ${bulkMode ? "bg-muted text-foreground" : "bg-primary text-white hover:bg-primary/90"}`}
          >
            <Users className="h-4 w-4 mr-2" />
            {bulkMode ? t("messages.viewInbox") : t("messages.bulkMessage")}
          </Button>
        </div>

        {/* Bulk message mode */}
        {bulkMode && (
          <div className="glass-card rounded-xl border border-border p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">{t("messages.bulkMessage")}</h2>
            <p className="text-sm text-muted-foreground mb-4">{t("messages.bulkDesc")}</p>
            <div className="space-y-3">
              <Input
                value={bulkSubject}
                onChange={(e) => setBulkSubject(e.target.value)}
                placeholder={t("messages.subjectPlaceholder")}
                className="bg-muted border-border text-foreground rounded-xl"
              />
              <textarea
                value={bulkBody}
                onChange={(e) => setBulkBody(e.target.value)}
                placeholder={t("messages.bodyPlaceholder")}
                className="w-full h-32 px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleBulkSend}
                  disabled={bulkSending || !bulkBody.trim()}
                  className="rounded-xl bg-primary hover:bg-primary/90 text-white"
                >
                  {bulkSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  {t("messages.sendToAll")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Inbox */}
        {!bulkMode && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Conversation list */}
            <div className="lg:col-span-1 space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground mb-3">{t("messages.conversations")}</h2>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{t("messages.noConversations")}</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.userId}
                    onClick={() => openConversation(conv.userId)}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${
                      selectedUser === conv.userId
                        ? "bg-primary/10 border-primary/30"
                        : conv.unread
                        ? "bg-primary/5 border-primary/20 hover:bg-primary/10"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${conv.unread ? "bg-primary/20" : "bg-muted"}`}>
                        {conv.unread ? <Mail className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${conv.unread ? "font-semibold text-foreground" : "text-foreground"}`}>
                          {conv.senderName || conv.senderEmail || conv.userId}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(conv.lastMessageAt).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Message thread */}
            <div className="lg:col-span-2">
              {selectedUser ? (
                <div className="glass-card rounded-xl border border-border p-6">
                  {msgLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
                        {messages.map((msg) => {
                          const isAdmin = msg.senderId === user?.uid;
                          return (
                            <div
                              key={msg.id}
                              className={`p-3 rounded-xl ${
                                isAdmin
                                  ? "bg-primary/10 border border-primary/20 ml-8"
                                  : "bg-muted border border-border mr-8"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-foreground">
                                  {isAdmin ? t("messages.you") : msg.senderName}
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
                          );
                        })}
                      </div>
                      {/* Reply */}
                      <div className="flex gap-2 pt-4 border-t border-border">
                        <textarea
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
                          placeholder={t("messages.replyPlaceholder")}
                          className="flex-1 h-20 px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <Button
                          onClick={handleReply}
                          disabled={sending || !replyBody.trim()}
                          className="rounded-xl bg-primary hover:bg-primary/90 text-white self-end"
                        >
                          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="glass-card rounded-xl border border-border p-12 text-center">
                  <MailOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">{t("messages.selectConversation")}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
