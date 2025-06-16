# Music Management Web Application - Project Overview

## Recent Changes and Issues

43. Identified metadata extraction inconsistency:
    - Currently using music-metadata-browser despite planned switch to jsmediatags
    - Need to complete the migration to jsmediatags for metadata extraction
    - Update MusicUploader component accordingly

44. Performance concerns identified:
    - Large libraries may cause performance issues
    - Need to implement pagination or virtual scrolling
    - Consider implementing lazy loading for audio files

45. Audio duration extraction pending:
    - Current implementation doesn't accurately extract duration
    - Plan to implement Web Audio API solution
    - Need to update Song type and related components

## Recent Changes

### Playlist Playback Improvements (2025-01-04)
- Fixed playlist playback issues by implementing title-based song matching as a fallback
- Added playlist song synchronization with library on playback start
- Improved song ID handling across library and playlists
- Enhanced logging for better debugging of playlist and playback states

### Key Technical Insights
1. **Song ID Management**:
   - Song IDs are regenerated on file upload, causing mismatches with saved playlists
   - Solution: Implemented title-based fallback matching for playlist songs
   - Future consideration: Consider implementing persistent IDs based on file content hash

2. **Playlist-Library Synchronization**:
   - Playlists need to stay synchronized with the library's current song instances
   - Solution: Update playlist song references when starting playback
   - Benefit: Ensures consistent playback and state management

3. **Audio File Handling**:
   - Simple audio files may lack metadata, causing metadata extraction errors
   - Current approach: Gracefully fall back to filename-based information
   - Note: These errors can be safely ignored for basic audio files

### Development Notes
- Keep logging detailed but focused on relevant state changes
- Maintain consistent ID handling across components
- Consider implementing song deduplication by content rather than metadata
- Test playlist functionality with both metadata-rich and basic audio files

## Current Features

1. Upload music files
2. Extract metadata from audio files with fallback to filename parsing
3. Display uploaded songs in a table format
4. Search functionality for songs
5. Edit song metadata
6. Delete individual songs
7. Create and manage playlists
8. Create and manage collections of playlists
9. Basic audio playback functionality
10. Import/Export functionality with local storage support

## Known Issues and Future Improvements

55. Complete migration to jsmediatags:
    - Replace music-metadata-browser implementation
    - Update metadata extraction logic
    - Add better error handling for various file formats

56. Implement performance optimizations:
    - Add pagination to Library component
    - Implement virtual scrolling for large lists
    - Optimize state management for better performance

57. Enhance audio playback:
    - Implement proper duration extraction
    - Add visualizations
    - Improve playback controls

## Known Issues
- Metadata extraction errors with basic audio files (expected behavior)
- Song IDs regenerate on each upload (current design, may need revision)

## Future Improvements
- Enhance playlist management UI
- Add drag-and-drop reordering for playlist songs

## Common Mistakes to Avoid

40. Ensure proper error handling for all file operations
41. Test with various audio formats and file sizes
42. Maintain consistent state management across components
43. Handle large libraries efficiently
44. Properly clean up resources (e.g., audio contexts, file readers)

We will continue to monitor these changes and make necessary adjustments to improve the overall quality and consistency of the application.