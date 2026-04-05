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
import { useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth.store';
import { useConversationStore } from '@/store/conversation.store';
import { api } from '@/lib/api';
import { streamMessage } from '@/lib/sse';
import { MessageBubble } from '@/components/MessageBubble';
import { ExerciseResultBanner } from '@/components/ExerciseResultBanner';
import type { ChatMessage } from '@/store/conversation.store';

// Sent silently on conversation open — not shown as a user bubble.
// Prompts Pierre to greet the user naturally.
const GREETING_PROMPT =
  'Hello! Please greet me warmly and briefly introduce yourself. ' +
  'Ask one simple question to get to know me.';

export default function TrainScreen() {
  const navigation = useNavigation();
  const { token } = useAuthStore();
  const {
    conversationId,
    messages,
    isStreaming,
    streamingContent,
    pendingExerciseResult,
    activeExercise,
    setConversationId,
    loadMessages,
    addUserMessage,
    startStreaming,
    appendStreamChunk,
    finalizeStreamingMessage,
    setExerciseResult,
    setActiveExercise,
    dismissExerciseResult,
    reset,
  } = useConversationStore();

  const [inputText, setInputText] = useState('');
  const [initializing, setInitializing] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flatListRef = useRef<FlatList<any>>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sendStartRef = useRef<number>(0);

  // On mount: resume the latest active conversation, or create a new one.
  // Then fetch the next exercise so Pierre knows what to deliver.
  useEffect(() => {
    if (!token || conversationId) return;
    setInitializing(true);

    api.conversations.latest(token)
      .then(async (latest) => {
        let convId: string;
        if (latest) {
          convId = latest.id;
          setConversationId(convId);
          const msgs = await api.conversations.messages(convId, token);
          loadMessages(msgs.filter((m) => m.role === 'user' || m.role === 'assistant'));
        } else {
          const { id } = await api.conversations.create(token);
          convId = id;
          setConversationId(convId);
          startStreaming();
          abortRef.current = streamMessage(convId, GREETING_PROMPT, token, {
            onDelta: appendStreamChunk,
            onComplete: () => finalizeStreamingMessage(),
            onExerciseResult: setExerciseResult,
            onError: () => finalizeStreamingMessage(),
          });
        }

        // Queue next exercise for Pierre to deliver naturally in conversation
        api.exercises.next(token)
          .then(({ exercise, sessionId }) => {
            setActiveExercise({
              sessionId,
              domain: exercise.domain,
              fragment: exercise.systemPromptFragment,
            });
          })
          .catch(() => {
            // Non-fatal — conversation works without exercise context
          });
      })
      .catch((err) => Alert.alert('Error', err.message ?? 'Could not start session'))
      .finally(() => setInitializing(false));
  }, [token, conversationId]);

  // Scroll to bottom on new content
  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, streamingContent]);

  const sendMessage = useCallback(() => {
    const content = inputText.trim();
    if (!content || !token || !conversationId || isStreaming) return;

    setInputText('');
    addUserMessage(content);
    startStreaming();
    sendStartRef.current = Date.now();

    abortRef.current = streamMessage(conversationId, content, token, {
      onDelta: appendStreamChunk,
      onComplete: () => finalizeStreamingMessage(),
      onExerciseResult: (result) => {
        setExerciseResult(result);
        // Submit score to exercise service and queue next exercise
        if (activeExercise && conversationId) {
          api.exercises
            .submit(activeExercise.sessionId, token, {
              conversationId,
              userResponse: content,
              durationSeconds: Math.round((Date.now() - sendStartRef.current) / 1000),
              scorePayload: {
                rawScore: result.rawScore,
                normalizedScore: result.normalizedScore,
                feedback: result.feedback,
              },
            })
            .then(() => {
              setActiveExercise(null);
              // Queue next exercise for the next round
              return api.exercises.next(token);
            })
            .then(({ exercise, sessionId }) => {
              setActiveExercise({
                sessionId,
                domain: exercise.domain,
                fragment: exercise.systemPromptFragment,
              });
            })
            .catch(() => {
              // Non-fatal
            });
        }
      },
      onError: (err) => {
        finalizeStreamingMessage();
        Alert.alert('Error', err.message);
      },
    }, activeExercise ?? undefined);
  }, [inputText, token, conversationId, isStreaming]);

  const startNewConversation = useCallback(() => {
    abortRef.current?.abort();
    reset();
    // reset() clears conversationId → triggers the mount effect to create a new one
  }, [reset]);

  // Wire up header button
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            Alert.alert('New conversation', 'Start a fresh conversation with Pierre?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Start fresh', onPress: startNewConversation },
            ]);
          }}
          style={{ marginRight: 16 }}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Ionicons name="create-outline" size={22} color="#6c63ff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, startNewConversation]);

  // Cleanup on unmount
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
          placeholder="Message Pierre…"
          placeholderTextColor="#555577"
          multiline
          autoCorrect
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
  },
  messageList: {
    paddingVertical: 12,
    flexGrow: 1,
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
