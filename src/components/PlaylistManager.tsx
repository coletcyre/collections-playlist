import React, { useState } from 'react';
import { Song } from '../types';
import { Plus, Trash2 } from 'lucide-react';

interface PlaylistManagerProps {
  songs: Song[];
  playlists: { name: string; songs: Song[] }[];
  setPlaylists: React.Dispatch<React.SetStateAction<{ name: string; songs: Song[] }[]>>;
}

const PlaylistManager: React.FC<PlaylistManagerProps> = ({ songs, playlists, setPlaylists }) => {
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState<{ name: string; songs: Song[] } | null>(null);

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      const newPlaylist = { name: newPlaylistName.trim(), songs: [] };
      setPlaylists(prevPlaylists => [...prevPlaylists, newPlaylist]);
      setNewPlaylistName('');
    }
  };

  const handleDeletePlaylist = (index: number) => {
    setPlaylists(prevPlaylists => prevPlaylists.filter((_, i) => i !== index));
    if (selectedPlaylist === playlists[index]) {
      setSelectedPlaylist(null);
    }
  };

  const handleAddSongToPlaylist = (song: Song) => {
    if (selectedPlaylist) {
      setPlaylists(prevPlaylists => 
        prevPlaylists.map(playlist => 
          playlist === selectedPlaylist 
            ? { ...playlist, songs: [...playlist.songs, song] }
            : playlist
        )
      );
    }
  };

  const handleRemoveSongFromPlaylist = (songIndex: number) => {
    if (selectedPlaylist) {
      setPlaylists(prevPlaylists => 
        prevPlaylists.map(playlist => 
          playlist === selectedPlaylist 
            ? { ...playlist, songs: playlist.songs.filter((_, i) => i !== songIndex) }
            : playlist
        )
      );
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4">
      <div className="mb-4">
        <input
          type="text"
          value={newPlaylistName}
          onChange={(e) => setNewPlaylistName(e.target.value)}
          placeholder="New playlist name"
          className="w-full p-2 border rounded"
        />
        <button
          onClick={handleCreatePlaylist}
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded flex items-center"
        >
          <Plus size={18} className="mr-2" />
          Create Playlist
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Playlists</h3>
          <ul>
            {playlists.map((playlist, index) => (
              <li
                key={index}
                className={`flex items-center justify-between mb-2 p-2 rounded cursor-pointer ${
                  selectedPlaylist === playlist ? 'bg-blue-100' : 'bg-gray-100'
                }`}
                onClick={() => setSelectedPlaylist(playlist)}
              >
                <span>{playlist.name}</span>
                <button onClick={(e) => { e.stopPropagation(); handleDeletePlaylist(index); }}>
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">
            {selectedPlaylist ? `${selectedPlaylist.name} Songs` : 'Select a Playlist'}
          </h3>
          {selectedPlaylist && (
            <ul>
              {selectedPlaylist.songs.map((song, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between mb-2 p-2 bg-gray-100 rounded"
                >
                  <span>{song.title}</span>
                  <button onClick={() => handleRemoveSongFromPlaylist(index)}>
                    <Trash2 size={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">Add Songs to Playlist</h3>
        <ul>
          {songs.map((song) => (
            <li
              key={song.id}
              className="flex items-center justify-between mb-2 p-2 bg-gray-100 rounded"
            >
              <span>{song.title}</span>
              <button
                onClick={() => handleAddSongToPlaylist(song)}
                disabled={!selectedPlaylist}
                className="bg-blue-500 text-white px-2 py-1 rounded disabled:bg-gray-300"
              >
                Add
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PlaylistManager;