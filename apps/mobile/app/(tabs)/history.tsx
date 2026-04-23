import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  SectionList,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { useConversationStore } from '@/store/conversation.store';
import { api } from '@/lib/api';

interface ConversationSummary {
  id: string;
  name: string | null;
  state: string;
  startedAt: string;
}

interface ExerciseSession {
  id: string;
  exerciseId: string;
  domain: string;
  difficulty: number;
  normalizedScore: number | null;
  rawScore: number | null;
  startedAt: string;
  completedAt: string | null;
}

const DOMAIN_LABELS: Record<string, string> = {
  memory: 'Memory',
  attention: 'Attention',
  processing_speed: 'Processing Speed',
  executive_function: 'Executive Function',
  language: 'Language',
  visuospatial: 'Visuospatial',
};

function scoreColor(score: number) {
  if (score >= 70) return '#7a9e7a';
  if (score >= 40) return '#c8a84a';
  return '#b05848';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function ConversationCard({
  item,
  onResume,
}: {
  item: ConversationSummary;
  onResume: (id: string) => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onResume(item.id)}>
      <View style={styles.cardLeft}>
        <Text style={styles.convName} numberOfLines={1}>
          {item.name ?? 'Untitled conversation'}
        </Text>
        <Text style={styles.date}>{formatDate(item.startedAt)}</Text>
      </View>
      <Text style={styles.resumeLabel}>Resume →</Text>
    </TouchableOpacity>
  );
}

function ExerciseCard({ session }: { session: ExerciseSession }) {
  const completed = session.completedAt && session.normalizedScore !== null;
  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <Text style={styles.domain}>{DOMAIN_LABELS[session.domain] ?? session.domain}</Text>
        <Text style={styles.date}>{formatDate(session.startedAt)}</Text>
        <Text style={styles.difficulty}>Difficulty {session.difficulty}/5</Text>
      </View>
      <View style={styles.cardRight}>
        {completed ? (
          <>
            <Text style={[styles.score, { color: scoreColor(session.normalizedScore!) }]}>
              {session.normalizedScore}
            </Text>
            <Text style={styles.scoreLabel}>/ 100</Text>
          </>
        ) : (
          <Text style={styles.incomplete}>Incomplete</Text>
        )}
      </View>
    </View>
  );
}

const BADGE_COLORS: Record<string, string> = {
  platinum: '#d8d0c0',
  gold: '#c8a84a',
  silver: '#a0a090',
  bronze: '#c4805a',
  none: '#2e2b20',
};

const BADGE_LABELS: Record<string, string> = {
  platinum: 'Platinum',
  gold: 'Gold',
  silver: 'Silver',
  bronze: 'Bronze',
  none: 'Locked',
};

const DOMAINS_ORDER = ['memory', 'attention', 'processing_speed', 'executive_function', 'language', 'visuospatial'];

function DomainBadges({ domainBadges }: { domainBadges: Record<string, 'none' | 'bronze' | 'silver' | 'gold' | 'platinum'> }) {
  return (
    <View style={styles.badgesContainer}>
      <Text style={styles.badgesTitle}>Domain Badges</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesScroll}>
        {DOMAINS_ORDER.map(domain => {
          const tier = domainBadges[domain] ?? 'none';
          const color = BADGE_COLORS[tier];
          const locked = tier === 'none';
          return (
            <View key={domain} style={[styles.badgeCard, locked && styles.badgeCardLocked]}>
              <View style={[styles.badgeDot, { backgroundColor: color }]} />
              <Text style={[styles.badgeDomain, locked && styles.badgeDomainLocked]} numberOfLines={1}>
                {DOMAIN_LABELS[domain]?.split(' ')[0] ?? domain}
              </Text>
              <Text style={[styles.badgeTier, { color }]}>{BADGE_LABELS[tier]}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function StatsCard({
  sessions,
  streak,
  level,
  levelLabel,
  nextLevelAt,
}: {
  sessions: ExerciseSession[];
  streak: number;
  level: number;
  levelLabel: string;
  nextLevelAt: number | null;
}) {
  const completed = sessions.filter(s => s.completedAt && s.normalizedScore !== null);
  const avg = completed.length > 0
    ? Math.round(completed.reduce((sum, s) => sum + (s.normalizedScore ?? 0), 0) / completed.length)
    : null;

  const nextLevelProgress = nextLevelAt
    ? Math.min(1, completed.length / nextLevelAt)
    : 1;

  return (
    <View style={styles.statsCard}>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, streak > 0 && { color: '#ff9f0a' }]}>
            {streak}
          </Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{completed.length}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{avg !== null ? `${avg}%` : '—'}</Text>
          <Text style={styles.statLabel}>Avg Score</Text>
        </View>
      </View>
      <View style={styles.levelRow}>
        <View style={styles.levelTextRow}>
          <Text style={styles.levelTitleText}>Level {level} · {levelLabel}</Text>
          {nextLevelAt && (
            <Text style={styles.levelSubtext}>{completed.length}/{nextLevelAt}</Text>
          )}
        </View>
        <View style={styles.levelTrack}>
          <View style={[styles.levelFill, { width: `${Math.round(nextLevelProgress * 100)}%` }]} />
        </View>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { setConversationId, loadMessages, reset } = useConversationStore();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [exercises, setExercises] = useState<ExerciseSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    streak: number;
    level: number;
    levelLabel: string;
    nextLevelAt: number | null;
    domainBadges: Record<string, 'none' | 'bronze' | 'silver' | 'gold' | 'platinum'>;
  } | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!token) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const [convsResult, exsResult, statsResult] = await Promise.allSettled([
        api.conversations.list(token),
        api.exercises.history(token) as Promise<ExerciseSession[]>,
        api.exercises.stats(token),
      ]);
      if (convsResult.status === 'fulfilled') setConversations(convsResult.value);
      if (exsResult.status === 'fulfilled') setExercises(exsResult.value);
      if (statsResult.status === 'fulfilled') setStats(statsResult.value);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const resumeConversation = useCallback(async (id: string) => {
    if (!token) return;
    reset();
    setConversationId(id);
    const msgs = await api.conversations.messages(id, token).catch(() => []);
    loadMessages(msgs.filter(m => m.role === 'user' || m.role === 'assistant'));
    router.navigate('/(tabs)/index' as any);
  }, [token, reset, setConversationId, loadMessages, router]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#c4805a" /></View>;
  }

  if (error) {
    return <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>;
  }

  type RowItem =
    | { kind: 'stats' }
    | { kind: 'badges' }
    | { kind: 'conv'; data: ConversationSummary }
    | { kind: 'ex'; data: ExerciseSession };

  const sections: Array<{ title: string; data: RowItem[] }> = [
    { title: '', data: [{ kind: 'stats' as const }, { kind: 'badges' as const }] },
    ...(conversations.length > 0
      ? [{ title: `Conversations (${conversations.length})`, data: conversations.map(d => ({ kind: 'conv' as const, data: d })) }]
      : []),
    ...(exercises.length > 0
      ? [{ title: `Exercises (${exercises.length})`, data: exercises.map(d => ({ kind: 'ex' as const, data: d })) }]
      : []),
  ];

  return (
    <SectionList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      sections={sections}
      keyExtractor={(item, index) =>
        item.kind === 'stats' ? 'stats' :
        item.kind === 'badges' ? 'badges' :
        item.data.id
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#c4805a" />
      }
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionHeader}>{section.title}</Text>
      )}
      renderItem={({ item }) => {
        if (item.kind === 'stats') {
          return (
            <StatsCard
              sessions={exercises}
              streak={stats?.streak ?? 0}
              level={stats?.level ?? 1}
              levelLabel={stats?.levelLabel ?? 'Beginner'}
              nextLevelAt={stats?.nextLevelAt ?? 10}
            />
          );
        }
        if (item.kind === 'badges') {
          return <DomainBadges domainBadges={stats?.domainBadges ?? {}} />;
        }
        return item.kind === 'conv'
          ? <ConversationCard item={item.data} onResume={resumeConversation} />
          : <ExerciseCard session={item.data} />;
      }}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Nothing yet</Text>
          <Text style={styles.emptySubtitle}>
            Start a conversation with Pierre and complete exercises to see your history here.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#1d1b14' },
  listContent: { flexGrow: 1, padding: 16, gap: 8 },
  sectionHeader: {
    color: '#9a9080',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 6,
  },
  card: {
    backgroundColor: '#252219',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardLeft: { flex: 1, gap: 3 },
  cardRight: { alignItems: 'flex-end' },
  convName: { color: '#ede5d0', fontSize: 15, fontWeight: '600' },
  domain: { color: '#ede5d0', fontSize: 15, fontWeight: '600' },
  date: { color: '#9a9080', fontSize: 12 },
  difficulty: { color: '#5c5548', fontSize: 12 },
  resumeLabel: { color: '#c4805a', fontSize: 13, fontWeight: '500', marginLeft: 8 },
  score: { fontSize: 28, fontWeight: '700' },
  scoreLabel: { color: '#9a9080', fontSize: 11 },
  incomplete: { color: '#5c5548', fontSize: 13 },
  center: {
    flex: 1,
    backgroundColor: '#1d1b14',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: { color: '#ede5d0', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptySubtitle: { color: '#9a9080', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  errorText: { color: '#b05848', fontSize: 14, textAlign: 'center' },
  statsCard: {
    backgroundColor: '#252219',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { color: '#ede5d0', fontSize: 24, fontWeight: '700' },
  statLabel: { color: '#9a9080', fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: '#2e2b20' },
  levelRow: { gap: 6 },
  levelTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelTitleText: { color: '#ede5d0', fontSize: 13, fontWeight: '600' },
  levelSubtext: { color: '#9a9080', fontSize: 12 },
  levelTrack: {
    height: 6, backgroundColor: '#2e2b20', borderRadius: 3, overflow: 'hidden',
  },
  levelFill: {
    height: 6, backgroundColor: '#c4805a', borderRadius: 3,
  },
  badgesContainer: { marginBottom: 16 },
  badgesTitle: {
    color: '#9a9080', fontSize: 12, fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 10,
  },
  badgesScroll: { gap: 8, paddingRight: 4 },
  badgeCard: {
    backgroundColor: '#252219', borderRadius: 12, padding: 12,
    alignItems: 'center', width: 80, gap: 6,
  },
  badgeCardLocked: { opacity: 0.4 },
  badgeDot: { width: 24, height: 24, borderRadius: 12 },
  badgeDomain: { color: '#ede5d0', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  badgeDomainLocked: { color: '#5c5548' },
  badgeTier: { fontSize: 10, fontWeight: '500' },
});
