"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg = __importStar(require("pg"));
const Cursor_1 = __importDefault(require("./Cursor"));
const events_1 = require("events");
const PostgresDriver = {
    name: 'postgres',
    createConnection(url) {
        return new PostgresConnection(url).connect();
    },
    createPlaceholderFactory() {
        let count = 0;
        return () => `$${++count}`;
    }
};
exports.default = PostgresDriver;
var any_db_common_1 = require("any-db-common");
exports.sql = any_db_common_1.sql;
class PostgresConnection extends events_1.EventEmitter {
    constructor(opts) {
        super();
        this.driver = PostgresDriver;
        this._client = new pg.Client(opts);
    }
    connect() {
        return new Promise((resolve, reject) => {
            this._client.connect(error => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(this);
                }
            });
        });
    }
    submit(text, params, subscriber) {
        const cursor = new Cursor_1.default(text, params, subscriber);
        this._client.query(cursor);
        this.emit('submitted', text, params);
    }
    close() {
        return this._client.end();
    }
}
//# sourceMappingURL=Driver.js.map