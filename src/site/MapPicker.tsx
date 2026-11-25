import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { chaimama as copy } from '@/content';
import { toKurdishDigits } from '@/content/kurdish';
import type { Locale } from '@/content/types';
import type { Place } from './checkout';

/**
 * Pick where to deliver (DECISIONS CM-019): a full-screen map (OpenStreetMap, as on the owner's own shop) under a
 * pin that stays in the middle — the visitor moves the map until the pin is on their door, which is easier with
 * a thumb than dragging a marker. Search a place, street or landmark; or find their position (with how precise
 * it is). Where the pin rests, its address is looked up (OpenStreetMap's Nominatim) and shown.
 *
 * Loaded only when it is opened (its own chunk, with Leaflet): the shop stays light.
 */
interface Props {
  lang: Locale;
  /** Where to open: the place pinned before, else Erbil. */
  start?: Place | null;
  onUse: (place: Place) => void;
  onCancel: () => void;
  /** The map could not load: the checkout asks for the address in words instead. */
  onFail: () => void;
}

const ERBIL: [number, number] = [36.1911, 44.0092];
const NOMINATIM = 'https://nominatim.openstreetmap.org';

interface Found {
  label: string;
  city?: string;
  country?: string;
}

type Address = Record<string, string | undefined>;

/** A short, readable address: street, area, city (what a driver needs), else Nominatim's full line. */
function shortAddress(a: Address | undefined, full: string, lang: Locale): Found {
  const city = a?.city ?? a?.town ?? a?.village ?? a?.county ?? a?.state;
  const area = a?.neighbourhood ?? a?.suburb ?? a?.quarter ?? a?.city_district;
  const road = a?.road ? [a.house_number, a.road].filter(Boolean).join(' ') : undefined;
  const parts = [road, area, city].filter(Boolean) as string[];
  return { label: parts.length ? parts.join(lang === 'ckb' ? '، ' : ', ') : full, city, country: a?.country };
}

export default function MapPicker({ lang, start, onUse, onCancel, onFail }: Props) {
  const m = copy.checkout.map;
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const [moving, setMoving] = useState(false);
  const [found, setFound] = useState<Found | null>(start?.label ? { label: start.label } : null);
  const [looking, setLooking] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<(Found & { lat: number; lng: number })[]>([]);
  const [failed, setFailed] = useState(false);
  const lookup = useRef<AbortController | null>(null);
  const digits = (n: number) => (lang === 'ckb' ? toKurdishDigits(n) : String(n));

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const at: [number, number] =
      start?.lat !== undefined && start.lng !== undefined ? [start.lat, start.lng] : ERBIL;
    const mp = L.map(el, { zoomControl: false, attributionControl: true }).setView(
      at,
      start?.lat !== undefined ? 17 : 13,
    );
    map.current = mp;
    let loaded = 0;
    let errors = 0;
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    })
      .on('tileload', () => loaded++)
      .on('tileerror', () => {
        errors++;
        if (!loaded && errors > 4) setFailed(true);
      })
      .addTo(mp);
    L.control.zoom({ position: 'bottomright' }).addTo(mp);
    // No tile at all after a while: no map here (offline, blocked).
    const giveUp = window.setTimeout(() => {
      if (!loaded) setFailed(true);
    }, 9000);

    const reverse = () => {
      if (map.current !== mp) return;
      lookup.current?.abort();
      const ctrl = new AbortController();
      lookup.current = ctrl;
      const c = mp.getCenter();
      setLooking(true);
      fetch(
        `${NOMINATIM}/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=${lang === 'ckb' ? 'ckb,ar,en' : 'en'}&lat=${c.lat.toFixed(6)}&lon=${c.lng.toFixed(6)}`,
        { signal: ctrl.signal },
      )
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((d: { display_name?: string; address?: Address }) => {
          setFound(shortAddress(d.address, d.display_name ?? '', lang));
        })
        .catch(() => {
          if (!ctrl.signal.aborted) setFound(null);
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setLooking(false);
        });
    };
    let settle = 0;
    mp.on('movestart', () => {
      window.clearTimeout(settle);
      setMoving(true);
    });
    mp.on('moveend', () => {
      setMoving(false);
      window.clearTimeout(settle);
      settle = window.setTimeout(reverse, 450);
    });
    // Where the pin stands at first is looked up too (it may be used without moving the map).
    mp.whenReady(reverse);
    return () => {
      window.clearTimeout(giveUp);
      window.clearTimeout(settle);
      lookup.current?.abort();
      // A zoom still animating ends 250 ms later on a timer Leaflet does not clear on remove(): it would find
      // its panes gone and throw. The map is going: that end has nothing left to do, and no move is heard.
      mp.off();
      (mp as unknown as { _animatingZoom: boolean })._animatingZoom = false;
      mp.stop();
      mp.remove();
      map.current = null;
    };
    // Built once; the start place is read on opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search, a moment after the typing stops.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) return;
    const ctrl = new AbortController();
    const id = window.setTimeout(() => {
      fetch(
        `${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=5&accept-language=${lang === 'ckb' ? 'ckb,ar,en' : 'en'}&q=${encodeURIComponent(q)}`,
        { signal: ctrl.signal },
      )
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((rows: { lat: string; lon: string; display_name: string; address?: Address }[]) =>
          setResults(
            rows.map((r) => ({
              ...shortAddress(r.address, r.display_name, lang),
              lat: Number(r.lat),
              lng: Number(r.lon),
            })),
          ),
        )
        .catch(() => {});
    }, 400);
    return () => {
      window.clearTimeout(id);
      ctrl.abort();
    };
  }, [query, lang]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onCancel]);

  const findMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setAccuracy(Math.round(pos.coords.accuracy));
        map.current?.setView([pos.coords.latitude, pos.coords.longitude], 17);
      },
      () => setAccuracy(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  };

  const use = () => {
    const c = map.current?.getCenter();
    if (!c) return;
    // No address for it (the lookup failed): the driver gets the point itself.
    const label = found?.label || `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`;
    onUse({ lat: c.lat, lng: c.lng, label, city: found?.city, country: found?.country });
  };

  return (
    <div className="chai-map" role="dialog" aria-modal="true" aria-label={m.title} data-testid="chai-map">
      <div ref={host} className="chai-map__canvas" />
      {/* The pin stays in the middle; it lifts while the map moves and lands when it stops. */}
      <div className="chai-map__pin" data-moving={moving || undefined} aria-hidden="true">
        <svg viewBox="0 0 32 44" width="36" height="50">
          <path
            d="M16 43s14-15.2 14-26.5C30 7.9 23.7 2 16 2S2 7.9 2 16.5C2 27.8 16 43 16 43Z"
            fill="#241a13"
            stroke="#fff7e6"
            strokeWidth="2"
          />
          <circle cx="16" cy="16.5" r="5.5" fill="#fea500" />
        </svg>
        <span className="chai-map__shadow" />
      </div>

      <div className="chai-map__top">
        <button type="button" className="chai-map__round" onClick={onCancel} aria-label={m.cancel}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 7l10 10M17 7 7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <div className="chai-map__search">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim().length < 3) setResults([]);
            }}
            placeholder={m.search}
            aria-label={m.search}
            enterKeyHint="search"
            data-testid="chai-map-search"
          />
          {results.length > 0 && (
            <ul className="chai-map__results" role="listbox" aria-label={m.search}>
              {results.map((r, i) => (
                <li key={i}>
                  <button
                    type="button"
                    role="option"
                    aria-selected="false"
                    onClick={() => {
                      map.current?.setView([r.lat, r.lng], 17);
                      setResults([]);
                      setQuery('');
                    }}
                  >
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="chai-map__sheet">
        {failed ? (
          <>
            <p className="chai-map__where">{m.failed}</p>
            <button type="button" className="chai-checkout__go" onClick={onFail}>
              {m.typeInstead}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="chai-map__find" onClick={findMe} data-testid="chai-map-find">
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              <span>{m.find}</span>
            </button>
            <p className="chai-map__where" aria-live="polite" data-looking={looking || undefined}>
              {found?.label || m.hint}
            </p>
            {accuracy !== null && (
              <p className="chai-map__accuracy" data-rough={accuracy > 100 || undefined}>
                {m.accuracy(digits(accuracy))}
                {accuracy > 100 && <> · {m.rough}</>}
              </p>
            )}
            <button type="button" className="chai-checkout__go" onClick={use} data-testid="chai-map-use">
              {m.use}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
