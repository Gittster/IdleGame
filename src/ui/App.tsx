import { useEffect, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { playerProgress } from '../game/state/session';
import { sceneBridge, type Screen } from '../game/state/sceneBridge';
import { clearSavedProgress } from '../game/state/persistence';
import { isDevModeEnabled, disableDevMode } from '../game/state/devMode';
import { inventoryStore } from '../game/state/inventoryStore';
import { settingsStore } from '../game/state/settingsStore';
import { pauseStore } from '../game/state/pauseStore';
import { townNavStore, type TownView } from '../game/state/townNavStore';
import { ZONES } from '../data/zones';
import { ITEMS, type ItemDef } from '../data/items';
import { BUILDINGS } from '../data/buildings';
import type { Cost, BuildingId } from '../data/buildings';
import { UPGRADES, type UpgradeDef } from '../data/upgrades';
import type { ProgressSnapshot, ShipState } from '../sim/core/playerProgress';
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
  const inventoryOpen = useSyncExternalStore(
    (cb) => inventoryStore.subscribe(cb),
    () => inventoryStore.isOpen()
  );
  const settingsOpen = useSyncExternalStore(
    (cb) => settingsStore.subscribe(cb),
    () => settingsStore.isOpen()
  );
  const paused = useSyncExternalStore(
    (cb) => pauseStore.subscribe(cb),
    () => pauseStore.isPaused()
  );
  const townView = useSyncExternalStore(
    (cb) => townNavStore.subscribe(cb),
    () => townNavStore.getView()
  );

  // Global keybindings, handled once here rather than split between
  // Phaser and React: "I" toggles Inventory (works the same in combat or
  // town), Space pauses/unpauses combat specifically, and Escape toggles
  // the Settings panel (which pauses combat on its own via isOpen()).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;

      if (e.key.toLowerCase() === 'i') {
        inventoryStore.toggle();
      } else if (e.key === ' ' || e.code === 'Space') {
        // preventDefault always, not just when it pauses: a focused HUD
        // button would otherwise also treat Space as "click me".
        e.preventDefault();
        if (sceneBridge.getScreen() === 'combat') pauseStore.toggle();
      } else if (e.key === 'Escape') {
        settingsStore.setOpen(!settingsStore.isOpen());
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Gold/Supplies hide only on Town's decluttered home screen — every
  // sub-page (a building, Trading, Zones), Combat, and the Inventory
  // overlay all show them, since a balance is directly relevant there.
  const showGold = screen !== 'town' || inventoryOpen || townView !== 'home';

  let modal: ReactNode = null;
  if (settingsOpen) modal = <SettingsPanel progress={progress} />;
  else if (inventoryOpen) modal = <InventoryPanel progress={progress} />;
  else if (screen === 'town') modal = <TownPanel progress={progress} />;

  return (
    <>
      <HudStack
        screen={screen}
        gold={progress.gold}
        supplies={progress.supplies}
        showGold={showGold}
        inventoryOpen={inventoryOpen}
        settingsOpen={settingsOpen}
      />
      {paused && !settingsOpen && screen === 'combat' && <PausedBanner />}
      {modal}
      {isDevModeEnabled && <DevPanel progress={progress} />}
    </>
  );
}

const FULLSCREEN_AVAILABLE = typeof document !== 'undefined' && document.fullscreenEnabled;

/**
 * Every top-right HUD chrome element (gold, fullscreen, town, inventory,
 * settings) lives in one flex-column stack now, sized to content with a
 * simple gap — a single source of truth for this corner's layout, so
 * nothing can independently drift into overlapping something else the
 * way the old mix of Phaser-positioned and React-positioned buttons did.
 */
function HudStack({
  screen,
  gold,
  supplies,
  showGold,
  inventoryOpen,
  settingsOpen,
}: {
  screen: Screen;
  gold: number;
  supplies: number;
  showGold: boolean;
  inventoryOpen: boolean;
  settingsOpen: boolean;
}) {
  return (
    <div style={hudStackStyle}>
      {showGold && <div style={goldPillStyle}>Gold: {gold}</div>}
      {showGold && <div style={goldPillStyle}>Supplies: {supplies}</div>}
      {FULLSCREEN_AVAILABLE && (
        <button style={hudButtonStyle} onClick={() => sceneBridge.toggleFullscreen()}>
          Fullscreen
        </button>
      )}
      {screen === 'combat' && (
        <button style={hudButtonStyle} onClick={() => sceneBridge.goToTown()}>
          Town
        </button>
      )}
      <button style={hudButtonStyle} onClick={() => inventoryStore.toggle()}>
        {inventoryOpen ? 'Close Inventory' : 'Inventory [I]'}
      </button>
      <button style={hudButtonStyle} onClick={() => settingsStore.setOpen(!settingsOpen)}>
        {settingsOpen ? 'Close Settings' : 'Settings [Esc]'}
      </button>
    </div>
  );
}

function PausedBanner() {
  return <div style={pausedBannerStyle}>Paused — press Space to resume</div>;
}

/**
 * Town is a small hub-and-spoke router rather than one long stacked
 * panel: a home screen of nav tiles (one per building, plus Trading and
 * Zones), each opening its own dedicated sub-page with a back button.
 * Adding another mechanic later means adding another tile + page, not
 * finding room in an ever-growing single list. The current sub-page
 * lives in townNavStore rather than local state — see that file for why.
 */
function TownPanel({ progress }: { progress: ProgressSnapshot }) {
  const view = useSyncExternalStore(
    (cb) => townNavStore.subscribe(cb),
    () => townNavStore.getView()
  );
  const onBack = () => townNavStore.setView('home');

  if (view === 'zones') return <ZonesView progress={progress} onBack={onBack} />;
  if (view === 'trading') return <TradingPostView progress={progress} onBack={onBack} />;
  if (view !== 'home') return <BuildingView buildingId={view} progress={progress} onBack={onBack} />;
  return <TownHome progress={progress} onNavigate={(v) => townNavStore.setView(v)} />;
}

function TownHome({ progress, onNavigate }: { progress: ProgressSnapshot; onNavigate: (view: TownView) => void }) {
  return (
    <div style={overlayStyle}>
      <div style={{ ...cardStyle, width: 'min(640px, 94vw)' }}>
        <h1 style={titleStyle}>Town</h1>
        <div style={navGridStyle}>
          {Object.values(BUILDINGS).map((building) => (
            <NavTile
              key={building.id}
              title={building.name}
              subtitle={building.description}
              badge={progress.unlockedBuildings.includes(building.id) ? undefined : 'Locked'}
              onClick={() => onNavigate(building.id)}
            />
          ))}
          <NavTile
            title="The Trading Post"
            subtitle="Send ships out with drops, trade for supplies."
            badge={tradingBadge(progress.ships)}
            onClick={() => onNavigate('trading')}
          />
          <NavTile title="Zones" subtitle="Choose where to fight." onClick={() => onNavigate('zones')} />
        </div>
      </div>
    </div>
  );
}

function tradingBadge(ships: readonly ShipState[]): string | undefined {
  const atSea = ships.filter((s) => s.status === 'at_sea').length;
  return atSea > 0 ? `${atSea} ship${atSea === 1 ? '' : 's'} at sea` : undefined;
}

function NavTile({ title, subtitle, badge, onClick }: { title: string; subtitle: string; badge?: string; onClick: () => void }) {
  return (
    <button style={navTileStyle} onClick={onClick}>
      <div style={navTileTitleStyle}>{title}</div>
      <div style={navTileSubtitleStyle}>{subtitle}</div>
      {badge && <div style={navTileBadgeStyle}>{badge}</div>}
    </button>
  );
}

function BuildingView({ buildingId, progress, onBack }: { buildingId: BuildingId; progress: ProgressSnapshot; onBack: () => void }) {
  const building = BUILDINGS[buildingId];
  const unlocked = progress.unlockedBuildings.includes(building.id);
  const canUnlock = playerProgress.canAfford(building.unlockCost);
  const hideCompletedUpgrades = useSyncExternalStore(
    (cb) => settingsStore.subscribe(cb),
    () => settingsStore.getHideCompletedUpgrades()
  );
  const allUpgrades = Object.values(UPGRADES).filter((u) => u.building === building.id);
  const visibleUpgrades = hideCompletedUpgrades ? allUpgrades.filter((u) => !progress.unlockedUpgrades.includes(u.id)) : allUpgrades;

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={modalHeaderStyle}>
          <h1 style={titleStyle}>{building.name}</h1>
          <button style={closeButtonStyle} onClick={onBack}>
            ← Town
          </button>
        </div>
        <p style={subtleStyle}>{building.description}</p>

        {!unlocked && (
          <button
            style={buttonStyle(canUnlock)}
            disabled={!canUnlock}
            onClick={() => playerProgress.unlockBuilding(building.id, building.unlockCost)}
          >
            Unlock — {formatCost(building.unlockCost)}
          </button>
        )}

        {unlocked && (
          <>
            <div style={buildingsHeaderStyle}>
              <h2 style={{ ...sectionStyle, margin: 0 }}>Upgrades</h2>
              <label style={inlineCheckboxStyle}>
                <input
                  type="checkbox"
                  checked={hideCompletedUpgrades}
                  onChange={(e) => settingsStore.setHideCompletedUpgrades(e.target.checked)}
                />
                <span>Hide completed upgrades</span>
              </label>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visibleUpgrades.map((upgrade) => (
                <UpgradeRow key={upgrade.id} upgrade={upgrade} progress={progress} />
              ))}
              {visibleUpgrades.length === 0 && <span style={upgradeDescStyle}>All upgrades owned.</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ZonesView({ progress, onBack }: { progress: ProgressSnapshot; onBack: () => void }) {
  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={modalHeaderStyle}>
          <h1 style={titleStyle}>Zones</h1>
          <button style={closeButtonStyle} onClick={onBack}>
            ← Town
          </button>
        </div>
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

/** Trading Post: dock/at-sea ships, each either ready to load with a
 *  drop-item + quantity, or showing a live countdown to its return. A
 *  1s tick keeps that countdown fresh and, while any ship is at sea,
 *  also calls resolveDueShips() so a completed voyage credits Supplies
 *  the moment this panel is open to see it (the autosave interval
 *  handles it anyway when the panel isn't open). */
function TradingPostView({ progress, onBack }: { progress: ProgressSnapshot; onBack: () => void }) {
  const [, setTick] = useState(0);
  const hasShipAtSea = progress.ships.some((s) => s.status === 'at_sea');

  useEffect(() => {
    if (!hasShipAtSea) return;
    const id = setInterval(() => {
      playerProgress.resolveDueShips();
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [hasShipAtSea]);

  const tradableItems = Object.values(ITEMS).filter((item) => progress.slots.some((slot) => slot?.itemId === item.id && slot.qty > 0));

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={modalHeaderStyle}>
          <h1 style={titleStyle}>Trading Post</h1>
          <button style={closeButtonStyle} onClick={onBack}>
            ← Town
          </button>
        </div>
        <p style={subtleStyle}>Supplies: {progress.supplies}</p>

        <h2 style={sectionStyle}>Ships</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {progress.ships.map((ship, i) => (
            <ShipRow key={i} ship={ship} shipIndex={i} tradableItems={tradableItems} progress={progress} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ShipRow({
  ship,
  shipIndex,
  tradableItems,
  progress,
}: {
  ship: ShipState;
  shipIndex: number;
  tradableItems: ItemDef[];
  progress: ProgressSnapshot;
}) {
  const [selectedItemId, setSelectedItemId] = useState(tradableItems[0]?.id ?? '');
  const [qty, setQty] = useState(1);

  if (ship.status === 'at_sea') {
    const remainingS = Math.max(0, Math.ceil((ship.returnAt - Date.now()) / 1000));
    const cargoName = ITEMS[ship.cargoItemId]?.name ?? ship.cargoItemId;
    return (
      <div style={shipRowStyle}>
        <div>
          Ship {shipIndex + 1} — at sea with {ship.cargoQty} {cargoName}
        </div>
        <div style={ownedLabelStyle}>{remainingS > 0 ? `Returns in ${remainingS}s` : 'Returning...'}</div>
      </div>
    );
  }

  const have = selectedItemId
    ? progress.slots.reduce((sum, slot) => (slot && slot.itemId === selectedItemId ? sum + slot.qty : sum), 0)
    : 0;
  const clampedQty = Math.min(Math.max(1, qty), Math.max(1, have));
  const canSend = tradableItems.length > 0 && have > 0 && clampedQty <= have;

  return (
    <div style={shipRowStyle}>
      <div>Ship {shipIndex + 1} — docked</div>
      {tradableItems.length === 0 ? (
        <span style={upgradeDescStyle}>No drops to trade yet — clear a zone first.</span>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedItemId}
            onChange={(e) => {
              setSelectedItemId(e.target.value);
              setQty(1);
            }}
            style={selectStyle}
          >
            {tradableItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.tradeValue}/ea)
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            max={have}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            style={qtyInputStyle}
          />
          <button style={buttonStyle(canSend)} disabled={!canSend} onClick={() => playerProgress.sendShip(shipIndex, selectedItemId, clampedQty)}>
            Send Ship
          </button>
        </div>
      )}
    </div>
  );
}

/** The Inventory overlay — gold total, the slot grid, and the expand
 *  purchase — available over both Combat and Town via inventoryStore
 *  (the "I" key or the HUD button), rather than living inside Town's own
 *  panel. Takes over in place of whatever other modal would show, per
 *  App()'s modal precedence. */
function InventoryPanel({ progress }: { progress: ProgressSnapshot }) {
  const cost = expandCost(progress.capacity);
  const canExpand = progress.gold >= cost;
  const filled = progress.slots.filter((slot) => slot !== null).length;

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={modalHeaderStyle}>
          <h1 style={titleStyle}>Inventory</h1>
          <button style={closeButtonStyle} onClick={() => inventoryStore.setOpen(false)}>
            Close
          </button>
        </div>
        <p style={subtleStyle}>Gold: {progress.gold}</p>

        <h2 style={sectionStyle}>
          Items — {filled}/{progress.capacity}
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
      </div>
    </div>
  );
}

/** Combat Settings — reachable via the Settings HUD button (or Escape)
 *  from both Combat, where opening it also pauses the sim (see
 *  CombatScene.update), and Town. Houses ongoing on/off toggles like
 *  Auto-Targeting, as opposed to one-time purchases which stay listed
 *  under their building in Town. */
function SettingsPanel({ progress }: { progress: ProgressSnapshot }) {
  const autoTargetingOwned = progress.unlockedUpgrades.includes('auto-targeting');

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={modalHeaderStyle}>
          <h1 style={titleStyle}>Settings</h1>
          <button style={closeButtonStyle} onClick={() => settingsStore.setOpen(false)}>
            Close
          </button>
        </div>

        {autoTargetingOwned ? (
          <label style={zoneRowStyle}>
            <span>Auto-Targeting</span>
            <input
              type="checkbox"
              checked={progress.autoTargetEnabled}
              onChange={(e) => playerProgress.setAutoTarget(e.target.checked)}
            />
          </label>
        ) : (
          <p style={subtleStyle}>Unlock Auto-Targeting at The Factory to enable it here.</p>
        )}
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
  if (cost.supplies) parts.push(`${cost.supplies} supplies`);
  for (const { itemId, qty } of cost.items) parts.push(`${qty} ${ITEMS[itemId]!.name}`);
  return parts.join(', ');
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

          <div style={devSectionTitleStyle}>Supplies</div>
          <input
            type="number"
            value={progress.supplies}
            onChange={(e) => playerProgress.devSetSupplies(Number(e.target.value))}
            style={devInputStyle}
          />

          <div style={devSectionTitleStyle}>Ships</div>
          {progress.ships.map((ship, i) => (
            <div key={i} style={devRowStyle}>
              <span>
                Ship {i + 1}: {ship.status}
              </span>
              {ship.status === 'at_sea' && (
                <button style={devSmallButtonStyle} onClick={() => playerProgress.devForceShipReturn(i)}>
                  Force Return
                </button>
              )}
            </div>
          ))}

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
          <button
            style={{ ...devResetButtonStyle, marginTop: 6 }}
            onClick={() => {
              disableDevMode();
              window.location.reload();
            }}
          >
            Disable Dev Mode (reload)
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

const upgradeDescStyle: CSSProperties = { fontSize: 11, opacity: 0.65, marginTop: 2, maxWidth: 340 };
const ownedLabelStyle: CSSProperties = { fontSize: 12, opacity: 0.6 };

const navGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 12,
};

const navTileStyle: CSSProperties = {
  textAlign: 'left',
  padding: '14px 16px',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(232,217,168,0.2)',
  borderRadius: 10,
  color: '#e8d9a8',
  cursor: 'pointer',
  fontFamily: 'Spectral, serif',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const navTileTitleStyle: CSSProperties = { fontFamily: 'Cinzel, serif', fontSize: 15, letterSpacing: '0.04em' };
const navTileSubtitleStyle: CSSProperties = { fontSize: 12, opacity: 0.7 };
const navTileBadgeStyle: CSSProperties = {
  marginTop: 4,
  alignSelf: 'flex-start',
  fontSize: 10,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  padding: '2px 6px',
  borderRadius: 4,
  background: 'rgba(232,217,168,0.15)',
  opacity: 0.85,
};

const shipRowStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: '10px 12px',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(232,217,168,0.15)',
  borderRadius: 8,
};

const selectStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(232,217,168,0.3)',
  borderRadius: 4,
  color: '#e8d9a8',
  padding: '4px 6px',
  fontFamily: 'Spectral, serif',
  fontSize: 12,
};

const qtyInputStyle: CSSProperties = { ...selectStyle, width: 56 };

const buildingsHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  margin: '16px 0 8px',
};

const inlineCheckboxStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 12,
  opacity: 0.75,
  cursor: 'pointer',
};

const modalHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
};

const closeButtonStyle: CSSProperties = {
  padding: '4px 10px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(232,217,168,0.3)',
  borderRadius: 6,
  color: '#e8d9a8',
  cursor: 'pointer',
  fontFamily: 'Spectral, serif',
  fontSize: 12,
};

const hudStackStyle: CSSProperties = {
  position: 'fixed',
  top: 12,
  right: 12,
  zIndex: 15,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  alignItems: 'flex-end',
};

const goldPillStyle: CSSProperties = {
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
};

const hudButtonStyle: CSSProperties = {
  pointerEvents: 'auto',
  padding: '4px 10px',
  background: 'rgba(0,0,0,0.55)',
  border: '1px solid rgba(232,217,168,0.4)',
  borderRadius: 6,
  color: '#e8d9a8',
  fontFamily: 'Spectral, serif',
  fontSize: 12,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const pausedBannerStyle: CSSProperties = {
  position: 'fixed',
  top: '40%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  pointerEvents: 'none',
  fontFamily: 'Cinzel, serif',
  fontSize: 28,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#e8d9a8',
  textShadow: '0 2px 12px rgba(0,0,0,0.8)',
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

const devSmallButtonStyle: CSSProperties = {
  padding: '2px 6px',
  background: 'rgba(120,200,255,0.15)',
  border: '1px solid rgba(120,200,255,0.4)',
  borderRadius: 4,
  color: '#9fd8ff',
  cursor: 'pointer',
  fontSize: 11,
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
