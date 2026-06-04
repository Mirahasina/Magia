import React, { useState, useEffect, useRef } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { API_BASE, getAuthHeaders, getAuthHeadersOnly } from "../../../lib/api";
import {
  Calendar, UserCircle, MessageCircle, Clock, Plus, X, Send, Bot, ChevronDown,
  Mail, Smartphone, FileText, User, AlertCircle, CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

/* ─── Types ─── */

interface Contact {
  id: number;
  contact_info: string;
  name: string | null;
  source: string;
  status: "new" | "contacted" | "interested" | "ready" | "no";
  followup_count: number;
  next_followup_date: string | null;
  notes?: string | null;
}

interface Agent {
  id: string;
  name: string;
  role: string;
  channels: string[];
  is_deployed: boolean;
}

/* ─── Kanban config ─── */

const ItemTypes = { CARD: "card" };

const COLUMNS = [
  { id: "new", title: "Nouveau / 1er Contact", color: "bg-blue-50 border-blue-200", dot: "bg-blue-400" },
  { id: "contacted", title: "Contacté", color: "bg-purple-50 border-purple-200", dot: "bg-purple-400" },
  { id: "interested", title: "Intéressé", color: "bg-amber-50 border-amber-200", dot: "bg-amber-400" },
  { id: "ready", title: "Prêt", color: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-400" },
  { id: "no", title: "Non intéressé", color: "bg-slate-50 border-slate-200", dot: "bg-slate-400" },
];

/* ─── ContactCard ─── */

const ContactCard = ({
  contact,
  index,
  moveCard,
  onOpenInbox,
}: {
  contact: Contact;
  index: number;
  moveCard: (id: number, status: string) => void;
  onOpenInbox: (contact: Contact) => void;
}) => {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.CARD,
    item: { id: contact.id, status: contact.status },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const sourceIcon =
    contact.source === "whatsapp" ? (
      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">WA</span>
    ) : contact.source === "email" ? (
      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">Email</span>
    ) : (
      <span className="text-[10px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded-full">{contact.source}</span>
    );

  return (
    <div
      ref={drag as any}
      className={`p-4 mb-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group ${
        isDragging ? "opacity-50 scale-95" : "opacity-100"
      }`}
    >
      <div className="flex items-start gap-3 mb-2">
        <UserCircle className="w-8 h-8 text-gray-300 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-800 text-sm truncate">
            {contact.name || contact.contact_info}
          </h4>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {sourceIcon}
            {contact.notes && (
              <span className="text-[10px] text-gray-400 italic truncate max-w-[120px]" title={contact.notes}>
                {contact.notes}
              </span>
            )}
          </div>
        </div>
      </div>

      {contact.next_followup_date && !["ready", "no"].includes(contact.status) && (
        <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-blue-600 bg-blue-50 py-1.5 px-2.5 rounded-md">
          <Clock className="w-3.5 h-3.5" />
          <span>Relance : {format(new Date(contact.next_followup_date), "dd MMM 'à' HH:mm", { locale: fr })}</span>
        </div>
      )}

      {contact.followup_count > 0 && (
        <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
          <MessageCircle className="w-3 h-3" />
          {contact.followup_count} relance{contact.followup_count > 1 ? "s" : ""} envoyée{contact.followup_count > 1 ? "s" : ""}
        </div>
      )}

      {/* Bouton Contacter */}
      <button
        onClick={(e) => { e.stopPropagation(); onOpenInbox(contact); }}
        className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-400 py-1.5 px-3 rounded-lg transition-all opacity-0 group-hover:opacity-100"
        title="Ouvrir dans la Boîte de réception"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        Contacter
      </button>
    </div>
  );
};

/* ─── KanbanColumn ─── */

const KanbanColumn = ({
  status, title, color, contacts, moveCard, onOpenInbox,
}: {
  status: string; title: string; color: string; contacts: Contact[];
  moveCard: (id: number, status: string) => void;
  onOpenInbox: (contact: Contact) => void;
}) => {
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.CARD,
    drop: (item: { id: number; status: string }) => {
      if (item.status !== status) moveCard(item.id, status);
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  return (
    <div
      ref={drop as any}
      className={`flex-1 flex flex-col min-w-[260px] max-w-[300px] rounded-2xl border ${color} p-4 transition-all ${
        isOver ? "ring-2 ring-blue-400 ring-offset-2 scale-[1.01]" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-700 text-sm">{title}</h3>
        <span className="bg-white text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
          {contacts.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto min-h-[150px]">
        {contacts.map((contact, index) => (
          <ContactCard
            key={contact.id}
            index={index}
            contact={contact}
            moveCard={moveCard}
            onOpenInbox={onOpenInbox}
          />
        ))}
      </div>
    </div>
  );
};

/* ─── Modal Ajout Prospect ─── */

interface AddProspectModalProps {
  onClose: () => void;
  onCreated: (contact: Contact) => void;
  onOpenInbox: (contact: Contact) => void;
  agents: Agent[];
}

function AddProspectModal({ onClose, onCreated, onOpenInbox, agents }: AddProspectModalProps) {
  const [form, setForm] = useState({
    name: "",
    source: "whatsapp",
    contact_info: "",
    notes: "",
    status: "new",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdContact, setCreatedContact] = useState<Contact | null>(null);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [delegating, setDelegating] = useState(false);
  const [delegateSuccess, setDelegateSuccess] = useState("");
  const agentPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (agentPickerRef.current && !agentPickerRef.current.contains(e.target as Node)) {
        setShowAgentPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.contact_info.trim()) { setError("Le contact (numéro ou email) est requis."); return; }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/contacts/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || JSON.stringify(d));
      }
      const data: Contact = await res.json();
      setCreatedContact(data);
      onCreated(data);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelegateToAgent = async (agent: Agent) => {
    if (!createdContact) return;
    setDelegating(true);
    setDelegateSuccess("");
    try {
      const res = await fetch(`${API_BASE}/contacts/${createdContact.id}/contact_via_agent/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ agent_id: agent.id }),
      });
      const d = await res.json();
      if (res.ok) {
        setDelegateSuccess(`✅ ${agent.name} a envoyé un message d'introduction !`);
        setShowAgentPicker(false);
      } else {
        setError(d.error || "Erreur lors de la délégation.");
      }
    } catch (err: any) {
      setError(err.message || "Erreur réseau.");
    } finally {
      setDelegating(false);
    }
  };

  const eligibleAgents = agents.filter(
    (a) =>
      a.is_deployed &&
      a.channels?.some((c) => c.toLowerCase() === form.source)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-bold text-gray-800">Nouveau Prospect</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {!createdContact ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nom */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                  <User className="inline w-3.5 h-3.5 mr-1" />Nom du prospect
                </label>
                <input
                  type="text"
                  placeholder="Ex : Marie Dupont"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition"
                />
              </div>

              {/* Canal */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                  Canal de contact
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, source: "whatsapp", contact_info: "" })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all ${
                      form.source === "whatsapp"
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    <Smartphone className="w-4 h-4" /> WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, source: "email", contact_info: "" })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all ${
                      form.source === "email"
                        ? "border-blue-400 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    <Mail className="w-4 h-4" /> Email
                  </button>
                </div>
              </div>

              {/* Contact info */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                  {form.source === "whatsapp" ? (
                    <><Smartphone className="inline w-3.5 h-3.5 mr-1" />Numéro WhatsApp</>
                  ) : (
                    <><Mail className="inline w-3.5 h-3.5 mr-1" />Adresse Email</>
                  )}
                </label>
                <input
                  type={form.source === "email" ? "email" : "text"}
                  placeholder={form.source === "whatsapp" ? "Ex : 261340000000" : "Ex : prospect@email.com"}
                  value={form.contact_info}
                  onChange={(e) => setForm({ ...form, contact_info: e.target.value })}
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition"
                />
                {form.source === "whatsapp" && (
                  <p className="text-xs text-gray-400 mt-1">Incluez l'indicatif pays (ex : 261 pour Madagascar)</p>
                )}
              </div>

              {/* Notes / Besoins */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
                  <FileText className="inline w-3.5 h-3.5 mr-1" />Notes / Besoins
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex : Intéressé par le plan Pro, veut automatiser son SAV..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition resize-none"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Créer le prospect
                </button>
              </div>
            </form>
          ) : (
            /* ── Prospect créé : options de contact ── */
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              </div>
              <h3 className="font-bold text-gray-800 mb-1">Prospect ajouté !</h3>
              <p className="text-sm text-gray-500 mb-6">
                <span className="font-medium text-gray-700">{createdContact.name || createdContact.contact_info}</span> a été ajouté dans votre CRM.
              </p>

              {delegateSuccess && (
                <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-3 py-2 rounded-xl">
                  {delegateSuccess}
                </div>
              )}
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-xl">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2">
                {/* Contacter manuellement */}
                <button
                  onClick={() => { onOpenInbox(createdContact); onClose(); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  Contacter manuellement
                </button>

                {/* Confier à un Agent */}
                <div className="relative" ref={agentPickerRef}>
                  <button
                    onClick={() => setShowAgentPicker(!showAgentPicker)}
                    disabled={delegating}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-semibold transition"
                  >
                    {delegating ? (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                    ) : (
                      <Bot className="w-4 h-4 text-indigo-500" />
                    )}
                    Confier à un Agent IA
                    <ChevronDown className={`w-4 h-4 transition-transform ${showAgentPicker ? "rotate-180" : ""}`} />
                  </button>

                  {showAgentPicker && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-10">
                      {eligibleAgents.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-400 text-center">
                          Aucun agent déployé sur {createdContact.source === "whatsapp" ? "WhatsApp" : "Email"}.
                        </div>
                      ) : (
                        eligibleAgents.map((agent) => (
                          <button
                            key={agent.id}
                            onClick={() => handleDelegateToAgent(agent)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 transition text-left border-b last:border-0 border-gray-50"
                          >
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                              {agent.name[0]}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{agent.name}</p>
                              <p className="text-xs text-gray-400">{agent.role}</p>
                            </div>
                            <Send className="w-4 h-4 text-indigo-400 ml-auto" />
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={onClose}
                  className="w-full py-2 text-gray-400 text-sm hover:text-gray-600 transition"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main ProspectionView ─── */

interface ProspectionViewProps {
  onOpenInboxWithContact?: (contact: { contact_info: string; name: string; source: string }) => void;
}

export const ProspectionView = ({ onOpenInboxWithContact }: ProspectionViewProps) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchContacts();
    fetchAgents();
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await fetch(`${API_BASE}/contacts/`, { headers: getAuthHeadersOnly() });
      if (res.ok) setContacts(await res.json());
    } catch (error) {
      console.error("Failed to fetch contacts", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${API_BASE}/agents/`, { headers: getAuthHeadersOnly() });
      if (res.ok) setAgents(await res.json());
    } catch {}
  };

  const moveCard = async (id: number, newStatus: string) => {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, status: newStatus as any } : c)));
    try {
      await fetch(`${API_BASE}/contacts/${id}/`, {
        method: "PATCH",
        headers: { ...getAuthHeadersOnly(), "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      fetchContacts();
    }
  };

  const handleOpenInbox = (contact: Contact) => {
    onOpenInboxWithContact?.({
      contact_info: contact.contact_info,
      name: contact.name || contact.contact_info,
      source: contact.source,
    });
  };

  const handleContactCreated = (newContact: Contact) => {
    setContacts((prev) => [newContact, ...prev]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Prospection (CRM)</h1>
            <p className="text-gray-500 mt-1">
              Suivez vos prospects · Glissez les cartes pour changer de statut · Cliquez sur une carte pour contacter.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            Nouveau prospect
          </button>
        </div>

        {/* Kanban board */}
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex h-full gap-4 px-1">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                status={col.id}
                title={col.title}
                color={col.color}
                contacts={contacts.filter((c) => c.status === col.id)}
                moveCard={moveCard}
                onOpenInbox={handleOpenInbox}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Modal Ajout de prospect */}
      {showAddModal && (
        <AddProspectModal
          onClose={() => setShowAddModal(false)}
          onCreated={handleContactCreated}
          onOpenInbox={(contact) => { handleOpenInbox(contact); setShowAddModal(false); }}
          agents={agents}
        />
      )}
    </DndProvider>
  );
};
