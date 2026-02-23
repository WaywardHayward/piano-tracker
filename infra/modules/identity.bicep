// User-Assigned Managed Identity for piano-tracker
// Provides secure, credential-free authentication to Azure services

@description('Environment name (dev, prod)')
param environment string

@description('Location for resources')
param location string

@description('Project name')
param projectName string = 'piano-tracker'

@description('Owner tag')
param owner string = 'WaywardHayward'

var identityName = '${projectName}-${environment}-identity'

resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: identityName
  location: location
  tags: {
    environment: environment
    project: projectName
    owner: owner
  }
}

@description('The resource ID of the managed identity')
output identityId string = managedIdentity.id

@description('The principal ID of the managed identity')
output principalId string = managedIdentity.properties.principalId

@description('The client ID of the managed identity')
output clientId string = managedIdentity.properties.clientId

@description('The name of the managed identity')
output identityName string = managedIdentity.name
