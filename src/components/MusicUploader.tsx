import React, { useRef, useState, ChangeEvent } from 'react';
import { Song } from '../types';
import { Upload, AlertCircle, Loader } from 'lucide-react';
import { MusicUploaderProps, JSMediaTags, JSMediaTagsError } from '../types/components';

// @ts-ignore - jsmediatags doesn't have proper TypeScript support
import * as jsmediatags from 'jsmediatags';

const MusicUploader: React.FC<MusicUploaderProps> = ({ onUpload, lastKnownDirectories, importedSongs = [] }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDirectory, setSelectedDirectory] = useState('');

  const getDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      const objectUrl = URL.createObjectURL(file);
      
      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(objectUrl);
        resolve(audio.duration);
      });

      audio.addEventListener('error', () => {
        URL.revokeObjectURL(objectUrl);
        resolve(0); // Fallback duration
      });

      audio.src = objectUrl;
    });
  };

  const extractMetadata = (file: File): Promise<Song> => {
    return new Promise((resolve, reject) => {
      jsmediatags.read(file, {
        onSuccess: async (tag: JSMediaTags) => {
          try {
            const duration = await getDuration(file);
            const tags = tag.tags;
            
            // Clean up artist name for consistency
            const artist = tags.artist ? cleanArtistName(tags.artist) : undefined;
            const albumArtist = tags.album_artist ? cleanArtistName(tags.album_artist) : undefined;

            // Ensure all string fields have fallback values
            const title = cleanTitle(tags.title) || getCleanFilename(file.name);
            const finalArtist = artist || albumArtist || 'Unknown Artist';
            const album = tags.album || getAlbumFromPath(file.webkitRelativePath) || 'Unknown Album';
            const genre = tags.genre || getGenreFromPath(file.webkitRelativePath) || 'Unknown Genre';
            const trackNumber = tags.track ? String(tags.track) : getTrackNumberFromFilename(file.name);
            const directory = file.webkitRelativePath.split('/').slice(0, -1).join('/');

            // Create base song object
            const song: Song = {
              id: Date.now().toString(),
              title: title || 'Unknown Title',
              artist: finalArtist,
              album,
              genre,
              year: tags.year ? Number(tags.year) : undefined,
              duration,
              customTags: {
                directory,
                originalFilename: file.name,
                albumArtist: albumArtist || artist || 'Unknown Artist',
                trackNumber: trackNumber || ''
              },
              file,
            };

            // Try to find matching imported song to apply edited metadata
            const importedSong = findMatchingImportedSong(song);
            if (importedSong?.editedMetadata) {
              song.editedMetadata = importedSong.editedMetadata;
            }

            resolve(song);
          } catch (error) {
            console.error('Error getting duration:', error);
            reject(error);
          }
        },
        onError: (error: JSMediaTagsError) => {
          console.error('Error reading tags:', error.type, error.info);
          resolve(extractMetadataFromFilename(file));
        }
      });
    });
  };

  // Helper function to find matching imported song
  const findMatchingImportedSong = (newSong: Song): Song | undefined => {
    if (!importedSongs.length) return undefined;

    // First try to match by filename and directory
    const matchByPath = importedSongs.find(importedSong => {
      const importedPath = `${importedSong.customTags.directory}/${importedSong.customTags.originalFilename}`;
      const newPath = `${newSong.customTags.directory}/${newSong.customTags.originalFilename}`;
      return importedPath === newPath;
    });

    if (matchByPath) {
      return matchByPath;
    }

    // Then try to match by metadata
    return importedSongs.find(importedSong => 
      importedSong.title === newSong.title &&
      importedSong.artist === newSong.artist &&
      importedSong.album === newSong.album
    );
  };

  const cleanArtistName = (artist: string): string => {
    // Normalize "and" vs "&"
    return artist
      .replace(/ and /gi, ' & ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const cleanTitle = (title?: string): string => {
    if (!title) return 'Unknown Title';
    
    // Remove common suffixes and clean up
    return title
      .replace(/\s*\([^)]*\)\s*$/, '') // Remove trailing parentheses
      .replace(/\s*-\s*(Extended|Remix|Edit|Version|Mix).*$/i, '') // Remove version info
      .trim() || 'Unknown Title';
  };

  const getCleanFilename = (filename: string): string => {
    return filename
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/^\d+[\s.-_]+/, '') // Remove leading track numbers
      .replace(/\s*\([^)]*\)\s*$/, '') // Remove trailing parentheses
      .replace(/\s*-\s*(Extended|Remix|Edit|Version|Mix).*$/i, '') // Remove version info
      .trim();
  };

  const getTrackNumberFromFilename = (filename: string): string => {
    const match = filename.match(/^(\d+)/);
    return match ? match[1] : '';
  };

  const getAlbumFromPath = (path: string): string => {
    const parts = path.split('/');
    if (parts.length >= 3) {
      // Assuming structure: root/artist/album/song.mp3
      return parts[parts.length - 2];
    }
    return 'Unknown Album';
  };

  const getGenreFromPath = (path: string): string => {
    // Try to determine genre from directory structure or common patterns
    const pathLower = path.toLowerCase();
    const genrePatterns: { [key: string]: RegExp } = {
      'rock': /rock|alternative|indie/i,
      'pop': /pop|dance|electronic/i,
      'jazz': /jazz|blues|swing/i,
      'classical': /classical|orchestra|chamber/i,
      'christian': /christian|worship|gospel/i
    };

    for (const [genre, pattern] of Object.entries(genrePatterns)) {
      if (pattern.test(pathLower)) {
        return genre.charAt(0).toUpperCase() + genre.slice(1);
      }
    }
    return 'Unknown Genre';
  };

  const extractMetadataFromFilename = async (file: File): Promise<Song> => {
    // Remove file extension and clean up the filename
    let filename = getCleanFilename(file.name);
    console.log('Falling back to filename parsing:', filename);

    const formats = [
      // Artist - Title format
      {
        regex: /^(?<artist>.+?)\s*-\s*(?<title>.+)$/,
        fields: ['artist', 'title'] as const
      },
      // Title by Artist format
      {
        regex: /^(?<title>.+?)\s+by\s+(?<artist>.+)$/,
        fields: ['title', 'artist'] as const
      },
      // Artist - Album - Title format
      {
        regex: /^(?<artist>.+?)\s*-\s*(?<album>.+?)\s*-\s*(?<title>.+)$/,
        fields: ['artist', 'album', 'title'] as const
      },
      // Year - Artist - Title format
      {
        regex: /^(?<year>\d{4})\s*-\s*(?<artist>.+?)\s*-\s*(?<title>.+)$/,
        fields: ['year', 'artist', 'title'] as const
      },
      // Artist - Album (Year) - Title format
      {
        regex: /^(?<artist>.+?)\s*-\s*(?<album>.+?)\s*\((?<year>\d{4})\)\s*-\s*(?<title>.+)$/,
        fields: ['artist', 'album', 'year', 'title'] as const
      },
      // Title (Artist) format
      {
        regex: /^(?<title>.+?)\s*\((?<artist>[^)]+)\)$/,
        fields: ['title', 'artist'] as const
      }
    ];

    let metadata: { [key: string]: string | number | undefined } = {
      artist: undefined,
      title: filename,
      album: undefined,
      genre: undefined,
      year: undefined,
    };

    // Try to extract directory information
    const directoryParts = file.webkitRelativePath.split('/');
    if (directoryParts.length >= 3) {
      metadata.artist = cleanArtistName(directoryParts[directoryParts.length - 3]);
      metadata.album = directoryParts[directoryParts.length - 2];
    } else if (directoryParts.length >= 2) {
      metadata.album = directoryParts[directoryParts.length - 2];
    }

    // Try each format pattern
    for (const format of formats) {
      const match = filename.match(format.regex);
      if (match && match.groups) {
        format.fields.forEach(field => {
          if (match.groups![field]) {
            const value = match.groups![field].trim();
            if (field === 'artist') {
              metadata[field] = cleanArtistName(value);
            } else if (field === 'year') {
              metadata[field] = parseInt(value);
            } else {
              metadata[field] = value;
            }
          }
        });
        break;
      }
    }

    const duration = await getDuration(file);
    const trackNumber = getTrackNumberFromFilename(file.name);

    // Ensure all string fields have fallback values
    const title = (metadata.title as string | undefined) || 'Unknown Title';
    const artist = (metadata.artist as string | undefined) || 'Unknown Artist';
    const album = (metadata.album as string | undefined) || getAlbumFromPath(file.webkitRelativePath) || 'Unknown Album';
    const genre = (metadata.genre as string | undefined) || getGenreFromPath(file.webkitRelativePath) || 'Unknown Genre';
    const directory = file.webkitRelativePath.split('/').slice(0, -1).join('/');

    return {
      id: Date.now().toString(),
      title,
      artist,
      album,
      genre,
      year: metadata.year ? Number(metadata.year) : undefined,
      duration,
      customTags: {
        directory,
        originalFilename: file.name,
        trackNumber: trackNumber || ''
      },
      file,
    };
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setIsLoading(true);
    setError(null);

    try {
      const uploadedSongs: Song[] = [];
      const fileArray = Array.from(files);
      
      // Group files by directory
      const directoryStructure: { [key: string]: File[] } = {};
      fileArray.forEach(file => {
        const path = file.webkitRelativePath;
        const directory = path.split('/').slice(0, -1).join('/');
        if (!directoryStructure[directory]) {
          directoryStructure[directory] = [];
        }
        directoryStructure[directory].push(file);
      });

      // Process files directory by directory
      for (const [directory, dirFiles] of Object.entries(directoryStructure)) {
        console.log(`Processing directory: ${directory}`);
        for (const file of dirFiles) {
          if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|ogg|m4a|flac)$/i)) {
            try {
              const song = await extractMetadata(file);
              // Add directory information to the song
              uploadedSongs.push({
                ...song,
                customTags: {
                  ...song.customTags,
                  directory: directory
                }
              });
            } catch (err) {
              console.error(`Error processing file ${file.name}:`, err);
              // Continue with other files even if one fails
            }
          }
        }
      }

      if (uploadedSongs.length === 0) {
        setError('No audio files were found in the selected directory. Please check the directory contents.');
        return;
      }

      if (uploadedSongs.length < fileArray.length) {
        const nonAudioFiles = fileArray.length - uploadedSongs.length;
        setError(`Note: Skipped ${nonAudioFiles} non-audio files.`);
      }

      const rootDirectory = fileArray[0].webkitRelativePath.split('/')[0];
      setSelectedDirectory(rootDirectory);
      onUpload(uploadedSongs, rootDirectory);
    } catch (err) {
      setError('Error processing directory. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="mb-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="audio/*"
        className="hidden"
        {...{
          directory: "",
          webkitdirectory: "",
          mozdirectory: ""
        } as any}
      />
      <div className="flex gap-2">
        <button
          onClick={handleUploadClick}
          className="bg-blue-500 text-white px-4 py-2 rounded flex items-center"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader className="animate-spin mr-2" />
          ) : (
            <Upload className="mr-2" />
          )}
          {isLoading ? 'Uploading...' : 'Select Music Directory'}
        </button>
      </div>
      {error && (
        <div className="text-red-500 mt-2 flex items-center">
          <AlertCircle className="mr-2" />
          {error}
        </div>
      )}
      {selectedDirectory && (
        <div className="mt-2 text-sm text-gray-600">
          Current directory: {selectedDirectory}
        </div>
      )}
    </div>
  );
};

export default MusicUploader;