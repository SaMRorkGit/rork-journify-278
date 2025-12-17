import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { generateText } from '@rork-ai/toolkit-sdk';
import { Sparkles, ArrowLeft, ArrowRight, Check, Edit3 } from 'lucide-react-native';
import Colors from '../constants/colors';
import { useAppState } from '../contexts/AppStateContext';
import type { VisionGuideResponse } from '../types';

interface VisionChatMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
  variant?: 'intro' | 'question' | 'feedback' | 'statement' | 'statement-update';
  questionId?: string;
}

interface VisionGuideQuestion {
  id: string;
  prompt: string;
}

const INTRO_MESSAGE = "Hi, I’m Jojo. Let’s take a moment to connect with what you really want for yourself. I’ll ask five short questions, and by the end, we’ll have a clear, inspiring vision that reflects who you’re becoming.";

const QUESTIONS: VisionGuideQuestion[] = [
  {
    id: 'q1',
    prompt: 'Question #1: What kind of person do you imagine yourself becoming in your everyday life?',
  },
  {
    id: 'q2',
    prompt: 'Question #2: What’s really important to you in your life right now?',
  },
  {
    id: 'q3',
    prompt: 'Question #3: Think about someone you admire. What qualities about them that you wish to develop in yourself?',
  },
  {
    id: 'q4',
    prompt: 'Question #4: What does a good, meaningful day feel and look like to you?',
  },
  {
    id: 'q5',
    prompt: 'Question #5: If fear, pressure, or expectations disappeared, what would you allow yourself to pursue?',
  },
];

const CLOSING_MESSAGE = 'Thank you for sharing all of that with me. Let me create a vision statement that captures all of this in a simple, inspiring way.';

const TypewriterText = ({ text, onComplete, textStyle }: { text: string; onComplete?: () => void; textStyle: TextStyle }) => {
  const [displayed, setDisplayed] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!text) {
      setDisplayed('');
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
      return;
    }

    completedRef.current = false;
    setDisplayed('');
    const characters = Array.from(text);
    let index = 0;

    const complete = () => {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
    };

    const tick = () => {
      index = Math.min(index + 1, characters.length);
      setDisplayed(text.slice(0, index));
      if (index >= characters.length) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        complete();
      }
    };

    tick();
    if (characters.length > 1) {
      intervalRef.current = setInterval(tick, 20);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [text, onComplete]);

  return (
    <Text style={textStyle} testID="vision-typewriter">
      {displayed}
    </Text>
  );
};

const ChatBubble = ({
  message,
  userName,
  onComplete,
  isAnimating,
}: {
  message: VisionChatMessage;
  userName: string;
  onComplete?: (id: string) => void;
  isAnimating: boolean;
}) => {
  const isAI = message.role === 'ai';
  const highlight = message.variant === 'statement' || message.variant === 'statement-update';
  const bubbleTextStyle = [styles.bubbleText, highlight ? styles.statementText : undefined];

  return (
    <View style={[styles.chatRow, isAI ? styles.alignStart : styles.alignEnd]}>
      {isAI && (
        <View style={styles.avatar}>
          <Sparkles size={16} color={Colors.text} />
        </View>
      )}
      <View style={[styles.bubble, isAI ? styles.aiBubble : styles.userBubble, highlight ? styles.statementBubble : undefined]}>
        <Text style={styles.bubbleLabel}>{isAI ? 'Jojo' : userName}</Text>
        {isAI ? (
          isAnimating ? (
            <TypewriterText
              text={message.text}
              onComplete={() => onComplete?.(message.id)}
              textStyle={bubbleTextStyle}
            />
          ) : (
            <Text style={bubbleTextStyle}>{message.text}</Text>
          )
        ) : (
          <Text style={styles.bubbleText}>{message.text}</Text>
        )}
      </View>
    </View>
  );
};

export default function VisionGuideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ name?: string }>();
  const displayName = typeof params.name === 'string' && params.name.trim().length > 0 ? params.name.trim() : 'You';
  const { state, saveVisionGuideResponse, updateVisionGuideSession } = useAppState();

  const [messages, setMessages] = useState<VisionChatMessage[]>([
    { id: 'intro', role: 'ai', text: INTRO_MESSAGE, variant: 'intro' },
  ]);
  const [showIntroActions, setShowIntroActions] = useState(false);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalStatement, setFinalStatement] = useState<string | undefined>(state.visionGuideSession?.synthesizedVision);
  const [showFinalActions, setShowFinalActions] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [isSelectingEdit, setIsSelectingEdit] = useState(false);
  const [isEditingResponse, setIsEditingResponse] = useState(false);
  const [pendingEditQuestionId, setPendingEditQuestionId] = useState<string | null>(null);
  const [currentTypingId, setCurrentTypingId] = useState<string | null>('intro');
  const [completedMessages, setCompletedMessages] = useState<Record<string, boolean>>({});

  const scrollRef = useRef<ScrollView>(null);
  const completionResolvers = useRef<Record<string, () => void>>({});

  const savedResponses = useMemo(() => state.visionGuideSession?.responses ?? [], [state.visionGuideSession?.responses]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const handleMessageComplete = useCallback((id: string) => {
    setCompletedMessages(prev => (prev[id] ? prev : { ...prev, [id]: true }));
    if (currentTypingId === id) {
      setCurrentTypingId(null);
    }
    const resolver = completionResolvers.current[id];
    if (resolver) {
      resolver();
      delete completionResolvers.current[id];
    }
  }, [currentTypingId]);

  useEffect(() => {
    completionResolvers.current.intro = () => setShowIntroActions(true);
    return () => {
      Object.values(completionResolvers.current).forEach(resolve => resolve());
      completionResolvers.current = {};
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const addAiMessage = useCallback((text: string, variant?: VisionChatMessage['variant'], questionId?: string) => {
    return new Promise<void>(resolve => {
      const id = `ai-${Date.now()}-${Math.random()}`;
      completionResolvers.current[id] = resolve;
      setCurrentTypingId(id);
      setMessages(prev => [...prev, { id, role: 'ai', text, variant, questionId }]);
    });
  }, []);

  const addUserMessage = useCallback((text: string, questionId?: string) => {
    const id = `user-${Date.now()}-${Math.random()}`;
    setMessages(prev => [...prev, { id, role: 'user', text, questionId }]);
  }, []);

  const supportiveFeedback = useCallback(async (question: VisionGuideQuestion, answer: string, nextPrompt?: string) => {
    try {
      const response = await generateText({
        messages: [
          {
            role: 'user',
            content: [
              'You are Jojo — a warm, supportive guide.',
              'Keep every reply short, gentle, and encouraging (1 sentence max).',
              'Tone: calm, light, friendly. No advice, analysis, or judgment.',
              'After each user message: 1) Reflect it briefly, 2) Validate it warmly, 3) Then present the next question.',
              'Structure your reply as:\n1) One short sentence (max ~18 words) that reflects and validates their response, referencing their words.\n2) If a next question prompt is provided, add two line breaks and repeat it verbatim. If there is no next question, do not add anything else.',
              'Template inspiration:',
              '• “Got it — that sounds really meaningful.”',
              '• “Thanks for sharing that, I hear you.”',
              '• “That’s a lovely insight.”',
              `Question just answered: "${question.prompt}"`,
              `User answer: "${answer}"`,
              `Next question prompt (use only if not "none"): ${nextPrompt ?? 'none'}`,
            ].join('\n'),
          },
        ],
      });
      return response.trim();
    } catch (error) {
      console.error('[VisionGuide] Supportive feedback failed', error);
      if (nextPrompt) {
        return `That's inspiring!\n\n${nextPrompt}`;
      }
      return "That's inspiring!";
    }
  }, []);

  const buildVisionStatement = useCallback(async (responses: VisionGuideResponse[]) => {
    try {
      const formattedAnswers = responses
        .map((entry, index) => `Q${index + 1}: ${entry.question}\nAnswer: ${entry.answer}`)
        .join('\n\n');

      const prompt = `You are Journify’s Vision Generator. Create a 2-4 sentence personal vision statement that is specific, gentle, and empowering. Focus on who they are becoming and the life they want. Use their own language when possible. Avoid clichés and commands. Answers:\n${formattedAnswers}`;

      const result = await generateText({
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      return result.trim();
    } catch (error) {
      console.error('[VisionGuide] Vision synthesis failed', error);
      return 'I see you becoming someone grounded, values-led, and alive in your days—building a life that feels meaningful, spacious, and true to you.';
    }
  }, []);

  const presentQuestion = useCallback(async (index: number) => {
    const question = QUESTIONS[index];
    setActiveQuestionIndex(index);
    setPendingEditQuestionId(null);
    setIsAwaitingResponse(false);
    await addAiMessage(question.prompt, 'question', question.id);
    setIsAwaitingResponse(true);
  }, [addAiMessage]);

  const synthesizeVision = useCallback(async (responsesOverride?: VisionGuideResponse[]) => {
    const pool = responsesOverride ?? savedResponses;
    const orderedResponses = QUESTIONS.map(q => pool.find(r => r.id === q.id)).filter(Boolean) as VisionGuideResponse[];
    if (orderedResponses.length < QUESTIONS.length) {
      return;
    }
    setIsProcessing(true);
    try {
      const visionText = await buildVisionStatement(orderedResponses);
      const variant: VisionChatMessage['variant'] = finalStatement ? 'statement-update' : 'statement';
      updateVisionGuideSession({ synthesizedVision: visionText });
      setFinalStatement(visionText);
      await addAiMessage(visionText, variant);
      setShowFinalActions(true);
    } finally {
      setIsProcessing(false);
    }
  }, [addAiMessage, buildVisionStatement, savedResponses, updateVisionGuideSession, finalStatement]);

  const handleSubmit = useCallback(async () => {
    if (!isAwaitingResponse || isProcessing) {
      return;
    }
    const activeId = pendingEditQuestionId ?? (activeQuestionIndex !== null ? QUESTIONS[activeQuestionIndex].id : null);
    if (!activeId) {
      return;
    }
    const question = QUESTIONS.find(q => q.id === activeId);
    if (!question) {
      return;
    }
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setErrorText('Please share a few words before sending.');
      return;
    }
    setErrorText('');
    setInputValue('');
    setIsAwaitingResponse(false);
    setIsProcessing(true);
    addUserMessage(trimmed, question.id);

    const timestamp = new Date().toISOString();
    const baseResponse: VisionGuideResponse = {
      id: question.id,
      question: question.prompt,
      answer: trimmed,
      updatedAt: timestamp,
    };

    const nextQuestionIndex = !isEditingResponse && activeQuestionIndex !== null ? activeQuestionIndex + 1 : null;
    const nextQuestion =
      nextQuestionIndex !== null && nextQuestionIndex < QUESTIONS.length ? QUESTIONS[nextQuestionIndex] : undefined;

    const feedback = await supportiveFeedback(question, trimmed, nextQuestion?.prompt);

    const enrichedResponse: VisionGuideResponse = {
      ...baseResponse,
      feedback,
      updatedAt: new Date().toISOString(),
    };

    saveVisionGuideResponse(enrichedResponse);

    const updatedResponses = [...savedResponses.filter(r => r.id !== question.id), enrichedResponse];

    await addAiMessage(feedback, 'feedback', question.id);
    setIsProcessing(false);

    if (isEditingResponse) {
      setIsEditingResponse(false);
      await synthesizeVision(updatedResponses);
      return;
    }

    if (nextQuestion && nextQuestionIndex !== null) {
      setActiveQuestionIndex(nextQuestionIndex);
      setIsAwaitingResponse(true);
      return;
    }

    await addAiMessage(CLOSING_MESSAGE, 'feedback');
    await synthesizeVision(updatedResponses);
  }, [
    activeQuestionIndex,
    addAiMessage,
    addUserMessage,
    inputValue,
    isAwaitingResponse,
    isProcessing,
    pendingEditQuestionId,
    saveVisionGuideResponse,
    supportiveFeedback,
    synthesizeVision,
    setInputValue,
    isEditingResponse,
    savedResponses,
  ]);

  const handleStart = useCallback(async () => {
    console.log('[VisionGuide] Conversation started');
    setShowIntroActions(false);
    await presentQuestion(0);
  }, [presentQuestion]);

  const handleMaybeLater = useCallback(() => {
    console.log('[VisionGuide] Maybe later tapped');
    router.replace('/(tabs)/today');
  }, [router]);

  const handleAcceptVision = useCallback(() => {
    if (!finalStatement) return;
    console.log('[VisionGuide] Vision accepted');
    setShowFinalActions(false);
    updateVisionGuideSession({ synthesizedVision: finalStatement, pendingVision: finalStatement });
    router.back();
  }, [finalStatement, updateVisionGuideSession, router]);

  const handleChangeResponses = useCallback(() => {
    setShowFinalActions(false);
    setIsSelectingEdit(true);
  }, []);

  const handleSelectQuestionToEdit = useCallback(async (questionId: string) => {
    const index = QUESTIONS.findIndex(q => q.id === questionId);
    if (index === -1) {
      setIsSelectingEdit(false);
      return;
    }
    const existing = savedResponses.find(r => r.id === questionId);
    setInputValue(existing?.answer ?? '');
    setIsSelectingEdit(false);
    setIsEditingResponse(true);
    setPendingEditQuestionId(questionId);
    setActiveQuestionIndex(index);
    setIsAwaitingResponse(false);
    await addAiMessage('Let’s revisit this together: ' + QUESTIONS[index].prompt, 'question', questionId);
    setIsAwaitingResponse(true);
  }, [addAiMessage, savedResponses]);

  const composerDisabled = !isAwaitingResponse || isProcessing;

  const inputAccessory = errorText ? (
    <Text style={styles.errorText} testID="vision-guide-error">{errorText}</Text>
  ) : null;

  return (
    <LinearGradient colors={[Colors.bgMid, Colors.bgDeep]} style={styles.gradient}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.wrapper, { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 20) }]}> 
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.navButton} onPress={() => router.back()} testID="vision-guide-back">
            <ArrowLeft size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vision Statement Guide</Text>
          <View style={styles.navButton} />
        </View>

        <ScrollView ref={scrollRef} style={styles.chatWindow} contentContainerStyle={styles.chatContent} showsVerticalScrollIndicator={false} testID="vision-guide-scroll">
          {messages.map(message => {
            const isAnimating = message.role === 'ai' && currentTypingId === message.id && !completedMessages[message.id];
            return (
              <ChatBubble
                key={message.id}
                message={message}
                userName={displayName}
                onComplete={handleMessageComplete}
                isAnimating={isAnimating}
              />
            );
          })}
        </ScrollView>

        {showIntroActions && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.ctaButton, styles.primaryCta]} onPress={handleStart} testID="vision-guide-start">
              <Text style={styles.ctaText}>Let&apos;s do this</Text>
              <ArrowRight size={16} color={Colors.bgDeep} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.ctaButton, styles.secondaryCta]} onPress={handleMaybeLater} testID="vision-guide-later">
              <Text style={styles.secondaryText}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        )}

        {finalStatement && showFinalActions && !showIntroActions && (
          <View style={styles.finalActions} testID="vision-guide-final-actions">
            <Text style={styles.finalLabel}>Does this feel like you?</Text>
            <View style={styles.finalButtons}>
              <TouchableOpacity style={[styles.finalButton, styles.confirmButton]} onPress={handleAcceptVision} testID="vision-guide-accept">
                <Check size={18} color={Colors.bgDeep} />
                <Text style={styles.finalButtonText}>Looks right</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.finalButton, styles.editButton]} onPress={handleChangeResponses} testID="vision-guide-edit">
                <Edit3 size={18} color={Colors.text} />
                <Text style={styles.editButtonText}>Change my responses</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.composer}>
          {inputAccessory}
          <View style={[styles.inputShell, composerDisabled && styles.disabledInput]}>
            <TextInput
              style={styles.input}
              value={inputValue}
              onChangeText={setInputValue}
              editable={!composerDisabled}
              placeholder={isAwaitingResponse ? 'Share your thoughts…' : 'Waiting for Jojo…'}
              placeholderTextColor={Colors.textSoft}
              multiline
              testID="vision-guide-input"
            />
            <TouchableOpacity
              style={[styles.sendButton, composerDisabled && styles.sendDisabled]}
              onPress={handleSubmit}
              disabled={composerDisabled}
              testID="vision-guide-send"
            >
              {isProcessing ? (
                <ActivityIndicator color={Colors.bgDeep} />
              ) : (
                <ArrowRight size={18} color={Colors.bgDeep} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {isSelectingEdit && (
          <View style={styles.overlay}>
            <View style={styles.overlayCard} testID="vision-guide-edit-overlay">
              <Text style={styles.overlayTitle}>Which response would you like to adjust?</Text>
              <ScrollView style={styles.overlayList} showsVerticalScrollIndicator={false}>
                {QUESTIONS.map(question => {
                  const existing = savedResponses.find(r => r.id === question.id);
                  return (
                    <TouchableOpacity key={question.id} style={styles.overlayItem} onPress={() => handleSelectQuestionToEdit(question.id)}>
                      <Text style={styles.overlayQuestion}>{question.prompt}</Text>
                      <Text style={styles.overlayAnswer}>{existing?.answer || 'No response yet'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity
                style={styles.overlayCancel}
                onPress={() => {
                  setIsSelectingEdit(false);
                  if (finalStatement) {
                    setShowFinalActions(true);
                  }
                }}
              >
                <Text style={styles.overlayCancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    gap: 12,
  },
  heroBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.mint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  chatWindow: {
    flex: 1,
    borderRadius: 28,
    backgroundColor: '#04131A',
  },
  chatContent: {
    padding: 20,
    gap: 12,
  },
  chatRow: {
    flexDirection: 'row',
    gap: 12,
  },
  alignStart: {
    justifyContent: 'flex-start',
  },
  alignEnd: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  bubble: {
    maxWidth: '78%',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  aiBubble: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderTopLeftRadius: 6,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    borderTopRightRadius: 6,
  },
  statementBubble: {
    borderColor: Colors.mint,
    backgroundColor: '#0D2C2D',
  },
  bubbleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text,
  },
  statementText: {
    color: Colors.mint,
    fontSize: 16,
    lineHeight: 24,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  ctaButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryCta: {
    backgroundColor: Colors.mint,
  },
  secondaryCta: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ctaText: {
    color: Colors.bgDeep,
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryText: {
    color: Colors.text,
    fontSize: 15,
  },
  composer: {
    gap: 8,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    backgroundColor: '#041920',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  disabledInput: {
    opacity: 0.4,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    maxHeight: 120,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.mint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendDisabled: {
    opacity: 0.5,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    marginLeft: 8,
  },
  finalActions: {
    backgroundColor: '#041920',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  finalLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  finalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  finalButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButton: {
    backgroundColor: Colors.mint,
  },
  finalButtonText: {
    color: Colors.bgDeep,
    fontSize: 15,
    fontWeight: '600',
  },
  editButton: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editButtonText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(3,8,18,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlayCard: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: Colors.surface,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  overlayTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  overlayList: {
    maxHeight: 320,
  },
  overlayItem: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#05222B',
    marginBottom: 10,
  },
  overlayQuestion: {
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 6,
  },
  overlayAnswer: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  overlayCancel: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  overlayCancelText: {
    color: Colors.text,
    fontSize: 14,
  },
});
