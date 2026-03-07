Invoke-RestMethod `
  -Uri "https://mcp-server.purpleisland-668974e5.canadacentral.azurecontainerapps.io/chat" `
  -Method POST `
  -Body '{"message":"What can you do for my portfolio?"}' `
  -ContentType "application/json"