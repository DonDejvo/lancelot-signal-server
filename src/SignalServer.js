import { Server } from "socket.io";
import http from "http";

class SignalServer {
    httpServer;
    io;
    clients;

    constructor() {
        this.clients = [];

        this.httpServer = http.createServer((req, res) => {
            res.writeHead(200);
            res.end("");
        });

        this.io = new Server(this.httpServer, {
            pingTimeout: 20000,
            cors: {
                origin: "*",
                methods: ["POST", "GET"]
            }
        });

        this.io.on("connection", (socket) => this.register(socket));

        this.io.of("/").adapter.on("create-room", (room) => {
            console.log("Room " + room + " was created");
        });

        this.io.of("/").adapter.on("join-room", (room, id) => {
            console.log("socket [" + id + "] joined room " + room);

            this.sendEvent("join-room", this.io.to([room]), id, { room });
        });

        this.io.of("/").adapter.on("leave-room", (room, id) => {
            console.log("socket [" + id + "] left room " + room);

            this.sendEvent("leave-room", this.io.to([room]), id, { room });
        });
    }

    listen(port) {
        this.httpServer.listen(port, () => {
            console.log("Server is listening on port " + port);
        });
    }

    register(socket) {
        console.log("Socket [" + socket.id + "] connected");

        const client = {
            socket
        };
        this.clients.push(client);

        socket.on("message", (data) => {
            console.log(data.emitType + ": message type (" + data.message.type + ") from [" + socket.id + "]");

            switch (data.emitType) {
                case "broadcast":
                    if (data.rooms.length > 0) {
                        this.sendMessage(this.io.to(data.rooms), socket.id, data.message);
                    } else {
                        this.sendMessage(this.io, socket.id, data.message);
                    }
                    break;
                case "single":
                    const client = this.clients.find(client => client.socket.id == data.to);
                    if(client) {
                        this.sendMessage(this.io.to(client.socket.id), socket.id, data.message);
                    }
                    break;
            }
        });

        socket.on("room", (data) => {
            switch (data.action) {
                case "join":
                    socket.join(data.room);
                    break;
                case "leave":
                    socket.leave(data.room);
                    break;
            }
        })

        socket.on("disconnect", () => {
            this.unregister(socket);
        });
    }

    sendMessage(scope, from, message) {
       this.sendEvent("message", scope, from, { message });
    }

    sendEvent(type, scope, target, data) {
        scope.emit(type, {
            target,
            data
        });
    }

    unregister(socket) {
        console.log("Socket [" + socket.id + "] disconnected");

        const client = this.clients.find(client => client.socket == socket);
        this.clients.splice(this.clients.indexOf(client), 1);
    }

}

export {
    SignalServer
}