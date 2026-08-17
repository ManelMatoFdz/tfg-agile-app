import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ArrowLeft, Play, Square, RotateCcw, Heart, BookOpen, HelpCircle, Star, Frown, Meh, Smile } from 'lucide-react';
import type { Sprint, RetrospectiveTechnique, RetrospectiveData } from '../../types';
import { sprintsApi } from '../../api/sprints';

// ── Technique definitions ────────────────────────────────────────────────────

const TECHNIQUES: {
  key: RetrospectiveTechnique;
  fields: string[];
  icon: typeof Play;
  colors: Record<string, string>;
}[] = [
  {
    key: 'START_STOP_CONTINUE',
    fields: ['start', 'stop', 'continue'],
    icon: Play,
    colors: { start: '#22C55E', stop: '#EF4444', continue: '#3B82F6' },
  },
  {
    key: 'FOUR_LS',
    fields: ['loved', 'learned', 'lacked', 'longedFor'],
    icon: Heart,
    colors: { loved: '#EC4899', learned: '#3B82F6', lacked: '#F59E0B', longedFor: '#8B5CF6' },
  },
  {
    key: 'MAD_SAD_GLAD',
    fields: ['mad', 'sad', 'glad'],
    icon: Smile,
    colors: { mad: '#EF4444', sad: '#F59E0B', glad: '#22C55E' },
  },
];

const FIELD_ICONS: Record<string, typeof Play> = {
  start: Play,
  stop: Square,
  continue: RotateCcw,
  loved: Heart,
  learned: BookOpen,
  lacked: HelpCircle,
  longedFor: Star,
  mad: Frown,
  sad: Meh,
  glad: Smile,
};

// ── Styles ───────────────────────────────────────────────────────────────────

const btnAccent: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', fontSize: 13, fontWeight: 600,
  background: 'var(--accent)', color: 'var(--accent-fg)',
  border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  padding: '5px 12px', fontSize: 12, fontWeight: 500,
  background: 'transparent', color: 'var(--text-muted)',
  border: 'none', cursor: 'pointer',
};

const modalBox: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--radius-md)',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

export function parseRetrospective(reviewNotes: string | null | undefined): RetrospectiveData | string | null {
  if (!reviewNotes) return null;
  try {
    const parsed = JSON.parse(reviewNotes);
    if (parsed && typeof parsed === 'object' && parsed.technique && parsed.answers) {
      return parsed as RetrospectiveData;
    }
    return reviewNotes;
  } catch {
    return reviewNotes;
  }
}

// ── Component ────────────────────────────────────────────────────────────────

interface RetrospectiveModalProps {
  sprint: Sprint;
  onClose: () => void;
  onSaved: (updated: Sprint) => void;
}

export default function RetrospectiveModal({ sprint, onClose, onSaved }: RetrospectiveModalProps) {
  const { t } = useTranslation();

  // Try to pre-fill from existing data
  const existing = parseRetrospective(sprint.reviewNotes);
  const existingData = existing && typeof existing === 'object' ? existing : null;

  const [step, setStep] = useState<'select' | 'fill'>(existingData ? 'fill' : 'select');
  const [selectedTechnique, setSelectedTechnique] = useState<RetrospectiveTechnique | null>(
    existingData?.technique ?? null,
  );
  const [answers, setAnswers] = useState<Record<string, string>>(existingData?.answers ?? {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const technique = TECHNIQUES.find((t) => t.key === selectedTechnique);
  const canSave = technique && technique.fields.some((f) => answers[f]?.trim());

  const handleSelectTechnique = (key: RetrospectiveTechnique) => {
    setSelectedTechnique(key);
    if (!existingData || existingData.technique !== key) {
      setAnswers({});
    }
    setStep('fill');
  };

  const handleSave = async () => {
    if (!selectedTechnique || !canSave) return;
    setLoading(true);
    setError(null);
    try {
      const data: RetrospectiveData = { technique: selectedTechnique, answers };
      const updated = await sprintsApi.saveRetrospective(sprint.id, JSON.stringify(data));
      onSaved(updated);
    } catch {
      setError(t('projects.sprints.retrospective.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        backgroundColor: 'var(--bg-overlay)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        animation: 'fade-in 200ms ease both',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ ...modalBox, maxWidth: step === 'select' ? 560 : 600 }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px 14px', borderBottom: '1px solid var(--border)',
        }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            {t('projects.sprints.retrospective.title')}
          </h2>
          <button onClick={onClose} style={{ ...btnSecondary, padding: 4, borderRadius: 'var(--radius-sm)' }}>
            <X size={16} />
          </button>
        </div>

        {step === 'select' ? (
          /* ── Step 1: Technique selection ── */
          <div style={{ padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
              {t('projects.sprints.retrospective.selectTechnique')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {TECHNIQUES.map((tech) => {
                const Icon = tech.icon;
                const firstColor = Object.values(tech.colors)[0];
                return (
                  <button
                    key={tech.key}
                    onClick={() => handleSelectTechnique(tech.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'border-color 0.15s ease, background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = firstColor;
                      e.currentTarget.style.background = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.background = 'var(--bg)';
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                      background: `${firstColor}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon size={18} strokeWidth={2} style={{ color: firstColor }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                        {t(`projects.sprints.retrospective.techniques.${tech.key}.name`)}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.4 }}>
                        {t(`projects.sprints.retrospective.techniques.${tech.key}.description`)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : technique ? (
          /* ── Step 2: Fill in answers ── */
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && (
              <div style={{ fontSize: 12, color: 'var(--danger-text)', background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                background: `${Object.values(technique.colors)[0]}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <technique.icon size={15} strokeWidth={2} style={{ color: Object.values(technique.colors)[0] }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                {t(`projects.sprints.retrospective.techniques.${technique.key}.name`)}
              </span>
            </div>

            {technique.fields.map((field) => {
              const color = technique.colors[field];
              const FieldIcon = FIELD_ICONS[field] ?? HelpCircle;
              return (
                <div key={field}>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 12, fontWeight: 600, color, marginBottom: 6,
                  }}>
                    <FieldIcon size={13} strokeWidth={2} />
                    {t(`projects.sprints.retrospective.techniques.${technique.key}.${field}`)}
                  </label>
                  <textarea
                    value={answers[field] ?? ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [field]: e.target.value }))}
                    rows={3}
                    style={{
                      width: '100%', padding: '8px 12px', fontSize: 13,
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)', color: 'var(--text)',
                      outline: 'none', boxSizing: 'border-box', resize: 'vertical',
                      borderLeftWidth: 3, borderLeftColor: color,
                    }}
                  />
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: step === 'fill' ? 'space-between' : 'flex-end',
          gap: 8, padding: '12px 20px 16px', borderTop: '1px solid var(--border)',
        }}>
          {step === 'fill' && (
            <button
              onClick={() => setStep('select')}
              style={{ ...btnSecondary, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <ArrowLeft size={13} strokeWidth={2} />
              {t('projects.sprints.retrospective.backToTechniques')}
            </button>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={btnSecondary}>{t('common.cancel')}</button>
            {step === 'fill' && (
              <button
                onClick={handleSave}
                disabled={loading || !canSave}
                style={{
                  ...btnAccent,
                  opacity: loading || !canSave ? 0.5 : 1,
                  cursor: loading || !canSave ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => { if (!loading && canSave) e.currentTarget.style.background = 'var(--accent-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--accent)'; }}
              >
                {loading ? t('projects.sprints.retrospective.saving') : t('projects.sprints.retrospective.save')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
