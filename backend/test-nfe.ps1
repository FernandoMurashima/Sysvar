param(
  [Parameter(Mandatory=$true)]  [string]$BaseUrl,        # ex: http://localhost:8000/api
  [Parameter(Mandatory=$true)]  [string]$XmlPath,
  [Parameter(Mandatory=$true)]  [int]$LojaId,
  [Parameter(Mandatory=$true)]  [int]$FornecedorId,
  [Parameter(Mandatory=$false)] [string]$Token,          # opcional: se já tiver o token, passe aqui e ignora login
  [Parameter(Mandatory=$false)] [string]$Username="cli_"+([guid]::NewGuid().ToString("N").Substring(0,8)),
  [Parameter(Mandatory=$false)] [string]$Password="123456",
  [switch]$PermitirParcial
)

function Get-Token {
  param($BaseUrl,$Username,$Password)
  $body = @{ username=$Username; password=$Password } | ConvertTo-Json
  try {
    $resp = Invoke-RestMethod -Uri "$BaseUrl/auth/register/" -Method Post -ContentType "application/json" -Body $body -ErrorAction Stop
    return $resp.token
  } catch {
    throw "Não consegui obter token automaticamente. Se já tem um, passe com -Token '<seu_token>'."
  }
}

if (-not (Test-Path $XmlPath)) { throw "XML não encontrado: $XmlPath" }

if (-not $Token) {
  Write-Host "== Gerando token com usuário temporário: $Username"
  $Token = Get-Token -BaseUrl $BaseUrl -Username $Username -Password $Password
  Write-Host "OK. Token obtido."
}
$headers = @{ Authorization = "Token $Token" }

# 1) upload XML (multipart)
Write-Host "== Enviando XML..."
$form = @{
  xml = Get-Item $XmlPath
  Idloja = "$LojaId"
  Idfornecedor = "$FornecedorId"
}
$nf = Invoke-RestMethod -Uri "$BaseUrl/nfe-entradas/upload-xml/" -Method Post -Headers $headers -Form $form
Write-Host "NF importada: Id=$($nf.Idnfe) chave=$($nf.chave) status=$($nf.status)"

# 2) reconciliar
Write-Host "== Reconciliando..."
$rec = Invoke-RestMethod -Uri "$BaseUrl/nfe-entradas/$($nf.Idnfe)/reconciliar/" -Method Post -Headers $headers
Write-Host "Reconciliar: status=$($rec.status)"

# 3) confirmar
Write-Host "== Confirmando..."
$bodyConfirm = @{ permitir_parcial = ($PermitirParcial.IsPresent) } | ConvertTo-Json
$conf = Invoke-RestMethod -Uri "$BaseUrl/nfe-entradas/$($nf.Idnfe)/confirmar/" -Method Post -Headers $headers -ContentType "application/json" -Body $bodyConfirm
Write-Host "Confirmado: status=$($conf.status) compra_id=$($conf.compra_id) itens=$($conf.itens_criados) estoque=$($conf.estoque_atualizado_skus)"
