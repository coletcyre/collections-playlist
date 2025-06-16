import { AppState, Song } from '../types';

export const exportAppState = (state: AppState): string => {
  console.log('Exporting state with songs:', state.songs.map(s => ({
    title: s.title,
    editedMetadata: s.editedMetadata
  })));

  const exportData = {
    songs: state.songs.map(song => ({
      title: song.title,
      artist: song.artist,
      album: song.album,
      genre: song.genre,
      year: song.year,
      duration: song.duration,
      customTags: song.customTags,
      editedMetadata: song.editedMetadata || null,
      id: song.id.split('-')[0] // Store base ID only
    })),
    playlists: state.playlists,
    collections: state.collections,
    lastKnownDirectories: state.lastKnownDirectories
  };
  return JSON.stringify(exportData);
};

export const importAppState = (jsonString: string): Partial<AppState> => {
  try {
    console.log('Starting import of app state');
    const importedData = JSON.parse(jsonString);
    
    if (importedData.songs) {
      // Process imported songs to ensure metadata is preserved
      importedData.songs = importedData.songs.map((song: any) => ({
        ...song,
        editedMetadata: song.editedMetadata || null,
        file: null // Clear file reference as it can't be serialized
      }));

      console.log('Processing imported songs:', importedData.songs.map((s: Song) => ({
        title: s.title,
        artist: s.artist,
        album: s.album,
        editedMetadata: s.editedMetadata
      })));
    }

    return importedData;
  } catch (error) {
    console.error('Error importing app state:', error);
    return {};
  }
};

export const saveToLocalStorage = (state: AppState) => {
  const songsWithMetadata = state.songs.filter(s => s.editedMetadata).map(s => ({
    title: s.title,
    artist: s.artist,
    album: s.album,
    editedMetadata: s.editedMetadata
  }));
  
  console.log('Saving to localStorage, songs with metadata:', songsWithMetadata);
  localStorage.setItem('musicManagerState', exportAppState(state));
};

export const loadFromLocalStorage = (): Partial<AppState> | null => {
  const savedState = localStorage.getItem('musicManagerState');
  if (!savedState) return null;

  const importedState = importAppState(savedState);
  console.log('Loaded from localStorage:', {
    songsWithMetadata: importedState.songs?.filter(s => s.editedMetadata).map(s => ({
      title: s.title,
      editedMetadata: s.editedMetadata
    }))
  });
  
  return importedState;
};