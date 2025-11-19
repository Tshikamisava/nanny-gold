#!/bin/bash

# Supabase Configuration Update Script
# Usage: ./update-supabase-config.sh <PROJECT_URL> <ANON_KEY>

PROJECT_URL=$1
ANON_KEY=$2
PROJECT_ID=$(echo $PROJECT_URL | sed 's/https:\/\///' | sed 's/\.supabase\.co//')

if [ -z "$PROJECT_URL" ] || [ -z "$ANON_KEY" ]; then
    echo "❌ Error: Missing required parameters"
    echo "Usage: ./update-supabase-config.sh <PROJECT_URL> <ANON_KEY>"
    echo "Example: ./update-supabase-config.sh https://abc123.supabase.co eyJ..."
    exit 1
fi

echo "🔄 Updating Supabase configuration..."

# Update .env file
cat > .env << EOF
# Supabase Configuration
VITE_SUPABASE_URL=$PROJECT_URL
VITE_SUPABASE_ANON_KEY=$ANON_KEY
VITE_SUPABASE_PROJECT_ID=$PROJECT_ID
VITE_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY
EOF

# Update supabase/config.toml
mkdir -p supabase
cat > supabase/config.toml << EOF
project_id = "$PROJECT_ID"

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
EOF

echo "✅ Configuration updated successfully!"
echo "📁 Files updated:"
echo "   - .env"
echo "   - supabase/config.toml"
echo ""
echo "🚀 Next steps:"
echo "   1. Restart your development server: npm run dev"
echo "   2. Test the connection in your browser"
echo "   3. Set up your database schema using the SQL in SETUP_SUPABASE.md"