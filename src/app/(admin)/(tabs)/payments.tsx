import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { PaymentStatusBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SearchBar } from '@/components/ui/SearchBar';
import { EmptyState } from '@/components/ui/StateViews';
import { mockPayments } from '@/mocks/data';
import { useAppTheme } from '@/theme';
import type { PaymentStatus } from '@/types/models';

const filters: { key: PaymentStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'pending', label: 'Pending' },
  { key: 'failed', label: 'Failed' },
];

export default function AdminPaymentsScreen() {
  const theme = useAppTheme();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PaymentStatus | 'all'>('all');

  const filtered = useMemo(
    () =>
      mockPayments.filter(
        (p) =>
          (filter === 'all' || p.status === filter) &&
          p.reporterName.toLowerCase().includes(query.toLowerCase()),
      ),
    [filter, query],
  );

  const totalPaid = mockPayments.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalPending = mockPayments.filter((p) => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);

  return (
    <ScreenContainer>
      <View style={styles.headerArea}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Payments</Text>

        <View style={styles.summaryRow}>
          <Card style={[styles.summaryCard, { backgroundColor: theme.colors.successMuted }]}>
            <Text style={[styles.summaryLabel, { color: theme.colors.success }]}>Paid Out</Text>
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
    gap: 12,
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
