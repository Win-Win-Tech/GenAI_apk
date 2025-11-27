import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface Tab {
  id: string;
  label: string;
  icon?: string;
  badge?: number;
}

interface TabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: Tab[];
}

export const TabBar: React.FC<TabBarProps> = ({ 
  activeTab, 
  onTabChange, 
  tabs 
}): React.ReactElement => {
  const [indicatorPosition] = React.useState(new Animated.Value(0));
  const tabWidth = 100 / tabs.length;

  React.useEffect(() => {
    const activeIndex = tabs.findIndex(tab => tab.id === activeTab);
    Animated.spring(indicatorPosition, {
      toValue: activeIndex * tabWidth,
      friction: 8,
      tension: 100,
      useNativeDriver: false,
    }).start();
  }, [activeTab, tabs]);

  return (
    <View style={styles.container}>
      <View style={styles.tabsWrapper}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tab}
              onPress={() => onTabChange(tab.id)}
              activeOpacity={0.7}
            >
              <View style={styles.tabContent}>
                {tab.icon && (
                  <View style={[
                    styles.iconContainer,
                    isActive && styles.activeIconContainer,
                  ]}>
                    <MaterialIcons
                      name={tab.icon}
                      size={20}
                      color={isActive ? '#1976d2' : '#999'}
                    />
                    {tab.badge && tab.badge > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {tab.badge > 99 ? '99+' : tab.badge}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                <Text
                  style={[
                    styles.label,
                    isActive && styles.activeLabel,
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Animated Indicator */}
      <Animated.View
        style={[
          styles.indicator,
          {
            width: `${tabWidth}%`,
            left: indicatorPosition.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  tabsWrapper: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
    padding: 4,
  },
  activeIconContainer: {
    // Optional: Add background or other styling for active state
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -6,
    backgroundColor: '#d32f2f',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  label: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  activeLabel: {
    color: '#1976d2',
    fontWeight: '600',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    backgroundColor: '#1976d2',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
});