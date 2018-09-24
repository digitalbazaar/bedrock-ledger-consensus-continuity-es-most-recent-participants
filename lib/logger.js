/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');

module.exports =
  bedrock.loggers.get('app').child(
    'bedrock-ledger-consensus-continuity-es-most-recent-participants');
