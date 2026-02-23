// Storage Account for piano-tracker
// Used for MIDI file uploads and other blob storage needs

@description('Environment name (dev, prod)')
param environment string

@description('Location for resources')
param location string

@description('Project name')
param projectName string = 'piano-tracker'

@description('Owner tag')
param owner string = 'WaywardHayward'

@description('Storage account SKU')
@allowed(['Standard_LRS', 'Standard_GRS', 'Standard_RAGRS', 'Standard_ZRS', 'Premium_LRS'])
param storageSku string = 'Standard_LRS'

@description('Principal ID to grant Storage Blob Data Contributor role')
param principalId string

// Storage account names must be 3-24 chars, lowercase alphanumeric only
var storageNameRaw = '${projectName}${environment}st'
var storageName = toLower(replace(storageNameRaw, '-', ''))

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageName
  location: location
  tags: {
    environment: environment
    project: projectName
    owner: owner
  }
  kind: 'StorageV2'
  sku: {
    name: storageSku
  }
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false // Enforce managed identity auth
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

resource blobServices 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    deleteRetentionPolicy: {
      enabled: true
      days: 7
    }
  }
}

resource midiContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobServices
  name: 'midi-files'
  properties: {
    publicAccess: 'None'
  }
}

// Storage Blob Data Contributor role assignment for managed identity
var storageBlobDataContributorRole = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')

resource storageRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, principalId, storageBlobDataContributorRole)
  scope: storageAccount
  properties: {
    roleDefinitionId: storageBlobDataContributorRole
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}

@description('Storage Account ID')
output storageAccountId string = storageAccount.id

@description('Storage Account Name')
output storageAccountName string = storageAccount.name

@description('Storage Account Blob Endpoint')
output blobEndpoint string = storageAccount.properties.primaryEndpoints.blob

@description('MIDI Container Name')
output midiContainerName string = midiContainer.name
