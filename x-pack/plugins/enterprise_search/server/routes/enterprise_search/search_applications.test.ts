/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockDependencies, MockRouter } from '../../__mocks__';

jest.mock('../../lib/search_applications/field_capabilities', () => ({
  fetchSearchApplicationFieldCapabilities: jest.fn(),
}));
jest.mock('../../lib/search_applications/fetch_indices_stats', () => ({
  fetchIndicesStats: jest.fn(),
}));
import { RequestHandlerContext } from '@kbn/core/server';

import { fetchIndicesStats } from '../../lib/search_applications/fetch_indices_stats';
import { fetchSearchApplicationFieldCapabilities } from '../../lib/search_applications/field_capabilities';

import { registerSearchApplicationsRoutes } from './search_applications';

describe('engines routes', () => {
  describe('GET /internal/enterprise_search/search_applications', () => {
    let mockRouter: MockRouter;

    const mockClient = {
      asCurrentUser: {
        searchApplication: {
          list: jest.fn(),
        },
      },
    };
    beforeEach(() => {
      jest.clearAllMocks();
      const context = {
        core: Promise.resolve({ elasticsearch: { client: mockClient } }),
      } as unknown as jest.Mocked<RequestHandlerContext>;

      mockRouter = new MockRouter({
        context,
        method: 'get',
        path: '/internal/enterprise_search/search_applications',
      });
      registerSearchApplicationsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('GET search applications API creates request', async () => {
      mockClient.asCurrentUser.searchApplication.list.mockImplementation(() => ({}));
      const request = { query: {} };
      await mockRouter.callRoute({});
      expect(mockClient.asCurrentUser.searchApplication.list).toHaveBeenCalledWith(request.query);
      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: {},
      });
    });

    it('validates query parameters', () => {
      const request = { query: { from: 20, size: 20 } };

      mockRouter.shouldValidate(request);
    });

    it('fails validation with invalid from parameter', () => {
      const request = { query: { from: -10 } };

      mockRouter.shouldThrow(request);
    });

    it('fails validation with invalid size parameter', () => {
      const request = { query: { size: 0 } };

      mockRouter.shouldThrow(request);
    });
  });

  describe('GET /internal/enterprise_search/search_applications/{engine_name}', () => {
    let mockRouter: MockRouter;
    const mockClient = {
      asCurrentUser: {
        searchApplication: {
          get: jest.fn(),
        },
      },
    };
    beforeEach(() => {
      jest.clearAllMocks();
      const context = {
        core: Promise.resolve({ elasticsearch: { client: mockClient } }),
      } as unknown as jest.Mocked<RequestHandlerContext>;

      mockRouter = new MockRouter({
        context,
        method: 'get',
        path: '/internal/enterprise_search/search_applications/{engine_name}',
      });

      registerSearchApplicationsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('GET search application API creates request', async () => {
      mockClient.asCurrentUser.searchApplication.get.mockImplementation(() => ({}));
      await mockRouter.callRoute({
        params: { engine_name: 'engine-name' },
      });

      expect(mockClient.asCurrentUser.searchApplication.get).toHaveBeenCalledWith({
        name: 'engine-name',
      });
      const mock = jest.fn();

      const fetchIndicesStatsResponse = [
        { count: 5, health: 'green', name: 'test-index-name-1' },
        { count: 10, health: 'yellow', name: 'test-index-name-2' },
        { count: 0, health: 'red', name: 'test-index-name-3' },
      ];
      const engineResult = {
        indices: mock(['test-index-name-1', 'test-index-name-2', 'test-index-name-3']),
        name: 'test-engine-1',
        updated_at_millis: 1679847286355,
      };

      (fetchIndicesStats as jest.Mock).mockResolvedValueOnce(fetchIndicesStatsResponse);
      expect(fetchIndicesStats).toHaveBeenCalledWith(mockClient, engineResult.indices);

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: {},
      });
    });

    it('validates correctly with engine_name', () => {
      const request = { params: { engine_name: 'some-engine' } };

      mockRouter.shouldValidate(request);
    });

    it('fails validation without name', () => {
      const request = { params: {} };

      mockRouter.shouldThrow(request);
    });
  });

  describe('PUT /internal/enterprise_search/search_applications/{engine_name}', () => {
    let mockRouter: MockRouter;
    const mockClient = {
      asCurrentUser: {
        searchApplication: {
          put: jest.fn(),
        },
      },
    };
    beforeEach(() => {
      jest.clearAllMocks();
      const context = {
        core: Promise.resolve({ elasticsearch: { client: mockClient } }),
      } as unknown as jest.Mocked<RequestHandlerContext>;

      mockRouter = new MockRouter({
        context,
        method: 'put',
        path: '/internal/enterprise_search/search_applications/{engine_name}',
      });

      registerSearchApplicationsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('PUT - Upsert API creates request - create', async () => {
      mockClient.asCurrentUser.searchApplication.put.mockImplementation(() => ({
        acknowledged: true,
      }));

      await mockRouter.callRoute({
        body: {
          indices: ['test-indices-1'],
        },
        params: {
          engine_name: 'engine-name',
        },
        query: { create: true },
      });
      expect(mockClient.asCurrentUser.searchApplication.put).toHaveBeenCalledWith({
        create: true,
        name: 'engine-name',
        search_application: {
          indices: ['test-indices-1'],
          name: 'engine-name',
          updated_at_millis: expect.any(Number),
        },
      });
      const mock = jest.fn();
      const mockResponse = mock({ result: 'created' });
      expect(mockRouter.response.ok).toHaveReturnedWith(mockResponse);
      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: {
          acknowledged: true,
        },
      });
    });
    it('PUT - Upsert API creates request - update', async () => {
      mockClient.asCurrentUser.searchApplication.put.mockImplementation(() => ({
        acknowledged: true,
      }));

      await mockRouter.callRoute({
        body: {
          indices: ['test-indices-1'],
        },
        params: {
          engine_name: 'engine-name',
        },
      });
      expect(mockClient.asCurrentUser.searchApplication.put).toHaveBeenCalledWith({
        name: 'engine-name',
        search_application: {
          indices: ['test-indices-1'],
          name: 'engine-name',
          updated_at_millis: expect.any(Number),
        },
      });
      const mock = jest.fn();
      const mockResponse = mock({ result: 'updated' });
      expect(mockRouter.response.ok).toHaveReturnedWith(mockResponse);
      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: {
          acknowledged: true,
        },
      });
    });

    it('validates correctly with engine_name', () => {
      const request = {
        body: { indices: ['search-unit-test'] },
        params: { engine_name: 'some-engine' },
      };

      mockRouter.shouldValidate(request);
    });

    it('fails validation without name', () => {
      const request = { params: {} };

      mockRouter.shouldThrow(request);
    });

    it('fails validation without indices', () => {
      const request = {
        body: {
          name: 'some-engine',
        },
        params: { engine_name: 'some-engine' },
      };

      mockRouter.shouldThrow(request);
    });

    it('returns 409 when upsert create search application throws error', async () => {
      (mockClient.asCurrentUser.searchApplication.put as jest.Mock).mockRejectedValueOnce({
        meta: {
          body: {
            error: {
              type: 'version_conflict_engine_exception',
            },
          },
          statusCode: 409,
        },
        name: 'elasticsearch-js',
      });
      await mockRouter.callRoute({
        params: { engine_name: 'engine-name' },
      });
      expect(mockRouter.response.customError).toHaveBeenCalledWith({
        body: {
          attributes: {
            error_code: 'search_application_already_exists',
          },
          message: 'Search application name already taken. Choose another name.',
        },
        statusCode: 409,
      });
    });
  });

  describe('DELETE /internal/enterprise_search/search_applications/{engine_name}', () => {
    let mockRouter: MockRouter;
    const mockClient = {
      asCurrentUser: {
        searchApplication: {
          delete: jest.fn(),
        },
      },
    };
    beforeEach(() => {
      jest.clearAllMocks();
      const context = {
        core: Promise.resolve({ elasticsearch: { client: mockClient } }),
      } as unknown as jest.Mocked<RequestHandlerContext>;

      mockRouter = new MockRouter({
        context,
        method: 'delete',
        path: '/internal/enterprise_search/search_applications/{engine_name}',
      });

      registerSearchApplicationsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('Delete API creates request', async () => {
      mockClient.asCurrentUser.searchApplication.delete.mockImplementation(() => ({
        acknowledged: true,
      }));

      await mockRouter.callRoute({
        params: {
          engine_name: 'engine-name',
        },
      });
      expect(mockClient.asCurrentUser.searchApplication.delete).toHaveBeenCalledWith({
        name: 'engine-name',
      });
      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: {
          acknowledged: true,
        },
      });
    });

    it('validates correctly with engine_name', () => {
      const request = { params: { engine_name: 'some-engine' } };

      mockRouter.shouldValidate(request);
    });

    it('fails validation without name', () => {
      const request = { params: {} };

      mockRouter.shouldThrow(request);
    });
  });

  describe('POST /internal/enterprise_search/search_applications/{engine_name}/search', () => {
    let mockRouter: MockRouter;
    const mockClient = {
      asCurrentUser: {
        search: jest.fn(),
      },
    };
    beforeEach(() => {
      jest.clearAllMocks();
      const context = {
        core: Promise.resolve({ elasticsearch: { client: mockClient } }),
      } as unknown as jest.Mocked<RequestHandlerContext>;

      mockRouter = new MockRouter({
        context,
        method: 'post',
        path: '/internal/enterprise_search/search_applications/{engine_name}/search',
      });

      registerSearchApplicationsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });
    it('POST - Search preview API creates a request', async () => {
      mockClient.asCurrentUser.search.mockImplementation(() => ({
        acknowledged: true,
      }));

      await mockRouter.callRoute({
        params: {
          engine_name: 'engine-name',
        },
      });
      expect(mockClient.asCurrentUser.search).toHaveBeenCalledWith({
        index: 'engine-name',
      });
      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: {
          acknowledged: true,
        },
      });
    });

    it('validates correctly with engine_name and pagination', () => {
      const request = {
        body: {
          fields: ['test-field-1', 'test-field-2'],
          query: 'test-query',
        },
        params: {
          engine_name: 'some-engine',
          from: 0,
          size: 10,
        },
      };

      mockRouter.shouldValidate(request);
    });

    it('validates correctly with default pagination and no body', () => {
      const request = {
        params: {
          engine_name: 'my-test-engine',
        },
      };

      mockRouter.shouldValidate(request);
    });

    it('validation with query and without fields', () => {
      const request = {
        body: {
          fields: [],
          query: 'sample-query',
        },
        params: {
          engine_name: 'my-test-engine',
        },
      };
      mockRouter.shouldValidate(request);
    });

    it('fails validation without engine name', () => {
      const request = { params: {} };

      mockRouter.shouldThrow(request);
    });
  });

  describe('GET /internal/enterprise_search/search_applications/{engine_name}/field_capabilities', () => {
    let mockRouter: MockRouter;
    const mockClient = {
      asCurrentUser: { searchApplication: { get: jest.fn() } },
    };
    const mockCore = {
      elasticsearch: { client: mockClient },
      savedObjects: { client: {} },
    };

    beforeEach(() => {
      jest.clearAllMocks();

      const context = {
        core: Promise.resolve(mockCore),
      } as unknown as jest.Mocked<RequestHandlerContext>;

      mockRouter = new MockRouter({
        context,
        method: 'get',
        path: '/internal/enterprise_search/search_applications/{engine_name}/field_capabilities',
      });

      registerSearchApplicationsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('fetches engine fields', async () => {
      const engineResult = {
        created: '1999-12-31T23:59:59.999Z',
        indices: [],
        name: 'unit-test',
        updated: '1999-12-31T23:59:59.999Z',
      };
      const fieldCapabilitiesResult = {
        name: 'unit-test',
      };

      (mockClient.asCurrentUser.searchApplication.get as jest.Mock).mockResolvedValueOnce(
        engineResult
      );
      (fetchSearchApplicationFieldCapabilities as jest.Mock).mockResolvedValueOnce(
        fieldCapabilitiesResult
      );

      await mockRouter.callRoute({
        params: { engine_name: 'unit-test' },
      });

      expect(mockClient.asCurrentUser.searchApplication.get).toHaveBeenCalledWith({
        name: 'unit-test',
      });
      expect(fetchSearchApplicationFieldCapabilities).toHaveBeenCalledWith(
        mockClient,
        engineResult
      );
      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: fieldCapabilitiesResult,
        headers: { 'content-type': 'application/json' },
      });
    });
    it('returns 404 when fetch engine throws a not found exception', async () => {
      (mockClient.asCurrentUser.searchApplication.get as jest.Mock).mockRejectedValueOnce({
        meta: {
          body: {
            error: {
              type: 'resource_not_found_exception',
            },
          },
          statusCode: 404,
        },
        name: 'ResponseError',
      });
      await mockRouter.callRoute({
        params: { engine_name: 'unit-test' },
      });

      expect(mockRouter.response.customError).toHaveBeenCalledWith({
        body: {
          attributes: {
            error_code: 'engine_not_found',
          },
          message: 'Could not find engine',
        },
        statusCode: 404,
      });
    });
    it('returns error when fetch engine returns an unknown error', async () => {
      (mockClient.asCurrentUser.searchApplication.get as jest.Mock).mockRejectedValueOnce({
        body: {
          attributes: {
            error_code: 'unknown_error',
          },
          message: 'Unknown error',
        },
        statusCode: 500,
      });
      await mockRouter.callRoute({
        params: { engine_name: 'unit-test' },
      });

      expect(mockRouter.response.customError).toHaveBeenCalledWith({
        body: {
          attributes: {
            error_code: 'uncaught_exception',
          },
          message: 'Enterprise Search encountered an error. Check Kibana Server logs for details.',
        },
        statusCode: 502,
      });
    });
  });
});
