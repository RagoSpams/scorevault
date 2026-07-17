// SPDX-License-Identifier: Apache-2.0

import { createLogger } from '../logger-utils.js';
import { run } from '../assessment-index.js';
import { AssessmentStandaloneConfig } from '../config.js';

const config = new AssessmentStandaloneConfig();
const logger = await createLogger(config.logDir);
const testEnvironment = config.getEnvironment(logger);
await run(config, testEnvironment, logger);
