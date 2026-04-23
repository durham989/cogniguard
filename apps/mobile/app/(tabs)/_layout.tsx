import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.borderLight,
        },
        headerStyle: { backgroundColor: colors.bgSurface },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: '600', color: colors.textPrimary },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Train',
          headerTitle: 'Preventia',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pulse-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="solo"
        options={{
          title: 'Solo',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="layers-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
