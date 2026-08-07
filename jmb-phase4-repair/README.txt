JMB Phase 4 emergency rollback

From /workspaces/jmb-creations-studio:

1. Put this folder in the repo root / unzip the package there.
2. Run:
   node jmb-phase4-repair/rollback-jmb-phase4.mjs
3. Then run:
   npm run dev

This does NOT use git reset. It restores files from the .jmb-phase4-backup created by the Phase 4 installer and removes only Phase 4-only files.
