import { WebSocketServer } from 'ws';

export default function WebSocket(req, res) {
  console.log('WebSocket server started');
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws) => {
    ws.on('message', (message) => {
      // Handle incoming messages from clients
    });

    ws.send('Connected to WebSocket server');
  });

  if (!res.socket.server) {
    console.log('Socket not available');
    return;
  }

  wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
    wss.emit('connection', ws, req);
  });
};