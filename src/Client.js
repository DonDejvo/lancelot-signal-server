export class Client {
    _socket;

    constructor(socket) {
        this._socket = socket;
    }

    get socket() {
        return this._socket;
    }
}