// Gemeinsames Icon-Motiv für die PWA-Icons (App-Icon, Apple-Touch-Icon).
// Wird von app/icon.tsx und app/apple-icon.tsx via next/og (ImageResponse)
// zu PNG gerendert — bewusst reine Formen, keine Schrift (kein Font-Loading).
//
// Motiv: Sprechblase mit drei Punkten auf JFS-Blau — steht für den
// „Community Exchange" (Austausch / Gespräch). Inhalt liegt in der
// maskable-Sicherheitszone (zentrale ~60 %).

export function iconArt(s: number) {
  const dot = (color: string) => ({
    width: s * 0.082,
    height: s * 0.082,
    borderRadius: '50%',
    background: color,
  });
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0b4ea2',
        position: 'relative',
      }}
    >
      {/* Sprechblasen-Schwanz */}
      <div
        style={{
          position: 'absolute',
          width: s * 0.15,
          height: s * 0.15,
          background: '#ffffff',
          borderRadius: s * 0.035,
          transform: 'rotate(45deg)',
          left: s * 0.3,
          top: s * 0.57,
        }}
      />
      {/* Sprechblasen-Körper mit drei Punkten */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: s * 0.05,
          width: s * 0.58,
          height: s * 0.4,
          marginTop: -s * 0.05,
          background: '#ffffff',
          borderRadius: s * 0.14,
        }}
      >
        <div style={dot('#0b4ea2')} />
        <div style={dot('#ff8a00')} />
        <div style={dot('#0b4ea2')} />
      </div>
    </div>
  );
}
