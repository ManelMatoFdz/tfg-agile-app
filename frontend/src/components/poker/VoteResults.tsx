import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3, ThumbsUp, Users, Settings, Save,
  RotateCcw, Ban, CheckCircle, AlertTriangle,
  BookOpen, CheckSquare, Bug,
} from 'lucide-react';
import { AssigneeAvatar } from '../kanban/TaskModal';
import type { PokerRound, PokerParticipant, Task, UserSummary, TaskType } from '../../types';

interface Props {
  round: PokerRound;
  participants: PokerParticipant[];
  isFacilitator: boolean;
  onAccept: (finalEstimate: number | null) => void;
  onRevote: () => void;
  task?: Task | null;
  subtasks?: Task[];
  userMap?: Record<string, UserSummary>;
}

type DeviationLevel = 'normal' | 'warning' | 'danger';

const CARD_STYLE: Record<DeviationLevel, { border: string; bg: string; color: string; shadow: string }> = {
  normal:  { border: '#2563EB', bg: 'rgba(37,99,235,0.04)',  color: '#2563EB', shadow: '0 2px 8px rgba(37,99,235,0.08)' },
  warning: { border: '#F59E0B', bg: 'rgba(245,158,11,0.04)', color: '#F59E0B', shadow: '0 2px 8px rgba(245,158,11,0.10)' },
  danger:  { border: '#EF4444', bg: 'rgba(239,68,68,0.04)',  color: '#EF4444', shadow: '0 2px 8px rgba(239,68,68,0.10)' },
};

const PRIORITY_STYLE: Record<string, { color: string; bg: string }> = {
  CRITICAL: { color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
  HIGH:     { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
  MEDIUM:   { color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
  LOW:      { color: '#94A3B8', bg: '#EDF0F4' },
};

const TYPE_ICON: Record<TaskType, { icon: typeof BookOpen; color: string }> = {
  STORY: { icon: BookOpen, color: '#7C3AED' },
  TASK:  { icon: CheckSquare, color: '#2563EB' },
  BUG:   { icon: Bug, color: '#DC2626' },
};

export default function VoteResults({ round, participants, isFacilitator, onAccept, onRevote, task, subtasks = [], userMap = {} }: Props) {
  const { t } = useTranslation();
  const [customEstimate, setCustomEstimate] = useState('');

  /* ---------- stats ---------- */
  const stats = useMemo(() => {
    const numericVotes = round.votes
      .map((v) => parseFloat(v.value))
      .filter((n) => !isNaN(n));

    if (numericVotes.length === 0) return null;

    const avg = numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;
    const sorted = [...numericVotes].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const range = max - min;

    const freq: Record<number, number> = {};
    numericVotes.forEach((v) => { freq[v] = (freq[v] || 0) + 1; });
    const modeEntry = Object.entries(freq).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
    const mode = parseFloat(modeEntry[0]);
    const modeCount = Number(modeEntry[1]);

    const higherUnique = [...new Set(numericVotes.filter((v) => v > mode))].sort((a, b) => a - b);
    const safeEstimate = higherUnique.length > 0 ? higherUnique[0] : null;

    const voterCount = participants.filter((p) => p.role === 'VOTER').length;

    return {
      avg: Math.round(avg * 10) / 10,
      min, max, range, mode, modeCount, safeEstimate,
      totalVotes: round.votes.length,
      voterCount,
      allVoted: round.votes.length >= voterCount,
      consensus: min === max,
    };
  }, [round.votes, participants]);

  const participantMap = useMemo(() => {
    const map: Record<string, string> = {};
    participants.forEach((p) => { map[p.userId] = p.displayName; });
    return map;
  }, [participants]);

  const extremeVoters = useMemo(() => {
    if (!stats || stats.consensus) return null;

    const highDiffers = stats.max !== stats.mode;
    const lowDiffers = stats.min !== stats.mode;
    if (!highDiffers && !lowDiffers) return null;

    const highNames = highDiffers
      ? round.votes.filter((v) => parseFloat(v.value) === stats.max).map((v) => participantMap[v.userId] ?? '?')
      : [];
    const lowNames = lowDiffers
      ? round.votes.filter((v) => parseFloat(v.value) === stats.min).map((v) => participantMap[v.userId] ?? '?')
      : [];

    return { highNames, highValue: stats.max, lowNames, lowValue: stats.min };
  }, [stats, round.votes, participantMap]);

  const getDeviation = (value: string): DeviationLevel => {
    if (!stats || stats.range === 0) return 'normal';
    const num = parseFloat(value);
    if (isNaN(num)) return 'normal';
    const dist = Math.abs(num - stats.mode);
    if (dist > stats.range * 0.55) return 'danger';
    if (dist > stats.range * 0.25) return 'warning';
    return 'normal';
  };

  const handleSave = () => {
    const val = customEstimate.trim();
    if (val) {
      const n = parseInt(val, 10);
      onAccept(isNaN(n) ? null : n);
    } else if (stats) {
      onAccept(stats.mode);
    } else {
      onAccept(null);
    }
  };

  /* ---------- render ---------- */
  return (
    <div>
      <style>{`
        .vr-layout{display:grid;gap:20px;grid-template-columns:1fr}
        @media(min-width:768px){.vr-layout{grid-template-columns:5fr 2fr}}
        .vr-stats{display:grid;gap:12px;grid-template-columns:1fr}
        @media(min-width:480px){.vr-stats{grid-template-columns:repeat(3,1fr)}}
      `}</style>

      {/* ---- Task header ---- */}
      <div style={{
        marginBottom: 20, padding: '20px 24px',
        background: '#FFFFFF', border: '1px solid #E2E8F0',
        borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <span style={{
          alignSelf: 'flex-start',
          fontSize: 11, fontWeight: 600,
          color: '#8B5CF6', background: 'rgba(139,92,246,0.08)',
          borderRadius: 6, padding: '3px 10px',
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {t('poker.status.REVEALED')}
        </span>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1E293B', lineHeight: 1.3 }}>
          {round.taskTitle}
        </h2>
        {task && (() => {
          const ps = PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE.MEDIUM;
          const tc = TYPE_ICON[task.type as TaskType] ?? TYPE_ICON.TASK;
          const TypeIcon = tc.icon;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8' }}>
                  {t('tasks.modal.type')}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TypeIcon size={14} strokeWidth={2} style={{ color: tc.color }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: tc.color }}>
                    {t(`tasks.type.${task.type}`)}
                  </span>
                </div>
              </div>
              <div>
                <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8' }}>
                  {t('tasks.modal.priority')}
                </p>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: ps.color, background: ps.bg,
                  borderRadius: 6, padding: '3px 10px',
                }}>
                  {t(`tasks.priority.${task.priority}`)}
                </span>
              </div>
              {task.storyPoints != null && (
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8' }}>
                    Story Points
                  </p>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: '#2563EB', background: 'rgba(37,99,235,0.08)',
                    borderRadius: 6, padding: '3px 10px',
                  }}>
                    {task.storyPoints} SP
                  </span>
                </div>
              )}
              {task.description && (
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8' }}>
                    {t('tasks.modal.description')}
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: '#1F2937', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {task.description}
                  </p>
                </div>
              )}
              {task.definitionOfDone && (
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8' }}>
                    {t('tasks.modal.definitionOfDone')}
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: '#1F2937', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {task.definitionOfDone}
                  </p>
                </div>
              )}
              {(task.labels?.length ?? 0) > 0 && (
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8' }}>
                    {t('tasks.modal.labels')}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {task.labels!.map((label) => (
                      <span key={label.id} style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 10px',
                        borderRadius: 999, color: label.color,
                        background: `${label.color}14`, border: `1px solid ${label.color}30`,
                      }}>
                        {label.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {subtasks.length > 0 && (
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8' }}>
                    {t('tasks.modal.subtasks')}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {subtasks.map((st) => {
                      const isDone = st.completedAt != null;
                      return (
                        <div key={st.id} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '6px 0',
                          borderBottom: '1px solid #F1F5F9',
                        }}>
                          <div style={{
                            width: 18, height: 18, borderRadius: 4,
                            border: isDone ? 'none' : '2px solid #CBD5E1',
                            background: isDone ? '#3B82F6' : '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            {isDone && (
                              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                                <path d="M2 5.5L4.5 8L9 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <span style={{
                            fontSize: 13, fontWeight: 400,
                            color: isDone ? '#94A3B8' : '#1F2937',
                            textDecoration: isDone ? 'line-through' : 'none',
                            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                          }}>
                            {st.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {task.assigneeId && userMap[task.assigneeId] && (
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8' }}>
                    {t('tasks.modal.assignee')}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AssigneeAvatar
                      name={userMap[task.assigneeId].fullName ?? userMap[task.assigneeId].username}
                      avatarUrl={userMap[task.assigneeId].avatarUrl}
                      size={24}
                    />
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#1E293B' }}>
                      {userMap[task.assigneeId].fullName ?? userMap[task.assigneeId].username}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ---- Consensus banner ---- */}
      {stats?.consensus && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 14, fontWeight: 600, color: '#16A34A',
          background: 'rgba(22,163,74,0.06)',
          border: '1px solid rgba(22,163,74,0.15)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
        }}>
          <CheckCircle size={18} strokeWidth={2} />
          {t('poker.room.consensus')}
        </div>
      )}

      {/* ---- Extreme voters banner ---- */}
      {extremeVoters && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 8,
          fontSize: 13, color: '#92400E',
          background: 'rgba(245,158,11,0.06)',
          border: '1px solid rgba(245,158,11,0.18)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14 }}>
            <AlertTriangle size={18} strokeWidth={2} style={{ color: '#F59E0B', flexShrink: 0 }} />
            {t('poker.room.extremeVotersTitle')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 26 }}>
            {extremeVoters.highNames.length > 0 && (
              <span>
                {t('poker.room.extremeHigh', { names: extremeVoters.highNames.join(', '), value: extremeVoters.highValue })}
              </span>
            )}
            {extremeVoters.lowNames.length > 0 && (
              <span>
                {t('poker.room.extremeLow', { names: extremeVoters.lowNames.join(', '), value: extremeVoters.lowValue })}
              </span>
            )}
          </div>
          <p style={{ margin: 0, paddingLeft: 26, fontSize: 12, color: '#B45309', fontStyle: 'italic' }}>
            {t('poker.room.extremeVotersHint')}
          </p>
        </div>
      )}

      {/* ---- Two-column layout ---- */}
      <div className="vr-layout">
        {/* ======== LEFT: Stats + Team Votes ======== */}
        <div>
          {/* Stats cards */}
          {stats && (
            <div className="vr-stats" style={{ marginBottom: 20 }}>
              {/* Average */}
              <div style={{
                padding: 16, background: '#FFFFFF',
                border: '1px solid #E2E8F0', borderRadius: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <BarChart3 size={14} style={{ color: '#2563EB' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748B' }}>
                    {t('poker.room.average')}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#2563EB' }}>
                  {stats.avg}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94A3B8' }}>
                  {t('poker.room.basedOnVotes', { count: stats.totalVotes })}
                </p>
              </div>

              {/* Most Voted */}
              <div style={{
                padding: 16, background: '#FFFFFF',
                border: '1px solid #E2E8F0', borderRadius: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <ThumbsUp size={14} style={{ color: '#2563EB' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748B' }}>
                    {t('poker.room.mostVoted')}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#2563EB' }}>
                  {stats.mode}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94A3B8' }}>
                  {t('poker.room.agreedCount', { count: stats.modeCount })}
                </p>
              </div>

              {/* Participants */}
              <div style={{
                padding: 16, background: '#FFFFFF',
                border: '1px solid #E2E8F0', borderRadius: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Users size={14} style={{ color: '#2563EB' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748B' }}>
                    {t('poker.room.participants')}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#1E293B' }}>
                  {stats.totalVotes}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94A3B8' }}>
                  {stats.allVoted ? t('poker.room.allVoted') : `${stats.totalVotes}/${stats.voterCount}`}
                </p>
              </div>
            </div>
          )}

          {/* Team Votes */}
          <div style={{
            background: '#FFFFFF', border: '1px solid #E2E8F0',
            borderRadius: 12, padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1E293B' }}>
                {t('poker.room.teamVotes')}
              </h3>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 12, fontWeight: 500, color: '#16A34A',
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />
                {t('poker.status.REVEALED')}
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {round.votes.map((vote) => {
                const level = getDeviation(vote.value);
                const cs = CARD_STYLE[level];
                const name = participantMap[vote.userId] ?? '?';
                const avatarUrl = userMap[vote.userId]?.avatarUrl;
                return (
                  <div key={vote.userId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    {/* Card */}
                    <div style={{
                      position: 'relative',
                      width: 130, height: 170,
                      borderRadius: 14,
                      border: `2px ${level === 'danger' ? 'dashed' : 'solid'} ${cs.border}`,
                      background: cs.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: cs.shadow,
                    }}>
                      {level !== 'normal' && (
                        <AlertTriangle
                          size={16}
                          style={{ position: 'absolute', top: 10, right: 10, color: cs.color }}
                        />
                      )}
                      <span style={{ fontSize: 40, fontWeight: 800, color: cs.color }}>
                        {vote.value}
                      </span>
                    </div>
                    {/* Name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={name}
                          style={{
                            width: 24, height: 24, borderRadius: '50%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%',
                          background: 'rgba(37,99,235,0.08)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 600, color: '#2563EB',
                        }}>
                          {name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span style={{
                        fontSize: 13, fontWeight: 500, color: '#1E293B',
                        maxWidth: 100, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ======== RIGHT: Moderator Panel ======== */}
        <div style={{
          background: '#FFFFFF', border: '1px solid #E2E8F0',
          borderRadius: 12, padding: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          alignSelf: 'start',
        }}>
          {/* Panel header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Settings size={16} style={{ color: '#2563EB' }} />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1E293B' }}>
                {t('poker.room.moderatorPanel')}
              </h3>
            </div>
          </div>

          {/* Final estimation */}
          <label style={{
            display: 'block', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            color: '#64748B', marginBottom: 10,
          }}>
            {t('poker.room.finalEstimate')}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <input
              type="number"
              value={customEstimate}
              onChange={(e) => setCustomEstimate(e.target.value)}
              placeholder={stats ? String(stats.mode) : '--'}
              disabled={!isFacilitator}
              style={{
                flex: 1, padding: '10px 14px',
                fontSize: 18, fontWeight: 700, fontFamily: 'inherit',
                color: '#1E293B',
                background: isFacilitator ? '#F7F8FA' : '#F1F5F9',
                border: '1px solid #E2E8F0', borderRadius: 8,
                outline: 'none', textAlign: 'center',
                cursor: isFacilitator ? 'text' : 'default',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                opacity: isFacilitator ? 1 : 0.6,
              }}
              onFocus={(e) => {
                if (isFacilitator) {
                  e.currentTarget.style.borderColor = '#2563EB';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)';
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 500, color: '#94A3B8', flexShrink: 0 }}>
              {t('poker.room.points')}
            </span>
          </div>

          {/* Suggested values */}
          {stats && (
            <p style={{ margin: '0 0 20px', fontSize: 12, color: '#94A3B8', lineHeight: 1.5 }}>
              {t('poker.room.suggested')}:{' '}
              <span style={{ fontWeight: 700, color: '#2563EB' }}>{stats.mode}</span>
              {' '}({t('poker.room.mostVoted')})
              {stats.safeEstimate != null && (
                <>
                  {' '}{t('poker.room.or')}{' '}
                  <span style={{ fontWeight: 700, color: '#F59E0B' }}>{stats.safeEstimate}</span>
                  {' '}({t('poker.room.safeEstimate')})
                </>
              )}
            </p>
          )}

          {/* Buttons (moderator only) */}
          {isFacilitator && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={handleSave}
                style={{
                  width: '100%', padding: '11px 16px',
                  fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                  color: '#FFFFFF', background: '#2563EB',
                  border: 'none', borderRadius: 8,
                  cursor: 'pointer', transition: 'background 0.15s',
                  boxShadow: '0 2px 8px rgba(37,99,235,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#1D4ED8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#2563EB'; }}
              >
                <Save size={15} />
                {t('poker.room.saveToTask')}
              </button>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={onRevote}
                  style={{
                    flex: 1, padding: '10px 14px',
                    fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
                    color: '#64748B', background: '#FFFFFF',
                    border: '1px solid #E2E8F0', borderRadius: 8,
                    cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#EDF0F4'; e.currentTarget.style.color = '#1E293B'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.color = '#64748B'; }}
                >
                  <RotateCcw size={13} />
                  {t('poker.room.revote')}
                </button>
                <button
                  onClick={() => onAccept(null)}
                  style={{
                    flex: 1, padding: '10px 14px',
                    fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
                    color: '#EF4444', background: '#FFFFFF',
                    border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8,
                    cursor: 'pointer', transition: 'background 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.04)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
                >
                  <Ban size={13} />
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}