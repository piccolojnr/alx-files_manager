import { ObjectId } from 'mongodb';
import sha1 from 'sha1';
import Bull from 'bull';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const userQueue = new Bull('userQueue');
class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).send({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).send({ error: 'Missing password' });
    }

    const usersCollection = dbClient.db.collection('users');

    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(400).send({ error: 'Already exist' });
    }

    const hashedPassword = sha1(password);

    const result = await usersCollection.insertOne({
      email,
      password: hashedPassword,
    });

    const newUser = { id: result.insertedId, email };

    userQueue.add({
      userId: newUser.id,
    });

    return res.status(201).send(newUser);
  }

  static async getMe(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const user = await dbClient.db
      .collection('users')
      .findOne({ _id: ObjectId(userId) });
    if (!user) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    return res.status(200).send({ id: user._id, email: user.email });
  }
}

export default UsersController;
