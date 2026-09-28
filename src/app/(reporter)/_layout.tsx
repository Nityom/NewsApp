import { useAction, useMutation } from 'convex/react';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAuth } from '@/context/AuthContext';
import { useReporters } from '@/context/ReportersContext';
import { clearJustSubmittedReporterId, getJustSubmittedReporterId } from '@/lib/joinRequestFlag';
import { createJoiningFeeOrder, verifyJoiningFeeOrder } from '@/lib/razorpay';
import { isGooglePlayReviewEmail } from '@/lib/reviewAccount';
import { useAppTheme } from '@/theme';
import type { Reporter } from '@/types/models';
import { api } from '@convex/_generated/api';

const CONVENIENCE_FEE_RATE = 0.023;

function roundCurrency(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

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
  const [submitting, setSubmitting] = useState(false);
  const createOrder = useAction(api.razorpay.createJoiningFeeOrder);
  const verifyOrder = useAction(api.razorpay.verifyJoiningFeeOrder);
  const baseAmount = roundCurrency(reporter.joinFeeAmount ?? 0);
  const convenienceFee = roundCurrency(baseAmount * CONVENIENCE_FEE_RATE);
  const totalAmount = roundCurrency(baseAmount + convenienceFee);

  const startPayment = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const order = await createJoiningFeeOrder(createOrder, reporter.id);
      const phoneDigits = String(reporter.phone || '').replace(/\D/g, '').slice(-10);

      const options = {
        description: 'Education News reporter joining fee',
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
        await verifyJoiningFeeOrder(verifyOrder, {
          orderId: checkoutResult.razorpay_order_id,
          razorpayPaymentId: checkoutResult.razorpay_payment_id,
          razorpaySignature: checkoutResult.razorpay_signature,
        });
        Alert.alert('Payment Confirmed', 'Your reporter account is active. Welcome to your dashboard.');
        router.replace('/(reporter)/(tabs)');
      } catch (verifyError) {
        Alert.alert('Verification Pending', verifyError instanceof Error ? verifyError.message : 'Please try again shortly.');
      }
    } catch (error) {
      Alert.alert('Could Not Start Payment', error instanceof Error ? error.message : 'Please try again.');
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
          <View style={styles.feeRow}>
            <Text style={[styles.feeLabel, { color: theme.colors.textSecondary }]}>Joining fee</Text>
            <Text style={[styles.feeLineAmount, { color: theme.colors.text }]}>₹{baseAmount.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={[styles.feeLabel, { color: theme.colors.textSecondary }]}>Credential validity</Text>
            <Text style={[styles.feeLineAmount, { color: theme.colors.text }]}>1 Year</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={[styles.feeLabel, { color: theme.colors.textSecondary }]}>Convenience fee (2.3%)</Text>
            <Text style={[styles.feeLineAmount, { color: theme.colors.text }]}>₹{convenienceFee.toLocaleString('en-IN')}</Text>
          </View>
          <View style={[styles.feeDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.feeRow}>
            <Text style={[styles.totalLabel, { color: theme.colors.text }]}>Total</Text>
            <Text style={[styles.feeAmount, { color: theme.colors.text }]}>₹{totalAmount.toLocaleString('en-IN')}</Text>
          </View>
        </View>
        <Text style={[styles.pendingText, { color: theme.colors.textSecondary }]}>
          Pay securely with Razorpay. Your reporter account and 1-year press credential ID will be approved automatically after payment confirmation.
        </Text>
        <Button label={`Pay ₹${totalAmount.toLocaleString('en-IN')}`} onPress={startPayment} loading={submitting} fullWidth size="lg" />
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
        <Text style={[styles.pendingTitle, { color: theme.colors.text }]}>Previous Payment Submission</Text>
        <Text style={[styles.pendingText, { color: theme.colors.textSecondary }]}>
          This payment was submitted through the previous process. Please contact the admin for a new Razorpay payment request.
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
  feeHighlight: {
    width: '100%',
    maxWidth: 280,
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  feeLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  feeRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  feeDivider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
  },
  feeLineAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  feeAmount: {
    fontSize: 22,
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
