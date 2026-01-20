import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore, useAemInstances, useIsLoading } from '../store';
import * as instanceApi from '../api/instance';
import { mapApiInstanceToFrontend } from '../api/mappers';
import type { AEMInstance, AEMInstanceStatus } from '../types';
import type { InstanceStatusResult } from '../api/instance';

/**
 * Hook for managing AEM instances
 *
 * AEM instances are now controlled directly via Terminal windows.
 * Start button opens a Terminal window running AEM.
 * Stop button sends an HTTP stop request or kills the process.
 * Status tracking is simplified - we don't poll for status.
 */
export function useInstanceManager() {
  const instances = useAemInstances();
  const isLoading = useIsLoading();

  // Store selectors - these are stable references
  const setInstances = useAppStore((s) => s.setAemInstances);
  const updateInstance = useAppStore((s) => s.updateAemInstance);
  const addInstance = useAppStore((s) => s.addAemInstance);
  const removeInstance = useAppStore((s) => s.deleteAemInstance);
  const setLoading = useAppStore((s) => s.setLoading);
  const setError = useAppStore((s) => s.setError);
  const addNotification = useAppStore((s) => s.addNotification);

  const hasLoadedRef = useRef(false);

  // Status detection state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastStatusCheck, setLastStatusCheck] = useState<string | null>(null);
  const [statusResults, setStatusResults] = useState<Map<string, InstanceStatusResult>>(new Map());

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

  // Start an instance - opens in Terminal window
  const startInstance = useCallback(
    async (instanceId: string) => {
      const instance = instances.find((i) => i.id === instanceId);
      if (!instance) return;

      try {
        const success = await instanceApi.startInstance(instanceId);
        if (success) {
          // Update local state to unknown since user controls the process in Terminal
          updateInstance(instanceId, { status: 'unknown' as AEMInstanceStatus });
          addNotification({
            type: 'success',
            title: 'Terminal opened',
            message: `${instance.name} is running in a new Terminal window`,
          });
        } else {
          throw new Error('Failed to open terminal');
        }
      } catch (err) {
        addNotification({
          type: 'error',
          title: 'Failed to start instance',
          message: err instanceof Error ? err.message : undefined,
        });
      }
    },
    [instances, updateInstance, addNotification]
  );

  // Stop an instance - sends stop request
  const stopInstance = useCallback(
    async (instanceId: string) => {
      const instance = instances.find((i) => i.id === instanceId);
      if (!instance) return;

      try {
        const success = await instanceApi.stopInstance(instanceId);
        if (success) {
          // Update local state to unknown
          updateInstance(instanceId, { status: 'unknown' as AEMInstanceStatus });
          addNotification({
            type: 'success',
            title: 'Stop request sent',
            message: `${instance.name} stop request has been sent`,
          });
        } else {
          throw new Error('Failed to stop instance');
        }
      } catch (err) {
        addNotification({
          type: 'error',
          title: 'Failed to stop instance',
          message: err instanceof Error ? err.message : undefined,
        });
      }
    },
    [instances, updateInstance, addNotification]
  );

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

  // ============================================
  // Fast Status Detection (No Auth Required)
  // ============================================

  /**
   * Refresh status of a single instance using fast detection
   * (TCP + process check, no authentication required)
   */
  const refreshInstanceStatus = useCallback(
    async (instanceId: string) => {
      try {
        const result = await instanceApi.detectInstanceStatus(instanceId);

        // Update status results map
        setStatusResults((prev) => {
          const next = new Map(prev);
          next.set(instanceId, result);
          return next;
        });

        // Update the instance status in the store
        updateInstance(instanceId, { status: result.status as AEMInstanceStatus });

        return result;
      } catch (err) {
        console.error('Failed to detect instance status:', err);
        return null;
      }
    },
    [updateInstance]
  );

  /**
   * Refresh status of all instances using fast detection
   * (TCP + process check, no authentication required)
   */
  const refreshAllStatuses = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const results = await instanceApi.detectAllInstancesStatus();

      // Update status results map
      const newMap = new Map<string, InstanceStatusResult>();
      for (const result of results) {
        newMap.set(result.instance_id, result);
        // Update the instance status in the store
        updateInstance(result.instance_id, { status: result.status as AEMInstanceStatus });
      }
      setStatusResults(newMap);
      setLastStatusCheck(new Date().toISOString());

      return results;
    } catch (err) {
      console.error('Failed to detect all instance statuses:', err);
      addNotification({
        type: 'error',
        title: 'Failed to refresh statuses',
        message: err instanceof Error ? err.message : undefined,
      });
      return [];
    } finally {
      setIsRefreshing(false);
    }
  }, [updateInstance, addNotification]);

  // Load instances on mount (only once)
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadInstances();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    instances,
    isLoading,
    loadInstances,
    startInstance,
    stopInstance,
    createInstance,
    deleteInstance,
    openInBrowser,
    // Fast status detection (no auth required)
    refreshInstanceStatus,
    refreshAllStatuses,
    isRefreshing,
    lastStatusCheck,
    statusResults,
    // Status counts
    runningCount: instances.filter((i) => i.status === 'running').length,
    stoppedCount: instances.filter((i) => i.status === 'stopped').length,
    startingCount: instances.filter((i) => i.status === 'starting').length,
    portConflictCount: instances.filter((i) => i.status === 'port_conflict').length,
    unknownCount: instances.filter((i) => i.status === 'unknown').length,
  };
}
