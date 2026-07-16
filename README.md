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
- WhatsApp service : http://localhost:3001

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
