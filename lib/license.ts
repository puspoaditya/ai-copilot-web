import { customAlphabet } from 'nanoid';

const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no ambiguous chars
const segment = customAlphabet(alphabet, 5);

export function generateLicenseKey(): string {
  return `AIC-${segment()}-${segment()}-${segment()}`;
  // e.g. AIC-X4K2M-9RTZP-WQBN6
}
