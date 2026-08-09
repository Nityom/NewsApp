import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Button, IconButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAuth } from '@/context/AuthContext';
import { useReporters } from '@/context/ReportersContext';
import { useAppTheme } from '@/theme';

export default function EditProfileScreen() {
  const theme = useAppTheme();
  const { user, updateUserProfile } = useAuth();
  const { getReporterByEmail, updateReporter } = useReporters();
  const reporter = user?.email ? getReporterByEmail(user.email) : undefined;
  const initializedReporterIdRef = useRef<string | null>(null);
  const [avatar, setAvatar] = useState(reporter?.avatar || reporter?.photo || user?.avatar);
  const [name, setName] = useState(reporter?.name ?? user?.name ?? '');
  const [phone, setPhone] = useState(reporter?.phone ?? user?.phone ?? '');
  const [city, setCity] = useState(reporter?.city ?? user?.city ?? '');
  const [bio, setBio] = useState(reporter?.bio ?? user?.bio ?? '');
  const [village, setVillage] = useState(reporter?.village ?? '');
  const [address, setAddress] = useState(reporter?.address ?? '');
  const [aadharNumber, setAadharNumber] = useState(reporter?.aadharNumber ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!reporter || initializedReporterIdRef.current === reporter.id) return;
    initializedReporterIdRef.current = reporter.id;
    setAvatar(reporter.avatar || reporter.photo || user?.avatar);
    setName(reporter.name);
    setPhone(reporter.phone);
    setCity(reporter.city);
    setBio(reporter.bio);
    setVillage(reporter.village ?? '');
    setAddress(reporter.address ?? '');
    setAadharNumber(reporter.aadharNumber ?? '');
  }, [reporter, user?.avatar]);

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow photo library access to update your photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    setAvatar(result.assets[0]?.uri);
  };

  const handleSave = async () => {
    const nextErrors: Record<string, string> = {};
    if (name.trim().length < 3) nextErrors.name = 'Enter your full name';
    if (phone.trim().length < 10) nextErrors.phone = 'Enter a valid phone number';
    if (!reporter) nextErrors.form = 'Your reporter profile is still loading';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!reporter) return;

    setSubmitting(true);
    try {
      const resolvedProfile = await updateReporter(reporter.id, {
        name: name.trim(),
        phone: phone.trim(),
        city: city.trim(),
        bio: bio.trim(),
        village: village.trim() || undefined,
        address: address.trim() || undefined,
        aadharNumber: aadharNumber.trim() || undefined,
        avatar,
        photo: avatar,
      });
      await updateUserProfile({
        name: name.trim(),
        phone: phone.trim(),
        city: city.trim(),
        bio: bio.trim(),
        avatar: resolvedProfile.avatar ?? avatar,
      });
      Alert.alert('Profile Updated', 'Your profile has been saved.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Could not save profile', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" onPress={() => router.back()} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarWrap}>
          <Avatar uri={avatar} name={name || 'R'} size={92} />
          <View style={[styles.avatarEditBadge, { backgroundColor: theme.colors.primary }]} onTouchEnd={pickAvatar}>
            <Icon name="camera" size={16} color="#fff" />
          </View>
        </View>

        <View style={styles.form}>
          <Input label="Full Name" leftIcon="person-outline" value={name} onChangeText={setName} error={errors.name} />
          <Input label="Phone Number" leftIcon="call-outline" keyboardType="phone-pad" value={phone} onChangeText={setPhone} error={errors.phone} />
          <Input label="City" leftIcon="location-outline" value={city} onChangeText={setCity} error={errors.city} />
          <Input label="Village (Gaon)" leftIcon="location-outline" value={village} onChangeText={setVillage} />
          <Input label="Address" leftIcon="home-outline" value={address} onChangeText={setAddress} multiline />
          <Input label="Aadhar Number" leftIcon="card-outline" keyboardType="number-pad" value={aadharNumber} onChangeText={setAadharNumber} />
          <Input label="Bio" leftIcon="document-text-outline" value={bio} onChangeText={setBio} multiline error={errors.bio} />

          {errors.form ? <Text style={[styles.formError, { color: theme.colors.danger }]}>{errors.form}</Text> : null}
          <Button label="Save Changes" onPress={handleSave} loading={submitting} fullWidth size="lg" />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  avatarWrap: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  avatarEditBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  form: {
    gap: 16,
  },
  formError: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
