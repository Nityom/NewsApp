import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Icon, IconName } from '@/components/ui/Icon';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/theme';

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

export default function AdminMoreScreen() {
  const theme = useAppTheme();
  const { user, logout } = useAuth();
  const [logoutVisible, setLogoutVisible] = useState(false);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Avatar uri={user?.avatar} name={user?.name ?? 'A'} size={56} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: theme.colors.text }]}>{user?.name}</Text>
          <Text style={[styles.role, { color: theme.colors.textSecondary }]}>Administrator</Text>
        </View>
      </View>

      <Card style={styles.menuCard} padded={false}>
        <MenuRow icon="bar-chart-outline" label="Analytics Dashboard" onPress={() => router.push('/(admin)/analytics')} />
        <MenuRow icon="notifications-outline" label="Notifications" onPress={() => router.push('/(admin)/notifications')} />
        <MenuRow icon="settings-outline" label="Settings" onPress={() => router.push('/(admin)/settings')} />
      </Card>

      <Card style={styles.menuCard} padded={false}>
        <MenuRow icon="help-circle-outline" label="Help & Support" onPress={() => {}} />
        <MenuRow icon="document-lock-outline" label="Terms & Privacy" onPress={() => {}} />
        <MenuRow icon="log-out-outline" label="Logout" onPress={() => setLogoutVisible(true)} danger />
      </Card>

      <Dialog
        visible={logoutVisible}
        title="Log out?"
        message="You will need to sign in again to access the admin console."
        onRequestClose={() => setLogoutVisible(false)}
        actions={[
          { label: 'Cancel', variant: 'outline', onPress: () => setLogoutVisible(false) },
          {
            label: 'Logout',
            variant: 'danger',
            onPress: () => {
              setLogoutVisible(false);
              logout();
              router.replace('/(auth)/admin-login');
            },
          },
        ]}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
  },
  role: {
    fontSize: 12.5,
    marginTop: 2,
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
