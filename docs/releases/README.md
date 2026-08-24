# Release notes

Markdown files in this folder document PlantBot OTA/firmware releases.

They are tracked in git for history, but **excluded from GitHub source
archives** via `.gitattributes`:

```
docs/releases/** export-ignore
```

When publishing a GitHub Release, attach only:

- `firmware.bin`
- `spiffs-data.zip` (packed by CI from `/spiffs-data`)

Do **not** attach these release-note files as release assets.
