import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Sidebar } from './Sidebar';

interface DrawerNavigatorProps {
  activeScreen: string;
  onNavigate: (screen: string) => void;
  children: React.ReactNode;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(320, SCREEN_WIDTH * 0.8);

export const DrawerNavigator: React.FC<DrawerNavigatorProps> = ({
  activeScreen,
  onNavigate,
  children,
}): React.ReactElement => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerAnimation = React.useRef(new Animated.Value(0)).current;
  const overlayAnimation = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(drawerAnimation, {
        toValue: isDrawerOpen ? 1 : 0,
        duration: 280,
        useNativeDriver: false,
      }),
      Animated.timing(overlayAnimation, {
        toValue: isDrawerOpen ? 1 : 0,
        duration: 280,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isDrawerOpen]);

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  const drawerTranslateX = drawerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_WIDTH, 0],
  });

  const overlayOpacity = overlayAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const handleNavigate = (screen: string) => {
    onNavigate(screen);
    setIsDrawerOpen(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Modern Header */}
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={toggleDrawer}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={styles.menuIconContainer}>
                <MaterialIcons
                  name="menu"
                  size={26}
                  color="#1a1a1a"
                />
              </View>
            </TouchableOpacity>
            
            <Text style={styles.appName}>TrueFace</Text>
          </View>
          
          <View style={styles.headerTitleContainer}>
            {/* You can add a logo or app name here */}
          </View>
          
          <View style={styles.headerActions}>
            {/* Placeholder for additional header actions */}
          </View>
        </View>
      </SafeAreaView>

      {/* Main Content with subtle shadow */}
      <View style={styles.contentContainer}>{children}</View>

      {/* Enhanced Drawer Modal */}
      <Modal
        transparent
        visible={isDrawerOpen}
        onRequestClose={toggleDrawer}
        animationType="none"
        statusBarTranslucent
      >
        <View style={styles.modalContainer}>
          {/* Animated Overlay */}
          <Animated.View
            style={[
              styles.overlay,
              {
                opacity: overlayOpacity,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.overlayTouchable}
              activeOpacity={1}
              onPress={toggleDrawer}
            />
          </Animated.View>

          {/* Animated Drawer */}
          <Animated.View
            style={[
              styles.drawerContent,
              {
                transform: [{ translateX: drawerTranslateX }],
              },
            ]}
          >
            <Sidebar
              activeScreen={activeScreen}
              onNavigate={handleNavigate}
              onCloseSidebar={toggleDrawer}
            />
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerSafeArea: {
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  menuButton: {
    padding: 8,
    borderRadius: 12,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appName: {
    fontSize: 25,
    fontWeight: '500',
    color: '#1a1a1a',
    letterSpacing: 1,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerActions: {
    width: 56,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalContainer: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayTouchable: {
    flex: 1,
  },
  drawerContent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#ffffff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 16,
      },
    }),
  },
});