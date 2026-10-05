#!/bin/zsh
set -e
project="${0:A:h:h}"
app="$project/Agent Desk.app"
mkdir -p "$app/Contents/MacOS"
mkdir -p "$app/Contents/Resources"
cp "$project/launcher/AppIcon.icns" "$app/Contents/Resources/AppIcon.icns"
/usr/bin/swiftc "$project/launcher/main.swift" -o "$app/Contents/MacOS/AgentDeskLauncher"
cat > "$app/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>CFBundleExecutable</key><string>AgentDeskLauncher</string><key>CFBundleIdentifier</key><string>local.agent-desk.launcher</string><key>CFBundleIconFile</key><string>AppIcon</string><key>CFBundleName</key><string>Agent Desk</string><key>CFBundlePackageType</key><string>APPL</string><key>NSHighResolutionCapable</key><true/></dict></plist>
PLIST
/usr/bin/codesign --force --sign - "$app"
