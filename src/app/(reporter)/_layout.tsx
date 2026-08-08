import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationsContext';
import { useReporters } from '@/context/ReportersContext';
import { clearJustSubmittedReporterId, getJustSubmittedReporterId } from '@/lib/joinRequestFlag';
import { useAppTheme } from '@/theme';
import type { Reporter } from '@/types/models';

const paymentQr = require('../../../assets/images/PaymentQr.jpg');

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
  const [submitting, setSubmitting] = useState(false);

  const markPaymentDone = async () => {
    setSubmitting(true);
    try {
      await updateReporter(reporter.id, { requestStatus: 'payment_submitted' });
      await addNotification({
        type: 'system',
        audience: 'admin',
        title: 'Payment Marked as Done',
        message: `${reporter.name} says they have paid the ₹${reporter.joinFeeAmount} joining fee. Please confirm receipt.`,
      });
      Alert.alert('Thanks!', 'The admin has been notified. You will get access once payment is confirmed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.paymentScroll}>
        <Icon name="cash-outline" size={44} color={theme.colors.primary} />
        <Text style={[styles.pendingTitle, { color: theme.colors.text }]}>Joining Fee Required</Text>
        <Text style={[styles.pendingText, { color: theme.colors.textSecondary }]}>
          The admin has set a joining fee of ₹{reporter.joinFeeAmount}. Scan the QR code below to pay, then tap
          "Payment Done".
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
  const { user } = useAuth();
  const { reporters, isLoading } = useReporters();
  const reporterRecord = user?.email
    ? reporters.find((r) => r.email.toLowerCase() === user.email.toLowerCase())
    : undefined;

  // Once the real record shows up, stop trusting the transient "just submitted" flag.
  useEffect(() => {
    if (reporterRecord) clearJustSubmittedReporterId();
  }, [reporterRecord]);

  const justSubmitted = !reporterRecord && getJustSubmittedReporterId() != null;
  const needsJoinForm = !isLoading && !justSubmitted && user?.role === 'reporter' && !reporterRecord;

  useEffect(() => {
    if (needsJoinForm) router.replace('/(auth)/reporter-details');
  }, [needsJoinForm]);

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

  if (!isLoading && reporterRecord) {
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
