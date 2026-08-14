import { File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonRow, IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ErrorState } from '@/components/ui/StateViews';
import { useArticles } from '@/context/ArticlesContext';
import { useNotifications } from '@/context/NotificationsContext';
import { usePayments } from '@/context/PaymentsContext';
import { useReporters } from '@/context/ReportersContext';
import { useAppTheme } from '@/theme';

export default function ReporterDetailsScreen() {
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isLoading: reportersLoading, getReporter, updateReporter, deleteReporter } = useReporters();
  const { addNotification } = useNotifications();
  const { payments, updatePaymentStatus } = usePayments();
  const { articles: allArticles } = useArticles();
  const contextReporter = getReporter(id);
  const reporter = contextReporter;
  const lookupFinished = !reportersLoading;
  const reporterArticles = allArticles.filter((article) => getReporter(article.reporterId)?.id === id);
  const recentArticles = reporterArticles.slice(0, 5);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [rejectVisible, setRejectVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [feeVisible, setFeeVisible] = useState(false);
  const [feeAmount, setFeeAmount] = useState('');
  const [sendingFee, setSendingFee] = useState(false);
  const [photoVisible, setPhotoVisible] = useState(false);
  const [downloadingPhoto, setDownloadingPhoto] = useState(false);

  if (reportersLoading || (!reporter && !lookupFinished)) {
    return (
      <ScreenContainer>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ color: theme.colors.textSecondary }}>Loading reporter...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!reporter) {
    return (
      <ScreenContainer>
        <ErrorState title="Reporter not found" />
      </ScreenContainer>
    );
  }

  const handleDelete = async () => {
    setDeleteVisible(false);
    await deleteReporter(reporter.id);
    router.back();
  };

  const toggleActive = async () => {
    const nextActive = !reporter.isActive;
    await updateReporter(reporter.id, { isActive: nextActive });
    Alert.alert(
      nextActive ? 'Reporter Activated' : 'Reporter Suspended',
      nextActive
        ? `${reporter.name} can publish articles again.`
        : `${reporter.name} can no longer publish articles.`,
    );
  };

  const sendPaymentRequest = async () => {
    const amount = Number(feeAmount);
    if (!amount || amount <= 0 || sendingFee) return;
    setSendingFee(true);
    try {
      await updateReporter(reporter.id, { requestStatus: 'awaiting_payment', joinFeeAmount: amount });
      setFeeVisible(false);
      setFeeAmount('');
      try {
        await addNotification({
          type: 'system',
          audience: 'reporter',
          title: 'Joining Fee Requested',
          message: `${reporter.name}, please pay the ₹${amount} joining fee to complete your registration. A 2.3% convenience fee will be added at Cashfree checkout.`,
          reporterId: reporter.id,
        });
        Alert.alert('Payment Request Sent', `${reporter.name}'s status is now Awaiting Payment.`);
      } catch {
        Alert.alert('Status Updated', 'The status is now Awaiting Payment, but the notification could not be sent.');
      }
    } catch {
      Alert.alert('Could Not Send Request', 'The reporter status was not updated. Please try again.');
    } finally {
      setSendingFee(false);
    }
  };

  const rejectRequest = async () => {
    if (!rejectReason.trim()) return;
    setRejectVisible(false);
    const joiningPayment = payments.find(
      (payment) => payment.reporterId === reporter.id && payment.purpose === 'joining_fee' && payment.status === 'pending',
    );
    if (joiningPayment) await updatePaymentStatus(joiningPayment.id, 'failed');
    await updateReporter(reporter.id, {
      requestStatus: 'rejected',
      requestRejectionReason: rejectReason.trim(),
      joinFeeAmount: 0,
    });
    await addNotification({
      type: 'system',
      audience: 'reporter',
      title: 'Reporter Request Rejected',
      message: `${reporter.name}, your reporter request was not approved. Reason: ${rejectReason.trim()}`,
      reporterId: reporter.id,
    });
    setRejectReason('');
  };

  const reconsiderRequest = async () => {
    await updateReporter(reporter.id, { requestStatus: 'pending', requestRejectionReason: undefined });
    await addNotification({
      type: 'system',
      audience: 'reporter',
      title: 'Reporter Request Reopened',
      message: `${reporter.name}, your reporter request is being reconsidered by the admin.`,
      reporterId: reporter.id,
    });
  };

  const reporterPhoto = reporter.photo || reporter.avatar;

  const downloadPhoto = async () => {
    if (!reporterPhoto || downloadingPhoto) return;
    setDownloadingPhoto(true);
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Download Unavailable', 'Saving files is not supported on this device.');
        return;
      }
      const localUri = reporterPhoto.startsWith('file://')
        ? reporterPhoto
        : (await File.downloadFileAsync(
            reporterPhoto,
            new File(Paths.cache, `reporter-${reporter.id}-${Date.now()}.jpg`),
          )).uri;
      await Sharing.shareAsync(localUri, {
        mimeType: 'image/jpeg',
        dialogTitle: `Save ${reporter.name}'s profile photo`,
      });
    } catch {
      Alert.alert('Download Failed', 'The reporter photo could not be downloaded. Please try again.');
    } finally {
      setDownloadingPhoto(false);
    }
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" onPress={() => router.back()} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Reporter Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.profileHeader}>
          <Pressable
            onPress={() => reporterPhoto && setPhotoVisible(true)}
            disabled={!reporterPhoto}
            accessibilityRole="button"
            accessibilityLabel={`View ${reporter.name}'s profile photo`}>
            <Avatar uri={reporterPhoto} name={reporter.name} size={84} online={reporter.isActive} />
          </Pressable>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: theme.colors.text }]}>{reporter.name}</Text>
            {reporter.isVerified ? <Icon name="checkmark-circle" size={17} color={theme.colors.primary} /> : null}
          </View>
          <Text style={[styles.city, { color: theme.colors.textSecondary }]}>{reporter.city}</Text>
          {reporter.reporterCode ? (
            <Text style={[styles.city, { color: theme.colors.textMuted }]}>ID: {reporter.reporterCode}</Text>
          ) : null}
          <View style={styles.badgesRow}>
            <Badge label={reporter.isActive ? 'Active' : 'Inactive'} tone={reporter.isActive ? 'success' : 'neutral'} />
            <Badge label={`★ ${reporter.rating}`} tone="warning" />
            {reporter.requestStatus === 'pending' ? <Badge label="Pending Approval" tone="warning" /> : null}
            {reporter.requestStatus === 'awaiting_payment' ? <Badge label={`Awaiting Payment (₹${reporter.joinFeeAmount})`} tone="warning" /> : null}
            {reporter.requestStatus === 'payment_submitted' ? <Badge label="Payment Submitted" tone="info" /> : null}
            {reporter.requestStatus === 'rejected' ? <Badge label="Rejected" tone="danger" /> : null}
          </View>
        </View>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {reporterArticles.filter((article) => article.status === 'approved').length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Approved</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {reporterArticles.filter((article) => article.status === 'rejected').length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Rejected</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>₹{(reporter.totalEarnings / 1000).toFixed(1)}k</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Earnings</Text>
          </Card>
        </View>

        <Card style={styles.contactCard}>
          <View style={styles.contactRow}>
            <Icon name="mail-outline" size={16} color={theme.colors.textMuted} />
            <Text style={[styles.contactText, { color: theme.colors.text }]}>{reporter.email}</Text>
          </View>
          <View style={styles.contactRow}>
            <Icon name="call-outline" size={16} color={theme.colors.textMuted} />
            <Text style={[styles.contactText, { color: theme.colors.text }]}>{reporter.phone}</Text>
          </View>
        </Card>

        {reporter.village || reporter.address || reporter.aadharNumber ? (
          <Card style={styles.contactCard}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary, marginTop: 0 }]}>
              Join Request Details
            </Text>
            {reporter.village ? (
              <View style={styles.contactRow}>
                <Icon name="location-outline" size={16} color={theme.colors.textMuted} />
                <Text style={[styles.contactText, { color: theme.colors.text }]}>Gaon: {reporter.village}</Text>
              </View>
            ) : null}
            {reporter.address ? (
              <View style={styles.contactRow}>
                <Icon name="home-outline" size={16} color={theme.colors.textMuted} />
                <Text style={[styles.contactText, { color: theme.colors.text }]}>{reporter.address}</Text>
              </View>
            ) : null}
            {reporter.aadharNumber ? (
              <View style={styles.contactRow}>
                <Icon name="card-outline" size={16} color={theme.colors.textMuted} />
                <Text style={[styles.contactText, { color: theme.colors.text }]}>Aadhar: {reporter.aadharNumber}</Text>
              </View>
            ) : null}
          </Card>
        ) : null}

        {reporter.requestStatus === 'pending' ? (
          <>
            <View style={{ height: 16 }} />
            <ButtonRow>
              <View style={{ flex: 1 }}>
                <Button label="Reject" variant="danger" icon="close" onPress={() => setRejectVisible(true)} fullWidth />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="Set Fee & Request Payment" icon="cash-outline" onPress={() => setFeeVisible(true)} fullWidth />
              </View>
            </ButtonRow>
          </>
        ) : null}

        {reporter.requestStatus === 'awaiting_payment' ? (
          <>
            <View style={{ height: 16 }} />
            <Text style={[styles.bio, { color: theme.colors.textSecondary }]}>
              Waiting for {reporter.name} to complete the ₹{reporter.joinFeeAmount} Cashfree payment. Approval is automatic after confirmation.
            </Text>
            <Button label="Reject" variant="danger" icon="close" onPress={() => setRejectVisible(true)} fullWidth />
          </>
        ) : null}

        {reporter.requestStatus === 'payment_submitted' ? (
          <>
            <View style={{ height: 16 }} />
            <Text style={[styles.bio, { color: theme.colors.textSecondary }]}>
              This is a legacy payment submission. Send a new Cashfree payment request to use automatic confirmation.
            </Text>
            <Button label="Reject" variant="danger" icon="close" onPress={() => setRejectVisible(true)} fullWidth />
          </>
        ) : null}

        {reporter.requestStatus === 'rejected' ? (
          <>
            <View style={{ height: 16 }} />
            <Button label="Reconsider Request" icon="refresh" onPress={reconsiderRequest} fullWidth />
          </>
        ) : null}

        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Recent Submissions</Text>
        {recentArticles.length === 0 ? (
          <Text style={[styles.bio, { color: theme.colors.textMuted }]}>No articles submitted yet.</Text>
        ) : null}
        {recentArticles.map((article) => (
          <Card key={article.id} style={styles.articleRow}>
            <Text style={[styles.articleTitle, { color: theme.colors.text }]} numberOfLines={2}>
              {article.title}
            </Text>
            <Badge label={article.status} tone={article.status === 'approved' ? 'success' : article.status === 'rejected' ? 'danger' : 'warning'} size="sm" />
          </Card>
        ))}

        <View style={{ height: 24 }} />
        {reporter.requestStatus === 'approved' ? (
          <Button label={reporter.isActive ? 'Suspend' : 'Activate'} variant="outline" onPress={toggleActive} fullWidth />
        ) : null}

        <View style={{ height: 12 }} />
        <Button label="Delete Account" variant="danger" onPress={() => setDeleteVisible(true)} fullWidth />
      </ScrollView>

      <Dialog
        visible={photoVisible}
        title={`${reporter.name}'s Profile Photo`}
        onRequestClose={() => setPhotoVisible(false)}
        actions={[
          { label: 'Close', variant: 'outline', onPress: () => setPhotoVisible(false) },
          { label: downloadingPhoto ? 'Downloading...' : 'Download Photo', onPress: downloadPhoto },
        ]}>
        {reporterPhoto ? <Image source={{ uri: reporterPhoto }} style={styles.profilePhoto} contentFit="contain" /> : null}
      </Dialog>

      <Dialog
        visible={deleteVisible}
        title="Delete Reporter Account?"
        message={`This will permanently remove ${reporter.name}'s account from the app. This action cannot be undone.`}
        onRequestClose={() => setDeleteVisible(false)}
        actions={[
          { label: 'Cancel', variant: 'outline', onPress: () => setDeleteVisible(false) },
          { label: 'Delete', variant: 'danger', onPress: handleDelete },
        ]}
      />

      <Dialog
        visible={rejectVisible}
        title="Reject Reporter Request"
        message="Provide a reason so the applicant understands why."
        onRequestClose={() => setRejectVisible(false)}
        actions={[
          { label: 'Cancel', variant: 'outline', onPress: () => setRejectVisible(false) },
          { label: 'Send Feedback', variant: 'danger', onPress: rejectRequest },
        ]}>
        <View style={{ marginBottom: 6 }}>
          <Input
            placeholder="Reason for rejection..."
            multiline
            value={rejectReason}
            onChangeText={setRejectReason}
            style={{ minHeight: 80 }}
          />
        </View>
      </Dialog>

      <Dialog
        visible={feeVisible}
        title="Set Joining Fee"
        message={`Enter the base amount to charge ${reporter.name}. A 2.3% convenience fee will be added at Cashfree checkout.`}
        onRequestClose={() => setFeeVisible(false)}
        actions={[
          { label: 'Cancel', variant: 'outline', onPress: () => setFeeVisible(false) },
          { label: sendingFee ? 'Sending...' : 'Send Payment Request', onPress: sendPaymentRequest },
        ]}>
        <View style={{ marginBottom: 6 }}>
          <Input
            placeholder="Amount in ₹"
            keyboardType="number-pad"
            value={feeAmount}
            onChangeText={setFeeAmount}
          />
        </View>
      </Dialog>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
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
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  profilePhoto: {
    width: '100%',
    aspectRatio: 1,
    marginVertical: 14,
    borderRadius: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
  },
  name: {
    fontSize: 19,
    fontWeight: '800',
  },
  city: {
    fontSize: 13,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  contactCard: {
    gap: 10,
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactText: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  bio: {
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  articleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  articleTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
});
