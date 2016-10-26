/* eslint quote-props: 0 */
import Model from '../lib/model';
import Attributes from '../lib/attributes';
import ModelRegistry from '../lib/model-registry';

class GoodTest extends Model {
  static attributes = Object.assign({}, Model.attributes, {
    "foo": Attributes.String({
      modelKey: 'foo',
      jsonKey: 'foo',
    }),
  });
}

class BetterTest extends Model {
  static attributes = Object.assign({}, Model.attributes, {
    "bar": Attributes.String({
      modelKey: 'bar',
      jsonKey: 'bar',
    }),
  });
}

class RandomClass {

}

describe('ModelRegistry', function ModelRegistrySpecs() {
  beforeEach(() => {
    this.registry = new ModelRegistry();
    this.registry.registerDeferred({name: "GoodTest", resolver: () => GoodTest});
  });

  describe("registerDeferred", () => {
    it("can register constructors", () => {
      const testFn = () => BetterTest;
      this.registry.registerDeferred({name: "BetterTest", resolver: testFn});
      expect(this.registry.get("BetterTest")).toBe(BetterTest);
    });
  });

  describe("has", () => {
    it("tests if a constructor is in the registry", () => {
      expect(this.registry.has("GoodTest")).toEqual(true);
      expect(this.registry.has("BadTest")).toEqual(false);
    });
  });

  describe("deserialize", () => {
    it("deserializes the objects for a constructor", () => {
      const obj = this.registry.deserialize("GoodTest", {foo: "bar"});
      expect(obj instanceof GoodTest).toBe(true);
      expect(obj.foo).toBe("bar");
    });

    it("throws an error if the object can't be deserialized", () =>
      expect(() => this.registry.deserialize("BadTest", {foo: "bar"})).toThrow()
    );

    it("throws if the registered constructor was not a model subclass", () => {
      this.registry.registerDeferred({name: "RandomClass", resolver: () => RandomClass});
      expect(() => this.registry.deserialize("RandomClass", {foo: "bar"})).toThrow();
    });
  });
});
