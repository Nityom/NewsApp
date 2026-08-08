import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationsContext';
import { useReporters } from '@/context/ReportersContext';
import { setJustSubmittedReporterId } from '@/lib/joinRequestFlag';
import { useAppTheme } from '@/theme';
import type { Reporter } from '@/types/models';

export default function ReporterDetailsScreen() {
  const theme = useAppTheme();
  const { user } = useAuth();
  const { addReporter } = useReporters();
  const { addNotification } = useNotifications();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [village, setVillage] = useState('');
  const [aadharNumber, setAadharNumber] = useState('');
  const [address, setAddress] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const pickPhoto = async (source: 'gallery' | 'camera') => {
    const permission =
      source === 'gallery'
        ? await ImagePicker.requestMediaLibraryPermissionsAsync()
        : await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', `Please allow ${source === 'gallery' ? 'photo library' : 'camera'} access to add your photo.`);
      return;
    }
    const result =
      source === 'gallery'
        ? await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [3, 4],
            quality: 0.9,
            allowsMultipleSelection: false,
          })
        : await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [3, 4],
            quality: 0.9,
          });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    setPhoto(asset.uri);
  };

  const handleSubmit = async () => {
    const nextErrors: Record<string, string> = {};
    if (name.trim().length < 3) nextErrors.name = 'Enter your full name';
    if (phone.replace(/\D/g, '').length < 10) nextErrors.phone = 'Enter a valid contact number';
    if (village.trim().length < 2) nextErrors.village = 'Enter your village (Gaon) name';
    if (address.trim().length < 5) nextErrors.address = 'Enter your full address';
    if (!photo) nextErrors.photo = 'Upload or capture your passport photo';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (!user?.email) {
      Alert.alert('Something went wrong', 'No signed-in account found. Please sign in again.');
      return;
    }

    setSubmitting(true);
    try {
      // Stable per-account ID (not a per-submission timestamp) so a resubmission or retry always
      // updates the same record instead of creating a duplicate the dashboard gate could confuse.
      const reporter: Reporter = {
        id: `rep-${user.email.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: name.trim(),
        email: user.email,
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
      };
      await addReporter(reporter);
      await addNotification({
        type: 'reporter_joined',
        audience: 'admin',
        title: 'New Reporter Request',
        message: `${reporter.name} wants to join as a reporter from ${reporter.village}.`,
        reporterId: reporter.id,
      });
      // Lets the dashboard gate show "pending" immediately instead of racing the Firestore
      // listener for this brand-new record to arrive.
      setJustSubmittedReporterId(reporter.id);
      Alert.alert(
        'Request Sent',
        'Your details have been sent to the admin for approval. You will be notified once approved.',
        [{ text: 'OK', onPress: () => router.replace('/(reporter)/(tabs)') }],
      );
    } catch {
      setSubmitting(false);
      Alert.alert('Something went wrong', 'Could not send your request. Please try again.');
    }
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: theme.colors.text }]}>Complete Your Reporter Profile</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Fill this form to send your details to the admin for approval. You can start publishing once approved.
          </Text>

          <View style={styles.form}>
            <Input label="Name" placeholder="Full name" value={name} onChangeText={setName} error={errors.name} />
            <Input
              label="Contact Number"
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              error={errors.phone}
            />
            <Input
              label="Gaon (Village Name)"
              placeholder="Enter your village name"
              value={village}
              onChangeText={setVillage}
              error={errors.village}
            />
            <Input
              label="Aadhar Number (Optional)"
              placeholder="XXXX XXXX XXXX"
              keyboardType="number-pad"
              value={aadharNumber}
              onChangeText={setAadharNumber}
            />
            <Input
              label="Address"
              placeholder="House no., street, city, pin code"
              multiline
              style={{ minHeight: 80 }}
              value={address}
              onChangeText={setAddress}
              error={errors.address}
            />

            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Passport Photo</Text>
            <View
              style={[
                styles.photoWrap,
                {
                  borderColor: errors.photo ? theme.colors.danger : theme.colors.border,
                  backgroundColor: theme.colors.backgroundSubtle,
                  borderRadius: theme.radius.lg,
                },
              ]}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.photoPreview} contentFit="cover" />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Icon name="person-circle-outline" size={40} color={theme.colors.textMuted} />
                </View>
              )}
              <View style={styles.photoActions}>
                <Button label="Upload Photo" variant="outline" icon="image-outline" onPress={() => pickPhoto('gallery')} />
                <Button label="Capture Photo" variant="outline" icon="camera-outline" onPress={() => pickPhoto('camera')} />
              </View>
            </View>
            {errors.photo ? <Text style={[styles.errorText, { color: theme.colors.danger }]}>{errors.photo}</Text> : null}

            <Button
              label="Send Request to Admin"
              onPress={handleSubmit}
              loading={submitting}
              fullWidth
              size="lg"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 19,
    marginTop: 8,
  },
  form: {
    marginTop: 24,
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
});
