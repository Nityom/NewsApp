import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationsContext';
import { usePayments } from '@/context/PaymentsContext';
import { useReporters } from '@/context/ReportersContext';
import { clearJustSubmittedReporterId, getJustSubmittedReporterId } from '@/lib/joinRequestFlag';
import { isGooglePlayReviewEmail } from '@/lib/reviewAccount';
import { useAppTheme } from '@/theme';
import type { Reporter } from '@/types/models';

const paymentQr = require('../../../assets/images/PaymentQr.jpeg');

function PendingApprovalScreen({ reason }: { reason?: string }) {
  const theme = useAppTheme();
  const { logout } = useAuth();
  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.pendingWrap}>
        <Icon name="hourglass-outline" size={48} color={theme.colors.primary} />
        <Text style={[styles.pendingTitle, { color: theme.colors.text }]}>
          {reason ? 'Request Not Approved' : 'Request Sent to Admin'}
        </Text>
        <Text style={[styles.pendingText, { color: theme.colors.textSecondary }]}>
          {reason
            ? `Your reporter request was not approved. Reason: ${reason}`
            : 'Your details have been sent to the admin for approval. You will be able to publish once your account is approved.'}
        </Text>
        <Button label="Log Out" variant="outline" onPress={logout} />
      </View>
    </ScreenContainer>
  );
}

function PaymentScreen({ reporter }: { reporter: Reporter }) {
  const theme = useAppTheme();
  const { logout } = useAuth();
  const { updateReporter } = useReporters();
  const { addNotification } = useNotifications();
  const { addPayment } = usePayments();
  const [submitting, setSubmitting] = useState(false);

  const markPaymentDone = async () => {
    setSubmitting(true);
    try {
      const createdAt = new Date().toISOString();
      await addPayment({
        id: `joining-fee-${reporter.id}`,
        reporterId: reporter.id,
        reporterName: reporter.name,
        reporterAvatar: reporter.avatar,
        amount: reporter.joinFeeAmount ?? 0,
        status: 'pending',
        method: 'UPI / QR',
        articlesCount: 0,
        period: 'Joining Fee',
        createdAt,
        updatedAt: createdAt,
        purpose: 'joining_fee',
      });
      await updateReporter(reporter.id, { requestStatus: 'payment_submitted' });
      try {
        await addNotification({
          type: 'payment',
          audience: 'admin',
          title: 'Payment Marked as Done',
          message: `${reporter.name} says they have paid the ₹${reporter.joinFeeAmount} joining fee. Please confirm receipt.`,
          reporterId: reporter.id,
        });
        Alert.alert('Thanks!', 'The admin has been notified. You will get access once payment is confirmed.');
      } catch {
        Alert.alert('Payment Recorded', 'Your payment is visible to the admin, but the alert could not be sent.');
      }
    } catch {
      Alert.alert('Could Not Submit Payment', 'Your payment confirmation was not recorded. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.paymentScroll}>
        <Icon name="cash-outline" size={44} color={theme.colors.primary} />
        <Text style={[styles.pendingTitle, { color: theme.colors.text }]}>Joining Fee Required</Text>
        <View
          style={[
            styles.feeHighlight,
            { backgroundColor: theme.colors.primaryMuted, borderColor: theme.colors.primary },
          ]}>
          <Text style={[styles.feeLabel, { color: theme.colors.textSecondary }]}>AMOUNT TO PAY</Text>
          <Text style={[styles.feeAmount, { color: theme.colors.text }]}>₹{reporter.joinFeeAmount}</Text>
        </View>
        <Text style={[styles.pendingText, { color: theme.colors.textSecondary }]}>
          Scan the QR code below to pay the joining fee, then tap "Payment Done".
        </Text>
        <Image source={paymentQr} style={styles.qrImage} contentFit="contain" />
        <Button label="Payment Done" onPress={markPaymentDone} loading={submitting} fullWidth size="lg" />
        <Button label="Log Out" variant="outline" onPress={logout} fullWidth />
      </ScrollView>
    </ScreenContainer>
  );
}

function AwaitingConfirmationScreen({ reporter }: { reporter: Reporter }) {
  const theme = useAppTheme();
  const { logout } = useAuth();
  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.pendingWrap}>
        <Icon name="time-outline" size={48} color={theme.colors.primary} />
        <Text style={[styles.pendingTitle, { color: theme.colors.text }]}>Confirming Your Payment</Text>
        <Text style={[styles.pendingText, { color: theme.colors.textSecondary }]}>
          We've told the admin you paid ₹{reporter.joinFeeAmount}. You'll get access to your dashboard once the
          admin confirms it was received.
        </Text>
        <Button label="Log Out" variant="outline" onPress={logout} />
      </View>
    </ScreenContainer>
  );
}

export default function ReporterLayout() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { reporters, isLoading } = useReporters();
  const isGooglePlayReviewer = isGooglePlayReviewEmail(user?.email);
  const reporterRecord = user?.email
    ? reporters.find((r) => r.email.toLowerCase() === user.email.toLowerCase())
    : undefined;

  // Once the real record shows up, stop trusting the transient "just submitted" flag.
  useEffect(() => {
    if (reporterRecord) clearJustSubmittedReporterId();
  }, [reporterRecord]);

  const justSubmitted = !isGooglePlayReviewer && !reporterRecord && getJustSubmittedReporterId() != null;
  const needsJoinForm =
    !isGooglePlayReviewer && !isLoading && !justSubmitted && user?.role === 'reporter' && !reporterRecord;

  useEffect(() => {
    if (needsJoinForm) router.replace('/(auth)/reporter-details');
  }, [needsJoinForm]);

  useEffect(() => {
    if (!isAuthLoading && !user) router.replace('/(auth)/login');
  }, [isAuthLoading, user]);

  if (isAuthLoading || !user) {
    return (
      <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.pendingWrap} />
      </ScreenContainer>
    );
  }

  // No join-request record at all yet, and none was just submitted this session (e.g. the form
  // was skipped via the back button) - hold here and redirect to it instead of allowing dashboard access.
  if (needsJoinForm) {
    return (
      <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.pendingWrap} />
      </ScreenContainer>
    );
  }

  // Show the pending screen immediately for a just-submitted request, even before the live
  // listener has delivered the record; otherwise use the request's real status.
  if (justSubmitted) return <PendingApprovalScreen />;

  if (!isGooglePlayReviewer && !isLoading && reporterRecord) {
    if (reporterRecord.requestStatus === 'pending') return <PendingApprovalScreen />;
    if (reporterRecord.requestStatus === 'awaiting_payment') return <PaymentScreen reporter={reporterRecord} />;
    if (reporterRecord.requestStatus === 'payment_submitted') return <AwaitingConfirmationScreen reporter={reporterRecord} />;
    if (reporterRecord.requestStatus === 'rejected') return <PendingApprovalScreen reason={reporterRecord.requestRejectionReason} />;
    if (reporterRecord.requestStatus === 'approved' && !reporterRecord.isActive) {
      return <PendingApprovalScreen reason="Your account has been suspended by the admin." />;
    }
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="create-article" options={{ presentation: 'modal' }} />
      <Stack.Screen name="article/[id]" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="change-password" />
      <Stack.Screen name="payment" />
      <Stack.Screen name="help-support" />
      <Stack.Screen name="terms-privacy" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  pendingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 14,
  },
  paymentScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
    gap: 14,
  },
  qrImage: {
    width: 220,
    height: 220,
    marginVertical: 8,
  },
  feeHighlight: {
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  feeLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  feeAmount: {
    fontSize: 26,
    fontWeight: '900',
  },
  pendingTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  pendingText: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
  },
});
