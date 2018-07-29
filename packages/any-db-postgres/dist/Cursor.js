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
const result_1 = __importDefault(require("pg/lib/result"));
class Cursor {
    constructor(text, values, subscriber) {
        this.connection = null;
        this.subscriber = subscriber;
        this.text = text;
        this.values = values;
        this.usePreparedStatement = values.length > 0;
        this.state = 'initialized';
        this.pgResult = new result_1.default();
        this.paused = false;
        this.rowBuffer = [];
    }
    submit(connection) {
        this.connection = connection;
        if (this.usePreparedStatement) {
            connection.parse({ text: this.text }, true);
            connection.bind({ values: this.values.map(pg.prepareValue) }, true);
            connection.describe({ type: 'P', name: '' }, true);
            connection.execute({ portal: '' }, true);
            connection.flush();
        }
        else {
            connection.query(this.text);
        }
    }
    requestMoreRows() {
        this.state = 'busy';
        if (this.connection) {
            const batchSize = this.subscriber.batchSize;
            this.connection.execute({ portal: '', rows: batchSize ? batchSize.toString() : void (0) }, true);
            this.connection.flush();
        }
    }
    handleRowDescription(msg) {
        this.subscriber.onStart({
            pause: () => {
                this.paused = true;
            },
            resume: () => {
                this.paused = false;
                let row;
                while (row = this.rowBuffer.shift()) {
                    this.subscriber.onRow(row);
                    if (this.paused)
                        return;
                }
                if (this.connection) {
                    this.requestMoreRows();
                }
            }
        });
        this.pgResult.addFields(msg.fields); // prepare the internal _result to parse data rows
        this.subscriber.onFields(msg.fields);
    }
    handleDataRow(msg) {
        const row = this.pgResult.parseRow(msg.fields);
        if (this.paused) {
            this.rowBuffer.push(row);
        }
        else {
            this.subscriber.onRow(row);
        }
    }
    handleCommandComplete(msg) {
        this.pgResult.addCommandComplete(msg);
        if (this.connection && this.usePreparedStatement) {
            this.connection.sync();
        }
        this.subscriber.onClose();
    }
    handlePortalSuspended() {
        this.requestMoreRows();
    }
    handleReadyForQuery() {
        this.state = 'done';
        this.subscriber.onClose();
        this.subscriber.onEnd();
    }
    handleEmptyQuery() {
        if (this.connection)
            this.connection.sync();
    }
    handleError(error) {
        this.state = 'error';
        this.subscriber.onError(error);
        // call sync to keep this connection from hanging
        if (this.connection)
            this.connection.sync();
    }
}
exports.default = Cursor;
//# sourceMappingURL=Cursor.js.map