export type AdvertisementOrientation = 'horizontal' | 'vertical';

export const HORIZONTAL_AD_ASPECT = 16 / 9;
export const VERTICAL_AD_ASPECT = 3 / 4;

export function advertisementOrientation(ratio: number): AdvertisementOrientation {
  return ratio >= 1 ? 'horizontal' : 'vertical';
}

export function advertisementFrameRatio(ratio: number) {
  return advertisementOrientation(ratio) === 'horizontal' ? HORIZONTAL_AD_ASPECT : VERTICAL_AD_ASPECT;
}

export function advertisementWidths(ratios: number[]): `${number}%`[] {
  const orientations = ratios.map(advertisementOrientation);
  if (ratios.length === 1) {
    return [orientations[0] === 'vertical' ? '34%' : '100%'];
  }

  const mixedPair = ratios.length === 2 && orientations[0] !== orientations[1];
  return orientations.map((orientation) =>
    mixedPair ? orientation === 'vertical' ? '44%' : '100%' : orientation === 'vertical' ? '42%' : '49%');
}