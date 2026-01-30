const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = 5000;

// --- CONFIGURATION ---

const MONGO_URI = process.env.MONGO_URI;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const BUCKET_NAME = 'secret-share';

// Check for missing keys
if (!MONGO_URI || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("ERROR: Missing .env variables. Please check backend/.env");
  process.exit(1);
}

// Initialize Supabase (Service Role for backend operations)
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// File Upload Config (Memory Storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Middleware
app.use(cors()); 
app.use(express.json());

// Database Connection
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Atlas Connected'))
  .catch(err => console.error('MongoDB Error:', err.message));

// --- SCHEMA ---
const SecretSchema = new mongoose.Schema({
  type: { type: String, enum: ['text', 'file'], default: 'text' },
  content: { type: String }, // For text secrets
  
  // For file secrets (Stored in Supabase)
  fileUrl: { type: String },     
  storagePath: { type: String }, 
  fileName: { type: String },
  mimeType: { type: String },

  password: { type: String, default: '' },
  
  views: { type: Number, default: 0 },
  maxViews: { type: Number, default: 1 },
  deleteToken: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true } 
});

const Secret = mongoose.model('Secret', SecretSchema);

// --- HELPER: Delete from Supabase ---
async function deleteFromCloud(storagePath) {
  if (!storagePath) return;
  try {
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
    if (error) throw error;
    console.log(`Deleted file from Cloud: ${storagePath}`);
  } catch (error) {
    console.error(`Failed to delete cloud file: ${error.message}`);
  }
}

// --- BACKGROUND JOB ---
// Clean up expired secrets
setInterval(async () => {
  try {
    const expiredSecrets = await Secret.find({ expiresAt: { $lt: new Date() } });
    
    for (const secret of expiredSecrets) {
      if (secret.type === 'file' && secret.storagePath) {
        await deleteFromCloud(secret.storagePath);
      }
      await Secret.findByIdAndDelete(secret._id);
    }
    if (expiredSecrets.length > 0) {
      console.log(`Cleaned up ${expiredSecrets.length} expired secrets.`);
    }
  } catch (err) {
    console.error('Background Job Error:', err);
  }
}, 60 * 1000); // Run every minute

// --- ROUTES ---

// 1. Create Secret
app.post('/api/secrets', upload.single('file'), async (req, res) => {
  try {
    const { text, password, maxViews, expirationMinutes, type } = req.body;
    
    // Calculate Expiration
    const ttlMinutes = parseInt(expirationMinutes) || 60;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60000);
    const deleteToken = crypto.randomBytes(16).toString('hex');

    const newSecret = new Secret({
      type,
      password: password || '',
      maxViews: parseInt(maxViews) || 1,
      expiresAt,
      deleteToken
    });

    if (type === 'text') {
      if (!text) return res.status(400).json({ message: 'Text required' });
      newSecret.content = text;
    } else {
      if (!req.file) return res.status(400).json({ message: 'File required' });
      
      // Sanitize filename to prevent upload errors
      const safeFileName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${Date.now()}_${safeFileName}`;
      
      console.log(`Uploading: ${fileName}`);

      // Upload to Supabase
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });

      if (error) {
        console.error("Supabase Upload Error:", error);
        throw new Error("Cloud upload failed: " + error.message);
      }

      // Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);

      newSecret.fileUrl = publicUrlData.publicUrl;
      newSecret.storagePath = fileName;
      newSecret.fileName = req.file.originalname;
      newSecret.mimeType = req.file.mimetype;
    }

    const savedSecret = await newSecret.save();
    
    res.status(201).json({ 
      id: savedSecret._id, 
      deleteToken: savedSecret.deleteToken,
      expiresAt: savedSecret.expiresAt
    });
  } catch (err) {
    console.error("Create Secret Error:", err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// 2. Retrieve Secret
app.post('/api/secrets/retrieve', async (req, res) => {
  try {
    const { id, password } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ message: 'Invalid ID' });

    const secret = await Secret.findById(id);
    if (!secret) return res.status(404).json({ message: 'Secret not found or expired' });

    // Expiration check
    if (new Date() > secret.expiresAt) {
      if (secret.type === 'file') await deleteFromCloud(secret.storagePath);
      await Secret.findByIdAndDelete(id);
      return res.status(410).json({ message: 'Expired' });
    }

    // Password check
    if (secret.password && secret.password !== password) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    // View limit check
    if (secret.views >= secret.maxViews) {
      if (secret.type === 'file') await deleteFromCloud(secret.storagePath);
      await Secret.findByIdAndDelete(id);
      return res.status(410).json({ message: 'Max views reached' });
    }

    // Increment view
    secret.views += 1;
    await secret.save();

    const responseData = {
      type: secret.type,
      viewsLeft: secret.maxViews - secret.views,
      isLastView: secret.views >= secret.maxViews
    };

    if (secret.type === 'text') {
      responseData.text = secret.content;
    } else {
      responseData.file = {
        name: secret.fileName,
        url: secret.fileUrl
      };
    }

    // CLEANUP if last view
    if (secret.views >= secret.maxViews) {
      await Secret.findByIdAndDelete(id);
      
      // Delay cloud deletion slightly to allow download to start
      if (secret.type === 'file') {
        setTimeout(() => {
            deleteFromCloud(secret.storagePath);
        }, 10000);
      }
    }

    res.json(responseData);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 3. Manual Delete
app.post('/api/secrets/delete', async (req, res) => {
  try {
    const { id, deleteToken } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid ID' });

    const secret = await Secret.findById(id);
    if (!secret) return res.status(404).json({ message: 'Secret not found' });

    if (secret.deleteToken !== deleteToken) return res.status(403).json({ message: 'Invalid Token' });

    if (secret.type === 'file') await deleteFromCloud(secret.storagePath);
    await Secret.findByIdAndDelete(id);

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
