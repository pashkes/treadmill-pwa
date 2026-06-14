export const FTMS_SERVICE = '00001826-0000-1000-8000-00805f9b34fb';
export const TREADMILL_DATA_CHARACTERISTIC = '00002acd-0000-1000-8000-00805f9b34fb';

export type TreadmillData = {
  speedKph: number;
  distanceKm?: number;
};

export function parseTreadmillData(value: DataView): TreadmillData {
  const flags = value.getUint16(0, true);
  const speedKph = value.getUint16(2, true) * 0.01;
  const distanceKm =
    flags & 0x0004 ? (value.getUint8(4) | (value.getUint8(5) << 8) | (value.getUint8(6) << 16)) / 1000 : undefined;
  return { speedKph, distanceKm };
}
