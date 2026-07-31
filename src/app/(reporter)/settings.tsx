import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/Button';
import { Icon, IconName } from '@/components/ui/Icon';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useThemeMode, useAppTheme } from '@/theme';

function ToggleRow({
  icon,
  label,
  value,
  onValueChange,
}: {
  icon: IconName;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: theme.colors.backgroundSubtle }]}>
        <Icon name={icon} size={17} color={theme.colors.text} />
      </View>
      <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor="#fff"
      />
    </View>
  );
}

export default function SettingsScreen() {
  const theme = useAppTheme();
  const { mode, overrideMode, setOverrideMode } = useThemeMode();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [articleUpdates, setArticleUpdates] = useState(true);

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" onPress={() => router.back()} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Appearance</Text>
        <Card style={styles.card} padded={false}>
          <ToggleRow
            icon="moon-outline"
            label="Dark Mode"
            value={mode === 'dark'}
            onValueChange={(v) => setOverrideMode(v ? 'dark' : 'light')}
          />
        </Card>
        {overrideMode ? (
          <Text
            onPress={() => setOverrideMode(null)}
            style={[styles.systemLink, { color: theme.colors.primary }]}>
            Use system appearance instead
          </Text>
        ) : null}

        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, marginTop: 20 }]}>
          Notifications
        </Text>
        <Card style={styles.card} padded={false}>
          <ToggleRow icon="notifications-outline" label="Push Notifications" value={pushEnabled} onValueChange={setPushEnabled} />
          <ToggleRow icon="mail-outline" label="Email Notifications" value={emailEnabled} onValueChange={setEmailEnabled} />
          <ToggleRow icon="document-text-outline" label="Article Status Updates" value={articleUpdates} onValueChange={setArticleUpdates} />
        </Card>

        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, marginTop: 20 }]}>
          Account
        </Text>
        <Card style={styles.card} padded={false}>
          <Text
            onPress={() => router.push('/(reporter)/change-password')}
            style={[styles.linkRow, { color: theme.colors.text }]}>
            Change Password
          </Text>
        </Card>
      </View>
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  card: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  systemLink: {
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 8,
    marginLeft: 4,
  },
  linkRow: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
});
