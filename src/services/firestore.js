// src/services/firestore.js
//
// Lean Firestore service — minimises round trips.
// Key change: autoSave uses setDoc with merge:true instead of
// getDoc + conditional setDoc/updateDoc. That's ONE trip not TWO.

import {
  collection, doc,
  getDoc, getDocs,
  setDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase.js';

const COL = 'picks';

// ── WARMUP ────────────────────────────────────────────────────
// Establish the Firestore connection on app load.
// Uses a single lightweight getDoc on a non-existent doc —
// much cheaper than getDocs (which loads the whole collection).
export const warmupFirestore = () => {
  getDoc(doc(db, COL, '_warmup'))
    .then(() => console.log('[Firestore] Connection warmed up'))
    .catch(() => {}); // doc won't exist, that's fine — connection is open
};

// ── READ ──────────────────────────────────────────────────────

export const loadAllPicks = async () => {
  try {
    const snap = await getDocs(collection(db, COL));
    // Filter out the warmup doc if it somehow got created
    return snap.docs
      .filter(d => d.id !== '_warmup')
      .map(d => d.data());
  } catch (err) {
    console.error('[Firestore] loadAllPicks:', err);
    return [];
  }
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
// Uses setDoc with merge:true — ONE network trip, not two.
// merge:true means: if doc exists, merge fields; if not, create it.
// This replaces the old getDoc → conditional setDoc/updateDoc pattern.
export const autoSave = async (houseId, fields) => {
  try {
    await setDoc(
      doc(db, COL, houseId),
      { houseId, ...fields, lastUpdated: Date.now() },
      { merge: true }  // ← the key — merges into existing doc
    );
    return { ok: true };
  } catch (err) {
    console.error('[Firestore] autoSave:', err);
    return { ok: false };
  }
};

// ── FINAL SUBMISSION ─────────────────────────────────────────
// Allows resubmission before deadline — replaces previous picks entirely.
// submittedAt is always updated to the new submission time.
export const submitPick = async (houseId, fields) => {
  try {
    await setDoc(
      doc(db, COL, houseId),
      { houseId, ...fields, submittedAt: Date.now(), lastUpdated: Date.now() },
      { merge: true }
    );
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
    return { ok: true };
  } catch (err) {
    console.error('[Firestore] updateAvatar:', err);
    return { ok: false };
  }
};
