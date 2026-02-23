IMAGE_NAME ?= drivebase-app
IMAGE_TAG ?= latest
DOCKERFILE ?= Dockerfile

.PHONY: help build build-no-cache

help:
	@echo "Targets:"
	@echo "  make build            Build Docker image ($(IMAGE_NAME):$(IMAGE_TAG))"
	@echo "  make build-no-cache   Build Docker image without cache"
	@echo ""
	@echo "Overrides:"
	@echo "  IMAGE_NAME=your-image IMAGE_TAG=your-tag DOCKERFILE=path/to/Dockerfile"

build:
	docker build -f $(DOCKERFILE) -t $(IMAGE_NAME):$(IMAGE_TAG) .

build-no-cache:
	docker build --no-cache -f $(DOCKERFILE) -t $(IMAGE_NAME):$(IMAGE_TAG) .

up:
	docker compose up -d redis db

down-v:
	docker compose down -v