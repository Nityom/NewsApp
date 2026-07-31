import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme';
import type { ArticleStatus, NotificationType, PaymentStatus } from '@/types/models';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

interface BadgeProps {
  label: string;
  tone?: Tone;
  size?: 'sm' | 'md';
}

export function Badge({ label, tone = 'neutral', size = 'md' }: BadgeProps) {
  const theme = useAppTheme();

  const toneMap: Record<Tone, { bg: string; fg: string }> = {
    success: { bg: theme.colors.successMuted, fg: theme.colors.success },
    warning: { bg: theme.colors.warningMuted, fg: theme.colors.warning },
    danger: { bg: theme.colors.dangerMuted, fg: theme.colors.danger },
    info: { bg: theme.colors.infoMuted, fg: theme.colors.info },
    primary: { bg: theme.colors.primaryMuted, fg: theme.colors.primary },
    neutral: { bg: theme.colors.backgroundSubtle, fg: theme.colors.textSecondary },
  };
  const c = toneMap[tone];

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: c.bg,
          borderRadius: theme.radius.full,
          paddingHorizontal: size === 'sm' ? 8 : 10,
          paddingVertical: size === 'sm' ? 3 : 5,
        },
      ]}>
      <Text style={{ color: c.fg, fontSize: size === 'sm' ? 11 : 12, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}

const statusToneMap: Record<ArticleStatus, Tone> = {
  draft: 'neutral',
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  trashed: 'neutral',
};

const statusLabelMap: Record<ArticleStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  trashed: 'Trashed',
};

export function StatusBadge({ status, size }: { status: ArticleStatus; size?: 'sm' | 'md' }) {
  return <Badge label={statusLabelMap[status]} tone={statusToneMap[status]} size={size} />;
}

const paymentToneMap: Record<PaymentStatus, Tone> = {
  paid: 'success',
  pending: 'warning',
  failed: 'danger',
};

export function PaymentStatusBadge({ status, size }: { status: PaymentStatus; size?: 'sm' | 'md' }) {
  return (
    <Badge
      label={status.charAt(0).toUpperCase() + status.slice(1)}
      tone={paymentToneMap[status]}
      size={size}
    />
  );
}

export const notificationToneMap: Record<NotificationType, Tone> = {
  article_approved: 'success',
  article_rejected: 'danger',
  article_pending: 'warning',
  payment: 'primary',
  system: 'info',
  reporter_joined: 'primary',
};

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
  },
});
