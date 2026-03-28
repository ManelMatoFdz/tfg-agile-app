import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — animated mesh gradient branding */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-[#0f0a2a]">
        {/* Mesh gradient blobs */}
        <div className="absolute inset-0">
          <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-primary-600/50 blur-[120px] animate-mesh-1" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-accent-500/40 blur-[140px] animate-mesh-2" />
          <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] rounded-full bg-primary-400/30 blur-[100px] animate-mesh-3" />
          <div className="absolute top-[20%] right-[20%] w-[300px] h-[300px] rounded-full bg-blue-500/20 blur-[80px] animate-mesh-2" />
        </div>

        {/* Noise overlay for texture */}
        <div className="absolute inset-0 noise-overlay" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Floating decorative shapes */}
        <div className="absolute top-20 left-16 w-20 h-20 border border-white/10 rounded-2xl rotate-12 animate-float" />
        <div className="absolute bottom-32 right-20 w-16 h-16 border border-white/10 rounded-full animate-float-delayed" />
        <div className="absolute top-[60%] left-[10%] w-12 h-12 border border-white/[0.07] rounded-xl rotate-45 animate-float-slow" />
        <div className="absolute top-[30%] right-[15%] w-3 h-3 bg-white/20 rounded-full animate-float" />
        <div className="absolute top-[70%] right-[30%] w-2 h-2 bg-primary-400/40 rounded-full animate-float-delayed" />
        <div className="absolute top-[15%] left-[40%] w-2 h-2 bg-accent-400/30 rounded-full animate-float-slow" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-20 text-white">
          {/* Logo */}
          <div className="mb-10 animate-slide-up-fade">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-8 border border-white/20 shadow-lg shadow-primary-500/10 animate-glow-pulse">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-5xl xl:text-6xl font-bold tracking-tight bg-gradient-to-r from-white via-primary-200 to-white bg-clip-text text-transparent" style={{ backgroundSize: '200% auto', animation: 'gradient-shift 6s linear infinite' }}>
              Agile App
            </h1>
            <div className="mt-2 h-1 w-16 bg-gradient-to-r from-primary-400 to-accent-500 rounded-full" />
          </div>

          {/* Description */}
          <p className="text-lg text-primary-100/80 leading-relaxed max-w-md animate-slide-up-fade" style={{ animationDelay: '0.15s' }}>
            Gestiona tus proyectos con metodologías ágiles. Colabora con tu equipo de forma eficiente y visual.
          </p>

          {/* Feature pills */}
          <div className="mt-10 flex flex-wrap gap-3 animate-slide-up-fade" style={{ animationDelay: '0.3s' }}>
            {['Scrum', 'Kanban', 'Planning Poker', 'Sprints'].map((tag) => (
              <div
                key={tag}
                className="px-4 py-2 bg-white/[0.07] backdrop-blur-sm rounded-xl text-sm font-medium border border-white/10 hover:bg-white/[0.12] hover:border-white/20 transition-all duration-300 cursor-default hover:scale-105 hover:shadow-lg hover:shadow-primary-500/10"
              >
                {tag}
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div className="mt-14 flex gap-8 animate-slide-up-fade" style={{ animationDelay: '0.45s' }}>
            {[
              { value: '10K+', label: 'Usuarios' },
              { value: '50K+', label: 'Proyectos' },
              { value: '99.9%', label: 'Uptime' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-primary-300/60 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form area */}
      <div className="flex w-full lg:w-[45%] items-center justify-center p-6 sm:p-12 bg-gray-50/50 relative">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary-100/30 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-accent-500/5 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />

        {/* Mobile logo */}
        <div className="lg:hidden absolute top-6 left-6 flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-accent-600 rounded-xl flex items-center justify-center shadow-md shadow-primary-500/25">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-gray-900">Agile App</span>
        </div>

        <div className="w-full max-w-[420px] relative z-10 animate-slide-up-fade">
          {children}
        </div>
      </div>
    </div>
  );
}
