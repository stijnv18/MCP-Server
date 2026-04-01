# Deployment Notes

## Prerequisites

- Clone the repository on the Docker host
- Copy `deploy.env.example` to `.env`
- Fill in the real passwords and API keys in `.env`

## Start Both Services

Run this from the repository root:

```bash
docker compose -p mcp-server up -d --build
```

## Verify The Deployment

Check that both containers are running:

```bash
docker compose -p mcp-server ps
```

Follow the logs for each service:

```bash
docker compose -p mcp-server logs -f mcp-server-kb
docker compose -p mcp-server logs -f mcp-server-kna
```

The startup logs should show:

- service name
- port in use
- database server
- database name
- configured asset and document views

## Endpoints

- KB: `http://<server>:3001/mcp`
- KNA: `http://<server>:3002/mcp`

## If You Need To Rebuild After Changes

```bash
docker compose -p mcp-server up -d --build
```

## If One Service Fails

Inspect the logs for the failing service first:

```bash
docker compose -p mcp-server logs --tail=50 mcp-server-kb
docker compose -p mcp-server logs --tail=50 mcp-server-kna
```