export function isActiveAsset(asset: { status: string }): boolean {
  return asset.status !== 'deactivated' && asset.status !== 'condemned';
}
