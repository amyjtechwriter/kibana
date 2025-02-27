/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const SuggestUserProfilesRequestRt = rt.intersection([
  rt.strict({
    name: rt.string,
    owners: rt.array(rt.string),
  }),
  rt.exact(rt.partial({ size: rt.number })),
]);

export type SuggestUserProfilesRequest = rt.TypeOf<typeof SuggestUserProfilesRequestRt>;

export const CaseUserProfileRt = rt.strict({
  uid: rt.string,
});

export type CaseUserProfile = rt.TypeOf<typeof CaseUserProfileRt>;
