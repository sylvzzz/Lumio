FOLDER := $(shell pwd)
VENV = $(FOLDER)/.venv
REQ = requirements.txt
PY = $(VENV)/bin/python
PIP = $(VENV)/bin/pip
LUMIO_DATA = $(FOLDER)/lumio/data

install:
	python3 -m venv .venv
	cd backend && $(PIP) install -r $(REQ)
	cd frontend && npm install

data:
	mkdir -p $(LUMIO_DATA)/postgres
	mkdir -p $(LUMIO_DATA)/backend

clean_data:
	sudo rm -rf $(LUMIO_DATA)

app: data
	docker compose up -d --build

restart: data
	docker compose down
	docker compose build --no-cache
	docker compose up -d

stop:
	docker compose down

.PHONY: install dev-backend dev-frontend data clean_data app restart stop