const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Store users and groups
const users = {};
const groups = {
  'general': { name: 'General', members: new Set() },
  'random': { name: 'Random', members: new Set() },
  'tech': { name: 'Tech', members: new Set() }
};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle new user joining
  socket.on('join', (username) => {
    users[socket.id] = {
      username,
      status: 'online',
      currentGroup: 'general'
    };
    groups['general'].members.add(socket.id);
    
    socket.join('general');
    io.emit('userList', users);
    io.emit('groupList', groups);
    io.to('general').emit('message', {
      sender: 'System',
      text: `${username} has joined the chat`,
      timestamp: new Date()
    });
  });

  // Handle messages
  socket.on('sendMessage', (data) => {
    const user = users[socket.id];
    if (user) {
      io.to(user.currentGroup).emit('message', {
        sender: user.username,
        text: data.text,
        timestamp: new Date()
      });
    }
  });

  // Handle typing indicator
  socket.on('typing', () => {
    const user = users[socket.id];
    if (user) {
      socket.to(user.currentGroup).emit('typing', user.username);
    }
  });

  // Handle group change
  socket.on('changeGroup', (groupName) => {
    const user = users[socket.id];
    if (user && groups[groupName]) {
      // Leave current group
      groups[user.currentGroup].members.delete(socket.id);
      socket.leave(user.currentGroup);
      
      // Join new group
      user.currentGroup = groupName;
      groups[groupName].members.add(socket.id);
      socket.join(groupName);
      
      io.emit('groupList', groups);
      io.to(groupName).emit('message', {
        sender: 'System',
        text: `${user.username} has joined the group`,
        timestamp: new Date()
      });
    }
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      // Remove from current group
      groups[user.currentGroup].members.delete(socket.id);
      
      // Update status
      user.status = 'offline';
      
      io.emit('userList', users);
      io.emit('groupList', groups);
      io.to(user.currentGroup).emit('message', {
        sender: 'System',
        text: `${user.username} has left the chat`,
        timestamp: new Date()
      });
      
      delete users[socket.id];
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
