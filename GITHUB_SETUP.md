# EduSphere GitHub Setup Guide

## Step 1: Install Git

Download and install Git for Windows from:
https://git-scm.com/download/win

During installation, use default settings.

## Step 2: Configure Git (First Time Only)

Open PowerShell and run:

```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Step 3: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: **EduSphere**
3. Description: "Comprehensive Educational Platform with 20+ Learning Tools"
4. Choose: **Public** or **Private**
5. **DO NOT** initialize with README, .gitignore, or license
6. Click "Create repository"

## Step 4: Push to GitHub

After creating the repository, run these commands in PowerShell:

```powershell
# Navigate to project directory
cd C:\Users\mdame\Downloads\EduSphere

# Initialize git repository
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit: EduSphere - Comprehensive Educational Platform"

# Add remote repository (replace 'yourusername' with your GitHub username)
git remote add origin https://github.com/yourusername/EduSphere.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 5: Verify

Visit your repository at:
https://github.com/yourusername/EduSphere

---

## Quick Commands Reference

### After Git is installed, run these commands:

```powershell
cd C:\Users\mdame\Downloads\EduSphere
git init
git add .
git commit -m "Initial commit: EduSphere Educational Platform"
git remote add origin https://github.com/YOURUSERNAME/EduSphere.git
git branch -M main
git push -u origin main
```

**Note:** Replace `YOURUSERNAME` with your actual GitHub username.

---

## Future Updates

To push updates after initial setup:

```powershell
cd C:\Users\mdame\Downloads\EduSphere
git add .
git commit -m "Description of your changes"
git push
```

---

## Troubleshooting

### If you get authentication errors:

1. **Personal Access Token** (Recommended):
   - Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token with 'repo' scope
   - Use token as password when prompted

2. **SSH Key** (Alternative):
   ```powershell
   ssh-keygen -t ed25519 -C "your.email@example.com"
   # Add the key to GitHub: Settings → SSH and GPG keys
   git remote set-url origin git@github.com:yourusername/EduSphere.git
   ```

### If remote already exists:

```powershell
git remote remove origin
git remote add origin https://github.com/yourusername/EduSphere.git
```

---

## Project Structure Being Pushed

```
EduSphere/
├── .gitignore              # Excludes node_modules, .venv, uploads, etc.
├── README.md               # Project documentation
├── start.ps1               # Main startup script
├── backend/                # Python FastAPI backend
│   ├── app/
│   ├── requirements.txt
│   └── uploads/           # (excluded from git)
├── frontend/               # React frontend
│   ├── src/
│   ├── package.json
│   └── node_modules/      # (excluded from git)
└── assets/                 # Images and resources
```

---

## Repository Size

Approximate size: ~2-5 MB (excluding node_modules, .venv, and uploads)

---

Made with ❤️ for education
