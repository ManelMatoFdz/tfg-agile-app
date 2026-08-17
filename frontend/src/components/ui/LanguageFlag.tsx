/* Banderas dibujadas inline para que se vean igual en todas las plataformas
   (Windows no renderiza los emoji de bandera y Galicia no tiene emoji propio). */
const SHAPES: Record<string, React.ReactNode> = {
  es: (
    <>
      <rect width="60" height="40" fill="#C60B1E" />
      <rect y="10" width="60" height="20" fill="#FFC400" />
    </>
  ),
  en: (
    <>
      <rect width="60" height="40" fill="#012169" />
      <path d="M0 0 60 40M60 0 0 40" stroke="#FFF" strokeWidth="9" />
      <path d="M0 0 60 40M60 0 0 40" stroke="#C8102E" strokeWidth="4" />
      <path d="M30 0V40M0 20H60" stroke="#FFF" strokeWidth="14" />
      <path d="M30 0V40M0 20H60" stroke="#C8102E" strokeWidth="8" />
    </>
  ),
  gl: (
    <>
      <rect width="60" height="40" fill="#FFF" />
      <path d="M0 0 60 40" stroke="#0080C8" strokeWidth="7" />
    </>
  ),
};

export default function LanguageFlag({ code, width = 26, dim = false }: {
  code: string; width?: number; dim?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 60 40"
      aria-hidden="true"
      style={{
        width, height: width * (18 / 26), flexShrink: 0,
        borderRadius: 3,
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        opacity: dim ? 0.75 : 1,
        transition: 'opacity var(--duration) var(--ease-in-out)',
      }}
    >
      {SHAPES[code]}
    </svg>
  );
}