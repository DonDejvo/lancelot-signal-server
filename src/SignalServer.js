import { Server } from "socket.io";
import http from "http";
import { Client } from "./Client.js";
import { Room } from "./Room.js";

class SignalServer {
    _httpServer;
    _io;
    _clients;
    _rooms;

    constructor() {
        this._clients = [];
        this._rooms = [];

        this._httpServer = http.createServer((req, res) => {
            res.writeHead(200);
            res.end('');
        });

        this._io = new Server(this._httpServer, {
            pingTimeout: 20000,
            cors: {
                origin: "*",
                methods: ["POST", "GET"]
            }
        });

        this._io.on("connection", (socket) => this._onConnect(socket));

        this._io.of("/").adapter.on("create-room", (roomName) => {
            const room = this._getRoomByName(roomName);
            if (room) {
                console.log("Room " + roomName + " was created");

                this._sendMessage("create-room", room.owner, room.owner, {
                    room: roomName
                });
            }
        });

        this._io.of("/").adapter.on("join-room", (roomName, socketId) => {
            if (roomName !== socketId) {
                console.log("Socket " + socketId + " joined room " + roomName);

                this._sendMessage("join-room", socketId, roomName, {
                    room: roomName
                });
            }
        });

        this._io.of("/").adapter.on("leave-room", (roomName, socketId) => {
            if (roomName !== socketId) {
                console.log("Socket " + socketId + " left room " + roomName);

                this._sendMessage("leave-room", socketId, roomName, {
                    room: roomName
                });
            }
        });

        this._io.of("/").adapter.on("delete-room", (roomName) => {
            const room = this._getRoomByName(roomName);
            if (room) {
                console.log("Room " + roomName + " was deleted");

                this._rooms.splice(this._rooms.indexOf(room), 1);

                this._sendMessage("delete-room", room.owner, room.owner, {
                    room: roomName
                });
            }
        });
    }

    listen(port) {
        this._httpServer.listen(port, () => {
            console.log("Server is listening on port " + port);
        });
    }

    _onConnect(socket) {
        console.log("Socket " + socket.id + " connected");

        const client = new Client(socket);
        this._clients.push(client);

        socket.on("message", (data) => {
            this._sendMessage("message", socket.id, data.to, data.message);
        });

        socket.on("list-rooms", (data) => {
            this._onListRooms(socket, data);
        });

        socket.on("create-room", (data) => {
            this._onCreateRoom(socket, data.room, data.appName, data.description);
        });

        socket.on("join-room", (data) => {
            this._onJoinRoom(socket, data.room);
        });

        socket.on("leave-room", (data) => {
            this._onLeaveRoom(socket, data.room);
        });

        socket.on("delete-room", (data) => {
            this._onDeleteRoom(socket, data.room);
        });

        socket.on("disconnect", () => {
            this._onDisconnect(socket);
        });
    }

    _onListRooms(socket, data) {
        const appName = data.appName;

        const result = this._rooms.filter(room => room.appName === appName).map(room => ({
            name: room.name,
            appName: room.appName,
            description: room.description,
            owner: room.owner,
            socketCount: room.socketCount
        }));

        this._sendMessage("list-rooms", socket.id, socket.id, { rooms: result });
    }

    _onJoinRoom(socket, roomName) {
        const room = this._getRoomByName(roomName);

        if (room == null) {
            this._sendMessage("error", socket.id, socket.id, {
                message: `Could not join room ${roomName}. Room with such name does not exist in the server.`
            });
            return;
        }

        if (room.includesSocket(socket.id)) {
            this._sendMessage("error", socket.id, socket.id, {
                message: `Could not join room ${roomName}. Room already includes the socket.`
            });
            return;
        }

        socket.join(roomName);
    }

    _onLeaveRoom(socket, roomName) {
        const room = this._getRoomByName(roomName);

        if (room == null) {
            this._sendMessage("error", socket.id, socket.id, {
                message: `Could not join room ${roomName}. Room with such name does not exist in the server.`
            });
            return;
        }

        if (room.owner == socket.id) {
            this._sendMessage("error", socket.id, socket.id, {
                message: `Could not leave room ${roomName}. Owners cannot leave their rooms.`
            });
            return;
        }

        socket.leave(roomName);
    }

    _onCreateRoom(socket, roomName, appName, description) {
        const exists = this._getRoomByName(roomName) != null;

        if (exists) {
            this._sendMessage("error", socket.id, socket.id, {
                message: `Room could not be created. Room with name ${roomName} already exists in the server.`
            });
            return;
        }

        const room = new Room(this._io, roomName, appName, description, socket.id);
        this._rooms.push(room);

        socket.join(roomName);
    }

    _onDeleteRoom(socket, roomName) {
        const room = this._getRoomByName(roomName);

        if (room == null) {
            this._sendMessage("error", socket.id, socket.id, {
                message: `Could not delete room ${roomName}. Room with such name does not exist in the server.`
            });
            return;
        }

        if (room.owner != socket.id) {
            this._sendMessage("error", socket.id, socket.id, {
                message: `Could not delete room ${roomName}. Only the owner can delete rooms.`
            });
            return;
        }

        room.getSockets().then(sockets => {
            for (let socket of sockets) {
                socket.leave(roomName);
            }
        });
    }

    _sendMessage(type, from, to, data) {
        this._io.to(to).emit(type, {
            from,
            data
        });
    }

    _onDisconnect(socket) {
        console.log("Socket " + socket.id + " disconnected");

        const client = this._getClientBySocketId(socket.id);
        this._clients.splice(this._clients.indexOf(client), 1);
    }

    _getRoomByName(roomName) {
        return this._rooms.find(room => room.name === roomName);
    }

    _getClientBySocketId(socketId) {
        return this._clients.find(client => client.socket.id === socketId);
    }
}

export {
    SignalServer
}