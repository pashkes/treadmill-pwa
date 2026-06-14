import { describe, expect, it } from 'vitest';
import { parseTreadmillData } from './ftms';

function view(bytes: number[]): DataView {
  return new DataView(Uint8Array.from(bytes).buffer);
}

describe('parseTreadmillData', () => {
  it('parses speed and distance from the basic treadmill packet shape', () => {
    const data = parseTreadmillData(view([0x04, 0x00, 0x58, 0x02, 0xe8, 0x03, 0x00]));

    expect(data).toEqual({ speedKph: 6, distanceKm: 1 });
  });

  it('accounts for optional average speed before total distance', () => {
    const data = parseTreadmillData(view([0x06, 0x00, 0x58, 0x02, 0x20, 0x03, 0xd0, 0x07, 0x00]));

    expect(data).toEqual({ speedKph: 6, distanceKm: 2 });
  });

  it('parses elapsed time and calories when the treadmill reports them', () => {
    const data = parseTreadmillData(view([0x84, 0x04, 0x58, 0x02, 0xe8, 0x03, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x00, 0x7d, 0x00]));

    expect(data).toEqual({ speedKph: 6, distanceKm: 1, kcal: 42, elapsedSeconds: 125 });
  });

  it('parses treadmill inclination when the packet includes angle data', () => {
    const data = parseTreadmillData(view([0x0c, 0x00, 0x58, 0x02, 0xe8, 0x03, 0x00, 0x1f, 0x00, 0x1f, 0x00]));

    expect(data).toEqual({ speedKph: 6, distanceKm: 1, inclinePercent: 3.1 });
  });

  it('omits speed when the treadmill packet does not include instantaneous speed', () => {
    const data = parseTreadmillData(view([0x01, 0x00]));

    expect(data).toEqual({});
  });
});
