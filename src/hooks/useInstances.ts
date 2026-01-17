import { useCallback, useEffect, useRef } from 'react';
import { useAppStore, useAemInstances, useIsLoading, useConfig } from '../store';
import * as instanceApi from '../api/instance';
import { mapApiInstanceToFrontend, mapApiHealthCheckToFrontend } from '../api/mappers';
import type { AEMInstance, AEMInstanceStatus } from '../types';

/**
 * Hook for managing AEM instances
 */
export function useInstanceManager() {
  const instances = useAemInstances();
  const isLoading = useIsLoading();
  const config = useConfig();

  const setInstances = useAppStore((s) => s.setAemInstances);
  const updateInstance = useAppStore((s) => s.updateAemInstance);
  const addInstance = useAppStore((s) => s.addAemInstance);
  const removeInstance = useAppStore((s) => s.deleteAemInstance);
  const setLoading = useAppStore((s) => s.setLoading);
  const setError = useAppStore((s) => s.setError);
  const addNotification = useAppStore((s) => s.addNotification);

  const healthCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load instances on mount
  const loadInstances = useCallback(async () => {
    setLoading(true);
    try {
      const apiInstances = await instanceApi.listInstances();
      const frontendInstances = apiInstances.map(mapApiInstanceToFrontend);
      setInstances(frontendInstances);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load instances');
      addNotification({
        type: 'error',
        title: 'Failed to load instances',
        message: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [setInstances, setLoading, setError, addNotification]);

  // Start an instance
  const startInstance = useCallback(
    async (instanceId: string) => {
      const instance = instances.find((i) => i.id === instanceId);
      if (!instance) return;

      updateInstance(instanceId, { status: 'starting' as AEMInstanceStatus });

      try {
        const success = await instanceApi.startInstance(instanceId);
        if (success) {
          updateInstance(instanceId, { status: 'running' as AEMInstanceStatus });
          addNotification({
            type: 'success',
            title: 'Instance started',
            message: `${instance.name} is now running`,
          });
        } else {
          throw new Error('Failed to start instance');
        }
      } catch (err) {
        updateInstance(instanceId, { status: 'error' as AEMInstanceStatus });
        addNotification({
          type: 'error',
          title: 'Failed to start instance',
          message: err instanceof Error ? err.message : undefined,
        });
      }
    },
    [instances, updateInstance, addNotification]
  );

  // Stop an instance
  const stopInstance = useCallback(
    async (instanceId: string) => {
      const instance = instances.find((i) => i.id === instanceId);
      if (!instance) return;

      updateInstance(instanceId, { status: 'stopping' as AEMInstanceStatus });

      try {
        const success = await instanceApi.stopInstance(instanceId);
        if (success) {
          updateInstance(instanceId, { status: 'stopped' as AEMInstanceStatus });
          addNotification({
            type: 'success',
            title: 'Instance stopped',
            message: `${instance.name} has been stopped`,
          });
        } else {
          throw new Error('Failed to stop instance');
        }
      } catch (err) {
        updateInstance(instanceId, { status: 'error' as AEMInstanceStatus });
        addNotification({
          type: 'error',
          title: 'Failed to stop instance',
          message: err instanceof Error ? err.message : undefined,
        });
      }
    },
    [instances, updateInstance, addNotification]
  );

  // Check health of all running instances
  const checkAllHealth = useCallback(async () => {
    const runningInstances = instances.filter((i) => i.status === 'running');

    await Promise.all(
      runningInstances.map(async (instance) => {
        try {
          const apiHealth = await instanceApi.checkInstanceHealth(instance.id);
          const health = mapApiHealthCheckToFrontend(apiHealth);
          updateInstance(instance.id, {
            status: health.isHealthy ? 'running' : 'error',
          });
        } catch {
          // Silently handle health check failures
        }
      })
    );
  }, [instances, updateInstance]);

  // Create a new instance
  const createInstance = useCallback(
    async (instance: Omit<AEMInstance, 'id' | 'createdAt' | 'updatedAt'>) => {
      setLoading(true);
      try {
        const apiInstance = await instanceApi.addInstance({
          name: instance.name,
          instance_type: instance.instanceType,
          host: instance.host,
          port: instance.port,
          path: instance.path,
          java_opts: instance.javaOpts,
          run_modes: instance.runModes,
          status: instance.status,
          profile_id: instance.profileId,
        });
        const frontendInstance = mapApiInstanceToFrontend(apiInstance);
        addInstance(frontendInstance);
        addNotification({
          type: 'success',
          title: 'Instance added',
          message: `${frontendInstance.name} has been configured`,
        });
        return frontendInstance;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add instance');
        addNotification({
          type: 'error',
          title: 'Failed to add instance',
          message: err instanceof Error ? err.message : undefined,
        });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [addInstance, setLoading, setError, addNotification]
  );

  // Delete an instance
  const deleteInstance = useCallback(
    async (instanceId: string) => {
      setLoading(true);
      try {
        await instanceApi.deleteInstance(instanceId);
        removeInstance(instanceId);
        addNotification({
          type: 'success',
          title: 'Instance removed',
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove instance');
        addNotification({
          type: 'error',
          title: 'Failed to remove instance',
          message: err instanceof Error ? err.message : undefined,
        });
      } finally {
        setLoading(false);
      }
    },
    [removeInstance, setLoading, setError, addNotification]
  );

  // Open instance in browser
  const openInBrowser = useCallback(
    async (instanceId: string, path?: string) => {
      try {
        await instanceApi.openInBrowser(instanceId, path);
      } catch (err) {
        addNotification({
          type: 'error',
          title: 'Failed to open browser',
          message: err instanceof Error ? err.message : undefined,
        });
      }
    },
    [addNotification]
  );

  // Setup health check interval
  useEffect(() => {
    loadInstances();

    if (config.healthCheckInterval > 0) {
      healthCheckIntervalRef.current = setInterval(checkAllHealth, config.healthCheckInterval);
    }

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, [loadInstances, checkAllHealth, config.healthCheckInterval]);

  return {
    instances,
    isLoading,
    loadInstances,
    startInstance,
    stopInstance,
    createInstance,
    deleteInstance,
    openInBrowser,
    checkAllHealth,
    runningCount: instances.filter((i) => i.status === 'running').length,
  };
}
