$envVars = Get-Content containerapp.env | Where-Object { $_ -match "=" } | ForEach-Object { $_ }
$envVarsString = $envVars -join " "

az containerapp create `
  --name floodwatch-backend `
  --resource-group adobe_v1 `
  --environment floodwatch-env `
  --image floodwatchacr.azurecr.io/floodwatch-backend:latest `
  --registry-server floodwatchacr.azurecr.io `
  --registry-username floodwatchacr `
  --registry-password $(az acr credential show --name floodwatchacr --query passwords[0].value -o tsv) `
  --cpu 4 --memory 8Gi `
  --min-replicas 1 --max-replicas 1 `
  --ingress external `
  --target-port 8000 `
  --env-vars $envVarsString