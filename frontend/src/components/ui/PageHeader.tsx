import type { ElementType, ReactNode } from 'react';

type PageHeaderProps = {
  /** Icono de la seccion, el mismo que la identifica en el menu lateral. */
  icon?: ElementType;
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Accion principal de la pantalla, alineada a la derecha. */
  action?: ReactNode;
  /** Contenido libre, para pantallas que no siguen el patron titulo/accion. */
  children?: ReactNode;
  /** true cuando el ultimo hijo es una barra de pestanas que debe apoyarse en el borde. */
  flush?: boolean;
};

/**
 * Banda superior a sangre completa. Prolonga la superficie de la barra de
 * navegacion hacia abajo y la cierra con una linea, de modo que el titulo y el
 * contenido de la pagina queden en planos distintos.
 *
 * Utiliza CSS custom properties --page-px y --page-pt definidas en el <main>
 * padre (AppLayout / WorkspaceLayout) para expandirse con margenes negativos y
 * mantener el contenido perfectamente alineado con el resto de la pagina.
 */
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  children,
  flush = false,
}: PageHeaderProps) {
  return (
    <div
      style={{
        marginLeft: 'calc(-1 * var(--page-px, 24px))',
        marginRight: 'calc(-1 * var(--page-px, 24px))',
        marginTop: 'calc(-1 * var(--page-pt, 32px))',
        marginBottom: 24,
        background: 'var(--bg-elevated)',
        borderBottom: '1px solid var(--border)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'relative',
          padding: flush
            ? '28px var(--page-px, 24px) 0'
            : '28px var(--page-px, 24px) 20px',
        }}
      >
        {title !== undefined && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {Icon && (
                  <Icon
                    size={22}
                    strokeWidth={1.75}
                    style={{ color: 'var(--text-faint)', flexShrink: 0 }}
                  />
                )}
                <h1
                  style={{
                    margin: 0,
                    fontSize: 24,
                    fontWeight: 700,
                    color: 'var(--text)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                  }}
                >
                  {title}
                </h1>
              </div>
              {subtitle && (
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 13,
                    color: 'var(--text-faint)',
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
            {action && <div style={{ flexShrink: 0 }}>{action}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
