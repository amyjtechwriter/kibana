/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { DashboardContainerFactory } from '..';
import { DASHBOARD_CONTAINER_TYPE } from '../..';
import { DashboardRenderer } from './dashboard_renderer';
import { pluginServices } from '../../services/plugin_services';
import { DashboardContainer } from '../embeddable/dashboard_container';
import { DashboardCreationOptions } from '../embeddable/dashboard_container_factory';

describe('dashboard renderer', () => {
  let mockDashboardContainer: DashboardContainer;
  let mockDashboardFactory: DashboardContainerFactory;

  beforeEach(() => {
    mockDashboardContainer = {
      destroy: jest.fn(),
      render: jest.fn(),
      navigateToDashboard: jest.fn(),
    } as unknown as DashboardContainer;
    mockDashboardFactory = {
      create: jest.fn().mockReturnValue(mockDashboardContainer),
    } as unknown as DashboardContainerFactory;
    pluginServices.getServices().embeddable.getEmbeddableFactory = jest
      .fn()
      .mockReturnValue(mockDashboardFactory);
  });

  test('calls create method on the Dashboard embeddable factory', async () => {
    await act(async () => {
      mountWithIntl(<DashboardRenderer />);
    });
    expect(pluginServices.getServices().embeddable.getEmbeddableFactory).toHaveBeenCalledWith(
      DASHBOARD_CONTAINER_TYPE
    );
    expect(mockDashboardFactory.create).toHaveBeenCalled();
  });

  test('saved object id & creation options are passed to dashboard factory', async () => {
    const options: DashboardCreationOptions = {
      useControlGroupIntegration: true,
      useSessionStorageIntegration: true,
      useUnifiedSearchIntegration: true,
    };
    await act(async () => {
      mountWithIntl(
        <DashboardRenderer
          savedObjectId="saved_object_kibanana"
          getCreationOptions={() => Promise.resolve(options)}
        />
      );
    });
    expect(mockDashboardFactory.create).toHaveBeenCalledWith(
      expect.any(Object),
      undefined,
      options,
      'saved_object_kibanana'
    );
  });

  test('destroys dashboard container on unmount', async () => {
    let wrapper: ReactWrapper;
    await act(async () => {
      wrapper = await mountWithIntl(<DashboardRenderer savedObjectId="saved_object_kibanana" />);
    });
    wrapper!.unmount();
    expect(mockDashboardContainer.destroy).toHaveBeenCalledTimes(1);
  });

  test('calls navigate and does not destroy dashboard container on ID change', async () => {
    let wrapper: ReactWrapper;
    await act(async () => {
      wrapper = await mountWithIntl(<DashboardRenderer savedObjectId="saved_object_kibanana" />);
    });
    await act(async () => {
      await wrapper.setProps({ savedObjectId: 'saved_object_kibanakiwi' });
    });
    expect(mockDashboardContainer.destroy).not.toHaveBeenCalled();
    expect(mockDashboardContainer.navigateToDashboard).toHaveBeenCalledWith(
      'saved_object_kibanakiwi'
    );
  });

  test('renders and destroys an error embeddable when the dashboard factory create method throws an error', async () => {
    const mockErrorEmbeddable = {
      error: 'oh my goodness an error',
      destroy: jest.fn(),
      render: jest.fn(),
    } as unknown as DashboardContainer;
    mockDashboardFactory = {
      create: jest.fn().mockReturnValue(mockErrorEmbeddable),
    } as unknown as DashboardContainerFactory;
    pluginServices.getServices().embeddable.getEmbeddableFactory = jest
      .fn()
      .mockReturnValue(mockDashboardFactory);

    let wrapper: ReactWrapper;
    await act(async () => {
      wrapper = await mountWithIntl(<DashboardRenderer savedObjectId="saved_object_kibanana" />);
    });

    expect(mockErrorEmbeddable.render).toHaveBeenCalled();
    wrapper!.unmount();
    expect(mockErrorEmbeddable.destroy).toHaveBeenCalledTimes(1);
  });

  test('creates a new dashboard container when the ID changes, and the first created dashboard resulted in an error', async () => {
    // ensure that the first attempt at creating a dashboard results in an error embeddable
    const mockErrorEmbeddable = {
      error: 'oh my goodness an error',
      destroy: jest.fn(),
      render: jest.fn(),
    } as unknown as DashboardContainer;
    const mockErrorFactory = {
      create: jest.fn().mockReturnValue(mockErrorEmbeddable),
    } as unknown as DashboardContainerFactory;
    pluginServices.getServices().embeddable.getEmbeddableFactory = jest
      .fn()
      .mockReturnValue(mockErrorFactory);

    // render the dashboard - it should run into an error and render the error embeddable.
    let wrapper: ReactWrapper;
    await act(async () => {
      wrapper = await mountWithIntl(<DashboardRenderer savedObjectId="saved_object_kibanana" />);
    });
    expect(mockErrorEmbeddable.render).toHaveBeenCalled();
    expect(mockErrorFactory.create).toHaveBeenCalledTimes(1);

    // ensure that the next attempt at creating a dashboard is successfull.
    const mockSuccessEmbeddable = {
      destroy: jest.fn(),
      render: jest.fn(),
      navigateToDashboard: jest.fn(),
    } as unknown as DashboardContainer;
    const mockSuccessFactory = {
      create: jest.fn().mockReturnValue(mockSuccessEmbeddable),
    } as unknown as DashboardContainerFactory;
    pluginServices.getServices().embeddable.getEmbeddableFactory = jest
      .fn()
      .mockReturnValue(mockSuccessFactory);

    // update the saved object id to trigger another dashboard load.
    await act(async () => {
      await wrapper.setProps({ savedObjectId: 'saved_object_kibanakiwi' });
    });

    expect(mockErrorEmbeddable.destroy).toHaveBeenCalled();

    // because a new dashboard container has been created, we should not call navigate.
    expect(mockSuccessEmbeddable.navigateToDashboard).not.toHaveBeenCalled();

    // instead we should call create on the factory again.
    expect(mockSuccessFactory.create).toHaveBeenCalledTimes(1);
  });
});
