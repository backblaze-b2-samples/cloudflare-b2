# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

* Fixed comments around RCLONE_DOWNLOAD in wrangler.toml.template ([@jingyuanliang](https://github.com/jingyuanliang/))
* Updated README to use current `npm create cloudflare` and `npx wrangler deploy` commands ([@harrisonratcliffe](https://github.com/harrisonratcliffe/))
* Bumped direct dependencies to current versions, moved `wrangler` to `devDependencies`.

## [1.2.0] - 2024-10-09

### Added

* `RCLONE_DOWNLOAD` environment variable allows use with rclone's `--b2-download-url` option, stripping the `file\` prefix from the incoming path; fixes [#16](https://github.com/backblaze-b2-samples/cloudflare-b2/issues/16)

## [1.1.1] - 2024-10-08

### Added

* README now includes instruction to run `npm install`, fixing [#17](https://github.com/backblaze-b2-samples/cloudflare-b2/issues/17)

### Fixed

* Return correct response for ranged HEAD requests ([@jamesgreenley](https://github.com/jamesgreenley))

### Changed

* Bumped direct dependencies to current versions
* Bumped `path-to-regexp` version in response to dependabot alert

## [1.1.0] - 2024-07-20

### Fixed

* Send `HEAD` requests as `GET`s, fixing #18.

### Changed

* Update `aws4fetch` version to 1.0.19 and remove now-redundant region parsing code.
* Fix/suppress IntelliJ warnings.
* Make git ignore local worker files and directories.

## [1.0.0] - 2024-07-20

Declaring current version as 1.0.0.
