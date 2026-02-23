# Piano Tracker - Azure Infrastructure

This directory contains Azure Bicep templates for deploying the piano-tracker application infrastructure.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Resource Group                                │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │   Managed    │    │   Storage    │    │   App Service    │  │
│  │   Identity   │───▶│   Account    │◀───│   (Linux/.NET)   │  │
│  └──────────────┘    └──────────────┘    └────────┬─────────┘  │
│         │                                          │            │
│         │            ┌──────────────┐              │            │
│         │            │     App      │◀─────────────┘            │
│         └───────────▶│   Insights   │                           │
│                      └──────┬───────┘                           │
│                             │                                    │
│                      ┌──────▼───────┐                           │
│                      │ Log Analytics│                           │
│                      │  Workspace   │                           │
│                      └──────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

## Structure

```
infra/
├── main.bicep              # Main orchestrator template
├── modules/
│   ├── appService.bicep    # App Service Plan + Web App
│   ├── storage.bicep       # Storage Account + Blob container
│   ├── monitoring.bicep    # Log Analytics + App Insights
│   └── identity.bicep      # User-Assigned Managed Identity
├── parameters/
│   ├── dev.bicepparam      # Development environment settings
│   └── prod.bicepparam     # Production environment settings
└── README.md               # This file
```

## Prerequisites

1. **Azure CLI** installed and authenticated
2. **Azure subscription** with Contributor access
3. **Resource Group** created for deployment

## Quick Deploy

### Development Environment

```bash
# Login to Azure
az login

# Set subscription
az account set --subscription "your-subscription-id"

# Create resource group
az group create --name piano-tracker-dev-rg --location uksouth

# Deploy infrastructure
az deployment group create \
  --resource-group piano-tracker-dev-rg \
  --template-file infra/main.bicep \
  --parameters infra/parameters/dev.bicepparam
```

### Production Environment

```bash
# Create resource group
az group create --name piano-tracker-prod-rg --location uksouth

# Deploy infrastructure
az deployment group create \
  --resource-group piano-tracker-prod-rg \
  --template-file infra/main.bicep \
  --parameters infra/parameters/prod.bicepparam
```

## GitHub Actions Setup

The CI/CD pipeline uses **OIDC (OpenID Connect)** for secure, credential-free authentication to Azure.

### 1. Create Azure AD App Registration

```bash
# Create app registration
az ad app create --display-name "piano-tracker-github-actions"

# Get the app ID
APP_ID=$(az ad app list --display-name "piano-tracker-github-actions" --query "[0].appId" -o tsv)

# Create service principal
az ad sp create --id $APP_ID

# Get object ID of the service principal
SP_OBJECT_ID=$(az ad sp show --id $APP_ID --query "id" -o tsv)
```

### 2. Configure Federated Credentials

```bash
# For main branch deployments
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "github-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:WaywardHayward/piano-tracker:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# For environment-based deployments (production)
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "github-prod-env",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:WaywardHayward/piano-tracker:environment:production",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

### 3. Assign Azure Roles

```bash
# Get subscription ID
SUBSCRIPTION_ID=$(az account show --query "id" -o tsv)

# Assign Contributor role to resource groups
az role assignment create \
  --assignee $SP_OBJECT_ID \
  --role "Contributor" \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/piano-tracker-dev-rg"

az role assignment create \
  --assignee $SP_OBJECT_ID \
  --role "Contributor" \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/piano-tracker-prod-rg"
```

### 4. Configure GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

| Secret | Description |
|--------|-------------|
| `AZURE_CLIENT_ID` | App registration client ID |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |

```bash
# Get the values
echo "AZURE_CLIENT_ID: $APP_ID"
echo "AZURE_TENANT_ID: $(az account show --query 'tenantId' -o tsv)"
echo "AZURE_SUBSCRIPTION_ID: $(az account show --query 'id' -o tsv)"
```

### 5. Configure GitHub Environments

1. Go to repository Settings → Environments
2. Create `production` environment
3. Add protection rules:
   - Required reviewers (recommended)
   - Wait timer (optional, e.g., 5 minutes)

## Resource Naming Convention

Resources follow this naming pattern: `{project}-{environment}-{resource-type}`

| Resource | Dev Name | Prod Name |
|----------|----------|-----------|
| Resource Group | piano-tracker-dev-rg | piano-tracker-prod-rg |
| App Service Plan | piano-tracker-dev-plan | piano-tracker-prod-plan |
| Web App | piano-tracker-dev-app | piano-tracker-prod-app |
| Storage Account | pianotrackerdevst | pianotrackerprodst |
| App Insights | piano-tracker-dev-insights | piano-tracker-prod-insights |
| Log Analytics | piano-tracker-dev-logs | piano-tracker-prod-logs |
| Managed Identity | piano-tracker-dev-identity | piano-tracker-prod-identity |

## Environment Differences

| Setting | Dev | Prod |
|---------|-----|------|
| App Service SKU | B1 (Basic) | P1v3 (Premium) |
| Storage SKU | Standard_LRS | Standard_GRS |
| Log Retention | 30 days | 90 days |
| Always On | Disabled | Enabled |

## Security Features

- ✅ **Managed Identity**: No connection strings or keys in code
- ✅ **HTTPS Only**: All traffic encrypted
- ✅ **TLS 1.2+**: Minimum TLS version enforced
- ✅ **No Shared Keys**: Storage uses RBAC only
- ✅ **FTPS Disabled**: Secure deployment only via CI/CD
- ✅ **Diagnostic Logging**: All logs sent to Log Analytics
- ✅ **OIDC Auth**: No secrets stored in GitHub

## Troubleshooting

### Deployment fails with "Role assignment already exists"

This can happen when redeploying. The deployment is idempotent and should still succeed. If it persists:

```bash
# Delete the role assignment manually
az role assignment delete \
  --assignee <principal-id> \
  --scope <storage-account-resource-id>
```

### App Service not starting

Check the diagnostic logs:

```bash
az webapp log tail --name piano-tracker-dev-app --resource-group piano-tracker-dev-rg
```

### What-if deployment (dry run)

Preview changes before deploying:

```bash
az deployment group what-if \
  --resource-group piano-tracker-dev-rg \
  --template-file infra/main.bicep \
  --parameters infra/parameters/dev.bicepparam
```

## License

MIT License - see [LICENSE](../LICENSE) for details.
