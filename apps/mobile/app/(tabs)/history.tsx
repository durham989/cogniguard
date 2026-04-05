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
} from 'react-native';
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
  if (score >= 70) return '#30d158';
  if (score >= 40) return '#ffd60a';
  return '#ff453a';
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

export default function HistoryScreen() {
  const { token } = useAuthStore();
  const { setConversationId, loadMessages, reset } = useConversationStore();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [exercises, setExercises] = useState<ExerciseSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!token) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const [convs, exs] = await Promise.all([
        api.conversations.list(token),
        api.exercises.history(token) as Promise<ExerciseSession[]>,
      ]);
      setConversations(convs);
      setExercises(exs);
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
  }, [token, reset, setConversationId, loadMessages]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#6c63ff" /></View>;
  }

  if (error) {
    return <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>;
  }

  type RowItem =
    | { kind: 'conv'; data: ConversationSummary }
    | { kind: 'ex'; data: ExerciseSession };

  const sections: Array<{ title: string; data: RowItem[] }> = [
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
      keyExtractor={(item) => item.data.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#6c63ff" />
      }
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionHeader}>{section.title}</Text>
      )}
      renderItem={({ item }) =>
        item.kind === 'conv'
          ? <ConversationCard item={item.data} onResume={resumeConversation} />
          : <ExerciseCard session={item.data} />
      }
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
  list: { flex: 1, backgroundColor: '#1a1a2e' },
  listContent: { flexGrow: 1, padding: 16, gap: 8 },
  sectionHeader: {
    color: '#8e8e93',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 6,
  },
  card: {
    backgroundColor: '#1e1e3a',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardLeft: { flex: 1, gap: 3 },
  cardRight: { alignItems: 'flex-end' },
  convName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  domain: { color: '#fff', fontSize: 15, fontWeight: '600' },
  date: { color: '#8e8e93', fontSize: 12 },
  difficulty: { color: '#555577', fontSize: 12 },
  resumeLabel: { color: '#6c63ff', fontSize: 13, fontWeight: '500', marginLeft: 8 },
  score: { fontSize: 28, fontWeight: '700' },
  scoreLabel: { color: '#8e8e93', fontSize: 11 },
  incomplete: { color: '#555577', fontSize: 13 },
  center: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptySubtitle: { color: '#8e8e93', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  errorText: { color: '#ff453a', fontSize: 14, textAlign: 'center' },
});
