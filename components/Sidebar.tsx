import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import useAuth from '../hooks/useAuth';

interface SidebarProps {
  activeScreen: string;
  onNavigate: (screen: string) => void;
  onCloseSidebar?: () => void;
}

// Show only "Mark My Attendance" in the drawer
const onlyMenu = [
  {
    category: '',
    items: [
      { id: 'attendance', label: 'Mark My Attendance', icon: 'photo-camera', screen: 'AttendanceTab' },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeScreen,
  onNavigate,
  onCloseSidebar,
}): React.ReactElement => {
  const { logout, auth, name } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            logout();
            onCloseSidebar?.();
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleNavigate = (screen: string) => {
    onNavigate(screen);
  };

  const visibleMenuStructure = onlyMenu;

  const getRoleBadgeColor = () => {
    const role = auth?.role?.toLowerCase();
    switch (role) {
      case 'admin':
        return { bg: '#ffebee', text: '#d32f2f' };
      case 'superadmin':
        return { bg: '#e3f2fd', text: '#1976d2' };
      case 'manager':
        return { bg: '#e8f5e9', text: '#388e3c' };
      default:
        return { bg: '#f5f5f5', text: '#666' };
    }
  };

  const roleColors = getRoleBadgeColor();

  return (
    <SafeAreaView style={styles.container}>
      {/* Enhanced Header with Profile */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.profileSection}>
            <View style={styles.avatarCircle}>
              <MaterialIcons name="account-circle" size={64} color="#1976d2" />
            </View>
            <Text style={styles.profileName}>{name || 'User'}</Text>
            <View style={[styles.profileRoleBadge, { backgroundColor: roleColors.bg }]}>
              <Text style={[styles.profileRoleText, { color: roleColors.text }]}>
                {auth?.role || 'User'}
              </Text>
            </View>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onCloseSidebar}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Account Information Card */}
      {/* <View style={styles.accountInfoCard}>
        <View style={styles.accountInfoRow}>
          <MaterialIcons name="email" size={18} color="#1976d2" />
          <View style={styles.accountInfoText}>
            <Text style={styles.accountInfoLabel}>Email</Text>
            <Text style={styles.accountInfoValue} numberOfLines={1}>
              {auth?.email || 'Not available'}
            </Text>
          </View>
        </View>
        
        <View style={styles.accountInfoDivider} />
        
        <View style={styles.accountInfoRow}>
          <MaterialIcons name="location-on" size={18} color="#f57c00" />
          <View style={styles.accountInfoText}>
            <Text style={styles.accountInfoLabel}>Location</Text>
            <Text style={styles.accountInfoValue} numberOfLines={1}>
              {auth?.location || 'Not assigned'}
            </Text>
          </View>
        </View>
      </View> */}

      {/* System Status Card */}
      {/* <View style={styles.systemStatusCard}>
        <View style={styles.systemStatusIndicator}>
          <View style={styles.systemStatusDot} />
          <Text style={styles.systemStatusText}>System Online</Text>
        </View>
      </View> */}

      {/* Menu Content */}
      <ScrollView 
        style={styles.menuContainer} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.menuContentContainer}
      >
        {visibleMenuStructure.map((category, index) => (
          <View key={`${category.category}-${index}`} style={styles.categoryContainer}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryTitle}>{category.category}</Text>
              <View style={styles.categoryLine} />
            </View>

            {category.items.map((item) => {
              const isActive = activeScreen === item.screen;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    isActive && styles.activeMenuItem,
                  ]}
                  onPress={() => handleNavigate(item.screen)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.iconContainer,
                    isActive && styles.activeIconContainer,
                  ]}>
                    <MaterialIcons
                      name={item.icon}
                      size={22}
                      color={isActive ? '#1976d2' : '#666'}
                    />
                  </View>

                  <Text
                    style={[
                      styles.menuItemText,
                      isActive && styles.activeMenuItemText,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* Enhanced Footer */}
      <View style={styles.footer}>
        <View style={styles.divider} />
        
        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <View style={styles.logoutIconContainer}>
            <MaterialIcons name="logout" size={20} color="#d32f2f" />
          </View>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#f8f9fa',
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  headerContent: {
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
    width: '100%',
  },
  avatarCircle: {
    marginBottom: 2,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  profileRoleBadge: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  profileRoleText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  accountInfoCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    marginTop: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  accountInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountInfoText: {
    flex: 1,
  },
  accountInfoLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  accountInfoValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  accountInfoDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 2
  },
  systemStatusCard: {
    backgroundColor: '#e8f5e9',
    marginHorizontal: 12,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  systemStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  systemStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4caf50',
  },
  systemStatusText: {
    fontSize: 13,
    color: '#2e7d32',
    fontWeight: '600',
  },
  menuContainer: {
    flex: 1,
  },
  menuContentContainer: {
    paddingVertical: 16,
  },
  categoryContainer: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginRight: 12,
  },
  categoryLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e8e8e8',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 12,
    marginVertical: 2,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  activeMenuItem: {
    backgroundColor: '#e3f2fd',
    ...Platform.select({
      ios: {
        shadowColor: '#1976d2',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activeIconContainer: {
    backgroundColor: '#ffffff',
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    color: '#4a4a4a',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  activeMenuItemText: {
    color: '#1976d2',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#d32f2f',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
  },
  divider: {
    height: 1,
    backgroundColor: '#e8e8e8',
    marginBottom: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#ffebee',
    marginBottom: 12,
  },
  logoutIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoutText: {
    color: '#d32f2f',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  versionText: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
});