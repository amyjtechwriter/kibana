/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import { getCollectorPolicy } from './fleet_policies';

export interface SetupDataCollectionInstructions {
  collector: {
    secretToken?: string;
    host?: string;
  };
  symbolizer: {
    host?: string;
  };
}

export async function getSetupInstructions({
  packagePolicyClient,
  soClient,
  apmServerHost,
}: {
  packagePolicyClient: PackagePolicyClient;
  soClient: SavedObjectsClientContract;
  apmServerHost?: string;
}): Promise<SetupDataCollectionInstructions> {
  const collectorPolicy = await getCollectorPolicy({ packagePolicyClient, soClient });

  if (!collectorPolicy) {
    throw new Error('Could not find Collector policy');
  }

  const collectorVars = collectorPolicy.inputs[0].vars;
  const symbolizerHost = apmServerHost?.replace(/\.apm\./, '.symbols.');
  const collectorHost = apmServerHost?.replace(/\.apm\./, '.profiling.')?.replace('https://', '');

  return {
    collector: {
      secretToken: collectorVars?.secret_token?.value,
      host: collectorHost,
    },
    symbolizer: {
      host: symbolizerHost,
    },
  };
}
