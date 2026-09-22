# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2026-09-22

### Added

- Added an npm version badge to the README.

### Changed

- Clarified the README title and described the package as a simple Kysely plugin.

## [1.0.1] - 2026-09-22

### Changed

- Bumped the package version to 1.0.1.

## [1.0.0] - 2026-09-21

### Added

- Added a Fastify plugin that exposes a shared Kysely instance as `request.db`.
- Added TypeScript declarations for plugin options and database schema augmentation.
- Added PGlite-based integration tests.

### Changed

- Updated the minimum runtime requirements to Node.js 22.18.0 and npm 10.9.3.
