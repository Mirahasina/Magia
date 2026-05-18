import React, { useState, useEffect } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { API_BASE, getAuthHeadersOnly } from "../../../lib/api";
import { Calendar, UserCircle, MessageCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Contact {
  id: number;
  contact_info: string;
  name: string | null;
  source: string;
  status: 'new' | 'contacted' | 'interested' | 'ready' | 'no';
  followup_count: number;
  next_followup_date: string | null;
}

const ItemTypes = {
  CARD: "card",
};

const COLUMNS = [
  { id: "new", title: "Nouveau / 1er Contact", color: "bg-blue-50 border-blue-200" },
  { id: "contacted", title: "Contacté", color: "bg-purple-50 border-purple-200" },
  { id: "interested", title: "Intéressé", color: "bg-amber-50 border-amber-200" },
  { id: "ready", title: "Prêt", color: "bg-emerald-50 border-emerald-200" },
  { id: "no", title: "Non intéressé", color: "bg-slate-50 border-slate-200" },
];

const ContactCard = ({ contact, index, moveCard }: { contact: Contact; index: number; moveCard: (id: number, status: string) => void }) => {
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.CARD,
    item: { id: contact.id, status: contact.status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag as any}
      className={`p-4 mb-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50" : "opacity-100"
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <UserCircle className="w-8 h-8 text-gray-400" />
        <div>
          <h4 className="font-semibold text-gray-800 text-sm">{contact.name || contact.contact_info}</h4>
          <span className="text-xs text-gray-500 uppercase tracking-wider">{contact.source}</span>
        </div>
      </div>
      
      {contact.next_followup_date && !['ready', 'no'].includes(contact.status) && (
        <div className="flex items-center gap-1.5 mt-3 text-xs font-medium text-blue-600 bg-blue-50 py-1.5 px-2.5 rounded-md">
          <Clock className="w-3.5 h-3.5" />
          <span>Relance: {format(new Date(contact.next_followup_date), "dd MMM 'à' HH:mm", { locale: fr })}</span>
        </div>
      )}
      
      {contact.followup_count > 0 && (
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
          <MessageCircle className="w-3 h-3" />
          {contact.followup_count} relance{contact.followup_count > 1 ? 's' : ''} envoyée{contact.followup_count > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

const KanbanColumn = ({ status, title, color, contacts, moveCard }: { status: string; title: string; color: string; contacts: Contact[]; moveCard: (id: number, status: string) => void }) => {
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.CARD,
    drop: (item: { id: number; status: string }) => {
      if (item.status !== status) {
        moveCard(item.id, status);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div
      ref={drop as any}
      className={`flex-1 flex flex-col min-w-[280px] max-w-[320px] rounded-2xl border ${color} p-4 transition-colors ${
        isOver ? "ring-2 ring-blue-400 ring-offset-2" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-700">{title}</h3>
        <span className="bg-white text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
          {contacts.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto min-h-[150px]">
        {contacts.map((contact, index) => (
          <ContactCard key={contact.id} index={index} contact={contact} moveCard={moveCard} />
        ))}
      </div>
    </div>
  );
};

export const ProspectionView = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await fetch(`${API_BASE}/contacts/`, { headers: getAuthHeadersOnly() });
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (error) {
      console.error("Failed to fetch contacts", error);
    } finally {
      setIsLoading(false);
    }
  };

  const moveCard = async (id: number, newStatus: string) => {
    // Optimistic update
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus as any } : c))
    );

    try {
      const contactToUpdate = contacts.find(c => c.id === id);
      if (!contactToUpdate) return;
      
      await fetch(`${API_BASE}/contacts/${id}/`, {
        method: "PATCH",
        headers: {
          ...getAuthHeadersOnly(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (error) {
      console.error("Failed to update contact status", error);
      // Revert on error
      fetchContacts();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full flex flex-col">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Prospection (CRM)</h1>
            <p className="text-gray-500 mt-1">Suivez vos prospects et laissez l'IA gérer les relances.</p>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex h-full gap-6 px-1">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                status={col.id}
                title={col.title}
                color={col.color}
                contacts={contacts.filter((c) => c.status === col.id)}
                moveCard={moveCard}
              />
            ))}
          </div>
        </div>
      </div>
    </DndProvider>
  );
};
