const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Ensure storage directory exists
const storagePath = path.join(__dirname, '..', 'storage');
if (!fs.existsSync(storagePath)) fs.mkdirSync(storagePath, { recursive: true });

// API Routes
app.use('/api/rigs', require('./routes/rigs'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/workorders', require('./routes/workorders'));
app.use('/api/equipment', require('./routes/equipment'));
app.use('/api/users', require('./routes/users'));
app.use('/api/inbox', require('./routes/inbox'));
app.use('/api/my-documents', require('./routes/myDocuments'));
app.use('/api/report', require('./routes/report'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/config', require('./routes/config'));
app.use('/api/tile-data', require('./routes/tileData'));

// Serve React build in production
const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      message: 'DMS V2 API Server Running',
      note: 'Run "npm run build" to build the client, or "npm run dev" for development mode',
      api: '/api'
    });
  });
}

app.listen(PORT, () => {
  console.log(`\n🚀 DMS V2 Server running on http://localhost:${PORT}`);
  if (!fs.existsSync(clientBuildPath)) {
    console.log('   Client not built. Run "npm run build" or "npm run dev" for hot-reload dev mode.\n');
  }
});

module.exports = app;
