/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import {
  PluginConfigDescriptor,
  PluginInitializerContext,
} from '@kbn/core/server';
import { maxSuggestions } from '@kbn/observability-plugin/common';
import { SearchAggregatedTransactionSetting } from '../common/aggregated_transactions';
import { APMPlugin } from './plugin';

const disabledOnServerless = schema.conditional(
  schema.contextRef('serverless'),
  true,
  schema.boolean({
    defaultValue: false,
  }),
  schema.oneOf([schema.literal(true)], { defaultValue: true })
);

// All options should be documented in the APM configuration settings: https://github.com/elastic/kibana/blob/main/docs/settings/apm-settings.asciidoc
// and be included on cloud allow list unless there are specific reasons not to
const configSchema = schema.object({
  autoCreateApmDataView: schema.boolean({ defaultValue: true }),
  serviceMapEnabled: schema.boolean({ defaultValue: true }),
  serviceMapFingerprintBucketSize: schema.number({ defaultValue: 100 }),
  serviceMapFingerprintGlobalBucketSize: schema.number({
    defaultValue: 1000,
  }),
  serviceMapTraceIdBucketSize: schema.number({ defaultValue: 65 }),
  serviceMapTraceIdGlobalBucketSize: schema.number({ defaultValue: 6 }),
  serviceMapMaxTracesPerRequest: schema.number({ defaultValue: 50 }),
  serviceMapTerminateAfter: schema.number({ defaultValue: 100_000 }),
  serviceMapMaxTraces: schema.number({ defaultValue: 1000 }),
  ui: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    maxTraceItems: schema.number({ defaultValue: 5000 }),
  }),
  searchAggregatedTransactions: schema.oneOf(
    [
      schema.literal(SearchAggregatedTransactionSetting.auto),
      schema.literal(SearchAggregatedTransactionSetting.always),
      schema.literal(SearchAggregatedTransactionSetting.never),
    ],
    { defaultValue: SearchAggregatedTransactionSetting.auto }
  ),
  telemetryCollectionEnabled: schema.boolean({ defaultValue: true }),
  metricsInterval: schema.number({ defaultValue: 30 }),
  agent: schema.object({
    migrations: schema.object({
      enabled: schema.boolean({ defaultValue: false }),
    }),
  }),
  indices: schema.object({
    transaction: schema.string({ defaultValue: 'traces-apm*,apm-*' }),
    span: schema.string({ defaultValue: 'traces-apm*,apm-*' }),
    error: schema.string({ defaultValue: 'logs-apm*,apm-*' }),
    metric: schema.string({ defaultValue: 'metrics-apm*,apm-*' }),
    onboarding: schema.string({ defaultValue: 'apm-*' }),
  }),
  forceSyntheticSource: schema.boolean({ defaultValue: false }),
  latestAgentVersionsUrl: schema.string({
    defaultValue: 'https://apm-agent-versions.elastic.co/versions.json',
  }),
  enabled: schema.boolean({ defaultValue: true }),
  serverlessOnboarding: schema.conditional(
    schema.contextRef('serverless'),
    true,
    schema.boolean({ defaultValue: false }),
    schema.never()
  ),
  managedServiceUrl: schema.conditional(
    schema.contextRef('serverless'),
    true,
    schema.string({ defaultValue: '' }),
    schema.never()
  ),
  featureFlags: schema.object({
    agentConfigurationAvailable: disabledOnServerless,
    configurableIndicesAvailable: disabledOnServerless,
    infrastructureTabAvailable: disabledOnServerless,
    infraUiAvailable: disabledOnServerless,
    migrationToFleetAvailable: disabledOnServerless,
    sourcemapApiAvailable: disabledOnServerless,
    storageExplorerAvailable: disabledOnServerless,
  }),
});

// plugin config
export const config: PluginConfigDescriptor<APMConfig> = {
  deprecations: ({
    rename,
    unused,
    renameFromRoot,
    deprecateFromRoot,
    unusedFromRoot,
  }) => [
    unused('indices.sourcemap', { level: 'warning' }),
    unused('ui.transactionGroupBucketSize', {
      level: 'warning',
    }),
    rename('autocreateApmIndexPattern', 'autoCreateApmDataView', {
      level: 'warning',
    }),
    renameFromRoot(
      'apm_oss.transactionIndices',
      'xpack.apm.indices.transaction',
      { level: 'warning' }
    ),
    renameFromRoot('apm_oss.spanIndices', 'xpack.apm.indices.span', {
      level: 'warning',
    }),
    renameFromRoot('apm_oss.errorIndices', 'xpack.apm.indices.error', {
      level: 'warning',
    }),
    renameFromRoot('apm_oss.metricsIndices', 'xpack.apm.indices.metric', {
      level: 'warning',
    }),
    renameFromRoot('apm_oss.sourcemapIndices', 'xpack.apm.indices.sourcemap', {
      level: 'warning',
    }),
    renameFromRoot(
      'apm_oss.onboardingIndices',
      'xpack.apm.indices.onboarding',
      { level: 'warning' }
    ),
    deprecateFromRoot('apm_oss.enabled', '8.0.0', { level: 'warning' }),
    unusedFromRoot('apm_oss.fleetMode', { level: 'warning' }),
    unusedFromRoot('apm_oss.indexPattern', { level: 'warning' }),
    renameFromRoot(
      'xpack.apm.maxServiceEnvironments',
      `uiSettings.overrides[${maxSuggestions}]`,
      { level: 'warning' }
    ),
    renameFromRoot(
      'xpack.apm.maxServiceSelection',
      `uiSettings.overrides[${maxSuggestions}]`,
      { level: 'warning' }
    ),
  ],
  exposeToBrowser: {
    serviceMapEnabled: true,
    ui: true,
    latestAgentVersionsUrl: true,
    managedServiceUrl: true,
    serverlessOnboarding: true,
    featureFlags: true,
  },
  schema: configSchema,
};

export type APMConfig = TypeOf<typeof configSchema>;
export type ApmIndicesConfigName = keyof APMConfig['indices'];

export const plugin = (initContext: PluginInitializerContext) =>
  new APMPlugin(initContext);

export { APM_SERVER_FEATURE_ID } from '../common/rules/apm_rule_types';
export { APMPlugin } from './plugin';
export type { APMPluginSetup } from './types';
export type {
  APMServerRouteRepository,
  APIEndpoint,
} from './routes/apm_routes/get_global_apm_server_route_repository';
export type { APMRouteHandlerResources } from './routes/typings';
