import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Animated,
  Platform,
  Image,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import useAuth from '../hooks/useAuth';
import { markAttendance, getTodayAttendanceSummary } from '../api/attendanceApi';

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  // optional rich payload
  photo?: string;
  employee?: string;
  checkin?: string;
  checkout?: string;
}

export const AttendanceScreen: React.FC = (): React.ReactElement => {
  const { logout } = useAuth();
  const cameraRef = useRef<any | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const init = async () => {
      try {
        const { status } = await Camera.getCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      } catch (err) {
        setHasPermission(false);
      }
      await loadAttendanceSummary();
    };
    init();
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const loadAttendanceSummary = async () => {
    setLoadingSummary(true);
    try {
      const response = await getTodayAttendanceSummary();
      setSummaryData(response.data);
    } catch (error: any) {
      console.error('loadAttendanceSummary error:', error);
      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Failed to load attendance summary';
      showToast(message, 'error');
    } finally {
      setLoadingSummary(false);
    }
  };

  const showToast = (
    message: string,
    type: ToastMessage['type'] = 'info',
    opts?: Partial<Pick<ToastMessage, 'photo' | 'employee' | 'checkin' | 'checkout'>>
  ) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type, ...(opts || {}) } as ToastMessage]);
    setTimeout(() => removeToast(id), 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleCapture = async () => {
    if (isProcessing || !cameraRef.current) return;

    setIsProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (!photo) {
        showToast('Failed to capture photo', 'error');
        setIsProcessing(false);
        return;
      }

      const formData = new FormData();
      formData.append('image', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: 'attendance.jpg',
      } as any);

      const res = await markAttendance(formData);
      const payload = res?.data || {};

      // Try to locate attendance info in response
      const attendance = payload.attendance || payload;
      let checkin = attendance.checkin_time || attendance.checkin || payload.checkin || payload.checkin_time;
      let checkout = attendance.checkout_time || attendance.checkout || payload.checkout || payload.checkout_time;
      const employee = attendance.employee_name || attendance.employee || payload.employee_name || payload.employee;

      // helper: fetch today's attendance list and return matching record by employee name
      const fetchAttendanceDetails = async (empName?: string) => {
        if (!empName) return null;
        try {
          const r = await getTodayAttendanceSummary();
          const list = Array.isArray(r.data) ? r.data : [];
          const found = list.find((row: any) => {
            const names = [row.employee_name, row.employee, row.name].filter(Boolean).map(String);
            return names.includes(String(empName));
          });
          return found || null;
        } catch (e) {
          return null;
        }
      };

      const formatTime = (t?: string) => {
        if (!t) return null;
        // If already readable, return trimmed string
        if (t.indexOf(':') !== -1) {
          try {
            // some responses may be HH:MM or HH:MM:SS
            const parts = t.split(':');
            const hh = Number(parts[0]);
            const mm = Number(parts[1] || 0);
            const date = new Date();
            date.setHours(hh, mm, 0, 0);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } catch (e) {
            return String(t);
          }
        }
        return String(t);
      };

      // If server didn't return checkin/checkout in payload, try to fetch today's record
      if ((!checkin && !checkout) && employee) {
        const details = await fetchAttendanceDetails(employee);
        if (details) {
          checkin = details.checkin || details.checkin_time || checkin;
          checkout = details.checkout || details.checkout_time || checkout;
        }
      }

      // format times for display
      const formattedCheckin = formatTime(checkin);
      const formattedCheckout = formatTime(checkout);

      // show captured photo in toast (local uri) and include times if available
      showToast(
        payload.status && typeof payload.status === 'string' && payload.status.toLowerCase().includes('already')
          ? 'Attendance already recorded' : 'Attendance marked successfully!',
        payload.status && typeof payload.status === 'string' && payload.status.toLowerCase().includes('already') ? 'info' : 'success',
        { photo: photo.uri, employee: employee, checkin: formattedCheckin ?? undefined, checkout: formattedCheckout ?? undefined }
      );

      await loadAttendanceSummary();
    } catch (error: any) {
      const message =
        error.response?.data?.detail ||
        error.response?.data?.error ||
        'Failed to mark attendance';
      showToast(message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const requestPermission = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (err) {
      setHasPermission(false);
    }
  };

  if (hasPermission !== true) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIconContainer}>
            <MaterialIcons name="photo-camera" size={64} color="#1976d2" />
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Instructions Card */}
        <View style={styles.instructionsCard}>
          <MaterialIcons name="info" size={24} color="#1976d2" />
          <View style={styles.instructionsContent}>
            <Text style={styles.instructionsTitle}>How to Mark Attendance</Text>
            <Text style={styles.instructionsText}>
              Position your face in the camera frame and tap the capture button
            </Text>
          </View>
        </View>

        {/* Camera View */}
        <View style={styles.cameraCard}>
          <View style={styles.cameraContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="front"
              onCameraReady={() => setCameraActive(true)}
            />
            <View style={styles.cameraOverlay}>
              <View style={styles.faceBorder} />
            </View>
          </View>

          <View style={styles.cameraFooter}>
            <View style={styles.cameraStatus}>
              <View style={[styles.statusDot, cameraActive && styles.statusDotActive]} />
              <Text style={styles.cameraStatusText}>
                {cameraActive ? 'Camera Ready' : 'Initializing...'}
              </Text>
            </View>
          </View>
        </View>

        {/* Capture Button */}
        <Animated.View style={{ transform: [{ scale: isProcessing ? 1 : pulseAnim }] }}>
          <TouchableOpacity
            style={[styles.captureButton, (isProcessing || !cameraActive) && styles.captureButtonDisabled]}
            onPress={handleCapture}
            disabled={isProcessing || !cameraActive}
            activeOpacity={0.8}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <>
                <MaterialIcons name="photo-camera" size={32} color="#fff" />
                <Text style={styles.captureButtonText}>Mark Attendance</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Summary Section */}
        {/* <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <MaterialIcons name="today" size={24} color="#1976d2" />
            <Text style={styles.summaryTitle}>Today's Summary</Text>
          </View>
          {loadingSummary ? (
            <View style={styles.summaryLoading}>
              <ActivityIndicator size="small" color="#1976d2" />
              <Text style={styles.loadingText}>Loading summary...</Text>
            </View>
          ) : summaryData ? (
            <View style={styles.summaryContent}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Present</Text>
                <Text style={styles.summaryValue}>
                  {summaryData.total_present || 0}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Absent</Text>
                <Text style={styles.summaryValue}>
                  {summaryData.total_absent || 0}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.summaryEmpty}>No attendance data available</Text>
          )}
        </View> */}
      </ScrollView>

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <View style={styles.toastContainer}>
          {toasts.map((toast) => (
            <View
              key={toast.id}
              style={[styles.toast, toast.type === 'success' && styles.toastSuccess, toast.type === 'error' && styles.toastError]}
            >
              {toast.photo ? (
                <Image source={{ uri: toast.photo }} style={styles.toastPhoto} />
              ) : (
                <MaterialIcons
                  name={toast.type === 'success' ? 'check-circle' : 'error'}
                  size={20}
                  color="#fff"
                />
              )}
              <View style={styles.toastContent}>
                {/* Username */}
                {toast.employee && (
                  <Text style={styles.toastTitle}>{toast.employee}</Text>
                )}
                {/* Success message always shown */}
                {toast.type === 'success' && (
                  <Text style={styles.toastDetail}>Attendance marked successfully!</Text>
                )}
                {/* Error/info message fallback */}
                {toast.type !== 'success' && (
                  <Text style={styles.toastDetail}>{toast.message}</Text>
                )}
                {/* Check-in/Check-out times */}
                {(toast.checkin || toast.checkout) && (
                  <Text style={styles.toastDetail}>
                    {toast.checkin ? `Check-in: ${toast.checkin}` : ''}
                    {toast.checkin && toast.checkout ? '  •  ' : ''}
                    {toast.checkout ? `Check-out: ${toast.checkout}` : ''}
                  </Text>
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
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e3f2fd',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 300,
  },
  permissionButton: {
    flexDirection: 'row',
    backgroundColor: '#1976d2',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#1976d2',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  instructionsCard: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bbdefb',
  },
  instructionsContent: {
    flex: 1,
    marginLeft: 12,
  },
  instructionsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 13,
    color: '#1565c0',
    lineHeight: 18,
  },
  cameraCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cameraContainer: {
    height: 400,
    backgroundColor: '#000',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceBorder: {
    width: 250,
    height: 300,
    borderWidth: 3,
    borderColor: '#4caf50',
    borderRadius: 150,
    opacity: 0.7,
  },
  cameraFooter: {
    backgroundColor: '#ffffff',
    padding: 16,
  },
  cameraStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#999',
    marginRight: 8,
  },
  statusDotActive: {
    backgroundColor: '#4caf50',
  },
  cameraStatusText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  captureButton: {
    backgroundColor: '#1976d2',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...Platform.select({
      ios: {
        shadowColor: '#1976d2',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
    letterSpacing: 0.5,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginLeft: 12,
  },
  summaryLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
  },
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1976d2',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#e8e8e8',
  },
  summaryEmpty: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  toast: {
    flexDirection: 'row',
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  toastSuccess: {
    backgroundColor: '#4caf50',
  },
  toastError: {
    backgroundColor: '#d32f2f',
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
  toastPhoto: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#eee',
  },
  toastContent: {
    flex: 1,
  },
  toastTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  toastDetail: {
    color: '#fff',
    fontSize: 13,
    opacity: 0.9,
    marginTop: 4,
  },
});