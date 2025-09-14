@echo off
echo 🔧 Force fixing Prisma Studio issues on Windows...
echo.

REM Kill all Node.js processes that might be locking files
echo 1. Killing all Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

REM Kill any Prisma Studio processes specifically
echo 2. Killing Prisma Studio processes...
for /f "tokens=2" %%i in ('wmic process where "CommandLine like '%%prisma%%studio%%'" get ProcessId /value') do (
    if not "%%i"=="" (
        taskkill /F /PID %%i >nul 2>&1
    )
)
timeout /t 2 >nul

REM Force remove the .prisma directory
echo 3. Force removing Prisma client files...
if exist "node_modules\.prisma" (
    rmdir /S /Q "node_modules\.prisma" >nul 2>&1
    echo    ✅ Removed Prisma client directory
) else (
    echo    ⚠️  Prisma client directory not found
)

REM Remove any lingering lock files
echo 4. Removing lock files...
del /F /S /Q "node_modules\*.lock" >nul 2>&1
del /F /S /Q "node_modules\*.tmp*" >nul 2>&1
echo    ✅ Removed lock files

REM Wait a moment for file handles to release
echo 5. Waiting for file handles to release...
timeout /t 3 >nul

REM Regenerate Prisma client
echo 6. Regenerating Prisma client...
npx prisma generate
if %ERRORLEVEL% EQU 0 (
    echo    ✅ Prisma client regenerated successfully
) else (
    echo    ❌ Failed to regenerate Prisma client
    echo.
    echo 🔧 Additional steps to try:
    echo 1. Restart your computer
    echo 2. Run as Administrator: npm install
    echo 3. Run as Administrator: npx prisma generate
    echo.
    pause
    exit /b 1
)

echo.
echo 🎉 Prisma Studio fix completed!
echo.
echo 📋 Next steps:
echo 1. Start Prisma Studio: npx prisma studio
echo 2. If issues persist, restart your computer and try again
echo.
pause
