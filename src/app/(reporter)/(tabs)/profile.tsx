import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Icon, IconName } from '@/components/ui/Icon';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useArticles } from '@/context/ArticlesContext';
import { useAuth } from '@/context/AuthContext';
import { useReporters } from '@/context/ReportersContext';
import { formatValidityDate } from '@/lib/validity';
import { useAppTheme } from '@/theme';

function MenuRow({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={styles.menuRow}>
      <View style={[styles.menuIcon, { backgroundColor: danger ? theme.colors.dangerMuted : theme.colors.backgroundSubtle }]}>
        <Icon name={icon} size={18} color={danger ? theme.colors.danger : theme.colors.text} />
      </View>
      <Text style={[styles.menuLabel, { color: danger ? theme.colors.danger : theme.colors.text }]}>{label}</Text>
      <Icon name="chevron-forward" size={18} color={theme.colors.textMuted} />
    </Pressable>
  );
}

export default function ReporterProfileScreen() {
  const theme = useAppTheme();
  const { user, logout, resendVerificationEmail } = useAuth();
  const { articles } = useArticles();
  const { getReporterByEmail } = useReporters();
  const reporterRecord = user?.email ? getReporterByEmail(user.email) : undefined;
  const reporterIds = new Set([reporterRecord?.id, user?.id].filter((id): id is string => !!id));
  const reporterArticles = articles.filter((article) => reporterIds.has(article.reporterId));
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [idCardVisible, setIdCardVisible] = useState(false);

  const handleResendVerification = async () => {
    try {
      await resendVerificationEmail();
      Alert.alert('Verification Email Sent', 'Please check your inbox (and spam folder).');
    } catch (error) {
      Alert.alert('Could not send email', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const stats = [
    { label: 'Articles', value: reporterArticles.length },
    { label: 'Approved', value: reporterArticles.filter((article) => article.status === 'approved').length },
    { label: 'Rating', value: reporterRecord?.rating ?? 0 },
  ];

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Avatar
            uri={reporterRecord?.avatar || reporterRecord?.photo || user?.avatar}
            name={reporterRecord?.name ?? user?.name ?? 'R'}
            size={82}
          />
          <Text style={[styles.name, { color: theme.colors.text }]}>{reporterRecord?.name ?? user?.name}</Text>
          <Text style={[styles.email, { color: theme.colors.textSecondary }]}>{reporterRecord?.email ?? user?.email}</Text>
          {reporterRecord?.city ? (
            <Text style={[styles.email, { color: theme.colors.textMuted }]}>{reporterRecord.city}</Text>
          ) : null}
          {reporterRecord?.reporterCode ? (
            <Text style={[styles.email, { color: theme.colors.textMuted }]}>ID: {reporterRecord.reporterCode}</Text>
          ) : null}
          {reporterRecord?.requestStatus === 'approved' || reporterRecord?.isActive ? (
            <View style={[styles.validityPill, { backgroundColor: theme.colors.primaryMuted }]}>
              <Icon name="shield-checkmark" size={13} color={theme.colors.primary} />
              <Text style={[styles.validityPillText, { color: theme.colors.primary }]}>
                Valid Thru: {formatValidityDate(reporterRecord?.validUntil, reporterRecord?.joinedAt)}
              </Text>
            </View>
          ) : null}
          <View style={styles.statsRow}>
            {stats.map((s) => (
              <View key={s.label} style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.text }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <Card style={styles.menuCard} padded={false}>
          <MenuRow icon="card-outline" label="Press Identity Card" onPress={() => setIdCardVisible(true)} />
          <MenuRow icon="person-outline" label="Edit Profile" onPress={() => router.push('/(reporter)/edit-profile')} />
          {/* <MenuRow icon="mail-unread-outline" label="Resend Verification Email" onPress={handleResendVerification} /> */}
          <MenuRow icon="cash-outline" label="Payments & Payouts" onPress={() => router.push('/(reporter)/payment')} />
          <MenuRow icon="lock-closed-outline" label="Change Password" onPress={() => router.push('/(reporter)/change-password')} />
          <MenuRow icon="settings-outline" label="Settings" onPress={() => router.push('/(reporter)/settings')} />
        </Card>

        <Card style={styles.menuCard} padded={false}>
          <MenuRow icon="help-circle-outline" label="Help & Support" onPress={() => router.push('/(reporter)/help-support')} />
          <MenuRow icon="document-lock-outline" label="Terms & Privacy" onPress={() => router.push('/(reporter)/terms-privacy')} />
          <MenuRow icon="log-out-outline" label="Logout" onPress={() => setLogoutVisible(true)} danger />
        </Card>
      </ScrollView>

      {/* Press Identity Card Modal */}
      <Modal visible={idCardVisible} transparent animationType="fade" onRequestClose={() => setIdCardVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.idCardModal, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.idCardHeader}>
              <Text style={styles.idCardHeaderTitle}>EDUCATION NEWS</Text>
              <Text style={styles.idCardHeaderSub}>PRESS IDENTITY CARD</Text>
            </View>
            <View style={styles.idCardAccent} />

            <View style={styles.idCardBody}>
              <Avatar
                uri={reporterRecord?.photo || reporterRecord?.avatar || user?.avatar}
                name={reporterRecord?.name ?? user?.name ?? 'R'}
                size={78}
              />
              <Text style={[styles.idCardName, { color: theme.colors.text }]}>
                {reporterRecord?.name ?? user?.name}
              </Text>
              <View style={styles.idCardBadge}>
                <Text style={styles.idCardBadgeText}>
                  {(reporterRecord?.designation || 'NEWS REPORTER').toUpperCase()}
                </Text>
              </View>

              <View style={styles.idCardMetaGrid}>
                <View style={[styles.idCardMetaBox, { backgroundColor: theme.colors.backgroundSubtle, borderColor: theme.colors.border }]}>
                  <Text style={[styles.idCardMetaLabel, { color: theme.colors.textMuted }]}>REPORTER ID</Text>
                  <Text style={[styles.idCardMetaVal, { color: theme.colors.text }]}>
                    {reporterRecord?.reporterCode || reporterRecord?.id || '—'}
                  </Text>
                </View>
                <View style={[styles.idCardMetaBox, { backgroundColor: theme.colors.backgroundSubtle, borderColor: theme.colors.border }]}>
                  <Text style={[styles.idCardMetaLabel, { color: theme.colors.textMuted }]}>VALID THRU</Text>
                  <Text style={[styles.idCardMetaVal, { color: theme.colors.text }]}>
                    {formatValidityDate(reporterRecord?.validUntil, reporterRecord?.joinedAt)}
                  </Text>
                </View>
              </View>

              <View style={styles.idCardContactList}>
                {reporterRecord?.email ? (
                  <View style={styles.idCardContactRow}>
                    <Icon name="mail" size={13} color={theme.colors.primary} />
                    <Text style={[styles.idCardContactText, { color: theme.colors.textSecondary }]}>
                      {reporterRecord.email}
                    </Text>
                  </View>
                ) : null}
                {reporterRecord?.phone ? (
                  <View style={styles.idCardContactRow}>
                    <Icon name="call" size={13} color={theme.colors.primary} />
                    <Text style={[styles.idCardContactText, { color: theme.colors.textSecondary }]}>
                      {reporterRecord.phone}
                    </Text>
                  </View>
                ) : null}
                {reporterRecord?.city || reporterRecord?.village ? (
                  <View style={styles.idCardContactRow}>
                    <Icon name="location" size={13} color={theme.colors.primary} />
                    <Text style={[styles.idCardContactText, { color: theme.colors.textSecondary }]}>
                      {[reporterRecord.village, reporterRecord.city].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={[styles.idCardFooter, { backgroundColor: theme.colors.backgroundSubtle, borderColor: theme.colors.border }]}>
              <View style={styles.idCardStatusRow}>
                <View style={[styles.idCardDot, { backgroundColor: reporterRecord?.isActive ? theme.colors.success : theme.colors.textMuted }]} />
                <Text style={[styles.idCardStatusText, { color: reporterRecord?.isActive ? theme.colors.success : theme.colors.textMuted }]}>
                  {reporterRecord?.isActive ? 'ACTIVE CREDENTIAL' : 'UNDER REVIEW'}
                </Text>
              </View>
              <Text style={[styles.idCardDomain, { color: theme.colors.textMuted }]}>educationnews.com</Text>
            </View>

            <Pressable style={[styles.idCardCloseBtn, { backgroundColor: theme.colors.primary }]} onPress={() => setIdCardVisible(false)}>
              <Text style={styles.idCardCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Dialog
        visible={logoutVisible}
        title="Log out?"
        message="You will need to sign in again to access your reporter account."
        onRequestClose={() => setLogoutVisible(false)}
        actions={[
          { label: 'Cancel', onPress: () => setLogoutVisible(false), variant: 'outline' },
          {
            label: 'Logout',
            variant: 'danger',
            onPress: () => {
              setLogoutVisible(false);
              logout();
              router.replace('/(auth)/login');
            },
          },
        ]}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  name: {
    fontSize: 19,
    fontWeight: '800',
    marginTop: 12,
  },
  email: {
    fontSize: 13,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 28,
    marginTop: 18,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11.5,
    marginTop: 2,
    fontWeight: '500',
  },
  menuCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
  },
  validityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 6,
  },
  validityPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  idCardModal: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  idCardHeader: {
    backgroundColor: '#111317',
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  idCardHeaderTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  idCardHeaderSub: {
    color: '#f3b72c',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  idCardAccent: {
    height: 4,
    backgroundColor: '#f3b72c',
  },
  idCardBody: {
    padding: 18,
    alignItems: 'center',
  },
  idCardName: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
    textAlign: 'center',
  },
  idCardBadge: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 4,
  },
  idCardBadgeText: {
    color: '#dc2626',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  idCardMetaGrid: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginTop: 14,
  },
  idCardMetaBox: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  idCardMetaLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  idCardMetaVal: {
    fontSize: 11.5,
    fontWeight: '800',
    marginTop: 2,
  },
  idCardContactList: {
    width: '100%',
    marginTop: 12,
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  idCardContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  idCardContactText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  idCardFooter: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  idCardStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  idCardDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  idCardStatusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  idCardDomain: {
    fontSize: 9,
    fontWeight: '700',
  },
  idCardCloseBtn: {
    margin: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idCardCloseText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
