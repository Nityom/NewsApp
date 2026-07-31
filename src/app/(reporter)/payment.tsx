import { router } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { PaymentStatusBadge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { mockPayments } from '@/mocks/data';
import { useAppTheme } from '@/theme';

export default function PaymentScreen() {
  const theme = useAppTheme();
  const history = mockPayments;
  const totalEarned = history.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" onPress={() => router.back()} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Payments & Payouts</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <Card style={[styles.balanceCard, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.balanceLabel}>Total Earnings</Text>
              <Text style={styles.balanceValue}>₹{totalEarned.toLocaleString('en-IN')}</Text>
              <View style={styles.balanceRow}>
                <Icon name="wallet-outline" size={16} color="#fff" />
                <Text style={styles.balanceSub}>Paid via UPI • ananya@upi</Text>
              </View>
            </Card>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Transaction History</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={styles.paymentRow}>
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
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
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
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12.5,
    fontWeight: '600',
  },
  balanceValue: {
    color: '#fff',
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
    color: 'rgba(255,255,255,0.85)',
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
