/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiSpacer,
} from '@elastic/eui';
import React, { useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { orderBy } from 'lodash';
import { useApmParams } from '../../../hooks/use_apm_params';
import { asInteger } from '../../../../common/utils/formatters';
import { APM_STATIC_DATA_VIEW_ID } from '../../../../common/data_view_constants';
import type { ApmEvent } from '../../../../server/routes/diagnostics/bundle/get_apm_events';
import { useDiagnosticsContext } from './context/use_diagnostics';
import { ApmPluginStartDeps } from '../../../plugin';
import { SearchBar } from '../../shared/search_bar/search_bar';

export function DiagnosticsApmDocuments() {
  const { diagnosticsBundle, isImported } = useDiagnosticsContext();
  const { discover } = useKibana<ApmPluginStartDeps>().services;
  const [sortField, setSortField] = useState<keyof ApmEvent>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const {
    query: { rangeFrom, rangeTo },
  } = useApmParams('/diagnostics/documents');

  const items = diagnosticsBundle?.apmEvents ?? [];
  const columns: Array<EuiBasicTableColumn<ApmEvent>> = [
    {
      name: 'Name',
      field: 'name',
      width: '40%',
    },
    {
      name: 'Doc count',
      field: 'docCount',
      render: (_, { docCount }) => asInteger(docCount),
      sortable: true,
    },
    {
      name: '1m',
      field: 'intervals.1m',
      render: (_, { intervals }) => {
        const interval = intervals?.['1m'];
        return interval ? asInteger(interval) : '-';
      },
    },
    {
      name: '10m',
      field: 'intervals.10m',
      render: (_, { intervals }) => {
        const interval = intervals?.['10m'];
        return interval ? asInteger(interval) : '-';
      },
    },
    {
      name: '60m',
      field: 'intervals.60m',
      render: (_, { intervals }) => {
        const interval = intervals?.['60m'];
        return interval ? asInteger(interval) : '-';
      },
    },
    {
      name: 'Actions',
      actions: [
        {
          name: 'View',
          description: 'View in Discover',
          type: 'icon',
          icon: 'discoverApp',
          onClick: async (item) => {
            await discover?.locator?.navigate({
              query: {
                language: 'kuery',
                query: item.kuery,
              },
              dataViewId: APM_STATIC_DATA_VIEW_ID,
              timeRange:
                rangeTo && rangeFrom
                  ? {
                      to: rangeTo,
                      from: rangeFrom,
                    }
                  : undefined,
            });
          },
        },
      ],
    },
  ];

  return (
    <>
      {isImported && diagnosticsBundle ? (
        <>
          <EuiBadge>
            From: {new Date(diagnosticsBundle.params.start).toISOString()}
          </EuiBadge>
          <EuiBadge>
            To: {new Date(diagnosticsBundle.params.end).toISOString()}
          </EuiBadge>
          <EuiBadge>
            Filter: {diagnosticsBundle?.params.kuery ?? <em>Empty</em>}
          </EuiBadge>
          <EuiSpacer />
        </>
      ) : (
        <SearchBar />
      )}

      <EuiBasicTable
        data-test-subj="documents-table"
        items={orderBy(items, sortField, sortDirection)}
        sorting={{
          enableAllColumns: true,
          sort: {
            direction: sortDirection,
            field: sortField,
          },
        }}
        rowHeader="firstName"
        columns={columns}
        onChange={({ sort }) => {
          if (sort) {
            setSortField(sort.field);
            setSortDirection(sort.direction);
          }
        }}
      />
    </>
  );
}
