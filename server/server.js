require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

const rooms = {};

io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);
    
    socket.on('join-room', (roomId) => {
        // Leave any existing rooms
        if (socket.roomId) {
            socket.leave(socket.roomId);
            removeParticipant(socket.roomId, socket.id);
        }
        
        // Join new room
        socket.join(roomId);
        socket.roomId = roomId;
        
        // Initialize room if it doesn't exist
        if (!rooms[roomId]) {
            rooms[roomId] = {
                participants: [],
                charts: null
            };
        }
        
        // Add participant to room
        rooms[roomId].participants.push({
            id: socket.id,
            username: socket.username || `user-${socket.id.slice(0, 4)}`
        });
        
        // Notify room members
        io.to(roomId).emit('room-joined', {
            roomId: roomId,
            participants: rooms[roomId].participants.map(p => p.username)
        });
        
        // Send existing charts if available
        if (rooms[roomId].charts) {
            socket.emit('receive-charts', rooms[roomId].charts);
        }
    });
    
    socket.on('share-charts', ({ roomId, charts }) => {
        if (rooms[roomId]) {
            rooms[roomId].charts = charts;
            socket.to(roomId).emit('receive-charts', charts);
        }
    });
    
    socket.on('set-username', (username) => {
        socket.username = username;
    });
    
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        if (socket.roomId) {
            removeParticipant(socket.roomId, socket.id);
            socket.leave(socket.roomId);
        }
    });
});

function removeParticipant(roomId, participantId) {
    if (rooms[roomId]) {
        rooms[roomId].participants = rooms[roomId].participants.filter(
            p => p.id !== participantId
        );
        
        io.to(roomId).emit('user-left', { 
            userId: participantId 
        });
        
        // Clean up empty rooms
        if (rooms[roomId].participants.length === 0) {
            delete rooms[roomId];
        } else {
            // Update remaining participants
            io.to(roomId).emit('participants-updated', {
                participants: rooms[roomId].participants.map(p => p.username)
            });
        }
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});