import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { markAttendance } from '../api/attendanceApi';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  employee?: string;
  checkin?: string;
  checkout?: string;
  confidence?: number;
  location?: { latitude: number; longitude: number; accuracy?: number };
}

interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

type StoppedState = 'idle' | 'error' | 'cancelled' | 'success' | 'retry';

export const AttendanceScreen: React.FC = (): React.ReactElement => {
  const cameraRef = useRef<any | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [started, setStarted] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [stoppedState, setStoppedState] = useState<StoppedState>('idle');
  const [geolocation, setGeolocation] = useState<GeoLocation | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Refs for managing state in callbacks
  const isProcessingRef = useRef(false);
  const faceDetectedRef = useRef(false);
  const lastCaptureTimeRef = useRef(0);
  const captureTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastToastTimeRef = useRef<{ [key: string]: number }>({});

  // Animations
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const startIconAnim = useRef(new Animated.Value(0)).current;
  const spinnerAnim = useRef(new Animated.Value(0)).current;

  // Initialize permissions
  useEffect(() => {
    const init = async () => {
      try {
        const { status: cameraStatus } = await Camera.getCameraPermissionsAsync();
        setHasPermission(cameraStatus === 'granted');

        const { status: locationStatus } = await Location.getForegroundPermissionsAsync();
        setLocationPermission(locationStatus === 'granted');
      } catch (err) {
        setHasPermission(false);
      }
    };
    init();
  }, []);

  // Scanning line animation
  useEffect(() => {
    if (started && cameraActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 2400,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanLineAnim.setValue(0);
    }
  }, [started, cameraActive]);

  // Pulse animation for start button
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Float animation for start icon
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(startIconAnim, {
          toValue: -10,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(startIconAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Spinner rotation animation
  useEffect(() => {
    if (isProcessing) {
      Animated.loop(
        Animated.timing(spinnerAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinnerAnim.setValue(0);
    }
  }, [isProcessing]);

  // Fetch geolocation
  const fetchGeolocation = useCallback(async (): Promise<GeoLocation | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGeoError('Location permission denied');
        setLocationPermission(false);
        return null;
      }
      setLocationPermission(true);

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const geoData: GeoLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
      };

      setGeolocation(geoData);
      setGeoError(null);
      return geoData;
    } catch (error: any) {
      console.warn('Geolocation error:', error);
      setGeoError(error.message || 'Failed to get location');
      setGeolocation(null);
      return null;
    }
  }, []);

  // Dismiss all toasts
  const dismissAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Show toast notification
  const showToast = useCallback(
    (
      message: string,
      type: ToastMessage['type'] = 'info',
      opts?: Partial<Omit<ToastMessage, 'id' | 'message' | 'type'>>,
      key?: string
    ) => {
      if (key) {
        const now = Date.now();
        if (lastToastTimeRef.current[key] && now - lastToastTimeRef.current[key] < 3000) {
          return;
        }
        lastToastTimeRef.current[key] = now;
      }

      const id = Date.now().toString();
      setToasts((prev) => [...prev, { id, message, type, ...(opts || {}) }]);
      setTimeout(() => removeToast(id), 5000);
    },
    []
  );

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Speak text for accessibility
  const speakText = useCallback((text: string) => {
    try {
      Speech.speak(text, {
        language: 'en-US',
        rate: 0.9,
        pitch: 1.2,
      });
    } catch (e) {
      console.warn('Speech synthesis failed', e);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    setCameraActive(false);
    faceDetectedRef.current = false;
    setFaceDetected(false);
  }, []);

  // Stop camera with reason
  const stopCameraWith = useCallback((reason: StoppedState) => {
    setCameraActive(false);
    faceDetectedRef.current = false;
    setFaceDetected(false);

    if (reason === 'error') {
      setStarted(false);
      setStoppedState('idle');
    } else {
      setStoppedState(reason);
    }
  }, []);

  // Capture and send attendance
  const captureAndSend = useCallback(async () => {
    if (!cameraRef.current || isProcessingRef.current) return;

    // Set cooldown immediately
    lastCaptureTimeRef.current = Date.now();
    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
      // Get geolocation
      let geoData = geolocation;
      if (!geoData) {
        geoData = await fetchGeolocation();
      }

      if (!geoData) {
        showToast(
          'Enable location on your device to mark attendance. If already allowed, check app permissions.',
          'error',
          undefined,
          'attendance-location-missing'
        );
        isProcessingRef.current = false;
        setIsProcessing(false);
        return;
      }

      // Capture photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (!photo) {
        showToast('Failed to capture photo', 'error');
        isProcessingRef.current = false;
        setIsProcessing(false);
        return;
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('image', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: 'face.jpg',
      } as any);

      // Append geolocation data
      formData.append('latitude', geoData.latitude.toFixed(6));
      formData.append('longitude', geoData.longitude.toFixed(6));
      formData.append('accuracy', String(Math.round(geoData.accuracy)));

      // Send to API
      const response = await markAttendance(formData);
      const data = response?.data || {};

      // Handle response
      if (data.status && data.message) {
        let toastTitle = 'Attendance Marked';
        let toastType: ToastMessage['type'] = 'success';
        let toastMsg = data.message;

        if (data.status === 'Already marked') {
          toastTitle = 'Already Checked In/Out';
          toastType = 'info';
        }

        showToast(toastMsg, toastType, {
          employee: data.employee || data.employee_name,
          confidence: data.confidence,
          location: geoData,
          checkin: data.checkin_time || data.checkin,
          checkout: data.checkout_time || data.checkout,
        });

        // Speak result
        try {
          const employeeName = data?.employee || data?.employee_name || '';
          let speakMsg = '';
          if (data.status === 'Already marked') {
            speakMsg = 'Your attendance for today is already recorded. Have a good day.';
          } else {
            speakMsg = employeeName ? `${data.message}` : data.message;
          }
          speakText(speakMsg);
        } catch (e) { }

        isProcessingRef.current = false;
        setIsProcessing(false);
        return;
      } else {
        showToast('Received unexpected response from server.', 'error', undefined, 'attendance-unknown');
        isProcessingRef.current = false;
        setIsProcessing(false);
      }
    } catch (error: any) {
      let errMsg = 'Server connection failed';
      let errTitle = 'Connection Error';

      if (error.response?.data?.error) {
        switch (error.response.data.error) {
          case 'No face detected':
            errTitle = 'No Face Found';
            errMsg = 'Please ensure your face is clearly visible in the frame';
            break;
          case 'Face not recognized':
            errTitle = 'Unregistered Face';
            errMsg = 'Your face is not registered in the system. Please contact administrator.';
            break;
          default:
            errTitle = 'Error';
            errMsg = error.response.data.error;
        }
      } else if (error.response?.data) {
        const errorData = error.response.data;
        const errorKeys = Object.keys(errorData);
        if (errorKeys.length > 0) {
          const firstErrorKey = errorKeys[0];
          const firstError = errorData[firstErrorKey];
          errMsg = Array.isArray(firstError) ? firstError[0] : firstError;
        }
      }

      showToast(`${errTitle}: ${errMsg}`, 'error', undefined, 'attendance-error');
      stopCameraWith('error');
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [geolocation, fetchGeolocation, showToast, speakText, stopCameraWith]);

  // Handle face detection and auto-capture
  useEffect(() => {
    if (!started || !cameraActive) {
      if (captureTimeoutRef.current) {
        clearTimeout(captureTimeoutRef.current);
        captureTimeoutRef.current = null;
      }
      return;
    }

    // Detect and auto-capture on interval
    const detectInterval = setInterval(() => {
      if (isProcessingRef.current || !cameraRef.current || captureTimeoutRef.current) return;

      const now = Date.now();
      const timeSinceLastCapture = now - lastCaptureTimeRef.current;

      // Allow capture if cooldown has passed
      if (timeSinceLastCapture >= 10000) {
        captureTimeoutRef.current = setTimeout(async () => {
          if (!isProcessingRef.current && cameraRef.current) {
            await captureAndSend();
          }
          captureTimeoutRef.current = null;
        }, 500); // Minimal delay before capture
      }
    }, 900);

    return () => {
      clearInterval(detectInterval);
      if (captureTimeoutRef.current) {
        clearTimeout(captureTimeoutRef.current);
        captureTimeoutRef.current = null;
      }
    };
  }, [started, cameraActive, captureAndSend]);

  // Handle start - explicit user action to request location first, then start camera
  const handleStart = useCallback(async () => {
    dismissAllToasts();
    const geo = await fetchGeolocation();
    if (!geo) return; // Don't start if location not granted
    if (!started) {
      // Reset refs when starting fresh
      lastCaptureTimeRef.current = 0;
    }
    setStarted(true);
    setCameraActive(true);
    setStoppedState('idle');
  }, [started, dismissAllToasts, fetchGeolocation]);

  // On component mount: auto-start camera if location is already granted
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // If already started (manual retry flow), don't interfere
      if (started) return;
      const geo = await fetchGeolocation();
      if (cancelled) return;
      if (geo) {
        // Location allowed: auto-start camera/workflow
        setStarted(true);
        setCameraActive(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchGeolocation, started]);

  // Handle retry
  const handleRetry = useCallback(() => {
    dismissAllToasts();
    isProcessingRef.current = false;
    setIsProcessing(false);
    lastCaptureTimeRef.current = 0; // Reset to allow immediate retry
    setStoppedState('idle');
    setCameraActive(true);
  }, [dismissAllToasts]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    stopCameraWith('cancelled');
  }, [stopCameraWith]);

  // Request camera permission
  const requestPermission = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (err) {
      setHasPermission(false);
    }
  };

  // Permission screen
  if (hasPermission !== true) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIconContainer}>
            <MaterialIcons name="photo-camera" size={64} color="#2563eb" />
          </View>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to mark your attendance using facial recognition
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <MaterialIcons name="camera-alt" size={20} color="#fff" />
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Start screen
  if (!started) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.backgroundGradient}>
          <View style={styles.startContainer}>
            <View style={styles.startCard}>
              <Animated.View
                style={[
                  styles.startIconWrapper,
                  { transform: [{ translateY: startIconAnim }] },
                ]}
              >
                <View style={styles.startIconContainer}>
                  <MaterialIcons name="face" size={54} color="#fff" />
                </View>
                <View style={styles.iconRing} />
              </Animated.View>

              <Text style={styles.startTitle}>Enable Location to Continue</Text>
              <Text style={styles.startDescription}>
                We first need your location permission. After that, we'll open the camera and auto-mark attendance when your face is detected.
              </Text>

              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  style={styles.startButton}
                  onPress={handleStart}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="my-location" size={24} color="#fff" />
                  <Text style={styles.startButtonText}>Allow Location & Start</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Camera active screen
  if (cameraActive) {
    const scanLineTranslate = scanLineAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, SCREEN_HEIGHT - 200],
    });

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front"
            onCameraReady={() => setCameraActive(true)}
          />

          {/* Detection Frame */}
          {/* <View style={styles.detectionFrame} pointerEvents="none">
            <Animated.View
              style={[
                styles.scanningLine,
                { transform: [{ translateY: scanLineTranslate }] },
              ]}
            />
          </View>
           */}

          {/* Processing Overlay */}
          {isProcessing && (
            <View style={styles.processingOverlay}>
              <View style={styles.processingContent}>
                <Animated.View
                  style={[
                    styles.spinner,
                    {
                      transform: [
                        {
                          rotate: spinnerAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg'],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <Text style={styles.processingText}>Processing...</Text>
              </View>
            </View>
          )}
        </View>

        {/* Bottom Controls */}
        {!isProcessing && (
          <View style={styles.bottomControls}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Toast Notifications */}
        {toasts.length > 0 && (
          <View style={styles.toastContainer}>
            {toasts.map((toast) => (
              <View
                key={toast.id}
                style={[
                  styles.toast,
                  toast.type === 'success' && styles.toastSuccess,
                  toast.type === 'error' && styles.toastError,
                  toast.type === 'info' && styles.toastInfo,
                ]}
              >

                <View
                  style={[
                    styles.toastIconContainer,
                    toast.type === 'success' && styles.toastIconSuccess,
                    toast.type === 'error' && styles.toastIconError,
                    toast.type === 'info' && styles.toastIconInfo,
                  ]}
                >
                  <MaterialIcons
                    name={
                      toast.type === 'success'
                        ? 'check-circle'
                        : toast.type === 'error'
                          ? 'error'
                          : 'info'
                    }
                    size={24}
                    color="#fff"
                  />
                </View>

                <View style={styles.toastContent}>
                  <View style={styles.toastHeader}>
                    {toast.employee && (
                      <Text style={styles.toastTitle}>{toast.employee}</Text>
                    )}
                    <Text style={styles.toastTime}>
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Text style={styles.toastMessage}>{toast.message}</Text>

                  {(toast.confidence || toast.location) && (
                    <View style={styles.toastMeta}>
                      {toast.confidence && (
                        <View style={[styles.metaTag, styles.metaTagConfidence]}>
                          <Text style={styles.metaIcon}>🎯</Text>
                          <Text style={styles.metaText}>{toast.confidence}%</Text>
                        </View>
                      )}
                      {toast.location && (
                        <View style={[styles.metaTag, styles.metaTagLocation]}>
                          <Text style={styles.metaIcon}>📍</Text>
                          <Text style={styles.metaText}>
                            {toast.location.latitude.toFixed(4)}, {toast.location.longitude.toFixed(4)}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {(toast.checkin || toast.checkout) && (
                    <View style={styles.toastTimes}>
                      {toast.checkin && (
                        <Text style={styles.toastTimeInfo}>Check-in: {toast.checkin}</Text>
                      )}
                      {toast.checkout && (
                        <Text style={styles.toastTimeInfo}>Check-out: {toast.checkout}</Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </SafeAreaView>
    );
  }

  // Stopped screen
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backgroundGradient}>
        <View style={styles.stoppedContainer}>
          <View style={styles.stoppedCard}>
            <View
              style={[
                styles.stoppedIconContainer,
                stoppedState === 'error' ? styles.stoppedIconError : styles.stoppedIconSuccess,
              ]}
            >
              <Text style={styles.stoppedIcon}>
                {stoppedState === 'error' ? '⚠️' : '✓'}
              </Text>
            </View>

            <Text style={styles.stoppedTitle}>
              {stoppedState === 'error'
                ? "Let's Try Again"
                : stoppedState === 'cancelled'
                  ? 'Camera Stopped'
                  : stoppedState === 'retry'
                    ? 'Ready to Continue'
                    : 'Capture Complete'}
            </Text>

            <Text style={styles.stoppedDescription}>
              {stoppedState === 'error'
                ? 'We could not confirm your face. Ensure good lighting and keep your face centered.'
                : stoppedState === 'cancelled'
                  ? 'You can resume anytime. Click below to try again.'
                  : stoppedState === 'retry'
                    ? 'Click below to resume your attendance capture.'
                    : 'Attendance has been submitted. You can retry to capture again if needed.'}
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={handleRetry}
              activeOpacity={0.8}
            >
              <MaterialIcons name="refresh" size={20} color="#fff" />
              <Text style={styles.retryButtonText}>Retry Attendance</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <View style={styles.toastContainer}>
          {toasts.map((toast) => (
            <View
              key={toast.id}
              style={[
                styles.toast,
                toast.type === 'success' && styles.toastSuccess,
                toast.type === 'error' && styles.toastError,
                toast.type === 'info' && styles.toastInfo,
              ]}
            >

              <View
                style={[
                  styles.toastIconContainer,
                  toast.type === 'success' && styles.toastIconSuccess,
                  toast.type === 'error' && styles.toastIconError,
                  toast.type === 'info' && styles.toastIconInfo,
                ]}
              >
                <MaterialIcons
                  name={
                    toast.type === 'success'
                      ? 'check-circle'
                      : toast.type === 'error'
                        ? 'error'
                        : 'info'
                  }
                  size={24}
                  color="#fff"
                />
              </View>

              <View style={styles.toastContent}>
                <View style={styles.toastHeader}>
                  {toast.employee && (
                    <Text style={styles.toastTitle}>{toast.employee}</Text>
                  )}
                  <Text style={styles.toastTime}>
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Text style={styles.toastMessage}>{toast.message}</Text>

                {(toast.confidence || toast.location) && (
                  <View style={styles.toastMeta}>
                    {toast.confidence && (
                      <View style={[styles.metaTag, styles.metaTagConfidence]}>
                        <Text style={styles.metaIcon}>🎯</Text>
                        <Text style={styles.metaText}>{toast.confidence}%</Text>
                      </View>
                    )}
                    {toast.location && (
                      <View style={[styles.metaTag, styles.metaTagLocation]}>
                        <Text style={styles.metaIcon}>📍</Text>
                        <Text style={styles.metaText}>
                          {toast.location.latitude.toFixed(4)}, {toast.location.longitude.toFixed(4)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6fb',
  },
  backgroundGradient: {
    flex: 1,
    backgroundColor: '#f4f6fb',
  },

  // Permission styles
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 300,
  },
  permissionButton: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Start screen styles
  startContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  startCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 24,
    padding: 44,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 22 },
        shadowOpacity: 0.12,
        shadowRadius: 50,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  startIconWrapper: {
    position: 'relative',
    marginBottom: 24,
  },
  startIconContainer: {
    width: 110,
    height: 110,
    borderRadius: 26,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.35,
        shadowRadius: 45,
      },
      android: {
        elevation: 18,
      },
    }),
  },
  iconRing: {
    position: 'absolute',
    top: -12,
    left: -12,
    right: -12,
    bottom: -12,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.35)',
  },
  startTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  startDescription: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  startButton: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    paddingVertical: 18,
    paddingHorizontal: 46,
    borderRadius: 18,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.35,
        shadowRadius: 38,
      },
      android: {
        elevation: 18,
      },
    }),
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },

  // Camera styles
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  detectionFrame: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 3,
    borderColor: 'rgba(59, 130, 246, 0.55)',
    overflow: 'hidden',
  },
  scanningLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#60a5fa',
    ...Platform.select({
      ios: {
        shadowColor: '#60a5fa',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 14,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  // Processing overlay
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingContent: {
    alignItems: 'center',
  },
  spinner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 4,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    borderTopColor: '#2563eb',
    marginBottom: 14,
  },
  processingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
  },

  // Bottom controls
  bottomControls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  cancelButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingVertical: 14,
    paddingHorizontal: 34,
    borderRadius: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cancelButtonText: {
    color: '#b91c1c',
    fontSize: 16,
    fontWeight: '600',
  },

  // Stopped screen styles
  stoppedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  stoppedCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 24,
    padding: 44,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 22 },
        shadowOpacity: 0.12,
        shadowRadius: 50,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  stoppedIconContainer: {
    width: 86,
    height: 86,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.35,
        shadowRadius: 40,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  stoppedIconSuccess: {
    backgroundColor: '#10b981',
    ...Platform.select({
      ios: {
        shadowColor: '#10b981',
      },
    }),
  },
  stoppedIconError: {
    backgroundColor: '#f59e0b',
    ...Platform.select({
      ios: {
        shadowColor: '#f59e0b',
      },
    }),
  },
  stoppedIcon: {
    fontSize: 42,
  },
  stoppedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  stoppedDescription: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  retryButton: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 34,
    borderRadius: 14,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.25,
        shadowRadius: 32,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Toast styles
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    right: 16,
    zIndex: 999,
  },
  toast: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.12,
        shadowRadius: 32,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  toastSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  toastError: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  toastInfo: {
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },

  toastIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  toastIconSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  toastIconError: {
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
  },
  toastIconInfo: {
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
  },
  toastContent: {
    flex: 1,
  },
  toastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  toastTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  toastTime: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  toastMessage: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  toastMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  metaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(241, 245, 249, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  metaTagConfidence: {
    backgroundColor: 'rgba(236, 253, 245, 0.8)',
    borderColor: 'rgba(167, 243, 208, 0.6)',
  },
  metaTagLocation: {
    backgroundColor: 'rgba(239, 246, 255, 0.8)',
    borderColor: 'rgba(191, 219, 254, 0.6)',
  },
  metaIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  toastTimes: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.15)',
  },
  toastTimeInfo: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
    marginTop: 2,
  },
});