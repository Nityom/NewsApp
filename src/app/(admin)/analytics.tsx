import { router } from 'expo-router';
import { useMemo } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useArticles } from '@/context/ArticlesContext';
import { usePayments } from '@/context/PaymentsContext';
import { useReporters } from '@/context/ReportersContext';
import { useAppTheme } from '@/theme';

const { width } = Dimensions.get('window');
const chartWidth = width - 72;

function MiniBarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
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

function countsForLastSevenDays(dates: string[]) {
  const dayStarts = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return date;
  });
  return dayStarts.map((start) => {
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return dates.filter((value) => {
      const date = new Date(value);
      return date >= start && date < end;
    }).length;
  });
}

export default function AdminAnalyticsScreen() {
  const theme = useAppTheme();
  const { articles } = useArticles();
  const { reporters } = useReporters();
  const { payments } = usePayments();

  const analytics = useMemo(() => {
    const now = new Date();
    const isCurrentMonth = (value?: string) => {
      if (!value) return false;
      const date = new Date(value);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    };
    const confirmedPayments = payments.filter(
      (payment) => payment.status === 'paid' && payment.purpose !== 'payout',
    );
    const monthlyRevenue = confirmedPayments
      .filter((payment) => isCurrentMonth(payment.updatedAt ?? payment.createdAt))
      .reduce((sum, payment) => sum + payment.amount, 0);

    return {
      monthlyRevenue,
      publishedTrend: countsForLastSevenDays(
        articles.filter((article) => article.status === 'approved' && article.reviewedAt).map((article) => article.reviewedAt!),
      ),
      paymentTrend: countsForLastSevenDays(
        confirmedPayments.map((payment) => payment.updatedAt ?? payment.createdAt),
      ),
      approvedThisMonth: articles.filter(
        (article) => article.status === 'approved' && isCurrentMonth(article.reviewedAt ?? article.updatedAt),
      ).length,
      rejectedThisMonth: articles.filter(
        (article) => article.status === 'rejected' && isCurrentMonth(article.reviewedAt ?? article.updatedAt),
      ).length,
    };
  }, [articles, payments]);

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
            <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Revenue This Month</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>₹{analytics.monthlyRevenue.toLocaleString('en-IN')}</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>Active Reporters</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{reporters.filter((reporter) => reporter.isActive).length}</Text>
          </Card>
        </View>

        <Card style={styles.chartCard}>
          <Text style={[styles.chartTitle, { color: theme.colors.text }]}>Articles published in the last 7 days</Text>
          <MiniBarChart data={analytics.publishedTrend} color={theme.colors.primary} />
        </Card>

        <Card style={styles.chartCard}>
          <Text style={[styles.chartTitle, { color: theme.colors.text }]}>Payments confirmed in the last 7 days</Text>
          <MiniBarChart data={analytics.paymentTrend} color={theme.colors.success} />
        </Card>

        <View style={styles.approvalRow}>
          <Card style={[styles.approvalCard, { backgroundColor: theme.colors.successMuted }]}>
            <Text style={[styles.approvalValue, { color: theme.colors.success }]}>{analytics.approvedThisMonth}</Text>
            <Text style={[styles.approvalLabel, { color: theme.colors.text }]}>Approved this month</Text>
          </Card>
          <Card style={[styles.approvalCard, { backgroundColor: theme.colors.dangerMuted }]}>
            <Text style={[styles.approvalValue, { color: theme.colors.danger }]}>{analytics.rejectedThisMonth}</Text>
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
