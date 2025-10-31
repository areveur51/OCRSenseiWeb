#!/bin/bash

# OCRSenseiWeb - Quick Git Setup Script
# This script configures Git and prepares for pushing to GitHub

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          OCRSenseiWeb - Git Configuration Script             ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Configure Git user
echo "→ Configuring Git user..."
git config user.name "areveur51"
git config user.email "areveur51@gmail.com"
echo "✓ Git user configured"
echo ""

# Show current configuration
echo "→ Current Git configuration:"
git config --list | grep -E "user\.(name|email)"
echo ""

# Check git status
echo "→ Checking repository status..."
git status
echo ""

# Show instructions
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    Next Steps                                 ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "1. Stage all files:"
echo "   git add ."
echo ""
echo "2. Create initial commit:"
echo "   git commit -m \"Initial commit: OCRSenseiWeb v1.0\""
echo ""
echo "3. Add remote repository (if not already added):"
echo "   git remote add origin https://github.com/areveur51/OCRSenseiWeb.git"
echo ""
echo "4. Push to GitHub:"
echo "   git push -u origin main"
echo ""
echo "See DEPLOYMENT_CHECKLIST.md for complete deployment guide"
echo ""
