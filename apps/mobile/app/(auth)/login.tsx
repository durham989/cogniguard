import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { colors } from '@/constants/theme';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function LoginScreen() {
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  function validate() {
    const e: typeof errors = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    try {
      const { accessToken, refreshToken, user } = await api.auth.login({ email: email.trim().toLowerCase(), password });
      await setAuth(accessToken, refreshToken, user);
      // AuthGuard in _layout.tsx handles routing based on onboardingComplete
    } catch (err: any) {
      const msg = err.status === 401
        ? 'Invalid email or password'
        : err.message ?? 'Login failed. Please try again.';
      Alert.alert('Login failed', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Preventia</Text>
        <Text style={styles.subtitle}>Your cognitive wellness companion</Text>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              testID="login-email"
              style={[styles.input, errors.email ? styles.inputError : null]}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              testID="login-password"
              style={[styles.input, errors.password ? styles.inputError : null]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textOnAccent} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/register" style={styles.link}>
            Sign up
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.textPrimary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.textOnAccent,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  link: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
});
