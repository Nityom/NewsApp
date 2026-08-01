import { router } from 'expo-router';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useAppTheme } from '@/theme';

const faqs = [
  {
    question: 'How do I submit an article for review?',
    answer: 'Go to the Home tab and tap the + button to create a new article. Fill in the details and tap Submit for Review.',
  },
  {
    question: 'How long does article review take?',
    answer: 'Our editorial team typically reviews submissions within 24-48 hours. You will be notified once a decision is made.',
  },
  {
    question: 'When do I get paid for approved articles?',
    answer: 'Payouts are processed monthly. You can track your earnings under Payments & Payouts in your profile.',
  },
  {
    question: 'How do I update my profile details?',
    answer: 'Open your Profile tab and tap Edit Profile to update your name, phone, city, bio, or photo.',
  },
];

export function HelpSupportScreen() {
  const theme = useAppTheme();

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" onPress={() => router.back()} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.contactCard}>
          <View style={styles.contactRow}>
            <Icon name="mail-outline" size={18} color={theme.colors.primary} />
            <Text
              style={[styles.contactText, { color: theme.colors.text }]}
              onPress={() => Linking.openURL('mailto:support@enreducationnews.app')}>
              support@enreducationnews.app
            </Text>
          </View>
          <View style={styles.contactRow}>
            <Icon name="call-outline" size={18} color={theme.colors.primary} />
            <Text
              style={[styles.contactText, { color: theme.colors.text }]}
              onPress={() => Linking.openURL('tel:+911234567890')}>
              +91 12345 67890
            </Text>
          </View>
        </Card>

        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Frequently Asked Questions</Text>
        {faqs.map((faq) => (
          <Card key={faq.question} style={styles.faqCard}>
            <Text style={[styles.faqQuestion, { color: theme.colors.text }]}>{faq.question}</Text>
            <Text style={[styles.faqAnswer, { color: theme.colors.textSecondary }]}>{faq.answer}</Text>
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
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
  },
  contactCard: {
    gap: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 6,
  },
  faqCard: {
    gap: 6,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '700',
  },
  faqAnswer: {
    fontSize: 13,
    lineHeight: 19,
  },
});
