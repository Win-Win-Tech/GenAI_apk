import React from 'react';
import RootNavigator from '../navigation/RootNavigator';
import { AuthProvider } from '../contexts/AuthContext';

export default function Page() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
