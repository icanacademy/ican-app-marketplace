# ICAN App Marketplace

A beautiful, locally-hosted marketplace where teachers can share and discover educational apps. No accounts required!

## Features

- **Browse Apps**: Beautiful marketplace interface to discover educational apps
- **Upload Apps**: Easy upload with name, title, description, category, student levels, and optional image
- **Notion Integration**: Automatically fetch teachers list from Notion database for easy name selection
- **Edit & Delete**: Full control over your uploaded apps
- **Rate & Comment**: Interactive rating system and commenting for community feedback
- **Filter & Search**: Find apps by category, student level, or search terms
- **Responsive Design**: Works great on desktop and mobile devices

## Quick Start

### Option 1: Easy Startup (RECOMMENDED) 🚀

**Double-click to start!**

1. Find `START_MARKETPLACE.command` on your **Desktop**
2. Double-click it
3. The marketplace will start automatically!

The file is also located in the project folder: `/Users/icanacademy/ican-app-marketplace/START_MARKETPLACE.command`

### Option 2: Manual Start

**1. Install Dependencies** (first time only)

```bash
cd ican-app-marketplace
npm install
```

**2. Start the Server**

```bash
./start.sh
```

Or manually:

```bash
node server.js
```

### Access the Marketplace

After starting, open your browser and go to:

- **On your computer**: http://localhost:3010
- **On the local network**: http://YOUR_LOCAL_IP:3010

The startup script will display your local IP address for network access.

💡 **Tip**: Keep the Terminal window open while using the marketplace. Press `Ctrl+C` to stop.

## How to Use

### Upload an App

1. Click "Upload My App" button
2. Fill in the form:
   - Your Name (required)
   - App Title (required)
   - Description (required)
   - Category (required)
   - Student Levels (select one or more)
   - App Link (required)
   - App Image (optional)
3. Click "Upload App"

### Browse & Explore

- View all uploaded apps in the marketplace grid
- Use filters to narrow down by category or student level
- Use the search box to find specific apps
- Click on any app card to view full details

### Rate & Comment

1. Click on an app to view details
2. Rate the app by clicking stars (1-5)
3. Add comments to share feedback
4. View ratings and comments from other teachers

### Edit or Delete

1. Open an app's detail page
2. Click "Edit" to modify the app details
3. Click "Delete" to remove the app (with confirmation)

## Categories

- Math
- Science
- Language Arts
- Reading & Literacy
- Social Studies
- STEM
- Coding & Programming
- Art & Music
- Physical Education
- Foreign Language
- Technology
- Special Education
- Games & Activities
- Classroom Management
- Assessment Tools
- Other

## Student Levels

The "+" indicates "and above" - meaning the app is suitable for that level and higher:

- Preschool+
- Kinder+
- Elementary+
- Middle School+
- High School+
- College+
- For Teachers (apps designed for teachers' use)
- For Admin (apps designed for administrators' use)

## Technology Stack

- **Backend**: Node.js + Express
- **Database**: SQLite
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **File Upload**: Multer

## File Structure

```
ican-app-marketplace/
├── server.js           # Express server and API endpoints
├── package.json        # Dependencies
├── marketplace.db      # SQLite database (created on first run)
├── start.sh           # Startup script
├── public/
│   ├── index.html     # Main HTML file
│   ├── styles.css     # Beautiful CSS styling
│   └── script.js      # Frontend JavaScript
└── uploads/           # Uploaded app images
```

## API Endpoints

- `GET /api/apps` - Get all apps with ratings
- `GET /api/apps/:id` - Get single app details
- `POST /api/apps` - Create new app
- `PUT /api/apps/:id` - Update app
- `DELETE /api/apps/:id` - Delete app
- `GET /api/apps/:id/comments` - Get comments
- `POST /api/apps/:id/comments` - Add comment
- `POST /api/apps/:id/rate` - Rate an app
- `GET /api/teachers` - Get teachers list from Notion database

## Notion Integration

The app automatically fetches the teachers list from your Notion database for easy name selection when uploading apps, rating, or commenting. Teachers can:

- Select their name from an autocomplete dropdown
- Still type a custom name if not in the database
- See all teachers from the connected Notion database

**Configuration:**
- Notion API Token: Stored in `server.js` (line 14)
- Database ID: Stored in `server.js` (line 16)
- The integration reads the "Full Name" property from the database

## Notes

- All data is stored locally in SQLite database
- No user accounts needed - just select/enter your name when uploading
- Images are stored in the `uploads` folder
- The app runs on port 3010 by default
- Teachers list is fetched from Notion on each page load

## Support

If you encounter any issues, make sure:
1. Node.js is installed (`node --version`)
2. Dependencies are installed (`npm install`)
3. Port 3010 is available
4. You have write permissions in the directory

Enjoy sharing and discovering amazing educational apps! 🎓
