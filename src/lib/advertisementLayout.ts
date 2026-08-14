export type AdvertisementOrientation = 'horizontal' | 'vertical';

export function advertisementOrientation(ratio: number): AdvertisementOrientation {
  return ratio >= 1 ? 'horizontal' : 'vertical';
}

export function advertisementWidths(ratios: number[]): `${number}%`[] {
  const orientations = ratios.map(advertisementOrientation);
  if (ratios.length === 1) {
    return [orientations[0] === 'vertical' ? '34%' : '52%'];
  }

  const mixedPair = ratios.length === 2 && orientations[0] !== orientations[1];
  return orientations.map((orientation) =>
    mixedPair ? orientation === 'vertical' ? '44%' : '82%' : orientation === 'vertical' ? '42%' : '48.5%');
}