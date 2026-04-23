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
  ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { colors } from '@/constants/theme';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export default function RegisterScreen() {
  const setAuth = useAuthStore((s) => s.setAuth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  function validate() {
    const e: typeof errors = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 8) e.password = 'Password must be at least 8 characters';
    if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    setLoading(true);
    try {
      const { accessToken, refreshToken, user } = await api.auth.register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      await setAuth(accessToken, refreshToken, user);
      // AuthGuard in _layout.tsx handles routing based on onboardingComplete
    } catch (err: any) {
      const msg = err.status === 409
        ? 'An account with that email already exists'
        : err.message ?? 'Registration failed. Please try again.';
      Alert.alert('Registration failed', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Start your cognitive wellness journey</Text>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              testID="register-name"
              style={[styles.input, errors.name ? styles.inputError : null]}
              value={name}
              onChangeText={setName}
              placeholder="Jane Smith"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
            />
            {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              testID="register-email"
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
              testID="register-password"
              style={[styles.input, errors.password ? styles.inputError : null]}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              returnKeyType="next"
            />
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              testID="register-confirm-password"
              style={[styles.input, errors.confirmPassword ? styles.inputError : null]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />
            {errors.confirmPassword ? (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textOnAccent} />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" style={styles.link}>
            Sign in
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 36,
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
