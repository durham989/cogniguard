import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

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

function SessionCard({ session }: { session: ExerciseSession }) {
  const date = new Date(session.startedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const completed = session.completedAt && session.normalizedScore !== null;

  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <Text style={styles.domain}>{DOMAIN_LABELS[session.domain] ?? session.domain}</Text>
        <Text style={styles.date}>{date}</Text>
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
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async (isRefresh = false) => {
    if (!token) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const data = await api.exercises.history(token);
      setSessions(data as ExerciseSession[]);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6c63ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={sessions}
      keyExtractor={(s) => s.id}
      style={styles.list}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadHistory(true)}
          tintColor="#6c63ff"
        />
      }
      renderItem={({ item }) => <SessionCard session={item} />}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No exercises yet</Text>
          <Text style={styles.emptySubtitle}>
            Complete exercises in your conversation with Cora to see your progress here.
          </Text>
        </View>
      }
      ListHeaderComponent={
        sessions.length > 0 ? (
          <Text style={styles.heading}>{sessions.length} sessions</Text>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  listContent: {
    flexGrow: 1,
    padding: 16,
    gap: 10,
  },
  heading: {
    color: '#8e8e93',
    fontSize: 13,
    marginBottom: 4,
  },
  card: {
    backgroundColor: '#1e1e3a',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    gap: 3,
  },
  domain: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  date: {
    color: '#8e8e93',
    fontSize: 12,
  },
  difficulty: {
    color: '#555577',
    fontSize: 12,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: 28,
    fontWeight: '700',
  },
  scoreLabel: {
    color: '#8e8e93',
    fontSize: 11,
  },
  incomplete: {
    color: '#555577',
    fontSize: 13,
  },
  center: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#8e8e93',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    color: '#ff453a',
    fontSize: 14,
    textAlign: 'center',
  },
});
