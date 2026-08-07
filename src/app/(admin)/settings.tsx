import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Button, IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon, IconName } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { usePublicationInfo } from '@/context/PublicationInfoContext';
import { useAppTheme, useThemeMode } from '@/theme';

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
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: theme.colors.border, true: theme.colors.primary }} thumbColor="#fff" />
    </View>
  );
}

export default function AdminSettingsScreen() {
  const theme = useAppTheme();
  const { mode, overrideMode, setOverrideMode } = useThemeMode();
  const [autoApprove, setAutoApprove] = useState(false);
  const [emailDigest, setEmailDigest] = useState(true);
  const [newReporterAlert, setNewReporterAlert] = useState(true);
  const { info, updateInfo } = usePublicationInfo();
  const [year, setYear] = useState(info.year);
  const [issueNumber, setIssueNumber] = useState(info.issueNumber);
  const [price, setPrice] = useState(info.price);

  const savePublicationInfo = async () => {
    await updateInfo({ year, issueNumber, price });
    Alert.alert('Saved', 'The publication info bar has been updated on all articles.');
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" onPress={() => router.back()} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Appearance</Text>
        <Card style={styles.card} padded={false}>
          <ToggleRow icon="moon-outline" label="Dark Mode" value={mode === 'dark'} onValueChange={(v) => setOverrideMode(v ? 'dark' : 'light')} />
        </Card>
        {overrideMode ? (
          <Text onPress={() => setOverrideMode(null)} style={[styles.systemLink, { color: theme.colors.primary }]}>
            Use system appearance instead
          </Text>
        ) : null}

        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, marginTop: 20 }]}>
          Editorial Workflow
        </Text>
        <Card style={styles.card} padded={false}>
          <ToggleRow icon="flash-outline" label="Auto-approve trusted reporters" value={autoApprove} onValueChange={setAutoApprove} />
          <ToggleRow icon="mail-outline" label="Daily Email Digest" value={emailDigest} onValueChange={setEmailDigest} />
          <ToggleRow icon="person-add-outline" label="New Reporter Alerts" value={newReporterAlert} onValueChange={setNewReporterAlert} />
        </Card>

        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, marginTop: 20 }]}>
          Publication Info (shown on every article page)
        </Text>
        <Card style={[styles.card, { padding: 14, gap: 10 }]}>
          <Input label="वर्ष (Year)" value={year} onChangeText={setYear} />
          <Input label="अंक (Issue No.)" value={issueNumber} onChangeText={setIssueNumber} />
          <Input label="मूल्य (Price)" value={price} onChangeText={setPrice} />
          <Text style={[styles.autoNote, { color: theme.colors.textMuted }]}>
            माह (period) and पृष्ठ (pages) update automatically. दिनांक (registration date) is set per-article from its approval date and can be changed on that article's page.
          </Text>
          <Button label="Save Publication Info" onPress={savePublicationInfo} />
        </Card>
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
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
  autoNote: {
    fontSize: 11.5,
    lineHeight: 16,
  },
});
