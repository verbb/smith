# Changelog

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
