// Main orchestrator for piano-tracker infrastructure
// Deploys all resources in the correct dependency order

targetScope = 'resourceGroup'

@description('Environment name (dev, prod)')
@allowed(['dev', 'prod'])
param environment string

@description('Location for resources')
param location string = resourceGroup().location

@description('Project name')
param projectName string = 'piano-tracker'

@description('Owner tag')
param owner string = 'WaywardHayward'

@description('App Service Plan SKU')
@allowed(['B1', 'B2', 'B3', 'S1', 'S2', 'S3', 'P1v3', 'P2v3', 'P3v3'])
param appServicePlanSku string = 'B1'

@description('Storage account SKU')
@allowed(['Standard_LRS', 'Standard_GRS', 'Standard_RAGRS', 'Standard_ZRS', 'Premium_LRS'])
param storageSku string = 'Standard_LRS'

@description('Log Analytics retention in days')
@minValue(30)
@maxValue(730)
param logRetentionDays int = 30

// ============================================================================
// Module Deployments
// ============================================================================

// 1. User-Assigned Managed Identity (no dependencies)
module identity 'modules/identity.bicep' = {
  name: 'identity-${environment}'
  params: {
    environment: environment
    location: location
    projectName: projectName
    owner: owner
  }
}

// 2. Monitoring resources (no dependencies)
module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring-${environment}'
  params: {
    environment: environment
    location: location
    projectName: projectName
    owner: owner
    retentionInDays: logRetentionDays
  }
}

// 3. Storage (depends on identity for role assignment)
module storage 'modules/storage.bicep' = {
  name: 'storage-${environment}'
  params: {
    environment: environment
    location: location
    projectName: projectName
    owner: owner
    storageSku: storageSku
    principalId: identity.outputs.principalId
  }
}

// 4. App Service (depends on identity, monitoring, storage)
module appService 'modules/appService.bicep' = {
  name: 'appService-${environment}'
  params: {
    environment: environment
    location: location
    projectName: projectName
    owner: owner
    appServicePlanSku: appServicePlanSku
    identityId: identity.outputs.identityId
    appInsightsConnectionString: monitoring.outputs.appInsightsConnectionString
    logAnalyticsWorkspaceId: monitoring.outputs.logAnalyticsWorkspaceId
    blobEndpoint: storage.outputs.blobEndpoint
  }
}

// ============================================================================
// Outputs
// ============================================================================

@description('App Service URL')
output appServiceUrl string = appService.outputs.url

@description('App Service Name')
output appServiceName string = appService.outputs.appName

@description('Storage Account Name')
output storageAccountName string = storage.outputs.storageAccountName

@description('Application Insights Name')
output appInsightsName string = monitoring.outputs.appInsightsName

@description('Managed Identity Name')
output identityName string = identity.outputs.identityName

@description('Managed Identity Client ID')
output identityClientId string = identity.outputs.clientId
