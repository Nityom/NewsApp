import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { ArticleCard } from '@/components/ui/ArticleCard';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { FAB } from '@/components/ui/FAB';
import { Icon, IconName } from '@/components/ui/Icon';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionHeader } from '@/components/ui/SearchBar';
import { useArticles } from '@/context/ArticlesContext';
import { useAuth } from '@/context/AuthContext';
import { useReporters } from '@/context/ReportersContext';
import { useAppTheme } from '@/theme';

function StatTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: IconName;
  label: string;
  value: string | number;
  tone: 'primary' | 'success' | 'warning' | 'danger';
}) {
  const theme = useAppTheme();
  const toneColor = theme.colors[tone];
  const toneBg = theme.colors[`${tone}Muted` as keyof typeof theme.colors];

  return (
    <Card style={styles.statTile}>
      <View style={[styles.statIcon, { backgroundColor: toneBg }]}>
        <Icon name={icon} size={18} color={toneColor} />
      </View>
      <Text style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
    </Card>
  );
}

export default function ReporterDashboardScreen() {
  const theme = useAppTheme();
  const { user } = useAuth();
  const { articles } = useArticles();
  const { getReporterByEmail } = useReporters();
  const reporter = user?.email ? getReporterByEmail(user.email) : undefined;
  const reporterPhoto = reporter?.photo || reporter?.avatar || user?.avatar;
  const myReporterIds = useMemo(
    () => new Set([reporter?.id, user?.id].filter((id): id is string => !!id)),
    [reporter?.id, user?.id],
  );
  const allMyArticles = useMemo(
    () => articles.filter((article) => myReporterIds.has(article.reporterId)),
    [articles, myReporterIds],
  );

  const myArticles = useMemo(() => allMyArticles.slice(0, 6), [allMyArticles]);
  const counts = useMemo(
    () => ({
      approved: allMyArticles.filter((article) => article.status === 'approved').length,
      pending: allMyArticles.filter((article) => article.status === 'pending').length,
      rejected: allMyArticles.filter((article) => article.status === 'rejected').length,
      drafts: allMyArticles.filter((article) => article.status === 'draft').length,
    }),
    [allMyArticles],
  );

  return (
    <ScreenContainer>
      <FlatList
        data={myArticles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View>
                <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>Welcome back,</Text>
                <Text style={[styles.name, { color: theme.colors.text }]}>{user?.name ?? 'Reporter'}</Text>
              </View>
              <Avatar uri={reporterPhoto} name={reporter?.name ?? user?.name ?? 'R'} size={48} online />
            </View>

            {/* <Card style={[styles.subscriptionCard, { backgroundColor: theme.colors.primary }]} elevated>
              <Icon name="ribbon" size={22} color={theme.colors.onPrimary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.subscriptionTitle, { color: theme.colors.onPrimary }]}>Verified Reporter</Text>
                <Text style={[styles.subscriptionSubtitle, { color: theme.colors.onPrimary }]}>Your subscription is active until Dec 2026</Text>
              </View>
            </Card> */}

            <View style={styles.statsGrid}>
              <StatTile icon="checkmark-done" label="Approved" value={counts.approved} tone="success" />
              <StatTile icon="time" label="Pending" value={counts.pending} tone="warning" />
              <StatTile icon="close-circle" label="Rejected" value={counts.rejected} tone="danger" />
              <StatTile icon="document" label="Drafts" value={counts.drafts} tone="primary" />
            </View>

            <SectionHeader
              title="Recent Articles"
              action="See all"
              onActionPress={() => router.push('/(reporter)/(tabs)/articles')}
            />
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ marginBottom: 14 }}>
            <ArticleCard article={item} onPress={() => router.push(`/(reporter)/article/${item.id}`)} />
          </View>
        )}
      />
      <FAB onPress={() => router.push('/(reporter)/create-article')} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100,
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
  subscriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 0,
    marginBottom: 20,
  },
  subscriptionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  subscriptionSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 22,
  },
  statTile: {
    width: '47%',
    gap: 6,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});
