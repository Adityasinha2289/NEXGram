/**
 * An opportunity score, drawn as a ring that fills to its value.
 *
 * The number is the product's central claim, so it gets a presentation that
 * reads at a glance rather than another line of text. The ring colour carries
 * the tier, and the confidence sits with it because the promise is that no
 * score is ever shown bare.
 */
const TIER_COLOR = {
  Strong: 'var(--color-success)',
  Good: 'var(--color-primary)',
  Moderate: 'var(--color-warning)',
  Low: 'var(--color-text-muted)',
};

export function ScoreRing({ score = 0, tier, confidence, size = 'md', showLabel = true }) {
  const value = Math.max(0, Math.min(100, Math.round(score)));
  const fontSize = size === 'lg' ? '1.25rem' : size === 'sm' ? '0.7rem' : '0.9rem';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="score-ring"
        style={{ '--score': value, '--ring-color': TIER_COLOR[tier] || TIER_COLOR.Low, fontSize }}
        role="img"
        aria-label={`${value} out of 100${tier ? `, ${tier}` : ''}${confidence ? `, ${confidence} confidence` : ''}`}
      >
        <div className="score-ring-inner">
          <span className="font-bold leading-none text-text-primary tabular" style={{ fontSize: '1.05em' }}>
            {value}
          </span>
        </div>
      </div>
      {showLabel && confidence && (
        <span className="eyebrow">
          {confidence}
        </span>
      )}
    </div>
  );
}
