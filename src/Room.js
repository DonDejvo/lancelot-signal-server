export class Room {
    _io;
    _name;
    _appName;
    _description;
    _owner;

    constructor(io, name, appName, description, owner) {
        this._io = io;
        this._name = name;
        this._appName = appName;
        this._description = description;
        this._owner = owner;
    }

    get name() {
        return this._name;
    }

    get appName() {
        return this._appName;
    }

    get description() {
        return this._description;
    }

    get owner() {
        return this._owner;
    }

    includesSocket(socketId) {
        return this._io.of("/").adapter.rooms.get(this._name).has(socketId);
    }

    get socketCount() {
        return this._io.of("/").adapter.rooms.get(this._name).size;
    }

    async getSockets() {
        return await this._io.in(this._name).fetchSockets();
    }
}