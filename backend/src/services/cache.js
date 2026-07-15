import { createClient } from 'redis';
import dotenv from 'dotenv';
dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://:123456@69.62.75.165:32769';

let redisClient = null;

export const connectRedis = async () => {
  try {
    redisClient = createClient({ url: REDIS_URL });
    redisClient.on('error', (err) => console.error('Redis Client Error:', err));
    await redisClient.connect();
    console.log('Connected to Redis successfully.');
  } catch (error) {
    console.error('Failed to connect to Redis server:', error.message);
    redisClient = null;
  }
};

export const getCache = async (key) => {
  if (!redisClient) return null;
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (err) {
    console.error(`Error getting cache key ${key}:`, err);
    return null;
  }
};

export const setCache = async (key, value, ttl = 3600) => {
  if (!redisClient) return;
  try {
    await redisClient.set(key, JSON.stringify(value), {
      EX: ttl
    });
  } catch (err) {
    console.error(`Error setting cache key ${key}:`, err);
  }
};

export const delCache = async (key) => {
  if (!redisClient) return;
  try {
    await redisClient.del(key);
  } catch (err) {
    console.error(`Error deleting cache key ${key}:`, err);
  }
};

export const delCachePattern = async (pattern) => {
  if (!redisClient) return;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys && keys.length > 0) {
      await redisClient.del(keys);
      console.log(`Deleted ${keys.length} cache keys matching pattern ${pattern}`);
    }
  } catch (err) {
    console.error(`Error deleting keys by pattern ${pattern}:`, err);
  }
};
