/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { SUPPORTED_KBN_TYPES } from './constants';

export const isTypeSupportedByCellActions = (kbnFieldType: KBN_FIELD_TYPES) =>
  SUPPORTED_KBN_TYPES.includes(kbnFieldType);
