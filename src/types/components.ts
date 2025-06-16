import { Song } from '../types';

export interface MusicUploaderProps {
  onUpload: (songs: Song[], directory: string) => void;
  lastKnownDirectories: string[];
  importedSongs?: Song[];
}

export interface JSMediaTags {
  tags: {
    title?: string;
    artist?: string;
    album?: string;
    genre?: string;
    year?: string | number;
    album_artist?: string;
    track?: string | number;
  };
}

export interface JSMediaTagsError {
  type: string;
  info: string;
} 