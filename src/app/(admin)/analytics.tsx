import { router } from 'expo-router';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { mockAnalytics } from '@/mocks/data';
import { useAppTheme } from '@/theme';

const { width } = Dimensions.get('window');
const chartWidth = width - 72;

function MiniBarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  return (
    <View style={styles.chartRow}>
      {data.map((value, i) => (
        <View key={i} style={styles.barWrap}>
          <View
            style={[
              styles.bar,
              { height: Math.max((value / max) * 90, 6), backgroundColor: color, width: (chartWidth - data.length * 10) / data.length },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

export default function AdminAnalyticsScreen() {
  const theme = useAppTheme();

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" onPress={() => router.back()} />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Analytics</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.summaryGrid}>
          <Card style={styles.summaryCard}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Total Views</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
              {(mockAnalytics.totalViews / 1000).toFixed(1)}k
            </Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Revenue</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
              ₹{(mockAnalytics.totalRevenue / 1000).toFixed(0)}k
            </Text>
          </Card>
        </View>

        <Card style={styles.chartCard}>
          <Text style={[styles.chartTitle, { color: theme.colors.text }]}>Views this week</Text>
          <MiniBarChart data={mockAnalytics.viewsTrend} color={theme.colors.primary} />
        </Card>

        <Card style={styles.chartCard}>
          <Text style={[styles.chartTitle, { color: theme.colors.text }]}>Articles published</Text>
          <MiniBarChart data={mockAnalytics.articlesTrend} color={theme.colors.success} />
        </Card>

        <Card style={styles.chartCard}>
          <Text style={[styles.chartTitle, { color: theme.colors.text }]}>Top Categories</Text>
          {mockAnalytics.topCategories.map((c) => (
            <View key={c.category} style={styles.categoryRow}>
              <Text style={[styles.categoryLabel, { color: theme.colors.text }]}>{c.category}</Text>
              <View style={[styles.categoryTrack, { backgroundColor: theme.colors.backgroundSubtle }]}>
                <View
                  style={[
                    styles.categoryFill,
                    {
                      width: `${(c.count / mockAnalytics.topCategories[0].count) * 100}%` as `${number}%`,
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.categoryCount, { color: theme.colors.textMuted }]}>{c.count}</Text>
            </View>
          ))}
        </Card>

        <View style={styles.approvalRow}>
          <Card style={[styles.approvalCard, { backgroundColor: theme.colors.successMuted }]}>
            <Text style={[styles.approvalValue, { color: theme.colors.success }]}>{mockAnalytics.approvedThisMonth}</Text>
            <Text style={[styles.approvalLabel, { color: theme.colors.text }]}>Approved this month</Text>
          </Card>
          <Card style={[styles.approvalCard, { backgroundColor: theme.colors.dangerMuted }]}>
            <Text style={[styles.approvalValue, { color: theme.colors.danger }]}>{mockAnalytics.rejectedThisMonth}</Text>
            <Text style={[styles.approvalLabel, { color: theme.colors.text }]}>Rejected this month</Text>
          </Card>
        </View>
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
    paddingTop: 12,
    paddingBottom: 40,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  chartCard: {
    marginBottom: 16,
    gap: 12,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    height: 100,
  },
  barWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    borderRadius: 6,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 90,
  },
  categoryTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryFill: {
    height: '100%',
    borderRadius: 4,
  },
  categoryCount: {
    fontSize: 11.5,
    fontWeight: '600',
    width: 24,
    textAlign: 'right',
  },
  approvalRow: {
    flexDirection: 'row',
    gap: 12,
  },
  approvalCard: {
    flex: 1,
    borderWidth: 0,
    gap: 4,
  },
  approvalValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  approvalLabel: {
    fontSize: 11.5,
    fontWeight: '600',
  },
});
