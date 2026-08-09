import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PaymentStatusBadge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationsContext';
import { usePayments } from '@/context/PaymentsContext';
import { useReporters } from '@/context/ReportersContext';
import { useAppTheme } from '@/theme';

const paymentQr = require('../../../assets/images/PaymentQr.jpeg');

export default function PaymentScreen() {
  const theme = useAppTheme();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const { payments, addPayment } = usePayments();
  const { getReporterByEmail } = useReporters();
  const reporter = user?.email ? getReporterByEmail(user.email) : undefined;
  const history = reporter ? payments.filter((payment) => payment.reporterId === reporter.id) : [];
  const totalConfirmed = history.filter((payment) => payment.status === 'paid').reduce((sum, payment) => sum + payment.amount, 0);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [amountError, setAmountError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const confirmPayment = async () => {
    const amount = Number(paymentAmount.replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) {
      setAmountError('Enter a valid amount greater than ₹0');
      return;
    }
    if (!reporter) {
      Alert.alert('Reporter Profile Not Found', 'Please reopen this screen after your profile has loaded.');
      return;
    }

    setAmountError(undefined);
    setSubmitting(true);
    try {
      const createdAt = new Date().toISOString();
      await addPayment({
        id: `payment-${reporter.id}-${Date.now()}`,
        reporterId: reporter.id,
        reporterName: reporter.name,
        reporterAvatar: reporter.avatar,
        amount,
        status: 'pending',
        method: 'UPI / QR',
        articlesCount: 0,
        period: 'Payment to Admin',
        createdAt,
        updatedAt: createdAt,
        purpose: 'admin_payment',
      });
      setPaymentAmount('');
      try {
        await addNotification({
          type: 'payment',
          audience: 'admin',
          title: 'Reporter Payment Submitted',
          message: `${reporter.name} says they paid ₹${amount.toLocaleString('en-IN')}. Please confirm receipt.`,
          reporterId: reporter.id,
        });
        Alert.alert('Payment Submitted', 'The admin has been notified and will confirm the payment after checking it.');
      } catch {
        Alert.alert('Payment Recorded', 'The payment is visible to the admin, but the alert could not be sent.');
      }
    } catch {
      Alert.alert('Could Not Submit Payment', 'Your payment confirmation was not recorded. Please try again.');
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

      <ScrollView contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Pay Admin</Text>
        <Card style={styles.payCard}>
          <View style={styles.payHeadingRow}>
            <View style={[styles.payIcon, { backgroundColor: theme.colors.primaryMuted }]}> 
              <Icon name="qr-code-outline" size={21} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.payTitle, { color: theme.colors.text }]}>Scan and Pay</Text>
              <Text style={[styles.paySubtitle, { color: theme.colors.textSecondary }]}>Enter any amount below</Text>
            </View>
          </View>

          <Image source={paymentQr} style={styles.qrImage} contentFit="contain" />

          <Input
            label="Amount"
            leftIcon="cash-outline"
            placeholder="Enter amount in ₹"
            keyboardType="decimal-pad"
            value={paymentAmount}
            onChangeText={(value) => {
              setPaymentAmount(value);
              if (amountError) setAmountError(undefined);
            }}
            error={amountError}
          />
          <Button
            label={paymentAmount ? `I Have Paid ₹${paymentAmount}` : 'I Have Paid'}
            icon="checkmark-circle-outline"
            onPress={confirmPayment}
            loading={submitting}
            disabled={!reporter}
            fullWidth
          />
          <Text style={[styles.confirmationNote, { color: theme.colors.textMuted }]}> 
            Submit only after completing the payment. The admin will verify it manually.
          </Text>
        </Card>

        <Card style={[styles.balanceCard, { backgroundColor: theme.colors.primary }]}> 
          <Text style={[styles.balanceLabel, { color: theme.colors.onPrimary }]}>Confirmed Payments</Text>
          <Text style={[styles.balanceValue, { color: theme.colors.onPrimary }]}>₹{totalConfirmed.toLocaleString('en-IN')}</Text>
          <View style={styles.balanceRow}>
            <Icon name="wallet-outline" size={16} color={theme.colors.onPrimary} />
            <Text style={[styles.balanceSub, { color: theme.colors.onPrimary }]}>Payments verified by admin</Text>
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
  payCard: {
    gap: 16,
    marginBottom: 20,
  },
  payHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  payIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  paySubtitle: {
    fontSize: 12.5,
    marginTop: 2,
  },
  qrImage: {
    width: '100%',
    height: 240,
  },
  confirmationNote: {
    fontSize: 11.5,
    lineHeight: 17,
    textAlign: 'center',
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
