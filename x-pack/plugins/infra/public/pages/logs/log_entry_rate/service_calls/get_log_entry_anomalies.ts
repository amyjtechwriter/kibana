/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { PersistedLogViewReference } from '../../../../../common/log_views';
import {
  getLogEntryAnomaliesRequestPayloadRT,
  getLogEntryAnomaliesSuccessReponsePayloadRT,
  LOG_ANALYSIS_GET_LOG_ENTRY_ANOMALIES_PATH,
} from '../../../../../common/http_api';
import { decodeOrThrow } from '../../../../../common/runtime_types';
import { AnomaliesSort, Pagination } from '../../../../../common/log_analysis';

interface RequestArgs {
  logViewReference: PersistedLogViewReference;
  startTime: number;
  endTime: number;
  sort: AnomaliesSort;
  pagination: Pagination;
  datasets?: string[];
}

export const callGetLogEntryAnomaliesAPI = async (requestArgs: RequestArgs, fetch: HttpHandler) => {
  const { logViewReference, startTime, endTime, sort, pagination, datasets } = requestArgs;
  const response = await fetch(LOG_ANALYSIS_GET_LOG_ENTRY_ANOMALIES_PATH, {
    method: 'POST',
    body: JSON.stringify(
      getLogEntryAnomaliesRequestPayloadRT.encode({
        data: {
          logView: logViewReference,
          timeRange: {
            startTime,
            endTime,
          },
          sort,
          pagination,
          datasets,
        },
      })
    ),
    version: '1',
  });

  return decodeOrThrow(getLogEntryAnomaliesSuccessReponsePayloadRT)(response);
};
