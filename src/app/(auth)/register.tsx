import { useConvexAuth } from 'convex/react';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Link, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, IconButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationsContext';
import { useReporters } from '@/context/ReportersContext';
import { setJustSubmittedReporterId } from '@/lib/joinRequestFlag';
import { useAppTheme } from '@/theme';
import type { CurrentUser, Reporter } from '@/types/models';

export default function RegisterScreen() {
  const theme = useAppTheme();
  const { register, loginWithGoogle, updateUserProfile, isLoading } = useAuth();
  const { isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const { addReporter } = useReporters();
  const { addNotification } = useNotifications();
  const [account, setAccount] = useState<CurrentUser | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [village, setVillage] = useState('');
  const [aadharNumber, setAadharNumber] = useState('');
  const [address, setAddress] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [pendingReporter, setPendingReporter] = useState<Reporter | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const submissionStartedRef = useRef(false);

  const scrollToInput = (inputRef: React.RefObject<TextInput | null>) => {
    const scrollNode = scrollRef.current?.getNativeScrollRef();
    if (!scrollNode) return;
    inputRef.current?.measureLayout(
      scrollNode,
      (_x, y) => scrollRef.current?.scrollTo({ y: y - 24, animated: true }),
      () => {},
    );
  };

  const pickPhoto = async (source: 'gallery' | 'camera') => {
    const permission = source === 'gallery'
      ? await ImagePicker.requestMediaLibraryPermissionsAsync()
      : await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', `Please allow ${source === 'gallery' ? 'photo library' : 'camera'} access to add your photo.`);
      return;
    }
    const result = source === 'gallery'
      ? await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [3, 4],
          quality: 0.9,
          allowsMultipleSelection: false,
        })
      : await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [3, 4], quality: 0.9 });
    if (!result.canceled && result.assets[0]) setPhoto(result.assets[0].uri);
  };

  useEffect(() => {
    if (!pendingReporter || !isConvexAuthenticated || submissionStartedRef.current) return;
    submissionStartedRef.current = true;

    const submitApplication = async () => {
      try {
        await updateUserProfile({
          name: pendingReporter.name,
          phone: pendingReporter.phone,
          city: pendingReporter.city,
        });
        await addReporter(pendingReporter);
        try {
          await addNotification({
            type: 'reporter_joined',
            audience: 'admin',
            title: 'New Reporter Request',
            message: `${pendingReporter.name} wants to join as a reporter from ${pendingReporter.village}.`,
            reporterId: pendingReporter.id,
          });
        } catch (notificationError) {
          console.warn('Could not send reporter request notification:', notificationError);
        }
        setJustSubmittedReporterId(pendingReporter.id);
        setPendingReporter(null);
        Alert.alert(
          'Request Sent',
          'Your account and reporter request were created successfully. You will be notified once approved.',
          [{ text: 'OK', onPress: () => router.replace('/(reporter)/(tabs)') }],
        );
      } catch (error) {
        submissionStartedRef.current = false;
        setPendingReporter(null);
        setSubmitting(false);
        Alert.alert('Could not send request', error instanceof Error ? error.message : 'Please try again.');
      }
    };

    submitApplication();
  }, [addNotification, addReporter, isConvexAuthenticated, pendingReporter, updateUserProfile]);

  const handleRegister = async () => {
    const nextErrors: Record<string, string> = {};
    if (name.trim().length < 3) nextErrors.name = 'Enter your full name';
    if (!account && !email.includes('@')) nextErrors.email = 'Enter a valid email';
    if (!account && password.length < 6) nextErrors.password = 'Password must be at least 6 characters';
    if (!account && confirmPassword !== password) nextErrors.confirmPassword = 'Passwords do not match';
    if (phone.replace(/\D/g, '').length < 10) nextErrors.phone = 'Enter a valid contact number';
    if (village.trim().length < 2) nextErrors.village = 'Enter your village (Gaon) name';
    if (address.trim().length < 5) nextErrors.address = 'Enter your full address';
    if (!photo) nextErrors.photo = 'Upload or capture your passport photo';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const registeredAccount = account ?? await register(email.trim(), password);
      setAccount(registeredAccount);
      const reporterCode = `RPT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      setPendingReporter({
        id: `rep-${registeredAccount.email.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: name.trim(),
        email: registeredAccount.email,
        phone: phone.trim(),
        avatar: photo ?? '',
        bio: '',
        city: village.trim(),
        joinedAt: new Date().toISOString(),
        isVerified: false,
        isActive: false,
        articlesCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        rating: 0,
        totalEarnings: 0,
        village: village.trim(),
        address: address.trim(),
        aadharNumber: aadharNumber.trim() || undefined,
        photo,
        requestStatus: 'pending',
        reporterCode,
      });
    } catch (error: any) {
      Alert.alert('Could not create account', error?.message ?? 'Please try again.');
      setSubmitting(false);
    }
  };

  const handleGoogleRegister = async () => {
    setGoogleSubmitting(true);
    try {
      const googleAccount = await loginWithGoogle('reporter');
      setAccount(googleAccount);
      setEmail(googleAccount.email);
      setName((current) => current || googleAccount.name);
    } catch (error: any) {
      Alert.alert('Could not sign in with Google', error?.message ?? 'Please try again.');
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" onPress={() => router.back()} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Create Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Create your account and send your reporter details to the admin in one form.
          </Text>

          <View style={styles.form}>
            <Input label="Full Name" leftIcon="person-outline" placeholder="Jane Doe" value={name} onChangeText={setName} error={errors.name} />
            <Input
              label="Email"
              leftIcon="mail-outline"
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!account}
              error={errors.email}
            />
            {!account ? (
              <>
                <Input
                  label="Password"
                  ref={passwordRef}
                  leftIcon="lock-closed-outline"
                  placeholder="••••••••"
                  isPassword
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => scrollToInput(passwordRef)}
                  error={errors.password}
                />
                <Input
                  label="Confirm Password"
                  ref={confirmPasswordRef}
                  leftIcon="lock-closed-outline"
                  placeholder="••••••••"
                  isPassword
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => scrollToInput(confirmPasswordRef)}
                  error={errors.confirmPassword}
                />
              </>
            ) : null}
            <Input label="Contact Number" leftIcon="call-outline" placeholder="+91 98765 43210" keyboardType="phone-pad" value={phone} onChangeText={setPhone} error={errors.phone} />
            <Input label="Gaon (Village Name)" placeholder="Enter your village name" value={village} onChangeText={setVillage} error={errors.village} />
            <Input label="Aadhar Number (Optional)" placeholder="XXXX XXXX XXXX" keyboardType="number-pad" value={aadharNumber} onChangeText={setAadharNumber} />
            <Input label="Address" placeholder="House no., street, city, pin code" multiline style={{ minHeight: 80 }} value={address} onChangeText={setAddress} error={errors.address} />

            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Passport Photo</Text>
            <View style={[styles.photoWrap, { borderColor: errors.photo ? theme.colors.danger : theme.colors.border, backgroundColor: theme.colors.backgroundSubtle, borderRadius: theme.radius.lg }]}> 
              {photo ? <Image source={{ uri: photo }} style={styles.photoPreview} contentFit="cover" /> : (
                <View style={styles.photoPlaceholder}><Icon name="person-circle-outline" size={40} color={theme.colors.textMuted} /></View>
              )}
              <View style={styles.photoActions}>
                <Button label="Upload Photo" variant="outline" icon="image-outline" onPress={() => pickPhoto('gallery')} />
                <Button label="Capture Photo" variant="outline" icon="camera-outline" onPress={() => pickPhoto('camera')} />
              </View>
            </View>
            {errors.photo ? <Text style={[styles.errorText, { color: theme.colors.danger }]}>{errors.photo}</Text> : null}

            <Button label={account ? 'Send Request to Admin' : 'Create Account & Send Request'} onPress={handleRegister} loading={submitting || isLoading} fullWidth size="lg" />

            {!account ? (
              <>
                <View style={styles.dividerRow}>
                  <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
                  <Text style={{ color: theme.colors.textMuted, fontSize: 12.5 }}>or</Text>
                  <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
                </View>
                <Button label="Connect Google Account" variant="outline" icon="logo-google" onPress={handleGoogleRegister} loading={googleSubmitting} fullWidth size="lg" />
              </>
            ) : null}
          </View>

          <View style={styles.footerRow}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13.5 }}>
              Already have an account?{' '}
            </Text>
            <Link href="/(auth)/login" style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 13.5 }}>
              Sign In
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: -8,
  },
  photoWrap: {
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  photoPreview: {
    width: 64,
    height: 84,
    borderRadius: 8,
  },
  photoPlaceholder: {
    width: 64,
    height: 84,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoActions: {
    flex: 1,
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    marginTop: -10,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  changeNumber: {
    textAlign: 'center',
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
  },
});
