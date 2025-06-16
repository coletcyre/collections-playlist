# Music Management Web Application

## Overview

This is a web-based music management application built with React, TypeScript, and Vite. It allows users to upload, organize, and play their music files directly in the browser.

## Features

### Current Features
- Upload and manage music files
- Automatic metadata extraction from audio files
- Fallback metadata extraction from filenames
- Create and manage playlists
- Create and manage collections of playlists
- Basic audio playback controls
- Import/Export library functionality
- Local storage persistence

### Planned Features
- Audio duration extraction using Web Audio API
- Enhanced error handling for metadata extraction
- Pagination/virtual scrolling for large libraries
- Advanced search and filtering
- Customizable metadata tags

## Getting Started

1. Clone the repository
2. Install dependencies with `npm install`
3. Start the development server with `npm run dev`
4. Open the application in your web browser

## Importing and Exporting Your Library

### Exporting
To export your library, including playlists and collections:
1. Click the "Export" button in the app header
2. Save the JSON file to your computer

### Importing
To import your library:
1. Click the "Import" button in the app header
2. Select the previously exported JSON file
3. After importing, you'll need to re-upload your music files:
   - Go to the Library section
   - Click "Upload Songs" and select all the music files from your original library
   - The app will automatically match the uploaded files with the imported song metadata

Note: Due to browser security restrictions, we can't save the actual audio files in the export. You'll need to re-upload the audio files after importing, but all your playlists and collections will be preserved.

## Known Issues
- Audio duration may not be accurately extracted for some file formats
- Large libraries may experience performance issues
- Some metadata fields may not be extracted correctly from certain file formats

## Music Management Web Application

A modern web application for managing and playing your music library, featuring playlist support and a clean user interface.

### Features
- Upload and manage music files
- Create and manage playlists
- Play music with basic playback controls
- Queue system for continuous playback
- Playlist management with context menu support
- Fallback support for files without metadata

### Technical Details
- Built with React and TypeScript
- Uses Web Audio API for playback
- Handles both metadata-rich and basic audio files
- Implements flexible song matching for playlists

### Usage Notes
1. **File Upload**:
   - Supports common audio formats
   - Automatically extracts metadata when available
   - Falls back to filename-based information for basic files

2. **Playlist Management**:
   - Create multiple playlists
   - Add/remove songs from playlists
   - Right-click context menu for quick actions
   - Playlist songs persist between sessions

3. **Playback**:
   - Click "Play Now" to start immediate playback
   - Queue system for continuous playback
   - Playlist support with auto-play functionality
   - Repeat modes: none, song, playlist

### Development
- Clone the repository
- Run `npm install` to install dependencies
- Use `npm run dev` to start the development server
- See `PROJECT_OVERVIEW.md` for detailed technical information

### Known Limitations
- Metadata extraction may show errors for basic audio files (expected behavior)
- Song IDs are session-based and regenerate on upload
- Currently no support for drag-and-drop reordering

### Contributing
This is an AI generated project, more for personal reasons, feel free to do whatever you want with it :)
