import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonRow, IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ErrorState } from '@/components/ui/StateViews';
import { mockArticles, mockReporters } from '@/mocks/data';
import { useAppTheme } from '@/theme';

export default function ReporterDetailsScreen() {
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const reporter = mockReporters.find((r) => r.id === id);
  const articles = mockArticles.filter((a) => a.reporterId === id).slice(0, 5);

  if (!reporter) {
    return (
      <ScreenContainer>
        <ErrorState title="Reporter not found" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" onPress={() => router.back()} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Reporter Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.profileHeader}>
          <Avatar uri={reporter.avatar} name={reporter.name} size={84} online={reporter.isActive} />
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: theme.colors.text }]}>{reporter.name}</Text>
            {reporter.isVerified ? <Icon name="checkmark-circle" size={17} color={theme.colors.primary} /> : null}
          </View>
          <Text style={[styles.city, { color: theme.colors.textSecondary }]}>{reporter.city}</Text>
          <View style={styles.badgesRow}>
            <Badge label={reporter.isActive ? 'Active' : 'Inactive'} tone={reporter.isActive ? 'success' : 'neutral'} />
            <Badge label={`★ ${reporter.rating}`} tone="warning" />
          </View>
        </View>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{reporter.approvedCount}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Approved</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{reporter.rejectedCount}</Text>
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

        <Text style={[styles.bio, { color: theme.colors.textSecondary }]}>{reporter.bio}</Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Recent Submissions</Text>
        {articles.map((article) => (
          <Card key={article.id} style={styles.articleRow}>
            <Text style={[styles.articleTitle, { color: theme.colors.text }]} numberOfLines={2}>
              {article.title}
            </Text>
            <Badge label={article.status} tone={article.status === 'approved' ? 'success' : article.status === 'rejected' ? 'danger' : 'warning'} size="sm" />
          </Card>
        ))}

        <View style={{ height: 24 }} />
        <ButtonRow>
          <View style={{ flex: 1 }}>
            <Button label={reporter.isActive ? 'Suspend' : 'Activate'} variant="outline" onPress={() => {}} fullWidth />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Message" onPress={() => {}} fullWidth />
          </View>
        </ButtonRow>
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
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 20,
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
