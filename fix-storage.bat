@echo off
echo ==========================================
echo    Nanny Gold - Storage Fix Script
echo ==========================================
echo.
echo This script will help you fix the document upload issue.
echo.
echo STEPS TO FOLLOW:
echo 1. Open your Supabase Dashboard: https://supabase.com/dashboard
echo 2. Select your project: msawldkygbsipjmjuyue
echo 3. Go to SQL Editor in the left sidebar
echo 4. Copy the contents of create-buckets-direct.sql
echo 5. Paste it in the SQL Editor and click Run
echo.
echo After running the SQL script, test the upload functionality.
echo.
echo Press any key to open the SQL file for copying...
pause > nul
notepad create-buckets-direct.sql
echo.
echo Press any key to open the instructions...
pause > nul
notepad STORAGE_FIX_INSTRUCTIONS.md
echo.
echo Done! Please follow the instructions to fix the upload issue.
pause
