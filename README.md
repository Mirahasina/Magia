# MAGIA

Plateforme SaaS de création et de déploiement d'agents IA multi-canaux (WhatsApp,
Email/Gmail, LinkedIn, Facebook) pour la prospection et le support client : base de
connaissances (RAG), multi-LLM, équipes, facturation Stripe et back-office.

- **Backend** : Django 5 + Django REST Framework (PostgreSQL, JWT, FAISS/LangChain, multi-LLM, Stripe, OAuth)
- **Frontend** : React 18 + Vite + TypeScript + Tailwind + MUI
- **Microservice WhatsApp** : Node.js / Express

---

## Prérequis

- Python 3.10+
- Node.js 20+
- PostgreSQL 14+ (ou Docker)

---

## Démarrage rapide (Docker)

```bash
cp .env.example .env   # puis remplissez les valeurs
docker-compose up --build
```

- Frontend : http://localhost:5173
- Backend : http://localhost:8000
- WhatsApp service : http://localhost:3001 (démarré automatiquement depuis Paramètres → Connecter WhatsApp)

---

## Installation manuelle

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate            # Windows : venv\Scripts\activate
pip install -r requirements.txt     # ou requirements-dev.txt pour le lint
cp ../.env.example .env              # configurez DATABASE_URL, clés API, etc.
python manage.py migrate
python manage.py runserver
```

L'API démarre sur http://localhost:8000.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local           # VITE_GOOGLE_CLIENT_ID, VITE_STRIPE_PUBLISHABLE_KEY
npm run dev
```

Le frontend démarre sur http://localhost:5173 et proxifie `/api` vers le backend.

---

## Variables d'environnement

- **Backend** : voir [`.env.example`](.env.example) (à copier en `backend/.env`).
  En production, définissez `DJANGO_ENV=production` ; `SECRET_KEY` devient alors
  obligatoire.
- **Frontend** : voir [`frontend/.env.example`](frontend/.env.example) (à copier
  en `frontend/.env.local`). Seules les variables publiques préfixées `VITE_` y
  sont autorisées.

### Intégrations canaux (Paramètres)

| Variable | Rôle |
| --- | --- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | Connexion Gmail en un clic (OAuth → `…/api/email-config/oauth2_callback/`) |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` / `FACEBOOK_VERIFY_TOKEN` | Connexion Pages Messenger ; URI de redirection front : `/?facebook_callback=true&view=integration` |
| `APOLLO_API_KEY` / `APOLLO_WEBHOOK_SECRET` / `APOLLO_WEBHOOK_BASE_URL` | Recherche de prospects B2B (Prospection → Rechercher) ; webhook téléphone : `…/api/webhooks/apollo/phone/` |

Sans `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET`, le bouton Facebook affiche une erreur explicite - créez une app Meta (Facebook Login + Pages Messaging) puis redémarrez le backend.

### Recherche de prospects (Apollo)

Dans **Prospection → Rechercher des prospects** : Magia interroge Apollo, enrichit emails/téléphones, crée les contacts CRM et **envoie automatiquement** via l’agent choisi (Email et/ou WhatsApp).

1. Créez une clé API Apollo (master) et mettez `APOLLO_API_KEY` dans `backend/.env`
2. Pour WhatsApp (révélation téléphone async) : exposez le backend (ngrok) et définissez `APOLLO_WEBHOOK_BASE_URL=https://votre-tunnel` + `APOLLO_WEBHOOK_SECRET`
3. Connectez Email et/ou WhatsApp dans Paramètres, déployez un agent sur ces canaux
4. Lancez une recherche (max 25) - l’envoi part dès qu’un email/téléphone est disponible

> Les crédits Apollo sont consommés à chaque search/enrich. WhatsApp via Baileys reste non officiel Meta : limitez les volumes.

#### Erreur Google `401: invalid_client` / « OAuth client was not found »

Le `GOOGLE_CLIENT_ID` n’existe plus (ou est incorrect) dans Google Cloud. Corrigez ainsi :

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → **Créer des identifiants** → **ID client OAuth** → type **Application Web**
2. Origines JavaScript autorisées : `http://localhost:5173`
3. URI de redirection autorisées : `http://localhost:8000/api/email-config/oauth2_callback/`
4. Activez l’API **Gmail** (APIs & Services → Library)
5. Copiez le Client ID + Secret dans `backend/.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) et le même Client ID dans `frontend/.env.local` (`VITE_GOOGLE_CLIENT_ID`)
6. Mettez le secret entre guillemets s’il contient `/` : `GOOGLE_CLIENT_SECRET="…"`
7. Redémarrez backend **et** frontend (`vite` lit `.env.local` au démarrage)

---

## Commandes de développement

### Backend (`cd backend`, venv activé)

| Commande | Description |
| --- | --- |
| `pytest` | Lance la suite de tests (SQLite en mémoire, voir `pytest.ini`) |
| `ruff check .` | Linting Python |
| `ruff check . --fix` | Linting + corrections automatiques |
| `python manage.py check` | Vérification de configuration Django |
| `python manage.py run_followups` | Relances CRM dues (aussi via scheduler / service Docker `followups`) |

> Le test d'intégration RAG télécharge le modèle d'embeddings
> `all-MiniLM-L6-v2` au premier lancement. Il est automatiquement ignoré si le
> modèle n'est pas disponible (environnement hors-ligne).

### Frontend (`cd frontend`)

| Commande | Description |
| --- | --- |
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | Type-check (`tsc`) puis build de production |
| `npm run typecheck` | Vérification de types uniquement |
| `npm run lint` | ESLint |
| `npm test` | Tests Vitest |

---

## Intégration continue

La CI GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml))
exécute, sur chaque push et pull request :

- **Backend** : `ruff check`, `manage.py check`, `pytest`
- **Frontend** : `lint`, `typecheck`, `test`, `build`

---

## Déploiement

- **Backend** : Railway (`railway.toml`, `backend/Dockerfile`)
- **Frontend** : Vercel (`frontend/vercel.json`)
