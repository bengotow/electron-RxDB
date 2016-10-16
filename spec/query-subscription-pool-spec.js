import QuerySubscriptionPool from '../lib/query-subscription-pool';
import {Database, Category} from './fixtures';

describe("QuerySubscriptionPool", function QuerySubscriptionPoolSpecs() {
  beforeEach(() => {
    this.pool = new QuerySubscriptionPool(Database);
    this.query = Database.findAll(Category);
    this.queryKey = this.query.sql();
  });

  describe("add", () => {
    it("should add a new subscription with the callback", () => {
      const callback = jasmine.createSpy('callback');
      this.pool.add(this.query, callback);
      expect(this.pool._subscriptions[this.queryKey]).toBeDefined();

      const subscription = this.pool._subscriptions[this.queryKey];
      expect(subscription.hasCallback(callback)).toBe(true);
    });

    it("should yield database changes to the subscription", () => {
      const callback = jasmine.createSpy('callback');
      this.pool.add(this.query, callback);
      const subscription = this.pool._subscriptions[this.queryKey];
      spyOn(subscription, 'applyChangeRecord');

      const record = {objectType: 'whateves'};
      this.pool._onChange(record);
      expect(subscription.applyChangeRecord).toHaveBeenCalledWith(record);
    });

    describe("unsubscribe", () => {
      it("should return an unsubscribe method", () => {
        expect(this.pool.add(this.query, () => {}) instanceof Function).toBe(true);
      });

      it("should remove the callback from the subscription", () => {
        const cb = () => {};

        const unsub = this.pool.add(this.query, cb);
        const subscription = this.pool._subscriptions[this.queryKey];

        expect(subscription.hasCallback(cb)).toBe(true);
        unsub();
        expect(subscription.hasCallback(cb)).toBe(false);
      });

      it("should wait before removing the subscription to make sure it's not reused", () => {
        jasmine.clock().install();

        const unsub = this.pool.add(this.query, () => {});
        expect(this.pool._subscriptions[this.queryKey]).toBeDefined();
        unsub();
        expect(this.pool._subscriptions[this.queryKey]).toBeDefined();
        jasmine.clock().tick(2);
        expect(this.pool._subscriptions[this.queryKey]).toBeUndefined();

        jasmine.clock().uninstall();
      });
    });
  });
});
