import React, { useState, useEffect } from 'react';
import { Song } from '../types';

interface MetadataEditorProps {
  song: Song;
  onSave: (editedSong: Song) => void;
  onCancel: () => void;
}

const MetadataEditor: React.FC<MetadataEditorProps> = ({ song, onSave, onCancel }) => {
  const [editedMetadata, setEditedMetadata] = useState({
    title: song.editedMetadata?.title || song.title,
    artist: song.editedMetadata?.artist || song.artist,
    album: song.editedMetadata?.album || song.album,
    genre: song.editedMetadata?.genre || song.genre,
    year: song.editedMetadata?.year || song.year || null
  });

  const handleChange = (field: keyof typeof editedMetadata, value: string | number) => {
    if (field === 'year') {
      const yearValue = value === '' ? null : Number(value);
      setEditedMetadata(prev => ({
        ...prev,
        year: yearValue
      }));
    } else {
      setEditedMetadata(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSave = () => {
    // Create a new editedMetadata object with only the fields that differ from the original
    const newEditedMetadata: NonNullable<Song['editedMetadata']> = {};
    let hasChanges = false;

    if (editedMetadata.title !== song.title) {
      newEditedMetadata.title = editedMetadata.title;
      hasChanges = true;
    }
    if (editedMetadata.artist !== song.artist) {
      newEditedMetadata.artist = editedMetadata.artist;
      hasChanges = true;
    }
    if (editedMetadata.album !== song.album) {
      newEditedMetadata.album = editedMetadata.album;
      hasChanges = true;
    }
    if (editedMetadata.genre !== song.genre) {
      newEditedMetadata.genre = editedMetadata.genre;
      hasChanges = true;
    }
    if (editedMetadata.year !== song.year && editedMetadata.year !== null) {
      newEditedMetadata.year = editedMetadata.year;
      hasChanges = true;
    }

    onSave({
      ...song,
      editedMetadata: hasChanges ? newEditedMetadata : null
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Edit Metadata</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              value={editedMetadata.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Artist</label>
            <input
              type="text"
              value={editedMetadata.artist}
              onChange={(e) => handleChange('artist', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Album</label>
            <input
              type="text"
              value={editedMetadata.album}
              onChange={(e) => handleChange('album', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Genre</label>
            <input
              type="text"
              value={editedMetadata.genre}
              onChange={(e) => handleChange('genre', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Year</label>
            <input
              type="number"
              value={editedMetadata.year || ''}
              onChange={(e) => handleChange('year', parseInt(e.target.value) || undefined)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default MetadataEditor;