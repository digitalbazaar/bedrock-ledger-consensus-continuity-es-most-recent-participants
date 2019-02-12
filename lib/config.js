/*!
 * Copyright (c) 2018-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');

const cfg = bedrock.config[
  'ledger-consensus-continuity-es-most-recent-participants'] = {};

/* eslint-disable max-len */
/*
 * If specified, only peer IDs that match the regex pattern may be selected
 * as electors.  Example with subdomain and optional port number:
 * /^https:\/\/[^\/.][^\/]*\.example\.com(:[0-9]+)?\/consensus\/continuity2017\/voters\//
 * Example with subdomain and without port number:
 * /^https:\/\/[^\/.][^\/]*\.example\.com\/consensus\/continuity2017\/voters\//
 * Example without subdomain and with optional port number:
 * /^https:\/\/bedrock\.localhost(:[0-9]+)?\/consensus\/continuity2017\/voters\//
 */
/* eslint-enable max-len */
cfg.electorCandidateFilterPattern = null;
