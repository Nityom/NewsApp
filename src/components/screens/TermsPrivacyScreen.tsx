import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAppTheme } from '@/theme';

const sections = [
  {
    title: '1. Introduction',
    body: 'Welcome to Education News Reporter. By using this app, you agree to these Terms and our Privacy Policy. If you do not agree, please do not use the app.',
  },
  {
    title: '2. Account Responsibilities',
    body: 'You are responsible for the accuracy of the articles you submit and for keeping your account credentials secure. Reporters must not submit plagiarized, defamatory, or misleading content.',
  },
  {
    title: '3. Content Review',
    body: 'All submitted articles are subject to editorial review before publication. We reserve the right to reject, edit, or remove content that violates our editorial guidelines.',
  },
  {
    title: '4. Payments',
    body: 'Earnings are calculated based on approved, published articles and are paid out on a monthly cycle, subject to the payout terms shown in your Payments & Payouts screen.',
  },
  {
    title: '5. Data We Collect',
    body: 'We collect your name, email, phone number, and profile details to operate reporter accounts, credit articles, and process payments. We do not sell your personal data to third parties.',
  },
  {
    title: '6. Data Retention',
    body: 'Account and article data is retained for as long as your account is active. You may request account deletion by contacting support.',
  },
  {
    title: '7. Changes to These Terms',
    body: 'We may update these Terms and our Privacy Policy from time to time. Continued use of the app after changes constitutes acceptance of the updated terms.',
  },
  {
    title: '8. Contact',
    body: 'Questions about these Terms or our Privacy Policy can be sent to support@enreducationnews.app.',
  },
];

export function TermsPrivacyScreen() {
  const theme = useAppTheme();

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" onPress={() => router.back()} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Terms & Privacy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.updated, { color: theme.colors.textMuted }]}>Last updated: August 2026</Text>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{section.title}</Text>
            <Text style={[styles.sectionBody, { color: theme.colors.textSecondary }]}>{section.body}</Text>
          </View>
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
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  updated: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 16,
  },
  section: {
    marginBottom: 18,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  sectionBody: {
    fontSize: 13,
    lineHeight: 19,
  },
});
