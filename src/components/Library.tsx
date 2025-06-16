import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Song } from '../types';
import { Edit, Trash2, ChevronLeft, ChevronRight, Play, Plus, List } from 'lucide-react';
import MetadataEditor from './MetadataEditor';
import MusicUploader from './MusicUploader';

interface LibraryProps {
  songs: Song[];
  setSongs: React.Dispatch<React.SetStateAction<Song[]>>;
  lastKnownDirectories: string[];
  setLastKnownDirectories: React.Dispatch<React.SetStateAction<string[]>>;
  playlists: { id: string; name: string; songs: Song[] }[];
  onAddToPlaylist: (songs: Song[], playlistId: string) => void;
  onPlayNow: (song: Song) => void;
  onAddToQueue?: (songs: Song[]) => void;
  importedSongs?: Song[];
}

interface ContextMenuPosition {
  x: number;
  y: number;
}

interface SearchFilters {
  field: 'all' | 'title' | 'artist' | 'album' | 'genre' | 'year' | 'directory';
  query: string;
}

const ITEMS_PER_PAGE = 10;

const Library: React.FC<LibraryProps> = ({
  songs,
  setSongs,
  lastKnownDirectories,
  setLastKnownDirectories,
  playlists,
  onAddToPlaylist,
  onPlayNow,
  onAddToQueue,
  importedSongs
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({ field: 'all', query: '' });
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [selectedSongs, setSelectedSongs] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null);
  const [showPlaylistDropdown, setShowPlaylistDropdown] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const playlistDropdownRef = useRef<HTMLDivElement>(null);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
        setShowPlaylistDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUpload = (newSongs: Song[], directory: string) => {
    console.log('Starting upload with imported songs:', importedSongs?.map(s => ({
      title: s.title,
      artist: s.artist,
      album: s.album,
      editedMetadata: s.editedMetadata
    })));

    setSongs(prevSongs => {
      const updatedSongs = [...prevSongs];
      newSongs.forEach(newSong => {
        console.log('Processing new song:', {
          title: newSong.title,
          artist: newSong.artist,
          album: newSong.album
        });

        // Try to find matching imported song using multiple strategies
        let importedSong = importedSongs?.find(s => 
          // Strategy 1: Exact match on title, artist, and album
          (s.title === newSong.title && 
           s.artist === newSong.artist && 
           s.album === newSong.album) ||
          // Strategy 2: Match on ID (base part)
          (s.id?.split('-')[0] === newSong.id?.split('-')[0]) ||
          // Strategy 3: Match on filename and directory
          (s.customTags?.originalFilename === newSong.customTags?.originalFilename && 
           s.customTags?.directory === newSong.customTags?.directory) ||
          // Strategy 4: Match on title only as last resort
          (s.title === newSong.title)
        );

        if (importedSong?.editedMetadata) {
          console.log('Found matching imported song with edited metadata:', {
            title: importedSong.title,
            editedMetadata: importedSong.editedMetadata,
            matchType: importedSong.title === newSong.title ? 'exact' : 'filename'
          });
          newSong.editedMetadata = { ...importedSong.editedMetadata };
        }

        // Check for existing song
        const existingIndex = updatedSongs.findIndex(s => 
          s.id?.split('-')[0] === newSong.id?.split('-')[0] ||
          (s.title === newSong.title && 
           s.artist === newSong.artist && 
           s.album === newSong.album)
        );

        if (existingIndex !== -1) {
          // If song exists, preserve its edited metadata if it doesn't have imported metadata
          const existingSong = updatedSongs[existingIndex];
          if (!newSong.editedMetadata && existingSong.editedMetadata) {
            console.log('Using existing song metadata:', {
              title: existingSong.title,
              editedMetadata: existingSong.editedMetadata
            });
            newSong.editedMetadata = { ...existingSong.editedMetadata };
          }
          updatedSongs[existingIndex] = {
            ...newSong,
            id: existingSong.id // Preserve the original ID
          };
        } else {
          updatedSongs.push(newSong);
        }
      });
      return updatedSongs;
    });

    if (directory && !lastKnownDirectories.includes(directory)) {
      setLastKnownDirectories(prev => [...prev, directory]);
    }
  };

  const handleDelete = (songId: string) => {
    setSongs(prevSongs => prevSongs.filter(song => song.id !== songId));
    setSelectedSongs(prev => {
      const next = new Set(prev);
      next.delete(songId);
      return next;
    });
  };

  const handleEdit = (song: Song) => {
    setEditingSong(song);
  };

  const handleSaveEdit = (editedSong: Song) => {
    setSongs(prevSongs => 
      prevSongs.map(song => song.id === editedSong.id ? editedSong : song)
    );
    setEditingSong(null);
  };

  const handleCancelEdit = () => {
    setEditingSong(null);
  };

  const handleRowClick = (event: React.MouseEvent, songId: string) => {
    if (event.ctrlKey || event.metaKey) {
      // Multi-select with Ctrl/Cmd
      setSelectedSongs(prev => {
        const next = new Set(prev);
        if (next.has(songId)) {
          next.delete(songId);
        } else {
          next.add(songId);
        }
        return next;
      });
    } else if (event.shiftKey && selectedSongs.size > 0) {
      // Range select with Shift
      const songIds = paginatedSongs.map((s: Song) => s.id);
      const lastSelectedId = Array.from(selectedSongs)[selectedSongs.size - 1];
      const lastIndex = songIds.indexOf(lastSelectedId);
      const currentIndex = songIds.indexOf(songId);
      const start = Math.min(lastIndex, currentIndex);
      const end = Math.max(lastIndex, currentIndex);
      const rangeIds = songIds.slice(start, end + 1);
      setSelectedSongs(new Set(rangeIds));
    } else {
      // Single select
      setSelectedSongs(new Set([songId]));
    }
  };

  const handleContextMenu = (event: React.MouseEvent, songId: string) => {
    event.preventDefault();
    if (!selectedSongs.has(songId)) {
      setSelectedSongs(new Set([songId]));
    }
    setContextMenu({ x: event.clientX, y: event.clientY });
    setShowPlaylistDropdown(false);
  };

  const getSelectedSongsArray = () => 
    songs.filter(song => selectedSongs.has(song.id));

  const handlePlayNow = () => {
    const selectedSongsArray = getSelectedSongsArray();
    if (selectedSongsArray.length > 0) {
      onPlayNow(selectedSongsArray[0]);
    }
    setContextMenu(null);
  };

  const handleAddToQueue = () => {
    if (onAddToQueue) {
      const selectedSongsArray = getSelectedSongsArray();
      onAddToQueue(selectedSongsArray);
      
      // Show feedback toast or notification here if needed
      console.log(`Added ${selectedSongsArray.length} songs to queue`);
    }
    setContextMenu(null);
  };

  const handleAddToPlaylist = (playlistId: string) => {
    onAddToPlaylist(getSelectedSongsArray(), playlistId);
    setContextMenu(null);
    setShowPlaylistDropdown(false);
  };

  // Add helper function to get effective metadata
  const getEffectiveMetadata = (song: Song) => {
    const { editedMetadata } = song;
    return {
      title: editedMetadata?.title || song.title,
      artist: editedMetadata?.artist || song.artist,
      album: editedMetadata?.album || song.album,
      genre: editedMetadata?.genre || song.genre,
      year: editedMetadata?.year || song.year,
    };
  };

  // Filter songs based on search criteria
  const filteredSongs = useMemo(() => {
    if (!searchFilters.query) return songs;

    return songs.filter(song => {
      const query = searchFilters.query.toLowerCase();
      const metadata = getEffectiveMetadata(song);
      
      if (searchFilters.field === 'all') {
        return (
          metadata.title.toLowerCase().includes(query) ||
          metadata.artist.toLowerCase().includes(query) ||
          metadata.album.toLowerCase().includes(query) ||
          metadata.genre.toLowerCase().includes(query) ||
          (metadata.year?.toString() || '').includes(query) ||
          (song.customTags.directory || '').toLowerCase().includes(query)
        );
      }

      if (searchFilters.field === 'year') {
        return metadata.year?.toString().includes(query);
      }

      if (searchFilters.field === 'directory') {
        return (song.customTags.directory || '').toLowerCase().includes(query);
      }

      return metadata[searchFilters.field].toLowerCase().includes(query);
    });
  }, [songs, searchFilters]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredSongs.length / ITEMS_PER_PAGE);
  const paginatedSongs = filteredSongs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const formatDuration = (duration: number): string => {
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedSongs(new Set(paginatedSongs.map(s => s.id)));
    } else {
      setSelectedSongs(new Set());
    }
  };

  const renderSongMetadata = (song: Song): (string | number)[] => {
    const metadata = getEffectiveMetadata(song);
    return [
      metadata.title,
      metadata.artist,
      metadata.album,
      metadata.genre,
      metadata.year || '',
      song.customTags?.directory || ''
    ];
  };

  const getColumnHeaders = () => {
    const headersByField: { [key in SearchFilters['field']]: string[] } = {
      all: ['Title', 'Artist', 'Album', 'Duration'],
      title: ['Title', 'Artist', 'Album', 'Duration'],
      artist: ['Title', 'Artist', 'Album', 'Duration'],
      album: ['Title', 'Artist', 'Album', 'Duration'],
      genre: ['Title', 'Artist', 'Genre', 'Duration'],
      year: ['Title', 'Artist', 'Year', 'Duration'],
      directory: ['Title', 'Artist', 'Directory', 'Duration']
    };

    return headersByField[searchFilters.field];
  };

  const handleClearImportedData = () => {
    localStorage.removeItem('musicManagerState');
    window.location.reload();
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
      <div className="mb-4">
        <div className="flex gap-2 mb-4">
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
            <option value="directory">Directory</option>
          </select>
          <input
            type="text"
            value={searchFilters.query}
            onChange={(e) => setSearchFilters(prev => ({ ...prev, query: e.target.value }))}
            placeholder="Search..."
            className="flex-grow p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
          />
        </div>
        <MusicUploader onUpload={handleUpload} lastKnownDirectories={lastKnownDirectories} />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700">
              <th className="p-2 border-b dark:border-gray-600">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={selectedSongs.size === paginatedSongs.length}
                  className="accent-blue-500"
                />
              </th>
              {getColumnHeaders().map((header, index) => (
                <th key={index} className="p-2 text-left border-b dark:border-gray-600 dark:text-white">
                  {header}
                </th>
              ))}
              <th className="p-2 border-b dark:border-gray-600"></th>
            </tr>
          </thead>
          <tbody>
            {paginatedSongs.map((song: Song) => (
              <tr
                key={song.id}
                onClick={(e) => handleRowClick(e, song.id)}
                onContextMenu={(e) => handleContextMenu(e, song.id)}
                className={`
                  cursor-pointer
                  ${selectedSongs.has(song.id) ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
                  ${song.editedMetadata ? 'border-l-4 border-green-500' : ''}
                `}
              >
                <td className="p-2 border-b dark:border-gray-600">
                  <input
                    type="checkbox"
                    checked={selectedSongs.has(song.id)}
                    onChange={() => {}}
                    className="accent-blue-500"
                  />
                </td>
                {renderSongMetadata(song).map((cell: string | number, index: number) => (
                  <td key={index} className="p-2 border-b dark:border-gray-600 dark:text-white">
                    {cell}
                  </td>
                ))}
                <td className="p-2 border-b dark:border-gray-600">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(song);
                      }}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <Edit className="w-4 h-4 dark:text-white" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(song.id);
                      }}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-white dark:bg-gray-800 shadow-lg rounded-lg py-2"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={handlePlayNow}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white flex items-center gap-2"
          >
            <Play className="w-4 h-4" /> Play Now
          </button>
          {onAddToQueue && (
            <button
              onClick={handleAddToQueue}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white flex items-center gap-2"
            >
              <List className="w-4 h-4" /> Add to Queue
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setShowPlaylistDropdown(!showPlaylistDropdown)}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add to Playlist
              <ChevronRight className="w-4 h-4 ml-auto" />
            </button>
            {showPlaylistDropdown && (
              <div
                ref={playlistDropdownRef}
                className="absolute left-full top-0 bg-white dark:bg-gray-800 shadow-lg rounded-lg py-2 min-w-[150px]"
              >
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => handleAddToPlaylist(playlist.id)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
                  >
                    {playlist.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {editingSong && (
        <MetadataEditor
          song={editingSong}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
        />
      )}

      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm dark:text-white">
          {selectedSongs.size} selected
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded disabled:opacity-50 dark:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 dark:text-white">
            Page {currentPage} of {Math.ceil(filteredSongs.length / ITEMS_PER_PAGE)}
          </span>
          <button
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={currentPage >= Math.ceil(filteredSongs.length / ITEMS_PER_PAGE)}
            className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded disabled:opacity-50 dark:text-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Library;