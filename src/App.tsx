import React, { useState, useEffect } from 'react';
import { Music, Download, Upload, Sun, Moon } from 'lucide-react';
import Library from './components/Library';
import Playlist from './components/Playlist';
import CollectionManager from './components/CollectionManager';
import AudioPlayer from './components/AudioPlayer';
import { Song, Playlist as PlaylistType, Collection, AppState } from './types';
import { saveToLocalStorage, loadFromLocalStorage, exportAppState, importAppState } from './utils/exportImport';
import { useTheme } from './contexts/ThemeContext';

function App() {
  const { theme, toggleTheme } = useTheme();
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistType[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [lastKnownDirectories, setLastKnownDirectories] = useState<string[]>([]);
  const [currentPlaylist, setCurrentPlaylist] = useState<PlaylistType | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'song' | 'playlist'>('none');
  const [shuffleMode, setShuffleMode] = useState(false);
  const [currentShuffleIndex, setCurrentShuffleIndex] = useState(0);
  const [importedSongs, setImportedSongs] = useState<Song[]>([]);
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [currentCollection, setCurrentCollection] = useState<Collection | null>(null);
  const [currentCollectionSectionIndex, setCurrentCollectionSectionIndex] = useState(0);

  useEffect(() => {
    const savedState = loadFromLocalStorage();
    if (savedState) {
      if (savedState.songs) {
        console.log('Loading saved songs with metadata:', savedState.songs.filter(s => s.editedMetadata).map(s => ({
          title: s.title,
          editedMetadata: s.editedMetadata
        })));
        setImportedSongs(savedState.songs);
      }
      // Ensure collections have sections array
      const initializedCollections = (savedState.collections || []).map(collection => ({
        ...collection,
        sections: collection.sections || []
      }));
      setCollections(initializedCollections);
      setPlaylists(savedState.playlists || []);
      setLastKnownDirectories(savedState.lastKnownDirectories || []);
    }
  }, []);

  // Add debug logging for songs state
  useEffect(() => {
    console.log('App songs state updated:', songs.length, 'songs available');
  }, [songs]);

  useEffect(() => {
    if (songs.length === 0) return;

    const appState: AppState = {
      songs: songs.map(song => {
        // Try to find matching imported song
        const importedSong = importedSongs.find(s => 
          (s.title === song.title && s.artist === song.artist && s.album === song.album) ||
          (s.id === song.id.split('-')[0])
        );

        return {
          ...song,
          editedMetadata: song.editedMetadata || importedSong?.editedMetadata
        };
      }),
      playlists,
      collections,
      lastKnownDirectories
    };

    const songsWithMetadata = appState.songs.filter(s => s.editedMetadata);
    console.log('Saving state to localStorage:', {
      totalSongs: appState.songs.length,
      songsWithMetadata: songsWithMetadata.map(s => ({
        title: s.title,
        editedMetadata: s.editedMetadata
      }))
    });

    saveToLocalStorage(appState);
  }, [songs, playlists, collections, lastKnownDirectories, importedSongs]);

  const handleExport = () => {
    const exportData = exportAppState({ songs, playlists, collections, lastKnownDirectories });
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'music_manager_export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const importedState = importAppState(content);
        console.log('Imported state:', {
          totalSongs: importedState.songs?.length,
          songsWithMetadata: importedState.songs?.filter(s => s.editedMetadata).map(s => ({
            title: s.title,
            editedMetadata: s.editedMetadata
          }))
        });

        if (importedState.songs) {
          setImportedSongs(importedState.songs);
          
          // Update existing songs with imported metadata
          setSongs(prevSongs => prevSongs.map(song => {
            const importedSong = importedState.songs?.find(s => 
              (s.title === song.title && s.artist === song.artist && s.album === song.album) ||
              (s.id === song.id.split('-')[0])
            );
            
            return importedSong?.editedMetadata ? {
              ...song,
              editedMetadata: importedSong.editedMetadata
            } : song;
          }));
        }
        setPlaylists(importedState.playlists || []);
        setCollections(importedState.collections || []);
        setLastKnownDirectories(importedState.lastKnownDirectories || []);
      };
      reader.readAsText(file);
    }
  };

  const handlePlayNow = (song: Song) => {
    // Try to find by full ID first
    let songIndex = songs.findIndex(s => s.id === song.id);
    
    // If not found, try to find by base ID
    if (songIndex === -1) {
      const baseId = song.id.split('-')[0];
      songIndex = songs.findIndex(s => s.id.split('-')[0] === baseId);
    }
    
    if (songIndex !== -1) {
      // If the song has playlist context, use that
      if (song.playlistContext) {
        const { playlist, index } = song.playlistContext;
        
        // Update the current playlist with library versions of songs
        const updatedPlaylist = {
          ...playlist,
          songs: playlist.songs.map(playlistSong => {
            // Find corresponding library song
            const librarySong = songs.find(s => 
              (s.id === playlistSong.id || s.id.split('-')[0] === playlistSong.id.split('-')[0]) ||
              (s.title === playlistSong.title && s.artist === playlistSong.artist && s.album === playlistSong.album)
            );
            return librarySong || playlistSong;
          })
        };
        
        setCurrentPlaylist(updatedPlaylist);
        setCurrentCollection(null);
        setCurrentSongIndex(songIndex);
        setAutoPlay(true);
      } else {
        // Playing from library
        setCurrentPlaylist(null);
        setCurrentCollection(null);
        setCurrentSongIndex(songIndex);
        setAutoPlay(true);
      }
      
      // Reset shuffle state when directly playing a song
      if (shuffleMode) {
        setShuffleMode(false);
        setShuffledIndices([]);
        setCurrentShuffleIndex(0);
      }
    } else {
      console.error('Could not find song in library:', {
        songId: song.id,
        songTitle: song.title,
        songArtist: song.artist,
        songAlbum: song.album
      });
    }
  };

  const handleAddToPlaylist = (songsToAdd: Song[], playlistId: string) => {
    const songsWithBaseIds = songsToAdd.map(song => ({
      ...song,
      id: song.id.split('-')[0]
    }));

    setPlaylists(prevPlaylists => 
      prevPlaylists.map(playlist => {
        if (playlist.id === playlistId) {
          const newSongs = [...playlist.songs];
          songsWithBaseIds.forEach(song => {
            if (!newSongs.some(s => s.id.split('-')[0] === song.id.split('-')[0])) {
              newSongs.push(song);
            }
          });
          return { ...playlist, songs: newSongs };
        }
        return playlist;
      })
    );
  };

  const handlePlayPlaylist = (playlist: PlaylistType) => {
    setCurrentPlaylist(playlist);
    setCurrentCollection(null);
    const firstSong = playlist.songs[0];
    if (firstSong) {
      handlePlayNow({
        ...firstSong,
        playlistContext: { playlist, index: 0 }
      });
    }
  };

  const handlePlayCollection = (collection: Collection) => {
    // First, resolve all songs for all sections
    const resolvedCollection = {
      ...collection,
      sections: collection.sections.map(section => {
        if (section.playlist) {
          const sectionSongs = section.playlist.songs.map(playlistSong => {
            const librarySong = songs.find(s => 
              (s.id.split('-')[0] === playlistSong.id.split('-')[0]) ||
              (s.title === playlistSong.title && s.artist === playlistSong.artist && s.album === playlistSong.album)
            );
            return librarySong || playlistSong;
          }).filter(s => s.file); // Ensure song has a file to play

          if (section.shuffle) {
            // Fisher-Yates shuffle
            for (let i = sectionSongs.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [sectionSongs[i], sectionSongs[j]] = [sectionSongs[j], sectionSongs[i]];
            }
          }
          return { ...section, playlist: { ...section.playlist, songs: sectionSongs } };
        }
        return section;
      })
    };

    setCurrentCollection(resolvedCollection);
    setCurrentPlaylist(null);
    setCurrentCollectionSectionIndex(0);

    // Find the first playable song in the collection
    let firstPlayableSong: Song | null = null;
    let sectionIndex = 0;
    for (const section of resolvedCollection.sections) {
      if (section.playlist && section.playlist.songs.length > 0) {
        firstPlayableSong = section.playlist.songs[0];
        setCurrentCollectionSectionIndex(sectionIndex);
        break;
      }
      sectionIndex++;
    }

    if (firstPlayableSong) {
      const songInLibraryIndex = songs.findIndex(s => s.id.split('-')[0] === firstPlayableSong!.id.split('-')[0]);
      if (songInLibraryIndex !== -1) {
        setCurrentSongIndex(songInLibraryIndex);
        setAutoPlay(true);
      } else {
        console.error("First song of collection not found in library", firstPlayableSong);
      }
    } else {
      console.error("No playable songs in the collection", resolvedCollection);
    }
  };

  const handleShuffleModeChange = (enabled: boolean) => {
    console.log('Shuffle mode changed:', { enabled, currentSongIndex, isPlayingQueue: false, queueLength: 0 });
    setShuffleMode(enabled);
    
    // Generate shuffle indices for main playlist
    if (enabled) {
      let songList = currentPlaylist ? currentPlaylist.songs : songs;
      let currentId = songs[currentSongIndex].id.split('-')[0];
      
      // Find current song index in the appropriate list
      let currentListIndex = songList.findIndex(s => s.id.split('-')[0] === currentId);
      
      // Get all indices except current
      let indices = songList.map((_, i) => i).filter(i => i !== currentListIndex);
      
      // Fisher-Yates shuffle
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      
      // Put current song at the beginning
      indices.unshift(currentListIndex);
      
      console.log('Generated shuffle indices:', {
        total: indices.length,
        first: indices[0],
        currentSong: songList[currentListIndex].title
      });
      
      setShuffledIndices(indices);
    } else {
      console.log('Clearing shuffle indices');
      setShuffledIndices([]);
    }
  };

  const handleNextSong = () => {
    console.log('Handling next song, current state:', {
      isPlayingQueue: false,
      queueLength: 0,
      repeatMode,
      shuffleMode,
      currentPlaylist: currentPlaylist?.name,
      currentSongId: songs[currentSongIndex]?.id,
      shuffledIndicesLength: shuffledIndices.length,
      nextShuffleIndex: shuffledIndices[1]
    });

    if (repeatMode === 'song') {
      setAutoPlay(true);
      return;
    }

    if (currentCollection) {
      const currentSection = currentCollection.sections[currentCollectionSectionIndex];
      const currentSectionPlaylist = currentSection.playlist;

      if (currentSectionPlaylist) {
        const currentSongBaseId = songs[currentSongIndex].id.split('-')[0];
        const currentSongInSectionIndex = currentSectionPlaylist.songs.findIndex(s => s.id.split('-')[0] === currentSongBaseId);

        if (currentSongInSectionIndex !== -1 && currentSongInSectionIndex < currentSectionPlaylist.songs.length - 1) {
          // Play next song in the same section
          const nextSongInSection = currentSectionPlaylist.songs[currentSongInSectionIndex + 1];
          const nextSongInLibraryIndex = songs.findIndex(s => s.id.split('-')[0] === nextSongInSection.id.split('-')[0]);
          if (nextSongInLibraryIndex !== -1) {
            setCurrentSongIndex(nextSongInLibraryIndex);
            setAutoPlay(true);
            return;
          }
        }
      }

      // Move to the next section
      const nextSectionIndex = currentCollectionSectionIndex + 1;
      if (nextSectionIndex < currentCollection.sections.length) {
        const nextSection = currentCollection.sections[nextSectionIndex];
        if (nextSection && nextSection.playlist && nextSection.playlist.songs.length > 0) {
          setCurrentCollectionSectionIndex(nextSectionIndex);
          const firstSongOfNextSection = nextSection.playlist.songs[0];
          const nextSongInLibraryIndex = songs.findIndex(s => s.id.split('-')[0] === firstSongOfNextSection.id.split('-')[0]);
          if (nextSongInLibraryIndex !== -1) {
            setCurrentSongIndex(nextSongInLibraryIndex);
            setAutoPlay(true);
            return;
          }
        }
      }

      // If at the end of the collection
      if (repeatMode === 'playlist') { // 'playlist' repeat here means repeat collection
        // Re-play collection from the start
        handlePlayCollection(currentCollection);
      }
      return;
    }

    if (currentPlaylist) {
      const currentSongBaseId = songs[currentSongIndex].id.split('-')[0];
      const currentPlaylistIndex = currentPlaylist.songs.findIndex(s => s.id.split('-')[0] === currentSongBaseId);
      
      if (currentPlaylistIndex !== -1) {
        const nextPlaylistIndex = currentPlaylistIndex + 1;
        if (nextPlaylistIndex >= currentPlaylist.songs.length) {
          if (repeatMode === 'playlist') {
            // Start from beginning
            const firstSong = currentPlaylist.songs[0];
            const firstSongBaseId = firstSong.id.split('-')[0];
            const firstSongIndex = songs.findIndex(s => s.id.split('-')[0] === firstSongBaseId);
            
            if (firstSongIndex !== -1) {
              setCurrentSongIndex(firstSongIndex);
              setAutoPlay(true);
            }
          }
          return;
        }
        
        const nextPlaylistSong = currentPlaylist.songs[nextPlaylistIndex];
        const nextSongBaseId = nextPlaylistSong.id.split('-')[0];
        const nextSongIndex = songs.findIndex(s => s.id.split('-')[0] === nextSongBaseId);
        
        if (nextSongIndex !== -1) {
          setCurrentSongIndex(nextSongIndex);
          setAutoPlay(true);
        }
      }
    } else {
      // Playing from library
      const nextIndex = currentSongIndex + 1;
      if (nextIndex >= songs.length) {
        if (repeatMode === 'playlist') {
          setCurrentSongIndex(0);
          setAutoPlay(true);
        }
        return;
      }
      
      setCurrentSongIndex(nextIndex);
      setAutoPlay(true);
    }
  };

  const handlePreviousSong = () => {
    if (!false) {
      if (repeatMode === 'song') {
        setAutoPlay(true);
        return;
      }

      if (currentPlaylist) {
        const currentSongBaseId = songs[currentSongIndex].id.split('-')[0];
        const currentIndex = currentPlaylist.songs.findIndex(s => s.id.split('-')[0] === currentSongBaseId);
        if (currentIndex > 0) {
          const prevSong = currentPlaylist.songs[currentIndex - 1];
          const prevSongIndex = songs.findIndex(s => s.id.split('-')[0] === prevSong.id.split('-')[0]);
          if (prevSongIndex !== -1) {
            setCurrentSongIndex(prevSongIndex);
            setAutoPlay(true);
          }
        } else if (repeatMode === 'playlist') {
          const lastSong = currentPlaylist.songs[currentPlaylist.songs.length - 1];
          const lastSongIndex = songs.findIndex(s => s.id === lastSong.id);
          if (lastSongIndex !== -1) {
            setCurrentSongIndex(lastSongIndex);
            setAutoPlay(true);
          }
        }
      } else {
        setCurrentSongIndex((prevIndex) => {
          if (prevIndex === 0 && repeatMode !== 'playlist') {
            return 0;
          }
          return (prevIndex - 1 + songs.length) % songs.length;
        });
        setAutoPlay(true);
      }
    }
  };

  const handleEnded = () => {
    handleNextSong();
  };

  return (
    <div className={`h-screen flex flex-col ${theme === 'dark' ? 'dark' : ''}`}>
      <header className="bg-white dark:bg-gray-800 shadow-md flex-shrink-0">
        <div className="container mx-auto p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold dark:text-white">Music Manager</h1>
            <div className="flex gap-2 items-center">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? <Moon className="dark:text-white" /> : <Sun className="dark:text-white" />}
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                Export Library
              </button>
              <label className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 cursor-pointer">
                Import Library
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
              <button
                onClick={() => {
                  localStorage.removeItem('musicManagerState');
                  setImportedSongs([]);
                  window.location.reload();
                }}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
                title="Clear all imported metadata and refresh the page"
              >
                Clear Imported Data
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto flex-grow p-4 bg-gray-100 dark:bg-gray-900 flex flex-col overflow-hidden">
        <div className="flex-grow flex md:flex-row flex-col gap-4 overflow-hidden">
          {/* Column 1: Library */}
          <div className="md:w-1/3 flex flex-col overflow-hidden">
            <h2 className="text-xl font-semibold mb-2 dark:text-white flex-shrink-0">Library</h2>
            <div className="flex-grow overflow-y-auto bg-white dark:bg-gray-800 rounded-lg p-2">
            <Library
              songs={songs}
              setSongs={setSongs}
              lastKnownDirectories={lastKnownDirectories}
              setLastKnownDirectories={setLastKnownDirectories}
              playlists={playlists}
              onAddToPlaylist={handleAddToPlaylist}
              onPlayNow={handlePlayNow}
              importedSongs={importedSongs}
            />
          </div>
          </div>
          {/* Column 2: Playlists */}
          <div className="md:w-1/3 flex flex-col overflow-hidden">
            <h2 className="text-xl font-semibold mb-2 dark:text-white flex-shrink-0">Playlists</h2>
            <div className="flex-grow overflow-y-auto bg-white dark:bg-gray-800 rounded-lg p-2">
            <Playlist
              songs={songs}
              playlists={playlists}
              setPlaylists={setPlaylists}
              setCurrentPlaylist={setCurrentPlaylist}
              onPlayPlaylist={handlePlayPlaylist}
              onPlayNow={handlePlayNow}
            />
          </div>
          </div>
          {/* Column 3: Collections */}
          <div className="md:w-1/3 flex flex-col overflow-hidden">
            <h2 className="text-xl font-semibold mb-2 dark:text-white flex-shrink-0">Collections</h2>
            <div className="flex-grow overflow-y-auto bg-white dark:bg-gray-800 rounded-lg p-2">
              <CollectionManager
                collections={collections}
                playlists={playlists}
                songs={songs}
                setCollections={setCollections}
                onPlayCollection={handlePlayCollection}
                selectedCollectionId={selectedCollectionId}
                setSelectedCollectionId={setSelectedCollectionId}
              />
            </div>
          </div>
        </div>
        {songs.length > 0 && (
          <div className="flex-shrink-0 pt-4">
            <AudioPlayer
              songs={songs}
              currentSongIndex={currentSongIndex}
              onNext={handleNextSong}
              onPrevious={handlePreviousSong}
              currentPlaylist={currentPlaylist}
              autoPlay={autoPlay}
              setAutoPlay={setAutoPlay}
              setCurrentSongIndex={setCurrentSongIndex}
              repeatMode={repeatMode}
              onRepeatModeChange={setRepeatMode}
              shuffleMode={shuffleMode}
              onShuffleModeChange={handleShuffleModeChange}
              shuffledIndices={shuffledIndices}
              currentCollection={currentCollection}
              currentCollectionSectionIndex={currentCollectionSectionIndex}
            />
          </div>
        )}
      </main>
      <footer className="bg-gray-200 dark:bg-gray-800 p-4 text-center dark:text-white flex-shrink-0">
        <p>&copy; 2024 Music Manager. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;