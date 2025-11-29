import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import useAuth from '../hooks/useAuth';
import { login as loginApi } from '../api/authApi';

export const LoginScreen: React.FC<{ navigation?: any }> = (): React.ReactElement => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await loginApi(email.trim(), password);
      await login(response.data);
    } catch (err: any) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Login failed. Please check your credentials.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}> 
            <View style={styles.headerSection}>
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <MaterialIcons name="face" size={48} color="#1976d2" />
                </View>
              </View>
              <Text style={styles.title}>Faceio</Text>
              <Text style={styles.subtitle}>Facial Recognition Attendance System</Text>
            </View>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Welcome Back</Text>
              <Text style={styles.formSubtitle}>Sign in to continue</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={[
                  styles.inputContainer,
                  focusedField === 'email' && styles.inputFocused,
                  error && styles.inputError,
                ]}>
                  <MaterialIcons
                    name="email"
                    size={20}
                    color={focusedField === 'email' ? '#1976d2' : '#999'}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setError(null);
                    }}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    editable={!loading}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={[
                  styles.inputContainer,
                  focusedField === 'password' && styles.inputFocused,
                  error && styles.inputError,
                ]}>
                  <MaterialIcons
                    name="lock"
                    size={20}
                    color={focusedField === 'password' ? '#1976d2' : '#999'}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setError(null);
                    }}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    editable={!loading}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <MaterialIcons
                      name={showPassword ? 'visibility' : 'visibility-off'}
                      size={20}
                      color="#999"
                    />
                  </TouchableOpacity>
                </View>
              </View>
              {error && (
                <View style={styles.errorContainer}>
                  <MaterialIcons name="error" size={16} color="#d32f2f" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Sign In</Text>
                    <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  content: { padding: 24 },
  headerSection: { alignItems: 'center', marginBottom: 32 },
  logoContainer: { marginBottom: 12 },
  logoCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#e3f2fd', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#1976d2', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  formCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#1976d2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 2 },
  formTitle: { fontSize: 20, fontWeight: '700', color: '#1976d2', marginBottom: 4 },
  formSubtitle: { fontSize: 13, color: '#666', marginBottom: 16 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 13, color: '#1976d2', fontWeight: '600', marginBottom: 6 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e3f2fd' },
  inputFocused: { borderColor: '#1976d2' },
  inputError: { borderColor: '#d32f2f' },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, height: 44, fontSize: 15, color: '#222' },
  eyeIcon: { padding: 4 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  errorText: { color: '#d32f2f', fontSize: 13, marginLeft: 6 },
  loginButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1976d2', borderRadius: 10, paddingVertical: 14, marginTop: 12 },
  loginButtonDisabled: { opacity: 0.6 },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: '700', marginRight: 8 },
});

export default LoginScreen;
