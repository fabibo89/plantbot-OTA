# SPIFFS web UI snapshot

Copy of `plantbot-hardware/data/Updater` for release asset `spiffs-data.zip`.

`manifest.json` lists UI files for OTA (`GithubUpdater` loads them from the
release tag via raw.githubusercontent.com before flashing `firmware.bin`).
`config.json` is never updated this way.

Upload contents of `Updater/` to the device as described in
`docs/releases/v1.3.0-alpha.md` (curl or `/manager`) if you need a manual refresh.
