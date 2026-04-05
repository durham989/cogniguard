import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Text,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth.store';
import { useConversationStore } from '@/store/conversation.store';
import { api } from '@/lib/api';
import { streamMessage } from '@/lib/sse';
import { MessageBubble } from '@/components/MessageBubble';
import { ExerciseResultBanner } from '@/components/ExerciseResultBanner';
import type { ChatMessage } from '@/store/conversation.store';

export default function TrainScreen() {
  const { token } = useAuthStore();
  const {
    conversationId,
    messages,
    isStreaming,
    streamingContent,
    pendingExerciseResult,
    setConversationId,
    addUserMessage,
    startStreaming,
    appendStreamChunk,
    finalizeStreamingMessage,
    dismissExerciseResult,
  } = useConversationStore();

  const [inputText, setInputText] = useState('');
  const [initializing, setInitializing] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flatListRef = useRef<FlatList<any>>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Create conversation on mount if none exists
  useEffect(() => {
    if (!token || conversationId) return;
    setInitializing(true);
    api.conversations
      .create(token)
      .then(({ id }) => setConversationId(id))
      .catch((err) => Alert.alert('Error', err.message ?? 'Could not start session'))
      .finally(() => setInitializing(false));
  }, [token, conversationId]);

  // Scroll to bottom when messages change or streaming content grows
  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, streamingContent]);

  const sendMessage = useCallback(() => {
    const content = inputText.trim();
    if (!content || !token || !conversationId || isStreaming) return;

    setInputText('');
    addUserMessage(content);
    startStreaming();

    abortRef.current = streamMessage(conversationId, content, token, {
      onDelta: appendStreamChunk,
      onComplete: () => {
        // finalizeStreamingMessage called via onExerciseResult or at stream end
      },
      onExerciseResult: (result) => {
        finalizeStreamingMessage(result);
      },
      onError: (err) => {
        finalizeStreamingMessage();
        Alert.alert('Stream error', err.message);
      },
    });

    // Finalize if stream closes without exercise.result event
    // (handled by onComplete + checking if still streaming)
  }, [inputText, token, conversationId, isStreaming]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const allItems: (ChatMessage | { id: string; role: 'streaming' })[] = [
    ...messages,
    ...(isStreaming ? [{ id: 'streaming', role: 'streaming' as const }] : []),
  ];

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6c63ff" />
        <Text style={styles.initText}>Starting session…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={88}
    >
      <FlatList
        ref={flatListRef}
        data={allItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        renderItem={({ item }) => {
          if (item.role === 'streaming') {
            return (
              <View style={styles.streamingRow}>
                <View style={styles.streamingBubble}>
                  {streamingContent ? (
                    <Text style={styles.streamingText}>{streamingContent}</Text>
                  ) : (
                    <View style={styles.typingIndicator}>
                      <ActivityIndicator size="small" color="#8e8e93" />
                    </View>
                  )}
                </View>
              </View>
            );
          }
          return <MessageBubble message={item as ChatMessage} />;
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Hello! I'm Cora.</Text>
            <Text style={styles.emptySubtitle}>
              Your cognitive wellness companion. What's on your mind today?
            </Text>
          </View>
        }
      />

      {pendingExerciseResult && (
        <ExerciseResultBanner
          result={pendingExerciseResult}
          onDismiss={dismissExerciseResult}
        />
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Message Cora…"
          placeholderTextColor="#555577"
          multiline
          returnKeyType="send"
          blurOnSubmit
          onSubmitEditing={sendMessage}
          editable={!isStreaming && !initializing}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || isStreaming) && styles.sendButtonDisabled,
          ]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isStreaming}
        >
          <Ionicons name="arrow-up" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  center: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  initText: {
    color: '#8e8e93',
    fontSize: 14,
  },
  messageList: {
    paddingVertical: 12,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
    gap: 10,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: '#8e8e93',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  streamingRow: {
    paddingHorizontal: 12,
    marginVertical: 4,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  streamingBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#1e1e3a',
  },
  streamingText: {
    fontSize: 15,
    lineHeight: 21,
    color: '#e0e0f0',
  },
  typingIndicator: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#0d0d1a',
    borderTopWidth: 1,
    borderTopColor: '#2a2a4a',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1e1e3a',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: '#fff',
    maxHeight: 120,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#6c63ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#2a2a4a',
  },
});
