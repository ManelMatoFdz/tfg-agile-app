import { useEffect, useRef, useCallback, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { useAuthStore } from '../store/authStore';
import type { PokerSession, PokerRound } from '../types';

interface VoteStatus {
  [userId: string]: boolean;
}

interface UsePokerSocketReturn {
  connected: boolean;
  voteStatus: VoteStatus;
  revealedRound: PokerRound | null;
  sessionState: PokerSession | null;
  sendVote: (value: string) => void;
  sendReveal: () => void;
  sendNext: (finalEstimate: number | null) => void;
  sendRevote: () => void;
  error: string | null;
}

export function usePokerSocket(sessionId: string | undefined): UsePokerSocketReturn {
  const clientRef = useRef<Client | null>(null);
  const [connected, setConnected] = useState(false);
  const [voteStatus, setVoteStatus] = useState<VoteStatus>({});
  const [revealedRound, setRevealedRound] = useState<PokerRound | null>(null);
  const [sessionState, setSessionState] = useState<PokerSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${wsProtocol}://${window.location.host}/ws/poker?token=${token}`;

    const client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true);
        setError(null);

        client.subscribe(`/topic/poker/${sessionId}/votes`, (msg) => {
          setVoteStatus(JSON.parse(msg.body));
        });

        client.subscribe(`/topic/poker/${sessionId}/reveal`, (msg) => {
          setRevealedRound(JSON.parse(msg.body));
        });

        client.subscribe(`/topic/poker/${sessionId}/state`, (msg) => {
          setSessionState(JSON.parse(msg.body));
        });

        client.subscribe(`/topic/poker/${sessionId}/participants`, () => {
          // Participant changes are reflected via /state topic
        });

        client.subscribe('/user/queue/poker/errors', (msg) => {
          const data = JSON.parse(msg.body);
          setError(data.message || 'WebSocket error');
        });
      },
      onDisconnect: () => {
        setConnected(false);
      },
      onStompError: (frame) => {
        setError(frame.headers['message'] || 'Connection error');
        setConnected(false);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      clientRef.current = null;
    };
  }, [sessionId]);

  const sendVote = useCallback(
    (value: string) => {
      clientRef.current?.publish({
        destination: `/app/poker/${sessionId}/vote`,
        body: JSON.stringify({ value }),
      });
    },
    [sessionId],
  );

  const sendReveal = useCallback(() => {
    clientRef.current?.publish({
      destination: `/app/poker/${sessionId}/reveal`,
      body: '{}',
    });
  }, [sessionId]);

  const sendNext = useCallback(
    (finalEstimate: number | null) => {
      clientRef.current?.publish({
        destination: `/app/poker/${sessionId}/next`,
        body: JSON.stringify({ finalEstimate }),
      });
    },
    [sessionId],
  );

  const sendRevote = useCallback(() => {
    clientRef.current?.publish({
      destination: `/app/poker/${sessionId}/revote`,
      body: '{}',
    });
  }, [sessionId]);

  return {
    connected,
    voteStatus,
    revealedRound,
    sessionState,
    sendVote,
    sendReveal,
    sendNext,
    sendRevote,
    error,
  };
}