import assert from "node:assert/strict";

import { parseQuickTripChunk } from "../lib/quick-trip-entry/parser";

const now = new Date("2026-06-22T00:00:00+07:00");

const natural = parseQuickTripChunk(
  "Khach Anh Nam di tu Ha Noi den Hai Phong luc 8 gio sang, gia 150 nghin, sdt 0912345678, 2 khach",
  now,
);

assert.equal(natural.customerPhone, "0912345678");
assert.equal(natural.departure, "Ha Noi");
assert.equal(natural.destination, "Hai Phong");
assert.equal(natural.price, 150000);
assert.equal(natural.totalSeats, 2);
assert.equal(natural.departureTime, "2026-06-22T01:00:00.000Z");
assert.ok(!natural.missingFields.includes("departure"));
assert.ok(!natural.missingFields.includes("destination"));
assert.ok(!natural.missingFields.includes("price"));
assert.ok(!natural.missingFields.includes("departureTime"));

const veRoute = parseQuickTripChunk(
  "Mai co 2 khach tu Hai Phong ve Ha Noi luc 8h30 gia 150k lien he 0912345678",
  now,
);

assert.equal(veRoute.departure, "Hai Phong");
assert.equal(veRoute.destination, "Ha Noi");
assert.equal(veRoute.price, 150000);
assert.equal(veRoute.totalSeats, 2);
assert.equal(veRoute.customerPhone, "0912345678");

const fullNumberPrice = parseQuickTripChunk(
  "Can xe bao tron goi tu Ha Noi den Cat Ba luc 9 gio toi, khach tra 1800000, sdt 0912345678",
  now,
);

assert.equal(fullNumberPrice.tripType, "bao");
assert.equal(fullNumberPrice.departure, "Ha Noi");
assert.equal(fullNumberPrice.destination, "Cat Ba");
assert.equal(fullNumberPrice.price, 1800000);
assert.equal(fullNumberPrice.departureTime, "2026-06-22T14:00:00.000Z");

const quickNoteSpeech = parseQuickTripChunk(
  "Khong den bon nam phut, mot khach Kim Van, Kim Lu ve Le Chan, Hai Phong bon tram ca",
  now,
);

assert.equal(quickNoteSpeech.departure, "Kim Van, Kim Lu");
assert.equal(quickNoteSpeech.destination, "Le Chan, Hai Phong");
assert.equal(quickNoteSpeech.price, 400000);
assert.equal(quickNoteSpeech.totalSeats, 1);
assert.equal(
  quickNoteSpeech.departureTime,
  new Date(now.getTime() + 45 * 60 * 1000).toISOString(),
);
assert.ok(!quickNoteSpeech.missingFields.includes("departure"));
assert.ok(!quickNoteSpeech.missingFields.includes("destination"));
assert.ok(!quickNoteSpeech.missingFields.includes("price"));
assert.ok(!quickNoteSpeech.missingFields.includes("departureTime"));

const accentedQuickNoteSpeech = parseQuickTripChunk(
  "Không đến bốn năm phút, một khách Kim Văn, Kim Lũ về Lê Chân, Hải Phòng bốn trăm ca",
  now,
);

assert.equal(accentedQuickNoteSpeech.departure, "Kim Van, Kim Lu");
assert.equal(accentedQuickNoteSpeech.destination, "Le Chan, Hai Phong");
assert.equal(accentedQuickNoteSpeech.price, 400000);
assert.equal(accentedQuickNoteSpeech.totalSeats, 1);
assert.equal(
  accentedQuickNoteSpeech.departureTime,
  new Date(now.getTime() + 45 * 60 * 1000).toISOString(),
);

const quickNoteCompact = parseQuickTripChunk(
  "0-45p 1k Kim Van, Kim Lu - Le Chan, Hai Phong 400 ca",
  now,
);

assert.equal(quickNoteCompact.departure, "Kim Van, Kim Lu");
assert.equal(quickNoteCompact.destination, "Le Chan, Hai Phong");
assert.equal(quickNoteCompact.price, 400000);
assert.equal(quickNoteCompact.totalSeats, 1);
assert.equal(
  quickNoteCompact.departureTime,
  new Date(now.getTime() + 45 * 60 * 1000).toISOString(),
);

console.log("quick-trip smart parser checks passed");
