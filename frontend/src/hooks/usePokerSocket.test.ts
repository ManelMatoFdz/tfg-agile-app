import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Client } from '@stomp/stompjs';
import { useAuthStore } from '../store/authStore';
import { usePokerSocket } from './usePokerSocket';

type MessageHandler = (message: { body: string }) => void;
type ClientConfig = {
  brokerURL: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onStompError: (frame: { headers: Record<string, string> }) => void;
};

let mockClientConfig: ClientConfig;
const mockSubscriptions = new Map<string, MessageHandler>();
const mockStompClient = {
  activate: jest.fn(),
  deactivate: jest.fn(),
  publish: jest.fn(),
  subscribe: jest.fn((destination: string, handler: MessageHandler) => {
    mockSubscriptions.set(destination, handler);
    return { unsubscribe: jest.fn() };
  }),
};

jest.mock('@stomp/stompjs', () => ({ Client: jest.fn() }));

describe('usePokerSocket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscriptions.clear();
    jest.mocked(Client).mockImplementation(((config: ClientConfig) => {
      mockClientConfig = config;
      return mockStompClient;
    }) as never);
    useAuthStore.setState({ accessToken: 'token', refreshToken: null, user: null });
  });

  it('does not connect without a session or access token', () => {
    const missingSession = renderHook(() => usePokerSocket(undefined));
    expect(Client).not.toHaveBeenCalled();
    missingSession.unmount();

    useAuthStore.setState({ accessToken: null });
    const missingToken = renderHook(() => usePokerSocket('session-1'));
    expect(Client).not.toHaveBeenCalled();
    missingToken.unmount();
  });

  it('connects, subscribes and consumes all server events', () => {
    const { result, unmount } = renderHook(() => usePokerSocket('session-1'));
    expect(mockClientConfig.brokerURL).toContain('/ws/poker/websocket?token=token');
    expect(mockStompClient.activate).toHaveBeenCalled();

    act(() => mockClientConfig.onConnect());
    expect(result.current.connected).toBe(true);
    expect(mockSubscriptions.size).toBe(5);

    act(() => mockSubscriptions.get('/topic/poker/session-1/votes')?.({ body: '{"u1":true}' }));
    expect(result.current.voteStatus).toEqual({ u1: true });

    act(() => mockSubscriptions.get('/topic/poker/session-1/reveal')?.({ body: '{"id":"round-1"}' }));
    expect(result.current.revealedRound).toMatchObject({ id: 'round-1' });

    act(() => mockSubscriptions.get('/topic/poker/session-1/state')?.({ body: '{"id":"s1","status":"VOTING"}' }));
    expect(result.current.sessionState).toMatchObject({ id: 's1', status: 'VOTING' });
    expect(result.current.voteStatus).toEqual({});

    act(() => mockSubscriptions.get('/topic/poker/session-1/participants')?.({ body: '[{"id":"p1"}]' }));
    expect(result.current.participantUpdate).toEqual([{ id: 'p1' }]);

    act(() => mockSubscriptions.get('/user/queue/poker/errors')?.({ body: '{}' }));
    expect(result.current.error).toBe('WebSocket error');

    unmount();
    expect(mockStompClient.deactivate).toHaveBeenCalled();
  });

  it('publishes every supported command', () => {
    const { result } = renderHook(() => usePokerSocket('session-1'));
    act(() => {
      result.current.sendVote('8');
      result.current.sendReveal();
      result.current.sendNext(13);
      result.current.sendRevote();
    });
    expect(mockStompClient.publish).toHaveBeenNthCalledWith(1, {
      destination: '/app/poker/session-1/vote', body: '{"value":"8"}',
    });
    expect(mockStompClient.publish).toHaveBeenNthCalledWith(2, {
      destination: '/app/poker/session-1/reveal', body: '{}',
    });
    expect(mockStompClient.publish).toHaveBeenNthCalledWith(3, {
      destination: '/app/poker/session-1/next', body: '{"finalEstimate":13}',
    });
    expect(mockStompClient.publish).toHaveBeenNthCalledWith(4, {
      destination: '/app/poker/session-1/revote', body: '{}',
    });
  });

  it('reports disconnects, stomp errors and reconnect callbacks', () => {
    const { result } = renderHook(() => usePokerSocket('session-1'));
    const reconnect = jest.fn();
    result.current.onReconnectRef.current = reconnect;
    act(() => mockClientConfig.onConnect());
    act(() => mockClientConfig.onConnect());
    expect(reconnect).toHaveBeenCalledTimes(1);

    act(() => mockClientConfig.onDisconnect());
    expect(result.current.connected).toBe(false);
    act(() => mockClientConfig.onStompError({ headers: { message: 'Broker failed' } }));
    expect(result.current.error).toBe('Broker failed');
  });
});
