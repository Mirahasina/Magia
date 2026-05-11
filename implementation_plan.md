# AI-Driven CRM & Automated Follow-Ups (Relances Intelligentes)

Ce plan détaille la création d'un CRM Kanban où l'IA gère à la fois **le statut d'avancement** des contacts et **les relances automatiques personnalisées**.

## User Review Required

> [!IMPORTANT]
> Pour réaliser ces "relances intelligentes qui dépendent du contact", voici la stratégie proposée :
> 1. À chaque message envoyé, l'IA décide elle-même **quand** elle doit relancer la personne (ex: dans 24h, 48h, etc.) si elle ne répond pas, en fonction du contexte de la discussion.
> 2. Si le contact répond entre-temps, la relance est annulée.
> 3. L'IA sait si c'est la 1ère, 2ème ou 5ème relance et adapte son discours.
> 4. Un processus tournera en arrière-plan pour envoyer ces relances automatiquement au moment prévu.
> 
> Est-ce que cette mécanique correspond à vos attentes pour les relances ?

## Proposed Changes

### 1. Backend Updates (Database & Logic)

#### [MODIFY] [backend/agents/models.py](file:///home/mirahasina/MAGIA/Magia/backend/agents/models.py)
- **Modèle Contact** :
  - `status` : (Nouveau, Contacté, Intéressé, Prêt, Non intéressé).
  - `followup_count` : Compteur de relances effectuées (0 à 5).
  - `replied_since_last_ai` : Booléen pour savoir si le prospect a répondu.
  - `next_followup_date` : Date et heure prévues pour la prochaine relance (définie par l'IA).

#### [MODIFY] [backend/agents/llm_service.py](file:///home/mirahasina/MAGIA/Magia/backend/agents/llm_service.py)
- **Logique d'analyse (Statuts & Relances)** :
  - Création de `analyze_prospection_context(history)` : Une fois qu'un message est échangé, l'IA analyse la conversation pour définir le statut CRM du contact **ET** suggérer un délai (en heures) pour la prochaine relance si aucune réponse n'est donnée.

#### [NEW] [backend/agents/management/commands/run_followups.py](file:///home/mirahasina/MAGIA/Magia/backend/agents/management/commands/run_followups.py)
- Création d'une commande d'arrière-plan (qui pourra tourner via Cron ou un scheduler) :
  - Vérifie les contacts où `next_followup_date` est dépassée et où `replied_since_last_ai` est faux.
  - Demande à l'agent IA de générer le message de relance approprié (en lui précisant que c'est la relance N).
  - Envoie le message via Unipile (WhatsApp/Email/LinkedIn).

### 2. Frontend Updates (Kanban UI)

#### [NEW] [frontend/src/app/components/views/ProspectionView.tsx](file:///home/mirahasina/MAGIA/Magia/frontend/src/app/components/views/ProspectionView.tsx)
- Création du tableau Kanban (Trello) avec `react-dnd`.
- Les cartes afficheront le prospect, le statut défini par l'IA, et **un indicateur de relance** (ex: "Prochaine relance le 12/05").
- Déplacement manuel autorisé pour forcer un statut.

#### [MODIFY] [frontend/src/app/components/Sidebar.tsx](file:///home/mirahasina/MAGIA/Magia/frontend/src/app/components/Sidebar.tsx) & [Dashboard.tsx](file:///home/mirahasina/MAGIA/Magia/frontend/src/app/components/Dashboard.tsx)
- Ajout de la vue "Prospection (CRM)" dans le tableau de bord.

## Verification Plan
### Automated Tests
- Simuler la fonction d'analyse de l'IA pour vérifier qu'elle planifie bien une `next_followup_date` (ex: +48h).
- Exécuter la commande `run_followups` manuellement pour s'assurer qu'elle déclenche bien l'envoi d'un message si la date est atteinte.

### Manual Verification
- Démarrer une conversation, ne pas répondre.
- Avancer le temps (en base de données) pour simuler l'expiration du délai.
- Vérifier que le message de relance est bien généré et envoyé automatiquement.
- Vérifier que le statut du prospect sur le tableau Kanban se met à jour en temps réel.
