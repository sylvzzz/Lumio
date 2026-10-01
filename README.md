# Lumio

Your personal AI workspace - notes, documents, emails, and calendar, all in one place with an intelligent RAG powered AI assistant, called Lumio.

#### Note: this is a personal project and is still in development, you are welcome to use, test, or if your intersted contribute and submit a PR!

Lumio brings your productivity apps together into one clean, Apple-inspired workspace. It centralizes notes, documents, emails, and calendar, and pairs them with an AI assistant that answers questions, summarizes, and keeps you on top of your day.

[Watch Lumio](https://www.dropbox.com/scl/fi/l4c3gdjjbclk0aoa62q3g/lumio.mp4?rlkey=l9rhpuobibq21vve91gtxp108&st=psavdft0&raw=1)

## Screenshots

<br>
<img src="dark.png">
<br>
<img src="light.png">
<br>

## Prerequisites

| Requirement | Version | Needed for | Install |
|---|---|---|---|
| Git | any | Cloning the repo | [git-scm.com](https://git-scm.com/downloads) |
| [Docker](https://docs.docker.com/engine/install/) + [Docker Compose](https://docs.docker.com/compose/install/) | 24 / 2.x | Recommended setup (Postgres + backend + frontend) | see links |
| [PostgreSQL](https://www.postgresql.org/download/) (with [pgvector](https://github.com/pgvector/pgvector#installation)) | 16 | Database for local development | see links |
| Python | 3.11 | Local backend development | [python.org](https://www.python.org/downloads/) |
| Node.js + npm | 24 / 10 | Local frontend development | [nodejs.org](https://nodejs.org/) |
| Make | any | Convenient shortcuts (`make dev`) | `apt install make` / [gnu.org](https://www.gnu.org/software/make/) |

## Installation

```bash
git clone https://github.com/sylvzzz/Lumio.git
cd Lumio
```

### Docker (recommended)

Installation is handled entirely by Docker — nothing to install manually on your host.

```bash
make dev
```

### Local development (no Docker)

You'll need a running PostgreSQL 16 instance with the [pgvector](https://github.com/pgvector/pgvector#installation) extension. The easiest way is to run just the database from the repo's compose file:

```bash
docker compose up -d db
```

The `db` service creates the `lumio` database with user `lumio` and password `lumio`, which already matches `backend/.env`. Then install dependencies:

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Then follow the setup in [Quick Start](#quick-start).

## Quick Start

### 1. Configure

```bash
cd backend
cp .env.example .env
```

Set `DJANGO_SECRET_KEY` to a random value, `GROQ_API_KEY` to your free chat key from [console.groq.com/keys](https://console.groq.com/keys), and `NVIDIA_API_KEY` to your free embedding key from [build.nvidia.com](https://build.nvidia.com). AI features are skipped when the relevant key is empty.

### 2. Run

#### Docker (recommended)

```bash
make dev
```

This builds and starts Postgres, the Django backend, and the React frontend. It reads your `backend/.env` automatically. Then open:

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000

### 3. Local development (without Docker)

```bash
# Run the Django backend
make dev-backend

# In another terminal, run the React frontend
make dev-frontend
```

Migrations: `make migrate` · Create a superuser: `make user`
## Documentation

- [Product Overview](PRODUCT.md) — Vision, design, tech stack
- [Features](docs/FEATURES.md) — What's in v1.0 and beyond
- [Architecture](docs/ARCHITECTURE.md) — System design and pipeline
- [Data Model](docs/DATA_MODEL.md) — Database schema
- [Roadmap](docs/ROADMAP.md) — Build phases
