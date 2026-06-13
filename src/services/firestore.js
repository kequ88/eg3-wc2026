// src/services/firestore.js
//
// Lean Firestore service — minimises round trips.
// Key change: autoSave uses setDoc with merge:true instead of
// getDoc + conditional setDoc/updateDoc. That's ONE trip not TWO.
//
// Performance: loadAllPicksCached() wraps loadAllPicks() with a
// sessionStorage cache (5-min TTL) to avoid re-scanning the full
// collection on every leaderboard open.

import {
  collection, doc,
  getDoc, getDocs,
  setDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase.js';

const COL = 'picks';

// ── CACHE CONSTANTS ───────────────────────────────────────────
const PICKS_CACHE_KEY = 'eg3_picks_cache';
const PICKS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ── WARMUP ────────────────────────────────────────────────────
export const warmupFirestore = () => {
  getDoc(doc(db, COL, '_warmup'))
    .then(() => console.log('[Firestore] Connection warmed up'))
    .catch(() => {});
};

// ── READ ──────────────────────────────────────────────────────

export const loadAllPicks = async () => {
  try {
    const snap = await getDocs(collection(db, COL));
    return snap.docs
      .filter(d => d.id !== '_warmup')
      .map(d => d.data());
  } catch (err) {
    console.error('[Firestore] loadAllPicks:', err);
    return [];
  }
};

// Cached variant — skips Firestore read if data is fresh.
// The leaderboard calls this; admin can call loadAllPicks() directly
// to force a fresh read after entering results.
export const loadAllPicksCached = async () => {
  try {
    const raw = sessionStorage.getItem(PICKS_CACHE_KEY);
    if (raw) {
      const { data, ts } = JSON.parse(raw);
      if ((Date.now() - ts) < PICKS_CACHE_TTL) {
        console.log('[Firestore] picks from sessionStorage cache');
        return data;
      }
    }
  } catch (_) { /* corrupt entry — fall through to network */ }

  const data = await loadAllPicks();

  try {
    sessionStorage.setItem(PICKS_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch (_) { /* sessionStorage full (avatars?) — skip caching */ }

  return data;
};

// Invalidate the picks cache — call after admin writes new results
// so the next leaderboard open fetches fresh data.
export const bustPicksCache = () => {
  try { sessionStorage.removeItem(PICKS_CACHE_KEY); } catch (_) {}
};

export const loadPick = async (houseId) => {
  try {
    const snap = await getDoc(doc(db, COL, houseId));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error('[Firestore] loadPick:', err);
    return null;
  }
};

// ── AUTO-SAVE ─────────────────────────────────────────────────
export const autoSave = async (houseId, fields) => {
  try {
    await setDoc(
      doc(db, COL, houseId),
      { houseId, ...fields, lastUpdated: Date.now() },
      { merge: true }
    );
    return { ok: true };
  } catch (err) {
    console.error('[Firestore] autoSave:', err);
    return { ok: false };
  }
};

// ── FINAL SUBMISSION ─────────────────────────────────────────
export const submitPick = async (houseId, fields) => {
  try {
    await setDoc(
      doc(db, COL, houseId),
      { houseId, ...fields, submittedAt: Date.now(), lastUpdated: Date.now() },
      { merge: true }
    );
    bustPicksCache(); // user just submitted — next leaderboard open gets fresh data
    return { ok: true };
  } catch (err) {
    console.error('[Firestore] submitPick:', err);
    return { ok: false, msg: 'Failed to save. Please try again.' };
  }
};

// ── LOAD DRAFT ────────────────────────────────────────────────
export const loadDraft = async (houseId) => {
  const pick = await loadPick(houseId);
  if (!pick) return null;
  if (pick.progress === 'done') return null;
  return pick;
};

// ── UPDATE AVATAR ─────────────────────────────────────────────
export const updateAvatar = async (houseId, base64) => {
  try {
    await setDoc(
      doc(db, COL, houseId),
      { avatar: base64 },
      { merge: true }
    );
    bustPicksCache(); // avatar changed — stale cache would show old one
    return { ok: true };
  } catch (err) {
    console.error('[Firestore] updateAvatar:', err);
    return { ok: false };
  }
};
