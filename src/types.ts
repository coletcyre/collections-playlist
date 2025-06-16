export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre?: string;
  year?: string;
  duration?: number;
  file: File | null;
  fileUrl?: string;
  directory?: string;
  editedMetadata?: {
    title?: string;
    artist?: string;
    album?: string;
    genre?: string;
    year?: string;
  };
  playlistContext?: {
    playlist: Playlist;
    index: number;
  };
  isPriorityQueue?: boolean;
  customTags?: string[];
}

export interface Playlist {
  id: string;
  name: string;
  songs: Song[];
}

export interface Collection {
  id: string;
  name: string;
  sections: CollectionSection[];
}

export interface CollectionSection {
  id: string;
  name: string;
  type: 'playlist' | 'auto-fill';
  playlist?: Playlist;
  autoFillConfig?: {
    minLength?: number;
    maxLength?: number;
    tags: string[];
    targetDuration?: number;
  };
  shuffle?: boolean;
}

export interface AppState {
  songs: Song[];
  playlists: Playlist[];
  collections: Collection[];
  lastKnownDirectories: string[];
}