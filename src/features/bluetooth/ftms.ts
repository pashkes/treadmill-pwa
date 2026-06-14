export const FTMS_SERVICE = '00001826-0000-1000-8000-00805f9b34fb';
export const TREADMILL_DATA_CHARACTERISTIC = '00002acd-0000-1000-8000-00805f9b34fb';

export type TreadmillData = {
  speedKph: number;
  distanceKm?: number;
};

function canRead(value: DataView, offset: number, bytes: number): boolean {
  return offset + bytes <= value.byteLength;
}

export function parseTreadmillData(value: DataView): TreadmillData {
  const flags = value.getUint16(0, true);
  let offset = 2;
  let speedKph = 0;

  if (!(flags & 0x0001) && canRead(value, offset, 2)) {
    speedKph = value.getUint16(offset, true) * 0.01;
    offset += 2;
  }

  if (flags & 0x0002) offset += 2; // average speed

  let distanceKm: number | undefined;
  if ((flags & 0x0004) && canRead(value, offset, 3)) {
    distanceKm = (value.getUint8(offset) | (value.getUint8(offset + 1) << 8) | (value.getUint8(offset + 2) << 16)) / 1000;
  }

  return { speedKph, distanceKm };
}
