// Simple service to allow screens to request navigation to other tabs
// This is used by DashboardScreen to tell the AppDrawer to switch tabs

type NavigationCallback = (screenName: string) => void;

let navigationCallback: NavigationCallback | null = null;

export const setScreenNavigationCallback = (callback: NavigationCallback) => {
  navigationCallback = callback;
};

export const navigateToScreen = (screenName: string) => {
  if (navigationCallback) {
    navigationCallback(screenName);
  } else {
    console.warn('Screen navigation callback not set. Unable to navigate to:', screenName);
  }
};
