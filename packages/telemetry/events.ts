export type TelemetryEvent =
  | { name: 'file.uploaded'; data: { provider: string; size_kb: number } }
  | { name: 'file.deleted'; data: { provider: string } }
  | { name: 'file.moved'; data: { provider: string } }
  | { name: 'file.copied'; data: { provider: string } }
  | { name: 'file.transferred'; data: { from_provider: string; to_provider: string } }
  | { name: 'folder.created'; data: { provider: string } }
  | { name: 'provider.connected'; data: { provider: string } }
  | { name: 'provider.disconnected'; data: { provider: string } }
  | { name: 'upload.completed' }
