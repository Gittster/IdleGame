import { useState, useSyncExternalStore, type CSSProperties } from 'react';
import { playerProgress } from '../game/state/session';
import { sceneBridge } from '../game/state/sceneBridge';
import { clearSavedProgress } from '../game/state/persistence';
import { ZONES } from '../data/zones';
import { ITEMS } from '../data/items';
import { BUILDINGS, type BuildingDef } from '../data/buildings';
import type { Cost } from '../data/buildings';
import { UPGRADES, type UpgradeDef } from '../data/upgrades';
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
      {import.meta.env.DEV && <DevPanel progress={progress} />}
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

        <h2 style={sectionStyle}>Buildings</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
          {Object.values(BUILDINGS).map((building) => (
            <BuildingCard key={building.id} building={building} progress={progress} />
          ))}
        </div>

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

function formatCost(cost: Cost): string {
  const parts = [`${cost.gold} gold`];
  for (const { itemId, qty } of cost.items) parts.push(`${qty} ${ITEMS[itemId]!.name}`);
  return parts.join(', ');
}

function BuildingCard({ building, progress }: { building: BuildingDef; progress: ProgressSnapshot }) {
  const unlocked = progress.unlockedBuildings.includes(building.id);
  const upgrades = Object.values(UPGRADES).filter((u) => u.building === building.id);
  const canUnlock = playerProgress.canAfford(building.unlockCost);

  return (
    <div style={buildingCardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={buildingNameStyle}>{building.name}</div>
          <div style={buildingDescStyle}>{building.description}</div>
        </div>
        {!unlocked && (
          <button style={buttonStyle(canUnlock)} disabled={!canUnlock} onClick={() => playerProgress.unlockBuilding(building.id, building.unlockCost)}>
            Unlock — {formatCost(building.unlockCost)}
          </button>
        )}
      </div>

      {unlocked && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {upgrades.map((upgrade) => (
            <UpgradeRow key={upgrade.id} upgrade={upgrade} progress={progress} />
          ))}
          {building.id === 'factory' && progress.unlockedUpgrades.includes('auto-targeting') && (
            <label style={toggleRowStyle}>
              <span>Auto-Targeting</span>
              <input
                type="checkbox"
                checked={progress.autoTargetEnabled}
                onChange={(e) => playerProgress.setAutoTarget(e.target.checked)}
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}

function UpgradeRow({ upgrade, progress }: { upgrade: UpgradeDef; progress: ProgressSnapshot }) {
  const owned = progress.unlockedUpgrades.includes(upgrade.id);
  const affordable = playerProgress.canAfford(upgrade.cost);

  return (
    <div style={zoneRowStyle}>
      <div>
        <div>{upgrade.name}</div>
        <div style={upgradeDescStyle}>{upgrade.description}</div>
      </div>
      {owned ? (
        <span style={ownedLabelStyle}>Owned</span>
      ) : (
        <button style={buttonStyle(affordable)} disabled={!affordable} onClick={() => playerProgress.purchaseUpgrade(upgrade.id, upgrade.cost)}>
          {formatCost(upgrade.cost)}
        </button>
      )}
    </div>
  );
}

/** Local-dev-only cheat panel (import.meta.env.DEV-gated, see App()) for
 *  poking at save state directly — editing item totals, flipping upgrade/
 *  building/zone unlock flags, forcing a fresh save. Deliberately styled
 *  distinctly (cool blue) from the parchment/gold Town UI so it always
 *  reads as "debug tool," not part of the actual game. */
function DevPanel({ progress }: { progress: ProgressSnapshot }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={devWrapStyle}>
      <button style={devToggleStyle} onClick={() => setOpen((o) => !o)}>
        {open ? 'Close Dev' : 'Dev'}
      </button>
      {open && (
        <div style={devPanelStyle}>
          <div style={devSectionTitleStyle}>Gold</div>
          <input
            type="number"
            value={progress.gold}
            onChange={(e) => playerProgress.devSetGold(Number(e.target.value))}
            style={devInputStyle}
          />

          <div style={devSectionTitleStyle}>Items</div>
          {Object.values(ITEMS).map((item) => {
            const qty = progress.slots.reduce((sum, slot) => (slot && slot.itemId === item.id ? sum + slot.qty : sum), 0);
            return (
              <div key={item.id} style={devRowStyle}>
                <span>{item.name}</span>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) => playerProgress.devSetItemQty(item.id, Number(e.target.value), item.maxStack)}
                  style={devInputStyle}
                />
              </div>
            );
          })}

          <div style={devSectionTitleStyle}>Zones</div>
          {Object.values(ZONES).map((zone) => (
            <label key={zone.id} style={devRowStyle}>
              <span>{zone.name}</span>
              <input
                type="checkbox"
                checked={progress.unlockedZoneIds.includes(zone.id)}
                onChange={(e) => playerProgress.devSetZoneUnlocked(zone.id, e.target.checked)}
              />
            </label>
          ))}

          <div style={devSectionTitleStyle}>Buildings</div>
          {Object.values(BUILDINGS).map((building) => (
            <label key={building.id} style={devRowStyle}>
              <span>{building.name}</span>
              <input
                type="checkbox"
                checked={progress.unlockedBuildings.includes(building.id)}
                onChange={(e) => playerProgress.devSetBuildingUnlocked(building.id, e.target.checked)}
              />
            </label>
          ))}

          <div style={devSectionTitleStyle}>Upgrades</div>
          {Object.values(UPGRADES).map((upgrade) => (
            <label key={upgrade.id} style={devRowStyle}>
              <span>{upgrade.name}</span>
              <input
                type="checkbox"
                checked={progress.unlockedUpgrades.includes(upgrade.id)}
                onChange={(e) => playerProgress.devSetUpgradeUnlocked(upgrade.id, e.target.checked)}
              />
            </label>
          ))}

          <label style={devRowStyle}>
            <span>Auto-Targeting active</span>
            <input type="checkbox" checked={progress.autoTargetEnabled} onChange={(e) => playerProgress.setAutoTarget(e.target.checked)} />
          </label>

          <button
            style={devResetButtonStyle}
            onClick={() => {
              clearSavedProgress();
              window.location.reload();
            }}
          >
            Reset Save (reload)
          </button>
        </div>
      )}
    </div>
  );
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

const buildingCardStyle: CSSProperties = {
  padding: '10px 12px',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(232,217,168,0.15)',
  borderRadius: 8,
};

const buildingNameStyle: CSSProperties = { fontFamily: 'Cinzel, serif', fontSize: 15, letterSpacing: '0.04em' };
const buildingDescStyle: CSSProperties = { fontSize: 12, opacity: 0.7, marginTop: 2 };
const upgradeDescStyle: CSSProperties = { fontSize: 11, opacity: 0.65, marginTop: 2, maxWidth: 340 };
const ownedLabelStyle: CSSProperties = { fontSize: 12, opacity: 0.6 };

const toggleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 10px',
  background: 'rgba(255,255,255,0.05)',
  borderRadius: 6,
  cursor: 'pointer',
};

const devWrapStyle: CSSProperties = {
  position: 'fixed',
  top: 12,
  left: 12,
  zIndex: 20,
  fontFamily: 'Spectral, serif',
};

const devToggleStyle: CSSProperties = {
  pointerEvents: 'auto',
  padding: '4px 10px',
  background: 'rgba(0,0,0,0.55)',
  border: '1px solid rgba(120,200,255,0.5)',
  borderRadius: 6,
  color: '#9fd8ff',
  fontSize: 12,
  cursor: 'pointer',
};

const devPanelStyle: CSSProperties = {
  pointerEvents: 'auto',
  marginTop: 8,
  width: 260,
  maxHeight: '75vh',
  overflowY: 'auto',
  background: 'rgba(10,15,20,0.94)',
  border: '1px solid rgba(120,200,255,0.35)',
  borderRadius: 8,
  padding: 12,
  color: '#cfe9ff',
  fontSize: 12,
};

const devSectionTitleStyle: CSSProperties = {
  fontFamily: 'Cinzel, serif',
  fontSize: 11,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  opacity: 0.8,
  margin: '10px 0 4px',
};

const devRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '3px 0',
  gap: 8,
};

const devInputStyle: CSSProperties = {
  width: 70,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(120,200,255,0.3)',
  borderRadius: 4,
  color: '#cfe9ff',
  padding: '2px 6px',
  fontSize: 12,
};

const devResetButtonStyle: CSSProperties = {
  marginTop: 10,
  width: '100%',
  padding: '6px 10px',
  background: 'rgba(255,90,90,0.15)',
  border: '1px solid rgba(255,120,120,0.5)',
  borderRadius: 6,
  color: '#ffb3b3',
  cursor: 'pointer',
  fontFamily: 'Spectral, serif',
  fontSize: 12,
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
