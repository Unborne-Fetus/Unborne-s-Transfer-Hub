# Unborne's Transfer Hub

An offline-first Pokémon save-file companion. The first milestone is a **read-only Gen III/Brisk Emerald save inspector** and a portable Pokémon vault. Save-to-save writing will be added only after format-specific validation and test fixtures.

**Sprites:** use the exact 2D front PNG sprites (normal and shiny) from [Brisk Dex](https://github.com/Unborne-Fetus/Brisk-Dex/tree/main/brisk-dex-sprites), preserving its internal species IDs. The `scripts/sync-assets.mjs` command copies the front sprites and Brisk's species catalogue locally for offline operation. The game assets are **not** a live external dependency after syncing.

## Getting started (Windows)

1. Install Node.js (18+) and Git if you do not already have them.
2. Run `setup-assets.bat` once while online to copy the sprite/data assets from Brisk Dex.
3. Run `launch.bat`. The local, offline-capable interface opens in your browser.
4. Import a **copy** of a `.sav` or `.srm` and inspect the Pokémon.

You can also run `node scripts/sync-assets.mjs` and `node scripts/serve.mjs`. No `npm install`, paid service, account, or cloud backend is required.

## Currently supported

- Read-only inspection of standard 128 KiB Generation III-style save files, including party and PC boxes.
- Experimental recognition of Brisk Dex's 20-box extension; other expansion layouts require dedicated adapters.
- Exact Brisk Dex 2D normal/shiny front sprites, with optional online fallback while assets have not yet been synced.
- Select Pokémon and copy their existing encrypted 80-byte records into a local vault.
- Export/import a portable JSON vault. Imports verify the archive's format; the original save file is never changed.

## Not supported yet

- Writing Pokémon into any game save, especially saves with custom layouts.
- Automatic cross-generation conversion, legality repair, Pokémon HOME integration, or cloud transfers.
- Guarantees that non-Brisk hacks with different internal species IDs will display matching sprites.

**Safety:** Back up original saves. Unsupported or malformed saves must fail closed. Do not use this prototype to transfer Pokémon between games yet.

## Next engineering milestones

1. Add verified Brisk-specific mapping for its current save layout and box count.
2. Add per-game save adapters, test fixtures, party/box transfer compatibility rules, and checksummed export.
3. Add DS/3DS/Switch adapters where legally and technically feasible, with compatibility validation.
4. Package self-contained Windows and browser builds that include the synced sprite set.

No ROMs, proprietary firmware, or game files are bundled. Game and Pokémon artwork belong to their respective owners.
