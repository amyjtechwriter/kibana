/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { SavedObjectsClientContract, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { SyntheticsServerSetup } from '../../types';
import { RouteContext, SyntheticsRestApiRouteFactory } from '../types';
import { syntheticsMonitorType } from '../../../common/types/saved_objects';
import {
  ConfigKey,
  EncryptedSyntheticsMonitor,
  MonitorFields,
  SyntheticsMonitorWithId,
  SyntheticsMonitorWithSecrets,
} from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { getMonitorNotFoundResponse } from '../synthetics_service/service_errors';
import {
  formatTelemetryDeleteEvent,
  sendErrorTelemetryEvents,
  sendTelemetryEvents,
} from '../telemetry/monitor_upgrade_sender';
import { formatSecrets, normalizeSecrets } from '../../synthetics_service/utils/secrets';

export const deleteSyntheticsMonitorRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'DELETE',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/{monitorId}',
  validate: {
    params: schema.object({
      monitorId: schema.string({ minLength: 1, maxLength: 1024 }),
    }),
  },
  writeAccess: true,
  handler: async (routeContext): Promise<any> => {
    const { request, response } = routeContext;
    const { monitorId } = request.params;

    try {
      const errors = await deleteMonitor({
        routeContext,
        monitorId,
      });

      if (errors && errors.length > 0) {
        return response.ok({
          body: { message: 'error pushing monitor to the service', attributes: { errors } },
        });
      }

      return monitorId;
    } catch (getErr) {
      if (SavedObjectsErrorHelpers.isNotFoundError(getErr)) {
        return getMonitorNotFoundResponse(response, monitorId);
      }

      throw getErr;
    }
  },
});

export const deleteMonitor = async ({
  routeContext,
  monitorId,
}: {
  routeContext: RouteContext;
  monitorId: string;
}) => {
  const { savedObjectsClient, server, syntheticsMonitorClient, request } = routeContext;
  const { logger, telemetry, stackVersion } = server;

  const { monitor, monitorWithSecret } = await getMonitorToDelete(
    monitorId,
    savedObjectsClient,
    server
  );

  let deletePromise;

  try {
    const spaceId = server.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
    deletePromise = savedObjectsClient.delete(syntheticsMonitorType, monitorId);

    const deleteSyncPromise = syntheticsMonitorClient.deleteMonitors(
      [
        {
          ...monitor.attributes,
          id: (monitor.attributes as MonitorFields)[ConfigKey.MONITOR_QUERY_ID],
        },
        /* Type cast encrypted saved objects to decrypted saved objects for delete flow only.
         * Deletion does not require all monitor fields */
      ] as SyntheticsMonitorWithId[],
      request,
      savedObjectsClient,
      spaceId
    );

    const [errors] = await Promise.all([deleteSyncPromise, deletePromise]).catch((e) => {
      server.logger.error(e);
      throw e;
    });

    sendTelemetryEvents(
      logger,
      telemetry,
      formatTelemetryDeleteEvent(
        monitor,
        stackVersion,
        new Date().toISOString(),
        Boolean((monitor.attributes as MonitorFields)[ConfigKey.SOURCE_INLINE]),
        errors
      )
    );

    return errors;
  } catch (e) {
    if (deletePromise) {
      await deletePromise;
    }
    server.logger.error(
      `Unable to delete Synthetics monitor ${monitor.attributes[ConfigKey.NAME]}`
    );

    if (monitorWithSecret) {
      await restoreDeletedMonitor({
        monitorId,
        normalizedMonitor: formatSecrets({
          ...monitorWithSecret.attributes,
        }),
        savedObjectsClient,
      });
    }
    throw e;
  }
};

const getMonitorToDelete = async (
  monitorId: string,
  soClient: SavedObjectsClientContract,
  server: SyntheticsServerSetup
) => {
  const encryptedSOClient = server.encryptedSavedObjects.getClient();

  try {
    const monitor =
      await encryptedSOClient.getDecryptedAsInternalUser<SyntheticsMonitorWithSecrets>(
        syntheticsMonitorType,
        monitorId
      );
    return { monitor: normalizeSecrets(monitor), monitorWithSecret: normalizeSecrets(monitor) };
  } catch (e) {
    server.logger.error(`Failed to decrypt monitor to delete ${monitorId}${e}`);
    sendErrorTelemetryEvents(server.logger, server.telemetry, {
      reason: `Failed to decrypt monitor to delete ${monitorId}`,
      message: e?.message,
      type: 'deletionError',
      code: e?.code,
      status: e.status,
      stackVersion: server.stackVersion,
    });
  }

  const monitor = await soClient.get<EncryptedSyntheticsMonitor>(syntheticsMonitorType, monitorId);
  return { monitor, withSecrets: false };
};

const restoreDeletedMonitor = async ({
  monitorId,
  savedObjectsClient,
  normalizedMonitor,
}: {
  monitorId: string;
  normalizedMonitor: SyntheticsMonitorWithSecrets;
  savedObjectsClient: SavedObjectsClientContract;
}) => {
  try {
    await savedObjectsClient.get<EncryptedSyntheticsMonitor>(syntheticsMonitorType, monitorId);
  } catch (e) {
    if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
      await savedObjectsClient.create(syntheticsMonitorType, normalizedMonitor, {
        id: monitorId,
        overwrite: true,
      });
    }
  }
};
