using '../main.bicep'

// Production environment parameters
// Higher performance and redundancy settings

param environment = 'prod'
param projectName = 'piano-tracker'
param owner = 'WaywardHayward'

// Production-grade SKUs
param appServicePlanSku = 'P1v3'
param storageSku = 'Standard_GRS'

// Longer retention for compliance
param logRetentionDays = 90
