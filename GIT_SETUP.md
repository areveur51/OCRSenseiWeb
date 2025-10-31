# Git Setup and Deployment Guide

This guide provides step-by-step instructions for setting up Git and pushing OCRSenseiWeb to GitHub.

## Initial Git Configuration

```bash
# Configure Git user
git config user.name "YOUR_USERNAME"
git config user.email "your-email@example.com"

# Verify configuration
git config --list
```

## Repository Setup

```bash
# Initialize Git repository (if not already initialized)
git init

# Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/OCRSenseiWeb.git

# Verify remote
git remote -v
```

## First Commit and Push

```bash
# Check current status
git status

# Stage all files
git add .

# Create initial commit
git commit -m "Initial commit: OCRSenseiWeb v1.0 - Matrix-themed dual verification OCR application

Features:
- Dual OCR verification with Tesseract PSM 6 and PSM 3
- Project and directory organization
- 23 unique metric-style ASCII art variations
- Advanced fuzzy search with configurable tolerance
- Asynchronous batch processing queue
- Word-level text highlighting
- Dark/light mode support
- PostgreSQL with pg_trgm extension
- Matrix terminal theme with bold double-line ASCII art"

# Push to GitHub
git push -u origin main

# If using master branch instead:
# git branch -M main
# git push -u origin main
```

## Subsequent Updates

```bash
# Check what's changed
git status

# Stage specific files
git add <file1> <file2>

# Or stage all changes
git add .

# Commit with descriptive message
git commit -m "Brief description of changes

Detailed explanation if needed:
- Feature added
- Bug fixed
- Update made"

# Push changes
git push
```

## Branching Strategy

```bash
# Create a new feature branch
git checkout -b feature/new-feature-name

# Work on your feature
# ... make changes ...

# Commit changes
git add .
git commit -m "Add new feature"

# Push feature branch
git push -u origin feature/new-feature-name

# After PR is merged, switch back to main and pull
git checkout main
git pull origin main

# Delete local feature branch
git branch -d feature/new-feature-name
```

## Common Git Commands

```bash
# View commit history
git log --oneline

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard all local changes
git reset --hard HEAD

# Create and apply a tag
git tag -a v1.0.0 -m "Version 1.0.0"
git push origin v1.0.0

# View differences
git diff

# View staged differences
git diff --staged
```

## Tips

1. **Commit Often**: Make small, focused commits
2. **Write Clear Messages**: Use descriptive commit messages
3. **Pull Before Push**: Always pull latest changes before pushing
4. **Use Branches**: Create feature branches for new work
5. **Review Changes**: Use `git diff` before committing

## Troubleshooting

### Authentication Issues
If you encounter authentication issues, you may need to set up a Personal Access Token (PAT):

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token with `repo` scope
3. Use the token as your password when pushing

### Merge Conflicts
```bash
# If you encounter merge conflicts
git status  # See conflicting files
# Edit files to resolve conflicts
git add <resolved-files>
git commit -m "Resolve merge conflicts"
git push
```

## GitHub Repository Settings

After pushing, configure your GitHub repository:

1. **Description**: "A Matrix-themed OCR application with dual verification for extracting text from scanned images"
2. **Topics**: Add tags like `ocr`, `tesseract`, `react`, `typescript`, `postgresql`, `matrix-theme`
3. **Enable Issues**: For bug reports and feature requests
4. **Add README.md**: Will be displayed on the repository homepage
5. **Configure Pages**: If you want to host documentation

## Release Process

```bash
# Create a release tag
git tag -a v1.0.0 -m "Release v1.0.0 - Initial public release"

# Push tag to GitHub
git push origin v1.0.0

# Then create a release on GitHub with release notes
```

---

For more information, see the [Git documentation](https://git-scm.com/doc).
