# NovaOps API

This API project is not currently used. The frontend queries Dataverse directly.

## Overview

The frontend application connects directly to Microsoft Dataverse using the user's Azure AD token. No backend API is required.

## Architecture

```
React Frontend
    ↓ Queries Dataverse directly (user's token)
Microsoft Dataverse
```

## Setup

No setup required. The frontend uses the `VITE_DATAVERSE_URL` environment variable to connect to Dataverse.

## Environment Variables

The frontend requires:
- `VITE_DATAVERSE_URL` - Full Dataverse API URL (e.g., `https://yourorg.crm.dynamics.com/api/data/v9.2`)

See `ENVIRONMENT_VARIABLES.md` in the root directory for details.
