@echo off
echo "Manual GitHub Pages Deployment Script"
echo "======================================"

cd web
echo "Building production bundle..."
call npm run build

echo "Switching to gh-pages branch..."
git checkout -B gh-pages

echo "Copying built files..."
xcopy /E /I /Y dist\* .

echo "Removing dist folder and source files..."
rmdir /S /Q dist
del /Q package*.json
del /Q vite.config.js
del /Q tsconfig*.json
del /Q *.md

echo "Committing to gh-pages..."
git add .
git commit -m "Deploy: Manual deployment of built files"

echo "Pushing to gh-pages branch..."
git push -f origin gh-pages

echo "Switching back to main..."
git checkout main

echo "Deployment complete! Check: https://rishithaaa01.github.io/ayu-disha/"
pause