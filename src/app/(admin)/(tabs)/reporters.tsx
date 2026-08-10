import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SearchBar } from '@/components/ui/SearchBar';
import { EmptyState } from '@/components/ui/StateViews';
import { useArticles } from '@/context/ArticlesContext';
import { useReporters } from '@/context/ReportersContext';
import { useAppTheme } from '@/theme';

export default function AdminReportersScreen() {
  const theme = useAppTheme();
  const { articles } = useArticles();
  const { reporters, getReporter } = useReporters();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const matches = reporters.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()));
    // Join requests still in progress surface first so admins see them immediately.
    const inProgress = new Set(['pending', 'awaiting_payment', 'payment_submitted']);
    return [...matches].sort((a, b) => {
      const aPending = inProgress.has(a.requestStatus) ? 0 : 1;
      const bPending = inProgress.has(b.requestStatus) ? 0 : 1;
      return aPending - bPending;
    });
  }, [reporters, query]);

  return (
    <ScreenContainer>
      <View style={styles.headerArea}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Reporters</Text>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search reporters" />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/(admin)/reporter/${item.id}`)}>
            <Card style={styles.row}>
              <Avatar uri={item.photo || item.avatar} name={item.name} size={52} online={item.isActive} />
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.isVerified ? (
                    <Icon name="checkmark-circle" size={15} color={theme.colors.primary} />
                  ) : null}
                </View>
                <Text style={[styles.city, { color: theme.colors.textMuted }]}>{item.city}</Text>
                <View style={styles.metaRow}>
                  {item.requestStatus === 'pending' ? (
                    <Badge label="Pending Approval" tone="warning" size="sm" />
                  ) : item.requestStatus === 'awaiting_payment' ? (
                    <Badge label={`Awaiting Payment ₹${item.joinFeeAmount}`} tone="warning" size="sm" />
                  ) : item.requestStatus === 'payment_submitted' ? (
                    <Badge label="Payment Submitted" tone="info" size="sm" />
                  ) : item.requestStatus === 'rejected' ? (
                    <Badge label="Rejected" tone="danger" size="sm" />
                  ) : (
                    <>
                      <Badge
                        label={`${articles.filter((article) => getReporter(article.reporterId)?.id === item.id).length} articles`}
                        tone="neutral"
                        size="sm"
                      />
                      <Badge label={`★ ${item.rating}`} tone="warning" size="sm" />
                    </>
                  )}
                </View>
              </View>
              <Icon name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </Card>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <EmptyState icon="people-outline" title="No reporters found" message="Try a different search term." />
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerArea: {
    paddingHorizontal: 20,
    gap: 14,
    paddingTop: 4,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontSize: 14.5,
    fontWeight: '700',
    flexShrink: 1,
  },
  city: {
    fontSize: 12,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
});
