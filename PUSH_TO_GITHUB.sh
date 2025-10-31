#!/bin/bash

# OCRSenseiWeb - Push to GitHub Script
# Quick commands to commit and push to GitHub

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          OCRSenseiWeb - GitHub Push Commands                  ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Show current remote
echo "→ Current git remote:"
git remote -v
echo ""

# Show current status
echo "→ Current status:"
git status --short
echo ""

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    Ready to Push                              ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Run these commands:"
echo ""
echo "1. Stage all files:"
echo "   git add ."
echo ""
echo "2. Commit with message:"
echo '   git commit -m "Initial commit: OCRSenseiWeb v1.0 - Matrix-themed dual verification OCR application"'
echo ""
echo "3. Push to GitHub:"
echo "   git push -u origin main"
echo ""
echo "Or run all at once:"
echo '   git add . && git commit -m "Initial commit: OCRSenseiWeb v1.0" && git push -u origin main'
echo ""
