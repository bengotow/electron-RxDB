import {registeredObjectReplacer, registeredObjectReviver} from './utils';

/**
DatabaseChangeRecord is the object emitted from the DatabaseStore when it triggers.
The DatabaseChangeRecord contains information about what type of model changed,
and references to the new model values. All mutations to the database produce these
change records.
*/
export default class DatabaseChangeRecord {

  constructor(options) {
    this.options = options;

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
        this._objects = this._objects || JSON.parse(this._objectsString, registeredObjectReviver);
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
    this._objectsString = this._objectsString || JSON.stringify(this._objects, registeredObjectReplacer);
    return {
      type: this.type,
      objectClass: this.objectClass,
      objectsString: this._objectsString,
    };
  }
}
