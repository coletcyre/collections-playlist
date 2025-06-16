import React, { useState, useEffect, useMemo } from 'react';
import { Collection, CollectionSection, Playlist, Song } from '../types';
import { Plus, Trash2, Settings, Shuffle, HelpCircle, X, Play } from 'lucide-react';

interface CollectionManagerProps {
  collections: Collection[];
  playlists: Playlist[];
  songs: Song[];
  setCollections: React.Dispatch<React.SetStateAction<Collection[]>>;
  onPlayCollection?: (collection: Collection) => void;
  selectedCollectionId: string | null;
  setSelectedCollectionId: (id: string | null) => void;
}

const CollectionManager: React.FC<CollectionManagerProps> = ({
  collections,
  playlists,
  songs,
  setCollections,
  onPlayCollection,
  selectedCollectionId,
  setSelectedCollectionId,
}) => {
  const [newCollectionName, setNewCollectionName] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionType, setNewSectionType] = useState<'playlist' | 'auto-fill'>('playlist');
  const [showHelp, setShowHelp] = useState(false);
  const [songSearch, setSongSearch] = useState('');
  const [sectionSongSearch, setSectionSongSearch] = useState<{[key: string]: string}>({});
  const [autoFillConfig, setAutoFillConfig] = useState({
    minLength: 0,
    maxLength: 0,
    tags: [] as string[],
    targetDuration: 0
  });

  const selectedCollection = useMemo(() => {
    return collections.find(c => c.id === selectedCollectionId) || null;
  }, [selectedCollectionId, collections]);

  useEffect(() => {
    console.log('CollectionManager songs prop:', songs?.length || 0, 'songs available');
  }, [songs]);

  const handleCreateCollection = () => {
    if (newCollectionName.trim()) {
      const newCollection: Collection = {
        id: Date.now().toString(),
        name: newCollectionName.trim(),
        sections: []
      };
      setCollections(prev => [...prev, newCollection]);
      setNewCollectionName('');
    }
  };

  const handleDeleteCollection = (id: string) => {
    setCollections(prev => prev.filter(collection => collection.id !== id));
    if (selectedCollectionId === id) {
      setSelectedCollectionId(null);
    }
  };

  const handleAddSection = () => {
    if (!selectedCollection) return;
    
    if (newSectionName.trim()) {
      const newSection: CollectionSection = {
        id: Date.now().toString(),
        name: newSectionName.trim(),
        type: newSectionType,
        shuffle: false
      };

      if (newSectionType === 'auto-fill') {
        newSection.autoFillConfig = {
          minLength: autoFillConfig.minLength,
          maxLength: autoFillConfig.maxLength,
          tags: [...autoFillConfig.tags],
          targetDuration: autoFillConfig.targetDuration
        };
      }

      setCollections(prev => {
        return prev.map(collection =>
          collection.id === selectedCollectionId
            ? {
                ...collection,
                sections: [...(collection.sections || []), newSection]
              }
            : collection
        );
      });

      setNewSectionName('');
      setNewSectionType('playlist');
      setAutoFillConfig({
        minLength: 0,
        maxLength: 0,
        tags: [],
        targetDuration: 0
      });
    }
  };

  const handleDeleteSection = (sectionId: string) => {
    if (selectedCollection) {
      setCollections(prev =>
        prev.map(collection =>
          collection.id === selectedCollectionId
            ? {
                ...collection,
                sections: collection.sections.filter(section => section.id !== sectionId)
              }
            : collection
        )
      );
    }
  };

  const handleSetPlaylist = (sectionId: string, playlistId: string) => {
    if (selectedCollection) {
      const playlist = playlists.find(p => p.id === playlistId);
      if (playlist) {
        setCollections(prev =>
          prev.map(collection =>
            collection.id === selectedCollectionId
              ? {
                  ...collection,
                  sections: collection.sections.map(section =>
                    section.id === sectionId
                      ? {
                          ...section,
                          playlist: { ...playlist }
                        }
                      : section
                  )
                }
              : collection
          )
        );
      }
    }
  };

  const handleToggleShuffle = (sectionId: string) => {
    if (selectedCollection) {
      setCollections(prev =>
        prev.map(collection =>
          collection.id === selectedCollectionId
            ? {
                ...collection,
                sections: collection.sections.map(section =>
                  section.id === sectionId
                    ? {
                        ...section,
                        shuffle: !section.shuffle
                      }
                    : section
                )
              }
            : collection
        )
      );
    }
  };

  const handleUpdateAutoFillConfig = (sectionId: string, config: typeof autoFillConfig) => {
    if (selectedCollection) {
      setCollections(prev =>
        prev.map(collection =>
          collection.id === selectedCollectionId
            ? {
                ...collection,
                sections: collection.sections.map(section =>
                  section.id === sectionId
                    ? {
                        ...section,
                        autoFillConfig: {
                          minLength: config.minLength,
                          maxLength: config.maxLength,
                          tags: [...config.tags],
                          targetDuration: config.targetDuration
                        }
                      }
                    : section
                )
              }
            : collection
        )
      );
    }
  };

  const handleAddSongToSection = (sectionId: string, song: Song) => {
    if (!selectedCollection) return;

    setCollections(prev =>
      prev.map(collection =>
        collection.id === selectedCollectionId
          ? {
              ...collection,
              sections: collection.sections.map(section =>
                section.id === sectionId
                  ? {
                      ...section,
                      playlist: {
                        id: section.playlist?.id || `section-${sectionId}`,
                        name: section.playlist?.name || section.name,
                        songs: [...(section.playlist?.songs || []), song]
                      }
                    }
                  : section
              )
            }
          : collection
      )
    );
  };

  const handleRemoveSongFromSection = (sectionId: string, songId: string) => {
    if (!selectedCollection) return;

    setCollections(prev =>
      prev.map(collection =>
        collection.id === selectedCollectionId
          ? {
              ...collection,
              sections: collection.sections.map(section =>
                section.id === sectionId && section.playlist
                  ? {
                      ...section,
                      playlist: {
                        ...section.playlist,
                        songs: section.playlist.songs.filter(s => s.id !== songId)
                      }
                    }
                  : section
              )
            }
          : collection
      )
    );
  };

  const getFilteredSongs = (searchTerm: string) => {
    if (!searchTerm.trim()) return [];
    
    console.log('getFilteredSongs called with songs:', songs?.length || 0);
    
    if (!Array.isArray(songs) || songs.length === 0) {
      console.log('No songs available in library or songs is not an array:', songs);
      return [];
    }
    
    const searchTerms = searchTerm.toLowerCase().split(' ').filter(term => term.length > 0);
    console.log('Searching for terms:', searchTerms, 'in', songs.length, 'songs');
    
    const filtered = songs.filter(song => {
      // Get all searchable fields, including edited metadata
      const searchableFields = [
        song.editedMetadata?.title || song.title,
        song.editedMetadata?.artist || song.artist,
        song.editedMetadata?.album || song.album,
        song.editedMetadata?.genre || song.genre,
        // Only spread customTags if it's an array
        ...(Array.isArray(song.customTags) ? song.customTags : [])
      ].map(field => (field || '').toLowerCase());
      
      // Check if all search terms match at least one field
      const matches = searchTerms.every(term => 
        searchableFields.some(field => field.includes(term))
      );

      if (matches) {
        console.log('Found match:', song.title);
      }
      
      return matches;
    }).slice(0, 10); // Limit to 10 results
    
    console.log('Found matches:', filtered.length, filtered.map(s => s.title));
    return filtered;
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold dark:text-white">Collections</h3>
          <button
            onClick={() => setShowHelp(true)}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Learn about Collections"
          >
            <HelpCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 relative">
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
            
            <h2 className="text-xl font-bold mb-4 dark:text-white">About Collections</h2>
            
            <div className="space-y-4 text-gray-600 dark:text-gray-300">
              <p>
                Collections are advanced playlists that allow you to organize your music in sections.
                Each section can be either a regular playlist or an auto-filling section.
              </p>

              <div>
                <h3 className="text-lg font-semibold mb-2 dark:text-white">Creating Collections</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Enter a name and click "Create Collection"</li>
                  <li>Add sections using the "Add Section" button</li>
                  <li>Choose between two section types:
                    <ul className="list-circle pl-5 mt-1">
                      <li><strong>Playlist:</strong> Add an existing playlist as a section</li>
                      <li><strong>Auto-fill:</strong> Create a dynamic section that fills based on rules</li>
                    </ul>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 dark:text-white">Section Types</h3>
                <div className="space-y-2">
                  <p><strong>Playlist Sections:</strong></p>
                  <ul className="list-disc pl-5">
                    <li>Select any of your existing playlists</li>
                    <li>Songs will play in the order they appear in the playlist</li>
                    <li>Can be shuffled independently using the shuffle button</li>
                  </ul>

                  <p><strong>Auto-fill Sections:</strong></p>
                  <ul className="list-disc pl-5">
                    <li>Set minimum and maximum song lengths</li>
                    <li>Add tags to match against song genres and custom tags</li>
                    <li>Optionally set a target duration for the section</li>
                    <li>Songs matching the criteria will be selected when played</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2 dark:text-white">Playing Collections</h3>
                <ul className="list-disc pl-5">
                  <li>Sections play in order from top to bottom</li>
                  <li>Each section can be shuffled independently</li>
                  <li>Auto-fill sections are regenerated each time you play the collection</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          value={newCollectionName}
          onChange={(e) => setNewCollectionName(e.target.value)}
          placeholder="New collection name"
          className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
        />
        <button
          onClick={handleCreateCollection}
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Collection
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-2 dark:text-white">Collections</h3>
          <ul>
            {collections.map((collection) => (
              <li
                key={collection.id}
                className={`
                  flex items-center justify-between mb-2 p-2 rounded cursor-pointer
                  ${selectedCollectionId === collection.id ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'}
                  hover:bg-blue-50 dark:hover:bg-blue-800
                `}
                onClick={() => setSelectedCollectionId(collection.id)}
              >
                <span className="dark:text-white">{collection.name}</span>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onPlayCollection) {
                        onPlayCollection(collection);
                      }
                    }}
                    className="p-1 hover:bg-blue-200 dark:hover:bg-blue-700 rounded"
                  >
                    <Play className="w-4 h-4 dark:text-white" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCollection(collection.id);
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
            {selectedCollection ? `${selectedCollection.name} Sections` : 'Select a Collection'}
          </h3>
          {selectedCollection && selectedCollection.sections && (
            <>
              <div className="mb-4">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-4">
                  <h4 className="text-md font-medium dark:text-white mb-3">Add New Section</h4>
                  
                  <div className="space-y-3">
                    <div className="flex flex-col">
                      <label className="text-sm font-medium dark:text-white mb-1">Section Type</label>
                      <select
                        value={newSectionType}
                        onChange={(e) => setNewSectionType(e.target.value as 'playlist' | 'auto-fill')}
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="playlist">Playlist</option>
                        <option value="auto-fill">Auto-fill</option>
                      </select>
                    </div>

                    {newSectionType === 'playlist' && (
                      <div className="space-y-3">
                        <div className="flex flex-col">
                          <label className="text-sm font-medium dark:text-white mb-1">Playlist Name</label>
                          <div className="flex gap-2 max-w-full">
                            <div className="flex-grow min-w-0">
                              <input
                                type="text"
                                value={newSectionName}
                                onChange={(e) => setNewSectionName(e.target.value)}
                                placeholder="Enter playlist name"
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                              />
                            </div>
                            <div className="w-1/3 min-w-[120px]">
                              <select
                                value=""
                                onChange={(e) => {
                                  const playlist = playlists.find(p => p.id === e.target.value);
                                  if (playlist) {
                                    setNewSectionName(playlist.name);
                                  }
                                }}
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              >
                                <option value="">Or select...</option>
                                {playlists.map((playlist) => (
                                  <option key={playlist.id} value={playlist.id}>
                                    {playlist.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Enter a name or select an existing playlist
                          </p>
                        </div>
                      </div>
                    )}

                    {newSectionType === 'auto-fill' && (
                      <div className="space-y-3">
                        <div className="flex flex-col">
                          <label className="text-sm font-medium dark:text-white mb-1">Section Name</label>
                          <input
                            type="text"
                            value={newSectionName}
                            onChange={(e) => setNewSectionName(e.target.value)}
                            placeholder="Enter section name"
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col">
                            <label className="text-sm font-medium dark:text-white mb-1">Min Length (sec)</label>
                            <input
                              type="number"
                              value={autoFillConfig.minLength}
                              onChange={(e) => setAutoFillConfig(prev => ({ ...prev, minLength: parseInt(e.target.value) || 0 }))}
                              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="text-sm font-medium dark:text-white mb-1">Max Length (sec)</label>
                            <input
                              type="number"
                              value={autoFillConfig.maxLength}
                              onChange={(e) => setAutoFillConfig(prev => ({ ...prev, maxLength: parseInt(e.target.value) || 0 }))}
                              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col">
                          <label className="text-sm font-medium dark:text-white mb-1">Tags (comma-separated)</label>
                          <input
                            type="text"
                            value={autoFillConfig.tags.join(', ')}
                            onChange={(e) => setAutoFillConfig(prev => ({ ...prev, tags: e.target.value.split(',').map(tag => tag.trim()) }))}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </div>

                        <div className="flex flex-col">
                          <label className="text-sm font-medium dark:text-white mb-1">Target Duration (sec)</label>
                          <input
                            type="number"
                            value={autoFillConfig.targetDuration}
                            onChange={(e) => setAutoFillConfig(prev => ({ ...prev, targetDuration: parseInt(e.target.value) || 0 }))}
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleAddSection}
                      disabled={!newSectionName.trim()}
                      className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed mt-3"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Section
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-md font-medium dark:text-white mb-2">Sections</h4>
                  <ul className="space-y-2">
                    {selectedCollection.sections.map((section) => (
                      <li
                        key={section.id}
                        className="p-4 bg-gray-100 dark:bg-gray-700 rounded"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium dark:text-white">{section.name}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleToggleShuffle(section.id)}
                              className={`p-1 rounded ${section.shuffle ? 'bg-blue-200 dark:bg-blue-700' : 'hover:bg-blue-100 dark:hover:bg-blue-800'}`}
                            >
                              <Shuffle className="w-4 h-4 dark:text-white" />
                            </button>
                            {section.type === 'auto-fill' && (
                              <button
                                onClick={() => setEditingSectionId(editingSectionId === section.id ? null : section.id)}
                                className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded"
                              >
                                <Settings className="w-4 h-4 dark:text-white" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteSection(section.id)}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {section.type === 'playlist' ? (
                          <div className="flex flex-col space-y-3">
                            <div>
                              <label className="text-sm font-medium dark:text-white mb-1">Playlist Name</label>
                              <input
                                type="text"
                                value={section.name}
                                onChange={(e) => {
                                  setCollections(prev =>
                                    prev.map(collection =>
                                      collection.id === selectedCollectionId
                                        ? {
                                            ...collection,
                                            sections: collection.sections.map(s =>
                                              s.id === section.id
                                                ? { ...s, name: e.target.value }
                                                : s
                                            )
                                          }
                                        : collection
                                    )
                                  );
                                }}
                                placeholder="Enter playlist name"
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                              />
                            </div>

                            <div>
                              <label className="text-sm font-medium dark:text-white mb-1">Use Existing Playlist</label>
                              <select
                                value={section.playlist?.id || ''}
                                onChange={(e) => handleSetPlaylist(section.id, e.target.value)}
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              >
                                <option value="">Select a playlist...</option>
                                {playlists.map((playlist) => (
                                  <option key={playlist.id} value={playlist.id}>
                                    {playlist.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="text-sm font-medium dark:text-white mb-1">Add Songs from Library</label>
                              <div className="space-y-2">
                                <div className="relative">
                                  <input
                                    type="text"
                                    placeholder="Search by title, artist, or album..."
                                    value={sectionSongSearch[section.id] || ''}
                                    onChange={(e) => {
                                      const searchValue = e.target.value;
                                      console.log('Search input changed:', searchValue);
                                      setSectionSongSearch(prev => ({
                                        ...prev,
                                        [section.id]: searchValue
                                      }));
                                    }}
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                                  />
                                  {sectionSongSearch[section.id]?.trim() && (
                                    <div className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-gray-700 rounded-md shadow-lg border border-gray-200 dark:border-gray-600 max-h-60 overflow-y-auto">
                                      {(() => {
                                        const results = getFilteredSongs(sectionSongSearch[section.id]);
                                        console.log('Search results:', results.length);
                                        return results.length > 0 ? (
                                          <div className="divide-y divide-gray-200 dark:divide-gray-600">
                                            {results.map(song => (
                                              <div
                                                key={song.id}
                                                className="p-3 hover:bg-gray-100 dark:hover:bg-gray-600 flex justify-between items-center cursor-pointer group"
                                                onClick={() => {
                                                  handleAddSongToSection(section.id, song);
                                                  // Clear search after adding
                                                  setSectionSongSearch(prev => ({
                                                    ...prev,
                                                    [section.id]: ''
                                                  }));
                                                }}
                                              >
                                                <div className="flex-grow min-w-0">
                                                  <div className="font-medium text-gray-900 dark:text-white truncate">
                                                    {song.title}
                                                  </div>
                                                  <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                    {song.artist} • {song.album}
                                                  </div>
                                                </div>
                                                <button className="ml-2 p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <Plus className="w-5 h-5" />
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="p-3 text-gray-500 dark:text-gray-400 text-center">
                                            No songs found
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {section.playlist?.songs && section.playlist.songs.length > 0 && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium dark:text-white">Section Songs</label>
                                  <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {section.playlist.songs.length} {section.playlist.songs.length === 1 ? 'song' : 'songs'}
                                  </span>
                                </div>
                                <div className="bg-white dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 overflow-hidden">
                                  <div className="divide-y divide-gray-200 dark:divide-gray-600">
                                    {section.playlist.songs.map(song => (
                                      <div
                                        key={song.id}
                                        className="p-3 hover:bg-gray-100 dark:hover:bg-gray-600 flex justify-between items-center group"
                                      >
                                        <div className="flex-grow min-w-0">
                                          <div className="font-medium text-gray-900 dark:text-white truncate">
                                            {song.title}
                                          </div>
                                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                            {song.artist} • {song.album}
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => handleRemoveSongFromSection(section.id, song.id)}
                                          className="ml-2 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <Trash2 className="w-5 h-5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : editingSectionId === section.id && (
                          <div className="space-y-2 mt-2">
                            <div className="flex flex-col">
                              <label className="text-sm font-medium dark:text-white mb-1">Minimum Length (seconds)</label>
                              <input
                                type="number"
                                value={section.autoFillConfig?.minLength || 0}
                                onChange={(e) => handleUpdateAutoFillConfig(section.id, {
                                  ...autoFillConfig,
                                  minLength: parseInt(e.target.value) || 0
                                })}
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              />
                            </div>
                            <div className="flex flex-col">
                              <label className="text-sm font-medium dark:text-white mb-1">Maximum Length (seconds)</label>
                              <input
                                type="number"
                                value={section.autoFillConfig?.maxLength || 0}
                                onChange={(e) => handleUpdateAutoFillConfig(section.id, {
                                  ...autoFillConfig,
                                  maxLength: parseInt(e.target.value) || 0
                                })}
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              />
                            </div>
                            <div className="flex flex-col">
                              <label className="text-sm font-medium dark:text-white mb-1">Tags (comma-separated)</label>
                              <input
                                type="text"
                                value={section.autoFillConfig?.tags.join(', ') || ''}
                                onChange={(e) => handleUpdateAutoFillConfig(section.id, {
                                  ...autoFillConfig,
                                  tags: e.target.value.split(',').map(tag => tag.trim())
                                })}
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              />
                            </div>
                            <div className="flex flex-col">
                              <label className="text-sm font-medium dark:text-white mb-1">Target Duration (seconds)</label>
                              <input
                                type="number"
                                value={section.autoFillConfig?.targetDuration || 0}
                                onChange={(e) => handleUpdateAutoFillConfig(section.id, {
                                  ...autoFillConfig,
                                  targetDuration: parseInt(e.target.value) || 0
                                })}
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              />
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CollectionManager;