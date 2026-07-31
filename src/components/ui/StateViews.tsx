import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme';
import { Button } from './Button';
import { Icon, IconName } from './Icon';

interface StateViewProps {
  icon: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'neutral' | 'danger';
}

function StateView({ icon, title, message, actionLabel, onAction, tone = 'neutral' }: StateViewProps) {
  const theme = useAppTheme();
  const iconColor = tone === 'danger' ? theme.colors.danger : theme.colors.textMuted;
  const iconBg = tone === 'danger' ? theme.colors.dangerMuted : theme.colors.backgroundSubtle;

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg, borderRadius: theme.radius.full }]}>
        <Icon name={icon} size={34} color={iconColor} />
      </View>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      {message ? (
        <Text style={[styles.message, { color: theme.colors.textSecondary }]}>{message}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: 20 }}>
          <Button label={actionLabel} onPress={onAction} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

export function EmptyState(props: Omit<StateViewProps, 'tone'>) {
  return <StateView {...props} tone="neutral" />;
}

export function ErrorState(props: Omit<StateViewProps, 'tone' | 'icon'> & { icon?: IconName }) {
  return <StateView icon="alert-circle-outline" {...props} tone="danger" />;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
});
