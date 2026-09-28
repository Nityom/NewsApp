import { useAction } from 'convex/react';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';

import { PaymentStatusBadge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAuth } from '@/context/AuthContext';
import { usePayments } from '@/context/PaymentsContext';
import { useReporters } from '@/context/ReportersContext';
import { createAdminPaymentOrder, verifyAdminPaymentOrder } from '@/lib/razorpay';
import { useAppTheme } from '@/theme';
import { api } from '../../../convex/_generated/api';

const CONVENIENCE_FEE_RATE = 0.023;
const roundCurrency = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;

export default function PaymentScreen() {
  const theme = useAppTheme();
  const { user } = useAuth();
  const { payments } = usePayments();
  const { getReporterByEmail } = useReporters();
  const reporter = user?.email ? getReporterByEmail(user.email) : undefined;
  const history = reporter ? payments.filter((payment) => payment.reporterId === reporter.id) : [];
  const totalConfirmed = history.filter((payment) => payment.status === 'paid').reduce((sum, payment) => sum + payment.amount, 0);

  const createAdminOrder = useAction(api.razorpay.createAdminPaymentOrder);
  const verifyAdminOrder = useAction(api.razorpay.verifyAdminPaymentOrder);

  const [amountStr, setAmountStr] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const parsedAmount = Math.max(0, parseInt(amountStr.replace(/\D/g, ''), 10) || 0);
  const baseAmount = parsedAmount;
  const convenienceFee = roundCurrency(baseAmount * CONVENIENCE_FEE_RATE);
  const totalAmount = roundCurrency(baseAmount + convenienceFee);

  const handlePayAdmin = async () => {
    if (!reporter) {
      Alert.alert('Not Logged In', 'Please sign in to make a payment.');
      return;
    }
    if (parsedAmount < 10) {
      Alert.alert('Invalid Amount', 'Please enter an amount of at least ₹10.');
      return;
    }
    setSubmitting(true);
    try {
      const order = await createAdminPaymentOrder(createAdminOrder, {
        reporterId: reporter.id,
        amount: parsedAmount,
        description: note.trim() || 'Payment to Admin',
      });
      const phoneDigits = String(reporter.phone || '').replace(/\D/g, '').slice(-10);

      const options = {
        description: note.trim() || 'Payment to Admin',
        currency: 'INR',
        key: order.keyId,
        amount: Math.round(order.totalAmount * 100),
        name: 'Education News',
        order_id: order.orderId,
        prefill: {
          email: reporter.email,
          contact: phoneDigits ? `+91${phoneDigits}` : undefined,
          name: reporter.name,
        },
        theme: { color: theme.colors.primary },
        retry: {
          enabled: true,
          max_count: 3,
        },
      };

      let checkoutResult;
      try {
        checkoutResult = await RazorpayCheckout.open(options);
      } catch (checkoutError: any) {
        if (checkoutError?.code === 0 || checkoutError?.description?.toLowerCase()?.includes('cancelled')) {
          Alert.alert('Payment Cancelled', 'You cancelled the payment process.');
        } else {
          Alert.alert(
            'Payment Incomplete',
            checkoutError?.description || checkoutError?.message || 'Payment could not be completed. Please try again.',
          );
        }
        setSubmitting(false);
        return;
      }

      try {
        await verifyAdminPaymentOrder(verifyAdminOrder, {
          orderId: checkoutResult.razorpay_order_id,
          razorpayPaymentId: checkoutResult.razorpay_payment_id,
          razorpaySignature: checkoutResult.razorpay_signature,
        });
        Alert.alert(
          'Payment Confirmed',
          `Your payment of ₹${totalAmount.toLocaleString('en-IN')} has been received and verified. Thank you!`,
        );
        setAmountStr('');
        setNote('');
      } catch (verifyError) {
        Alert.alert(
          'Verification Pending',
          verifyError instanceof Error ? verifyError.message : 'Please check your connection and try again.',
        );
      }
    } catch (error) {
      Alert.alert('Could Not Start Payment', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" onPress={() => router.back()} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Payments & Payouts</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {/* Balance Card */}
        <Card style={[styles.balanceCard, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.balanceLabel, { color: theme.colors.onPrimary }]}>Confirmed Payments</Text>
          <Text style={[styles.balanceValue, { color: theme.colors.onPrimary }]}>₹{totalConfirmed.toLocaleString('en-IN')}</Text>
          <View style={styles.balanceRow}>
            <Icon name="wallet-outline" size={16} color={theme.colors.onPrimary} />
            <Text style={[styles.balanceSub, { color: theme.colors.onPrimary }]}>Payments verified by Razorpay</Text>
          </View>
        </Card>

        {/* Pay to Admin Card */}
        <Card style={styles.payCard}>
          <View style={styles.payHeadingRow}>
            <View style={[styles.payIcon, { backgroundColor: theme.mode === 'dark' ? '#3A2E05' : '#FEF9E7' }]}>
              <Icon name="cash-outline" size={24} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.payTitle, { color: theme.colors.text }]}>Pay to Admin</Text>
              <Text style={[styles.paySubtitle, { color: theme.colors.textSecondary }]}>
                Make a direct payment to the editorial office via Razorpay
              </Text>
            </View>
          </View>

          {/* Custom amount input */}
          <View
            style={[
              styles.amountInputWrap,
              { borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundSubtle },
            ]}>
            <Text style={[styles.currencyPrefix, { color: theme.colors.text }]}>₹</Text>
            <TextInput
              value={amountStr}
              onChangeText={setAmountStr}
              keyboardType="number-pad"
              placeholder="Enter amount"
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.amountInput, { color: theme.colors.text }]}
            />
          </View>

          {/* Optional Note */}
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Payment purpose / note (optional)"
            placeholderTextColor={theme.colors.textMuted}
            style={[
              styles.noteInput,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.backgroundSubtle,
                color: theme.colors.text,
              },
            ]}
          />

          {/* Fee breakdown if parsedAmount > 0 */}
          {parsedAmount > 0 ? (
            <View
              style={[
                styles.breakdownWrap,
                { backgroundColor: theme.colors.backgroundSubtle, borderColor: theme.colors.border },
              ]}>
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: theme.colors.textSecondary }]}>Amount</Text>
                <Text style={[styles.breakdownValue, { color: theme.colors.text }]}>
                  ₹{baseAmount.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: theme.colors.textSecondary }]}>Convenience fee (2.3%)</Text>
                <Text style={[styles.breakdownValue, { color: theme.colors.text }]}>
                  ₹{convenienceFee.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={[styles.breakdownDivider, { backgroundColor: theme.colors.border }]} />
              <View style={styles.breakdownRow}>
                <Text style={[styles.totalLabel, { color: theme.colors.text }]}>Total Payable</Text>
                <Text style={[styles.totalValue, { color: theme.colors.primary }]}>
                  ₹{totalAmount.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          ) : null}

          <Button
            label={parsedAmount > 0 ? `Pay ₹${totalAmount.toLocaleString('en-IN')} with Razorpay` : 'Pay with Razorpay'}
            onPress={handlePayAdmin}
            loading={submitting}
            disabled={parsedAmount < 10}
            fullWidth
          />
        </Card>

        {/* Transaction History */}
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
                {item.articlesCount > 0 ? `${item.articlesCount} articles • ` : ''}
                {item.method || 'Razorpay'}
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
    marginBottom: 16,
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
  payCard: {
    marginBottom: 24,
    gap: 14,
    padding: 16,
  },
  payHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  payIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  paySubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  currencyPrefix: {
    fontSize: 20,
    fontWeight: '800',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    height: 48,
    fontSize: 18,
    fontWeight: '700',
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 13.5,
  },
  breakdownWrap: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 12.5,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  breakdownDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
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
