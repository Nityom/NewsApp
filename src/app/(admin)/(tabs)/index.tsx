import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { ArticleCard } from '@/components/ui/ArticleCard';
import { Avatar } from '@/components/ui/Avatar';
import { IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon, IconName } from '@/components/ui/Icon';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionHeader } from '@/components/ui/SearchBar';
import { useArticles } from '@/context/ArticlesContext';
import { useAuth } from '@/context/AuthContext';
import { mockAnalytics } from '@/mocks/data';
import { useAppTheme } from '@/theme';

function StatCard({ icon, label, value, tone }: { icon: IconName; label: string; value: string; tone: 'primary' | 'success' | 'warning' | 'danger' }) {
  const theme = useAppTheme();
  return (
    <Card style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: theme.colors[`${tone}Muted`] }]}>
        <Icon name={icon} size={17} color={theme.colors[tone]} />
      </View>
      <Text style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
    </Card>
  );
}

export default function AdminDashboardScreen() {
  const theme = useAppTheme();
  const { user } = useAuth();
  const { articles } = useArticles();
  const pendingArticles = useMemo(() => articles.filter((a) => a.status === 'pending').slice(0, 4), [articles]);

  return (
    <ScreenContainer>
      <FlatList
        data={pendingArticles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View>
                <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>Good morning,</Text>
                <Text style={[styles.name, { color: theme.colors.text }]}>{user?.name ?? 'Admin'}</Text>
              </View>
              <View style={styles.headerActions}>
                <IconButton icon="notifications-outline" onPress={() => router.push('/(admin)/notifications')} />
                <Avatar uri={user?.avatar} name={user?.name ?? 'A'} size={44} />
              </View>
            </View>

            <View style={styles.statsGrid}>
              <StatCard icon="document-text" label="Total Articles" value={mockAnalytics.totalArticles.toString()} tone="primary" />
              <StatCard icon="people" label="Reporters" value={mockAnalytics.totalReporters.toString()} tone="success" />
              <StatCard icon="time" label="Pending Review" value={mockAnalytics.pendingReview.toString()} tone="warning" />
              <StatCard icon="eye" label="Total Views" value={`${(mockAnalytics.totalViews / 1000).toFixed(1)}k`} tone="danger" />
            </View>

            <Card style={[styles.analyticsCard, { backgroundColor: theme.colors.primary }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.analyticsTitle}>Revenue this month</Text>
                <Text style={styles.analyticsValue}>₹{mockAnalytics.totalRevenue.toLocaleString('en-IN')}</Text>
              </View>
              <Text onPress={() => router.push('/(admin)/analytics')} style={styles.analyticsLink}>
                View Analytics →
              </Text>
            </Card>

            <SectionHeader title="Pending Review" action="See all" />
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ marginBottom: 14 }}>
            <ArticleCard article={item} showAuthor onPress={() => router.push(`/(admin)/article/${item.id}`)} />
          </View>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '500',
  },
  name: {
    fontSize: 21,
    fontWeight: '800',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  statCard: {
    width: '47%',
    gap: 6,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 19,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  analyticsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    marginBottom: 22,
  },
  analyticsTitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12.5,
    fontWeight: '600',
  },
  analyticsValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  analyticsLink: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
