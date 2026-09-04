/**
 * The refraction behind `.glass-refract` (see globals.css): a fractal-noise
 * displacement map, referenced by every glass surface in the app via one
 * shared `backdrop-filter: url(#app-glass-distortion)` — a single hidden
 * filter, not one per instance, since the distortion itself carries no state.
 * Scale is tuned low (real Apple glass reads as a subtle bend, not a melt)
 * so text sitting under a glass pane on this app's near-black background
 * stays legible.
 */
export function GlassFilter() {
  return (
    <svg aria-hidden="true" className="hidden" focusable={false}>
      <filter
        id="app-glass-distortion"
        colorInterpolationFilters="sRGB"
        x="-50%"
        y="-50%"
        width="200%"
        height="200%"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.008 0.012"
          numOctaves={1}
          seed={2}
          result="turbulence"
        />
        <feGaussianBlur in="turbulence" stdDeviation={2} result="blurredNoise" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="blurredNoise"
          scale={14}
          xChannelSelector="R"
          yChannelSelector="B"
        />
      </filter>
    </svg>
  );
}
