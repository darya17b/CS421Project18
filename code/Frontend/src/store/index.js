import React from 'react';
export { useToast } from '../components/Toast';

import { MockStoreProvider, useMockStore } from './mockStore.jsx';
import { ApiStoreProvider, useApiStore } from './apiStore.jsx';

const useMock = import.meta.env.VITE_USE_MOCK === 'true';

export const StoreProvider = ({ children }) => {
  return useMock
    ? React.createElement(MockStoreProvider, null, children)
    : React.createElement(ApiStoreProvider, null, children);
};

export const useStore = () => (useMock ? useMockStore() : useApiStore());
