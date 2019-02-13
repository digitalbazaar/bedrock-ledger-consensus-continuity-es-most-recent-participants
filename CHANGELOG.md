# bedrock-ledger-consensus-continuity-es-most-recent-participants ChangeLog

## 2.1.0 - TBD

### Added
- An `electorCandidateFilterPattern` configuration option. The value of the
  option is a regex pattern which will be applied to the peer IDs of the
  elector candidates during elector selection. Peer IDs are HTTPS URLs and this
  option can be used to limit elector candidates to peers operating within a
  specific DNS domain.

## 2.0.0 - 2019-02-12

### Changed
- **BREAKING**: Change algorithm for breaking ties during elector selection.

## 1.0.0 - 2018-10-09

- See git history for changes.
