import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Icon, IconName } from '@/components/ui/Icon';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/theme';
import { useState } from 'react';

function MenuRow({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={styles.menuRow}>
      <View style={[styles.menuIcon, { backgroundColor: danger ? theme.colors.dangerMuted : theme.colors.backgroundSubtle }]}>
        <Icon name={icon} size={18} color={danger ? theme.colors.danger : theme.colors.text} />
      </View>
      <Text style={[styles.menuLabel, { color: danger ? theme.colors.danger : theme.colors.text }]}>{label}</Text>
      <Icon name="chevron-forward" size={18} color={theme.colors.textMuted} />
    </Pressable>
  );
}

export default function ReporterProfileScreen() {
  const theme = useAppTheme();
  const { user, logout, resendVerificationEmail } = useAuth();
  const [logoutVisible, setLogoutVisible] = useState(false);

  const handleResendVerification = async () => {
    try {
      await resendVerificationEmail();
      Alert.alert('Verification Email Sent', 'Please check your inbox (and spam folder).');
    } catch (error) {
      Alert.alert('Could not send email', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const stats = [
    { label: 'Articles', value: 42 },
    { label: 'Approved', value: 36 },
    { label: 'Rating', value: '4.8' },
  ];

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Avatar uri={user?.avatar} name={user?.name ?? 'R'} size={82} />
        <Text style={[styles.name, { color: theme.colors.text }]}>{user?.name}</Text>
        <Text style={[styles.email, { color: theme.colors.textSecondary }]}>{user?.email}</Text>
        <View style={styles.statsRow}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <Card style={styles.menuCard} padded={false}>
        <MenuRow icon="person-outline" label="Edit Profile" onPress={() => router.push('/(reporter)/edit-profile')} />
        {/* <MenuRow icon="mail-unread-outline" label="Resend Verification Email" onPress={handleResendVerification} /> */}
        <MenuRow icon="card-outline" label="Payments & Payouts" onPress={() => router.push('/(reporter)/payment')} />
        <MenuRow icon="lock-closed-outline" label="Change Password" onPress={() => router.push('/(reporter)/change-password')} />
        <MenuRow icon="settings-outline" label="Settings" onPress={() => router.push('/(reporter)/settings')} />
      </Card>

      <Card style={styles.menuCard} padded={false}>
        <MenuRow icon="help-circle-outline" label="Help & Support" onPress={() => router.push('/(reporter)/help-support')} />
        <MenuRow icon="document-lock-outline" label="Terms & Privacy" onPress={() => router.push('/(reporter)/terms-privacy')} />
        <MenuRow icon="log-out-outline" label="Logout" onPress={() => setLogoutVisible(true)} danger />
      </Card>

      <Dialog
        visible={logoutVisible}
        title="Log out?"
        message="You will need to sign in again to access your reporter account."
        onRequestClose={() => setLogoutVisible(false)}
        actions={[
          { label: 'Cancel', onPress: () => setLogoutVisible(false), variant: 'outline' },
          {
            label: 'Logout',
            variant: 'danger',
            onPress: () => {
              setLogoutVisible(false);
              logout();
              router.replace('/(auth)/login');
            },
          },
        ]}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  name: {
    fontSize: 19,
    fontWeight: '800',
    marginTop: 12,
  },
  email: {
    fontSize: 13,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 28,
    marginTop: 18,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11.5,
    marginTop: 2,
    fontWeight: '500',
  },
  menuCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
  },
});
