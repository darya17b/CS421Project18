# Place at: repo root (Dockerfile.backend)
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app
COPY code/Frontend/package.json code/Frontend/package-lock.json ./
RUN npm ci
COPY code/Frontend/ .
RUN npm run build

# Stage 2: Build backend
FROM golang:1.25-alpine AS backend-builder

RUN apk add --no-cache gcc musl-dev

WORKDIR /build
COPY code/backend/VCCwebsite/ .
RUN go mod download
RUN CGO_ENABLED=1 GOOS=linux go build -o server ./cmd/service/main.go

# Stage 3: Runtime image
FROM alpine:3.19

WORKDIR /app

# Copy binary
COPY --from=backend-builder /build/server .

# Copy SQLite schema and seed db
COPY --from=backend-builder /build/internal/actorDB/actor_schema.sql ./internal/actorDB/actor_schema.sql
COPY --from=backend-builder /build/internal/actorDB/actor.db ./data/actor.db

# Copy built frontend directly into the image — no volume needed
COPY --from=frontend-builder /app/dist ./static

RUN mkdir -p /app/data

EXPOSE 8080

CMD ["./server"]
