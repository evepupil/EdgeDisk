import {
  ArrowDownUp,
  Check,
  ChevronRight,
  CircleUserRound,
  CircleAlert,
  CloudDownload,
  Copy,
  Download,
  Ellipsis,
  ExternalLink,
  File,
  FileArchive,
  FileAudio,
  FileImage,
  Files,
  FileText,
  FileVideo,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderUp,
  Grid2X2,
  HardDrive,
  House,
  Info,
  Link,
  Link2,
  List,
  LoaderCircle,
  Moon,
  Move,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  SearchX,
  Share2,
  Sheet,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
  CloudUpload,
  X,
  createElement,
  type IconNode,
} from 'lucide'

const iconNodes: Record<string, IconNode> = {
  'arrow-down-up': ArrowDownUp,
  check: Check,
  'chevron-right': ChevronRight,
  'circle-user-round': CircleUserRound,
  'circle-alert': CircleAlert,
  'cloud-download': CloudDownload,
  copy: Copy,
  download: Download,
  ellipsis: Ellipsis,
  'external-link': ExternalLink,
  file: File,
  'file-archive': FileArchive,
  'file-audio': FileAudio,
  'file-image': FileImage,
  files: Files,
  'file-text': FileText,
  'file-video': FileVideo,
  folder: Folder,
  'folder-open': FolderOpen,
  'folder-plus': FolderPlus,
  'folder-up': FolderUp,
  'grid-2x2': Grid2X2,
  'hard-drive': HardDrive,
  house: House,
  info: Info,
  link: Link,
  'link-2': Link2,
  list: List,
  loader: LoaderCircle,
  moon: Moon,
  move: Move,
  play: Play,
  plus: Plus,
  'refresh-cw': RefreshCw,
  restore: RotateCcw,
  search: Search,
  'search-x': SearchX,
  'share-2': Share2,
  sheet: Sheet,
  'shield-check': ShieldCheck,
  sun: Sun,
  'trash-2': Trash2,
  upload: Upload,
  'upload-cloud': CloudUpload,
  x: X,
}

export function iconMarkup(name: string, extraClass = ''): string {
  const className = extraClass ? `icon ${extraClass}` : 'icon'
  return `<span class="${className}" data-icon="${name}" aria-hidden="true"></span>`
}

export function renderIcons(scope: Document | HTMLElement = document): void {
  const descendants = Array.from(scope.querySelectorAll<HTMLElement>('[data-icon]'))
  const placeholders = scope instanceof HTMLElement && scope.matches('[data-icon]') ? [scope, ...descendants] : descendants
  for (const placeholder of placeholders) {
    const name = placeholder.dataset.icon
    if (!name || placeholder.childElementCount > 0) continue
    const node = iconNodes[name]
    if (!node) continue
    placeholder.replaceChildren(createElement(node, { width: '18', height: '18', 'aria-hidden': 'true' }))
  }
}
