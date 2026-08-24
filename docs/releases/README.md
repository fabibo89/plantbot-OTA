# Release notes

Markdown files in this folder document PlantBot OTA/firmware releases.

They are tracked in git for history, but **excluded from GitHub source
archives** via `.gitattributes`:

```
docs/releases/** export-ignore
```

Naming: use the GitHub tag as filename, e.g. tag `v1.3.0-alpha` → `v1.3.0-alpha.md`.

On release publish, workflow `fill-release-notes.yml` copies that file into the
GitHub Release body (`gh release edit … --notes-file`). If no matching file
exists, the body is left unchanged.

### Home Assistant update card (`HA_SUMMARY`)

The plantbot-HA integration reads the GitHub release body and shows a short
preview (max. 255 characters) in the firmware update entity. Add at the end of
each release notes file:

```markdown
<!-- HA_SUMMARY: Kurztext für die HA-Update-Karte (max. 255 Zeichen). -->
```

If omitted, HA falls back to the first line of the release notes or
„Bugfixes und Verbesserungen“. Full notes remain available under
„Versionshinweise lesen“ (truncated at 6000 characters).

When publishing a GitHub Release, attach only (via `attach-firmware.yml`):

- `firmware.bin`
- `spiffs-data.zip` (packed by CI from `/spiffs-data`)

Do **not** attach these release-note files as release assets.
