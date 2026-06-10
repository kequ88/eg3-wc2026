// src/services/firestore.js — REWRITTEN for bracket schema
//
// All Firestore operations in one place.
// Schema: /picks/{houseId} — one document per house.
//
// DOCUMENT SHAPE:
// {
//   houseId, name, avatar, ts,
//   progress: 'groups'|'r32'|'bracket'|'done',
//   groupStandings: { A:{first,second}, ..., L:{first,second} },
//   r32picks: { m73:'TeamName', m75:'TeamName', ... },   // 8 keys
//   bracketPicks: {
//     r16:   { m89:'Team', m90:'Team', ... },
//     qf:    { m97:'Team', ... },
//     sf:    { m101:'Team', m102:'Team' },
//     final: { m104:'Team' }
//   }
// }

import {
  collection, doc,
  getDoc, getDocs,
  setDoc, updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase.js';

const COL = 'picks';

// ── READ ──────────────────────────────────────────────────────

export const loadAllPicks = async () => {
  try {
    const snap = await getDocs(collection(db, COL));
    return snap.docs.map(d => d.data());
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

// ── CREATE (first submission) ─────────────────────────────────
// First-write-wins: rejects if house already submitted.
export const createPick = async (houseId, data) => {
  try {
    const ref      = doc(db, COL, houseId);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      return { ok: false, msg: `🏠 ${houseId} already submitted!` };
    }
    await setDoc(ref, data);
    return { ok: true };
  } catch (err) {
    console.error('[Firestore] createPick:', err);
    return { ok: false, msg: 'Failed to save. Please try again.' };
  }
};

// ── AUTO-SAVE (partial progress) ─────────────────────────────
// Called after each step completes. Merges fields — never overwrites.
// Creates the document on first save (with progress:'groups').
export const autoSave = async (houseId, fields) => {
  try {
    const ref = doc(db, COL, houseId);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await updateDoc(ref, fields);
    } else {
      await setDoc(ref, { houseId, ...fields, ts: Date.now() });
    }
    return { ok: true };
  } catch (err) {
    console.error('[Firestore] autoSave:', err);
    return { ok: false };
  }
};

// ── UPDATE (avatar / re-submission) ──────────────────────────
export const updateAvatar = async (houseId, base64) => {
  try {
    await updateDoc(doc(db, COL, houseId), { avatar: base64 });
    return { ok: true };
  } catch (err) {
    console.error('[Firestore] updateAvatar:', err);
    return { ok: false };
  }
};

// ── LOAD DRAFT (resume in-progress submission) ───────────────
// Returns existing draft document or null.
// Used on page load to resume where user left off.
export const loadDraft = async (houseId) => {
  const pick = await loadPick(houseId);
  if (!pick) return null;
  // Only return draft if not yet fully submitted
  if (pick.progress === 'done') return null;
  return pick;
};
