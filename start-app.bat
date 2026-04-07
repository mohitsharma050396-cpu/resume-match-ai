@echo off
cd /d "D:\Claude Code\Resume Match"
echo Starting ResumeMatch AI...
start "" npx serve . -l 5173
timeout /t 2 /nobreak > nul
start "" "http://localhost:5173/resume-match-app.html"
