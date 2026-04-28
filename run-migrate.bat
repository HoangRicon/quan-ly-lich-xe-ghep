@echo off
echo === Step 1: Run migration ===
call node migrate-fix.js
if errorlevel 1 goto end

echo.
echo === Step 2: Generate Prisma client ===
call npx prisma generate
if errorlevel 1 goto end

echo.
echo === Step 3: Clear Next.js cache ===
if exist .next rmdir /s /q .next
if errorlevel 1 goto end

echo.
echo === Step 4: Build for production ===
call npm run build
if errorlevel 1 goto end

echo.
echo === Step 5: Start production server ===
call npm run start

:end
echo.
echo Done.
