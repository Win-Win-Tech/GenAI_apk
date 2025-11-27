import React from 'react';
import { View, StatusBar, StyleSheet } from 'react-native';
import { AttendanceScreen } from '../pages/AttendanceScreen';
import { DrawerNavigator } from '../components/DrawerNavigator';

import useAuth from '../hooks/useAuth';
import LoginScreen from '../pages/LoginScreen';

const RootNavigator: React.FC = (): React.ReactElement => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <View style={styles.container} />;
  }
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {isAuthenticated ? (
        <DrawerNavigator activeScreen="AttendanceTab" onNavigate={() => {}}>
          <AttendanceScreen />
        </DrawerNavigator>
      ) : (
        <LoginScreen />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
});

export default RootNavigator;