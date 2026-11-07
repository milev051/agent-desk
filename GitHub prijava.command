#!/bin/zsh
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v gh >/dev/null 2>&1; then
  print 'GitHub CLI nije instaliran. Instaliraj gh, pa ponovi povezivanje.'
else
  gh auth login --hostname github.com --web --git-protocol https
fi
print '\nVrati se u Agent Desk i klikni „Proveri vezu“. Pritisni Enter da zatvoriš ovaj prozor.'
read -r
