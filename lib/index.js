/*!
 * Copyright (c) 2018-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const _continuityConstants = require('./continuityConstants');
const bedrock = require('bedrock');
const brLedgerNode = require('bedrock-ledger-node');
const logger = require('./logger');
const xor = require('buffer-xor');
const {util: {BedrockError}} = bedrock;

require('./config');
const cfg = bedrock.config[
  'ledger-consensus-continuity-es-most-recent-participants'];

// module API
const api = {};
module.exports = api;

// specify the consensus plugin(s) that work with this elector selection method
api.consensusMethod = 'Continuity2017';

api.type = 'MostRecentParticipants';

// register this ledger plugin
bedrock.events.on('bedrock.start', () => {
  brLedgerNode.use('MostRecentParticipants', {api, type: 'electorSelection'});
  if(cfg.electorCandidateFilterPattern) {
    const filterRegex = new RegExp(cfg.electorCandidateFilterPattern);
    api.filterElectorCandidates = candidates => candidates
      .filter(({id}) => filterRegex.test(id));
  }
});

// The default implementation is an identity function that may optionally
// be defined in bedrock.start event or overridden in tests
api.filterElectorCandidates = candidates => candidates,

api.getBlockElectors = async (
  {ledgerNode, ledgerConfiguration, latestBlockSummary, blockHeight}) => {
  // get partipicants for the last block
  const {_blocks} = ledgerNode.consensus;
  const {consensusProofPeers, mergeEventPeers} = await _blocks.getParticipants(
    {blockHeight: blockHeight - 1, ledgerNode});

  // TODO: we should be able to easily remove previously detected
  // byzantine nodes (e.g. those that forked at least) from the electors

  // TODO: simply count consensus event signers once and proof signers
  //   twice for now -- add comprehensive elector selection and
  //   recommended elector vote aggregating algorithm in v2
  const aggregate = {};
  mergeEventPeers.forEach(id => aggregate[id] = {id, weight: 1});
  // TODO: weight previous electors more heavily to encourage continuity
  consensusProofPeers.map(id => {
    if(id in aggregate) {
      aggregate[id].weight = 3;
    } else {
      aggregate[id] = {id, weight: 2};
    }
  });

  // apply a configurable filter on the peer IDs that are elector candidates
  const candidates = Object.values(aggregate);
  let electors = api.filterElectorCandidates(candidates);

  // a pattern that excludes all candidates produces an InvalidStateError
  if(electors.length === 0) {
    throw new BedrockError(
      'No available elector candidates. Invalid electorCandidateFilterPattern.',
      'InvalidStateError', {
        candidates,
        electorCandidateFilterPattern:
          cfg.electorCandidateFilterPattern.toString()
      }
    );
  }

  // get elector count, defaulting to MAX_ELECTOR_COUNT if not set
  // (hardcoded, all nodes must do the same thing -- but ideally this would
  // *always* be set)
  const electorCount = ledgerConfiguration.electorCount ||
    _continuityConstants.MAX_ELECTOR_COUNT;

  // TODO: could optimize by only sorting tied electors if helpful
  /*
  // fill positions
  let idx = -1;
  for(let i = 0; i < electorCount; ++i) {
    if(electors[i].weight > electors[i + 1].weight) {
      idx = i;
    }
  }
  // fill positions with non-tied electors
  const positions = electors.slice(0, idx + 1);
  if(positions.length < electorCount) {
    // get tied electors
    const tied = electors.filter(
      e => e.weight === electors[idx + 1].weight);
    // TODO: sort tied electors
  }
  }*/

  const {blockHash} = latestBlockSummary.eventBlock.meta;
  const baseHashBuffer = Buffer.from(blockHash);

  // break ties via sorting
  electors.sort((a, b) => {
    // 1. sort descending by weight
    if(a.weight !== b.weight) {
      // FIXME: with current weights, this prevents elector cycling
      //   if commented out, will force elector cycling, needs adjustment
      return b.weight - a.weight;
    }

    // generate and cache hashes
    // the hash of the previous block is combined with the elector id to
    // prevent any elector from *always* being sorted to the top
    a._hashBuffer = a._hashBuffer || xor(baseHashBuffer, Buffer.from(a.id));
    b._hashBuffer = b._hashBuffer || xor(baseHashBuffer, Buffer.from(b.id));

    // 2. sort by hash
    return Buffer.compare(a._hashBuffer, b._hashBuffer);
  });

  // select first `electorCount` electors
  electors = electors.slice(0, electorCount);

  // TODO: if there were no electors chosen or insufficient electors,
  // add electors from config

  electors.map(e => {
    // only include `id` and `sameAs`
    const elector = {id: e.id};
    if(e.sameAs) {
      elector.sameAs = e.sameAs;
    }
    return elector;
  });

  // reduce electors to highest multiple of `3f + 1`, i.e.
  // `electors.length % 3 === 1` or electors < 4 ... electors MUST be a
  // multiple of `3f + 1` for BFT or 1 for trivial dictator case
  while(electors.length > 1 && (electors.length % 3 !== 1)) {
    electors.pop();
  }

  logger.verbose(
    'Selected Electors:', {ledgerNode: ledgerNode.id, blockHeight, electors});

  return {electors};
};
