#!/bin/zsh
project="${0:A:h}"
if [[ ! -x "$project/Agent Desk.app/Contents/MacOS/AgentDeskLauncher" ]]; then
  "$project/launcher/build.sh" || exit 1
fi
/usr/bin/open "$project/Agent Desk.app"
