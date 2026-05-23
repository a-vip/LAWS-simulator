#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# LAWS Simulator — GitHub Repository Setup Script
# Run once from the project root after cloning / downloading the project.
# Creates a GitHub repo, sets up git, and pushes all files.
# ─────────────────────────────────────────────────────────────────────────────

set -e

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
AMBER='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

log()     { echo -e "${BLUE}▸${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
warn()    { echo -e "${AMBER}⚠${NC}  $1"; }
error()   { echo -e "${RED}✗${NC} $1"; exit 1; }
header()  { echo -e "\n${BOLD}$1${NC}\n"; }

# ── Banner ────────────────────────────────────────────────────────────────────
echo -e "${RED}"
echo "  ██╗      █████╗ ██╗    ██╗███████╗    ███████╗██╗███╗   ███╗"
echo "  ██║     ██╔══██╗██║    ██║██╔════╝    ██╔════╝██║████╗ ████║"
echo "  ██║     ███████║██║ █╗ ██║███████╗    ███████╗██║██╔████╔██║"
echo "  ██║     ██╔══██║██║███╗██║╚════██║    ╚════██║██║██║╚██╔╝██║"
echo "  ███████╗██║  ██║╚███╔███╔╝███████║    ███████║██║██║ ╚═╝ ██║"
echo "  ╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚══════╝    ╚══════╝╚═╝╚═╝     ╚═╝"
echo -e "${NC}"
echo -e "${BOLD}  Disarmament Advocacy Tool — GitHub Setup${NC}"
echo -e "  Campaign to Stop Killer Robots × UN Disarmament\n"

# ── Check dependencies ────────────────────────────────────────────────────────
header "Checking dependencies"

command -v git >/dev/null 2>&1 || error "git not found. Install from https://git-scm.com"
success "git found: $(git --version)"

command -v node >/dev/null 2>&1 || error "node not found. Install from https://nodejs.org (v18+)"
NODE_VERSION=$(node --version)
success "node found: $NODE_VERSION"

command -v npm >/dev/null 2>&1 || error "npm not found"
success "npm found: $(npm --version)"

# Check for GitHub CLI
if command -v gh >/dev/null 2>&1; then
  GH_AVAILABLE=true
  success "GitHub CLI found: $(gh --version | head -1)"
else
  GH_AVAILABLE=false
  warn "GitHub CLI (gh) not found — will show manual steps instead"
  warn "Install it later: https://cli.github.com"
fi

# ── Confirm project directory ────────────────────────────────────────────────
header "Project directory"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
log "Project root: $SCRIPT_DIR"

if [ ! -f "$SCRIPT_DIR/package.json" ]; then
  error "package.json not found. Run this script from the laws-simulator project root."
fi

success "package.json found"

# ── npm install ───────────────────────────────────────────────────────────────
header "Installing dependencies"

cd "$SCRIPT_DIR"
log "Running npm install..."
npm install --silent
success "Dependencies installed"

# ── .env.local setup ─────────────────────────────────────────────────────────
header "Environment variables"

if [ ! -f ".env.local" ]; then
  cp .env.local.example .env.local
  success "Created .env.local from template"
  warn "Add your Google Maps API key to .env.local before running:"
  warn "  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here"
  warn "The app runs without a key using the canvas fallback map."
else
  success ".env.local already exists — skipping"
fi

# ── Git initialisation ────────────────────────────────────────────────────────
header "Initialising git repository"

if [ -d ".git" ]; then
  warn ".git directory already exists — skipping git init"
else
  git init
  success "git repository initialised"
fi

# Configure default branch
git checkout -b main 2>/dev/null || git checkout main 2>/dev/null || true
success "Branch: main"

# Stage everything
git add -A

# Commit
if git diff --cached --quiet; then
  warn "Nothing to commit (all files already tracked)"
else
  git commit -m "feat: initial LAWS Simulator — disarmament advocacy tool

Lethal Autonomous Weapons Systems interactive simulator for use
at conferences, pop-up events, and public disarmament advocacy.

Built for Campaign to Stop Killer Robots / UN Disarmament.

Features:
- Google Maps Photorealistic 3D Tiles (with canvas fallback)
- 5 scenarios based on documented incidents
- Confidence scoring engine with threshold alerts
- Authorization chain workflow
- Drone deployment and tracking
- Post-strike assessment with casualty records
- Military terminal aesthetic

Tech: Next.js 14, TypeScript, Tailwind CSS, Zustand"

  success "Initial commit created"
fi

# ── GitHub repository creation ────────────────────────────────────────────────
header "GitHub repository"

REPO_NAME="laws-simulator"
REPO_DESC="LAWS Simulator — Interactive disarmament advocacy tool for Stop Killer Robots / UN Disarmament. Simulates autonomous weapons targeting workflows."

if [ "$GH_AVAILABLE" = true ]; then
  # Check auth
  if gh auth status >/dev/null 2>&1; then
    success "GitHub CLI authenticated"

    # Create repo
    log "Creating GitHub repository: $REPO_NAME"
    if gh repo create "$REPO_NAME" \
      --public \
      --description "$REPO_DESC" \
      --source . \
      --remote origin \
      --push 2>/dev/null; then
      success "Repository created and pushed!"
      REPO_URL=$(gh repo view --json url -q .url 2>/dev/null || echo "")
      if [ -n "$REPO_URL" ]; then
        echo ""
        echo -e "  ${GREEN}${BOLD}Repository URL:${NC}"
        echo -e "  ${BLUE}$REPO_URL${NC}"
      fi
    else
      # Repo may already exist — just set remote and push
      warn "Repo may already exist — attempting to set remote and push"
      GH_USER=$(gh api user -q .login 2>/dev/null || echo "")
      if [ -n "$GH_USER" ]; then
        git remote add origin "https://github.com/$GH_USER/$REPO_NAME.git" 2>/dev/null || \
          git remote set-url origin "https://github.com/$GH_USER/$REPO_NAME.git"
        git push -u origin main
        success "Pushed to existing repository"
        echo -e "  ${BLUE}https://github.com/$GH_USER/$REPO_NAME${NC}"
      fi
    fi
  else
    warn "GitHub CLI not authenticated. Run:"
    echo ""
    echo "  gh auth login"
    echo "  bash setup-github.sh  # then re-run this script"
    echo ""
    SHOW_MANUAL=true
  fi
else
  SHOW_MANUAL=true
fi

# ── Manual steps fallback ─────────────────────────────────────────────────────
if [ "${SHOW_MANUAL}" = "true" ]; then
  header "Manual GitHub setup"
  echo -e "  Run these commands to push to GitHub:\n"
  echo -e "  ${AMBER}# 1. Create a repo at https://github.com/new${NC}"
  echo -e "  ${AMBER}#    Name it: laws-simulator${NC}"
  echo -e "  ${AMBER}#    Visibility: Public${NC}"
  echo ""
  echo -e "  ${BLUE}git remote add origin https://github.com/YOUR_USERNAME/laws-simulator.git${NC}"
  echo -e "  ${BLUE}git push -u origin main${NC}"
  echo ""
fi

# ── Vercel deployment tip ─────────────────────────────────────────────────────
header "Deploy to Vercel (for events)"

echo "  To host this for conferences / pop-up events:"
echo ""
echo -e "  ${BLUE}npm install -g vercel${NC}"
echo -e "  ${BLUE}vercel${NC}"
echo ""
echo "  Then set your environment variable in the Vercel dashboard:"
echo -e "  ${AMBER}NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key${NC}"
echo ""
echo "  A custom domain (e.g. laws-demo.stopkillerrobots.org) takes ~2 minutes."

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}  ─────────────────────────────────────────────────${NC}"
echo -e "${GREEN}${BOLD}  Setup complete.${NC}"
echo -e "${GREEN}${BOLD}  ─────────────────────────────────────────────────${NC}"
echo ""
echo "  Start the development server:"
echo -e "  ${BLUE}npm run dev${NC}"
echo ""
echo "  Open: http://localhost:3000"
echo ""
echo -e "  ${AMBER}Remember:${NC} Add your Google Maps API key to .env.local"
echo "  for photorealistic 3D tiles. The app works without it"
echo "  using the built-in canvas fallback map."
echo ""
echo -e "  ${RED}■ Campaign to Stop Killer Robots — stopkillerrobots.org${NC}"
echo -e "  ${BLUE}■ UN CCW LAWS Negotiations — un.org/disarmament${NC}"
echo ""
