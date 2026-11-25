/**
 * Typages de l'API File System Access (sélecteur de dossier, autorisations),
 * absents de la lib DOM de TypeScript.
 */
type ModeAcces = 'read' | 'readwrite'

interface FileSystemHandle {
  queryPermission(options?: { mode?: ModeAcces }): Promise<PermissionState>
  requestPermission(options?: { mode?: ModeAcces }): Promise<PermissionState>
}

interface FileSystemDirectoryHandle {
  values(): AsyncIterableIterator<FileSystemDirectoryHandle | FileSystemFileHandle>
}

interface Window {
  showDirectoryPicker?(options?: {
    id?: string
    mode?: ModeAcces
    startIn?: 'documents' | 'downloads' | 'desktop' | FileSystemHandle
  }): Promise<FileSystemDirectoryHandle>
}
