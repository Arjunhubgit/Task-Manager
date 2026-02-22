import { useState, useCallback } from 'react';

/**
 * useReload Hook - Manages reload state and actions
 * 
 * Returns an object with:
 * - isLoading: boolean - whether reload is in progress
 * - reload: function - call this to trigger reload
 */

export const useReload = (onReload) => {
  const [isLoading, setIsLoading] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      if (onReload) {
        await onReload();
      }
    } catch (error) {
      console.error('Reload failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onReload]);

  return { isLoading, reload };
};

/**
 * useReloadPage Hook - Reloads the entire page
 */
export const useReloadPage = () => {
  const [isLoading, setIsLoading] = useState(false);

  const reload = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }, []);

  return { isLoading, reload };
};

export default useReload;
