const S = 36
const W = 1.5
const O = W / 2

const PATHS: Record<string, string> = {
  tl: `M ${S} ${O} L ${O} ${O} L ${O} ${S}`,
  tr: `M ${O} ${O} L ${S - O} ${O} L ${S - O} ${S}`,
  bl: `M ${O} ${S - O} L ${O} ${O} L ${S} ${O}`,
  br: `M ${S - O} ${S} L ${S - O} ${O} L ${O} ${O}`,
}

const POS: Record<string, React.CSSProperties> = {
  tl: { top: 18, left: 18 },
  tr: { top: 18, right: 18 },
  bl: { bottom: 18, left: 18 },
  br: { bottom: 18, right: 18 },
}

function Bracket({ id }: { id: string }) {
  return (
    <div className="fixed pointer-events-none" style={{ ...POS[id], zIndex: 100 }}>
      <svg width={S} height={S} fill="none">
        <path
          d={PATHS[id]}
          stroke="rgba(0,212,255,0.4)"
          strokeWidth={W}
          strokeLinecap="square"
          style={{ filter: 'drop-shadow(0 0 3px rgba(0,212,255,0.45))' }}
        />
      </svg>
    </div>
  )
}

export function HUDCornerBrackets() {
  return (
    <>
      <Bracket id="tl" />
      <Bracket id="tr" />
      <Bracket id="bl" />
      <Bracket id="br" />
    </>
  )
}
