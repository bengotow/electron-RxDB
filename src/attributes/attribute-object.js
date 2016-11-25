import Attribute from './attribute';

/**
The value of this attribute is always an object that can be cast to `itemClass`
*/
export default class AttributeObject extends Attribute {
  constructor({modelKey, jsonKey, itemClass, queryable}) {
    super({modelKey, jsonKey, queryable});
    this.ItemClass = itemClass;
  }

  toJSON(val) {
    return (val && val.toJSON) ? val.toJSON() : val;
  }

  fromJSON(val) {
    if (!this.ItemClass) {
      return val || "";
    }
    const obj = new this.ItemClass(val);

    // Important: if no ids are in the JSON, don't make them up randomly.
    // This causes an object to be "different" each time it's de-serialized
    // even if it's actually the same, makes React components re-render!
    obj.id = undefined;

    // Warning: typeof(null) is object
    if (obj.fromJSON && !!val && (typeof val === 'object')) {
      obj.fromJSON(val);
    }

    return obj;
  }
}
