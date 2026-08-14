import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PaymentStatusBadge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAuth } from '@/context/AuthContext';
import { usePayments } from '@/context/PaymentsContext';
import { useReporters } from '@/context/ReportersContext';
import { useAppTheme } from '@/theme';

export default function PaymentScreen() {
  const theme = useAppTheme();
  const { user } = useAuth();
  const { payments } = usePayments();
  const { getReporterByEmail } = useReporters();
  const reporter = user?.email ? getReporterByEmail(user.email) : undefined;
  const history = reporter ? payments.filter((payment) => payment.reporterId === reporter.id) : [];
  const totalConfirmed = history.filter((payment) => payment.status === 'paid').reduce((sum, payment) => sum + payment.amount, 0);
  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" onPress={() => router.back()} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Payments & Payouts</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        <Card style={[styles.balanceCard, { backgroundColor: theme.colors.primary }]}> 
          <Text style={[styles.balanceLabel, { color: theme.colors.onPrimary }]}>Confirmed Payments</Text>
          <Text style={[styles.balanceValue, { color: theme.colors.onPrimary }]}>₹{totalConfirmed.toLocaleString('en-IN')}</Text>
          <View style={styles.balanceRow}>
            <Icon name="wallet-outline" size={16} color={theme.colors.onPrimary} />
            <Text style={[styles.balanceSub, { color: theme.colors.onPrimary }]}>Payments verified by Cashfree</Text>
          </View>
        </Card>

        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Payment History</Text>
        {history.length === 0 ? (
          <Text style={[styles.emptyHistory, { color: theme.colors.textMuted }]}>No payment submissions yet.</Text>
        ) : null}
        {history.map((item) => (
          <Card key={item.id} style={styles.paymentRow}>
            <View style={[styles.iconWrap, { backgroundColor: theme.colors.backgroundSubtle }]}>
              <Icon name="cash-outline" size={18} color={theme.colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.period, { color: theme.colors.text }]}>{item.period}</Text>
              <Text style={[styles.articlesCount, { color: theme.colors.textMuted }]}>
                {item.articlesCount} articles • {item.method}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={[styles.amount, { color: theme.colors.text }]}>₹{item.amount.toLocaleString('en-IN')}</Text>
              <PaymentStatusBadge status={item.status} size="sm" />
            </View>
          </Card>
        ))}
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
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  balanceCard: {
    borderWidth: 0,
    marginBottom: 20,
    gap: 4,
  },
  balanceLabel: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  balanceValue: {
    fontSize: 30,
    fontWeight: '800',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  balanceSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  emptyHistory: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  period: {
    fontSize: 14,
    fontWeight: '700',
  },
  articlesCount: {
    fontSize: 11.5,
    marginTop: 2,
  },
  amount: {
    fontSize: 15,
    fontWeight: '800',
  },
});
