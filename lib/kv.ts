import { Redis } from '@upstash/redis';

let client: Redis | null = null;

const url = process.env.REDIS_URL;
const token = process.env.REDIS_TOKEN;

if (url && token) {
  client = new Redis({ url, token });
}

export function getKv(): Redis | null {
  return client;
}
