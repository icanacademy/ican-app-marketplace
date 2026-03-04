const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Client } = require('@notionhq/client');

const app = express();
const PORT = 3010;

// Notion API Configuration
const notion = new Client({
  auth: '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'
});
const NOTION_DATABASE_ID = '1abd37d6663080ae9307ddbee22c48b1';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Create uploads directory if it doesn't exist
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Images only!');
    }
  }
});

// Initialize SQLite database
const db = new sqlite3.Database('./marketplace.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  // Apps table
  db.run(`CREATE TABLE IF NOT EXISTS apps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    student_levels TEXT NOT NULL,
    app_link TEXT NOT NULL,
    alternative_link TEXT,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Add alternative_link column if it doesn't exist (for existing databases)
  db.run(`ALTER TABLE apps ADD COLUMN alternative_link TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Error adding alternative_link column:', err.message);
    }
  });

  // Ratings table
  db.run(`CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    teacher_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
  )`);

  // Comments table
  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id INTEGER NOT NULL,
    teacher_name TEXT NOT NULL,
    comment TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
  )`);

  // Segments table for EDUSPACE and RE-EARTH tools
  db.run(`CREATE TABLE IF NOT EXISTS segment_tools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    segment_id TEXT NOT NULL CHECK(segment_id IN ('EDUSPACE', 'RE-EARTH')),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT DEFAULT 'default',
    description TEXT,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
}

// API Routes

// Get teachers list from Notion
app.get('/api/teachers', async (req, res) => {
  try {
    let allResults = [];
    let hasMore = true;
    let startCursor = undefined;

    // Fetch all pages from Notion (handle pagination)
    while (hasMore) {
      const response = await notion.databases.query({
        database_id: NOTION_DATABASE_ID,
        start_cursor: startCursor,
        page_size: 100, // Maximum allowed by Notion
      });

      allResults = allResults.concat(response.results);
      hasMore = response.has_more;
      startCursor = response.next_cursor;
    }

    console.log(`Fetched ${allResults.length} teachers from Notion`);

    // Filter for Active teachers only and extract names
    const teachers = allResults
      .filter(page => {
        const properties = page.properties;
        // Check if Status is "Active"
        const status = properties.Status;
        return status && status.type === 'select' && status.select && status.select.name === 'Active';
      })
      .map(page => {
        const properties = page.properties;
        let fullName = '';

        // Get the "Full Name" property which is the title
        if (properties['Full Name'] && properties['Full Name'].title?.[0]) {
          fullName = properties['Full Name'].title[0].plain_text;
        } else {
          // Fallback: find any title property
          const titleProp = Object.values(properties).find(prop => prop.type === 'title');
          if (titleProp && titleProp.title?.[0]) {
            fullName = titleProp.title[0].plain_text;
          }
        }

        if (!fullName) return '';

        // Check if there's a name in brackets like "John Doe (Johnny)"
        const bracketMatch = fullName.match(/\(([^)]+)\)/);
        if (bracketMatch) {
          return bracketMatch[1].trim();
        }

        // Otherwise, extract just the first name
        const firstName = fullName.split(' ')[0].trim();
        return firstName;
      })
      .filter(name => name && name.trim() !== ''); // Remove empty names

    // Sort teachers alphabetically
    teachers.sort((a, b) => a.localeCompare(b));

    console.log(`Returning ${teachers.length} active teacher names (filtered from ${allResults.length} total)`);
    res.json(teachers);
  } catch (error) {
    console.error('Error fetching teachers from Notion:', error);
    res.status(500).json({ error: 'Failed to fetch teachers', details: error.message });
  }
});

// Get all apps with their average ratings
app.get('/api/apps', (req, res) => {
  const query = `
    SELECT
      a.*,
      COALESCE(AVG(r.rating), 0) as average_rating,
      COUNT(DISTINCT r.id) as rating_count,
      COUNT(DISTINCT c.id) as comment_count
    FROM apps a
    LEFT JOIN ratings r ON a.id = r.app_id
    LEFT JOIN comments c ON a.id = c.app_id
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get single app with details
app.get('/api/apps/:id', (req, res) => {
  const query = `
    SELECT
      a.*,
      COALESCE(AVG(r.rating), 0) as average_rating,
      COUNT(DISTINCT r.id) as rating_count
    FROM apps a
    LEFT JOIN ratings r ON a.id = r.app_id
    WHERE a.id = ?
    GROUP BY a.id
  `;

  db.get(query, [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'App not found' });
      return;
    }
    res.json(row);
  });
});

// Create new app
app.post('/api/apps', upload.single('image'), (req, res) => {
  const { teacher_name, title, description, category, student_levels, app_link, alternative_link } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;

  const query = `
    INSERT INTO apps (teacher_name, title, description, category, student_levels, app_link, alternative_link, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [teacher_name, title, description, category, student_levels, app_link, alternative_link || null, image_url], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, message: 'App uploaded successfully!' });
  });
});

// Update app
app.put('/api/apps/:id', upload.single('image'), (req, res) => {
  const { teacher_name, title, description, category, student_levels, app_link, alternative_link } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : req.body.existing_image;

  const query = `
    UPDATE apps
    SET teacher_name = ?, title = ?, description = ?, category = ?,
        student_levels = ?, app_link = ?, alternative_link = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(query, [teacher_name, title, description, category, student_levels, app_link, alternative_link || null, image_url, req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'App updated successfully!' });
  });
});

// Delete app
app.delete('/api/apps/:id', (req, res) => {
  // First get the app to delete its image
  db.get('SELECT image_url FROM apps WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    // Delete the image file if it exists
    if (row && row.image_url) {
      const imagePath = path.join(__dirname, 'public', row.image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete the app
    db.run('DELETE FROM apps WHERE id = ?', [req.params.id], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'App deleted successfully!' });
    });
  });
});

// Get comments for an app
app.get('/api/apps/:id/comments', (req, res) => {
  const query = 'SELECT * FROM comments WHERE app_id = ? ORDER BY created_at DESC';

  db.all(query, [req.params.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Add comment
app.post('/api/apps/:id/comments', (req, res) => {
  const { teacher_name, comment } = req.body;
  const query = 'INSERT INTO comments (app_id, teacher_name, comment) VALUES (?, ?, ?)';

  db.run(query, [req.params.id, teacher_name, comment], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, message: 'Comment added successfully!' });
  });
});

// Delete comment
app.delete('/api/comments/:id', (req, res) => {
  db.run('DELETE FROM comments WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Comment deleted successfully!' });
  });
});

// Add/update/remove rating (like/unlike)
app.post('/api/apps/:id/rate', (req, res) => {
  const { teacher_name, rating } = req.body;

  // Check if user already rated this app
  db.get('SELECT id FROM ratings WHERE app_id = ? AND teacher_name = ?',
    [req.params.id, teacher_name],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      if (row) {
        // User already liked - remove the like (unlike)
        db.run('DELETE FROM ratings WHERE id = ?', [row.id], function(err) {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          res.json({ message: 'App unliked successfully!', action: 'unliked' });
        });
      } else {
        // Insert new rating (like)
        db.run('INSERT INTO ratings (app_id, teacher_name, rating) VALUES (?, ?, ?)',
          [req.params.id, teacher_name, 5],
          function(err) {
            if (err) {
              res.status(500).json({ error: err.message });
              return;
            }
            res.json({ message: 'App liked successfully!', action: 'liked' });
          }
        );
      }
    }
  );
});

// Check if user has liked an app
app.get('/api/apps/:id/check-like/:teacherName', (req, res) => {
  db.get('SELECT id FROM ratings WHERE app_id = ? AND teacher_name = ?',
    [req.params.id, req.params.teacherName],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ liked: !!row });
    }
  );
});

// Get list of teachers who liked an app
app.get('/api/apps/:id/likes', (req, res) => {
  db.all('SELECT teacher_name, created_at FROM ratings WHERE app_id = ? ORDER BY created_at DESC',
    [req.params.id],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ likes: rows });
    }
  );
});

// Generate likes report and save to file
app.get('/api/generate-likes-report', (req, res) => {
  const query = `
    SELECT
      a.id,
      a.title,
      a.teacher_name as app_creator,
      r.teacher_name as liked_by,
      r.created_at
    FROM ratings r
    JOIN apps a ON r.app_id = a.id
    ORDER BY a.id, r.created_at DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    // Format the data into a readable text file
    let report = '=================================================\n';
    report += '           ICAN APP MARKETPLACE - LIKES REPORT\n';
    report += '=================================================\n';
    report += `Generated: ${new Date().toLocaleString()}\n`;
    report += '=================================================\n\n';

    // Group by app
    const appGroups = {};
    rows.forEach(row => {
      if (!appGroups[row.id]) {
        appGroups[row.id] = {
          title: row.title,
          creator: row.app_creator,
          likes: []
        };
      }
      appGroups[row.id].likes.push({
        teacher: row.liked_by,
        date: row.created_at
      });
    });

    // Generate report content
    Object.keys(appGroups).forEach(appId => {
      const app = appGroups[appId];
      report += `App ID: ${appId}\n`;
      report += `Title: ${app.title}\n`;
      report += `Creator: ${app.creator}\n`;
      report += `Total Likes: ${app.likes.length}\n`;
      report += `Liked by:\n`;
      app.likes.forEach(like => {
        report += `  - ${like.teacher} (${like.date})\n`;
      });
      report += '\n' + '-'.repeat(50) + '\n\n';
    });

    // Add summary
    const totalLikes = rows.length;
    const uniqueApps = Object.keys(appGroups).length;
    report += '=================================================\n';
    report += 'SUMMARY\n';
    report += '=================================================\n';
    report += `Total Apps with Likes: ${uniqueApps}\n`;
    report += `Total Likes: ${totalLikes}\n`;
    report += '=================================================\n';

    // Save to file
    const fileName = `likes-report-${Date.now()}.txt`;
    const filePath = path.join(__dirname, fileName);

    fs.writeFile(filePath, report, (writeErr) => {
      if (writeErr) {
        res.status(500).json({ error: 'Failed to write report file' });
        return;
      }
      res.json({
        message: 'Likes report generated successfully!',
        fileName: fileName,
        filePath: filePath,
        totalApps: uniqueApps,
        totalLikes: totalLikes
      });
    });
  });
});

// Get dashboard statistics
app.get('/api/stats', async (req, res) => {
  try {
    // Get total apps
    const totalApps = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM apps', [], (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    // Get total likes
    const totalLikes = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM ratings', [], (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    // Get total comments
    const totalComments = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM comments', [], (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    // Get total contributors (unique teachers)
    const totalContributors = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(DISTINCT teacher_name) as count FROM apps', [], (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    // Get top 5 most liked apps
    const topApps = await new Promise((resolve, reject) => {
      db.all(`
        SELECT a.id, a.title, COUNT(r.id) as likes
        FROM apps a
        LEFT JOIN ratings r ON a.id = r.app_id
        GROUP BY a.id
        ORDER BY likes DESC
        LIMIT 5
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get apps by category
    const categories = await new Promise((resolve, reject) => {
      db.all(`
        SELECT category, COUNT(*) as count
        FROM apps
        GROUP BY category
        ORDER BY count DESC
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get top 5 contributors
    const topContributors = await new Promise((resolve, reject) => {
      db.all(`
        SELECT teacher_name, COUNT(*) as count
        FROM apps
        GROUP BY teacher_name
        ORDER BY count DESC
        LIMIT 5
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get all contributors with detailed stats
    const allContributors = await new Promise((resolve, reject) => {
      db.all(`
        SELECT
          a.teacher_name,
          COUNT(DISTINCT a.id) as app_count,
          COUNT(DISTINCT r.id) as total_likes,
          COUNT(DISTINCT c.id) as total_comments
        FROM apps a
        LEFT JOIN ratings r ON a.id = r.app_id
        LEFT JOIN comments c ON a.id = c.app_id
        GROUP BY a.teacher_name
        ORDER BY app_count DESC, total_likes DESC
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get apps by student level (this is trickier since levels are stored as comma-separated)
    const allAppsForLevels = await new Promise((resolve, reject) => {
      db.all('SELECT student_levels FROM apps', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Count apps per level
    const levelCounts = {};
    allAppsForLevels.forEach(app => {
      const levels = app.student_levels.split(',').map(l => l.trim());
      levels.forEach(level => {
        levelCounts[level] = (levelCounts[level] || 0) + 1;
      });
    });

    const levels = Object.entries(levelCounts)
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => b.count - a.count);

    // Get top 5 most commented apps
    const mostCommentedApps = await new Promise((resolve, reject) => {
      db.all(`
        SELECT a.id, a.title, COUNT(c.id) as comments
        FROM apps a
        LEFT JOIN comments c ON a.id = c.app_id
        GROUP BY a.id
        ORDER BY comments DESC
        LIMIT 5
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get category performance (average likes per category)
    const categoryPerformance = await new Promise((resolve, reject) => {
      db.all(`
        SELECT
          a.category,
          COUNT(DISTINCT a.id) as app_count,
          COUNT(r.id) as total_likes,
          CAST(COUNT(r.id) AS FLOAT) / COUNT(DISTINCT a.id) as avg_likes
        FROM apps a
        LEFT JOIN ratings r ON a.id = r.app_id
        GROUP BY a.category
        ORDER BY avg_likes DESC
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      totalApps,
      totalLikes,
      totalComments,
      totalContributors,
      topApps,
      categories,
      topContributors,
      levels,
      mostCommentedApps,
      categoryPerformance,
      allContributors
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ==================== SEGMENT TOOLS API ====================

// Get all segment tools
app.get('/api/segments', (req, res) => {
  const query = 'SELECT * FROM segment_tools ORDER BY segment_id, display_order, created_at';

  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    // Group tools by segment_id
    const segments = {
      'EDUSPACE': [],
      'RE-EARTH': []
    };

    rows.forEach(row => {
      if (segments[row.segment_id]) {
        segments[row.segment_id].push(row);
      }
    });

    res.json(segments);
  });
});

// Get tools for a specific segment
app.get('/api/segments/:segmentId', (req, res) => {
  const segmentId = req.params.segmentId.toUpperCase();

  if (!['EDUSPACE', 'RE-EARTH'].includes(segmentId)) {
    res.status(400).json({ error: 'Invalid segment ID. Must be EDUSPACE or RE-EARTH' });
    return;
  }

  const query = 'SELECT * FROM segment_tools WHERE segment_id = ? ORDER BY display_order, created_at';

  db.all(query, [segmentId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Add tool to segment
app.post('/api/segments/:segmentId/tools', (req, res) => {
  const segmentId = req.params.segmentId.toUpperCase();
  const { name, url, icon, description, display_order } = req.body;

  if (!['EDUSPACE', 'RE-EARTH'].includes(segmentId)) {
    res.status(400).json({ error: 'Invalid segment ID. Must be EDUSPACE or RE-EARTH' });
    return;
  }

  if (!name || !url) {
    res.status(400).json({ error: 'Name and URL are required' });
    return;
  }

  const query = `
    INSERT INTO segment_tools (segment_id, name, url, icon, description, display_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [segmentId, name, url, icon || 'default', description || '', display_order || 0], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, message: 'Tool added successfully!' });
  });
});

// Update segment tool
app.put('/api/segments/:segmentId/tools/:toolId', (req, res) => {
  const segmentId = req.params.segmentId.toUpperCase();
  const toolId = req.params.toolId;
  const { name, url, icon, description, display_order } = req.body;

  if (!['EDUSPACE', 'RE-EARTH'].includes(segmentId)) {
    res.status(400).json({ error: 'Invalid segment ID. Must be EDUSPACE or RE-EARTH' });
    return;
  }

  const query = `
    UPDATE segment_tools
    SET name = ?, url = ?, icon = ?, description = ?, display_order = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND segment_id = ?
  `;

  db.run(query, [name, url, icon || 'default', description || '', display_order || 0, toolId, segmentId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Tool not found' });
      return;
    }
    res.json({ message: 'Tool updated successfully!' });
  });
});

// Delete segment tool
app.delete('/api/segments/:segmentId/tools/:toolId', (req, res) => {
  const segmentId = req.params.segmentId.toUpperCase();
  const toolId = req.params.toolId;

  if (!['EDUSPACE', 'RE-EARTH'].includes(segmentId)) {
    res.status(400).json({ error: 'Invalid segment ID. Must be EDUSPACE or RE-EARTH' });
    return;
  }

  db.run('DELETE FROM segment_tools WHERE id = ? AND segment_id = ?', [toolId, segmentId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Tool not found' });
      return;
    }
    res.json({ message: 'Tool deleted successfully!' });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ICAN App Marketplace running on http://localhost:${PORT}`);
  console.log(`📱 Access it on your local network at http://YOUR_LOCAL_IP:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed.');
    process.exit(0);
  });
});
