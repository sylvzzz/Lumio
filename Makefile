FOLDER := $(shell pwd)
VENV = $(FOLDER)/.venv
REQ = requirements.txt
PY = $(VENV)/bin/python
PIP = $(VENV)/bin/pip


install:
		python3 -m venv .venv; cd backend; $(PIP) install -r $(REQ); cd ../frontend; npm install

dev-backend: ## Run backend locally
	cd backend && $(PY) -m uvicorn api:app --reload --host 0.0.0.0 --port 8000

dev-frontend: ## Run frontend locally
	cd frontend && npm run dev

frontend-up:
		cd frontend && docker compose up

frontend-down:
		cd frontend && docker compose down

backend-up:
		cd backend && docker compose up

backend-down:
		cd backend && docker compose up

app:
	docker compose up -d

stop:
	cd frontend; docker compose down; cd ../backend; docker compose down

.PHONY: dev dev-backend dev-frontend frontend-up frontend-down backend-up backend-down app
