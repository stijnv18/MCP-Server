# Deployment Notes

## Prerequisites

- Clone the repository on the Docker host
- Copy `deploy.env.example` to `.env`
- Fill in the real passwords and API keys in `.env`

## Validate The Compose Config

Before starting the services, render the final Compose config and confirm the KB and KNA environment values look correct:

```bash
docker compose --env-file .env -p mcp-server config
```

Verify these values in the output:

- KB uses `ASSET_DB=BC_VLTS_DATA` and `ASSET_VIEW=BCAssetPropertiesViewByNameBCE`
- KNA uses `ASSET_DB=KNA_VLTS_DATA` and `ASSET_VIEW=KNA_AssetPropertiesViewByNameBCE`
- KB uses `DOCUMENT_DB=AIM_KANEKA`
- KNA uses `DOCUMENT_DB=AIM_KNA`

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