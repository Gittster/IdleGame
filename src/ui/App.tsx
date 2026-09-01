import { useSyncExternalStore, type CSSProperties } from 'react';
import { playerProgress } from '../game/state/session';
import { sceneBridge } from '../game/state/sceneBridge';
import { ZONES } from '../data/zones';
import { ITEMS } from '../data/items';
import type { ProgressSnapshot } from '../sim/core/playerProgress';
import type { ItemStack } from '../sim/core/inventory';

const EXPAND_SLOTS = 4;
const EXPAND_COST_BASE = 50;

/** Cheap linear-ish scaling — real pacing gets tuned once there's more to
 *  spend gold on than just this. */
function expandCost(capacity: number): number {
  return EXPAND_COST_BASE + capacity * 5;
}

export function App() {
  const screen = useSyncExternalStore(
    (cb) => sceneBridge.subscribe(cb),
    () => sceneBridge.getScreen()
  );
  const progress = useSyncExternalStore(
    (cb) => playerProgress.subscribe(cb),
    () => playerProgress.getSnapshot()
  );

  return (
    <>
      <GoldPill gold={progress.gold} />
      {screen === 'town' && <TownPanel progress={progress} />}
    </>
  );
}

function GoldPill({ gold }: { gold: number }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        pointerEvents: 'none',
        background: 'rgba(0,0,0,0.55)',
        border: '1px solid rgba(232,217,168,0.4)',
        borderRadius: 6,
        padding: '4px 10px',
        color: '#e8d9a8',
        fontFamily: 'Cinzel, serif',
        fontSize: 13,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}
    >
      Gold: {gold}
    </div>
  );
}

function TownPanel({ progress }: { progress: ProgressSnapshot }) {
  const cost = expandCost(progress.capacity);
  const canExpand = progress.gold >= cost;
  const filled = progress.slots.filter((slot) => slot !== null).length;

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Town</h1>
        <p style={subtleStyle}>Gold: {progress.gold}</p>

        <h2 style={sectionStyle}>
          Inventory — {filled}/{progress.capacity}
        </h2>
        <div style={gridStyle}>
          {progress.slots.map((slot, i) => (
            <InventorySlot key={i} stack={slot} />
          ))}
        </div>
        <button
          style={buttonStyle(canExpand)}
          disabled={!canExpand}
          onClick={() => {
            if (playerProgress.spendGold(cost)) playerProgress.expandInventory(EXPAND_SLOTS);
          }}
        >
          Expand Inventory (+{EXPAND_SLOTS} slots) — {cost} gold
        </button>

        <h2 style={sectionStyle}>Zones</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.values(ZONES).map((zone) => {
            const unlocked = progress.unlockedZoneIds.includes(zone.id);
            return (
              <div key={zone.id} style={zoneRowStyle}>
                <span style={{ opacity: unlocked ? 1 : 0.4 }}>{zone.name}</span>
                <button style={buttonStyle(unlocked)} disabled={!unlocked} onClick={() => sceneBridge.enterZone(zone.id)}>
                  {unlocked ? 'Enter' : 'Locked'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function InventorySlot({ stack }: { stack: ItemStack | null }) {
  const item = stack ? ITEMS[stack.itemId] : undefined;
  return (
    <div style={slotStyle} title={item?.name}>
      {item && (
        <>
          <div style={{ width: 20, height: 20, background: colorToCss(item.color), borderRadius: 4 }} />
          <span style={qtyStyle}>{stack!.qty}</span>
        </>
      )}
    </div>
  );
}

function colorToCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
};

const cardStyle: CSSProperties = {
  pointerEvents: 'auto',
  width: 'min(560px, 92vw)',
  maxHeight: '80vh',
  overflowY: 'auto',
  background: 'rgba(15,13,10,0.92)',
  border: '1px solid rgba(232,217,168,0.35)',
  borderRadius: 10,
  padding: 24,
  color: '#e8d9a8',
  fontFamily: 'Spectral, serif',
};

const titleStyle: CSSProperties = {
  fontFamily: 'Cinzel, serif',
  fontSize: 22,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  margin: '0 0 4px',
};

const subtleStyle: CSSProperties = { margin: '0 0 20px', opacity: 0.75, fontSize: 13 };

const sectionStyle: CSSProperties = {
  fontFamily: 'Cinzel, serif',
  fontSize: 14,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  margin: '16px 0 8px',
  opacity: 0.9,
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(6, 40px)',
  gap: 6,
  marginBottom: 12,
};

const slotStyle: CSSProperties = {
  width: 40,
  height: 40,
  border: '1px solid rgba(232,217,168,0.3)',
  borderRadius: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  background: 'rgba(255,255,255,0.03)',
};

const qtyStyle: CSSProperties = { position: 'absolute', bottom: 2, right: 4, fontSize: 10 };

const zoneRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 10px',
  background: 'rgba(255,255,255,0.03)',
  borderRadius: 6,
};

function buttonStyle(enabled: boolean): CSSProperties {
  return {
    padding: '8px 14px',
    background: enabled ? 'rgba(232,217,168,0.15)' : 'rgba(255,255,255,0.04)',
    border: `1px solid rgba(232,217,168,${enabled ? 0.5 : 0.15})`,
    borderRadius: 6,
    color: enabled ? '#e8d9a8' : 'rgba(232,217,168,0.35)',
    cursor: enabled ? 'pointer' : 'not-allowed',
    fontFamily: 'Spectral, serif',
    fontSize: 13,
  };
}
