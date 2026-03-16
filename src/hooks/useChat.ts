import { useState, useCallback, useEffect, useRef } from 'react';
import { ChatMessage } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { RealtimeChannel } from '@supabase/supabase-js';

const POLL_INTERVAL_MS = 5000;
const REALTIME_CONNECT_TIMEOUT_MS = 3000;
const INITIATE_CONVERSATION_FUNCTION_URL = 'https://izxbjndafoqrkjwvutax.supabase.co/functions/v1/initiate_conversation';
const CHAT_FUNCTION_URL = 'https://izxbjndafoqrkjwvutax.supabase.co/functions/v1/chat';
const SUPABASE_URL =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_SUPABASE_PUBLISHABLE_KEY;

const welcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `Γεια σου! Είμαι ο Τρακτεράς, ο AI βοηθός σου για τη γεωργία.

Πως μπορω να σε βοηθήσω?`,
  timestamp: new Date(),
};

export interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

type ConversationRow = {
  id: string;
  chat_title: string | null;
  created_at: string;
  user?: string | null;
};

type ChatRow = {
  uid: string;
  created_at: string;
  uuid?: string | null;
  message: string | null;
  message_type?: string | null;
  role: string | null;
  sessionid?: string | null;
  conversation_id: string | null;
};

const getConversationTitle = (firstMessage?: string) =>
  firstMessage
    ? firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '')
    : 'Νέα Συνομιλία';

const normalizeConversation = (conversation: ConversationRow): Conversation => ({
  id: conversation.id,
  title: conversation.chat_title || 'Νέα Συνομιλία',
  updated_at: conversation.created_at,
});

const normalizeChatMessage = (message: ChatRow): ChatMessage => ({
  id: message.uid,
  role: message.role === 'assistant' ? 'assistant' : 'user',
  content: message.message || '',
  timestamp: new Date(message.created_at),
});

const isMatchingOptimisticMessage = (existing: ChatMessage, incoming: ChatMessage) =>
  existing.id.startsWith('optimistic-') &&
  existing.role === incoming.role &&
  existing.content === incoming.content;

export function useChat() {
  const { user, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Refs for channels and polling timers so cleanup is reliable
  const messagesChannelRef = useRef<RealtimeChannel | null>(null);
  const conversationsChannelRef = useRef<RealtimeChannel | null>(null);
  const messagesPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const conversationsPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Mirrors conversationId for use inside interval callbacks without stale closure
  const conversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  // ─── Data fetchers ────────────────────────────────────────────────────────

  const loadConversations = useCallback(async (): Promise<Conversation[]> => {
    if (!isAuthenticated || !user?.id || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return [];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token ?? SUPABASE_PUBLISHABLE_KEY;
      const params = new URLSearchParams({
        select: 'id,chat_title,created_at,user',
        user: `eq.${user.id}`,
        order: 'created_at.desc',
      });
      const response = await fetch(`${SUPABASE_URL}/rest/v1/conversation?${params.toString()}`, {
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await response.json().catch(() => null) as ConversationRow[] | { message?: string } | null;

      if (!response.ok || !Array.isArray(data)) {
        console.error('Error loading conversations:', data);
        return [];
      }

      const normalized = data.map(normalizeConversation);
      setConversations(normalized);
      return normalized;
    } catch (error) {
      console.error('Error loading conversations:', error);
      return [];
    }
  }, [isAuthenticated, user?.id]);

  const fetchMessagesForConversation = useCallback(async (convId: string) => {
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return [];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token ?? SUPABASE_PUBLISHABLE_KEY;
      const params = new URLSearchParams({
        select: 'uid,message,role,message_type,created_at,conversation_id',
        conversation_id: `eq.${convId}`,
        order: 'created_at.asc',
      });
      const response = await fetch(`${SUPABASE_URL}/rest/v1/Chat?${params.toString()}`, {
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await response.json().catch(() => null) as ChatRow[] | { message?: string } | null;

      if (!response.ok || !Array.isArray(data)) {
        console.error('Error fetching messages:', data);
        return [];
      }

      setMessages([welcomeMessage, ...data.map(normalizeChatMessage)]);
      return data;
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }, []);

  // ─── Realtime: Chat for current conversation ─────────────────────────────

  useEffect(() => {
    // Tear down previous subscription and polling
    if (messagesChannelRef.current) {
      supabase.removeChannel(messagesChannelRef.current);
      messagesChannelRef.current = null;
    }
    if (messagesPollRef.current) {
      clearInterval(messagesPollRef.current);
      messagesPollRef.current = null;
    }

    if (!conversationId) return;

    let realtimeConnected = false;

    const startMessagePolling = () => {
      if (messagesPollRef.current) return;
      messagesPollRef.current = setInterval(() => {
        const id = conversationIdRef.current;
        if (id) fetchMessagesForConversation(id);
      }, POLL_INTERVAL_MS);
    };

    const channel = supabase
      .channel(`Chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Chat',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = normalizeChatMessage(payload.new as ChatRow);
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;

            const persistedMessages = prev.filter(
              (message) => message.id !== 'welcome' && !isMatchingOptimisticMessage(message, incoming)
            );

            return [
              welcomeMessage,
              ...[...persistedMessages, incoming].sort(
                (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
              ),
            ];
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          realtimeConnected = true;
          if (messagesPollRef.current) {
            clearInterval(messagesPollRef.current);
            messagesPollRef.current = null;
          }
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          realtimeConnected = false;
          startMessagePolling();
        }
      });

    messagesChannelRef.current = channel;

    // If realtime hasn't connected within the timeout, start polling as fallback
    const fallbackTimer = setTimeout(() => {
      if (!realtimeConnected) startMessagePolling();
    }, REALTIME_CONNECT_TIMEOUT_MS);

    return () => {
      clearTimeout(fallbackTimer);
      if (messagesChannelRef.current) {
        supabase.removeChannel(messagesChannelRef.current);
        messagesChannelRef.current = null;
      }
      if (messagesPollRef.current) {
        clearInterval(messagesPollRef.current);
        messagesPollRef.current = null;
      }
    };
  }, [conversationId, fetchMessagesForConversation]);

  // ─── Realtime: conversation for current user ──────────────────────────────

  useEffect(() => {
    if (conversationsChannelRef.current) {
      supabase.removeChannel(conversationsChannelRef.current);
      conversationsChannelRef.current = null;
    }
    if (conversationsPollRef.current) {
      clearInterval(conversationsPollRef.current);
      conversationsPollRef.current = null;
    }

    if (!isAuthenticated || !user?.id) return;

    let realtimeConnected = false;

    const startConversationsPolling = () => {
      if (conversationsPollRef.current) return;
      conversationsPollRef.current = setInterval(loadConversations, POLL_INTERVAL_MS);
    };

    const channel = supabase
      .channel(`conversation:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation',
          filter: `user=eq.${user.id}`,
        },
        () => {
          loadConversations();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          realtimeConnected = true;
          if (conversationsPollRef.current) {
            clearInterval(conversationsPollRef.current);
            conversationsPollRef.current = null;
          }
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          realtimeConnected = false;
          startConversationsPolling();
        }
      });

    conversationsChannelRef.current = channel;

    // Initial load
    loadConversations();

    const fallbackTimer = setTimeout(() => {
      if (!realtimeConnected) startConversationsPolling();
    }, REALTIME_CONNECT_TIMEOUT_MS);

    return () => {
      clearTimeout(fallbackTimer);
      if (conversationsChannelRef.current) {
        supabase.removeChannel(conversationsChannelRef.current);
        conversationsChannelRef.current = null;
      }
      if (conversationsPollRef.current) {
        clearInterval(conversationsPollRef.current);
        conversationsPollRef.current = null;
      }
    };
  }, [isAuthenticated, user?.id, loadConversations]);

  // ─── CRUD helpers ─────────────────────────────────────────────────────────

  const loadConversation = useCallback(async (id: string) => {
    try {
      setConversationId(id);
      await fetchMessagesForConversation(id);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  }, [fetchMessagesForConversation]);

  const createConversation = useCallback(async (assetContext?: string, firstMessage?: string): Promise<Conversation | null> => {
    if (!user || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return null;

    try {
      const title = getConversationTitle(firstMessage);
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token ?? SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(`${SUPABASE_URL}/rest/v1/conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${authToken}`,
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          chat_title: title,
          user: user.id,
        }),
      });
      const data = await response.json().catch(() => null) as ConversationRow[] | { message?: string } | null;

      if (!response.ok || !Array.isArray(data) || data.length === 0) {
        console.error('Error creating conversation:', data);
        return null;
      }

      return normalizeConversation(data[0]);
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }, [user]);

  const initiateConversation = useCallback(async (
    firstMessage: string,
    images?: string[],
  ): Promise<Conversation | null> => {
    if (!user) return null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const response = await fetch(INITIATE_CONVERSATION_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(SUPABASE_PUBLISHABLE_KEY ? { apikey: SUPABASE_PUBLISHABLE_KEY } : {}),
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          uuid: user.id,
          message: firstMessage,
          role: 'user',
          message_type: images && images.length > 0 ? 'image' : 'text',
        }),
      });

      const data = await response.json().catch(() => null) as
        | {
            id?: string;
            conversation_id?: string;
            title?: string | null;
            updated_at?: string;
            conversation?: {
              id?: string;
              conversation_id?: string;
              title?: string | null;
              updated_at?: string;
            };
            data?: {
              id?: string;
              conversation_id?: string;
              title?: string | null;
              updated_at?: string;
              conversation?: {
                id?: string;
                conversation_id?: string;
                title?: string | null;
                updated_at?: string;
              };
            };
            error?: string;
          }
        | null;

      if (!response.ok) {
        console.error('Error calling initiate_conversation:', data);
        throw new Error(data?.error || `Conversation initiation failed with status ${response.status}`);
      }

      const conversationData = data?.conversation || data?.data?.conversation;
      const id =
        data?.conversation_id ||
        data?.id ||
        conversationData?.conversation_id ||
        conversationData?.id ||
        data?.data?.conversation_id ||
        data?.data?.id;

      if (id) {
        const initiatedConversation: Conversation = {
          id,
          title:
            data?.title ||
            (data as { chat_title?: string | null } | null)?.chat_title ||
            conversationData?.title ||
            (conversationData as { chat_title?: string | null } | undefined)?.chat_title ||
            data?.data?.title ||
            getConversationTitle(firstMessage),
          updated_at:
            data?.updated_at ||
            (data as { created_at?: string } | null)?.created_at ||
            conversationData?.updated_at ||
            (conversationData as { created_at?: string } | undefined)?.created_at ||
            data?.data?.updated_at ||
            (data?.data as { created_at?: string } | undefined)?.created_at ||
            new Date().toISOString(),
        };

        setConversations((prev) => [
          initiatedConversation,
          ...prev.filter((conversation) => conversation.id !== initiatedConversation.id),
        ]);

        void loadConversations();
        return initiatedConversation;
      }

      const latestConversations = await loadConversations();
      if (latestConversations.length > 0) {
        return latestConversations[0];
      }

      return null;
    } catch (error) {
      console.error('Error initiating conversation:', error);
      return null;
    }
  }, [loadConversations, user]);

  const deleteConversation = useCallback(async (id: string) => {
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return false;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token ?? SUPABASE_PUBLISHABLE_KEY;
      const chatParams = new URLSearchParams({
        conversation_id: `eq.${id}`,
      });
      if (user?.id) {
        chatParams.set('uuid', `eq.${user.id}`);
      }

      const chatResponse = await fetch(`${SUPABASE_URL}/rest/v1/Chat?${chatParams.toString()}`, {
        method: 'DELETE',
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!chatResponse.ok) {
        const errorData = await chatResponse.text().catch(() => '');
        console.error('Error deleting conversation messages:', errorData);
        return false;
      }

      const conversationParams = new URLSearchParams({
        id: `eq.${id}`,
      });
      if (user?.id) {
        conversationParams.set('user', `eq.${user.id}`);
      }

      const conversationResponse = await fetch(`${SUPABASE_URL}/rest/v1/conversation?${conversationParams.toString()}`, {
        method: 'DELETE',
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!conversationResponse.ok) {
        const errorData = await conversationResponse.text().catch(() => '');
        console.error('Error deleting conversation:', errorData);
        return false;
      }

      setConversations((prev) => prev.filter((c) => c.id !== id));

      if (conversationId === id) {
        setMessages([welcomeMessage]);
        setConversationId(null);
      }

      return true;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return false;
    }
  }, [conversationId, user?.id]);

  const sendMessage = useCallback(async (content: string, images?: string[], assetContext?: string, location?: { latitude: number; longitude: number } | null) => {
    const userMessage: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
      images,
      assetContext,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      let currentConvId = conversationId;
      if (!currentConvId && isAuthenticated) {
        const initiatedConversation = await initiateConversation(content, images);

        if (initiatedConversation) {
          currentConvId = initiatedConversation.id;
          setConversationId(initiatedConversation.id);
          setConversations((prev) => [
            initiatedConversation,
            ...prev.filter((conversation) => conversation.id !== initiatedConversation.id),
          ]);
          await fetchMessagesForConversation(initiatedConversation.id);
          return;
        }

        const createdConversation = await createConversation(assetContext, content);
        if (createdConversation) {
          currentConvId = createdConversation.id;
          setConversationId(createdConversation.id);
          setConversations((prev) => [
            createdConversation,
            ...prev.filter((conversation) => conversation.id !== createdConversation.id),
          ]);
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      const messageType = userMessage.images && userMessage.images.length > 0 ? 'image' : 'text';
      const payload = {
        uuid: user?.id ?? null,
        message: userMessage.content,
        message_type: messageType,
        role: userMessage.role,
        ...(currentConvId ? { conversation_id: currentConvId } : {}),
      };

      const response = await fetch(CHAT_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(SUPABASE_PUBLISHABLE_KEY ? { apikey: SUPABASE_PUBLISHABLE_KEY } : {}),
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null) as
        | { message?: string; response?: string; error?: string }
        | null;

      if (!response.ok) {
        console.error('Error calling chat function:', data);
        throw new Error(data?.error || `Chat request failed with status ${response.status}`);
      }

      if (currentConvId) {
        await fetchMessagesForConversation(currentConvId);
      } else {
        const assistantMessage: ChatMessage = {
          id: `optimistic-${Date.now() + 1}`,
          role: 'assistant',
          content: data?.message || data?.response || '',
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);

      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Συγγνώμη, παρουσιάστηκε σφάλμα. Παρακαλώ δοκίμασε ξανά.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, isAuthenticated, createConversation, fetchMessagesForConversation, initiateConversation, user?.id]);

  const clearChat = useCallback(() => {
    setMessages([welcomeMessage]);
    setConversationId(null);
  }, []);

  const startNewChat = useCallback(() => {
    setMessages([welcomeMessage]);
    setConversationId(null);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearChat,
    conversations,
    loadConversation,
    startNewChat,
    deleteConversation,
    currentConversationId: conversationId,
  };
}
