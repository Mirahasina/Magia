import React, { useState, useEffect, useRef, useCallback } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { API_BASE, getAuthHeaders, getAuthHeadersOnly } from "../../../lib/api";
import {
  Calendar, UserCircle, MessageCircle, Clock, Plus, X, Send, Bot, ChevronDown,
  Mail, Smartphone, FileText, User, AlertCircle, CheckCircle2, Upload, Download,
  Table, ArrowRight, Loader2, Search, Pencil, Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { ModalShell } from "../shared/ModalShell";
import { EmptyState } from "../shared/EmptyState";
import { PageSpinner } from "../shared/PageSpinner";


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
  company?: string | null;
  title?: string | null;
  apollo_id?: string | null;
}

interface Agent {
  id: string;
  name: string;
  role: string;
  channels: string[];
  is_deployed: boolean;
}

interface ChannelStatus {
  whatsapp: boolean;
  email: boolean;
  facebook: boolean;
}

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  facebook: "Facebook",
};

function channelAlertMessage(source: string): string {
  const label = CHANNEL_LABELS[source] || source;
  return (
    `${label} n'est pas connecté. ` +
    `Activez ${label} dans Paramètres avant de contacter ce prospect ` +
    `(message manuel ou via un agent de prospection).`
  );
}

function notifyChannelDisconnected(source: string) {
  const label = CHANNEL_LABELS[source] || source;
  toast.error(`${label} n'est pas connecté`, {
    description: `Activez ${label} dans Paramètres avant de contacter ce prospect.`,
  });
}

async function fetchChannelStatus(): Promise<ChannelStatus> {
  const status: ChannelStatus = { whatsapp: false, email: false, facebook: false };
  try {
    const [waRes, emRes, fbRes] = await Promise.all([
      fetch(`${API_BASE}/whatsapp-config/`, { headers: getAuthHeadersOnly() }),
      fetch(`${API_BASE}/email-config/`, { headers: getAuthHeadersOnly() }),
      fetch(`${API_BASE}/facebook-config/`, { headers: getAuthHeadersOnly() }),
    ]);
    if (waRes.ok) {
      const list = await waRes.json();
      status.whatsapp = (Array.isArray(list) ? list : []).some((c: any) => c.is_connected);
    }
    if (emRes.ok) {
      const list = await emRes.json();
      status.email = (Array.isArray(list) ? list : []).some((c: any) => c.is_active || c.is_connected);
    }
    if (fbRes.ok) {
      const list = await fbRes.json();
      status.facebook = (Array.isArray(list) ? list : []).some((c: any) => c.is_connected);
    }
  } catch {
    /* ignore - treat as disconnected */
  }
  return status;
}

function isChannelConnected(channels: ChannelStatus, source: string): boolean {
  if (source === "whatsapp") return channels.whatsapp;
  if (source === "email") return channels.email;
  if (source === "facebook") return channels.facebook;
  return false;
}

/* ─── Kanban config ─── */

const ItemTypes = { CARD: "card" };

const COLUMNS = [
  { id: "new", title: "Nouveau / 1er Contact", color: "bg-blue-50 border-blue-200", dot: "bg-blue-400" },
  { id: "contacted", title: "Contacté", color: "bg-blue-50 border-blue-300", dot: "bg-blue-600" },
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
  onEdit,
  onDelete,
  channels,
}: {
  contact: Contact;
  index: number;
  moveCard: (id: number, status: string) => void;
  onOpenInbox: (contact: Contact) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  channels: ChannelStatus;
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
    ) : contact.source === "facebook" ? (
      <span className="text-[10px] font-bold text-[#1877F2] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">FB</span>
    ) : (
      <span className="text-[10px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded-full">{contact.source}</span>
    );

  const isFacebookProfileUrl =
    contact.source === "facebook" && contact.contact_info.toLowerCase().includes("facebook.com");

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
          <div className="flex items-start justify-between gap-1">
            <h4 className="font-semibold text-gray-800 text-sm truncate">
              {contact.name || contact.contact_info}
              {contact.company && (
                <span className="block text-[10px] font-normal text-gray-400 truncate">{contact.company}</span>
              )}
            </h4>
            <div className="flex items-center gap-0.5 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(contact);
                }}
                className="p-1 rounded-md text-gray-400 hover:text-blue-700 hover:bg-blue-50"
                title="Modifier le prospect"
                aria-label="Modifier le prospect"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(contact);
                }}
                className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"
                title="Supprimer le prospect"
                aria-label="Supprimer le prospect"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
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
      {isFacebookProfileUrl ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.open(contact.contact_info, "_blank", "noopener,noreferrer");
          }}
          className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-400 py-1.5 px-3 rounded-lg transition-all opacity-0 group-hover:opacity-100"
          title="Ouvrir le profil Facebook (envoi Messenger à froid non autorisé par Meta)"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Ouvrir le profil FB
        </button>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isChannelConnected(channels, contact.source)) {
              notifyChannelDisconnected(contact.source);
              return;
            }
            onOpenInbox(contact);
          }}
          className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-400 py-1.5 px-3 rounded-lg transition-all opacity-0 group-hover:opacity-100"
          title="Ouvrir dans la Boîte de réception"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Contacter
        </button>
      )}
    </div>
  );
};

/* ─── KanbanColumn ─── */

const KanbanColumn = ({
  status, title, color, contacts, moveCard, onOpenInbox, onEdit, onDelete, channels,
}: {
  status: string; title: string; color: string; contacts: Contact[];
  moveCard: (id: number, status: string) => void;
  onOpenInbox: (contact: Contact) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  channels: ChannelStatus;
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
      className={`flex-1 flex flex-col min-w-[85vw] sm:min-w-[260px] sm:max-w-[300px] snap-start rounded-2xl border ${color} p-4 transition-all ${
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
            onEdit={onEdit}
            onDelete={onDelete}
            channels={channels}
          />
        ))}
      </div>
    </div>
  );
};

/* ─── Modal Import CSV/Excel ─── */

type ImportStep = 'upload' | 'preview' | 'done';

interface ImportResult {
  created: number;
  skipped: number;
  errors: Array<{ row: number; contact_info: string; error: string }>;
  total_rows: number;
}

function ImportContactsModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const handleFile = (f: File) => {
    const name = f.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      setError('Format non supporté. Utilisez .csv, .xlsx ou .xls');
      return;
    }
    setError('');
    setFile(f);
    setStep('preview');
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/contacts/import_contacts/`, {
        method: 'POST',
        headers: getAuthHeadersOnly(),
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur lors de l\'import.');
        return;
      }
      setResult(data);
      setStep('done');
      onImported();
    } catch (err: any) {
      setError(err.message || 'Erreur réseau.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <ModalShell title="Importer des contacts" onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-900 flex items-center justify-center">
              <Upload className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">Importer des contacts</h2>
              <p className="text-xs text-gray-400">Format CSV ou Excel (.xlsx)</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900/40">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-400 bg-blue-50 scale-[1.01]'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <Table className="w-7 h-7 text-blue-900" />
                </div>
                <p className="font-semibold text-gray-700 mb-1">
                  Glissez votre fichier ici
                </p>
                <p className="text-sm text-gray-400">ou cliquez pour sélectionner</p>
                <p className="text-xs text-gray-300 mt-3">.csv · .xlsx · .xls</p>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Format hint */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-800 mb-2"> Format attendu des colonnes</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { col: 'name', desc: 'Nom du contact', required: false },
                    { col: 'contact_info', desc: 'Numéro ou email', required: true },
                    { col: 'source', desc: 'whatsapp / email / facebook', required: false },
                    { col: 'notes', desc: 'Notes optionnelles', required: false },
                  ].map((c) => (
                    <div key={c.col} className="flex items-center gap-1.5">
                      <code className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${c.required ? 'bg-blue-200 text-blue-800' : 'bg-white text-gray-600 border border-gray-200'}`}>
                        {c.col}
                      </code>
                      <span className="text-[10px] text-gray-500">{c.desc}</span>
                      {c.required && <span className="text-[8px] text-red-500 font-bold">REQUIS</span>}
                    </div>
                  ))}
                </div>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    const csv = 'name,contact_info,source,notes\n"Jean Dupont","+261340000001","whatsapp","Intéressé plan Pro"\n"Marie Martin","marie@email.com","email","Demande de démo"';
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'modele_contacts.csv';
                    a.click();
                  }}
                  className="mt-3 flex items-center gap-1.5 text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  Télécharger le modèle CSV
                </a>
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && file && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <Table className="w-5 h-5 text-blue-900" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} Ko</p>
                </div>
                <button
                  onClick={() => { setFile(null); setStep('upload'); }}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <p className="font-semibold mb-1">✅ Prêt à importer</p>
                <p className="text-xs text-amber-600">
                  Les doublons (même contact_info + source) seront ignorés automatiquement.
                  Colonnes requises : <code className="font-mono bg-amber-100 px-1 rounded">contact_info</code>
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => { setFile(null); setStep('upload'); setError(''); }}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition"
                >
                  Changer de fichier
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="flex-1 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {importing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  {importing ? 'Import en cours...' : 'Lancer l\'import'}
                </button>
              </div>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && result && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="font-bold text-gray-800 text-lg">Import terminé !</h3>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <p className="text-2xl font-bold text-emerald-600">{result.created}</p>
                  <p className="text-xs text-emerald-700 font-medium mt-1">Créés</p>
                </div>
                <div className="text-center p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-2xl font-bold text-amber-600">{result.skipped}</p>
                  <p className="text-xs text-amber-700 font-medium mt-1">Ignorés</p>
                </div>
                <div className="text-center p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="text-2xl font-bold text-gray-600">{result.total_rows}</p>
                  <p className="text-xs text-gray-500 font-medium mt-1">Total lignes</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-red-700 mb-2">{result.errors.length} erreur(s) :</p>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {result.errors.map((e, i) => (
                      <p key={i} className="text-xs text-red-600">
                        Ligne {e.row} ({e.contact_info}) : {e.error}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition"
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}



function EditProspectModal({
  contact,
  onClose,
  onSaved,
}: {
  contact: Contact;
  onClose: () => void;
  onSaved: (contact: Contact) => void;
}) {
  const [form, setForm] = useState({
    name: contact.name || "",
    source: contact.source,
    contact_info: contact.contact_info,
    notes: contact.notes || "",
    company: contact.company || "",
    status: contact.status,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.contact_info.trim()) {
      setError("Le contact (numéro, email ou PSID) est requis.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/contacts/${contact.id}/`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: form.name.trim() || null,
          source: form.source,
          contact_info: form.contact_info.trim(),
          notes: form.notes.trim() || null,
          company: form.company.trim() || null,
          status: form.status,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data === "object" && data
            ? (data.contact_info?.[0] || data.source?.[0] || data.detail || data.error || "Échec de la mise à jour")
            : "Échec de la mise à jour"
        );
      }
      const updated = await res.json();
      onSaved(updated);
      toast.success("Prospect mis à jour");
      onClose();
    } catch (err: any) {
      setError(err?.message || "Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Modifier le prospect" onClose={onClose} className="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4 p-1">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-xl">
            {error}
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            <User className="inline w-3.5 h-3.5 mr-1" />Nom
          </label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30"
            placeholder="Nom du prospect"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Canal</label>
          <div className="flex gap-2">
            {(["whatsapp", "email", "facebook"] as const).map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => setForm({ ...form, source: src })}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition ${
                  form.source === src
                    ? "bg-blue-900 text-white border-blue-900"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {CHANNEL_LABELS[src]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Contact</label>
          <input
            value={form.contact_info}
            onChange={(e) => setForm({ ...form, contact_info: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30"
            placeholder="Numéro, email ou PSID Facebook"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Entreprise</label>
          <input
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30"
            placeholder="Optionnel"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Statut</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as Contact["status"] })}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 bg-white"
          >
            {COLUMNS.map((col) => (
              <option key={col.id} value={col.id}>{col.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 resize-none"
            placeholder="Notes internes…"
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
            Enregistrer
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

interface AddProspectModalProps {
  onClose: () => void;
  onCreated: (contact: Contact) => void;
  onOpenInbox: (contact: Contact) => void;
  agents: Agent[];
  channels: ChannelStatus;
}

function AddProspectModal({ onClose, onCreated, onOpenInbox, agents, channels }: AddProspectModalProps) {
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
    if (!isChannelConnected(channels, form.source)) {
      setError(channelAlertMessage(form.source));
      return;
    }

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
    if (!isChannelConnected(channels, createdContact.source)) {
      setError(channelAlertMessage(createdContact.source));
      return;
    }
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
    <ModalShell title="Nouveau prospect" onClose={onClose} className="max-w-md">
      <div className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-bold text-gray-800">Nouveau Prospect</h2>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900/40">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {!createdContact ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nom */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
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
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
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
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, source: "facebook", contact_info: "" })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-semibold transition-all ${
                      form.source === "facebook"
                    ? "border-blue-400 bg-blue-50 text-blue-900"
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" /> Facebook
                  </button>
                </div>
                {!isChannelConnected(channels, form.source) && (
                  <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-xl">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      {CHANNEL_LABELS[form.source] || form.source} n&apos;est pas connecté.
                      Activez-le dans Paramètres avant de prospecter sur ce canal.
                    </span>
                  </div>
                )}
              </div>

              {/* Contact info */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  {form.source === "whatsapp" ? (
                    <><Smartphone className="inline w-3.5 h-3.5 mr-1" />Numéro WhatsApp</>
                  ) : form.source === "email" ? (
                    <><Mail className="inline w-3.5 h-3.5 mr-1" />Adresse Email</>
                  ) : (
                    <><MessageCircle className="inline w-3.5 h-3.5 mr-1" />PSID Messenger ou URL de profil</>
                  )}
                </label>
                <input
                  type={form.source === "email" ? "email" : "text"}
                  placeholder={
                    form.source === "whatsapp"
                      ? "Ex : 261340000000"
                      : form.source === "email"
                        ? "Ex : prospect@email.com"
                        : "Ex : 1234567890 (PSID) ou https://facebook.com/profil"
                  }
                  value={form.contact_info}
                  onChange={(e) => setForm({ ...form, contact_info: e.target.value })}
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition"
                />
                {form.source === "whatsapp" && (
                  <p className="text-xs text-gray-400 mt-1">Incluez l'indicatif pays (ex : 261 pour Madagascar)</p>
                )}
                {form.source === "facebook" && (
                  <p className="text-xs text-gray-400 mt-1">
                    L'envoi Messenger auto ne fonctionne que si la personne a déjà écrit à votre Page (PSID).
                    Une URL de profil sera à contacter manuellement.
                  </p>
                )}
              </div>

              {/* Notes / Besoins */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
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
                  className="flex-1 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-60"
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
                  onClick={() => {
                    if (!isChannelConnected(channels, createdContact.source)) {
                      setError(channelAlertMessage(createdContact.source));
                      return;
                    }
                    onOpenInbox(createdContact);
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-sm font-semibold transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  Contacter manuellement
                </button>

                {/* Confier à un Agent */}
                <div className="relative" ref={agentPickerRef}>
                  <button
                    onClick={() => {
                      if (!isChannelConnected(channels, createdContact.source)) {
                        setError(channelAlertMessage(createdContact.source));
                        return;
                      }
                      setShowAgentPicker(!showAgentPicker);
                    }}
                    disabled={delegating}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-semibold transition"
                  >
                    {delegating ? (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                    ) : (
                      <Bot className="w-4 h-4 text-blue-900" />
                    )}
                    Confier à un Agent IA
                    <ChevronDown className={`w-4 h-4 transition-transform ${showAgentPicker ? "rotate-180" : ""}`} />
                  </button>

                  {showAgentPicker && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-10">
                      {eligibleAgents.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-400 text-center">
                          Aucun agent déployé sur {CHANNEL_LABELS[createdContact.source] || createdContact.source}.
                        </div>
                      ) : (
                        eligibleAgents.map((agent) => (
                          <button
                            key={agent.id}
                            onClick={() => handleDelegateToAgent(agent)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition text-left border-b last:border-0 border-gray-50"
                          >
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-900 font-bold text-sm shrink-0">
                              {agent.name[0]}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{agent.name}</p>
                              <p className="text-xs text-gray-400">{agent.role}</p>
                            </div>
                            <Send className="w-4 h-4 text-blue-400 ml-auto" />
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
    </ModalShell>
  );
}

/* ─── Main ProspectionView ─── */

interface ProspectSearchJob {
  id: number;
  status: "pending" | "running" | "done" | "failed";
  channels: string;
  max_results: number;
  found_count: number;
  enriched_count: number;
  sent_count: number;
  failed_count: number;
  error: string | null;
  agent_name?: string | null;
  leads?: Array<{
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
    facebook_url: string | null;
    company: string | null;
    status: string;
    skip_reason: string | null;
  }>;
}

function SearchProspectsModal({
  onClose,
  agents,
  channels,
  onJobFinished,
}: {
  onClose: () => void;
  agents: Agent[];
  channels: ChannelStatus;
  onJobFinished: () => void;
}) {
  const deployedAgents = agents.filter((a) => a.is_deployed);
  const [form, setForm] = useState({
    person_titles: "",
    person_locations: "",
    q_organization_keyword_tags: "",
    person_seniorities: "",
    agent_id: deployedAgents[0]?.id || "",
    channels: "both" as "email" | "whatsapp" | "facebook" | "both" | "all",
    max_results: 10,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [job, setJob] = useState<ProspectSearchJob | null>(null);

  useEffect(() => {
    if (!job || job.status === "done" || job.status === "failed") return;
    const t = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/prospect-searches/${job.id}/`, {
          headers: getAuthHeadersOnly(),
        });
        if (!res.ok) return;
        const data: ProspectSearchJob = await res.json();
        setJob(data);
        if (data.status === "done" || data.status === "failed") {
          onJobFinished();
        }
      } catch {
        /* ignore poll errors */
      }
    }, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id, job?.status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.agent_id) {
      setError("Sélectionnez un agent déployé.");
      return;
    }
    if (form.channels === "email" && !channels.email) {
      setError("Email n'est pas connecté. Activez-le dans Paramètres.");
      return;
    }
    if (form.channels === "whatsapp" && !channels.whatsapp) {
      setError("WhatsApp n'est pas connecté. Activez-le dans Paramètres.");
      return;
    }
    if (form.channels === "facebook" && !channels.facebook) {
      setError("Facebook n'est pas connecté. Activez-le dans Paramètres.");
      return;
    }
    if (form.channels === "both" && !channels.email && !channels.whatsapp) {
      setError("Connectez au moins Email ou WhatsApp dans Paramètres.");
      return;
    }
    if (form.channels === "all" && !channels.email && !channels.whatsapp && !channels.facebook) {
      setError("Connectez au moins Email, WhatsApp ou Facebook dans Paramètres.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/prospect-searches/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          agent_id: form.agent_id,
          channels: form.channels,
          max_results: form.max_results,
          filters: {
            person_titles: form.person_titles,
            person_locations: form.person_locations,
            q_organization_keyword_tags: form.q_organization_keyword_tags,
            person_seniorities: form.person_seniorities,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.detail || "Erreur lors du lancement.");
      }
      setJob(data);
    } catch (err: any) {
      setError(err.message || "Erreur réseau.");
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel =
    job?.status === "pending"
      ? "En file d'attente…"
      : job?.status === "running"
        ? "Recherche & envoi en cours…"
        : job?.status === "done"
          ? "Terminé"
          : job?.status === "failed"
            ? "Échec"
            : "";

  return (
    <ModalShell title="Rechercher des prospects" onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-blue-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-900 flex items-center justify-center">
              <Search className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-bold text-gray-800">Rechercher des prospects</h2>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900/40">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {!job ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3 py-2.5 rounded-xl flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Envoi <strong>automatique immédiat</strong> dès qu&apos;un email ou téléphone est trouvé
                  (crédits Apollo consommés · risque WhatsApp si volume élevé).
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Postes</label>
                <input
                  type="text"
                  placeholder="Ex : CEO, Founder, Sales Manager"
                  value={form.person_titles}
                  onChange={(e) => setForm({ ...form, person_titles: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Localisation</label>
                <input
                  type="text"
                  placeholder="Ex : Madagascar, France, Paris"
                  value={form.person_locations}
                  onChange={(e) => setForm({ ...form, person_locations: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mots-clés entreprise</label>
                <input
                  type="text"
                  placeholder="Ex : SaaS, fintech, e-commerce"
                  value={form.q_organization_keyword_tags}
                  onChange={(e) => setForm({ ...form, q_organization_keyword_tags: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Séniorité (optionnel)</label>
                <input
                  type="text"
                  placeholder="Ex : founder, c_suite, vp, director"
                  value={form.person_seniorities}
                  onChange={(e) => setForm({ ...form, person_seniorities: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Agent IA</label>
                <select
                  value={form.agent_id}
                  onChange={(e) => setForm({ ...form, agent_id: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 bg-white"
                >
                  {deployedAgents.length === 0 ? (
                    <option value="">Aucun agent déployé</option>
                  ) : (
                    deployedAgents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} - {a.role}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Canaux</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    ["email", "Email", channels.email],
                    ["whatsapp", "WhatsApp", channels.whatsapp],
                    ["facebook", "Facebook", channels.facebook],
                    ["both", "Email + WA", channels.email || channels.whatsapp],
                    ["all", "Tous", channels.email || channels.whatsapp || channels.facebook],
                  ] as const).map(([value, label, ok]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm({ ...form, channels: value })}
                      className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                        form.channels === value
                          ? "border-blue-400 bg-blue-50 text-blue-900"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      } ${!ok ? "opacity-50" : ""}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {(form.channels === "facebook" || form.channels === "all") && (
                  <p className="mt-2 text-xs text-gray-400">
                    Facebook : les profils trouvés sont ajoutés au CRM pour une prise de contact manuelle
                    (Meta n&apos;autorise pas les messages Messenger à froid).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Max résultats (1-25)
                </label>
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={form.max_results}
                  onChange={(e) =>
                    setForm({ ...form, max_results: Math.min(25, Math.max(1, Number(e.target.value) || 1)) })
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
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
                  disabled={submitting || deployedAgents.length === 0}
                  className="flex-1 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Lancer (envoi auto)
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {job.status === "done" ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                ) : job.status === "failed" ? (
                  <AlertCircle className="w-8 h-8 text-red-500" />
                ) : (
                  <Loader2 className="w-8 h-8 text-blue-900 animate-spin" />
                )}
                <div>
                  <p className="font-semibold text-gray-800">{statusLabel}</p>
                  <p className="text-xs text-gray-500">
                    Trouvés {job.found_count} · Enrichis {job.enriched_count} · Envoyés {job.sent_count}
                    {job.failed_count > 0 ? ` · Échecs ${job.failed_count}` : ""}
                  </p>
                </div>
              </div>

              {job.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-xl">
                  {job.error}
                </div>
              )}

              {job.leads && job.leads.length > 0 && (
                <div className="border border-gray-100 rounded-xl max-h-56 overflow-y-auto divide-y divide-gray-50">
                  {job.leads.map((lead) => (
                    <div key={lead.id} className="px-3 py-2 text-sm">
                      <p className="font-medium text-gray-800">{lead.name || "Sans nom"}</p>
                      <p className="text-xs text-gray-500">
                        {[lead.company, lead.email, lead.phone, lead.facebook_url].filter(Boolean).join(" · ") || "-"}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {lead.status}
                        {lead.skip_reason ? ` - ${lead.skip_reason}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition"
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

interface ProspectionViewProps {
  onOpenInboxWithContact?: (contact: { contact_info: string; name: string; source: string }) => void;
}

export const ProspectionView = ({ onOpenInboxWithContact }: ProspectionViewProps) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [channels, setChannels] = useState<ChannelStatus>({
    whatsapp: false,
    email: false,
    facebook: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  useEffect(() => {
    fetchContacts();
    fetchAgents();
    fetchChannelStatus().then(setChannels);
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

  const handleContactUpdated = (updated: Contact) => {
    setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleDeleteContact = async (contact: Contact) => {
    const label = contact.name || contact.contact_info;
    if (!window.confirm(`Supprimer le prospect « ${label} » du CRM ?`)) return;
    const prev = contacts;
    setContacts((c) => c.filter((x) => x.id !== contact.id));
    try {
      const res = await fetch(`${API_BASE}/contacts/${contact.id}/`, {
        method: "DELETE",
        headers: getAuthHeadersOnly(),
      });
      if (!res.ok) throw new Error("Échec de la suppression");
      toast.success("Prospect supprimé");
    } catch (err: any) {
      setContacts(prev);
      toast.error("Suppression impossible", { description: err?.message });
    }
  };

  if (isLoading) {
    return <PageSpinner label="Chargement des prospects…" />;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="magia-title">Prospection (CRM)</h1>
            <p className="magia-description mt-1">
              Suivez vos prospects · Glissez les cartes pour changer de statut · Contacter nécessite le canal activé (WhatsApp, Email ou Facebook).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                fetchChannelStatus().then(setChannels);
                setShowSearchModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900/40"
            >
              <Search className="w-4 h-4" />
              Rechercher des prospects
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 rounded-xl text-sm font-semibold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900/40"
            >
              <Upload className="w-4 h-4 text-gray-500" />
              Importer CSV/Excel
            </button>
            <button
              onClick={() => {
                fetchChannelStatus().then(setChannels);
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900/40"
            >
              <Plus className="w-4 h-4" />
              Nouveau prospect
            </button>
          </div>
        </div>

        {/* Kanban board */}
        {contacts.length === 0 ? (
          <div className="flex-1 flex items-center justify-center bg-white border border-gray-100 rounded-2xl">
            <EmptyState
              icon={UserCircle}
              title="Aucun prospect pour le moment"
              description="Ajoutez vos premiers prospects manuellement, importez un fichier ou lancez une recherche Apollo."
            >
              <button
                onClick={() => {
                  fetchChannelStatus().then(setChannels);
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-sm font-semibold shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900/40"
              >
                <Plus className="w-4 h-4" />
                Nouveau prospect
              </button>
              <button
                onClick={() => {
                  fetchChannelStatus().then(setChannels);
                  setShowSearchModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 rounded-xl text-sm font-semibold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900/40"
              >
                <Search className="w-4 h-4 text-gray-500" />
                Rechercher des prospects
              </button>
            </EmptyState>
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto pb-4 snap-x snap-mandatory sm:snap-none">
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
                  onEdit={setEditingContact}
                  onDelete={handleDeleteContact}
                  channels={channels}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal Recherche Apollo */}
      {showSearchModal && (
        <SearchProspectsModal
          onClose={() => setShowSearchModal(false)}
          agents={agents}
          channels={channels}
          onJobFinished={fetchContacts}
        />
      )}

      {/* Modal Ajout de prospect */}
      {showAddModal && (
        <AddProspectModal
          onClose={() => setShowAddModal(false)}
          onCreated={handleContactCreated}
          onOpenInbox={(contact) => { handleOpenInbox(contact); setShowAddModal(false); }}
          agents={agents}
          channels={channels}
        />
      )}

      {/* Modal Édition de prospect */}
      {editingContact && (
        <EditProspectModal
          contact={editingContact}
          onClose={() => setEditingContact(null)}
          onSaved={handleContactUpdated}
        />
      )}

      {/* Modal Import CSV/Excel */}
      {showImportModal && (
        <ImportContactsModal
          onClose={() => setShowImportModal(false)}
          onImported={fetchContacts}
        />
      )}
    </DndProvider>
  );
};
