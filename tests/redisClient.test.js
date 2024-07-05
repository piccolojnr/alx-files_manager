/* eslint-disable jest/expect-expect */
/* eslint-disable no-undef */
/* eslint-disable jest/valid-expect */
/* eslint-disable no-unused-expressions */
/* eslint-disable jest/prefer-expect-assertions */
import { expect } from 'chai';
import redisClient from '../utils/redis';

describe('redisClient', () => {
  it('should be alive', async () => {
    const isAlive = redisClient.isAlive();
    expect(isAlive).to.be.true;
  });

  it('should set and get a value', async () => {
    await redisClient.set('test_key', 'test_value', 10);
    const value = await redisClient.get('test_key');
    expect(value).to.be.equal('test_value');
  });

  it('should delete a value', async () => {
    await redisClient.set('test_key', 'test_value', 10);
    await redisClient.del('test_key');
    const value = await redisClient.get('test_key');
    expect(value).to.be.null;
  });
});
