/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, ChangeEvent } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { KibanaLogic } from '../../../shared/kibana';

import {
  AccessControlIndexSelector,
  AccessControlSelectorOption,
} from './components/access_control_index_selector/access_control_index_selector';
import { DocumentList } from './components/document_list/document_list';
import { DocumentsLogic, DEFAULT_PAGINATION } from './documents_logic';
import { IndexNameLogic } from './index_name_logic';
import { IndexViewLogic } from './index_view_logic';
import './documents.scss';

export const SearchIndexDocuments: React.FC = () => {
  const { indexName } = useValues(IndexNameLogic);
  const { ingestionMethod, hasDocumentLevelSecurityFeature } = useValues(IndexViewLogic);
  const { simplifiedMapping } = useValues(DocumentsLogic);
  const { makeRequest, makeMappingRequest, setSearchQuery } = useActions(DocumentsLogic);
  const { productFeatures } = useValues(KibanaLogic);

  const [selectedIndexType, setSelectedIndexType] =
    useState<AccessControlSelectorOption['value']>('content-index');
  const indexToShow =
    selectedIndexType === 'content-index'
      ? indexName
      : indexName.replace('search-', '.search-acl-filter-');

  const shouldShowAccessControlSwitcher =
    hasDocumentLevelSecurityFeature && productFeatures.hasDocumentLevelSecurityEnabled;

  useEffect(() => {
    makeRequest({
      indexName: indexToShow,
      pagination: DEFAULT_PAGINATION,
      query: '',
    });
    makeMappingRequest({ indexName: indexToShow });
  }, [indexToShow, indexName]);

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
      <EuiSpacer />
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFlexGroup direction="row" alignItems="center">
            <EuiFlexItem className="enterpriseSearchDocumentsHeader" grow={false}>
              <EuiTitle>
                <h2>
                  {i18n.translate('xpack.enterpriseSearch.content.searchIndex.documents.title', {
                    defaultMessage: 'Browse documents',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            {shouldShowAccessControlSwitcher && (
              <EuiFlexItem grow={false}>
                <AccessControlIndexSelector
                  onChange={setSelectedIndexType}
                  valueOfSelected={selectedIndexType}
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem>
              <EuiFieldSearch
                data-telemetry-id={`entSearchContent-${ingestionMethod}-documents-searchDocuments`}
                placeholder={i18n.translate(
                  'xpack.enterpriseSearch.content.searchIndex.documents.searchField.placeholder',
                  {
                    defaultMessage: 'Search documents in this index',
                  }
                )}
                isClearable
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setSearchQuery(event.target.value)
                }
                fullWidth
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          {!simplifiedMapping &&
            i18n.translate('xpack.enterpriseSearch.content.searchIndex.documents.noMappings', {
              defaultMessage: 'No documents found for index',
            })}
          {simplifiedMapping && <DocumentList />}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
