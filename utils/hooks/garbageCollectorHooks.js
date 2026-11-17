import React, { useEffect } from 'react';
import { store } from '@betacrew/jars-flux';

export default function useGarbageCollector(key) {
  useEffect(() => () => {
    store.reducerManager.remove(key);
    store.sagaManager.removeSaga(key);
  }, []);
}
