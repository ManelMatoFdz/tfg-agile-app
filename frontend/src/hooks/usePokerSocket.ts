import { useEffect, useRef, useCallback, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { useAuthStore } from '../store/authStore';
import type { PokerSession, PokerRound, PokerParticipant } from '../types';

interface VoteStatus {
  [userId: string]: boolean;
}

interface UsePokerSocketReturn {
  connected: boolean;
  voteStatus: VoteStatus;
  setVoteStatus: React.Dispatch<React.SetStateAction<VoteStatus>>;
  revealedRound: PokerRound | null;
  sessionState: PokerSession | null;
  participantUpdate: PokerParticipant[] | null;
  sendVote: (value: string) => void;
  sendReveal: () => void;
  sendNext: (finalEstimate: number | null) => void;
  sendRevote: () => void;
  error: string | null;
  onReconnectRef: React.MutableRefObject<(() => void) | null>;
}

export function usePokerSocket(sessionId: string | undefined): UsePokerSocketReturn {
  const clientRef = useRef<Client | null>(null);
  const connectedOnceRef = useRef(false);
  const [connected, setConnected] = useState(false);
  const [voteStatus, setVoteStatus] = useState<VoteStatus>({});
  const [revealedRound, setRevealedRound] = useState<PokerRound | null>(null);
  const [sessionState, setSessionState] = useState<PokerSession | null>(null);
  const [participantUpdate, setParticipantUpdate] = useState<PokerParticipant[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onReconnectRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    connectedOnceRef.current = false;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    // Backend uses SockJS — native WebSocket sub-path is /websocket
    const wsUrl = `${wsProtocol}://${window.location.host}/ws/poker/websocket?token=${token}`;

    const client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        const isReconnect = connectedOnceRef.current;
        connectedOnceRef.current = true;
        setConnected(true);
        setError(null);

        if (isReconnect && onReconnectRef.current) {
          onReconnectRef.current();
        }

        client.subscribe(`/topic/poker/${sessionId}/votes`, (msg) => {
          setVoteStatus(JSON.parse(msg.body));
        });

        client.subscribe(`/topic/poker/${sessionId}/reveal`, (msg) => {
          setRevealedRound(JSON.parse(msg.body));
        });

        client.subscribe(`/topic/poker/${sessionId}/state`, (msg) => {
          const state = JSON.parse(msg.body);
          if (state.status === 'VOTING') {
            setVoteStatus({});
          }
          setSessionState(state);
        });

        client.subscribe(`/topic/poker/${sessionId}/participants`, (msg) => {
          setParticipantUpdate(JSON.parse(msg.body));
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
    setVoteStatus,
    revealedRound,
    sessionState,
    participantUpdate,
    sendVote,
    sendReveal,
    sendNext,
    sendRevote,
    error,
    onReconnectRef,
  };
}