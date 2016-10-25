/**
An RxDB database emits DatabaseChangeRecord objects once a transaction has completed.
The change record contains a copy of the model(s) that were modified, the type of
modification (persist / destroy) and the model class.

DatabaseChangeRecords can be serialized to JSON and RxDB transparently bridges
them between windows of Electron applications. Change records of the same type
and model class can also be merged.
*/
export default class DatabaseChangeRecord {

  constructor(database, options) {
    this._database = database;
    this._options = options;

    // When DatabaseChangeRecords are sent over IPC to other windows, their object
    // payload is sub-serialized into a JSON string. This means that we can wait
    // to deserialize models until someone in the window asks for `change.objects`
    this._objects = options.objects;
    this._objectsString = options.objectsString;

    Object.defineProperty(this, 'type', {
      get: () => options.type,
    })
    Object.defineProperty(this, 'objectClass', {
      get: () => options.objectClass,
    })
    Object.defineProperty(this, 'objects', {
      get: () => {
        this._objects = this._objects || JSON.parse(this._objectsString, this._database.models.JSONReviver);
        return this._objects;
      },
    })
  }

  canAppend(other) {
    return (this.objectClass === other.objectClass) && (this.type === other.type);
  }

  append(other) {
    if (!this._indexLookup) {
      this._indexLookup = {};
      this.objects.forEach((obj, idx) => {
        this._indexLookup[obj.id] = idx;
      });
    }

    // When we join new models into our set, replace existing ones so the same
    // model cannot exist in the change record set multiple times.
    for (const obj of other.objects) {
      const idx = this._indexLookup[obj.id]
      if (idx) {
        this.objects[idx] = obj;
      } else {
        this._indexLookup[obj.id] = this.objects.length
        this.objects.push(obj);
      }
    }
  }

  toJSON() {
    this._objectsString = this._objectsString || JSON.stringify(this._objects, this._database.models.JSONReplacer);
    return {
      type: this.type,
      objectClass: this.objectClass,
      objectsString: this._objectsString,
    };
  }
}
