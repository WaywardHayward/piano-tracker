using '../main.bicep'

// Development environment parameters
// Cost-optimized settings for development/testing

param environment = 'dev'
param projectName = 'piano-tracker'
param owner = 'WaywardHayward'

// Cost-effective SKUs for dev
param appServicePlanSku = 'B1'
param storageSku = 'Standard_LRS'

// Shorter retention for dev
param logRetentionDays = 30
