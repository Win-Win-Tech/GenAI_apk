import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import messaging from '@react-native-firebase/messaging';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Request permissions and get token
export async function registerForPushNotifications() {
  let token;
  
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    
    // Get token for Expo
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: 'your-project-id', // Get this from app.json or app.config.js
    })).data;
    
    // Also register with Firebase (especially for foreground notifications)
    await messaging().registerDeviceForRemoteMessages();
    const firebaseToken = await messaging().getToken();
    
    console.log('Expo push token:', token);
    console.log('Firebase token:', firebaseToken);
    
    // You would typically send the token to your server here
    // await sendTokenToServer(firebaseToken);
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token;
}

// Handle notifications when app is in foreground
export function setupNotificationListeners() {
  // For Firebase foreground messages
  const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
    console.log('Foreground notification:', remoteMessage);
    
    // Convert Firebase message to Expo notification
    Notifications.scheduleNotificationAsync({
      content: {
        title: remoteMessage.notification.title,
        body: remoteMessage.notification.body,
        data: remoteMessage.data,
      },
      trigger: null,
    });
  });

  // For when user taps on notification (app was in background)
  const unsubscribeBackground = messaging().onNotificationOpenedApp(remoteMessage => {
    console.log('Notification opened when app was in background:', remoteMessage);
    // Navigate to appropriate screen based on remoteMessage.data
  });

  // Check if app was opened from a notification
  messaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {
        console.log('App opened from quit state by notification:', remoteMessage);
        // Navigate to appropriate screen based on remoteMessage.data
      }
    });

  // Listen for Expo notifications in foreground
  const expoSubscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('Expo notification received:', notification);
  });

  // Handle notification response (user tap)
  const expoResponseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification response:', response);
    // Navigate based on response.notification.request.content.data
  });

  // Return unsubscribe functions to clean up when needed
  return () => {
    unsubscribeForeground();
    unsubscribeBackground();
    expoSubscription.remove();
    expoResponseSubscription.remove();
  };
}