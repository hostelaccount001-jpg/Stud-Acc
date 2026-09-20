/**
 * WebRTC Signaling Server for Student ERP Kiosk Live Surveillance
 * Stack: Node.js, Express, Socket.io
 */

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 8085;
const PUBLIC_DIR = path.join(__dirname, 'build', 'web');

// Serve static Flutter Web release files
app.use(express.static(PUBLIC_DIR));

// In-Memory Registry for Online Student Kiosks & Admins
const activeKiosks = new Map(); // socketId -> { socketId, deviceId, ipAddress, status, timestamp }
const activeAdmins = new Set(); // Set of socketIds

// Helper to broadcast active kiosk list to all connected admins
function broadcastKioskList() {
  const kioskList = Array.from(activeKiosks.values());
  io.to('admins').emit('kiosk-list-updated', kioskList);
}

io.on('connection', (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  // 1. Kiosk Device Registration
  socket.on('register-kiosk', (data) => {
    const kioskData = {
      socketId: socket.id,
      deviceId: data.deviceId || `KIOSK-${socket.id.substring(0, 5).toUpperCase()}`,
      ipAddress: data.ipAddress || socket.handshake.address || '127.0.0.1',
      status: 'Online',
      timestamp: new Date().toISOString()
    };

    activeKiosks.set(socket.id, kioskData);
    socket.join('kiosks');
    console.log(`[Kiosk Registered] ${kioskData.deviceId} (IP: ${kioskData.ipAddress})`);
    
    // Broadcast updated kiosk list to all admins
    broadcastKioskList();
  });

  // 2. Admin Dashboard Registration
  socket.on('register-admin', () => {
    activeAdmins.add(socket.id);
    socket.join('admins');
    console.log(`[Admin Registered] Socket ID: ${socket.id}`);

    // Immediately send current list of online kiosks to newly connected admin
    socket.emit('kiosk-list-updated', Array.from(activeKiosks.values()));
  });

  // 3. WebRTC Signaling: Admin requests live stream from specific Kiosk
  socket.on('request-stream', ({ targetSocketId }) => {
    if (activeKiosks.has(targetSocketId)) {
      console.log(`[Signaling] Admin ${socket.id} requested stream from Kiosk ${targetSocketId}`);
      io.to(targetSocketId).emit('admin-requesting-stream', {
        adminSocketId: socket.id
      });
    }
  });

  // 4. WebRTC Signaling: Kiosk sends SDP Offer to Admin
  socket.on('webrtc-offer', ({ targetSocketId, sdp }) => {
    console.log(`[Signaling] Kiosk ${socket.id} sent WebRTC Offer to Admin ${targetSocketId}`);
    io.to(targetSocketId).emit('webrtc-offer', {
      kioskSocketId: socket.id,
      sdp: sdp
    });
  });

  // 5. WebRTC Signaling: Admin sends SDP Answer back to Kiosk
  socket.on('webrtc-answer', ({ targetSocketId, sdp }) => {
    console.log(`[Signaling] Admin ${socket.id} sent WebRTC Answer to Kiosk ${targetSocketId}`);
    io.to(targetSocketId).emit('webrtc-answer', {
      adminSocketId: socket.id,
      sdp: sdp
    });
  });

  // 6. WebRTC Signaling: ICE Candidate Exchange between peers
  socket.on('ice-candidate', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('ice-candidate', {
      senderSocketId: socket.id,
      candidate: candidate
    });
  });

  // 7. Handle Disconnections
  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected] ID: ${socket.id}`);

    if (activeKiosks.has(socket.id)) {
      const kiosk = activeKiosks.get(socket.id);
      console.log(`[Kiosk Disconnected] ${kiosk.deviceId}`);
      activeKiosks.delete(socket.id);
      broadcastKioskList();
    }

    if (activeAdmins.has(socket.id)) {
      activeAdmins.delete(socket.id);
    }
  });
});

const { spawn } = require('child_process');

// Fallback route for SPA index.html
app.use((req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'), (err) => {
    if (err) {
      res.status(500).send('Server Error: Build files missing.');
    }
  });
});

// Launch Python FastAPI Backend Service (Port 5000)
function startPythonBackend() {
  const pyProcess = spawn('python', ['python_backend/main.py'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });

  pyProcess.on('error', (err) => {
    console.error('[Python Backend Spawn Error]:', err.message);
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`   Student ERP Kiosk WebRTC Signaling Server        `);
  console.log(`   Running live at: http://localhost:${PORT}/      `);
  console.log(`   Python AI Engine: http://localhost:5000/api/v1/  `);
  console.log(`====================================================`);
  startPythonBackend();
});
