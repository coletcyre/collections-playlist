import React from 'react';
import { Song, Playlist as PlaylistType } from './types';

interface Props {
  songs: Song[];
  currentSongIndex: number;
  currentPlaylist: PlaylistType | null;
  queue: Song[];
  shuffleMode: boolean;
  shuffledIndices: number[];
  // ... other props ...
}

const AudioPlayer: React.FC<Props> = ({
  songs,
  currentSongIndex,
  currentPlaylist,
  queue,
  shuffleMode,
  shuffledIndices,
  // ... other props ...
}) => {
  const getUpcomingSongs = () => {
    // First show manually queued songs
    const queuedSongs = queue.map((song: Song) => ({
      ...song,
      subtext: '(Queued)'
    }));

    // If we have queued songs, only show those
    if (queuedSongs.length > 0) {
      return queuedSongs;
    }

    // Otherwise show upcoming songs based on current mode
    if (currentPlaylist) {
      const currentSongBaseId = songs[currentSongIndex].id.split('-')[0];
      const currentPlaylistIndex = currentPlaylist.songs.findIndex((s: Song) => s.id.split('-')[0] === currentSongBaseId);
      
      if (shuffleMode) {
        // Show songs in shuffled order
        return shuffledIndices
          .map((index: number) => currentPlaylist.songs[index])
          .map((song: Song) => ({
            ...song,
            subtext: `From ${currentPlaylist.name}`
          }));
      } else {
        // Show remaining playlist songs in order
        return currentPlaylistIndex !== -1 
          ? currentPlaylist.songs.slice(currentPlaylistIndex + 1).map((song: Song) => ({
              ...song,
              subtext: `From ${currentPlaylist.name}`
            }))
          : [];
      }
    } else {
      // Playing from library
      if (shuffleMode) {
        // Show songs in shuffled order
        return shuffledIndices
          .map((index: number) => songs[index])
          .map((song: Song) => ({
            ...song,
            subtext: 'From Library'
          }));
      } else {
        // Show remaining library songs in order
        return songs.slice(currentSongIndex + 1).map((song: Song) => ({
          ...song,
          subtext: 'From Library'
        }));
      }
    }
  };

  return (
    <div>
      {/* Rest of the component */}
    </div>
  );
}

export default AudioPlayer; 