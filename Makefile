.PHONY: dev dev-backend dev-frontend migrate migrations shell user help

dev: ## Start all services
	docker compose up --build

dev-backend: ## Run backend locally
	cd backend && python manage.py runserver

dev-frontend: ## Run frontend locally
	cd frontend && npm run dev

migrate: ## Run Django migrations
	cd backend && python manage.py migrate

migrations: ## Make Django migrations
	cd backend && python manage.py makemigrations

shell: ## Django shell
	cd backend && python manage.py shell

user: ## Create superuser
	cd backend && python manage.py createsuperuser

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
