FOLDER := $(shell pwd)
VENV = $(FOLDER)/.venv
REQ = requirements.txt
PY = $(VENV)/bin/python
PIP = $(VENV)/bin/pip


install:
		python3 -m venv .venv; cd backend; $(PIP) install -r $(REQ); cd ../frontend; npm install

dev: ## Start all services
	docker compose up --build

dev-backend: ## Run backend locally
	cd backend && $(PY) -m uvicorn api:app --reload --host 0.0.0.0 --port 8000

dev-frontend: ## Run frontend locally
	cd frontend && npm run dev


.PHONY: dev dev-backend dev-frontend migrate migrations shell user help