import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/store/auth.store';

SplashScreen.preventAutoHideAsync();

function AuthGuard() {
  const { token, user, hydrated } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    SplashScreen.hideAsync();

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    const inTabs = segments[0] === '(tabs)';

    if (!token) {
      if (!inAuthGroup) router.replace('/(auth)/login');
      return;
    }

    // Authenticated user
    if (inAuthGroup) {
      // Just logged in — decide where to send them
      if (user && !user.onboardingComplete) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
      return;
    }

    if (user && !user.onboardingComplete && !inOnboarding) {
      router.replace('/onboarding');
      return;
    }

    if (user && user.onboardingComplete && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [token, user, hydrated, segments]);

  return null;
}

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, []);

  return (
    <>
      <AuthGuard />
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
      </Stack>
    </>
  );
}
