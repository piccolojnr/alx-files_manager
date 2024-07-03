import redisClient from "../utils/redis";
import dbClient from "../utils/db";

class AppController {
  constructor() {
    this.client = redisClient;
    this.db = dbClient;
  }
  static getStatus(req, res) {
    const status = {
      redis: this.client.isAlive(),
      db: this.db.isAlive(),
    };
    res.status(200).send(status);
  }

  static async getStats(req, res) {
    const users = await this.db.nbUsers();
    const files = await this.db.nbFiles();
    res.status(200).send({ users, files });
  }
}

export default AppController;
