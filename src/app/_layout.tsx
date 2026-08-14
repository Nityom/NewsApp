import { Ionicons } from '@expo/vector-icons';
import * as Font from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ConvexFirebaseProvider } from '@/components/system/ConvexFirebaseProvider';
import { SystemNotifications } from '@/components/system/SystemNotifications';
import { ArticlesProvider } from '@/context/ArticlesContext';
import { AuthProvider } from '@/context/AuthContext';
import { NotificationsProvider } from '@/context/NotificationsContext';
import { PaymentsProvider } from '@/context/PaymentsContext';
import { PublicationInfoProvider } from '@/context/PublicationInfoContext';
import { ReportersProvider } from '@/context/ReportersContext';
import { AppThemeProvider, useAppTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const theme = useAppTheme();

  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(reporter)" />
        <Stack.Screen name="(admin)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    Font.loadAsync(Ionicons.font)
      .catch(() => {})
      .finally(() => setFontsReady(true));
  }, []);

  const onLayoutRootView = useCallback(() => {
    if (fontsReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsReady]);

  if (!fontsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <AppThemeProvider>
          <ConvexFirebaseProvider>
            <AuthProvider>
              <NotificationsProvider>
                <ArticlesProvider>
                  <ReportersProvider>
                    <SystemNotifications />
                    <PaymentsProvider>
                      <PublicationInfoProvider>
                        <RootNavigator />
                      </PublicationInfoProvider>
                    </PaymentsProvider>
                  </ReportersProvider>
                </ArticlesProvider>
              </NotificationsProvider>
            </AuthProvider>
          </ConvexFirebaseProvider>
        </AppThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
