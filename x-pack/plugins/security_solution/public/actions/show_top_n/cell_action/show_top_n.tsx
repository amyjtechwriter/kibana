/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import ReactDOM, { unmountComponentAtNode } from 'react-dom';
import type { History } from 'history';
import { Provider } from 'react-redux';
import { Router } from '@kbn/shared-ux-router';
import { i18n } from '@kbn/i18n';
import { createCellActionFactory, type CellActionTemplate } from '@kbn/cell-actions';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { KibanaContextProvider } from '../../../common/lib/kibana';
import { APP_NAME, DEFAULT_DARK_MODE } from '../../../../common/constants';
import type { SecurityAppStore } from '../../../common/store';
import { fieldHasCellActions } from '../../utils';
import { TopNAction } from '../show_top_n_component';
import type { StartServices } from '../../../types';
import type { SecurityCellAction } from '../../types';
import { SecurityCellActionType } from '../../constants';

const SHOW_TOP = (fieldName: string) =>
  i18n.translate('xpack.securitySolution.actions.showTopTooltip', {
    values: { fieldName },
    defaultMessage: `Show top {fieldName}`,
  });

const ICON = 'visBarVertical';
const UNSUPPORTED_FIELD_TYPES = [ES_FIELD_TYPES.DATE, ES_FIELD_TYPES.TEXT];

export const createShowTopNCellActionFactory = createCellActionFactory(
  ({
    store,
    history,
    services,
  }: {
    store: SecurityAppStore;
    history: History;
    services: StartServices;
  }): CellActionTemplate<SecurityCellAction> => ({
    type: SecurityCellActionType.SHOW_TOP_N,
    getIconType: () => ICON,
    getDisplayName: ({ data }) => SHOW_TOP(data[0]?.field.name),
    getDisplayNameTooltip: ({ data }) => SHOW_TOP(data[0]?.field.name),
    isCompatible: async ({ data }) => {
      const field = data[0]?.field;

      return (
        data.length === 1 &&
        fieldHasCellActions(field.name) &&
        (field.esTypes ?? []).every(
          (esType) => !UNSUPPORTED_FIELD_TYPES.includes(esType as ES_FIELD_TYPES)
        ) &&
        !!field.aggregatable
      );
    },
    execute: async (context) => {
      if (!context.nodeRef.current) return;

      const node = document.createElement('div');
      document.body.appendChild(node);

      const onClose = () => {
        unmountComponentAtNode(node);
        document.body.removeChild(node);
      };

      const element = (
        <KibanaContextProvider
          services={{
            appName: APP_NAME,
            ...services,
          }}
        >
          <EuiThemeProvider darkMode={services.uiSettings.get(DEFAULT_DARK_MODE)}>
            <Provider store={store}>
              <Router history={history}>
                <TopNAction onClose={onClose} context={context} casesService={services.cases} />
              </Router>
            </Provider>
          </EuiThemeProvider>
        </KibanaContextProvider>
      );

      ReactDOM.render(element, node);
    },
  })
);
