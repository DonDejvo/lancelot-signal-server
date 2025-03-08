import { Server } from "socket.io";
import http from "http";

class SignalServer {
    params;
    httpServer;
    io;

    constructor(params) {
        this.params = params;

        this.httpServer = http.createServer((req, res) => {
            res.writeHead(200);
            res.end("");
        });

        this.io = new Server(this.httpServer, {
            pingTimeout: params.pingTimeout ?? 10000,
            cors: params.cors ?? {
                origin: "*",
                methods: ["POST", "GET"]
            }
        });

        this.io.on("connection", (socket) => this.register(socket));

        this.httpServer.listen(params.port, () => {
            console.log("Server is listening on port " + params.port);
        });
    }

    register(socket) {
        console.log(socket.client);
    }
}

export {
    SignalServer
}