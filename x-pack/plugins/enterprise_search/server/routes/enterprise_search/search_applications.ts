/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SearchResponse, AcknowledgedResponseBase } from '@elastic/elasticsearch/lib/api/types';
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';

import { ErrorCode } from '../../../common/types/error_codes';
import {
  EnterpriseSearchApplication,
  EnterpriseSearchApplicationsResponse,
  EnterpriseSearchApplicationUpsertResponse,
} from '../../../common/types/search_applications';
import { createApiKey } from '../../lib/search_applications/create_api_key';
import { fetchIndicesStats } from '../../lib/search_applications/fetch_indices_stats';

import { fetchSearchApplicationFieldCapabilities } from '../../lib/search_applications/field_capabilities';
import { RouteDependencies } from '../../plugin';

import { createError } from '../../utils/create_error';
import { elasticsearchErrorHandler } from '../../utils/elasticsearch_error_handler';
import {
  isNotFoundException,
  isVersionConflictEngineException,
} from '../../utils/identify_exceptions';

export function registerSearchApplicationsRoutes({ log, router }: RouteDependencies) {
  router.get(
    {
      path: '/internal/enterprise_search/search_applications',
      validate: {
        query: schema.object({
          from: schema.number({ defaultValue: 0, min: 0 }),
          q: schema.maybe(schema.string()),
          size: schema.number({ defaultValue: 10, min: 1 }),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const engines = (await client.asCurrentUser.searchApplication.list(
        request.query
      )) as EnterpriseSearchApplicationsResponse;

      return response.ok({ body: engines });
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/search_applications/{engine_name}',
      validate: {
        params: schema.object({
          engine_name: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const engine = (await client.asCurrentUser.searchApplication.get({
        name: request.params.engine_name,
      })) as EnterpriseSearchApplication;
      const indicesStats = await fetchIndicesStats(client, engine.indices);

      return response.ok({ body: { ...engine, indices: indicesStats } });
    })
  );

  router.put(
    {
      path: '/internal/enterprise_search/search_applications/{engine_name}',
      validate: {
        body: schema.object({
          indices: schema.arrayOf(schema.string()),
          name: schema.maybe(schema.string()),
        }),
        params: schema.object({
          engine_name: schema.string(),
        }),
        query: schema.object({
          create: schema.maybe(schema.boolean()),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      try {
        const engine = (await client.asCurrentUser.searchApplication.put({
          ...request.query,
          name: request.params.engine_name,
          search_application: {
            indices: request.body.indices,
            name: request.params.engine_name,
            updated_at_millis: Date.now(),
          },
        })) as EnterpriseSearchApplicationUpsertResponse;

        return response.ok({ body: engine });
      } catch (error) {
        if (isVersionConflictEngineException(error)) {
          return createError({
            errorCode: ErrorCode.SEARCH_APPLICATION_ALREADY_EXISTS,
            message: i18n.translate(
              'xpack.enterpriseSearch.server.routes.createSearchApplication.searchApplciationExistsError',
              {
                defaultMessage: 'Search application name already taken. Choose another name.',
              }
            ),
            response,
            statusCode: 409,
          });
        }

        throw error;
      }
    })
  );

  router.delete(
    {
      path: '/internal/enterprise_search/search_applications/{engine_name}',
      validate: {
        params: schema.object({
          engine_name: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const engine = (await client.asCurrentUser.searchApplication.delete({
        name: request.params.engine_name,
      })) as AcknowledgedResponseBase;

      return response.ok({ body: engine });
    })
  );

  router.post(
    {
      path: '/internal/enterprise_search/search_applications/{engine_name}/search',
      validate: {
        body: schema.object({}, { unknowns: 'allow' }),
        params: schema.object({
          engine_name: schema.string(),
          from: schema.maybe(schema.number()),
          size: schema.maybe(schema.number()),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const engines = await client.asCurrentUser.search<SearchResponse>({
        ...request.body,
        index: request.params.engine_name,
      });
      return response.ok({ body: engines });
    })
  );
  router.post(
    {
      path: '/internal/enterprise_search/search_applications/{engine_name}/api_key',
      validate: {
        body: schema.object({
          keyName: schema.string(),
        }),
        params: schema.object({
          engine_name: schema.string(),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const engineName = decodeURIComponent(request.params.engine_name);
      const { keyName } = request.body;
      const { client } = (await context.core).elasticsearch;

      const apiKey = await createApiKey(client, engineName, keyName);

      return response.ok({
        body: { apiKey },
        headers: { 'content-type': 'application/json' },
      });
    })
  );
  router.get(
    {
      path: '/internal/enterprise_search/search_applications/{engine_name}/field_capabilities',
      validate: { params: schema.object({ engine_name: schema.string() }) },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      try {
        const { client } = (await context.core).elasticsearch;

        const engine = (await client.asCurrentUser.searchApplication.get({
          name: request.params.engine_name,
        })) as EnterpriseSearchApplication;

        const data = await fetchSearchApplicationFieldCapabilities(client, engine);
        return response.ok({
          body: data,
          headers: { 'content-type': 'application/json' },
        });
      } catch (e) {
        if (isNotFoundException(e)) {
          return createError({
            errorCode: ErrorCode.ENGINE_NOT_FOUND,
            message: 'Could not find engine',
            response,
            statusCode: 404,
          });
        }
        throw e;
      }
    })
  );
}
