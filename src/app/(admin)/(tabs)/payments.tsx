import { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { PaymentStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SearchBar } from '@/components/ui/SearchBar';
import { EmptyState } from '@/components/ui/StateViews';
import { useNotifications } from '@/context/NotificationsContext';
import { usePayments } from '@/context/PaymentsContext';
import { useReporters } from '@/context/ReportersContext';
import { useAppTheme } from '@/theme';
import type { Payment, PaymentStatus } from '@/types/models';

const filters: { key: PaymentStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'pending', label: 'Pending' },
  { key: 'failed', label: 'Failed' },
];

export default function AdminPaymentsScreen() {
  const theme = useAppTheme();
  const { payments, updatePaymentStatus, updateJoiningFeeStatus } = usePayments();
  const { reporters } = useReporters();
  const { addNotification } = useNotifications();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PaymentStatus | 'all'>('all');
  const [updatingId, setUpdatingId] = useState<string>();

  const displayedPayments = useMemo(() => {
    const legacyJoiningFees: Payment[] = reporters
      .filter(
        (reporter) =>
          reporter.requestStatus === 'payment_submitted' &&
          !!reporter.joinFeeAmount &&
          reporter.joinFeeAmount > 0 &&
          !payments.some((payment) => payment.reporterId === reporter.id && payment.purpose === 'joining_fee'),
      )
      .map((reporter) => ({
        id: `joining-fee-${reporter.id}`,
        reporterId: reporter.id,
        reporterName: reporter.name,
        reporterAvatar: reporter.avatar,
        amount: reporter.joinFeeAmount!,
        status: 'pending',
        method: 'Legacy payment',
        articlesCount: 0,
        period: 'Joining Fee',
        createdAt: reporter.joinedAt,
        purpose: 'joining_fee',
      }));
    return [...legacyJoiningFees, ...payments];
  }, [payments, reporters]);

  const filtered = useMemo(
    () =>
      displayedPayments.filter(
        (p) =>
          (filter === 'all' || p.status === filter) &&
          p.reporterName.toLowerCase().includes(query.toLowerCase()),
      ),
    [displayedPayments, filter, query],
  );

  const totalPaid = displayedPayments.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalPending = displayedPayments.filter((p) => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);

  const setPaymentStatus = async (payment: Payment, status: 'paid' | 'failed') => {
    if (updatingId) return;
    setUpdatingId(payment.id);
    try {
      if (payment.purpose === 'joining_fee') {
        await updateJoiningFeeStatus(payment, status);
      } else {
        await updatePaymentStatus(payment.id, status);
      }

      try {
        await addNotification({
          type: 'payment',
          audience: 'reporter',
          title: status === 'paid' ? 'Payment Confirmed' : 'Payment Not Confirmed',
          message: status === 'paid'
            ? `Your payment of ₹${payment.amount.toLocaleString('en-IN')} has been confirmed by the admin.`
            : `The admin could not confirm your payment of ₹${payment.amount.toLocaleString('en-IN')}. Please check and submit it again.`,
          reporterId: payment.reporterId,
        });
        Alert.alert(
          status === 'paid' ? 'Payment Confirmed' : 'Payment Rejected',
          `${payment.reporterName}'s payment status is now ${status === 'paid' ? 'Paid' : 'Failed'}.`,
        );
      } catch {
        Alert.alert(
          status === 'paid' ? 'Payment Confirmed' : 'Payment Rejected',
          `The payment was updated, but ${payment.reporterName} could not be notified.`,
        );
      }
    } catch {
      Alert.alert('Could Not Update Payment', 'The payment status was not updated. Please try again.');
    } finally {
      setUpdatingId(undefined);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.headerArea}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Payments</Text>

        <View style={styles.summaryRow}>
          <Card style={[styles.summaryCard, { backgroundColor: theme.colors.successMuted }]}>
            <Text style={[styles.summaryLabel, { color: theme.colors.success }]}>Confirmed</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>₹{totalPaid.toLocaleString('en-IN')}</Text>
          </Card>
          <Card style={[styles.summaryCard, { backgroundColor: theme.colors.warningMuted }]}>
            <Text style={[styles.summaryLabel, { color: theme.colors.warning }]}>Pending</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>₹{totalPending.toLocaleString('en-IN')}</Text>
          </Card>
        </View>

        <SearchBar value={query} onChangeText={setQuery} placeholder="Search by reporter" />
        <View style={styles.filterRow}>
          {filters.map((f) => (
            <Text
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filter === f.key ? theme.colors.primary : theme.colors.backgroundSubtle,
                  color: filter === f.key ? theme.colors.onPrimary : theme.colors.textSecondary,
                  borderRadius: theme.radius.full,
                },
              ]}>
              {f.label}
            </Text>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Card style={styles.row}>
            <Avatar uri={item.reporterAvatar} name={item.reporterName} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.reporterName, { color: theme.colors.text }]}>{item.reporterName}</Text>
              <Text style={[styles.period, { color: theme.colors.textMuted }]}>{item.period} • {item.method}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={[styles.amount, { color: theme.colors.text }]}>₹{item.amount.toLocaleString('en-IN')}</Text>
              <PaymentStatusBadge status={item.status} size="sm" />
            </View>
            {item.status === 'pending' && item.purpose !== 'joining_fee' ? (
              <View style={styles.actions}>
                <Button
                  label="Reject"
                  variant="outline"
                  size="sm"
                  onPress={() => setPaymentStatus(item, 'failed')}
                  disabled={updatingId === item.id}
                />
                <Button
                  label="Confirm"
                  size="sm"
                  onPress={() => setPaymentStatus(item, 'paid')}
                  loading={updatingId === item.id}
                />
              </View>
            ) : item.status === 'pending' ? (
              <Text style={[styles.autoConfirmation, { color: theme.colors.textMuted }]}>Cashfree confirmation pending</Text>
            ) : null}
          </Card>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={<EmptyState icon="wallet-outline" title="No payments found" />}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerArea: {
    paddingHorizontal: 20,
    gap: 14,
    paddingTop: 4,
    paddingBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 0,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    fontSize: 12.5,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 7,
    overflow: 'hidden',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  autoConfirmation: {
    width: '100%',
    fontSize: 11.5,
    textAlign: 'right',
  },
  reporterName: {
    fontSize: 14,
    fontWeight: '700',
  },
  period: {
    fontSize: 11.5,
    marginTop: 2,
  },
  amount: {
    fontSize: 15,
    fontWeight: '800',
  },
});
