// SPDX-License-Identifier: Apache-2.0

/*
 * Starts the local standalone network (node + indexer + proof server via
 * Docker, same compose setup the e2e test suite uses) and keeps it running
 * indefinitely, printing its connection info once ready. This is the
 * long-lived fallback demo environment: unlike the e2e test or the
 * interactive assessment-standalone CLI, this never calls testEnv.shutdown(),
 * so the containers stay up for the browser app to connect to.
 *
 * Stop with Ctrl+C (or kill the process) when the containers are no longer
 * needed - Docker won't clean itself up otherwise.
 */

import { createLogger } from '../logger-utils.js';
import { AssessmentStandaloneConfig } from '../config.js';

const config = new AssessmentStandaloneConfig();
const logger = await createLogger(config.logDir);
const testEnvironment = config.getEnvironment(logger);
const envConfiguration = await testEnvironment.start();

logger.info(`STANDALONE_NETWORK_READY ${JSON.stringify(envConfiguration)}`);
logger.info('Network is up and will keep running until this process is stopped.');

// A live timer (rather than an unsettled top-level await) keeps the event
// loop - and this process - alive indefinitely without Node flagging it as
// a stuck/unsettled top-level await and force-exiting.
setInterval(() => {
  logger.debug('standalone network keepalive heartbeat');
}, 60_000);
