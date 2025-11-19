# Supabase Configuration Update Script for Windows
# Usage: .\update-supabase-config.ps1 -ProjectUrl "https://abc123.supabase.co" -AnonKey "eyJ..."

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$AnonKey
)

# Extract project ID from URL
$ProjectId = $ProjectUrl -replace 'https://', '' -replace '\.supabase\.co', ''

Write-Host "🔄 Updating Supabase configuration..." -ForegroundColor Blue

# Update .env file
$envContent = @"
# Supabase Configuration
VITE_SUPABASE_URL=$ProjectUrl
VITE_SUPABASE_ANON_KEY=$AnonKey
VITE_SUPABASE_PROJECT_ID=$ProjectId
VITE_SUPABASE_PUBLISHABLE_KEY=$AnonKey
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8

# Create supabase directory if it doesn't exist
if (!(Test-Path "supabase")) {
    New-Item -ItemType Directory -Path "supabase"
}

# Update supabase/config.toml
$configContent = @"
project_id = "$ProjectId"

[functions.send-otp]
verify_jwt = false

[functions.send-sms-otp]
verify_jwt = false

[functions.verify-sms-otp]
verify_jwt = false

[functions.calculate-booking-time]
verify_jwt = false

[functions.calculate-hourly-pricing]
verify_jwt = false
"@

$configContent | Out-File -FilePath "supabase/config.toml" -Encoding UTF8

Write-Host "✅ Configuration updated successfully!" -ForegroundColor Green
Write-Host "📁 Files updated:" -ForegroundColor Yellow
Write-Host "   - .env"
Write-Host "   - supabase/config.toml"
Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Restart your development server: npm run dev"
Write-Host "   2. Test the connection in your browser"
Write-Host "   3. Set up your database schema using the SQL in SETUP_SUPABASE.md"