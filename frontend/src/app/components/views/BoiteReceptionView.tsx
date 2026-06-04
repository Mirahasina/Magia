import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "../ui/utils";
import {
  Search, Send, ArrowLeft, MessageSquare, Mail, Bot,
  Check, CheckCheck, Phone, PhoneOff, Mic, MicOff, Video, VideoOff
} from "lucide-react";
import { API_BASE, getAuthHeaders, getAuthHeadersOnly } from "../../../lib/api";
import { useDailyAudioCall } from "../../hooks/useDailyAudioCall";
import { useAgents } from "../../hooks/useAgents";

/* ───────────────────── Domain Types ───────────────────── */

interface Conversation {
  contact: string;
  contact_name?: string;
  source: string;
  last_updated?: string;
  lastMsg?: { content: string; is_me?: boolean };
  unread?: number;
  agent?: { id: string };
  email_config_id?: number;
  type?: "agent" | "contact";
}

interface AgentThread {
  id: string;
  name: string;
  type: "agent";
  channels?: string[];
  stats?: { conversations?: number };
  messages?: unknown[];
}

type Thread = (Conversation & { type?: "contact" | "agent" }) | AgentThread;

interface Message {
  id: number | string;
  sender: string;
  content: string;
  created_at: string;
}

interface EmptyContact {
  contact_info: string;
  name: string;
  avatar_letter: string;
}

/* ───────────────────── Helpers ───────────────────── */

function formatTime(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) {
    const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    return days[date.getDay()];
  }
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function formatFullDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) {
    const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    return days[date.getDay()];
  }
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function avatarColor(name: string): string {
  const colors = [
    "#25D366", "#128C7E", "#075E54", "#34B7F1", "#00BCD4",
    "#4CAF50", "#FF5722", "#9C27B0", "#3F51B5", "#E91E63",
    "#FF9800", "#607D8B", "#795548", "#F44336",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function groupMessagesByDate(messages: Message[]): { date: string; msgs: Message[] }[] {
  const groups: { date: string; msgs: Message[] }[] = [];
  for (const msg of messages) {
    const label = formatFullDate(msg.created_at);
    const last = groups[groups.length - 1];
    if (!last || last.date !== label) {
      groups.push({ date: label, msgs: [msg] });
    } else {
      last.msgs.push(msg);
    }
  }
  return groups;
}

function linkify(text: string) {
  if (!text) return <>{text}</>;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return (
    <>
      {text.split(urlRegex).map((part, i) =>
        part.match(urlRegex) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline opacity-80 break-all">
            {part}
          </a>
        ) : (
          part
        )
      )}
    </>
  );
}

/* ───────────────────── Sub-components ───────────────────── */

function SourceBadge({ source }: { source: string }) {
  if (source === "whatsapp")
    return (
      <svg viewBox="0 0 24 24" width="12" height="12" fill="#8696a0" className="shrink-0">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.121 1.528 5.851L0 24l6.305-1.51A11.96 11.96 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.875 0-3.633-.5-5.153-1.373l-.369-.22-3.764.903.966-3.643-.24-.38A9.793 9.793 0 0 1 2.182 12c0-5.418 4.4-9.818 9.818-9.818S21.818 6.582 21.818 12 17.418 21.818 12 21.818z" />
      </svg>
    );
  if (source === "email") return <Mail size={12} className="shrink-0 text-[#8696a0]" />;
  return <Bot size={12} className="shrink-0 text-[#8696a0]" />;
}

/* ───────────────────── Main Component ───────────────────── */

interface Props {
  setViewingAgent: (agent: any) => void;
  globalSearchQuery?: string;
  initialContact?: { contact_info: string; name: string; source: string } | null;
  onInitialContactConsumed?: () => void;
}

export function BoiteReceptionView({ setViewingAgent, globalSearchQuery = "", initialContact, onInitialContactConsumed }: Props) {
  const { whatsappConfigs, emailConfigs } = useAgents();

  const hasWhatsApp = whatsappConfigs && whatsappConfigs.some((c: any) => c.is_connected);
  const hasEmail = emailConfigs && emailConfigs.some((c: any) => c.is_active);

  const availableTabs = [
    { id: "all" as const, label: "Tout" },
    ...(hasWhatsApp ? [{ id: "whatsapp" as const, label: "WhatsApp" }] : []),
    ...(hasEmail ? [{ id: "email" as const, label: "Email" }] : []),
    { id: "agents" as const, label: "Agents" }
  ];

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [emptyContacts, setEmptyContacts] = useState<EmptyContact[]>([]);
  const [agents, setAgents] = useState<AgentThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState(globalSearchQuery);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [activeTab, setActiveTab] = useState<"all" | "whatsapp" | "email" | "agents">("all");
  const [sending, setSending] = useState(false);

  const [activeVideoRoom, setActiveVideoRoom] = useState<string | null>(null);
  const [videoCallState, setVideoCallState] = useState<"idle" | "creating" | "error">("idle");
  const [videoCallError, setVideoCallError] = useState("");

  const { callState, callError, isMuted, startCall, handleHangup, toggleMute } = useDailyAudioCall();

  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const initialLoadRef = useRef(false);

  // Ouvrir automatiquement un contact envoyé depuis le CRM
  useEffect(() => {
    if (initialContact) {
      setSelectedThread({
        contact: initialContact.contact_info,
        contact_name: initialContact.name,
        source: initialContact.source,
        type: "contact",
        unread: 0,
      });
      // Basculer sur l'onglet correspondant
      if (initialContact.source === "whatsapp") setActiveTab("whatsapp");
      else if (initialContact.source === "email") setActiveTab("email");
      else setActiveTab("all");
      onInitialContactConsumed?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContact]);

  useEffect(() => { setSearchQuery(globalSearchQuery); }, [globalSearchQuery]);

  /* ── Fetch conversations & contacts ── */

  const fetchConversations = useCallback(
    async (q = searchQuery) => {
      const token = localStorage.getItem("access_token");
      if (!token) return;
      try {
        const source = activeTab === "agents" || activeTab === "all" ? "" : activeTab;
        const res = await fetch(
          `${API_BASE}/agents/all_conversations/?search=${encodeURIComponent(q)}${source ? `&source=${source}` : ""}`,
          { headers: getAuthHeadersOnly() }
        );

        let convData: Conversation[] = [];
        if (res.ok) {
          convData = await res.json();
          setConversations(convData);
        }

        if (q && activeTab !== "agents" && activeTab !== "email") {
          const cRes = await fetch(
            `${API_BASE}/agents/contacts_list/?search=${encodeURIComponent(q)}&source=whatsapp`,
            { headers: getAuthHeadersOnly() }
          );
          if (cRes.ok) {
            const cData: EmptyContact[] = await cRes.json();
            const existingContacts = new Set(convData.map((co) => co.contact));
            setEmptyContacts(cData.filter((c) => !existingContacts.has(c.contact_info)));
          }
        } else {
          setEmptyContacts([]);
        }
      } catch {
        /* network failure */
      }
    },
    [searchQuery, activeTab]
  );

  const fetchAgents = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/agents/?search=${encodeURIComponent(searchQuery)}`, {
        headers: getAuthHeadersOnly(),
      });
      if (res.ok) setAgents(await res.json());
    } catch {
      /* network failure */
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchConversations();
    fetchAgents();
    const interval = setInterval(() => fetchConversations(), 5000);
    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    const t = setTimeout(() => { fetchConversations(searchQuery); fetchAgents(); }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  /* ── Fetch thread messages ── */

  const fetchMessages = useCallback(async () => {
    if (!selectedThread) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      const url =
        selectedThread.type === "agent"
          ? `${API_BASE}/agents/${(selectedThread as AgentThread).id}/messages/`
          : `${API_BASE}/agents/contact_messages/?contact=${encodeURIComponent((selectedThread as Conversation).contact)}&source=${encodeURIComponent((selectedThread as Conversation).source)}`;

      const res = await fetch(url, { headers: getAuthHeadersOnly() });
      if (res.ok) {
        const data: Message[] = await res.json();
        if (!initialLoadRef.current) {
          setMessages(data);
          initialLoadRef.current = true;
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "instant" }), 60);
        } else {
          setMessages((prev) => {
            const isSame =
              prev.length === data.length &&
              prev[prev.length - 1]?.id === data[data.length - 1]?.id &&
              prev[0]?.id === data[0]?.id;
            if (isSame) return prev;
            if (isAtBottomRef.current) {
              setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
            }
            return data;
          });
        }
      }
    } catch {
      /* network failure */
    }
  }, [selectedThread]);

  useEffect(() => {
    if (!selectedThread) return;
    initialLoadRef.current = false;
    isAtBottomRef.current = true;
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [selectedThread]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 80;
  };

  /* ── Send message ── */

  const handleVideoCall = async (contact: string) => {
    try {
      setVideoCallState("creating");
      const res = await fetch(`${API_BASE}/video-rooms/create_room/`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!res.ok) {
        setVideoCallState("error");
        setVideoCallError(data.error || "Failed to create video room");
        alert(data.error || "Échec de création de la salle vidéo");
        return;
      }

      const roomUrl = data.room_url;
      setActiveVideoRoom(roomUrl);
      setVideoCallState("idle");

      // Auto-send the link
      const text = `Veuillez rejoindre l'appel vidéo en cliquant sur ce lien : ${roomUrl}`;
      const optimistic: Message = {
        id: Date.now(),
        sender: "ai",
        content: text,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

      const conv = selectedThread as Conversation;
      const agentId = conv.agent?.id;
      const endpoint = agentId
        ? `${API_BASE}/agents/${agentId}/send_manual_reply/`
        : `${API_BASE}/agents/universal_reply/`;

      await fetch(endpoint, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          content: text,
          source: conv.source,
          contact_info: conv.contact,
          email_config_id: conv.email_config_id,
        }),
      });

    } catch (err: any) {
      setVideoCallState("error");
      setVideoCallError(err.message || "Unknown error");
      alert(err.message || "Unknown error");
    }
  };

  const handleAudioCall = async (contact: string) => {
    try {
      const res = await fetch(`${API_BASE}/video-rooms/create_room/`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Échec de création de la salle vocale");
        return;
      }

      const roomUrl = data.room_url;

      // Auto-send the link
      const text = `Je vous appelle en vocal. Veuillez rejoindre l'appel en cliquant sur ce lien : ${roomUrl}`;
      const optimistic: Message = {
        id: Date.now(),
        sender: "ai",
        content: text,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

      const conv = selectedThread as Conversation;
      const agentId = conv.agent?.id;
      const endpoint = agentId
        ? `${API_BASE}/agents/${agentId}/send_manual_reply/`
        : `${API_BASE}/agents/universal_reply/`;

      await fetch(endpoint, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          content: text,
          source: conv.source,
          contact_info: conv.contact,
          email_config_id: conv.email_config_id,
        }),
      });

      // Join the call object locally
      await startCall(roomUrl);

    } catch (err: any) {
      alert(err.message || "Unknown error");
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedThread || sending) return;
    setSending(true);
    const text = newMessage;
    setNewMessage("");
    const optimistic: Message = {
      id: Date.now(),
      sender: "ai",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      const token = localStorage.getItem("access_token");
      if (selectedThread.type === "agent") {
        await fetch(`${API_BASE}/agents/${(selectedThread as AgentThread).id}/send_manual_reply/`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ content: text, source: "chat", contact_info: "Manual" }),
        });
      } else {
        const conv = selectedThread as Conversation;
        const agentId = conv.agent?.id;
        const endpoint = agentId
          ? `${API_BASE}/agents/${agentId}/send_manual_reply/`
          : `${API_BASE}/agents/universal_reply/`;
        await fetch(endpoint, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            content: text,
            source: conv.source,
            contact_info: conv.contact,
            email_config_id: conv.email_config_id,
          }),
        });
      }
      await fetchMessages();
      await fetchConversations();
    } catch {
      /* network failure */
    } finally {
      setSending(false);
    }
  };

  /* ── Derived display state ── */

  let displayConversations: (Conversation | AgentThread)[] = [];
  if (activeTab === "agents") {
    displayConversations = agents.map((a) => ({ ...a, type: "agent" as const }));
  } else {
    displayConversations = conversations.filter((c) => {
      if (activeTab === "whatsapp") return c.source === "whatsapp";
      if (activeTab === "email") return c.source === "email";
      return true;
    });
  }
  if (filter === "unread") {
    displayConversations = displayConversations.filter((c) => ((c as Conversation).unread || 0) > 0);
  }

  const threadName =
    selectedThread
      ? selectedThread.type === "agent"
        ? (selectedThread as AgentThread).name
        : ((selectedThread as Conversation).contact_name || (selectedThread as Conversation).contact)
      : "";

  const threadSource =
    (selectedThread as Conversation)?.source ||
    (selectedThread as AgentThread)?.channels?.[0] ||
    "chat";
  const threadColor = selectedThread ? avatarColor(threadName ?? "") : "#25D366";
  const messageGroups = groupMessagesByDate(messages);

  /* ───────────────────── Render ───────────────────── */

  return (
    <div className="flex flex-1 w-full bg-[#ffffff] rounded-2xl overflow-hidden shadow-2xl min-h-0 border border-[#d1d7db]">

      <div
        className={cn(
          "flex flex-col w-full md:w-[360px] lg:w-[400px] shrink-0 border-r border-[#d1d7db] bg-[#ffffff] min-h-0 overflow-hidden",
          selectedThread ? "hidden md:flex" : "flex"
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 bg-[#f0f2f5]">
          <div className="flex gap-1">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedThread(null); }}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[12px] font-medium transition-colors border",
                  activeTab === tab.id
                    ? "bg-[#218158] text-white border-[#218158]"
                    : "bg-white text-[#54656f] border-[#d1d7db] hover:bg-[#f0f2f5]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-3 py-2 bg-[#ffffff] border-b border-[#f0f2f5]">
          <div className="flex items-center gap-2 bg-[#f0f2f5] rounded-xl px-3 py-1.5 transition-shadow focus-within:bg-white focus-within:shadow-[0_1px_3px_rgba(11,20,26,0.1)] focus-within:border focus-within:border-[#00a884]">
            <Search size={16} className="text-[#54656f] shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher ou démarrer une discussion"
              className="flex-1 bg-transparent text-[14px] text-[#111b21] placeholder-[#54656f] outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-[#54656f] hover:text-[#111b21] text-xs font-bold">✕</button>
            )}
          </div>
          <div className="flex gap-2 mt-2">
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "text-[12px] px-3 py-1 rounded-full font-medium transition-colors border",
                  filter === f
                    ? "bg-[#218158] text-white border-[#218158]"
                    : "bg-white text-[#54656f] border-[#d1d7db] hover:bg-[#f0f2f5]"
                )}
              >
                {f === "all" ? "Toutes" : "Non lues"}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {displayConversations.length === 0 && emptyContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center text-[#54656f] mt-10">
              <MessageSquare size={40} className="opacity-20 mb-4" />
              <span className="text-[15px] font-semibold text-[#111b21] mb-2">Aucun résultat trouvé</span>
              {searchQuery ? (
                <div className="text-[13px] bg-[#f0f2f5] p-3 rounded-lg text-left shadow-sm">
                  <p className="mb-2">⚠️ <strong>Contact introuvable ?</strong></p>
                  <p>Les très anciennes discussions WhatsApp (plus de 500 messages passés) ne sont pas automatiquement synchronisées.</p>
                  <p className="mt-2 text-[#218158] font-medium">👉 Pour démarrer une conversation, tapez le numéro de téléphone avec l'indicatif (ex: <strong>261 34...</strong>) dans la barre de recherche ci-dessus.</p>
                </div>
              ) : (
                <span className="text-sm">Aucune discussion</span>
              )}
              {searchQuery && /^[\d\+]+$/.test(searchQuery.replace(/\s/g, "")) && (
                <button
                  onClick={() =>
                    setSelectedThread({
                      contact: searchQuery.replace(/[\s\+]/g, "") + "@s.whatsapp.net",
                      contact_name: searchQuery,
                      source: "whatsapp",
                      type: "contact",
                      unread: 0,
                    })
                  }
                  className="mt-6 w-full flex items-center justify-center gap-2 bg-[#25D366] text-white py-2.5 px-4 rounded-xl font-medium shadow hover:bg-[#218158] transition-colors"
                >
                  <span>Envoyer un message à {searchQuery}</span>
                  <Send size={16} />
                </button>
              )}
            </div>
          ) : (
            <>
              {displayConversations.map((conv, idx) => {
                const isAgent = conv.type === "agent";
                const c = conv as Conversation;
                const a = conv as AgentThread;
                const name = isAgent ? a.name : (c.contact_name || c.contact || "Inconnu");
                const letter = name[0]?.toUpperCase() || "?";
                const preview = isAgent
                  ? (a.stats?.conversations ? `${a.stats.conversations} conversations` : "Agent IA")
                  : stripHtml(c.lastMsg?.content || "");
                const time = isAgent ? "" : formatTime(c.last_updated || "");
                const unread = c.unread || 0;
                const isSelected = selectedThread
                  ? isAgent
                    ? (selectedThread as AgentThread).id === a.id
                    : (selectedThread as Conversation).contact === c.contact && (selectedThread as Conversation).source === c.source
                  : false;

                return (
                  <button
                    key={`conv-${idx}`}
                    onClick={() => setSelectedThread(isAgent ? { ...a, type: "agent" } : conv)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f5f6f6] transition-colors text-left border-b border-[#f0f2f5]",
                      isSelected && "bg-[#f0f2f5]"
                    )}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                      style={{ backgroundColor: avatarColor(name) }}
                    >
                      {letter}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={cn("text-[16px] font-normal truncate", unread > 0 ? "text-[#111b21] font-medium" : "text-[#111b21]")}>
                          {name}
                        </span>
                        <span className={cn("text-[12px] shrink-0 ml-2", unread > 0 ? "text-[#00a884] font-medium" : "text-[#54656f]")}>
                          {time}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <SourceBadge source={c.source || "chat"} />
                          {c.lastMsg?.is_me && <CheckCheck size={14} className="text-[#53bdeb] shrink-0" />}
                          <span className="text-[13px] text-[#54656f] truncate">{preview}</span>
                        </div>
                        {unread > 0 && (
                          <span className="bg-[#25D366] text-white text-[12px] font-bold rounded-full min-w-[22px] px-1.5 py-0.5 text-center shrink-0">
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {emptyContacts.length > 0 && (
                <div className="mt-2">
                  <div className="px-4 py-2 text-[12px] font-semibold text-[#8696a0] uppercase tracking-wider bg-[#f0f2f5]">
                    Nouveaux Contacts WhatsApp
                  </div>
                  {emptyContacts.map((c, idx) => (
                    <button
                      key={`contact-${idx}`}
                      onClick={() =>
                        setSelectedThread({
                          contact: c.contact_info,
                          contact_name: c.name,
                          source: "whatsapp",
                          type: "contact",
                          unread: 0,
                        })
                      }
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f5f6f6] transition-colors text-left border-b border-[#f0f2f5]"
                    >
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                        style={{ backgroundColor: avatarColor(c.name) }}
                      >
                        {c.avatar_letter}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[16px] font-normal text-[#111b21] truncate">{c.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <SourceBadge source="whatsapp" />
                          <span className="text-[13px] text-[#54656f] truncate">Démarrer une nouvelle discussion</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ═══ RIGHT PANEL – Chat ═══ */}
      {!selectedThread ? (
        <div className="flex-1 hidden md:flex flex-col items-center justify-center text-center bg-[#f0f2f5] border-l border-[#d1d7db]">
          <div className="w-48 h-48 mb-8 opacity-20">
            <svg viewBox="0 0 100 100" className="w-full h-full" fill="currentColor">
              <path d="M50 0a50 50 0 1 0 0 100A50 50 0 0 0 50 0zm0 90a40 40 0 1 1 0-80 40 40 0 0 1 0 80z" />
            </svg>
          </div>
          <h3 className="text-[#41525d] text-3xl font-light mb-4">MAGIA Web</h3>
          <p className="text-[#667781] text-[14px] max-w-sm mb-8 leading-relaxed">
            Sélectionnez une discussion pour afficher vos messages.<br />
            WhatsApp, Email, Agents — tout au même endroit sans besoin de garder votre téléphone connecté.
          </p>
          <div className="flex items-center justify-center gap-2 text-[#8696a0] text-[12px] bg-white px-4 py-2 rounded-full shadow-sm">
            <Check size={14} /> Chiffré de bout en bout
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-[#efeae2] min-w-0 border-l border-[#d1d7db]">

          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-[#f0f2f5] border-b border-[#d1d7db] shrink-0 h-[60px]">
            <button onClick={() => setSelectedThread(null)} className="md:hidden text-[#54656f] p-1">
              <ArrowLeft size={20} />
            </button>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0"
              style={{ backgroundColor: threadColor }}
            >
              {threadName?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[#111b21] font-semibold text-[15px] truncate">{threadName}</p>
              <div className="flex items-center gap-1.5">
                <SourceBadge source={threadSource} />
                <p className="text-[#667781] text-[13px] truncate">
                  {selectedThread.type === "agent" ? "Agent IA" : (selectedThread as Conversation).contact}
                </p>
              </div>
            </div>
            {selectedThread.type !== "agent" && (
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => handleVideoCall((selectedThread as Conversation).contact)}
                  className="w-10 h-10 flex items-center justify-center text-[#54656f] hover:bg-white hover:shadow-sm hover:text-[#00a884] rounded-full transition-all shrink-0"
                  title="Démarrer un appel vidéo"
                  disabled={videoCallState === "creating"}
                >
                  <Video size={20} className={videoCallState === "creating" ? "animate-pulse" : ""} />
                </button>
                <button
                  onClick={() => handleAudioCall((selectedThread as Conversation).contact)}
                  className="w-10 h-10 flex items-center justify-center text-[#54656f] hover:bg-white hover:shadow-sm hover:text-[#00a884] rounded-full transition-all shrink-0"
                  title="Passer un appel vocal (Daily WebRTC)"
                >
                  <Phone size={20} />
                </button>
              </div>
            )}
          </div>

          {/* Video Call overlay modal */}
          {activeVideoRoom && (
            <div className="absolute inset-4 bg-black rounded-2xl shadow-2xl border border-[#e9edef] overflow-hidden z-50 flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between px-4 py-2 bg-[#111b21] shrink-0">
                <div className="flex items-center gap-2 text-white">
                  <Video size={16} className="text-[#00a884]" />
                  <span className="font-medium text-sm">Appel Vidéo en cours</span>
                </div>
                <button
                  onClick={() => setActiveVideoRoom(null)}
                  className="bg-[#ea0038] hover:bg-[#d60033] text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                >
                  Quitter l'appel
                </button>
              </div>
              <iframe
                src={activeVideoRoom}
                className="w-full flex-1 border-none bg-[#111b21]"
                allow="camera; microphone; fullscreen; display-capture"
              />
            </div>
          )}

          {/* Call overlay modal */}
          {callState !== "idle" && (
            <div className="absolute top-4 right-4 w-72 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#e9edef] overflow-hidden z-50 flex flex-col items-center p-5 animate-in fade-in zoom-in duration-200">
              <div className="w-16 h-16 rounded-full bg-[#f0f2f5] flex items-center justify-center text-[#111b21] font-bold text-2xl mb-3 shadow-inner">
                {threadName?.[0]?.toUpperCase() || "?"}
              </div>
              <h3 className="font-semibold text-[16px] text-[#111b21] mb-1">{threadName}</h3>
              <p className="text-[#54656f] text-[13px] mb-6">
                {callState === "calling" && "Appel en cours..."}
                {callState === "active" && "Connecté - En ligne"}
                {callState === "error" && "Échec de l'appel"}
              </p>
              {callState === "error" && (
                <p className="text-red-500 text-xs text-center mb-4 bg-red-50 p-2 rounded-lg">{callError}</p>
              )}
              <div className="flex items-center gap-6">
                <button
                  onClick={toggleMute}
                  disabled={callState !== "active"}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-sm",
                    isMuted ? "bg-white text-[#54656f] border border-[#d1d7db]" : "bg-[#f0f2f5] text-[#111b21] hover:bg-[#e9edef]",
                    callState !== "active" && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                <button
                  onClick={handleHangup}
                  className="w-14 h-14 rounded-full bg-[#ea0038] hover:bg-[#d60033] text-white flex items-center justify-center shadow-md transition-transform active:scale-95"
                >
                  <PhoneOff size={24} />
                </button>
              </div>
            </div>
          )}

          {/* Messages area */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
            style={{
              backgroundImage: `url("https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png")`,
              backgroundRepeat: "repeat",
              backgroundSize: "300px",
              opacity: 0.8,
            }}
          >
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="bg-[#ffeecd] text-[#54656f] text-[12.5px] px-4 py-2 rounded-lg shadow-sm text-center max-w-sm">
                  Les messages échangés ici sont chiffrés. Personne en dehors de cette discussion, pas même le réseau, ne peut les lire.
                </p>
              </div>
            ) : (
              messageGroups.map((group, gi) => (
                <div key={gi} className="mb-3">
                  <div className="flex justify-center my-3">
                    <span className="bg-white text-[#54656f] text-[11px] font-medium px-3 py-1.5 rounded-lg shadow-sm">
                      {group.date}
                    </span>
                  </div>
                  {group.msgs.map((msg, mi) => {
                    const isMe = msg.sender === "ai";
                    const msgText = msg.content || "";
                    const isHtml = /\<[a-z][\s\S]*>/i.test(msgText);
                    const time = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                    return (
                      <div key={msg.id || mi} className={cn("flex mb-[2px]", isMe ? "justify-end" : "justify-start")}>
                        <div
                          className={cn(
                            "relative max-w-[65%] rounded-lg shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] px-2 pt-1.5 pb-2 text-[14px] leading-[19px]",
                            isMe
                              ? "bg-[#d9fdd3] text-[#111b21] rounded-tr-none ml-12"
                              : "bg-white text-[#111b21] rounded-tl-none mr-12"
                          )}
                        >
                          {isHtml ? (
                            <div className="text-[14px] prose max-w-full" dangerouslySetInnerHTML={{ __html: msgText }} />
                          ) : (
                            <p className="whitespace-pre-wrap break-words">{linkify(msgText)}</p>
                          )}
                          <div className={cn("flex items-center justify-end gap-1 mt-0.5 -mx-1", "text-[#667781]")}>
                            <span className="text-[10px] leading-[15px]">{time}</span>
                            {isMe && <CheckCheck size={14} className="text-[#53bdeb]" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input bar */}
          <div className="flex items-end gap-3 px-4 py-2.5 bg-[#f0f2f5] shrink-0 min-h-[62px]">
            <div className="flex-1 bg-white rounded-lg border border-[#ffffff] pb-0.5 shadow-sm px-4 py-2 flex items-end gap-2 focus-within:border-[#d1d7db]">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Tapez un message"
                rows={1}
                className="flex-1 bg-transparent text-[15px] text-[#111b21] placeholder-[#8696a0] outline-none resize-none max-h-32 mb-0.5 leading-[20px]"
                style={{ scrollbarWidth: "none" }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className={cn(
                "w-10 h-10 mb-1 rounded-full flex items-center justify-center shrink-0 transition-colors",
                newMessage.trim() && !sending
                  ? "bg-[#00a884] text-white hover:bg-[#008f6f] shadow-sm"
                  : "bg-transparent text-[#8696a0] hover:bg-[#d1d7db]/30"
              )}
            >
              <Send size={18} className={sending ? "opacity-50" : "ml-1"} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
