.PHONY: generate build run test e2e up down lint tidy docker

# Generate Ent ORM and gqlgen code
generate:
	go generate ./internal/ent/...

# Build the binary
build:
	mkdir -p bin
	go build -o bin/drivebase ./cmd/drivebase

# Run locally (requires .env or env vars)
run: build
	./bin/drivebase

# Unit tests (excludes e2e — use make e2e for those)
test:
	go test ./internal/... -count=1 -race

# E2E tests (requires running docker-compose stack)
e2e:
	go test ./e2e/... -count=1 -timeout 120s

# Start local dev stack (infra only — run the app with: make run)
up:
	docker compose up -d postgres redis minio
	@echo "Waiting for services..."
	@docker compose exec postgres pg_isready -U drivebase -t 30 > /dev/null 2>&1 || true
	@echo "Dev stack ready."

# Stop local dev stack
down:
	docker compose down

# Lint
lint:
	golangci-lint run ./...

# Tidy dependencies
tidy:
	go mod tidy

# Build Docker image
docker:
	docker build -t drivebase:latest .
