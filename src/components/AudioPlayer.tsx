import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward, List, X, GripVertical, Repeat, Repeat1, Shuffle, Trash2 } from 'lucide-react';
import { Song, Playlist, Collection } from '../types';

interface AudioPlayerProps {
  songs: Song[];
  currentSongIndex: number;
  onNext: () => void;
  onPrevious: () => void;
  currentPlaylist: Playlist | null;
  autoPlay?: boolean;
  setAutoPlay: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentSongIndex: React.Dispatch<React.SetStateAction<number>>;
  repeatMode: 'none' | 'song' | 'playlist';
  onRepeatModeChange: (mode: 'none' | 'song' | 'playlist') => void;
  shuffleMode: boolean;
  onShuffleModeChange: (enabled: boolean) => void;
  shuffledIndices: number[];
  currentCollection: Collection | null;
  currentCollectionSectionIndex: number;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  songs,
  currentSongIndex,
  onNext,
  onPrevious,
  currentPlaylist,
  autoPlay,
  setAutoPlay,
  setCurrentSongIndex,
  repeatMode,
  onRepeatModeChange,
  shuffleMode,
  onShuffleModeChange,
  shuffledIndices,
  currentCollection,
  currentCollectionSectionIndex,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showQueue, setShowQueue] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const isTransitioningRef = useRef(false);

  const currentSong = songs[currentSongIndex];

  // Update effect to handle audio context and source
  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  // Update song source effect
  useEffect(() => {
    console.log('Current song changed:', currentSong);
    if (audioRef.current && currentSong) {
      // Clean up previous object URL
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      
      setCurrentTime(0);
      setError(null);

      // Set new audio source
      if (currentSong.file instanceof File) {
        const url = URL.createObjectURL(currentSong.file);
        objectUrlRef.current = url;
        audioRef.current.src = url;
        
        // Connect to audio context
        if (audioContextRef.current && audioRef.current) {
          if (audioSourceRef.current) {
            audioSourceRef.current.disconnect();
          }
          audioSourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
          audioSourceRef.current.connect(audioContextRef.current.destination);
        }
        
        audioRef.current.load();
        console.log('Set audio source:', url);
      } else {
        console.error('No playable source for the current song');
        setError('No playable source for this song');
      }
    }

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      if (audioSourceRef.current) {
        audioSourceRef.current.disconnect();
        audioSourceRef.current = null;
      }
    };
  }, [currentSong]);

  // Update auto-play effect
  useEffect(() => {
    if (!audioRef.current || !currentSong) return;

    const audio = audioRef.current;
    
    const handleCanPlay = () => {
      console.log('Can play event triggered');
      if (autoPlay && !isTransitioningRef.current) {
        console.log('Attempting auto-play');
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('Successfully started playback');
              setIsPlaying(true);
              setError(null);
            })
            .catch((error) => {
              console.error('Error auto-playing audio:', error);
              setError(`Error playing audio: ${error.message}`);
              setIsPlaying(false);
            });
        }
      }
    };

    const handleAudioEnded = () => {
      console.log('Audio ended event fired');
      handleEnded();
    };

    // Clean up previous event listeners
    audio.removeEventListener('canplay', handleCanPlay);
    audio.removeEventListener('ended', handleAudioEnded);
    
    // Add new event listeners
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleAudioEnded);
    
    // Load the audio to trigger canplay event
    audio.load();
    
    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleAudioEnded);
    };
  }, [currentSong, autoPlay]);

  // Update play/pause toggle
  const togglePlayPause = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
          setIsPlaying(true);
          setError(null);
        }
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      setError(`Error playing audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    console.log('Audio ended, handling next song');
    if (isTransitioningRef.current) return;
    
    isTransitioningRef.current = true;
    setIsPlaying(false);

    if (repeatMode === 'song') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              setError(null);
              isTransitioningRef.current = false;
            })
            .catch(error => {
              console.error('Error replaying audio:', error);
              setError(`Error playing audio: ${error.message}`);
              setIsPlaying(false);
              isTransitioningRef.current = false;
            });
        }
      }
    } else {
      onNext();
      isTransitioningRef.current = false;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const upcomingSongs = useMemo(() => {
    if (!currentCollection) return [];
    
    let songs: Song[] = [];
    const currentSection = currentCollection.sections[currentCollectionSectionIndex];
    if (currentSection && currentSection.playlist) {
      const currentSongBaseId = currentSong?.id.split('-')[0];
      const currentSongInSectionIndex = currentSection.playlist.songs.findIndex(s => s.id.split('-')[0] === currentSongBaseId);
      
      if (currentSongInSectionIndex !== -1) {
        songs.push(...currentSection.playlist.songs.slice(currentSongInSectionIndex + 1));
      }
    }
    
    // Add songs from subsequent sections
    for (let i = currentCollectionSectionIndex + 1; i < currentCollection.sections.length; i++) {
      const section = currentCollection.sections[i];
      if (section.playlist) {
        songs.push(...section.playlist.songs);
      }
    }
    
    return songs;
  }, [currentCollection, currentCollectionSectionIndex, currentSong]);

  const playbackStatus = useMemo(() => {
    if (currentCollection) {
      const currentSection = currentCollection.sections[currentCollectionSectionIndex];
      return `Playing from ${currentCollection.name} - ${currentSection.name}`;
    }
    if (currentPlaylist) {
      return `Playing from ${currentPlaylist.name}`;
    }
    return 'Playing from Library';
  }, [currentPlaylist, currentCollection, currentCollectionSectionIndex]);

  const handleRepeatClick = () => {
    const modes = ['none', 'playlist', 'song'];
    const nextMode = modes[(modes.indexOf(repeatMode) + 1) % modes.length] as 'none' | 'song' | 'playlist';
    onRepeatModeChange(nextMode);
  };

  if (!currentSong) return null;

  const { title, artist, album } = currentSong.editedMetadata || currentSong;
  const duration = currentSong.duration || (audioRef.current?.duration || 0);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-4 shadow-lg flex items-center justify-between">
      <div className="flex items-center gap-4 w-1/4">
        <div>
          <p className="font-bold">{title}</p>
          <p className="text-sm text-gray-400">{artist} - {album}</p>
        </div>
      </div>
      <div className="flex flex-col items-center gap-2 w-1/2">
        <div className="flex items-center gap-4">
          <button onClick={() => onShuffleModeChange(!shuffleMode)} className={`p-2 rounded-full hover:bg-gray-700 ${shuffleMode ? 'text-green-400' : ''}`}>
            <Shuffle />
          </button>
          <button onClick={onPrevious} className="p-2 rounded-full hover:bg-gray-700">
            <SkipBack />
          </button>
          <button onClick={togglePlayPause} className="p-4 bg-white text-black rounded-full hover:bg-gray-200">
            {isPlaying ? <Pause /> : <Play />}
          </button>
          <button onClick={onNext} className="p-2 rounded-full hover:bg-gray-700">
            <SkipForward />
          </button>
          <button onClick={handleRepeatClick} className={`p-2 rounded-full hover:bg-gray-700 ${repeatMode !== 'none' ? 'text-green-400' : ''}`}>
            {repeatMode === 'song' ? <Repeat1 /> : <Repeat />}
          </button>
        </div>
        <div className="flex items-center gap-2 w-full">
          <span className="text-xs">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            onChange={(e) => {
              if (audioRef.current) {
                audioRef.current.currentTime = Number(e.target.value);
              }
            }}
            className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs">{formatTime(duration)}</span>
        </div>
        <div className="text-xs text-gray-400">{playbackStatus}</div>
      </div>
      <div className="w-1/4 flex justify-end items-center gap-2">
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <button onClick={() => setShowQueue(!showQueue)} className="p-2 rounded-full hover:bg-gray-700 relative">
          <List />
          {upcomingSongs.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5">
              {upcomingSongs.length}
            </span>
          )}
        </button>
      </div>

      {showQueue && (
        <div className="absolute bottom-full right-0 mb-2 w-96 bg-gray-900 shadow-lg rounded-lg overflow-hidden border border-gray-700">
          <div className="p-3 border-b border-gray-700">
            <h3 className="font-medium text-white">Up Next</h3>
            <p className="text-sm text-gray-400">{playbackStatus}</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {upcomingSongs.length > 0 ? (
              <ul className="divide-y divide-gray-700">
                {upcomingSongs.map((song, index) => (
                  <li key={`${song.id}-${index}`} className="p-3 hover:bg-gray-800 flex items-center gap-3">
                    <div className="flex-grow">
                      <p className="font-medium text-white truncate">{song.editedMetadata?.title || song.title}</p>
                      <p className="text-sm text-gray-400 truncate">{song.editedMetadata?.artist || song.artist}</p>
                    </div>
                    <span className="text-xs text-gray-500">{formatTime(song.duration || 0)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 text-center text-gray-500">
                End of collection
              </div>
            )}
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            // Force re-render to update duration
            setCurrentTime(0); 
          }
        }}
        crossOrigin="anonymous"
      />
    </div>
  );
};

export default AudioPlayer;