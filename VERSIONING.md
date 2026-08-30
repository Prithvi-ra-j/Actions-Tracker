# Versioning

This project uses **Level.Phase.Patch** versioning, not standard semantic versioning (major.minor.patch). 
The version number is a claim about the state of the *system architecture and verified capability*, not just a counter for merged features.

## The Rule

- **Level** (X.0.0): Bumps only on a schema-breaking change to the core data model. Examples: adding new `keyPath`s, dropping stores, or changing the core fact structure in a way that would require a complex migration or break derived state calculations for old exports.
- **Phase** (1.X.0): Bumps when a new feature or sub-system is completed and integrated within the current Level, without breaking the schema.
- **Patch** (1.1.X): Bumps on bugfixes, UI tweaks, or minor updates that add no net-new capability.

## The Single Source of Truth

The current version string is defined in `src/version.js`. 
`package.json`, the database export envelope (`_meta`), and any UI displays must import or mirror this value. They should not drift.

## Git Tags and Gate Clearing

Code merged to `main` is just code. It doesn't get a version tag until it has passed its verification gate (the "round-trip test"). 

**The Round-Trip Test (Data Safety Guarantee):**
1. Export the database to JSON.
2. Run `npm run test:roundtrip -- path/to/export.json` to verify schema constraints statically.
3. Wipe the app data (Settings → Clear Data).
4. Import the backup.
5. Verify record counts match and all UI features function as expected.

Only when this test passes for a given Phase is the tag (e.g., `v1.5.0`) applied to the commit, and an entry added to `CHANGELOG.md`.
