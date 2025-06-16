import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Song, Playlist as PlaylistType } from '../types';
import { Plus, Trash2, Play, List } from 'lucide-react';

interface PlaylistProps {
  songs: Song[];
  playlists: PlaylistType[];
  setPlaylists: React.Dispatch<React.SetStateAction<PlaylistType[]>>;
  setCurrentPlaylist: (playlist: PlaylistType | null) => void;
  onPlayPlaylist?: (playlist: PlaylistType) => void;
  onPlayNow?: (song: Song) => void;
  onAddToQueue?: (songs: Song[]) => void;
}

interface ContextMenuPosition {
  x: number;
  y: number;
}

interface SearchFilters {
  field: 'all' | 'title' | 'artist' | 'album' | 'genre' | 'year' | 'directory';
  query: string;
}

const Playlist: React.FC<PlaylistProps> = ({
  songs,
  playlists,
  setPlaylists,
  setCurrentPlaylist,
  onPlayPlaylist,
  onPlayNow,
  onAddToQueue
}) => {
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistType | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    position: ContextMenuPosition;
    type: 'playlist' | 'song';
    playlist?: PlaylistType;
    song?: Song;
  } | null>(null);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({ field: 'all', query: '' });
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Sync playlist songs with library songs when they change
  useEffect(() => {
    setPlaylists(prevPlaylists => 
      prevPlaylists.map(playlist => ({
        ...playlist,
        songs: playlist.songs.map(playlistSong => {
          const librarySong = songs.find(s => s.id.split('-')[0] === playlistSong.id.split('-')[0]);
          return librarySong || playlistSong;
        })
      }))
    );
  }, [songs, setPlaylists]);

  // Update selected playlist when playlists change
  useEffect(() => {
    if (selectedPlaylist) {
      const updatedPlaylist = playlists.find(p => p.id === selectedPlaylist.id);
      if (updatedPlaylist) {
        setSelectedPlaylist(updatedPlaylist);
      }
    }
  }, [playlists, selectedPlaylist]);

  // Filter songs based on search criteria
  const filteredSongs = useMemo(() => {
    if (!searchFilters.query) return songs;

    return songs.filter(song => {
      const query = searchFilters.query.toLowerCase();
      
      // Use edited metadata if available
      const title = (song.editedMetadata?.title || song.title).toLowerCase();
      const artist = (song.editedMetadata?.artist || song.artist).toLowerCase();
      const album = (song.editedMetadata?.album || song.album).toLowerCase();
      const genre = (song.editedMetadata?.genre || song.genre).toLowerCase();
      const year = song.editedMetadata?.year || song.year;
      const directory = (song.customTags.directory || '').toLowerCase();
      
      if (searchFilters.field === 'all') {
        return (
          title.includes(query) ||
          artist.includes(query) ||
          album.includes(query) ||
          genre.includes(query) ||
          (year?.toString() || '').includes(query) ||
          directory.includes(query)
        );
      }

      if (searchFilters.field === 'year') {
        return (year?.toString() || '').includes(query);
      }

      if (searchFilters.field === 'directory') {
        return directory.includes(query);
      }

      // For other fields, check editedMetadata first
      const fieldValue = song.editedMetadata?.[searchFilters.field] || song[searchFilters.field];
      return fieldValue.toString().toLowerCase().includes(query);
    });
  }, [songs, searchFilters]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      const newPlaylist: PlaylistType = { id: Date.now().toString(), name: newPlaylistName.trim(), songs: [] };
      setPlaylists((prevPlaylists: PlaylistType[]) => [...prevPlaylists, newPlaylist]);
      setNewPlaylistName('');
    }
  };

  const handleDeletePlaylist = (id: string) => {
    setPlaylists((prevPlaylists: PlaylistType[]) => prevPlaylists.filter((playlist: PlaylistType) => playlist.id !== id));
    if (selectedPlaylist?.id === id) {
      setSelectedPlaylist(null);
    }
  };

  const handleAddSongToPlaylist = (song: Song) => {
    if (selectedPlaylist) {
      setPlaylists((prevPlaylists: PlaylistType[]) => 
        prevPlaylists.map((playlist: PlaylistType) => 
          playlist.id === selectedPlaylist.id 
            ? { 
                ...playlist, 
                songs: playlist.songs.some((s: Song) => s.id.split('-')[0] === song.id.split('-')[0])
                  ? playlist.songs 
                  : [...playlist.songs, { 
                      ...song,
                      id: song.id.split('-')[0] // Store base ID for better syncing
                    }]
              }
            : playlist
        )
      );
    }
  };

  const handleRemoveSongFromPlaylist = (songId: string) => {
    if (selectedPlaylist) {
      setPlaylists((prevPlaylists: PlaylistType[]) => 
        prevPlaylists.map((playlist: PlaylistType) => 
          playlist.id === selectedPlaylist.id 
            ? { ...playlist, songs: playlist.songs.filter((s: Song) => s.id !== songId) }
            : playlist
        )
      );
    }
  };

  const handleSelectPlaylist = (playlist: PlaylistType) => {
    setSelectedPlaylist(playlist);
  };

  const handleContextMenu = (e: React.MouseEvent, playlist: PlaylistType) => {
    e.preventDefault();
    setContextMenu({
      position: { x: e.clientX, y: e.clientY },
      type: 'playlist',
      playlist
    });
  };

  const handleSongContextMenu = (e: React.MouseEvent, song: Song) => {
    e.preventDefault();
    setContextMenu({
      position: { x: e.clientX, y: e.clientY },
      type: 'song',
      song
    });
  };

  const handleAddToQueue = (song: Song) => {
    onAddToQueue?.([song]);
    setContextMenu(null);
  };

  const handleAddPlaylistToQueue = (playlist: PlaylistType) => {
    // Map playlist songs to library songs
    const playlistSongs = playlist.songs.map(playlistSong => {
      const librarySong = songs.find(s => 
        (s.id === playlistSong.id || s.id.split('-')[0] === playlistSong.id.split('-')[0]) ||
        (s.title === playlistSong.title && s.artist === playlistSong.artist && s.album === playlistSong.album)
      );
      return librarySong || playlistSong;
    });
    onAddToQueue?.(playlistSongs);
    setContextMenu(null);
  };

  const handlePlayNow = (song: Song) => {
    // Find the corresponding library song using base ID or metadata
    const librarySong = songs.find(s => 
      (s.id === song.id || s.id.split('-')[0] === song.id.split('-')[0]) ||
      (s.title === song.title && s.artist === song.artist && s.album === song.album)
    );
    
    if (librarySong && selectedPlaylist) {
      // Find the song's position in the playlist
      const songIndex = selectedPlaylist.songs.findIndex(s => 
        (s.id === song.id || s.id.split('-')[0] === song.id.split('-')[0]) ||
        (s.title === song.title && s.artist === song.artist && s.album === song.album)
      );
      
      // Create an updated playlist with library versions of songs
      const updatedPlaylist = {
        ...selectedPlaylist,
        songs: selectedPlaylist.songs.map(playlistSong => {
          const matchedSong = songs.find(s => 
            (s.id === playlistSong.id || s.id.split('-')[0] === playlistSong.id.split('-')[0]) ||
            (s.title === playlistSong.title && s.artist === playlistSong.artist && s.album === playlistSong.album)
          );
          return matchedSong || playlistSong;
        })
      };
      
      // Set the current playlist before playing the song
      setCurrentPlaylist(updatedPlaylist);
      
      // Pass the library song and playlist context
      onPlayNow?.({
        ...librarySong,
        playlistContext: {
          playlist: updatedPlaylist,
          index: songIndex
        }
      });
    } else if (librarySong) {
      // Use the library song with its file data
      onPlayNow?.(librarySong);
    } else {
      // If we can't find the exact song, pass the original song
      onPlayNow?.(song);
    }
    setContextMenu(null);
  };

  const handlePlayPlaylist = (playlist: PlaylistType) => {
    console.log('Starting playlist playback:', playlist.name);
    onPlayPlaylist?.(playlist);
    setContextMenu(null);
  };

  const renderSongMetadata = (song: Song) => {
    // Use edited metadata if available
    const title = song.editedMetadata?.title || song.title;
    const artist = song.editedMetadata?.artist || song.artist;
    const album = song.editedMetadata?.album || song.album;
    const genre = song.editedMetadata?.genre || song.genre;
    const year = song.editedMetadata?.year || song.year;

    const metadataByField: { [key in SearchFilters['field']]: React.ReactNode } = {
      all: (
        <>
          <div className="font-medium">{title}</div>
          <div className="text-sm text-gray-600">
            {artist} • {album}
          </div>
        </>
      ),
      title: (
        <>
          <div className="font-medium">{title}</div>
          <div className="text-sm text-gray-600">{artist}</div>
        </>
      ),
      artist: (
        <>
          <div className="font-medium">{artist}</div>
          <div className="text-sm text-gray-600">{title}</div>
        </>
      ),
      album: (
        <>
          <div className="font-medium">{album}</div>
          <div className="text-sm text-gray-600">
            {artist} - {title}
          </div>
        </>
      ),
      genre: (
        <>
          <div className="font-medium">{genre}</div>
          <div className="text-sm text-gray-600">
            {title} - {artist}
          </div>
        </>
      ),
      year: (
        <>
          <div className="font-medium">{year || 'Unknown Year'}</div>
          <div className="text-sm text-gray-600">
            {title} - {artist}
          </div>
        </>
      ),
      directory: (
        <>
          <div className="font-medium">{song.customTags.directory || 'Root'}</div>
          <div className="text-sm text-gray-600">
            {title} - {artist}
          </div>
        </>
      )
    };

    return metadataByField[searchFilters.field];
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
      <div className="mb-4">
        <input
          type="text"
          value={newPlaylistName}
          onChange={(e) => setNewPlaylistName(e.target.value)}
          placeholder="New playlist name"
          className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
        />
        <button
          onClick={handleCreatePlaylist}
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Playlist
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-2 dark:text-white">Playlists</h3>
          <ul>
            {playlists.map((playlist) => (
              <li
                key={playlist.id}
                className={`
                  flex items-center justify-between mb-2 p-2 rounded cursor-pointer
                  ${selectedPlaylist?.id === playlist.id ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'}
                  hover:bg-blue-50 dark:hover:bg-blue-800
                `}
                onClick={() => handleSelectPlaylist(playlist)}
                onContextMenu={(e) => handleContextMenu(e, playlist)}
              >
                <span className="dark:text-white">{playlist.name}</span>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayPlaylist(playlist);
                    }}
                    className="p-1 hover:bg-blue-200 dark:hover:bg-blue-700 rounded"
                  >
                    <Play className="w-4 h-4 dark:text-white" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePlaylist(playlist.id);
                    }}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2 dark:text-white">
            {selectedPlaylist ? `${selectedPlaylist.name} Songs` : 'Select a Playlist'}
          </h3>
          {selectedPlaylist && (
            <>
              <div className="mb-4">
                <div className="flex gap-2">
                  <select
                    value={searchFilters.field}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, field: e.target.value as SearchFilters['field'] }))}
                    className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="all">All Fields</option>
                    <option value="title">Title</option>
                    <option value="artist">Artist</option>
                    <option value="album">Album</option>
                    <option value="genre">Genre</option>
                    <option value="year">Year</option>
                  </select>
                  <input
                    type="text"
                    value={searchFilters.query}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, query: e.target.value }))}
                    placeholder="Search..."
                    className="flex-grow p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  />
                </div>
              </div>

              <ul className="space-y-2">
                {selectedPlaylist.songs.map((song) => (
                  <li
                    key={song.id}
                    className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
                    onClick={() => handlePlayNow(song)}
                    onContextMenu={(e) => handleSongContextMenu(e, song)}
                  >
                    <div className="dark:text-white">
                      <div className="font-medium">{song.editedMetadata?.title || song.title}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {song.editedMetadata?.artist || song.artist}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveSongFromPlaylist(song.id);
                      }}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-white dark:bg-gray-800 shadow-lg rounded-lg py-2"
          style={{ top: contextMenu.position.y, left: contextMenu.position.x }}
        >
          {contextMenu.type === 'playlist' && contextMenu.playlist && (
            <>
              <button
                onClick={() => handlePlayPlaylist(contextMenu.playlist!)}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white flex items-center gap-2"
              >
                <Play className="w-4 h-4" /> Play Playlist
              </button>
              {onAddToQueue && (
                <button
                  onClick={() => handleAddPlaylistToQueue(contextMenu.playlist!)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white flex items-center gap-2"
                >
                  <List className="w-4 h-4" /> Add Playlist to Queue
                </button>
              )}
            </>
          )}
          {contextMenu.type === 'song' && contextMenu.song && (
            <>
              <button
                onClick={() => handlePlayNow(contextMenu.song!)}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white flex items-center gap-2"
              >
                <Play className="w-4 h-4" /> Play Now
              </button>
              {onAddToQueue && (
                <button
                  onClick={() => handleAddToQueue(contextMenu.song!)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white flex items-center gap-2"
                >
                  <List className="w-4 h-4" /> Add to Queue
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Playlist;
