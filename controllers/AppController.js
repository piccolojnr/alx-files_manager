import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  constructor() {
    this.client = redisClient;
    this.db = dbClient;
  }

  static getStatus(req, res) {
    const status = {
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    };
    res.status(200).send(status);
  }

  static async getStats(req, res) {
    const users = await dbClient.nbUsers();
    const files = await dbClient.nbFiles();
    res.status(200).send({ users, files });
  }
}

export default AppController;
