# Changelog

## 1.2.0 - 2022-01-11

### Changed
- Now require Craft 3.7.31+.

### Fixed
- Fix compatibility with Craft 3.7.31.
- Fix potential error with MatrixMate and cloning blocks.

## 1.1.14 - 2021-05-30

### Fixed
- Fix cloned or pasted block not always appearing in some instances.
- Fix incorrectly rendering Matrix blocks for Craft 3.5+.

## 1.1.13 - 2021-03-17

### Fixed
- Fix translations not working.

## 1.1.12 - 2021-01-19

### Fixed
- Fix cloned blocks on un-saved elements not always appearing after cloned source block.
- Fix potentially incorrect blocks being cloned.

## 1.1.11 - 2021-01-15

### Fixed
- Fix being unable to clone or copy/paste unsaved blocks.

## 1.1.10 - 2020-10-21

### Fixed
- Fix error when cloning or pasting blocks where multiple Matrix fields with the same handle existed.

## 1.1.9 - 2020-10-18

### Fixed
- Fix nested Matrix + Super Table fields, where excessively large POST data was being sent to the server.

## 1.1.8 - 2020-09-05

### Fixed
- Fix pasting into new matrix fields, not using the correct `placeholderKey` for the destination field.

## 1.1.7 - 2020-08-31

### Fixed
- Fix error when selecting one or multiple blocks and trying to copy.

## 1.1.6 - 2020-08-10

### Changed
- Updated handling to cater for the latest changes in Matrix and Super Table, with `placeholderKey`.
- Now requires Craft 3.4.30+.

## 1.1.5 - 2020-07-26

### Fixed
- Fix paste-checks not being done each time the menu is opened. Causing previously-copied blocks (from other fields) to show they can be pasted.
- Fix being unable to post for Super Table in Matrix fields.
- Fix JS error in Safari

## 1.1.4 - 2020-07-23

### Fixed
- Fix being unable to clone Matrix blocks when they contained a Super Table Field.
- Fix being unable to clone Matrix blocks when in Neo fields.
- Fix menu option not being added for Matrix blocks nested in Super Table or Neo fields.
- Fix newly cloned blocks when nested in Super Table or Neo fields not cloning properly.
- Fix Neo support to allow for nested Matrix fields more than 2 levels deep.

## 1.1.3 - 2020-04-16

### Fixed
- Fix logging error `Call to undefined method setFileLogging()`.

## 1.1.2 - 2020-04-15

### Changed
- File logging now checks if the overall Craft app uses file logging.
- Log files now only include `GET` and `POST` additional variables.

## 1.1.1 - 2020-02-12

### Fixed
- Fix issue with pasting blocks.

## 1.1.0 - 2020-02-11

### Added
- Add Craft 3.4 support.

### Changed
- Now requires Craft 3.4+.

## 1.0.0 - 2019-04-14

- Initial release.
