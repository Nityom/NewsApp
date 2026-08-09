import { Ionicons } from '@expo/vector-icons';
import * as Font from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { ArticlesProvider } from '@/context/ArticlesContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { NotificationsProvider } from '@/context/NotificationsContext';
import { PaymentsProvider } from '@/context/PaymentsContext';
import { PublicationInfoProvider } from '@/context/PublicationInfoContext';
import { ReportersProvider } from '@/context/ReportersContext';
import { AppThemeProvider, useAppTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function PhoneNumberGate() {
  const { requiresPhone, submitPhoneNumber } = useAuth();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (phone.trim().length < 10) {
      setError('Enter a valid phone number');
      return;
    }
    setSubmitting(true);
    try {
      await submitPhoneNumber(phone.trim());
      setPhone('');
      setError(undefined);
    } catch (err) {
      Alert.alert('Could not save phone number', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      visible={requiresPhone}
      title="Add Your Phone Number"
      message="We use your phone number to credit your articles and for editorial contact. Please add it to continue."
      actions={[{ label: submitting ? 'Saving...' : 'Continue', onPress: handleSubmit }]}>
      <Input
        leftIcon="call-outline"
        keyboardType="phone-pad"
        placeholder="+91 98765 43210"
        value={phone}
        onChangeText={setPhone}
        error={error}
      />
    </Dialog>
  );
}

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
      <PhoneNumberGate />
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
          <AuthProvider>
            <NotificationsProvider>
              <ArticlesProvider>
                <ReportersProvider>
                  <PaymentsProvider>
                    <PublicationInfoProvider>
                      <RootNavigator />
                    </PublicationInfoProvider>
                  </PaymentsProvider>
                </ReportersProvider>
              </ArticlesProvider>
            </NotificationsProvider>
          </AuthProvider>
        </AppThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
